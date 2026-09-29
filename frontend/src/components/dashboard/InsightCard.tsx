import React from 'react';
import {
  TrendingUp,
  MapPin,
  Package,
  CreditCard,
  Star,
  Tag,
  Sparkles,
} from 'lucide-react';
import { InsightItem } from '@/types';
import { cn } from '@/lib/utils';

interface InsightCardProps {
  insight: InsightItem;
}

export function InsightCard({ insight }: InsightCardProps) {
  // Determine icon & theme based on insight type
  let Icon = Sparkles;
  let themeColor = 'text-blue-700 bg-blue-50 border-blue-200/80';
  let badgeLabel = 'Strategic';

  switch (insight.type?.toLowerCase()) {
    case 'category':
      Icon = Tag;
      themeColor = 'text-blue-700 bg-blue-50 border-blue-200/80';
      badgeLabel = 'Category';
      break;
    case 'geography':
    case 'state':
      Icon = MapPin;
      themeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200/80';
      badgeLabel = 'Geography';
      break;
    case 'growth':
      Icon = TrendingUp;
      themeColor = 'text-purple-700 bg-purple-50 border-purple-200/80';
      badgeLabel = 'Trajectory';
      break;
    case 'payment':
      Icon = CreditCard;
      themeColor = 'text-amber-700 bg-amber-50 border-amber-200/80';
      badgeLabel = 'Payments';
      break;
    case 'product_concentration':
      Icon = Package;
      themeColor = 'text-indigo-700 bg-indigo-50 border-indigo-200/80';
      badgeLabel = 'Catalog';
      break;
    case 'satisfaction':
      Icon = Star;
      themeColor = 'text-teal-700 bg-teal-50 border-teal-200/80';
      badgeLabel = 'Sentiment';
      break;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between h-full transition-all hover:border-slate-300/90 hover:shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
              themeColor
            )}
          >
            <Icon className="w-3 h-3" />
            <span>{badgeLabel}</span>
          </span>

          {insight.metric && (
            <span className="text-[11px] font-medium text-slate-400 truncate max-w-[150px]">
              {insight.metric}
            </span>
          )}
        </div>

        <h4 className="text-sm font-bold text-slate-900 leading-snug">{insight.title}</h4>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">{insight.description}</p>
      </div>

      {insight.value !== undefined && typeof insight.value === 'number' && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Impact Index:</span>
          <span className="font-semibold text-slate-800">{insight.value.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
