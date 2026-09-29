import React, { useState, useMemo } from 'react';
import {
  Award,
  Crown,
  Sparkles,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { DatasetAnalytics } from '@/types';
import { WhyThisMattersCard } from './WhyThisMattersCard';
import { useDataset } from '@/context/DatasetContext';
import { formatNumber } from '@/utils/formatting';
import { cn } from '@/lib/utils';

interface RankingsAnalyticsViewProps {
  moduleTitle: string;
  analytics?: DatasetAnalytics | null;
}

export function RankingsAnalyticsView({
  moduleTitle,
  analytics,
}: RankingsAnalyticsViewProps) {
  const { profile, primaryMetric, setPrimaryMetric, applyCrossFilter } = useDataset();
  const rankings = analytics?.rankings;
  const entities = rankings?.rankings || [];
  const whyThisMatters = analytics?.why_this_matters?.rankings;

  const [selectedEntityIndex, setSelectedEntityIndex] = useState<number>(0);
  const [topN, setTopN] = useState<number | 'ALL'>(10);

  const numericCols = profile?.summary?.numeric_columns || [];
  const activeMetric = primaryMetric || analytics?.primary_metric?.column || (numericCols.length > 0 ? numericCols[0] : null);

  if (!rankings || !rankings.available || entities.length === 0) {
    return (
      <div className="space-y-6">
        <WhyThisMattersCard
          moduleTitle={moduleTitle}
          text={whyThisMatters || 'Leaderboards highlight top contributors driving overall performance.'}
        />
        <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center max-w-lg mx-auto my-8 shadow-xs">
          <Award className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            No Entity Rankings Feasible
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Rankings analysis requires discrete entities (products, customers, staff, students) combined with a quantitative performance metric.
          </p>
        </div>
      </div>
    );
  }

  const activeRanking = entities[selectedEntityIndex] || entities[0];
  const leader = activeRanking.items[0];
  const displayedItems = useMemo(() => {
    if (topN === 'ALL') return activeRanking.items;
    return activeRanking.items.slice(0, topN);
  }, [activeRanking.items, topN]);

  const totalVolume = displayedItems.reduce((acc, it) => acc + (it.value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Contextual Why This Matters Card */}
      <WhyThisMattersCard
        moduleTitle={moduleTitle}
        text={whyThisMatters || `'${leader?.name}' leads ${activeRanking.label}${leader?.percentage ? ` (${leader.percentage.toFixed(1)}% contribution)` : ''}. Leaderboards highlight performance skew, where a small cohort often drives a disproportionate share of total outcomes.`}
      />

      {/* Header and Entity Selector */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {moduleTitle}
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Ranked by {activeRanking.metric_label}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Top performing entities sorted in descending order of performance impact.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Metric Selector */}
          {numericCols.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <span className="text-[11px] font-bold text-slate-500">Rank by:</span>
              <select
                value={activeMetric || ''}
                onChange={(e) => setPrimaryMetric(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                title="Switch metric to rank entities by"
              >
                {numericCols.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Entity Switcher */}
          {entities.length > 1 && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
              {entities.map((ent, idx) => (
                <button
                  key={ent.entity_column}
                  type="button"
                  onClick={() => setSelectedEntityIndex(idx)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                    selectedEntityIndex === idx
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  )}
                >
                  {ent.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>#1 Top Performer</span>
            <Crown className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono truncate">
            {leader?.name || 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Leader across {activeRanking.label}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Leader Contribution</span>
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {leader?.percentage !== null && leader?.percentage !== undefined
              ? `${leader.percentage.toFixed(1)}%`
              : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Share of cumulative volume</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Displayed Aggregate</span>
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {formatNumber(totalVolume)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sum of displayed leaders</p>
        </div>
      </div>

      {/* Leaderboard Table with Top N Toggle */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {activeRanking.label} Leaderboard
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any entity to filter the entire workspace.
            </p>
          </div>

          {/* Top N Toggle Button Group */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5">
              Show:
            </span>
            {([5, 10, 20, 'ALL'] as const).map((n) => (
              <button
                key={String(n)}
                type="button"
                onClick={() => setTopN(n)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-semibold transition-all',
                  topN === n
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {n === 'ALL' ? 'All' : `Top ${n}`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 w-16 text-center">Rank</th>
                <th className="py-2.5 px-4">{activeRanking.label}</th>
                <th className="py-2.5 px-4 text-right">Relative Contribution</th>
                <th className="py-2.5 px-4 text-right">{activeRanking.metric_label}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedItems.map((item) => (
                <tr
                  key={item.rank}
                  onClick={() => applyCrossFilter(activeRanking.entity_column, item.name)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  title={`Filter dataset by ${item.name}`}
                >
                  <td className="py-2.5 px-4 text-center font-bold">
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs',
                        item.rank === 1
                          ? 'bg-amber-100 text-amber-800'
                          : item.rank === 2
                          ? 'bg-slate-200 text-slate-700'
                          : item.rank === 3
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {item.rank}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900">{item.name}</td>
                  <td className="py-2.5 px-4 text-right">
                    {item.percentage !== null && item.percentage !== undefined ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-600 w-12 text-right">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold font-mono text-slate-900">
                    {formatNumber(item.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
