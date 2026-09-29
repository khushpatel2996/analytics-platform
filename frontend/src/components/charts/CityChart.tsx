import React from 'react';
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
import { KeyValueMetric } from '@/types';
import { formatINR, formatNumber, formatLabel } from '@/utils/formatting';
import { CHART_COLORS } from '@/utils/colors';

interface CityChartProps {
  data: KeyValueMetric[];
}

export function CityChart({ data }: CityChartProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.slice(0, 10).map((item) => ({
    name: formatLabel(item.label),
    revenue: item.value,
    orders: item.count || 0,
    share: item.percentage || 0,
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
            width={120}
          />
          <Tooltip
            formatter={(val: any, _, props: any) => [
              `${formatINR(Number(val))} (${formatNumber(props.payload.orders)} orders)`,
              'Revenue',
            ]}
            labelFormatter={(label) => `City: ${label}`}
          />
          <Bar
            dataKey="revenue"
            fill={CHART_COLORS.orders}
            radius={[0, 4, 4, 0]}
            barSize={18}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`city-cell-${index}`}
                fill={index === 0 ? CHART_COLORS.primary : CHART_COLORS.orders}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
