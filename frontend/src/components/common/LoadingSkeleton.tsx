import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={cn(
        'animate-pulse rounded-md bg-slate-200/80',
        className
      )}
    />
  );
}

export function KPICardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between min-h-[145px]">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <div>
        <Skeleton className="h-7 w-32 my-1" />
        <Skeleton className="h-3.5 w-20 mt-1.5" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 'min-h-[280px]' }: { height?: string }) {
  return (
    <div className={cn('w-full flex items-end gap-3 pt-6 p-4', height)}>
      {[...Array(8)].map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-t-md"
          style={{ height: `${25 + (i * 11) % 65}%` }}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-8 w-48 rounded-lg" />
      </div>
      <div className="space-y-2.5 pt-2">
        <Skeleton className="h-9 w-full rounded-lg" />
        {[...Array(rows)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
