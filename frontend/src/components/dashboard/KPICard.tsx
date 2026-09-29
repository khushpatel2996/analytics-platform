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
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  className,
}: KPICardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between min-h-[145px] transition-all hover:border-slate-300 hover:shadow-xs',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-[10px] font-bold font-mono',
                badgeColor || 'bg-blue-50 text-blue-700 border border-blue-200'
              )}
            >
              {badge}
            </span>
          )}
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBgColor, iconColor)}>
            <Icon className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>
      <div>
        <div className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight leading-none my-1">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1.5 font-normal truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
