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
import { StateMetric, KeyValueMetric } from '@/types';
import { formatINR, formatNumber } from '@/utils/formatting';
import { CHART_COLORS } from '@/utils/colors';

interface StateChartProps {
  data: Array<StateMetric | KeyValueMetric | any>;
  metric?: 'revenue' | 'orders';
}

export function StateChart({ data, metric = 'revenue' }: StateChartProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.slice(0, 10).map((item: any) => ({
    name: item.state || item.label,
    val: metric === 'orders' ? (item.orders || item.count || 0) : (item.revenue !== undefined ? item.revenue : (item.value || 0)),
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
            tickFormatter={(val) =>
              metric === 'revenue' ? formatINR(val, true) : formatNumber(val, true)
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            width={120}
          />
          <Tooltip
            formatter={(value: any) => [
              metric === 'revenue' ? formatINR(Number(value)) : formatNumber(Number(value)),
              metric === 'revenue' ? 'Revenue' : 'Orders',
            ]}
            labelFormatter={(label) => `State: ${label}`}
          />
          <Bar
            dataKey="val"
            fill={metric === 'orders' ? CHART_COLORS.orders : CHART_COLORS.revenue}
            radius={[0, 4, 4, 0]}
            barSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
