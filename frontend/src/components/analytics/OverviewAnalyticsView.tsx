import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Lightbulb,
  Award,
  Layers,
  Columns,
  AlertTriangle,
  Database,
  CheckCircle2,
  TrendingUp,
  GitCompare,
  Filter,
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
import { DatasetAnalytics, DatasetProfileResponse } from '@/types';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { WhyThisMattersCard } from './WhyThisMattersCard';
import { CompareSegmentsModal } from './CompareSegmentsModal';
import { useDataset } from '@/context/DatasetContext';
import { formatNumber, formatBytes } from '@/utils/formatting';
import { resolveModuleIcon } from '@/utils/moduleIcons';
import { CHART_COLORS } from '@/utils/colors';
import { cn } from '@/lib/utils';

interface OverviewAnalyticsViewProps {
  datasetName: string;
  profile: DatasetProfileResponse;
  analytics?: DatasetAnalytics | null;
}

export function OverviewAnalyticsView({
  datasetName,
  profile,
  analytics,
}: OverviewAnalyticsViewProps) {
  const {
    isFiltered,
    filteredRows,
    totalRows,
    percentageOfTotal,
    applyCrossFilter,
    primaryMetric,
    setPrimaryMetric,
  } = useDataset();

  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedDistDimIndex, setSelectedDistDimIndex] = useState(0);
  const [selectedRankingIndex, setSelectedRankingIndex] = useState(0);

  const kpis = analytics?.overview?.kpis;
  const trends = analytics?.trends;
  const distributions = analytics?.distributions;
  const rankings = analytics?.rankings;
  const insights = analytics?.insights || [];
  const whyThisMatters = analytics?.why_this_matters?.overview;
  const outliers = analytics?.outliers;
  const outlierOverview = outliers?.overview;
  const hasUnusualValues = Boolean(
    outliers?.available &&
    outlierOverview &&
    outlierOverview.total_anomalies > 0
  );

  const numericCols = profile.summary.numeric_columns || [];
  const activeMetric = primaryMetric || analytics?.primary_metric?.column || (numericCols.length > 0 ? numericCols[0] : null);

  return (
    <div className="space-y-6">
      {/* Dataset Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {datasetName}
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Analyzed
              </span>
              {isFiltered && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                  Filtered: {formatNumber(filteredRows)} / {formatNumber(totalRows)} ({percentageOfTotal.toFixed(1)}%)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatNumber(profile.dataset.rows)} records • {profile.dataset.columns} attributes •{' '}
              {formatBytes(profile.file.size_bytes)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Primary Metric Selector (if multiple continuous metrics exist) */}
          {numericCols.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <span className="text-[11px] font-bold text-slate-500">Metric:</span>
              <select
                value={activeMetric || ''}
                onChange={(e) => setPrimaryMetric(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                title="Switch primary analytical metric"
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

          <Link
            to="/upload-analytics"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Change Dataset</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Contextual Why This Matters Card */}
      <WhyThisMattersCard
        moduleTitle="Overview"
        text={whyThisMatters || `The dataset encompasses ${formatNumber(profile.dataset.rows)} records and ${profile.dataset.columns} attributes. Establishing baseline health ensures representative analyses.`}
      />

      {/* Dynamic Business KPIs */}
      {kpis && kpis.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {kpis.map((kpi) => {
            const Icon = resolveModuleIcon(kpi.icon || undefined);
            const isQuality = kpi.category === 'quality';
            const isMetric = kpi.category === 'metric';
            const isEntity = kpi.category === 'entity';

            return (
              <KPICard
                key={kpi.id}
                label={kpi.label}
                value={kpi.formatted_value}
                subtitle={kpi.subtitle || undefined}
                badge={isFiltered && isMetric ? `${percentageOfTotal.toFixed(1)}% volume` : undefined}
                icon={Icon}
                iconBgColor={
                  isQuality
                    ? 'bg-emerald-50'
                    : isMetric
                    ? 'bg-blue-50'
                    : isEntity
                    ? 'bg-purple-50'
                    : 'bg-indigo-50'
                }
                iconColor={
                  isQuality
                    ? 'text-emerald-600'
                    : isMetric
                    ? 'text-blue-600'
                    : isEntity
                    ? 'text-purple-600'
                    : 'text-indigo-600'
                }
              />
            );
          })}
        </div>
      ) : (
        /* Fallback to basic dataset metadata KPIs */
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            label="Rows"
            value={formatNumber(profile.dataset.rows)}
            subtitle="Analyzed dataset records"
            icon={Layers}
          />
          <KPICard
            label="Columns"
            value={String(profile.dataset.columns)}
            subtitle={`${profile.summary.numeric_columns.length} numeric, ${profile.summary.categorical_columns.length} categorical`}
            icon={Columns}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-600"
          />
          <KPICard
            label="Missing Values"
            value={`${profile.summary.missing_value_percentage}%`}
            subtitle={`${formatNumber(profile.summary.total_missing_values)} missing cells`}
            icon={AlertTriangle}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
          <KPICard
            label="Duplicate Rows"
            value={formatNumber(profile.dataset.duplicate_rows)}
            subtitle={`${profile.dataset.duplicate_percentage}% redundancy`}
            icon={Database}
          />
          <KPICard
            label="Data Score"
            value={`${profile.quality.score}%`}
            subtitle={`Rating: ${profile.quality.label}`}
            icon={CheckCircle2}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
        </div>
      )}

      {/* Visual Analytics Grid: Trends & Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Trend Area Chart (if time-series available) */}
        {trends?.available && trends.data.length > 0 ? (
          <ChartCard
            title={`${trends.metric_label || 'Activity'} Velocity`}
            subtitle={`Chronological distribution aggregated ${trends.granularity || 'periodically'} (${trends.total_periods} cycles)`}
          >
            <div className="w-full h-full min-h-[280px]">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={trends.data}
                  margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="overviewTrendGrad" x1="0" y1="0" x2="0" y2="1">
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
                    formatter={(value: any) => [
                      typeof value === 'number' ? formatNumber(value) : value,
                      trends.metric_label || 'Value',
                    ]}
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2.5}
                    fill="url(#overviewTrendGrad)"
                    dot={{ r: 2.5, fill: CHART_COLORS.primary }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        ) : (
          /* Fallback feature structure card */
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Columns className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Dataset Composition</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Distribution of data attributes across technical types.
              </p>
            </div>

            <div className="space-y-3 my-auto">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Numeric Measures</span>
                  <span className="text-slate-900 font-mono">
                    {profile.summary.numeric_columns.length} cols
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      width: `${(profile.summary.numeric_columns.length / profile.dataset.columns) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Categorical Dimensions</span>
                  <span className="text-slate-900 font-mono">
                    {profile.summary.categorical_columns.length} cols
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full"
                    style={{
                      width: `${(profile.summary.categorical_columns.length / profile.dataset.columns) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Text & Descriptions</span>
                  <span className="text-slate-900 font-mono">
                    {profile.summary.text_columns.length} cols
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 rounded-full"
                    style={{
                      width: `${(profile.summary.text_columns.length / profile.dataset.columns) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-4 text-[11px] text-slate-500 flex justify-between">
              <span>Total Columns: {profile.dataset.columns}</span>
              <span>Memory Footprint: {formatBytes(profile.dataset.memory_usage_bytes)}</span>
            </div>
          </div>
        )}

        {/* Category Breakdown (if distributions available) */}
        {distributions?.available && distributions.dimensions.length > 0 ? (() => {
          const activeDim = distributions.dimensions[selectedDistDimIndex] || distributions.dimensions[0];
          return (
            <ChartCard
              title={`${activeDim.label} Distribution`}
              subtitle={`Relative frequency across top ${activeDim.categories.length} categories`}
              actions={
                distributions.dimensions.length > 1 ? (
                  <select
                    value={selectedDistDimIndex}
                    onChange={(e) => setSelectedDistDimIndex(Number(e.target.value))}
                    className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 cursor-pointer"
                  >
                    {distributions.dimensions.map((d, i) => (
                      <option key={d.column} value={i}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                ) : undefined
              }
            >
              <div className="w-full h-full min-h-[280px]">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={activeDim.categories.slice(0, 8)}
                    margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                      formatter={(value: any) => [formatNumber(Number(value)), 'Entries']}
                      labelFormatter={(label) => `Category: ${label}`}
                    />
                    <Bar
                      dataKey="count"
                      fill="#0d9488"
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
          );
        })() : (
          /* Fallback Data Health Assessment Card */
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Data Completeness & Health</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Automated dataset integrity analysis.
              </p>
            </div>

            <div className="space-y-2.5 my-auto">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Quality Rating</span>
                <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {profile.quality.label} ({profile.quality.score}%)
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Total Missing Cells</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatNumber(profile.summary.total_missing_values)} (
                  {profile.summary.missing_value_percentage}%)
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Duplicate Records</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatNumber(profile.dataset.duplicate_rows)} (
                  {profile.dataset.duplicate_percentage}%)
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-4 text-[11px] text-slate-500">
              Zero completely empty columns detected.
            </div>
          </div>
        )}
      </div>

      {/* Middle Section: Top Leaders Preview & Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Rankings Preview */}
        {rankings?.available && rankings.rankings.length > 0 ? (() => {
          const activeRk = rankings.rankings[selectedRankingIndex] || rankings.rankings[0];
          return (
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Top {activeRk.label} Leaders
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {rankings.rankings.length > 1 && (
                    <select
                      value={selectedRankingIndex}
                      onChange={(e) => setSelectedRankingIndex(Number(e.target.value))}
                      className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 cursor-pointer"
                    >
                      {rankings.rankings.map((r, i) => (
                        <option key={r.entity_column} value={i}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="text-[11px] font-semibold text-slate-500">
                    by {activeRk.metric_label} • Click to filter
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {activeRk.items.slice(0, 5).map((item) => (
                  <div
                    key={item.rank}
                    onClick={() => {
                      if (activeRk.entity_column) {
                        applyCrossFilter(activeRk.entity_column, item.name);
                      }
                    }}
                    className="py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors group"
                    title={`Filter by ${item.name}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0',
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
                      <span className="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-slate-900 font-mono">
                        {formatNumber(item.value)}
                      </span>
                      {item.percentage !== null && item.percentage !== undefined && (
                        <span className="text-[11px] font-medium text-slate-500 w-12 text-right">
                          {item.percentage.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })() : null}

        {/* Automated Factual Insights Card */}
        {insights.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3.5">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Key Automated Discoveries</h3>
              </div>

              <div className="space-y-2.5">
                {insights.slice(0, 4).map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-blue-50/50 border border-blue-100/70 text-xs text-slate-700 flex items-start gap-2.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-4 text-[11px] text-slate-400">
              Factual statistical insights calculated dynamically from uploaded records.
            </div>
          </div>
        )}
      </div>

      {/* Unusual Values Discovery Card */}
      {hasUnusualValues && outlierOverview && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100/90 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900">Unusual Values</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200/70 text-amber-900 font-mono">
                  {(outlierOverview.highest_anomaly_rate ?? outlierOverview.anomaly_rate ?? 0).toFixed(1)}% unusual rate
                </span>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                {(outlierOverview.anomaly_rate ?? 0).toFixed(1)}% of analyzed values are statistically unusual.
                {outlierOverview.most_affected_feature && (
                  <span> Most affected: <strong className="font-semibold text-amber-950">{outlierOverview.most_affected_feature}</strong>.</span>
                )}
              </p>
            </div>
          </div>

          <Link
            to="/dataset/outliers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200/80 px-3 py-1.5 rounded-lg border border-amber-200 shrink-0 transition-colors"
          >
            <span>Investigate</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 10-Row Data Preview Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 tracking-tight">
              Dataset Sample Preview
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              First 10 sample records from {datasetName}
            </p>
          </div>
          <Link
            to="/upload-analytics"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            View Full Profile Breakdown →
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200/80">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3 w-12 text-center text-slate-400">#</th>
                {profile.columns.map((col) => (
                  <th key={col.name} className="py-2.5 px-4 whitespace-nowrap">
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profile.preview.slice(0, 10).map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                    {rowIdx + 1}
                  </td>
                  {profile.columns.map((col) => {
                    const val = row[col.name];
                    const isNull = val === null || val === undefined;
                    return (
                      <td
                        key={col.name}
                        className={cn(
                          'py-2.5 px-4 whitespace-nowrap text-xs',
                          isNull ? 'text-slate-300 italic' : 'text-slate-800'
                        )}
                      >
                        {isNull ? 'null' : typeof val === 'number' ? formatNumber(val) : String(val)}
                      </td>
                    );
                  })}
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
      />
    </div>
  );
}
