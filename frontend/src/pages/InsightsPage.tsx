import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { apiService } from '@/services/api';
import { InsightsData } from '@/types';
import { useFilterParams } from '@/hooks/useFilterParams';
import { PageContainer } from '@/components/layout/PageContainer';
import { GlobalFilters } from '@/components/filters/GlobalFilters';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';

export function InsightsPage() {
  const { filters } = useFilterParams();
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getInsights(filters);
      if (res.success) setInsightsData(res.data);
    } catch (err: any) {
      console.error('Insights fetch error:', err);
      setError(err.message || 'Failed to load dynamic business insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const insightsList = insightsData?.insights || [];

  return (
    <PageContainer>
      <GlobalFilters />

      {/* Compact Executive Engine Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">Automated Executive Intelligence</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Data-driven insights dynamically computed from the currently selected analytics filters.
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 rounded-lg border border-blue-200/60 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-compute</span>
        </button>
      </div>

      {/* Insights Content - Equal-height Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3 animate-pulse min-h-[180px]">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-5 w-48 bg-slate-200 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : insightsList.length === 0 ? (
        <EmptyState title="No insights generated for current selection" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {insightsList.map((insight, idx) => (
            <InsightCard key={idx} insight={insight} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
