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
import { TrendItem } from '@/types';
import { formatNumber } from '@/utils/formatting';
import { CHART_COLORS } from '@/utils/colors';

interface OrdersChartProps {
  data: TrendItem[];
}

export function OrdersChart({ data }: OrdersChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-full min-h-[290px]" style={{ minHeight: 290 }}>
      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="period"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => formatNumber(val, true)}
          />
          <Tooltip
            formatter={(value: any) => [formatNumber(Number(value)), 'Total Orders']}
            labelFormatter={(label) => `Period: ${label}`}
          />
          <Bar
            dataKey="orders"
            fill={CHART_COLORS.orders}
            radius={[4, 4, 0, 0]}
            maxBarSize={45}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
