import React from 'react';
import { Menu } from 'lucide-react';
import { RefreshButton } from '@/components/common/RefreshButton';

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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 py-3.5 flex items-center justify-between min-h-[64px]">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden shrink-0"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="hidden sm:block text-xs sm:text-[13px] text-slate-500 mt-0.5 truncate font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4">
        {metadataInfo && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>{metadataInfo}</span>
          </div>
        )}

        {onRefresh && (
          <RefreshButton onRefresh={onRefresh} loading={loading} />
        )}
      </div>
    </header>
  );
}
