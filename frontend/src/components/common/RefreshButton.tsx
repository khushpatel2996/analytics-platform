import React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
  className?: string;
}

export function RefreshButton({ onRefresh, loading = false, className }: RefreshButtonProps) {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors',
        className
      )}
      title="Refresh data"
    >
      <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin text-brand-600')} />
      <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
    </button>
  );
}
