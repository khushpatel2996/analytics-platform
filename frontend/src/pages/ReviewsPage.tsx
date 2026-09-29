import React, { useEffect, useState } from 'react';
import { Star, MessageSquare, Info, TrendingUp, Award } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { apiService } from '@/services/api';
import { ReviewSummaryData } from '@/types';
import { useFilterParams } from '@/hooks/useFilterParams';
import { formatNumber, formatPercent, formatLabel, formatINR } from '@/utils/formatting';
import { PageContainer } from '@/components/layout/PageContainer';
import { GlobalFilters } from '@/components/filters/GlobalFilters';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';

const RATING_COLORS: Record<number, string> = {
  5: '#10b981', // Emerald
  4: '#3b82f6', // Blue
  3: '#f59e0b', // Amber
  2: '#f97316', // Orange
  1: '#ef4444', // Red
};

export function ReviewsPage() {
  const { filters } = useFilterParams();
  const [reviewData, setReviewData] = useState<ReviewSummaryData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getReviewSummary(filters);
      if (res.success) setReviewData(res.data);
    } catch (err: any) {
      console.error('Review fetch error:', err);
      setError(err.message || 'Failed to load review analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const catColumns: ColumnDef<any>[] = [
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-800">{formatLabel(row.category)}</span>,
    },
    {
      key: 'average_rating',
      header: 'Average Rating',
      sortable: true,
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center gap-1 font-semibold text-slate-900">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{row.average_rating}</span>
        </div>
      ),
    },
    {
      key: 'reviews_count',
      header: 'Total Reviews',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.reviews_count)}</span>,
    },
    {
      key: 'revenue',
      header: 'Category GMV',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.revenue)}</span>,
    },
  ];

  const stateColumns: ColumnDef<any>[] = [
    {
      key: 'state',
      header: 'Indian State',
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-800">{row.state}</span>,
    },
    {
      key: 'average_rating',
      header: 'Average Rating',
      sortable: true,
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center gap-1 font-semibold text-slate-900">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{row.average_rating}</span>
        </div>
      ),
    },
    {
      key: 'reviews_count',
      header: 'Review Volume',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.reviews_count)}</span>,
    },
  ];

  const fiveStarReviews = reviewData?.rating_distribution.find((r) => r.stars === 5);
  const ratingChartData = [...(reviewData?.rating_distribution || [])]
    .sort((a, b) => b.stars - a.stars)
    .map((r) => ({
      label: `${r.stars} Stars`,
      stars: r.stars,
      count: r.count,
      percentage: r.percentage,
    }));

  return (
    <PageContainer>
      <GlobalFilters />

      {/* Review KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Platform Average Rating"
          value={`${reviewData?.average_rating || 0} / 5.0`}
          subtitle="Overall satisfaction benchmark across platform"
          icon={Star}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-500"
        />
        <KPICard
          label="Total Customer Reviews"
          value={formatNumber(reviewData?.total_reviews, true)}
          subtitle={`${formatNumber(reviewData?.total_reviews)} validated customer ratings`}
          icon={MessageSquare}
          iconBgColor="bg-teal-50"
          iconColor="text-teal-600"
        />
        <KPICard
          label="5-Star Rating Share"
          value={formatPercent(fiveStarReviews?.percentage)}
          subtitle={`${formatNumber(fiveStarReviews?.count)} top ratings recorded`}
          icon={Award}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KPICard
          label="Rating vs Revenue Corr."
          value={String(reviewData?.correlation_with_revenue ?? '0.0')}
          subtitle="Pearson correlation coefficient"
          icon={TrendingUp}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* Rating Distribution Chart */}
      <ChartCard
        title="Customer Rating Distribution (1 to 5 Stars)"
        subtitle="Breakdown of customer satisfaction score frequency"
        loading={loading}
        error={error}
        isEmpty={ratingChartData.length === 0}
        onRetry={fetchData}
      >
        <div className="w-full h-full min-h-[290px]" style={{ minHeight: 290 }}>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart
              data={ratingChartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => formatNumber(val, true)} />
              <Tooltip
                formatter={(val: any, _, props: any) => [
                  `${formatNumber(Number(val))} reviews (${formatPercent(props.payload.percentage)})`,
                  'Count',
                ]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
                {ratingChartData.map((entry) => (
                  <Cell
                    key={`star-${entry.stars}`}
                    fill={RATING_COLORS[entry.stars] || '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Analytical Callout: Correlation vs Causation */}
      <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-bold">Statistical Notice (Correlation vs. Causation):</span> The Pearson correlation coefficient ({reviewData?.correlation_with_revenue}) analyzes linear dependency between basket size and rating score. While near zero (indicating customer rating is largely independent of order price), correlation does not imply causation.
        </p>
      </div>

      {/* Category and State Satisfaction Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">Category Customer Satisfaction</h3>
            <p className="text-xs text-slate-500">Average review score across major product categories</p>
          </div>
          <DataTable
            columns={catColumns}
            data={reviewData?.by_category || []}
            searchPlaceholder="Search categories..."
            pageSize={8}
          />
        </div>

        <div>
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">State-wise Satisfaction Benchmark</h3>
            <p className="text-xs text-slate-500">Regional customer rating averages across India</p>
          </div>
          <DataTable
            columns={stateColumns}
            data={reviewData?.by_state || []}
            searchPlaceholder="Search states..."
            pageSize={8}
          />
        </div>
      </div>
    </PageContainer>
  );
}
