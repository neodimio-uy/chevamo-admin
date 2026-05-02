"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-border/50 ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonKpi() {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-8 w-16" />
      <Skeleton className="mt-1 h-3 w-24" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
      <Skeleton className="h-4 w-32 mb-3" />
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-3 w-1/3 mb-1.5" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}
