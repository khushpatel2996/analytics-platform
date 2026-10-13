import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  Columns,
  AlertOctagon,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { DatasetAnalytics } from '@/types';
import { WhyThisMattersCard } from './WhyThisMattersCard';
import { formatNumber } from '@/utils/formatting';
import { cn } from '@/lib/utils';

interface DataQualityAnalyticsViewProps {
  moduleTitle: string;
  analytics?: DatasetAnalytics | null;
}

export function DataQualityAnalyticsView({
  moduleTitle,
  analytics,
}: DataQualityAnalyticsViewProps) {
  const dq = analytics?.data_quality;
  const whyThisMatters = analytics?.why_this_matters?.['data-quality'];

  if (!dq) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-10 text-center max-w-lg mx-auto my-8 shadow-xs">
        <ShieldCheck className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Data Quality Assessment Incomplete
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Quality metrics could not be loaded for this dataset.
        </p>
      </div>
    );
  }

  const isExcellent = dq.score >= 85;
  const isGood = dq.score >= 70 && dq.score < 85;

  // Outlier info
  const outliers = analytics?.outliers;
  const outlierOverview = outliers?.overview;
  const hasOutliers = Boolean(
    outliers?.available &&
    outlierOverview &&
    outlierOverview.total_anomalies > 0
  );

  // Filter columns with issues
  const columnsWithMissing = dq.columns.filter((c) => c.missing_count > 0);
  const criticalMissingCols = dq.columns.filter((c) => c.missing_percentage >= 20.0);
  const hasDuplicateIssue = dq.duplicate_rows > 0;
  const hasAnyIssues = columnsWithMissing.length > 0 || hasDuplicateIssue || hasOutliers;

  return (
    <div className="space-y-6">
      {/* Contextual Why This Matters Card */}
      <WhyThisMattersCard
        moduleTitle={moduleTitle}
        text={whyThisMatters || `Dataset reflects a ${dq.label} completeness score (${dq.score.toFixed(1)}%). Screening identified ${formatNumber(dq.total_missing_values)} missing cells (${dq.missing_value_percentage.toFixed(1)}%) and ${formatNumber(dq.duplicate_rows)} duplicate records. Resolving nulls and duplicates prevents skewed statistical metrics.`}
      />

      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            {moduleTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Completeness scoring, null ratios, redundancy, and attribute health assessment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-3.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5',
              isExcellent
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                : isGood
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Health Rating: {dq.label}</span>
          </span>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-1">
            <span>Overall Score</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
            {dq.score.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Completeness index</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-1">
            <span>Missing Values</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
            {dq.missing_value_percentage.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {formatNumber(dq.total_missing_values)} empty cells
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-1">
            <span>Duplicate Rows</span>
            <Database className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
            {formatNumber(dq.duplicate_rows)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {dq.duplicate_percentage.toFixed(1)}% redundancy
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-1">
            <span>Features Profiled</span>
            <Columns className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
            {dq.total_columns}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Across {formatNumber(dq.total_rows)} rows</p>
        </div>
      </div>

      {/* Issues Requiring Attention Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
          <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Issues Requiring Attention Prior to Business Decision-Making
          </h3>
        </div>

        {hasAnyIssues ? (
          <div className="space-y-3">
            {criticalMissingCols.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block mb-0.5">
                    High Missing Rate in Critical Attributes:
                  </strong>
                  <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
                    {criticalMissingCols.map((c) => `${c.column} (${c.missing_percentage.toFixed(1)}% null)`).join(', ')}.
                    High missingness will bias averages and reduce statistical confidence.
                  </p>
                </div>
              </div>
            )}

            {columnsWithMissing.length > 0 && criticalMissingCols.length === 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block mb-0.5">
                    Minor Missing Values Detected:
                  </strong>
                  <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                    {columnsWithMissing.map((c) => `${c.column} (${c.missing_count} rows)`).join(', ')}.
                  </p>
                </div>
              </div>
            )}

            {hasDuplicateIssue && (
              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <Database className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block mb-0.5">
                    Duplicate Records Present:
                  </strong>
                  <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                    Found {formatNumber(dq.duplicate_rows)} duplicate rows ({dq.duplicate_percentage.toFixed(1)}% of dataset).
                    Duplicate entries may artificially inflate totals and transaction counts.
                  </p>
                </div>
              </div>
            )}

            {hasOutliers && outlierOverview && (
              <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 text-xs text-blue-950 dark:text-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block mb-0.5">
                      Potentially unusual values: {(outlierOverview.highest_anomaly_rate ?? outlierOverview.anomaly_rate ?? 0).toFixed(1)}%
                    </strong>
                    <p className="text-blue-800 dark:text-blue-300 leading-relaxed text-[11px]">
                      {outlierOverview.total_anomalies} observations outside empirical boundaries across {outlierOverview.affected_features} feature{outlierOverview.affected_features > 1 ? 's' : ''}.
                      <span className="block mt-0.5 text-slate-500 dark:text-slate-400 italic">
                        Note: Statistical outliers represent extreme numeric observations rather than data quality errors (such as missing cells or duplicates).
                      </span>
                    </p>
                  </div>
                </div>

                <Link
                  to="/dataset/outliers"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shrink-0 shadow-2xs transition-colors"
                >
                  <span>Investigate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Zero missing cells, zero duplicates, and zero unusual values detected. Dataset integrity is clean and verified.</span>
          </div>
        )}
      </div>

      {/* Column Health Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight mb-1">
          Attribute Integrity & Health Matrix
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Column-by-column missing ratio, data type, and distinct cardinality.
        </p>

        <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Column Name</th>
                <th className="py-2.5 px-4">Data Type</th>
                <th className="py-2.5 px-4 text-right">Missing Count</th>
                <th className="py-2.5 px-4 text-right">Missing %</th>
                <th className="py-2.5 px-4 text-right">Unique Distinct</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dq.columns.map((col) => {
                const hasMissing = col.missing_count > 0;
                return (
                  <tr key={col.column} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">{col.column}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">{col.type}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                      {formatNumber(col.missing_count)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-semibold',
                          hasMissing
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        )}
                      >
                        {col.missing_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatNumber(col.unique_count)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                          !hasMissing
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : col.missing_percentage > 20
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                        )}
                      >
                        {!hasMissing ? 'Clean' : col.missing_percentage > 20 ? 'Critical' : 'Warning'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
