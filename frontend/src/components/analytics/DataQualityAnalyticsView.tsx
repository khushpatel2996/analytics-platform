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
      <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center max-w-lg mx-auto my-8 shadow-xs">
        <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Data Quality Assessment Incomplete
        </h3>
        <p className="text-xs text-slate-500 mt-1">
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
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {moduleTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Completeness scoring, null ratios, redundancy, and attribute health assessment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5',
              isExcellent
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : isGood
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Health Rating: {dq.label}</span>
          </span>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Overall Score</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {dq.score.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Completeness index</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Missing Values</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {dq.missing_value_percentage.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {formatNumber(dq.total_missing_values)} empty cells
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Duplicate Rows</span>
            <Database className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatNumber(dq.duplicate_rows)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {dq.duplicate_percentage.toFixed(1)}% redundancy
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Features Profiled</span>
            <Columns className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {dq.total_columns}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across {formatNumber(dq.total_rows)} rows</p>
        </div>
      </div>

      {/* Issues Requiring Attention Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3.5">
          <AlertOctagon className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Issues Requiring Attention Prior to Business Decision-Making
          </h3>
        </div>

        {hasAnyIssues ? (
          <div className="space-y-3">
            {criticalMissingCols.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 text-xs text-rose-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block mb-0.5">
                    High Missing Rate in Critical Attributes:
                  </strong>
                  <p className="text-rose-800 leading-relaxed">
                    {criticalMissingCols.map((c) => `${c.column} (${c.missing_percentage.toFixed(1)}% null)`).join(', ')}.
                    High missingness will bias averages and reduce statistical confidence.
                  </p>
                </div>
              </div>
            )}

            {columnsWithMissing.length > 0 && criticalMissingCols.length === 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block mb-0.5">
                    Minor Missing Values Detected:
                  </strong>
                  <p className="text-amber-800 leading-relaxed">
                    {columnsWithMissing.map((c) => `${c.column} (${c.missing_count} rows)`).join(', ')}.
                  </p>
                </div>
              </div>
            )}

            {hasDuplicateIssue && (
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
                <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block mb-0.5">
                    Duplicate Records Present:
                  </strong>
                  <p className="text-amber-800 leading-relaxed">
                    Found {formatNumber(dq.duplicate_rows)} duplicate rows ({dq.duplicate_percentage.toFixed(1)}% of dataset).
                    Duplicate entries may artificially inflate totals and transaction counts.
                  </p>
                </div>
              </div>
            )}

            {hasOutliers && outlierOverview && (
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block mb-0.5">
                      Potentially unusual values: {(outlierOverview.highest_anomaly_rate ?? outlierOverview.anomaly_rate ?? 0).toFixed(1)}%
                    </strong>
                    <p className="text-blue-800 leading-relaxed text-[11px]">
                      {outlierOverview.total_anomalies} observations outside empirical boundaries across {outlierOverview.affected_features} feature{outlierOverview.affected_features > 1 ? 's' : ''}.
                      <span className="block mt-0.5 text-slate-500 italic">
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
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Zero missing cells, zero duplicates, and zero unusual values detected. Dataset integrity is clean and verified.</span>
          </div>
        )}
      </div>

      {/* Column Health Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight mb-1">
          Attribute Integrity & Health Matrix
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Column-by-column missing ratio, data type, and distinct cardinality.
        </p>

        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Column Name</th>
                <th className="py-2.5 px-4">Data Type</th>
                <th className="py-2.5 px-4 text-right">Missing Count</th>
                <th className="py-2.5 px-4 text-right">Missing %</th>
                <th className="py-2.5 px-4 text-right">Unique Distinct</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dq.columns.map((col) => {
                const hasMissing = col.missing_count > 0;
                return (
                  <tr key={col.column} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{col.column}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">{col.type}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium">
                      {formatNumber(col.missing_count)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold',
                          hasMissing
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        )}
                      >
                        {col.missing_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                      {formatNumber(col.unique_count)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          !hasMissing
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : col.missing_percentage > 20
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
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
