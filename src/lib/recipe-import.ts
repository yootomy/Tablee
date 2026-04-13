import { createReadStream, promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import crypto from "node:crypto";
import {
  createPartFromUri,
  createUserContent,
  type File as GeminiFile,
  FileState,
  GoogleGenAI,
} from "@google/genai";
import OpenAI from "openai";
import { z } from "zod";
import {
  getRecipeMediaUrl,
  RECIPE_MEDIA_STORAGE_DIR,
} from "@/lib/recipe-media-storage";
import type { ImportedRecipeDraft } from "@/types/recipe-import";

const execFileAsync = promisify(execFile);
const YT_DLP_BIN = process.env.YT_DLP_BIN;
const FFMPEG_BIN = process.env.FFMPEG_BIN;
const AI_RECIPE_IMPORT_PROVIDER = process.env.AI_RECIPE_IMPORT_PROVIDER;
const GEMINI_RECIPE_IMPORT_MODEL =
  process.env.GEMINI_RECIPE_IMPORT_MODEL || "gemini-2.5-flash";
const GEMINI_FILE_POLL_INTERVAL_MS = 4000;
const GEMINI_FILE_POLL_MAX_ATTEMPTS = 45;
const GEMINI_ANALYSIS_MAX_ATTEMPTS = 3;
const OPENAI_RECIPE_IMPORT_MODEL =
  process.env.OPENAI_RECIPE_IMPORT_MODEL || "gpt-4.1-mini";
const OPENAI_RECIPE_TRANSCRIBE_MODEL =
  process.env.OPENAI_RECIPE_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
const DOWNLOAD_TIMEOUT_MS = Number(
  process.env.AI_RECIPE_IMPORT_DOWNLOAD_TIMEOUT_MS ?? 120000,
);
const MEDIA_PROCESS_TIMEOUT_MS = Number(
  process.env.AI_RECIPE_IMPORT_MEDIA_TIMEOUT_MS ?? 90000,
);
const AI_ANALYSIS_TIMEOUT_MS = Number(
  process.env.AI_RECIPE_IMPORT_ANALYSIS_TIMEOUT_MS ?? 180000,
);
const MAX_VIDEO_DURATION_SECONDS = Number(
  process.env.AI_RECIPE_IMPORT_MAX_DURATION_SECONDS ?? 600,
);
const MAX_VIDEO_FILE_SIZE_BYTES =
  Number(process.env.AI_RECIPE_IMPORT_MAX_FILE_SIZE_MB ?? 120) * 1024 * 1024;
const MAX_FRAMES = 6;
const MAX_GALLERY_IMAGES = 10;
const FRAME_INTERVAL_SECONDS = 6;
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".bmp",
  ".gif",
]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".webm", ".m4v"]);

const recipeImportResponseSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional().default(""),
  prepTimeMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  cookTimeMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  servings: z.number().int().min(1).max(100).nullable().optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        quantity: z.string().trim().optional().default(""),
        unit: z.string().trim().optional().default(""),
        note: z.string().trim().optional().default(""),
      }),
    )
    .min(1),
  steps: z
    .array(
      z.object({
        instruction: z.string().trim().min(1),
      }),
    )
    .min(1),
  warnings: z.array(z.string().trim().min(1)).optional().default([]),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

type SocialPlatform = "tiktok" | "instagram";
type ImportProvider = "gemini" | "openai";

type SocialVideoMetadata = {
  platform: SocialPlatform;
  title: string;
  description: string;
  creatorName: string;
  webpageUrl: string;
  thumbnailUrl: string;
  durationSeconds: number | null;
  tags: string[];
};

type VisualInput = {
  filePath: string;
  dataUrl: string;
  mimeType: string;
  base64: string;
};

type DownloadedSocialMedia =
  | {
      kind: "video";
      videoPath: string;
    }
  | {
      kind: "image-gallery";
      imagePaths: string[];
    };

const geminiRecipeJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      description: "Titre court et naturel de la recette.",
    },
    description: {
      type: "string",
      description:
        "Description propre et concise de la recette, adaptée à une app familiale.",
    },
    prepTimeMinutes: {
      type: ["integer", "null"],
      minimum: 0,
      maximum: 1440,
      description:
        "Temps de préparation en minutes. null si vraiment impossible à estimer.",
    },
    cookTimeMinutes: {
      type: ["integer", "null"],
      minimum: 0,
      maximum: 1440,
      description:
        "Temps de cuisson en minutes. null si vraiment impossible à estimer.",
    },
    servings: {
      type: ["integer", "null"],
      minimum: 1,
      maximum: 100,
      description:
        "Nombre de portions raisonnablement estimé. null si impossible à déduire.",
    },
    ingredients: {
      type: "array",
      minItems: 1,
      description: "Liste des ingrédients avec quantités si disponibles.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
            description: "Nom de l'ingrédient.",
          },
          quantity: {
            type: "string",
            description:
              "Quantité textuelle de l'ingrédient, vide si absente ou très incertaine.",
          },
          unit: {
            type: "string",
            description:
              "Unité courte de l'ingrédient, vide si absente ou intégrée dans quantity.",
          },
          note: {
            type: "string",
            description:
              "Précision libre sur l'ingrédient si utile, sinon chaîne vide.",
          },
        },
        required: ["name", "quantity", "unit", "note"],
      },
    },
    steps: {
      type: "array",
      minItems: 1,
      description: "Étapes de préparation dans l'ordre.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          instruction: {
            type: "string",
            description: "Consigne claire de préparation.",
          },
        },
        required: ["instruction"],
      },
    },
    warnings: {
      type: "array",
      description:
        "Liste des informations floues, supposées ou absentes à signaler à l'utilisateur.",
      items: {
        type: "string",
      },
    },
    confidence: {
      type: ["number", "null"],
      minimum: 0,
      maximum: 1,
      description:
        "Niveau de confiance global entre 0 et 1. null si le modèle ne peut pas l'estimer.",
    },
  },
  required: [
    "title",
    "description",
    "prepTimeMinutes",
    "cookTimeMinutes",
    "servings",
    "ingredients",
    "steps",
    "warnings",
    "confidence",
  ],
} as const;

function isSupportedSocialUrl(value: string) {
  try {
    const url = new URL(value);
    return ["www.tiktok.com", "tiktok.com", "vm.tiktok.com", "vt.tiktok.com", "www.instagram.com", "instagram.com"].includes(
      url.hostname.toLowerCase(),
    );
  } catch {
    return false;
  }
}

function detectPlatform(value: string): SocialPlatform {
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname.includes("instagram") ? "instagram" : "tiktok";
}

export function getImportProvider(): ImportProvider {
  const configured = AI_RECIPE_IMPORT_PROVIDER?.trim().toLowerCase();

  if (configured === "gemini" || configured === "openai") {
    return configured;
  }

  if (process.env.GEMINI_API_KEY?.trim()) {
    return "gemini";
  }

  return "openai";
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY n'est pas configurée sur le serveur.");
  }

  return new GoogleGenAI({ apiKey });
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY n'est pas configurée sur le serveur.");
  }

  return new OpenAI({ apiKey });
}

function getVideoMimeType(videoPath: string) {
  const extension = path.extname(videoPath).toLowerCase();

  if (extension === ".webm") return "video/webm";
  if (extension === ".mov") return "video/quicktime";
  if (extension === ".mkv") return "video/x-matroska";

  return "video/mp4";
}

function getImageMimeType(imagePath: string) {
  const extension = path.extname(imagePath).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".bmp") return "image/bmp";

  return "image/jpeg";
}

function dataUrlForImage(buffer: Buffer, extension: string) {
  const normalized = extension.replace(".", "").toLowerCase();
  const mimeType =
    normalized === "png"
      ? "image/png"
      : normalized === "webp"
        ? "image/webp"
        : "image/jpeg";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function extensionFromContentType(contentType: string | null) {
  if (!contentType) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  return ".jpg";
}

function extensionFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname);
    return extension || ".jpg";
  } catch {
    return ".jpg";
  }
}

async function ensurePublicImportsDir() {
  await fs.mkdir(RECIPE_MEDIA_STORAGE_DIR, { recursive: true });
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function isImagePath(targetPath: string) {
  return IMAGE_EXTENSIONS.has(path.extname(targetPath).toLowerCase());
}

function isVideoPath(targetPath: string) {
  return VIDEO_EXTENSIONS.has(path.extname(targetPath).toLowerCase());
}

async function createVisualInputFromFile(filePath: string): Promise<VisualInput> {
  const buffer = await fs.readFile(filePath);
  const extension = path.extname(filePath);
  const mimeType = getImageMimeType(filePath);
  const base64 = buffer.toString("base64");

  return {
    filePath,
    dataUrl: dataUrlForImage(buffer, extension),
    mimeType,
    base64,
  };
}

async function loadVisualInputsFromImagePaths(imagePaths: string[]) {
  return Promise.all(
    imagePaths.slice(0, MAX_GALLERY_IMAGES).map((imagePath) =>
      createVisualInputFromFile(imagePath),
    ),
  );
}

async function storeImageBuffer(buffer: Buffer, extension: string) {
  await ensurePublicImportsDir();
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const destination = path.join(RECIPE_MEDIA_STORAGE_DIR, filename);
  await fs.writeFile(destination, buffer);
  return getRecipeMediaUrl(filename);
}

async function downloadAndStoreImage(url: string) {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), DOWNLOAD_TIMEOUT_MS);
  const response = await fetch(url, {
    signal: abortController.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error("Impossible de télécharger la miniature de la vidéo.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const extension =
    extensionFromContentType(response.headers.get("content-type")) ||
    extensionFromUrl(url);

  return storeImageBuffer(buffer, extension);
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs = DOWNLOAD_TIMEOUT_MS,
) {
  try {
    return await execFileAsync(command, args, {
      cwd,
      maxBuffer: 32 * 1024 * 1024,
      timeout: timeoutMs,
      windowsHide: true,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error(
        `${command} n'est pas installé sur le serveur. Installe d'abord ${command} pour activer l'import IA.`,
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "killed" in error &&
      error.killed
    ) {
      throw new Error(
        `${command} a dépassé le temps maximum autorisé pour un import IA.`,
      );
    }

    throw error;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function resolveBinaryPath(kind: "yt-dlp" | "ffmpeg") {
  const envValue = kind === "yt-dlp" ? YT_DLP_BIN : FFMPEG_BIN;

  if (envValue?.trim()) {
    return envValue.trim();
  }

  const candidates =
    kind === "yt-dlp"
      ? ["yt-dlp", "/usr/local/bin/yt-dlp", "/usr/bin/yt-dlp"]
      : ["ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"];

  for (const candidate of candidates) {
    if (candidate.includes("/") && !(await pathExists(candidate))) {
      continue;
    }

    try {
      await runCommand(
        candidate,
        [kind === "yt-dlp" ? "--version" : "-version"],
        cwdForBinaryChecks(),
      );
      return candidate;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    `${kind} n'est pas disponible sur le serveur. Installe-le puis réessaie l'import IA.`,
  );
}

function cwdForBinaryChecks() {
  return process.cwd();
}

function formatCommandError(error: unknown, kind: "yt-dlp" | "ffmpeg") {
  if (!(error instanceof Error)) {
    return `Le serveur a rencontré une erreur avec ${kind}.`;
  }

  const details = [
    "stdout" in error && typeof error.stdout === "string" ? error.stdout : "",
    "stderr" in error && typeof error.stderr === "string" ? error.stderr : "",
    error.message,
  ]
    .filter(Boolean)
    .join("\n");

  if (details.includes("Too Many Requests") || details.includes("HTTP Error 429")) {
    return "TikTok limite temporairement la récupération de cette vidéo. Réessaie dans quelques minutes.";
  }

  if (details.includes("Unsupported URL")) {
    return "Ce lien n'est pas encore pris en charge par l'import IA.";
  }

  if (details.includes("Login required") || details.includes("private")) {
    return "Cette vidéo n'est pas publiquement accessible pour l'import automatique.";
  }

  if (details.includes("sign in to confirm") || details.includes("unable to download webpage")) {
    return "La plateforme bloque l'accès automatique à cette vidéo pour le moment.";
  }

  return `L'import n'a pas pu récupérer la vidéo avec ${kind}.`;
}

async function getSocialMetadata(url: string, cwd: string): Promise<SocialVideoMetadata> {
  const ytDlpBin = await resolveBinaryPath("yt-dlp");
  let stdout: string;

  try {
    ({ stdout } = await runCommand(
      ytDlpBin,
      ["--dump-single-json", "--no-playlist", "--skip-download", url],
      cwd,
      DOWNLOAD_TIMEOUT_MS,
    ));
  } catch (error) {
    throw new Error(formatCommandError(error, "yt-dlp"));
  }

  const payload = JSON.parse(stdout) as {
    title?: string | null;
    description?: string | null;
    uploader?: string | null;
    channel?: string | null;
    webpage_url?: string | null;
    thumbnail?: string | null;
    duration?: number | null;
    tags?: string[] | null;
  };

  const metadata = {
    platform: detectPlatform(url),
    title: payload.title?.trim() || "Recette importée",
    description: payload.description?.trim() || "",
    creatorName: payload.uploader?.trim() || payload.channel?.trim() || "",
    webpageUrl: payload.webpage_url?.trim() || url,
    thumbnailUrl: payload.thumbnail?.trim() || "",
    durationSeconds:
      typeof payload.duration === "number" ? Math.round(payload.duration) : null,
    tags: payload.tags?.filter(Boolean) ?? [],
  };

  if (
    metadata.durationSeconds &&
    metadata.durationSeconds > MAX_VIDEO_DURATION_SECONDS
  ) {
    throw new Error(
      `Cette vidéo dure plus de ${Math.floor(
        MAX_VIDEO_DURATION_SECONDS / 60,
      )} minutes, ce qui dépasse la limite d'import.`,
    );
  }

  return metadata;
}

async function clearDownloadedSourceArtifacts(cwd: string) {
  const entries = await fs.readdir(cwd);

  await Promise.all(
    entries
      .filter((entry) => entry.startsWith("source"))
      .map((entry) =>
        fs.rm(path.join(cwd, entry), { recursive: true, force: true }),
      ),
  );
}

async function detectDownloadedSourceMedia(
  cwd: string,
): Promise<DownloadedSocialMedia | null> {
  const entries = (await fs.readdir(cwd))
    .filter((entry) => entry.startsWith("source"))
    .map((entry) => path.join(cwd, entry));

  const videoPath = entries.find((entry) => isVideoPath(entry));

  if (videoPath) {
    const fileStat = await fs.stat(videoPath);

    if (fileStat.size > MAX_VIDEO_FILE_SIZE_BYTES) {
      throw new Error(
        `La vidéo dépasse ${Math.round(
          MAX_VIDEO_FILE_SIZE_BYTES / (1024 * 1024),
        )} MB, ce qui est trop lourd pour un import IA.`,
      );
    }

    return { kind: "video", videoPath };
  }

  const imagePaths = entries.filter((entry) => isImagePath(entry)).sort();

  if (imagePaths.length > 0) {
    return {
      kind: "image-gallery",
      imagePaths: imagePaths.slice(0, MAX_GALLERY_IMAGES),
    };
  }

  return null;
}

async function downloadSourceMedia(url: string, cwd: string) {
  const ytDlpBin = await resolveBinaryPath("yt-dlp");
  const attempts = [
    [
      "--no-playlist",
      "--merge-output-format",
      "mp4",
      "-f",
      "mp4/bestvideo*+bestaudio/best",
      "-o",
      path.join(cwd, "source.%(ext)s"),
      url,
    ],
    [
      "--no-playlist",
      "-o",
      path.join(cwd, "source-%(autonumber)s.%(ext)s"),
      url,
    ],
  ];
  let lastError: unknown;

  for (const args of attempts) {
    await clearDownloadedSourceArtifacts(cwd);

    try {
      await runCommand(ytDlpBin, args, cwd, DOWNLOAD_TIMEOUT_MS);
      const media = await detectDownloadedSourceMedia(cwd);

      if (media) {
        return media;
      }

      lastError = new Error(
        "Le média source a bien été téléchargé, mais aucun fichier exploitable n'a été trouvé.",
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(formatCommandError(lastError, "yt-dlp"));
}

async function extractFrames(videoPath: string, cwd: string) {
  const pattern = path.join(cwd, "frame-%02d.jpg");
  const ffmpegBin = await resolveBinaryPath("ffmpeg");

  try {
    await runCommand(
      ffmpegBin,
      [
        "-y",
        "-i",
        videoPath,
        "-vf",
        `fps=1/${FRAME_INTERVAL_SECONDS},scale=960:-1:force_original_aspect_ratio=decrease`,
        "-frames:v",
        String(MAX_FRAMES),
        pattern,
      ],
      cwd,
      MEDIA_PROCESS_TIMEOUT_MS,
    );
  } catch (error) {
    throw new Error(formatCommandError(error, "ffmpeg"));
  }

  const files = (await fs.readdir(cwd))
    .filter((entry) => entry.startsWith("frame-") && entry.endsWith(".jpg"))
    .sort();

  return Promise.all(
    files.map((file) => createVisualInputFromFile(path.join(cwd, file))),
  );
}

function getPosterSeekSeconds(durationSeconds: number | null) {
  if (!durationSeconds || durationSeconds <= 2) {
    return "0.5";
  }

  return String(Math.min(2, Math.max(0.5, durationSeconds * 0.15)));
}

async function extractPosterImage(videoPath: string, cwd: string, durationSeconds: number | null) {
  const posterPath = path.join(cwd, "poster.jpg");
  const ffmpegBin = await resolveBinaryPath("ffmpeg");

  try {
    await runCommand(
      ffmpegBin,
      [
        "-y",
        "-ss",
        getPosterSeekSeconds(durationSeconds),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-vf",
        "scale=1280:-1:force_original_aspect_ratio=decrease",
        posterPath,
      ],
      cwd,
      MEDIA_PROCESS_TIMEOUT_MS,
    );
  } catch (error) {
    throw new Error(formatCommandError(error, "ffmpeg"));
  }

  const posterBuffer = await fs.readFile(posterPath);
  return storeImageBuffer(posterBuffer, ".jpg");
}

async function extractAudio(videoPath: string, cwd: string) {
  const audioPath = path.join(cwd, "audio.wav");
  const ffmpegBin = await resolveBinaryPath("ffmpeg");

  try {
    await runCommand(
      ffmpegBin,
      [
        "-y",
        "-i",
        videoPath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        audioPath,
      ],
      cwd,
      MEDIA_PROCESS_TIMEOUT_MS,
    );
  } catch (error) {
    throw new Error(formatCommandError(error, "ffmpeg"));
  }

  return audioPath;
}

async function transcribeAudio(audioPath: string) {
  const client = getOpenAIClient();
  const response = await withTimeout(
    client.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: OPENAI_RECIPE_TRANSCRIBE_MODEL,
    }),
    AI_ANALYSIS_TIMEOUT_MS,
    "La transcription audio a pris trop de temps.",
  );

  return response.text?.trim() || "";
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("L'IA n'a renvoyé aucun contenu.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {}

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1].trim());
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return JSON.parse(objectMatch[0]);
  }

  throw new Error("La réponse IA n'a pas pu être interprétée en JSON.");
}

async function waitForGeminiFileActive(
  ai: GoogleGenAI,
  file: GeminiFile,
) {
  let currentFile = file;

  for (let attempt = 0; attempt < GEMINI_FILE_POLL_MAX_ATTEMPTS; attempt += 1) {
    if (currentFile.state === FileState.ACTIVE) {
      return currentFile;
    }

    if (currentFile.state === FileState.FAILED) {
      throw new Error(
        currentFile.error?.message ||
          "Gemini n'a pas réussi à préparer la vidéo pour l'analyse.",
      );
    }

    if (!currentFile.name) {
      break;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, GEMINI_FILE_POLL_INTERVAL_MS),
    );
    currentFile = await ai.files.get({ name: currentFile.name });
  }

  throw new Error(
    "Gemini met trop de temps à préparer la vidéo. Réessaie avec un autre lien ou une vidéo plus courte.",
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const status =
    "status" in error && typeof error.status === "number" ? error.status : null;
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";

  return (
    status === 429 ||
    status === 500 ||
    status === 503 ||
    message.includes("high demand") ||
    message.includes("UNAVAILABLE")
  );
}

function buildGeminiRecipeImportPrompt(input: {
  metadata: SocialVideoMetadata;
  sourceKind: "video" | "image-gallery";
}) {
  return [
    input.sourceKind === "video"
      ? "Tu analyses une vidéo de recette publiée sur un réseau social."
      : "Tu analyses un diaporama photo de recette publié sur un réseau social.",
    "Ta mission est de reconstituer un brouillon de recette exploitable par un humain.",
    "Tu dois utiliser tous les signaux disponibles : les images, l'audio si le média en contient, le texte visible à l'écran, la description sociale, les tags et les métadonnées du post.",
    "Si une information est incertaine, propose la meilleure estimation raisonnable et ajoute un warning.",
    "Ne renvoie que le JSON demandé par le schéma.",
    "",
    `Métadonnées sociales : ${JSON.stringify(input.metadata, null, 2)}`,
  ].join("\n");
}

async function analyzeRecipeFromVideoWithGemini(input: {
  metadata: SocialVideoMetadata;
  videoPath: string;
}) {
  const ai = getGeminiClient();
  const mimeType = getVideoMimeType(input.videoPath);
  let uploadedFile = await ai.files.upload({
    file: input.videoPath,
    config: { mimeType },
  });

  try {
    uploadedFile = await waitForGeminiFileActive(ai, uploadedFile);

    if (!uploadedFile.uri) {
      throw new Error("Gemini a bien reçu la vidéo, mais n'a pas renvoyé d'URI exploitable.");
    }

    let lastError: unknown;

    for (
      let attempt = 1;
      attempt <= GEMINI_ANALYSIS_MAX_ATTEMPTS;
      attempt += 1
    ) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: GEMINI_RECIPE_IMPORT_MODEL,
            contents: createUserContent([
              createPartFromUri(uploadedFile.uri, uploadedFile.mimeType || mimeType),
              buildGeminiRecipeImportPrompt({
                metadata: input.metadata,
                sourceKind: "video",
              }),
            ]),
            config: {
              responseMimeType: "application/json",
              responseJsonSchema: geminiRecipeJsonSchema,
            },
          }),
          AI_ANALYSIS_TIMEOUT_MS,
          "L'analyse Gemini a pris trop de temps.",
        );

        return recipeImportResponseSchema.parse(JSON.parse(response.text || "{}"));
      } catch (error) {
        lastError = error;

        if (
          attempt === GEMINI_ANALYSIS_MAX_ATTEMPTS ||
          !isRetryableGeminiError(error)
        ) {
          throw error;
        }

        await sleep(1200 * attempt);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Gemini n'a pas réussi à analyser la vidéo.");
  } finally {
    if (uploadedFile.name) {
      try {
        await ai.files.delete({ name: uploadedFile.name });
      } catch {
        // Best effort cleanup only.
      }
    }
  }
}

async function analyzeRecipeFromImageGalleryWithGemini(input: {
  metadata: SocialVideoMetadata;
  visuals: VisualInput[];
}) {
  const ai = getGeminiClient();
  let lastError: unknown;

  for (let attempt = 1; attempt <= GEMINI_ANALYSIS_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: GEMINI_RECIPE_IMPORT_MODEL,
          contents: createUserContent([
            buildGeminiRecipeImportPrompt({
              metadata: input.metadata,
              sourceKind: "image-gallery",
            }),
            ...input.visuals.map((visual) => ({
              inlineData: {
                mimeType: visual.mimeType,
                data: visual.base64,
              },
            })),
          ]),
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: geminiRecipeJsonSchema,
          },
        }),
        AI_ANALYSIS_TIMEOUT_MS,
        "L'analyse Gemini a pris trop de temps.",
      );

      return recipeImportResponseSchema.parse(JSON.parse(response.text || "{}"));
    } catch (error) {
      lastError = error;

      if (attempt === GEMINI_ANALYSIS_MAX_ATTEMPTS || !isRetryableGeminiError(error)) {
        throw error;
      }

      await sleep(1200 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini n'a pas réussi à analyser le diaporama.");
}

async function analyzeRecipeFromMediaWithOpenAI(input: {
  metadata: SocialVideoMetadata;
  transcript: string;
  visuals: VisualInput[];
  sourceKind: "video" | "image-gallery";
}) {
  const client = getOpenAIClient();
  const response = await withTimeout(
    client.responses.create({
      model: OPENAI_RECIPE_IMPORT_MODEL,
      max_output_tokens: 1800,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                `Tu analyses un ${input.sourceKind === "video" ? "média vidéo" : "diaporama photo"} de recette publié sur un réseau social. ` +
                "Ta mission est de reconstituer un brouillon de recette exploitable par un humain. " +
                "Tu dois utiliser tous les signaux disponibles: métadonnées sociales, description, audio si disponible, et texte visible dans les visuels. " +
                "Réponds uniquement avec un JSON valide contenant exactement les clés: " +
                "title, description, prepTimeMinutes, cookTimeMinutes, servings, ingredients, steps, warnings, confidence. " +
                "Si une information est incertaine, propose la meilleure estimation raisonnable et ajoute un warning. " +
                "Les ingrédients doivent contenir: name, quantity, unit, note. " +
                "Les étapes doivent contenir: instruction.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `Analyse ce ${input.sourceKind === "video" ? "contenu vidéo" : "diaporama photo"} de recette.\n\n` +
                `Métadonnées sociales:\n${JSON.stringify(input.metadata, null, 2)}\n\n` +
                `Transcription audio:\n${input.transcript || "(aucun audio exploitable)"}\n\n` +
                "Consignes métier:\n" +
                "- Le titre doit être court et naturel.\n" +
                "- La description doit être propre et lisible dans une app familiale.\n" +
                "- Les temps sont en minutes.\n" +
                "- Les quantités peu fiables doivent aller dans warnings.\n" +
                "- Ne renvoie rien d'autre que le JSON.",
            },
            ...input.visuals.map((visual) => ({
              type: "input_image" as const,
              image_url: visual.dataUrl,
              detail: "low" as const,
            })),
          ],
        },
      ],
    }),
    AI_ANALYSIS_TIMEOUT_MS,
    "L'analyse OpenAI a pris trop de temps.",
  );

  const parsedJson = extractJsonObject(response.output_text);
  return recipeImportResponseSchema.parse(parsedJson);
}

function normalizeImportedRecipe(input: {
  sourceUrl: string;
  imageUrl: string;
  metadata: SocialVideoMetadata;
  analysis: z.infer<typeof recipeImportResponseSchema>;
}): ImportedRecipeDraft {
  return {
    title: input.analysis.title.trim() || input.metadata.title || "Recette importée",
    description: input.analysis.description.trim(),
    prepTimeMinutes: input.analysis.prepTimeMinutes?.toString() ?? "",
    cookTimeMinutes: input.analysis.cookTimeMinutes?.toString() ?? "",
    servings: input.analysis.servings?.toString() ?? "",
    sourceUrl: input.sourceUrl,
    imageUrl: input.imageUrl,
    ingredients: input.analysis.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity ?? "",
      unit: ingredient.unit ?? "",
      note: ingredient.note ?? "",
    })),
    steps: input.analysis.steps.map((step) => ({
      instruction: step.instruction,
    })),
    warnings: input.analysis.warnings,
    confidence:
      typeof input.analysis.confidence === "number"
        ? Number(input.analysis.confidence.toFixed(2))
        : null,
    source: {
      platform: input.metadata.platform,
      creatorName: input.metadata.creatorName,
      title: input.metadata.title,
      description: input.metadata.description,
      thumbnailUrl: input.metadata.thumbnailUrl,
    },
  };
}

export async function importRecipeFromSocialUrl(url: string) {
  if (!isSupportedSocialUrl(url)) {
    throw new Error("Colle un lien TikTok ou Instagram valide.");
  }

  const tempDir = await fs.mkdtemp(path.join(tmpdir(), "tablee-import-"));

  try {
    const provider = getImportProvider();
    const metadata = await getSocialMetadata(url, tempDir);
    const sourceMedia = await downloadSourceMedia(url, tempDir);
    const analysis =
      provider === "gemini"
        ? sourceMedia.kind === "video"
          ? await analyzeRecipeFromVideoWithGemini({
              metadata,
              videoPath: sourceMedia.videoPath,
            })
          : await analyzeRecipeFromImageGalleryWithGemini({
              metadata,
              visuals: await loadVisualInputsFromImagePaths(sourceMedia.imagePaths),
            })
        : await (async () => {
            const visuals =
              sourceMedia.kind === "video"
                ? await extractFrames(sourceMedia.videoPath, tempDir)
                : await loadVisualInputsFromImagePaths(sourceMedia.imagePaths);
            const transcript =
              sourceMedia.kind === "video"
                ? await transcribeAudio(
                    await extractAudio(sourceMedia.videoPath, tempDir),
                  )
                : "";

            return analyzeRecipeFromMediaWithOpenAI({
              metadata,
              transcript,
              visuals,
              sourceKind: sourceMedia.kind,
            });
          })();

    let imageUrl = "";

    if (sourceMedia.kind === "video") {
      try {
        imageUrl = await extractPosterImage(
          sourceMedia.videoPath,
          tempDir,
          metadata.durationSeconds,
        );
      } catch {
        imageUrl = "";
      }
    } else if (sourceMedia.imagePaths[0]) {
      try {
        const firstImageBuffer = await fs.readFile(sourceMedia.imagePaths[0]);
        imageUrl = await storeImageBuffer(
          firstImageBuffer,
          path.extname(sourceMedia.imagePaths[0]) || ".jpg",
        );
      } catch {
        imageUrl = "";
      }
    }

    if (!imageUrl && metadata.thumbnailUrl) {
      try {
        imageUrl = await downloadAndStoreImage(metadata.thumbnailUrl);
      } catch {
        imageUrl = "";
      }
    }

    if (!imageUrl) {
      try {
        const visuals =
          sourceMedia.kind === "video"
            ? await extractFrames(sourceMedia.videoPath, tempDir)
            : await loadVisualInputsFromImagePaths(sourceMedia.imagePaths);

        if (visuals[0]?.filePath) {
          const firstFrameBuffer = await fs.readFile(visuals[0].filePath);
          imageUrl = await storeImageBuffer(
            firstFrameBuffer,
            path.extname(visuals[0].filePath) || ".jpg",
          );
        }
      } catch {
        imageUrl = "";
      }
    }

    return normalizeImportedRecipe({
      sourceUrl: url,
      imageUrl,
      metadata,
      analysis,
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
