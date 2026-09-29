import React, { useState } from 'react';
import {
  PieChart as PieIcon,
  Layers,
  Sparkles,
  BarChart2,
  GitCompare,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
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
import { CompareSegmentsModal } from './CompareSegmentsModal';
import { useDataset } from '@/context/DatasetContext';
import { formatNumber } from '@/utils/formatting';
import { cn } from '@/lib/utils';

interface DistributionsAnalyticsViewProps {
  moduleTitle: string;
  analytics?: DatasetAnalytics | null;
}

export function DistributionsAnalyticsView({
  moduleTitle,
  analytics,
}: DistributionsAnalyticsViewProps) {
  const { profile, primaryMetric, setPrimaryMetric, applyCrossFilter } = useDataset();
  const distributions = analytics?.distributions;
  const dimensions = distributions?.dimensions || [];
  const whyThisMatters = analytics?.why_this_matters?.distributions;

  const [selectedDimIndex, setSelectedDimIndex] = useState<number>(0);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [chartMode, setChartMode] = useState<'count' | 'metric'>('count');

  const numericCols = profile?.summary?.numeric_columns || [];
  const activeMetric = primaryMetric || analytics?.primary_metric?.column || (numericCols.length > 0 ? numericCols[0] : null);

  if (!distributions || !distributions.available || dimensions.length === 0) {
    return (
      <div className="space-y-6">
        <WhyThisMattersCard
          moduleTitle={moduleTitle}
          text={whyThisMatters || 'Categorical distributions indicate classification shares and taxonomic balance.'}
        />
        <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center max-w-lg mx-auto my-8 shadow-xs">
          <PieIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            No Categorical Groupings Detected
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Distribution analytics requires discrete categorical or text classification dimensions.
          </p>
        </div>
      </div>
    );
  }

  const activeDim = dimensions[selectedDimIndex] || dimensions[0];
  const topCategory = activeDim.categories[0];
  const totalEntries = activeDim.categories.reduce((acc, cat) => acc + cat.count, 0);
  const hasMetricData = Boolean(
    activeDim.categories[0]?.total_metric !== null &&
    activeDim.categories[0]?.total_metric !== undefined
  );

  return (
    <div className="space-y-6">
      {/* Contextual Why This Matters Card */}
      <WhyThisMattersCard
        moduleTitle={moduleTitle}
        text={whyThisMatters || `'${topCategory?.category}' forms the primary segment with ${topCategory?.percentage.toFixed(1)}% share. Category concentration indicates whether activity is diversified or concentrated in specific core segments.`}
      />

      {/* Header and Dimension Switcher */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {moduleTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Class proportions, category frequency shares, and metric distribution.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Metric Selector */}
          {numericCols.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <span className="text-[11px] font-bold text-slate-500">Metric:</span>
              <select
                value={activeMetric || ''}
                onChange={(e) => setPrimaryMetric(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                title="Switch metric for category totals"
              >
                {numericCols.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowCompareModal(true)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <GitCompare className="w-3.5 h-3.5 text-blue-600" />
            <span>Compare Segments</span>
          </button>

          {/* Dimension Switcher Pills */}
          {dimensions.length > 1 && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
              {dimensions.map((dim, idx) => (
                <button
                  key={dim.column}
                  type="button"
                  onClick={() => setSelectedDimIndex(idx)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                    selectedDimIndex === idx
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  )}
                >
                  {dim.label}
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
            <span>Distinct Classes</span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {activeDim.unique_count}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Unique values in {activeDim.column}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Dominant Category</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono truncate">
            {topCategory?.category || 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {topCategory ? `${topCategory.percentage.toFixed(1)}% market / sample share` : ''}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Analyzed Entries</span>
            <BarChart2 className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatNumber(totalEntries)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Categorical occurrences tracked</p>
        </div>
      </div>

      {/* Bar Chart Representation */}
      <ChartCard
        title={`${activeDim.label} Proportions`}
        subtitle={
          chartMode === 'metric' && hasMetricData
            ? `Aggregate ${activeMetric || 'metric'} sum across categories`
            : `Comparative frequency across top ${activeDim.categories.length} categories`
        }
        actions={
          hasMetricData ? (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setChartMode('count')}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  chartMode === 'count'
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Frequency
              </button>
              <button
                type="button"
                onClick={() => setChartMode('metric')}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                  chartMode === 'metric'
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Metric Total
              </button>
            </div>
          ) : undefined
        }
      >
        <div className="w-full h-full min-h-[300px]">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={activeDim.categories}
              margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="category"
                stroke="#94a3b8"
                fontSize={11}
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
                formatter={(value: any) => [
                  formatNumber(Number(value)),
                  chartMode === 'metric' ? (activeMetric || 'Total') : 'Entries',
                ]}
                labelFormatter={(label) => `Category: ${label}`}
              />
              <Bar
                dataKey={(d: any) =>
                  chartMode === 'metric' && d.total_metric != null
                    ? d.total_metric
                    : d.count
                }
                fill={chartMode === 'metric' ? '#2563eb' : '#0d9488'}
                radius={[4, 4, 0, 0]}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(entry: any) => {
                  if (entry?.category && activeDim.column) {
                    applyCrossFilter(activeDim.column, entry.category);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Detailed Frequency & Metric Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {activeDim.label} Distribution Table
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            Click any row to filter dataset
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Frequency counts, percentage proportions, and aggregate metric values.
        </p>

        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Category Name</th>
                <th className="py-2.5 px-4 text-right">Frequency</th>
                <th className="py-2.5 px-4 text-right">Proportion Share</th>
                {activeDim.categories[0]?.total_metric !== null &&
                  activeDim.categories[0]?.total_metric !== undefined && (
                    <>
                      <th className="py-2.5 px-4 text-right">Metric Total</th>
                      <th className="py-2.5 px-4 text-right">Metric Average</th>
                    </>
                  )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeDim.categories.map((cat, idx) => (
                <tr
                  key={cat.category}
                  onClick={() => applyCrossFilter(activeDim.column, cat.category)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  title={`Filter by ${cat.category}`}
                >
                  <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {cat.category}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                    {formatNumber(cat.count)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-600 w-12 text-right">
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  {cat.total_metric !== null && cat.total_metric !== undefined && (
                    <>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatNumber(cat.total_metric)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {cat.average_metric?.toFixed(2) ?? 'N/A'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compare Segments Modal */}
      <CompareSegmentsModal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        defaultDimension={activeDim.column}
      />
    </div>
  );
}
