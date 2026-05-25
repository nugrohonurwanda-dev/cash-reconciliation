// src/components/ui/LoadingSkeleton.tsx
// Komponen skeleton loading reusable untuk semua halaman

// ─── Atom: satu blok shimmer ──────────────────────────────────────────────────
export function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--surface-hover)] ${className}`}
    />
  );
}

// ─── Skeleton untuk baris tabel (cols bisa dikonfigurasi) ─────────────────────
export function SkeletonTableRows({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid px-4 py-3 border-b border-[var(--border)]"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBlock
              key={j}
              className={`h-4 ${j === 0 ? "w-3/4" : j === cols - 1 ? "w-1/2 ml-auto" : "w-2/3 mx-auto"}`}
            />
          ))}
        </div>
      ))}
    </>
  );
}

// ─── Skeleton untuk halaman detail shift (form input) ────────────────────────
export function SkeletonShiftDetail() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header info shift */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5 space-y-3">
        <SkeletonBlock className="h-5 w-48" />
        <div className="flex gap-4">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-4 w-28" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>

      {/* Tabel input */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-3 px-4 py-3 bg-[var(--surface-hover)] border-b border-[var(--border)] gap-4">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-3 w-24 ml-auto" />
          <SkeletonBlock className="h-3 w-16 ml-auto" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-3 items-center px-4 py-3 border-b border-[var(--border)] gap-4"
          >
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-8 w-full rounded-lg" />
            <SkeletonBlock className="h-4 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton untuk halaman daftar (review / finance) ────────────────────────
export function SkeletonListPage({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Filter bar */}
      <div className="flex gap-3">
        <SkeletonBlock className="h-9 w-32 rounded-lg" />
        <SkeletonBlock className="h-9 w-32 rounded-lg" />
        <SkeletonBlock className="h-9 w-24 rounded-lg ml-auto" />
      </div>

      {/* Tabel */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-5 px-4 py-3 bg-[var(--surface-hover)] border-b border-[var(--border)] gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonBlock key={i} className="h-3 w-3/4" />
          ))}
        </div>
        <SkeletonTableRows rows={rows} cols={5} />
      </div>
    </div>
  );
}
