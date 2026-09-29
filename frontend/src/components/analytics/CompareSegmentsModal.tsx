import React, { useState, useEffect } from 'react';
import {
  X,
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useDataset } from '@/context/DatasetContext';
import { apiService } from '@/services/api';
import { SegmentComparisonResponse } from '@/types';
import { formatNumber } from '@/utils/formatting';
import { cn } from '@/lib/utils';

interface CompareSegmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDimension?: string;
  defaultSegmentA?: string;
  defaultSegmentB?: string;
}

export function CompareSegmentsModal({
  isOpen,
  onClose,
  defaultDimension,
  defaultSegmentA,
  defaultSegmentB,
}: CompareSegmentsModalProps) {
  const { datasetId, selectedFile, profile, availableFilters } = useDataset();

  // Find categorical dimensions available for comparison
  const categoricalFilters = (availableFilters || []).filter(
    (f) => (f.type === 'categorical' || f.type === 'boolean') && (f.options?.length || 0) >= 2
  );

  // Fallback to profile categorical columns if availableFilters is empty
  const availableDimensions =
    categoricalFilters.length > 0
      ? categoricalFilters.map((f) => ({
          column: f.column,
          label: f.label,
          options: (f.options || []).map((o) => o.value),
        }))
      : (profile?.summary?.categorical_columns || []).map((col) => ({
          column: col,
          label: col.replace(/_/g, ' ').toUpperCase(),
          options: [],
        }));

  const initialDimension =
    defaultDimension || (availableDimensions.length > 0 ? availableDimensions[0].column : '');

  const [dimension, setDimension] = useState<string>(initialDimension);
  const [segmentA, setSegmentA] = useState<string>(defaultSegmentA || '');
  const [segmentB, setSegmentB] = useState<string>(defaultSegmentB || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<SegmentComparisonResponse | null>(null);

  // Get options for currently chosen dimension
  const currentDimObj = availableDimensions.find((d) => d.column === dimension);
  const dimensionOptions = currentDimObj?.options || [];

  // Initialize or reset segments when dimension changes
  useEffect(() => {
    if (dimensionOptions.length >= 2) {
      if (!dimensionOptions.includes(segmentA)) {
        setSegmentA(dimensionOptions[0]);
      }
      if (!dimensionOptions.includes(segmentB) || segmentB === dimensionOptions[0]) {
        setSegmentB(dimensionOptions[1]);
      }
    }
  }, [dimension, dimensionOptions]);

  // Execute comparison
  const handleCompare = async () => {
    if (!dimension || !segmentA || !segmentB) {
      setError('Please select a dimension and two different segments to compare.');
      return;
    }
    if (segmentA === segmentB) {
      setError('Please select two distinct segments to compare.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiService.compareSegments(
        datasetId || 'active_ds',
        dimension,
        segmentA,
        segmentB,
        selectedFile
      );
      setComparison(res);
    } catch (err: any) {
      console.error('Segment comparison error:', err);
      setError(err?.message || 'Failed to compare segments.');
    } finally {
      setLoading(false);
    }
  };

  // Run automatically when modal opens if both segments are set
  useEffect(() => {
    if (isOpen && dimension && segmentA && segmentB && segmentA !== segmentB && !comparison) {
      handleCompare();
    }
  }, [isOpen, dimension, segmentA, segmentB]);

  if (!isOpen) return null;

  // Chart data formatting
  const chartData = (comparison?.metrics || []).slice(0, 6).map((m) => ({
    name: m.metric_label,
    [comparison?.segment_a.name || 'Segment A']: m.a_mean,
    [comparison?.segment_b.name || 'Segment B']: m.b_mean,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Compare Segments
              </h3>
              <p className="text-xs text-slate-500">
                Side-by-side comparative analytics across metrics and volumes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dimension & Segment Selectors Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Dimension
              </label>
              <select
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-blue-500"
              >
                {availableDimensions.map((d) => (
                  <option key={d.column} value={d.column}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                Segment A
              </label>
              <select
                value={segmentA}
                onChange={(e) => setSegmentA(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-blue-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-blue-500"
              >
                {dimensionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-teal-600 block mb-1">
                Segment B
              </label>
              <select
                value={segmentB}
                onChange={(e) => setSegmentB(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-teal-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-blue-500"
              >
                {dimensionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                type="button"
                onClick={handleCompare}
                disabled={loading || !segmentA || !segmentB || segmentA === segmentB}
                className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Comparing...</span>
                  </>
                ) : (
                  <>
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Compare Now</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {comparison ? (
            <>
              {/* Top Overview Cards: Segment A vs Segment B */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Segment A Card */}
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      Segment A
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
                      {comparison.segment_a.percentage_of_total.toFixed(1)}% of dataset
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                    {comparison.segment_a.name}
                  </h4>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-blue-700">
                      {formatNumber(comparison.segment_a.rows)}
                    </span>
                    <span className="text-xs text-slate-500">records</span>
                  </div>
                </div>

                {/* Segment B Card */}
                <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                      Segment B
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 font-mono">
                      {comparison.segment_b.percentage_of_total.toFixed(1)}% of dataset
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                    {comparison.segment_b.name}
                  </h4>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold font-mono text-teal-700">
                      {formatNumber(comparison.segment_b.rows)}
                    </span>
                    <span className="text-xs text-slate-500">records</span>
                  </div>
                </div>
              </div>

              {/* Factual Takeaways */}
              {comparison.takeaways.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Automated Comparative Findings</span>
                  </div>
                  {comparison.takeaways.map((takeaway, idx) => (
                    <p key={idx} className="text-slate-700 leading-relaxed">
                      • {takeaway}
                    </p>
                  ))}
                </div>
              )}

              {/* Visual Mean Comparison Chart */}
              {chartData.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Average Comparison Across Numerical Measures
                  </h4>
                  <div className="w-full h-56 min-h-[224px]">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          interval={0}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatNumber(v, true)}
                        />
                        <Tooltip formatter={(v: any) => [formatNumber(Number(v)), 'Average']} />
                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                        <Bar
                          dataKey={comparison.segment_a.name}
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey={comparison.segment_b.name}
                          fill="#0d9488"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Detailed Metrics Comparison Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Detailed Metrics Variance Breakdown
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Difference: {comparison.segment_a.name} vs {comparison.segment_b.name}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Metric</th>
                        <th className="py-2.5 px-3 text-right text-blue-700">
                          {comparison.segment_a.name} (Mean)
                        </th>
                        <th className="py-2.5 px-3 text-right text-teal-700">
                          {comparison.segment_b.name} (Mean)
                        </th>
                        <th className="py-2.5 px-3 text-right">Mean Variance</th>
                        <th className="py-2.5 px-3 text-right">
                          {comparison.segment_a.name} (Median)
                        </th>
                        <th className="py-2.5 px-3 text-right">
                          {comparison.segment_b.name} (Median)
                        </th>
                        <th className="py-2.5 px-3 text-right">Total Sum Ratio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {comparison.metrics.map((m) => {
                        const isPositive = m.mean_percent_change > 0;
                        const isZero = m.mean_percent_change === 0;

                        return (
                          <tr key={m.metric} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                              {m.metric_label}
                            </td>
                            <td className="py-2.5 px-3 text-right text-blue-800 font-semibold">
                              {formatNumber(m.a_mean)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-teal-800 font-semibold">
                              {formatNumber(m.b_mean)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold',
                                  isZero
                                    ? 'bg-slate-100 text-slate-600'
                                    : isPositive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                )}
                              >
                                {isPositive ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                <span>
                                  {isPositive ? '+' : ''}
                                  {m.mean_percent_change.toFixed(1)}%
                                </span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600">
                              {formatNumber(m.a_median)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600">
                              {formatNumber(m.b_median)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500">
                              {formatNumber(m.a_sum)} vs {formatNumber(m.b_sum)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs">
                Select a dimension and two segments above to view detailed comparative breakdown.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Real-time comparative computation powered by Pandas engine.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
