import React from 'react';
import {
  TrendingUp,
  BarChart2,
  Activity,
  Layers,
  Award,
  Hash,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
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
import { cn } from '@/lib/utils';

import { useDataset } from '@/context/DatasetContext';

interface MetricDetailViewProps {
  moduleTitle: string;
  moduleDescription?: string;
  analytics?: DatasetAnalytics | null;
}

export function MetricDetailView({
  moduleTitle,
  moduleDescription,
  analytics,
}: MetricDetailViewProps) {
  const { profile, primaryMetric, setPrimaryMetric } = useDataset();
  // Use value_metric or primary_metric
  const metric = analytics?.value_metric || analytics?.primary_metric;

  const numericCols = profile?.summary?.numeric_columns || [];
  const activeMetric = primaryMetric || analytics?.primary_metric?.column || (numericCols.length > 0 ? numericCols[0] : null);

  if (!metric || !metric.available) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-8 text-center max-w-lg mx-auto my-8">
        <Activity className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">No Quantitative Metric Detected</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          This dataset does not appear to have continuous numeric measures corresponding to {moduleTitle}.
        </p>
      </div>
    );
  }

  const stats = metric.statistics;
  const trends = analytics?.trends;
  const distributions = analytics?.distributions;
  const rankings = analytics?.rankings;
  const whyThisMatters =
    analytics?.why_this_matters?.[moduleTitle.toLowerCase()] ||
    analytics?.why_this_matters?.overview ||
    `Statistical distribution for ${metric.label}: mean of ${stats.average?.toFixed(2) || '0'}, median of ${stats.median?.toFixed(2) || '0'}, and standard deviation of ${stats.std_dev?.toFixed(2) || '0'}.`;

  return (
    <div className="space-y-6">
      {/* Contextual Why This Matters Card */}
      <WhyThisMattersCard
        moduleTitle={moduleTitle}
        text={whyThisMatters}
      />
      {/* Metric Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              {moduleTitle}
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-mono">
              column: {metric.column}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {moduleDescription || `Comprehensive statistical analysis of ${metric.label}.`}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {numericCols.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Metric:</span>
              <select
                value={activeMetric || ''}
                onChange={(e) => setPrimaryMetric(e.target.value)}
                className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-hidden cursor-pointer"
                title="Switch continuous measure"
              >
                {numericCols.map((col) => (
                  <option key={col} value={col} className="dark:bg-slate-900 dark:text-slate-200">
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Observations:</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold font-mono">
              {formatNumber(stats.count)}
            </span>
          </div>
        </div>
      </div>

      {/* 6 Statistical Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-1">
            <span>Cumulative Total</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-mono">
            {stats.total !== null && stats.total !== undefined ? formatNumber(stats.total) : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sum across {formatNumber(stats.count)} rows</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-1">
            <span>Arithmetic Mean</span>
            <BarChart2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-mono">
            {stats.average !== null && stats.average !== undefined ? stats.average.toFixed(2) : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sample average</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-1">
            <span>Median (Q2)</span>
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-mono">
            {stats.median !== null && stats.median !== undefined ? stats.median.toFixed(2) : 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">50th percentile midpoint</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-1">
            <span>Std Deviation</span>
            <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-mono">
            {stats.std_dev !== null && stats.std_dev !== undefined ? stats.std_dev.toFixed(2) : '0.00'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Degree of dispersion</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-1">
            <span>Range [Min, Max]</span>
            <Hash className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight font-mono mt-1">
            {stats.min != null ? stats.min.toFixed(1) : '0'} – {stats.max != null ? stats.max.toFixed(1) : '0'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Extreme observed values</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-medium uppercase tracking-wider mb-1">
            <span>IQR (Q3 - Q1)</span>
            <Layers className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-mono">
            {stats.iqr !== null && stats.iqr !== undefined ? stats.iqr.toFixed(2) : '0.00'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Q1: {stats.q25?.toFixed(1) ?? 'N/A'} • Q3: {stats.q75?.toFixed(1) ?? 'N/A'}
          </p>
        </div>
      </div>

      {/* Visual Analytics Row: Time-series velocity & Category Share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Trend line if dates available */}
        {trends?.available && trends.data.length > 0 ? (
          <ChartCard
            title={`${metric.label} Velocity Over Time`}
            subtitle={`Chronological breakdown across ${trends.total_periods} periods`}
          >
            <div className="w-full h-full min-h-[280px]">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={trends.data}
                  margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="metricTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
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
                    formatter={(value: any) => [formatNumber(Number(value)), metric.label]}
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2.5}
                    fill="url(#metricTrendGrad)"
                    dot={{ r: 2.5, fill: CHART_COLORS.primary }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        ) : (
          /* Descriptive statistics table */
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Descriptive Statistics Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Full quartile and moment distribution values.
            </p>

            <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <tbody>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-600 dark:text-slate-400 font-medium py-1.5">Observations (Count)</td>
                  <td className="font-bold text-slate-900 dark:text-slate-100 font-mono py-1.5">{formatNumber(stats.count)}</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-600 dark:text-slate-400 font-medium py-1.5">Mean (Average)</td>
                  <td className="font-bold text-slate-900 dark:text-slate-100 font-mono py-1.5">{stats.average?.toFixed(2) ?? 'N/A'}</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-600 dark:text-slate-400 font-medium py-1.5">Median (50th Percentile)</td>
                  <td className="font-bold text-slate-900 dark:text-slate-100 font-mono py-1.5">{stats.median?.toFixed(2) ?? 'N/A'}</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-600 dark:text-slate-400 font-medium py-1.5">25th Percentile (Q1)</td>
                  <td className="font-bold text-slate-900 dark:text-slate-100 font-mono py-1.5">{stats.q25?.toFixed(2) ?? 'N/A'}</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-600 dark:text-slate-400 font-medium py-1.5">75th Percentile (Q3)</td>
                  <td className="font-bold text-slate-900 dark:text-slate-100 font-mono py-1.5">{stats.q75?.toFixed(2) ?? 'N/A'}</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-600 dark:text-slate-400 font-medium py-1.5">Interquartile Range (IQR)</td>
                  <td className="font-bold text-slate-900 dark:text-slate-100 font-mono py-1.5">{stats.iqr?.toFixed(2) ?? 'N/A'}</td>
                </tr>
                <tr className="py-2 flex justify-between">
                  <td className="text-slate-600 dark:text-slate-400 font-medium py-1.5">Standard Deviation</td>
                  <td className="font-bold text-slate-900 dark:text-slate-100 font-mono py-1.5">{stats.std_dev?.toFixed(2) ?? 'N/A'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Category Contribution to this metric */}
        {distributions?.available && distributions.dimensions.length > 0 && distributions.dimensions[0].categories.length > 0 ? (
          <ChartCard
            title={`${distributions.dimensions[0].label} Breakdown`}
            subtitle={`Metric distribution by ${distributions.dimensions[0].label}`}
          >
            <div className="w-full h-full min-h-[280px]">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={distributions.dimensions[0].categories.slice(0, 8)}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis
                    dataKey="category"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => formatNumber(val, true)}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatNumber(Number(value)), 'Total Volume']}
                    labelFormatter={(label) => `Category: ${label}`}
                  />
                  <Bar
                    dataKey={(d: any) => (d.total_metric !== null && d.total_metric !== undefined ? d.total_metric : d.count)}
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        ) : null}
      </div>

      {/* Top 10 Leaders for this metric */}
      {rankings?.available && rankings.rankings.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                Top {rankings.rankings[0].label} by {metric.label}
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Ranked descending
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-medium uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-2.5 px-4">{rankings.rankings[0].label}</th>
                  <th className="py-2.5 px-4 text-right">Contribution</th>
                  <th className="py-2.5 px-4 text-right">{metric.label}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rankings.rankings[0].items.map((item) => (
                  <tr key={item.rank} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-4 text-center font-bold">
                      <span
                        className={cn(
                          'w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs',
                          item.rank === 1
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : item.rank === 2
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            : item.rank === 3
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        )}
                      >
                        {item.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">{item.name}</td>
                    <td className="py-2.5 px-4 text-right">
                      {item.percentage !== null && item.percentage !== undefined ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                              style={{ width: `${Math.min(item.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-600 dark:text-slate-400 w-10">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold font-mono text-slate-900 dark:text-slate-100">
                      {formatNumber(item.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
