import { AppPageHeader } from "@/components/layout/app-page-header";

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
    <AppPageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      meta={meta}
      action={action}
      className={className}
    >
      {children}
    </AppPageHeader>
  );
}
