import React, { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import { SalesTrendData, SalesBreakdownData } from '@/types';
import { useFilterParams } from '@/hooks/useFilterParams';
import { formatINR, formatNumber, formatLabel } from '@/utils/formatting';
import { PageContainer } from '@/components/layout/PageContainer';
import { GlobalFilters } from '@/components/filters/GlobalFilters';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { OrdersChart } from '@/components/charts/OrdersChart';
import { CategoryChart } from '@/components/charts/CategoryChart';
import { StateChart } from '@/components/charts/StateChart';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';

const GRANULARITIES = [
  { id: 'month', label: 'Monthly' },
  { id: 'quarter', label: 'Quarterly' },
  { id: 'year', label: 'Yearly' },
  { id: 'week', label: 'Weekly' },
  { id: 'day', label: 'Daily' },
];

export function SalesPage() {
  const { filters } = useFilterParams();
  const [granularity, setGranularity] = useState('month');

  const [trendData, setTrendData] = useState<SalesTrendData | null>(null);
  const [catData, setCatData] = useState<SalesBreakdownData | null>(null);
  const [stateData, setStateData] = useState<SalesBreakdownData | null>(null);
  const [cityData, setCityData] = useState<SalesBreakdownData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendRes, catRes, stRes, cityRes] = await Promise.all([
        apiService.getSalesTrend(granularity, filters),
        apiService.getSalesByCategory(10, filters),
        apiService.getSalesByState(10, filters),
        apiService.getSalesByCity(10, filters),
      ]);

      if (trendRes.success) setTrendData(trendRes.data);
      if (catRes.success) setCatData(catRes.data);
      if (stRes.success) setStateData(stRes.data);
      if (cityRes.success) setCityData(cityRes.data);
    } catch (err: any) {
      console.error('Failed to load sales data:', err);
      setError(err.message || 'Failed to load sales analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, granularity]);

  const columns: ColumnDef<any>[] = [
    {
      key: 'period',
      header: 'Time Period',
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-800">{row.period}</span>,
    },
    {
      key: 'revenue',
      header: 'Gross Revenue',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.revenue)}</span>,
    },
    {
      key: 'orders',
      header: 'Orders',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.orders)}</span>,
    },
    {
      key: 'quantity',
      header: 'Items Sold',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.quantity)}</span>,
    },
    {
      key: 'aov',
      header: 'Avg Order Value',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatINR(row.aov)}</span>,
    },
  ];

  return (
    <PageContainer>
      <GlobalFilters />

      {/* Granularity Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Temporal Aggregation</h3>
          <p className="text-[11px] text-slate-500 font-normal">Group timeline metrics by day, week, month, quarter, or year</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {GRANULARITIES.map((g) => (
            <button
              key={g.id}
              onClick={() => setGranularity(g.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                granularity === g.id
                  ? 'bg-white text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Trends Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title={`Revenue Trajectory (${formatLabel(granularity)})`}
          subtitle="Gross merchandise revenue progression over time"
          loading={loading}
          error={error}
          isEmpty={!trendData || trendData.trend.length === 0}
          onRetry={fetchData}
        >
          {trendData && <RevenueChart data={trendData.trend} />}
        </ChartCard>

        <ChartCard
          title={`Order Volume (${formatLabel(granularity)})`}
          subtitle="Number of successfully processed customer purchases"
          loading={loading}
          error={error}
          isEmpty={!trendData || trendData.trend.length === 0}
          onRetry={fetchData}
        >
          {trendData && <OrdersChart data={trendData.trend} />}
        </ChartCard>
      </div>

      {/* Dimensional Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Revenue by Product Category"
          subtitle="Top categories contributing to sales turnover"
          loading={loading}
          error={error}
          isEmpty={!catData || catData.items.length === 0}
          onRetry={fetchData}
        >
          {catData && <CategoryChart data={catData.items} />}
        </ChartCard>

        <ChartCard
          title="Revenue by Indian State"
          subtitle="Regional turnover across top states"
          loading={loading}
          error={error}
          isEmpty={!stateData || stateData.items.length === 0}
          onRetry={fetchData}
        >
          {stateData && <StateChart data={stateData.items} />}
        </ChartCard>
      </div>

      {/* Detailed Historical Data Table */}
      <div className="pt-2">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">Historical Sales Performance Table</h3>
          <p className="text-xs text-slate-500">Period-by-period breakdown of revenue, volume, and basket size</p>
        </div>
        <DataTable
          columns={columns}
          data={trendData?.trend || []}
          searchPlaceholder="Search periods (e.g. 2018)..."
          pageSize={8}
        />
      </div>
    </PageContainer>
  );
}
