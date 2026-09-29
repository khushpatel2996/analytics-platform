import React, { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import { ProductsData, CategoriesData } from '@/types';
import { useFilterParams } from '@/hooks/useFilterParams';
import { formatINR, formatNumber, formatPercent, formatLabel } from '@/utils/formatting';
import { PageContainer } from '@/components/layout/PageContainer';
import { GlobalFilters } from '@/components/filters/GlobalFilters';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { CategoryChart } from '@/components/charts/CategoryChart';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';

export function ProductsPage() {
  const { filters } = useFilterParams();
  const [metric, setMetric] = useState<'revenue' | 'quantity' | 'orders'>('revenue');
  const [limit, setLimit] = useState<number>(10);

  const [topProducts, setTopProducts] = useState<ProductsData | null>(null);
  const [categoriesData, setCategoriesData] = useState<CategoriesData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        apiService.getTopProducts(metric, limit, filters),
        apiService.getProductCategories(25, filters),
      ]);

      if (prodRes.success) setTopProducts(prodRes.data);
      if (catRes.success) setCategoriesData(catRes.data);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Failed to load product performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, metric, limit]);

  const productColumns: ColumnDef<any>[] = [
    {
      key: 'product_id',
      header: 'Product SKU',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-800" title={row.product_id}>
          {row.product_id.slice(0, 12)}...
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
          {formatLabel(row.category)}
        </span>
      ),
    },
    {
      key: 'revenue',
      header: 'Revenue Generated',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.revenue)}</span>,
    },
    {
      key: 'quantity',
      header: 'Units Sold',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.quantity)}</span>,
    },
    {
      key: 'orders_count',
      header: 'Orders',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.orders_count)}</span>,
    },
    {
      key: 'average_price',
      header: 'Avg Unit Price',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatINR(row.average_price)}</span>,
    },
  ];

  const categoryColumns: ColumnDef<any>[] = [
    {
      key: 'category',
      header: 'Category Name',
      sortable: true,
      render: (row) => <span className="font-semibold text-slate-800">{formatLabel(row.category)}</span>,
    },
    {
      key: 'revenue',
      header: 'Category Revenue',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.revenue)}</span>,
    },
    {
      key: 'quantity',
      header: 'Quantity Sold',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.quantity)}</span>,
    },
    {
      key: 'orders_count',
      header: 'Orders',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.orders_count)}</span>,
    },
    {
      key: 'average_price',
      header: 'Avg Price',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatINR(row.average_price)}</span>,
    },
    {
      key: 'percentage_of_revenue',
      header: 'Share %',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-blue-600">{formatPercent(row.percentage_of_revenue)}</span>
      ),
    },
  ];

  return (
    <PageContainer>
      <GlobalFilters />

      {/* Control bar for Metric & Top-N */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Product Ranking Criteria</h3>
          <p className="text-[11px] text-slate-500 font-normal">Rank product catalog by gross revenue, units sold, or transaction count</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setMetric('revenue')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                metric === 'revenue'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Revenue
            </button>
            <button
              onClick={() => setMetric('quantity')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                metric === 'quantity'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Quantity
            </button>
            <button
              onClick={() => setMetric('orders')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                metric === 'orders'
                  ? 'bg-white text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Orders
            </button>
          </div>

          {/* Limit Selector */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="text-xs bg-slate-100 border-none rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none"
          >
            <option value={5}>Top 5</option>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
          </select>
        </div>
      </div>

      {/* Category Chart */}
      <ChartCard
        title="Top Grossing Product Categories"
        subtitle="Revenue contribution of leading catalog sectors"
        loading={loading}
        error={error}
        isEmpty={!categoriesData || categoriesData.items.length === 0}
        onRetry={fetchData}
      >
        {categoriesData && (
          <CategoryChart
            data={categoriesData.items}
            valueKey="revenue"
            labelKey="category"
          />
        )}
      </ChartCard>

      {/* Tables Row: Top Products & Category Summary */}
      <div className="space-y-6">
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Top Ranked Products ({formatLabel(metric)})
            </h3>
            <p className="text-xs text-slate-500">Detailed SKU performance metrics</p>
          </div>
          <DataTable
            columns={productColumns}
            data={topProducts?.items || []}
            searchPlaceholder="Search product SKU or category..."
            pageSize={8}
          />
        </div>

        <div>
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">All Product Categories Breakdown</h3>
            <p className="text-xs text-slate-500">Comprehensive catalog categories and market shares</p>
          </div>
          <DataTable
            columns={categoryColumns}
            data={categoriesData?.items || []}
            searchPlaceholder="Search categories..."
            pageSize={10}
          />
        </div>
      </div>
    </PageContainer>
  );
}
