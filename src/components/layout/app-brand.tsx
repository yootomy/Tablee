import Image from "next/image";
import { cn } from "@/lib/utils";
import logoTablee from "../../../public/logo-tablee-nobg.png";

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
        <Image
          src={logoTablee}
          alt="Logo Tablee"
          width={compact ? 22 : 30}
          height={compact ? 22 : 30}
          className={cn("object-contain", compact ? "size-[22px]" : "size-[30px]")}
          priority
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
