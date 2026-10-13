import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  iconBgColor?: string;
  iconColor?: string;
  className?: string;
}

export function KPICard({
  label,
  value,
  subtitle,
  badge,
  badgeColor,
  icon: Icon,
  iconBgColor,
  iconColor,
  className,
}: KPICardProps) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-4.5 shadow-2xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700 min-h-[110px]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-medium font-mono',
                badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              )}
            >
              {badge}
            </span>
          )}
          {Icon && (
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 shrink-0">
              <Icon className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
      <div className="mt-2">
        <div className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
          {value}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
