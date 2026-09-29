import React, { useEffect, useState } from 'react';
import { Award, BrainCircuit } from 'lucide-react';
import { apiService } from '@/services/api';
import { CustomerSegmentsData } from '@/types';
import { formatINR, formatNumber, formatPercent } from '@/utils/formatting';
import { PageContainer } from '@/components/layout/PageContainer';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { SegmentChart } from '@/components/charts/SegmentChart';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';

export function CustomerSegmentsPage() {
  const [segmentData, setSegmentData] = useState<CustomerSegmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getCustomerSegments();
      if (res.success) {
        setSegmentData(res.data);
      }
    } catch (err: any) {
      console.error('Segments load error:', err);
      setError(err.message || 'Failed to load customer segmentation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const clusterColumns: ColumnDef<any>[] = [
    {
      key: 'cluster_id',
      header: 'Cluster',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
          #{row.cluster_id}
        </span>
      ),
    },
    {
      key: 'segment_name',
      header: 'Segment Profile',
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-800">{row.segment_name}</span>,
    },
    {
      key: 'segment_size',
      header: 'Customer Count',
      sortable: true,
      align: 'right',
      render: (row) => formatNumber(row.segment_size),
    },
    {
      key: 'percentage_of_customers',
      header: 'Customer Share %',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-blue-600">{formatPercent(row.percentage_of_customers)}</span>
      ),
    },
    {
      key: 'average_revenue',
      header: 'Avg Spend (M)',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-medium text-slate-900">{formatINR(row.average_revenue)}</span>,
    },
    {
      key: 'average_frequency',
      header: 'Avg Frequency (F)',
      sortable: true,
      align: 'right',
      render: (row) => `${row.average_frequency} orders`,
    },
    {
      key: 'average_recency',
      header: 'Avg Recency (R)',
      sortable: true,
      align: 'right',
      render: (row) => `${row.average_recency} days`,
    },
    {
      key: 'total_revenue',
      header: 'Total GMV',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.total_revenue, true)}</span>,
    },
  ];

  return (
    <PageContainer>
      {/* Methodology Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">RFM & Machine Learning Segmentation Engine</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Unsupervised K-Means clustering trained with log-transformed Recency, Frequency, and Monetary vectors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 shrink-0">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Silhouette Score: <strong className="font-semibold text-slate-900">{segmentData?.silhouette_score || '0.3845'}</strong></span>
        </div>
      </div>

      {/* Cluster Metric Cards - Equal Heights & Structured Typography */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {segmentData?.clusters.map((cluster) => (
          <div
            key={cluster.cluster_id}
            className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between min-h-[200px] transition-all hover:border-slate-300"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cluster #{cluster.cluster_id}
                </span>
                <span className="text-xs font-bold text-blue-600">
                  {formatPercent(cluster.percentage_of_customers)}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-snug">{cluster.segment_name}</h3>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Customers:</span>
                <span className="font-semibold text-slate-800">{formatNumber(cluster.segment_size)}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Monetary:</span>
                <span className="font-semibold text-slate-900">{formatINR(cluster.average_revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Frequency:</span>
                <span className="font-medium text-slate-700">{cluster.average_frequency} orders</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Recency:</span>
                <span className="font-medium text-slate-700">{cluster.average_recency} days</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visualizations Row - Aligned heights and padding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="K-Means Cluster Distribution"
          subtitle="Proportion of customer accounts across algorithmic clusters"
          loading={loading}
          error={error}
          isEmpty={!segmentData || segmentData.clusters.length === 0}
          onRetry={fetchData}
        >
          {segmentData && <SegmentChart data={segmentData.clusters} />}
        </ChartCard>

        <ChartCard
          title="RFM Behavioral Cohorts"
          subtitle="Customer segmentation based on rule-based quintile scoring"
          loading={loading}
          error={error}
          isEmpty={!segmentData || segmentData.rfm_segments.length === 0}
          onRetry={fetchData}
        >
          {segmentData && <SegmentChart data={segmentData.rfm_segments} />}
        </ChartCard>
      </div>

      {/* Cluster Table */}
      <div className="pt-2">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">Cluster Characteristics & Revenue Contributions</h3>
          <p className="text-xs text-slate-500">Summary of behavioral statistics for each algorithmic group</p>
        </div>
        <DataTable
          columns={clusterColumns}
          data={segmentData?.clusters || []}
          searchable={false}
          pageSize={6}
        />
      </div>
    </PageContainer>
  );
}
