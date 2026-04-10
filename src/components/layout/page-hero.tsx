import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHero({
  eyebrow,
  title,
  description,
  meta,
  action,
  children,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 text-white shadow-lg sm:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            {eyebrow}
          </p>
          <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
          <p className="max-w-2xl text-sm text-white/75">{description}</p>
          {meta ? <p className="text-sm text-white/70">{meta}</p> : null}
        </div>
        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
