import { cn } from "@/lib/utils";

interface AppPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  backgroundImageUrl?: string;
}

export function AppPageHeader({
  eyebrow,
  title,
  description,
  meta,
  badges,
  action,
  children,
  className,
  contentClassName,
  backgroundImageUrl,
}: AppPageHeaderProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 text-white shadow-lg sm:p-5",
        backgroundImageUrl && "min-h-[220px] sm:min-h-[260px]",
        className,
      )}
    >
      {backgroundImageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundImageUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-40 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_65%)] sm:block" />
          <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-white/10 blur-2xl" />
        </>
      )}

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className={cn("space-y-2", contentClassName)}>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
              {eyebrow}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
            {description ? (
              <div className="max-w-2xl text-sm text-white/75">{description}</div>
            ) : null}
          </div>

          {meta ? <div className="text-sm text-white/70">{meta}</div> : null}
          {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
        </div>

        {action ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center lg:justify-end">
            {action}
          </div>
        ) : null}
      </div>

      {children ? <div className="relative mt-4">{children}</div> : null}
    </section>
  );
}
