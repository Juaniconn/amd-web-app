export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 flex-1 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
      <div className="h-8 w-2/3 rounded bg-muted animate-pulse" />
      <div className="h-4 w-full rounded bg-muted animate-pulse" />
      <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
    </div>
  );
}
