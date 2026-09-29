import React, { useState } from 'react';
import {
  MapPin,
  Globe,
  Sparkles,
  BarChart2,
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
import { useDataset } from '@/context/DatasetContext';
import { formatNumber } from '@/utils/formatting';
import { cn } from '@/lib/utils';

interface GeographyAnalyticsViewProps {
  moduleTitle: string;
  analytics?: DatasetAnalytics | null;
}

export function GeographyAnalyticsView({
  moduleTitle,
  analytics,
}: GeographyAnalyticsViewProps) {
  const { profile, primaryMetric, setPrimaryMetric, applyCrossFilter } = useDataset();
  const geography = analytics?.geography;
  const dimensions = geography?.dimensions || [];
  const whyThisMatters = analytics?.why_this_matters?.geography;

  const [selectedDimIndex, setSelectedDimIndex] = useState<number>(0);
  const [chartMode, setChartMode] = useState<'count' | 'metric'>('count');

  const numericCols = profile?.summary?.numeric_columns || [];
  const activeMetric = primaryMetric || analytics?.primary_metric?.column || (numericCols.length > 0 ? numericCols[0] : null);

  if (!geography || !geography.available || dimensions.length === 0) {
    return (
      <div className="space-y-6">
        <WhyThisMattersCard
          moduleTitle={moduleTitle}
          text={whyThisMatters || 'Regional distribution highlights territorial coverage and location concentration across recorded regions.'}
        />
        <div className="bg-white rounded-xl border border-slate-200/80 p-10 text-center max-w-lg mx-auto my-8 shadow-xs">
          <MapPin className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            No Geographic Dimension Detected
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Spatial analytics requires state, city, country, or regional territorial data columns.
          </p>
        </div>
      </div>
    );
  }

  const activeDim = dimensions[selectedDimIndex] || dimensions[0];
  const topLocation = activeDim.locations[0];
  const totalCount = activeDim.locations.reduce((acc, loc) => acc + loc.count, 0);
  const hasMetricData = Boolean(
    activeDim.locations[0]?.total_metric !== null &&
    activeDim.locations[0]?.total_metric !== undefined
  );

  return (
    <div className="space-y-6">
      {/* Contextual Why This Matters Card */}
      <WhyThisMattersCard
        moduleTitle={moduleTitle}
        text={whyThisMatters || `'${topLocation?.location}' leads recorded geographic coverage with ${formatNumber(topLocation?.count || 0)} occurrences. Regional distribution maps market reach and territory concentration.`}
      />
      {/* Header and Dimension Switcher */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {moduleTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Regional concentration and geographical distribution patterns.
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
                title="Switch metric to aggregate geographically"
              >
                {numericCols.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}

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
            <span>Locations Recorded</span>
            <Globe className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {activeDim.locations.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Distinct regional zones</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Primary Region</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono truncate">
            {topLocation?.location || 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {topLocation ? `${formatNumber(topLocation.count)} observations` : ''}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Tracked Regional Records</span>
            <BarChart2 className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatNumber(totalCount)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total geo-tagged records</p>
        </div>
      </div>

      {/* Regional Distribution Bar Chart */}
      <ChartCard
        title={`Top ${activeDim.label} Concentrations`}
        subtitle={
          chartMode === 'metric' && hasMetricData
            ? `Aggregate ${activeMetric || 'metric'} sum by location`
            : "Ranked geographic locations by record occurrences"
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
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
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
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
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
              data={activeDim.locations}
              margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="location"
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
                labelFormatter={(label) => `Location: ${label}`}
              />
              <Bar
                dataKey={(d: any) =>
                  chartMode === 'metric' && d.total_metric != null
                    ? d.total_metric
                    : d.count
                }
                fill={chartMode === 'metric' ? '#0d9488' : '#2563eb'}
                radius={[4, 4, 0, 0]}
                className="cursor-pointer hover:opacity-85 transition-opacity"
                onClick={(entry: any) => {
                  if (entry?.location && activeDim.column) {
                    applyCrossFilter(activeDim.column, entry.location);
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Location Details Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            {activeDim.label} Location Breakdown
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            Click any row to filter dataset
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Detailed metrics across identified geographic locations.
        </p>

        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4 text-right">Observations</th>
                {activeDim.locations[0]?.total_metric !== null &&
                  activeDim.locations[0]?.total_metric !== undefined && (
                    <>
                      <th className="py-2.5 px-4 text-right">Metric Total</th>
                      <th className="py-2.5 px-4 text-right">Metric Average</th>
                    </>
                  )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeDim.locations.map((loc, idx) => (
                <tr
                  key={loc.location}
                  onClick={() => applyCrossFilter(activeDim.column, loc.location)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  title={`Filter dataset by ${loc.location}`}
                >
                  <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900 flex items-center gap-1.5 group-hover:text-blue-600 transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{loc.location}</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                    {formatNumber(loc.count)}
                  </td>
                  {loc.total_metric !== null && loc.total_metric !== undefined && (
                    <>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatNumber(loc.total_metric)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {loc.average_metric?.toFixed(2) ?? 'N/A'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
