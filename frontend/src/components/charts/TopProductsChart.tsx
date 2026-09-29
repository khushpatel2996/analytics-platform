import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ProductItem } from '@/types';
import { formatINR, formatNumber, formatLabel } from '@/utils/formatting';
import { CHART_COLORS } from '@/utils/colors';

interface TopProductsChartProps {
  data: ProductItem[];
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.slice(0, 8).map((item) => ({
    name: formatLabel(item.category),
    sku: `SKU-${item.product_id.substring(0, 6).toUpperCase()}`,
    revenue: item.revenue,
    quantity: item.quantity,
    orders: item.orders_count,
    avgPrice: item.average_price,
  }));

  return (
    <div className="w-full h-full min-h-[290px]" style={{ minHeight: 290 }}>
      <ResponsiveContainer width="100%" height={290}>
        <BarChart
          layout="vertical"
          data={chartData}
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
            dataKey="sku"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            width={95}
          />
          <Tooltip
            formatter={(val: any, _, props: any) => [
              `${formatINR(Number(val))} (${formatNumber(props.payload.quantity)} units)`,
              'Revenue',
            ]}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload;
              return `${label} — ${item?.name || ''}`;
            }}
          />
          <Bar
            dataKey="revenue"
            fill={CHART_COLORS.primary}
            radius={[0, 4, 4, 0]}
            barSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
