import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Sliders,
  ChevronLeft,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Info,
} from 'lucide-react';
import { DatasetAnalytics } from '@/types';
import { WhyThisMattersCard } from './WhyThisMattersCard';
import { formatNumber } from '@/utils/formatting';
import { cn } from '@/lib/utils';

interface OutliersAnalyticsViewProps {
  moduleTitle: string;
  analytics?: DatasetAnalytics | null;
}

export function OutliersAnalyticsView({
  moduleTitle,
  analytics,
}: OutliersAnalyticsViewProps) {
  const outliers = analytics?.outliers;
  const overview = outliers?.overview;
  const topFeatures = outliers?.top_features || [];
  const inspections = outliers?.inspections || [];
  const results = outliers?.results || [];
  const whyThisMatters = analytics?.why_this_matters?.outliers;

  // State for Records to Investigate Table
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeature, setSelectedFeature] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'HIGHER' | 'LOWER'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // State for Collapsible Statistical Details
  const [showStatDetails, setShowStatDetails] = useState(false);

  // Filtered inspection records
  const filteredInspections = useMemo(() => {
    return inspections.filter((rec) => {
      // Feature filter
      if (selectedFeature !== 'ALL' && rec.column !== selectedFeature) {
        return false;
      }
      // Direction filter
      const isHigher = rec.value > rec.expected_upper;
      const isLower = rec.value < rec.expected_lower;
      if (directionFilter === 'HIGHER' && !isHigher) {
        return false;
      }
      if (directionFilter === 'LOWER' && !isLower) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesCol = rec.column_label.toLowerCase().includes(q) || rec.column.toLowerCase().includes(q);
        const matchesEntity = rec.entity_name?.toLowerCase().includes(q) || false;
        const matchesReason = rec.reason.toLowerCase().includes(q);
        const matchesVal = String(rec.value).toLowerCase().includes(q);
        const matchesDims = Object.values(rec.dimensions || {}).some((v) =>
          String(v).toLowerCase().includes(q)
        );
        if (!matchesCol && !matchesEntity && !matchesReason && !matchesVal && !matchesDims) {
          return false;
        }
      }
      return true;
    });
  }, [inspections, selectedFeature, directionFilter, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredInspections.length / pageSize) || 1;
  const paginatedInspections = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInspections.slice(start, start + pageSize);
  }, [filteredInspections, currentPage, pageSize]);

  // Unique columns with unusual values for filter dropdown
  const outlierColumns = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach((i) => set.add(i.column));
    return Array.from(set);
  }, [inspections]);

  // 1. Empty State: No numeric features suitable for outlier analysis
  if (!outliers || !outliers.available || results.length === 0) {
    return (
      <div className="space-y-6">
        <WhyThisMattersCard
          moduleTitle={moduleTitle || 'Unusual Values'}
          text={
            whyThisMatters ||
            'Statistically unusual values can help identify records that deserve investigation. They may represent legitimate extreme observations, data-entry issues, measurement differences, or unusual cases.'
          }
        />
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Sliders className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            NO UNUSUAL VALUE ANALYSIS AVAILABLE
          </h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            This dataset does not contain suitable continuous numeric features for statistical outlier analysis.
          </p>
        </div>
      </div>
    );
  }

  // 2. Insufficient Observations State: evaluated columns have < 5 points
  const hasSufficientData = results.some((r) => r.total_count >= 5);
  if (!hasSufficientData) {
    return (
      <div className="space-y-6">
        <WhyThisMattersCard
          moduleTitle={moduleTitle || 'Unusual Values'}
          text={
            whyThisMatters ||
            'Statistically unusual values can help identify records that deserve investigation. They may represent legitimate extreme observations, data-entry issues, measurement differences, or unusual cases.'
          }
        />
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3 text-amber-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            INSUFFICIENT DATA
          </h3>
          <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            There are not enough valid observations in this feature to perform reliable statistical outlier analysis.
          </p>
        </div>
      </div>
    );
  }

  const totalAnomalies = overview?.total_anomalies ?? results.reduce((acc, r) => acc + r.outlier_count, 0);
  const affectedRecords = overview?.affected_records;
  const affectedFeatures = overview?.affected_features ?? results.filter((r) => r.outlier_count > 0).length;
  const totalFeatures = overview?.total_features ?? results.length;
  const highestRate = overview?.highest_anomaly_rate ?? overview?.anomaly_rate ?? (results.length > 0 ? Math.max(...results.map((r) => r.outlier_percentage)) : 0);
  const mostAffected = overview?.most_affected_feature || (results.length > 0 ? results[0].label : 'None');

  // Zero unusual values state
  if (totalAnomalies === 0) {
    return (
      <div className="space-y-6">
        <WhyThisMattersCard
          moduleTitle={moduleTitle || 'Unusual Values'}
          text={
            whyThisMatters ||
            'Statistically unusual values can help identify records that deserve investigation. They may represent legitimate extreme observations, data-entry issues, measurement differences, or unusual cases.'
          }
        />
        <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            No Unusual Values Detected
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            All numerical observations fall within standard 1.5× interquartile boundaries. No records currently require investigation.
          </p>
        </div>
      </div>
    );
  }

  // Feature list for Most Affected Features table (no fences/IQR in main view)
  const featureList = topFeatures.length > 0 ? topFeatures : results.map((r) => ({
    column: r.column,
    label: r.label,
    outlier_count: r.outlier_count,
    outlier_percentage: r.outlier_percentage,
    median: null,
    typical_range: `${r.lower_bound.toFixed(1)} to ${r.upper_bound.toFixed(1)}`,
    severity: r.outlier_percentage >= 10 ? 'High' : r.outlier_percentage >= 4 ? 'Medium' : 'Low',
  }));

  return (
    <div className="space-y-6">
      {/* 1. Contextual "Why This Matters" Card */}
      <WhyThisMattersCard
        moduleTitle={moduleTitle || 'Unusual Values'}
        text={
          whyThisMatters ||
          'Statistically unusual values can help identify records that deserve investigation. They may represent legitimate extreme observations, data-entry issues, measurement differences, or unusual cases.'
        }
      />

      {/* 2. Investigation Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unusual Values */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Unusual Values</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatNumber(totalAnomalies)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Values outside typical statistical boundaries
          </p>
        </div>

        {/* Affected Records */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Affected Records</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {affectedRecords != null ? formatNumber(affectedRecords) : formatNumber(totalAnomalies)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Unique records containing unusual values
          </p>
        </div>

        {/* Features Affected */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Features Affected</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {affectedFeatures} / {totalFeatures}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Numeric features with unusual values
          </p>
        </div>

        {/* Highest Unusual Rate */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            <span>Highest Unusual Rate</span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {highestRate.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate" title={mostAffected}>
            Most affected: {mostAffected}
          </p>
        </div>
      </div>

      {/* 3. Most Affected Features Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Most Affected Features
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Numeric features ranked by frequency of unusual values. Review typical expected ranges against observations.
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
            Threshold: Tukey 1.5× IQR
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200/70">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Feature</th>
                <th className="py-2.5 px-4 text-right">Unusual Values</th>
                <th className="py-2.5 px-4 text-right">Unusual %</th>
                <th className="py-2.5 px-4 text-right">Median</th>
                <th className="py-2.5 px-4 text-center">Typical Range</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {featureList.map((feat) => {
                const hasOutliers = feat.outlier_count > 0;
                const isHigh = feat.outlier_percentage >= 10;
                const isMed = feat.outlier_percentage >= 4;

                return (
                  <tr key={feat.column} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span>{feat.label}</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          ({feat.column})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatNumber(feat.outlier_count)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-bold',
                          isHigh
                            ? 'bg-rose-50 text-rose-700'
                            : isMed
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {feat.outlier_percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {feat.median != null ? formatNumber(feat.median) : '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600 text-[11px]">
                      {feat.typical_range}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          !hasOutliers
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isHigh
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        )}
                      >
                        {!hasOutliers ? 'Typical' : isHigh ? 'Requires Review' : 'Low Rate'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Records to Investigate Table */}
      {inspections.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Records to Investigate
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Specific observations exhibiting unusual values alongside contextual dimensions.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Feature Filter */}
              <select
                value={selectedFeature}
                onChange={(e) => {
                  setSelectedFeature(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-blue-500"
              >
                <option value="ALL">All Features ({inspections.length})</option>
                {outlierColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>

              {/* Direction Filter */}
              <select
                value={directionFilter}
                onChange={(e) => {
                  setDirectionFilter(e.target.value as 'ALL' | 'HIGHER' | 'LOWER');
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-blue-500"
              >
                <option value="ALL">All Directions</option>
                <option value="HIGHER">Higher than typical</option>
                <option value="LOWER">Lower than typical</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2 px-3 w-14 text-center">Row</th>
                  <th className="py-2 px-3">Contextual Dimensions</th>
                  <th className="py-2 px-3">Flagged Metric</th>
                  <th className="py-2 px-3 text-right">Actual Value</th>
                  <th className="py-2 px-3 text-center">Expected Range</th>
                  <th className="py-2 px-3 text-center">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedInspections.map((rec) => {
                  const isHigher = rec.value > rec.expected_upper;
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                        #{rec.row_index}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1 max-w-sm">
                          {rec.entity_name && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 font-semibold text-[10px]">
                              {rec.entity_name}
                            </span>
                          )}
                          {Object.entries(rec.dimensions || {}).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-mono"
                            >
                              <strong className="text-slate-800 font-medium">{k}:</strong> {String(v)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        <span>{rec.column_label}</span>
                        <span className="text-slate-400 font-mono text-[10px] ml-1">
                          ({rec.column})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                        {formatNumber(rec.value)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600 text-[11px]">
                        [{formatNumber(rec.expected_lower)} – {formatNumber(rec.expected_upper)}]
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isHigher ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <ArrowUpRight className="w-3 h-3 text-amber-600" />
                            <span>Higher than typical</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            <ArrowDownRight className="w-3 h-3 text-blue-600" />
                            <span>Lower than typical</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>
              Showing {filteredInspections.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredInspections.length)} of{' '}
              {filteredInspections.length} unusual observations
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1 font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <span className="px-2 font-mono font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1 font-medium"
              >
                <span>Next</span>
                <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Collapsible Statistical Details Accordion */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowStatDetails(!showStatDetails)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-slate-600" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                Statistical & Technical Reference
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Methodology: Tukey 1.5× IQR fences, Quartiles (Q1, Q3), and observed extreme ranges.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-blue-600">
            <span>{showStatDetails ? 'Hide Statistical Details' : 'View Statistical Details'}</span>
            {showStatDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {showStatDetails && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/40 space-y-4">
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-blue-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Method: Tukey's 1.5× Interquartile Boundary.</strong>
                <span className="block mt-0.5 text-blue-700 text-[11px]">
                  Values below Lower Fence [Q1 - 1.5 × IQR] or above Upper Fence [Q3 + 1.5 × IQR] are identified as unusual observations for review.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.map((item) => (
                <div
                  key={item.column}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{item.label}</h5>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.column} ({item.total_count} evaluated observations)
                      </span>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold font-mono',
                        item.outlier_count > 0
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      )}
                    >
                      {item.outlier_count} unusual ({item.outlier_percentage.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                        Lower Fence
                      </span>
                      <span className="font-bold text-slate-900 font-mono text-[11px]">
                        {item.lower_bound.toFixed(1)}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                        Upper Fence
                      </span>
                      <span className="font-bold text-slate-900 font-mono text-[11px]">
                        {item.upper_bound.toFixed(1)}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                        IQR Spread
                      </span>
                      <span className="font-bold text-slate-900 font-mono text-[11px]">
                        {item.iqr.toFixed(1)}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                        Q1 / Q3
                      </span>
                      <span className="font-bold text-slate-900 font-mono text-[11px]">
                        {item.q1.toFixed(1)} / {item.q3.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {item.outlier_count > 0 && (
                    <div className="pt-2 border-t border-slate-100 text-[11px] flex justify-between text-slate-600">
                      <span>Observed Unusual Range:</span>
                      <span className="font-mono font-bold text-amber-700">
                        {item.min_outlier != null ? item.min_outlier.toFixed(1) : '—'} →{' '}
                        {item.max_outlier != null ? item.max_outlier.toFixed(1) : '—'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OutliersAnalyticsView;
