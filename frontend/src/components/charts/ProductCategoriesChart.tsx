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
import { CategoryItem } from '@/types';
import { formatINR, formatPercent, formatLabel } from '@/utils/formatting';
import { CHART_COLORS } from '@/utils/colors';

interface ProductCategoriesChartProps {
  data: CategoryItem[];
}

export function ProductCategoriesChart({ data }: ProductCategoriesChartProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.slice(0, 8).map((item) => ({
    name: formatLabel(item.category),
    revenue: item.revenue,
    quantity: item.quantity,
    share: item.percentage_of_revenue,
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
            dataKey="name"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            width={125}
          />
          <Tooltip
            formatter={(val: any, _, props: any) => [
              `${formatINR(Number(val))} (${formatPercent(props.payload.share)} share)`,
              'Revenue',
            ]}
            labelFormatter={(label) => `Category: ${label}`}
          />
          <Bar
            dataKey="revenue"
            fill={CHART_COLORS.purple}
            radius={[0, 4, 4, 0]}
            barSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
