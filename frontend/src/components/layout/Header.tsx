import React from 'react';
import { Menu } from 'lucide-react';
import { RefreshButton } from '@/components/common/RefreshButton';
import { ThemeToggle } from '@/components/common/ThemeToggle';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  loading?: boolean;
  onMenuClick: () => void;
  metadataInfo?: string;
}

export function Header({
  title,
  subtitle,
  onRefresh,
  loading = false,
  onMenuClick,
  metadataInfo,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-5 sm:px-6 h-14 flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-1.5 -ml-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden shrink-0 cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
              Analytics
            </span>
            {metadataInfo && (
              <>
                <span className="text-slate-300 dark:text-slate-700 text-xs">·</span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {metadataInfo}
                </span>
              </>
            )}
          </div>
          <h2 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
            {title}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-4">
        {onRefresh && (
          <RefreshButton onRefresh={onRefresh} loading={loading} />
        )}

        <ThemeToggle />
      </div>
    </header>
  );
}
