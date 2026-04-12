import { cn } from "@/lib/utils";

interface AppBrandProps {
  compact?: boolean;
  className?: string;
}

export function AppBrand({ compact = false, className }: AppBrandProps) {
  return (
    <div className={cn("flex items-center", compact ? "gap-2" : "gap-3", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-white/95 shadow-sm",
          compact ? "size-9" : "size-11",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/tablee/logo-tablee-nobg.png"
          alt="Logo Tablee"
          className={cn("object-contain", compact ? "size-[22px]" : "size-[30px]")}
        />
      </span>

      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-extrabold tracking-tight text-primary",
            compact ? "text-lg" : "text-2xl",
          )}
        >
          Tablee
        </p>
      </div>
    </div>
  );
}
