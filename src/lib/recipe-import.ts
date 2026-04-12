import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import crypto from "node:crypto";
import OpenAI from "openai";
import { z } from "zod";
import type { ImportedRecipeDraft } from "@/types/recipe-import";

const execFileAsync = promisify(execFile);
const BASE_PATH = "/tablee";
const PUBLIC_IMPORTS_DIR = path.join(process.cwd(), "public", "imported", "recipes");
const YT_DLP_BIN = process.env.YT_DLP_BIN || "yt-dlp";
const FFMPEG_BIN = process.env.FFMPEG_BIN || "ffmpeg";
const OPENAI_RECIPE_IMPORT_MODEL =
  process.env.OPENAI_RECIPE_IMPORT_MODEL || "gpt-4.1-mini";
const OPENAI_RECIPE_TRANSCRIBE_MODEL =
  process.env.OPENAI_RECIPE_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
const MAX_FRAMES = 6;
const FRAME_INTERVAL_SECONDS = 6;

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

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY n'est pas configurée sur le serveur.");
  }

  return new OpenAI({ apiKey });
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
  await fs.mkdir(PUBLIC_IMPORTS_DIR, { recursive: true });
}

async function storeImageBuffer(buffer: Buffer, extension: string) {
  await ensurePublicImportsDir();
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const destination = path.join(PUBLIC_IMPORTS_DIR, filename);
  await fs.writeFile(destination, buffer);
  return `${BASE_PATH}/imported/recipes/${filename}`;
}

async function downloadAndStoreImage(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Impossible de télécharger la miniature de la vidéo.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const extension =
    extensionFromContentType(response.headers.get("content-type")) ||
    extensionFromUrl(url);

  return storeImageBuffer(buffer, extension);
}

async function runCommand(command: string, args: string[], cwd: string) {
  try {
    return await execFileAsync(command, args, {
      cwd,
      maxBuffer: 32 * 1024 * 1024,
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

    throw error;
  }
}

async function getSocialMetadata(url: string, cwd: string): Promise<SocialVideoMetadata> {
  const { stdout } = await runCommand(
    YT_DLP_BIN,
    ["--dump-single-json", "--no-playlist", "--skip-download", url],
    cwd,
  );
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

  return {
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
}

async function downloadSourceVideo(url: string, cwd: string) {
  const template = path.join(cwd, "source.%(ext)s");

  await runCommand(
    YT_DLP_BIN,
    [
      "--no-playlist",
      "--merge-output-format",
      "mp4",
      "-f",
      "mp4/bestvideo*+bestaudio/best",
      "-o",
      template,
      url,
    ],
    cwd,
  );

  const entries = await fs.readdir(cwd);
  const candidate = entries.find((entry) => entry.startsWith("source."));

  if (!candidate) {
    throw new Error("La vidéo source n'a pas pu être téléchargée.");
  }

  return path.join(cwd, candidate);
}

async function extractFrames(videoPath: string, cwd: string) {
  const pattern = path.join(cwd, "frame-%02d.jpg");

  await runCommand(
    FFMPEG_BIN,
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
  );

  const files = (await fs.readdir(cwd))
    .filter((entry) => entry.startsWith("frame-") && entry.endsWith(".jpg"))
    .sort();

  return Promise.all(
    files.map(async (file) => {
      const filePath = path.join(cwd, file);
      const buffer = await fs.readFile(filePath);
      return {
        filePath,
        dataUrl: dataUrlForImage(buffer, ".jpg"),
      };
    }),
  );
}

async function extractAudio(videoPath: string, cwd: string) {
  const audioPath = path.join(cwd, "audio.wav");

  await runCommand(
    FFMPEG_BIN,
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
  );

  return audioPath;
}

async function transcribeAudio(audioPath: string) {
  const client = getOpenAIClient();
  const response = await client.audio.transcriptions.create({
    file: createReadStream(audioPath),
    model: OPENAI_RECIPE_TRANSCRIBE_MODEL,
  });

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

async function analyzeRecipeFromMedia(input: {
  metadata: SocialVideoMetadata;
  transcript: string;
  frames: Array<{ dataUrl: string }>;
}) {
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: OPENAI_RECIPE_IMPORT_MODEL,
    max_output_tokens: 1800,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "Tu analyses une vidéo de recette publiée sur un réseau social. " +
              "Ta mission est de reconstituer un brouillon de recette exploitable par un humain. " +
              "Tu dois utiliser tous les signaux disponibles: métadonnées sociales, description, transcription audio, et texte visible dans les frames. " +
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
              "Analyse cette recette vidéo.\n\n" +
              `Métadonnées sociales:\n${JSON.stringify(input.metadata, null, 2)}\n\n` +
              `Transcription audio:\n${input.transcript || "(aucune transcription exploitable)"}\n\n` +
              "Consignes métier:\n" +
              "- Le titre doit être court et naturel.\n" +
              "- La description doit être propre et lisible dans une app familiale.\n" +
              "- Les temps sont en minutes.\n" +
              "- Les quantités peu fiables doivent aller dans warnings.\n" +
              "- Ne renvoie rien d'autre que le JSON.",
          },
          ...input.frames.map((frame) => ({
            type: "input_image" as const,
            image_url: frame.dataUrl,
            detail: "low" as const,
          })),
        ],
      },
    ],
  });

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
    const metadata = await getSocialMetadata(url, tempDir);
    const videoPath = await downloadSourceVideo(url, tempDir);
    const [frames, audioPath] = await Promise.all([
      extractFrames(videoPath, tempDir),
      extractAudio(videoPath, tempDir),
    ]);

    const transcript = await transcribeAudio(audioPath);
    const analysis = await analyzeRecipeFromMedia({
      metadata,
      transcript,
      frames,
    });

    let imageUrl = "";

    if (metadata.thumbnailUrl) {
      try {
        imageUrl = await downloadAndStoreImage(metadata.thumbnailUrl);
      } catch {
        imageUrl = "";
      }
    }

    if (!imageUrl && frames[0]?.filePath) {
      const firstFrameBuffer = await fs.readFile(frames[0].filePath);
      imageUrl = await storeImageBuffer(firstFrameBuffer, ".jpg");
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
