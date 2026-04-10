interface ErrorMessageProps {
  title?: string;
  message: string;
}

export function ErrorMessage({
  title = "Erreur",
  message,
}: ErrorMessageProps) {
  return (
    <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4">
      <h3 className="text-sm font-semibold text-destructive">{title}</h3>
      <p className="mt-1 text-sm text-destructive/80">{message}</p>
    </div>
  );
}
