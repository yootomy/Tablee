"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play, X } from "lucide-react";

type RecipeSourceViewerDialogProps = {
  sourceUrl: string;
  title: string;
};

type SupportedEmbed =
  | {
      provider: "tiktok";
      label: string;
      embedUrl: string;
      kind: "vertical";
    }
  | {
      provider: "instagram";
      label: string;
      embedUrl: string;
      kind: "vertical" | "square";
    };

function getSupportedEmbed(url: string): SupportedEmbed | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (
      ["www.tiktok.com", "tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(
        hostname,
      )
    ) {
      const match = parsed.pathname.match(/\/(?:video|photo)\/(\d+)/);

      if (!match?.[1]) {
        return null;
      }

      return {
        provider: "tiktok",
        label: "Voir le post",
        embedUrl: `https://www.tiktok.com/player/v1/${match[1]}?description=1&music_info=1&controls=1`,
        kind: "vertical",
      };
    }

    if (["www.instagram.com", "instagram.com"].includes(hostname)) {
      const match = parsed.pathname.match(/^\/(reel|p)\/([^/?#]+)/);

      if (!match?.[1] || !match[2]) {
        return null;
      }

      const kind = match[1] === "reel" ? "vertical" : "square";

      return {
        provider: "instagram",
        label: "Voir le post",
        embedUrl: `https://www.instagram.com/${match[1]}/${match[2]}/embed/captioned/`,
        kind,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function RecipeSourceViewerDialog({
  sourceUrl,
  title,
}: RecipeSourceViewerDialogProps) {
  const [open, setOpen] = useState(false);
  const embed = useMemo(() => getSupportedEmbed(sourceUrl), [sourceUrl]);

  if (!embed) {
    return null;
  }

  const frameClassName =
    embed.kind === "square"
      ? "aspect-square max-h-[min(55vh,20rem)] w-auto mx-auto"
      : "aspect-[9/16] max-h-[min(65vh,26rem)] w-auto mx-auto";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
        onClick={() => setOpen(true)}
      >
        <Play className="size-3.5" />
        {embed.label}
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recipe-source-dialog-title"
            className="flex max-h-[90dvh] w-full max-w-[min(100vw-2rem,32rem)] flex-col overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                  {embed.provider === "tiktok" ? "TikTok" : "Instagram"}
                </p>
                <h3
                  id="recipe-source-dialog-title"
                  className="truncate text-base font-bold text-foreground"
                >
                  {title}
                </h3>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="overflow-y-auto bg-muted/30 p-3 sm:p-4">
              <div className="flex w-full justify-center">
                <div className={`${frameClassName} overflow-hidden rounded-[1.4rem] border border-border bg-black shadow-sm`}>
                  <iframe
                    src={embed.embedUrl}
                    title={`Source sociale pour ${title}`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Fermer
              </Button>
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                <Button type="button">
                  <ExternalLink className="size-4" />
                  Ouvrir la source
                </Button>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
