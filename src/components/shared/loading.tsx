import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 shadow-lg sm:p-5">
        <Skeleton className="h-3 w-24 bg-white/20" />
        <Skeleton className="mt-3 h-8 w-52 bg-white/20" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl bg-white/15" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full bg-white/15" />
          <Skeleton className="h-7 w-28 rounded-full bg-white/15" />
          <Skeleton className="h-7 w-24 rounded-full bg-white/15" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
