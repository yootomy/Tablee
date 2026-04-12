"use client";

import { useEffect, useState } from "react";
import { importRecipeFromUrl } from "@/actions/recipe-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ImportedRecipeDraft } from "@/types/recipe-import";
import { Link2, Sparkles, X } from "lucide-react";

interface ImportRecipeDialogProps {
  onImported: (draft: ImportedRecipeDraft) => void;
}

export function ImportRecipeDialog({ onImported }: ImportRecipeDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const estimated = Math.round(100 * (1 - Math.exp(-elapsed / 12000)));
      setProgress((current) => Math.max(current, Math.min(96, estimated)));
    }, 350);

    return () => window.clearInterval(interval);
  }, [loading]);

  function getProgressLabel(value: number) {
    if (value < 20) return "Récupération du lien social...";
    if (value < 45) return "Téléchargement de la vidéo...";
    if (value < 75) return "Analyse de la vidéo et de l'audio...";
    return "Préparation du brouillon de recette...";
  }

  async function handleSubmit() {
    if (!url.trim()) {
      setError("Ajoute un lien TikTok ou Instagram.");
      return;
    }

    setProgress(4);
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("url", url.trim());

    const result = await importRecipeFromUrl(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      setProgress(0);
      return;
    }

    setProgress(100);
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    onImported(result.draft);
    setLoading(false);
    setProgress(0);
    setOpen(false);
    setUrl("");
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="border-white/20 bg-white/95 text-foreground hover:bg-white"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="size-3.5" />
        Importer un lien
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-recipe-dialog-title"
            className="w-full max-w-xl rounded-3xl border border-border bg-background p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 id="import-recipe-dialog-title" className="text-lg font-bold">
                  Importer une recette avec l&apos;IA
                </h3>
                <p className="text-sm text-muted-foreground">
                  Colle un lien TikTok ou Instagram. Tablee analysera la
                  description, les métadonnées et la vidéo elle-même pour
                  préremplir la fiche.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipe-import-url">Lien social</Label>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="recipe-import-url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://www.tiktok.com/... ou https://www.instagram.com/..."
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                L&apos;analyse peut prendre quelques secondes et demandera au
                serveur d&apos;avoir{" "}
                <span className="font-semibold text-foreground">
                  GEMINI_API_KEY
                </span>
                {" "}ou{" "}
                <span className="font-semibold text-foreground">
                  OPENAI_API_KEY
                </span>
                , <span className="font-semibold text-foreground">yt-dlp</span>{" "}
                et <span className="font-semibold text-foreground">ffmpeg</span>.
              </div>

              {error ? (
                <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {getProgressLabel(progress)}
                    </p>
                    <span className="text-sm font-semibold text-primary">
                      {progress}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Progression estimée pendant que Tablee récupère le média et
                    prépare le brouillon.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button type="button" onClick={handleSubmit} disabled={loading}>
                  {loading ? "Analyse en cours..." : "Analyser le lien"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
