import React, { useState, useMemo } from 'react';
import {
  Network,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  AlertTriangle,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { DatasetAnalytics } from '@/types';
import { WhyThisMattersCard } from './WhyThisMattersCard';
import { cn } from '@/lib/utils';

interface CorrelationsAnalyticsViewProps {
  moduleTitle: string;
  analytics?: DatasetAnalytics | null;
}

export function CorrelationsAnalyticsView({
  moduleTitle,
  analytics,
}: CorrelationsAnalyticsViewProps) {
  const correlations = analytics?.correlations;
  const whyThisMatters = analytics?.why_this_matters?.correlations;

  const [minThreshold, setMinThreshold] = useState<number>(0.0);
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'POSITIVE' | 'NEGATIVE'>('ALL');
  const [showFullMatrix, setShowFullMatrix] = useState<boolean>(false);

  // Extract all pairwise correlations (excluding self-correlations and duplicate pairs)
  const rankedPairs = useMemo(() => {
    if (!correlations || !correlations.columns || !correlations.matrix) return [];
    const cols = correlations.columns;
    const pairs: Array<{
      col1: string;
      col2: string;
      r: number;
      abs_r: number;
      relationship: string;
      type: 'positive' | 'negative' | 'neutral';
    }> = [];

    for (let i = 0; i < cols.length; i++) {
      for (let j = i + 1; j < cols.length; j++) {
        const c1 = cols[i];
        const c2 = cols[j];
        const val = correlations.matrix[c1]?.[c2];
        if (val !== null && val !== undefined && !isNaN(val)) {
          const absVal = Math.abs(val);
          let rel = 'Negligible relationship';
          let type: 'positive' | 'negative' | 'neutral' = 'neutral';

          if (val >= 0.7) {
            rel = 'Strong direct relationship';
            type = 'positive';
          } else if (val >= 0.3) {
            rel = 'Moderate positive relationship';
            type = 'positive';
          } else if (val <= -0.7) {
            rel = 'Strong inverse relationship';
            type = 'negative';
          } else if (val <= -0.3) {
            rel = 'Moderate inverse relationship';
            type = 'negative';
          }

          pairs.push({
            col1: c1,
            col2: c2,
            r: val,
            abs_r: absVal,
            relationship: rel,
            type,
          });
        }
      }
    }

    return pairs.sort((a, b) => b.abs_r - a.abs_r);
  }, [correlations]);

  const filteredPairs = useMemo(() => {
    return rankedPairs.filter((p) => {
      if (p.abs_r < minThreshold) return false;
      if (directionFilter === 'POSITIVE' && p.r <= 0) return false;
      if (directionFilter === 'NEGATIVE' && p.r >= 0) return false;
      return true;
    });
  }, [rankedPairs, minThreshold, directionFilter]);

  if (!correlations || !correlations.available || correlations.columns.length < 2) {
    return (
      <div className="space-y-6">
        <WhyThisMattersCard
          moduleTitle={moduleTitle}
          text={whyThisMatters || 'Correlation analysis maps pairwise numerical co-movement. Correlation does not imply causation.'}
        />
        <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center max-w-lg mx-auto my-8 shadow-xs">
          <Network className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Insufficient Numeric Columns for Correlation
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Multivariate correlation analysis requires at least two continuous numerical columns with non-zero variance.
          </p>
        </div>
      </div>
    );
  }

  const { columns, matrix, strongest_positive, strongest_negative } = correlations;

  const getCellBadge = (val: number | null | undefined, isDiagonal: boolean) => {
    if (isDiagonal) return 'bg-slate-100 text-slate-400 font-bold';
    if (val === null || val === undefined || isNaN(val)) return 'bg-slate-50 text-slate-300';
    if (val >= 0.7) return 'bg-emerald-100 text-emerald-800 font-bold';
    if (val >= 0.3) return 'bg-emerald-50 text-emerald-700 font-semibold';
    if (val <= -0.7) return 'bg-rose-100 text-rose-800 font-bold';
    if (val <= -0.3) return 'bg-rose-50 text-rose-700 font-semibold';
    return 'bg-slate-50 text-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Contextual Why This Matters Card */}
      <WhyThisMattersCard
        moduleTitle={moduleTitle}
        text={whyThisMatters || 'Statistical correlation indicates mathematical co-movement across measures. Note that correlation does not establish causal dependency.'}
      />

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {moduleTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pearson linear correlation coefficient (r) calculated across {columns.length} numeric attributes.
          </p>
        </div>

        {/* Prominent Causation Disclaimer Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Correlation ≠ Causation</span>
        </div>
      </div>

      {/* 2 Callout Cards: Strongest Positive & Strongest Negative */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold uppercase tracking-wider mb-1">
              <ArrowUpRight className="w-4 h-4" />
              <span>Strongest Positive Relationship</span>
            </div>
            {strongest_positive ? (
              <div>
                <div className="text-base font-bold text-slate-900">
                  {strongest_positive.col1} & {strongest_positive.col2}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct proportional co-movement
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No significant positive pair found</p>
            )}
          </div>
          {strongest_positive && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-bold text-lg">
              +{strongest_positive.correlation.toFixed(2)}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-rose-700 text-[11px] font-semibold uppercase tracking-wider mb-1">
              <ArrowDownRight className="w-4 h-4" />
              <span>Strongest Inverse Relationship</span>
            </div>
            {strongest_negative ? (
              <div>
                <div className="text-base font-bold text-slate-900">
                  {strongest_negative.col1} & {strongest_negative.col2}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Opposite directional relationship
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No significant inverse pair found</p>
            )}
          </div>
          {strongest_negative && (
            <div className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold text-lg">
              {strongest_negative.correlation.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      {/* Strongest Relationships First (Ranked List) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Ranked Feature Relationships
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strongest statistical connections sorted by absolute magnitude of correlation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direction Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5">
                Direction:
              </span>
              {[
                { label: 'All', val: 'ALL' },
                { label: 'Positive (+)', val: 'POSITIVE' },
                { label: 'Negative (−)', val: 'NEGATIVE' },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => setDirectionFilter(btn.val as any)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    directionFilter === btn.val
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Min |r| Threshold Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5">
                Min |r|:
              </span>
              {[
                { label: 'All', val: 0.0 },
                { label: '≥ 0.3', val: 0.3 },
                { label: '≥ 0.5', val: 0.5 },
                { label: '≥ 0.7', val: 0.7 },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => setMinThreshold(btn.val)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer',
                    minThreshold === btn.val
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Ranked Pairs Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Feature Pair</th>
                <th className="py-2.5 px-4 text-center">Relationship Type</th>
                <th className="py-2.5 px-4 text-right">Coefficient (r)</th>
                <th className="py-2.5 px-4 text-right">Strength</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPairs.slice(0, 12).map((pair, idx) => {
                const isPos = pair.r > 0;
                return (
                  <tr key={`${pair.col1}-${pair.col2}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      <span>{pair.col1}</span>
                      <span className="text-slate-400 mx-2">↔</span>
                      <span>{pair.col2}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                          pair.type === 'positive'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : pair.type === 'negative'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {pair.relationship}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      <span
                        className={cn(
                          isPos ? 'text-emerald-700' : pair.r < 0 ? 'text-rose-700' : 'text-slate-600'
                        )}
                      >
                        {isPos ? `+${pair.r.toFixed(2)}` : pair.r.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', isPos ? 'bg-emerald-500' : 'bg-rose-500')}
                            style={{ width: `${Math.min(pair.abs_r * 100, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {(pair.abs_r * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expandable Full Pearson Heatmap Matrix */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFullMatrix(!showFullMatrix)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-blue-600" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Full Correlation Matrix Heatmap
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Complete {columns.length} × {columns.length} pairwise correlation matrix.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
            <span>{showFullMatrix ? 'Collapse Matrix' : 'Expand Matrix'}</span>
            {showFullMatrix ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {showFullMatrix && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/30">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4 font-bold text-slate-700">Feature</th>
                    {columns.map((col) => (
                      <th key={col} className="py-2.5 px-3 text-center whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {columns.map((rCol) => (
                    <tr key={rCol} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap bg-slate-50/50">
                        {rCol}
                      </td>
                      {columns.map((cCol) => {
                        const isDiagonal = rCol === cCol;
                        const val = matrix[rCol]?.[cCol];
                        return (
                          <td key={cCol} className="py-2 px-2 text-center">
                            <span
                              className={cn(
                                'inline-block px-2 py-0.5 rounded text-[11px] font-mono transition-colors',
                                getCellBadge(val, isDiagonal)
                              )}
                            >
                              {isDiagonal
                                ? '1.00'
                                : val !== null && val !== undefined
                                ? val > 0
                                  ? `+${val.toFixed(2)}`
                                  : val.toFixed(2)
                                : '—'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
