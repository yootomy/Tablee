export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-accent/60 via-background to-primary/5 px-4">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">Tablee</h1>
        <p className="mt-1 text-sm text-muted-foreground">Organisez vos repas en famille</p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
