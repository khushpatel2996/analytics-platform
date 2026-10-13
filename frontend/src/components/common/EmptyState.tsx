import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
}

export function EmptyState({
  title = 'No data available for the selected filters',
  description = 'Try adjusting your dates, state, or category filters to broaden your search.',
  onReset,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        <Inbox className="w-5 h-5" />
      </div>
      <h3 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">{description}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-4 inline-flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100/70 border border-blue-200/80 dark:border-blue-900 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}
