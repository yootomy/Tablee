import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function FormSection({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-bold">{title}</h3>
          {description ? (
            <div className="text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className={cn("space-y-4", contentClassName)}>{children}</div>
    </section>
  );
}
