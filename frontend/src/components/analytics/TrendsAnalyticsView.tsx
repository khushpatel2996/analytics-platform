import React from 'react';
import {
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Clock,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { DatasetAnalytics } from '@/types';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { WhyThisMattersCard } from './WhyThisMattersCard';
import { formatNumber } from '@/utils/formatting';
import { CHART_COLORS } from '@/utils/colors';

import { useDataset } from '@/context/DatasetContext';

interface TrendsAnalyticsViewProps {
  moduleTitle: string;
  analytics?: DatasetAnalytics | null;
}

export function TrendsAnalyticsView({
  moduleTitle,
  analytics,
}: TrendsAnalyticsViewProps) {
  const { profile, primaryMetric, setPrimaryMetric, applyCrossFilter } = useDataset();
  const trends = analytics?.trends;
  const whyThisMatters = analytics?.why_this_matters?.trends;

  const numericCols = profile?.summary?.numeric_columns || [];
  const activeMetric = primaryMetric || analytics?.primary_metric?.column || (numericCols.length > 0 ? numericCols[0] : null);

  if (!trends || !trends.available || trends.data.length === 0) {
    return (
      <div className="space-y-6">
        <WhyThisMattersCard
          moduleTitle={moduleTitle}
          text={whyThisMatters || 'Chronological tracking maps trajectory and velocity across recording intervals.'}
        />
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            NO TIME-BASED ANALYSIS AVAILABLE
          </h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            This dataset does not contain a suitable date, timestamp, or temporal dimension to calculate time-series velocity.
          </p>
        </div>
      </div>
    );
  }

  const totalValue = trends.data.reduce((acc, pt) => acc + (pt.value || 0), 0);
  const lowestPt = trends.data.reduce(
    (min, pt) => (pt.value < min.value ? pt : min),
    trends.data[0] || { period: 'N/A', value: 0 }
  );
  const firstPt = trends.data[0] || { value: 0 };
  const lastPt = trends.data[trends.data.length - 1] || { value: 0 };
  const netGrowthPct =
    firstPt.value > 0 ? ((lastPt.value - firstPt.value) / firstPt.value) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Contextual Why This Matters Card */}
      <WhyThisMattersCard
        moduleTitle={moduleTitle}
        text={whyThisMatters || `Temporal activity peaked during period '${trends.peak_period}' reaching ${formatNumber(trends.peak_value || 0)} across ${trends.total_periods} recorded cycles. Tracking velocity reveals surges or reporting cadence patterns.`}
      />

      {/* Header Info Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {moduleTitle}
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              {trends.granularity || 'Periodic'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated from {trends.date_column} tracking {trends.metric_label || 'records'}.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Metric Selector */}
          {numericCols.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <span className="text-[11px] font-bold text-slate-500">Metric:</span>
              <select
                value={activeMetric || ''}
                onChange={(e) => setPrimaryMetric(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                title="Switch metric to track over time"
              >
                {numericCols.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>
              {trends.start_period} → {trends.end_period}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Total Periods</span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {trends.total_periods}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{trends.granularity} reporting cycles</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Cumulative Volume</span>
            <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatNumber(totalValue)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across all recorded cycles</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Peak Period</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono truncate">
            {trends.peak_period || 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Peak: {trends.peak_value != null ? formatNumber(trends.peak_value) : 'N/A'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Net Trajectory</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {netGrowthPct >= 0 ? `+${netGrowthPct.toFixed(1)}%` : `${netGrowthPct.toFixed(1)}%`}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Start to end change</p>
        </div>
      </div>

      {/* Primary Trend Area Chart */}
      <ChartCard
        title={`${trends.metric_label || 'Activity'} Timeline`}
        subtitle="Chronological sequence across all observed timestamp intervals"
      >
        <div className="w-full h-full min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={trends.data}
              margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="trendViewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="period"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => formatNumber(val, true)}
              />
              <Tooltip
                formatter={(value: any) => [formatNumber(Number(value)), trends.metric_label || 'Value']}
                labelFormatter={(label) => `Period: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
                fill="url(#trendViewGrad)"
                dot={{ r: 3, fill: CHART_COLORS.primary }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Chronological Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Chronological Period Breakdown
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            Click row to filter dataset
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Detailed metrics recorded per cycle interval.
        </p>

        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4 text-right">{trends.metric_label || 'Value'}</th>
                <th className="py-2.5 px-4 text-right">Observations</th>
                <th className="py-2.5 px-4 text-right">Share of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trends.data.map((pt) => {
                const isPeak = pt.period === trends.peak_period;
                const sharePct = totalValue > 0 ? (pt.value / totalValue) * 100 : 0;
                return (
                  <tr
                    key={pt.period}
                    onClick={() => {
                      if (trends.date_column) {
                        applyCrossFilter(trends.date_column, pt.period);
                      }
                    }}
                    className={
                      isPeak
                        ? 'bg-amber-50/50 font-semibold cursor-pointer hover:bg-amber-100/60 transition-colors'
                        : 'hover:bg-blue-50/50 cursor-pointer transition-colors'
                    }
                    title={`Filter by period ${pt.period}`}
                  >
                    <td className="py-2.5 px-4 font-mono flex items-center gap-2">
                      <span>{pt.period}</span>
                      {isPeak && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-bold">
                          Peak
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold font-mono text-slate-900">
                      {formatNumber(pt.value)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {formatNumber(pt.count)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(sharePct, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-600 w-10">
                          {sharePct.toFixed(1)}%
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
    </div>
  );
}
