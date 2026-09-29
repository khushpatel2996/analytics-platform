import React, { useEffect, useState } from 'react';
import { CreditCard, IndianRupee, Hash } from 'lucide-react';
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
import { PaymentSummaryData } from '@/types';
import { useFilterParams } from '@/hooks/useFilterParams';
import { formatINR, formatNumber, formatPercent, formatLabel } from '@/utils/formatting';
import { CATEGORY_PALETTE } from '@/utils/colors';
import { PageContainer } from '@/components/layout/PageContainer';
import { GlobalFilters } from '@/components/filters/GlobalFilters';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { PaymentChart } from '@/components/charts/PaymentChart';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';

export function PaymentsPage() {
  const { filters } = useFilterParams();
  const [paymentData, setPaymentData] = useState<PaymentSummaryData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getPaymentSummary(filters);
      if (res.success) setPaymentData(res.data);
    } catch (err: any) {
      console.error('Payment fetch error:', err);
      setError(err.message || 'Failed to load payment analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const paymentColumns: ColumnDef<any>[] = [
    {
      key: 'payment_type',
      header: 'Payment Channel',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-800">{formatLabel(row.payment_type)}</span>
        </div>
      ),
    },
    {
      key: 'revenue',
      header: 'Gross Value Processed',
      sortable: true,
      align: 'right',
      render: (row) => <span className="font-semibold text-slate-900">{formatINR(row.revenue)}</span>,
    },
    {
      key: 'order_count',
      header: 'Transaction Count',
      sortable: true,
      align: 'right',
      render: (row) => <span className="text-slate-700 font-normal">{formatNumber(row.order_count)}</span>,
    },
    {
      key: 'share_percentage',
      header: 'GMV Share %',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-blue-600">{formatPercent(row.share_percentage)}</span>
      ),
    },
  ];

  const barData = paymentData?.distribution.map((d) => ({
    name: formatLabel(d.payment_type),
    revenue: d.revenue,
    orders: d.order_count,
  })) || [];

  const topChannel = paymentData?.distribution[0];

  return (
    <PageContainer>
      <GlobalFilters />

      {/* Payment Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          label="Total Settlement Volume"
          value={formatINR(paymentData?.total_payment_value, true)}
          subtitle={`Total GMV: ${formatINR(paymentData?.total_payment_value)}`}
          icon={IndianRupee}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KPICard
          label="Total Transactions"
          value={formatNumber(paymentData?.total_transactions, true)}
          subtitle={`${formatNumber(paymentData?.total_transactions)} gateway checkouts`}
          icon={Hash}
          iconBgColor="bg-teal-50"
          iconColor="text-teal-600"
        />
        <KPICard
          label="Dominant Payment Channel"
          value={formatLabel(topChannel?.payment_type) || 'Credit Card'}
          subtitle={`Contributes ${formatPercent(topChannel?.share_percentage)} of total GMV`}
          icon={CreditCard}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Payment Method Distribution"
          subtitle="Donut breakdown of revenue share per checkout method"
          loading={loading}
          error={error}
          isEmpty={!paymentData || paymentData.distribution.length === 0}
          onRetry={fetchData}
        >
          {paymentData && <PaymentChart data={paymentData.distribution} />}
        </ChartCard>

        <ChartCard
          title="Payment Value by Method"
          subtitle="Total rupee volume processed per checkout instrument"
          loading={loading}
          error={error}
          isEmpty={barData.length === 0}
          onRetry={fetchData}
        >
          <div className="w-full h-full min-h-[290px]" style={{ minHeight: 290 }}>
            <ResponsiveContainer width="100%" height={290}>
              <BarChart
                layout="vertical"
                data={barData}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => formatINR(val, true)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  width={110}
                />
                <Tooltip
                  formatter={(value: any) => [formatINR(Number(value)), 'Processed Value']}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={20}>
                  {barData.map((_, index) => (
                    <Cell
                      key={`bar-cell-${index}`}
                      fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Payment Table */}
      <div className="pt-2">
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900">Payment Gateway Instrument Performance</h3>
          <p className="text-xs text-slate-500">Breakdown of transaction values, orders, and market share percentages</p>
        </div>
        <DataTable
          columns={paymentColumns}
          data={paymentData?.distribution || []}
          searchable={false}
          pageSize={10}
        />
      </div>
    </PageContainer>
  );
}
