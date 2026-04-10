import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-accent/60 via-background to-primary/5 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <section className="space-y-5">
            <div className="inline-flex items-center gap-3 rounded-full border border-primary/10 bg-background/75 px-4 py-2 shadow-sm backdrop-blur-sm">
              <Image
                src="/tablee/logo-tablee-nobg.png"
                alt=""
                width={36}
                height={36}
                className="size-9"
              />
              <span className="text-xl font-extrabold tracking-tight text-primary">
                Tablee
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                Organisation familiale
              </p>
              <h1 className="max-w-xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Organisez repas, recettes et courses dans un seul espace simple.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Tablee aide la famille à planifier la semaine, partager les recettes
                utiles et garder une liste de courses vraiment claire, sur téléphone
                comme sur desktop.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                Planning familial
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                Recettes partagées
              </span>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                Courses synchronisées
              </span>
            </div>
          </section>

          <section className="w-full max-w-md justify-self-end">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}
