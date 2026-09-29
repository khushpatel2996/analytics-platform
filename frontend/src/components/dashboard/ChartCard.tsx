import React from 'react';
import { cn } from '@/lib/utils';
import { ChartSkeleton } from '@/components/common/LoadingSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  onRetry?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  height?: string;
}

export function ChartCard({
  title,
  subtitle,
  loading = false,
  error = null,
  isEmpty = false,
  onRetry,
  actions,
  children,
  className,
  height = 'min-h-[300px]',
}: ChartCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300/80',
        className
      )}
    >
      {/* Card Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight leading-snug truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 truncate font-normal">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* Chart Body */}
      <div
        className={cn('w-full flex-1 flex flex-col justify-center min-h-[290px]', height)}
        style={{ minHeight: 290 }}
      >
        {loading ? (
          <div className="w-full h-full min-h-[290px] flex items-center justify-center">
            <ChartSkeleton height={height} />
          </div>
        ) : error ? (
          <div className="w-full h-full min-h-[290px] flex items-center justify-center">
            <ErrorState message={error} onRetry={onRetry} />
          </div>
        ) : isEmpty ? (
          <div className="w-full h-full min-h-[290px] flex items-center justify-center">
            <EmptyState
              title="No data available for the selected filters."
              description="Try adjusting your dates, state, or category filters to broaden your search."
            />
          </div>
        ) : (
          <div className="w-full h-full min-h-[290px] flex items-center justify-center">{children}</div>
        )}
      </div>
    </div>
  );
}
