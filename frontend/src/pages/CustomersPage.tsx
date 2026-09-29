import React, { useEffect, useState } from 'react';
import { Users, UserCheck, Repeat, IndianRupee, ShieldCheck } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { apiService } from '@/services/api';
import { CustomerSummaryData, TopCustomerItem } from '@/types';
import { useFilterParams } from '@/hooks/useFilterParams';
import { formatINR, formatNumber, formatPercent } from '@/utils/formatting';
import { CHART_COLORS } from '@/utils/colors';
import { PageContainer } from '@/components/layout/PageContainer';
import { GlobalFilters } from '@/components/filters/GlobalFilters';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';

export function CustomersPage() {
  const { filters } = useFilterParams();

  const [summary, setSummary] = useState<CustomerSummaryData | null>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomerItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, topRes] = await Promise.all([
        apiService.getCustomerSummary(filters),
        apiService.getTopCustomers(15, filters),
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      if (topRes.success) setTopCustomers(topRes.data);
    } catch (err: any) {
      console.error('Customer fetch error:', err);
      setError(err.message || 'Failed to load customer analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const customerColumns: ColumnDef<TopCustomerItem>[] = [
    {
      key: 'customer_unique_id',
      header: 'Customer ID (Masked for Privacy)',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{row.customer_unique_id}</span>
        </div>
      ),
    },
    {
      key: 'orders_count',
      header: 'Total Orders',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.orders_count)}</span>,
    },
    {
      key: 'total_spend',
      header: 'Lifetime Spend (GMV)',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.total_spend)}</span>,
    },
    {
      key: 'city',
      header: 'City',
      sortable: true,
      render: (row) => <span className="text-slate-600">{row.city}</span>,
    },
    {
      key: 'state',
      header: 'State',
      sortable: true,
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
          {row.state}
        </span>
      ),
    },
  ];

  const acquisitionChartData = summary?.acquisition_trend?.labels?.map((label, idx) => ({
    period: label,
    count: summary.acquisition_trend.values[idx] || 0,
  })) || [];

  return (
    <PageContainer>
      <GlobalFilters />

      {/* Customer Health KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Customer Base"
          value={formatNumber(summary?.total_customers, true)}
          subtitle="Distinct registered customer accounts"
          icon={Users}
          iconBgColor="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <KPICard
          label="Repeat Buyers"
          value={formatNumber(summary?.repeat_customers, true)}
          subtitle="Customers with multiple completed purchases"
          icon={UserCheck}
          iconBgColor="bg-teal-50"
          iconColor="text-teal-600"
        />
        <KPICard
          label="Repeat Purchase Rate"
          value={formatPercent(summary?.repeat_customer_rate)}
          subtitle="Percentage of recurring buyers"
          icon={Repeat}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KPICard
          label="Avg Spend per Customer"
          value={formatINR(summary?.average_spend_per_customer)}
          subtitle="Average lifetime customer spend"
          icon={IndianRupee}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* New Customer Acquisition Trajectory */}
      <ChartCard
        title="Customer Acquisition Trajectory"
        subtitle="New customer first-purchase cohort volume over time"
        loading={loading}
        error={error}
        isEmpty={acquisitionChartData.length === 0}
        onRetry={fetchData}
      >
        <div className="w-full h-full min-h-[290px]" style={{ minHeight: 290 }}>
          <ResponsiveContainer width="100%" height={290}>
            <LineChart data={acquisitionChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => formatNumber(val, true)} />
              <Tooltip
                formatter={(val: any) => [formatNumber(Number(val)), 'New Customers']}
                labelFormatter={(lbl) => `Month: ${lbl}`}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={CHART_COLORS.customers}
                strokeWidth={2.5}
                dot={{ r: 2, fill: CHART_COLORS.customers }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Top Customer Table */}
      <div className="pt-2">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">Highest Value Marketplace Buyers</h3>
          <p className="text-xs text-slate-500">Privacy-compliant top spending accounts ranked by GMV</p>
        </div>
        <DataTable
          columns={customerColumns}
          data={topCustomers}
          searchPlaceholder="Search state or city..."
          pageSize={10}
        />
      </div>
    </PageContainer>
  );
}
