import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendItem } from '@/types';
import { formatINR, formatNumber } from '@/utils/formatting';
import { CHART_COLORS } from '@/utils/colors';

interface RevenueChartProps {
  data: TrendItem[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-full min-h-[290px]" style={{ minHeight: 290 }}>
      <ResponsiveContainer width="100%" height={290}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.25} />
              <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0.0} />
            </linearGradient>
          </defs>
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
            tickFormatter={(val) => formatINR(val, true)}
          />
          <Tooltip
            formatter={(value: any, name: string) => {
              if (name === 'revenue') return [formatINR(Number(value)), 'Gross Revenue'];
              if (name === 'orders') return [formatNumber(Number(value)), 'Orders'];
              if (name === 'aov') return [formatINR(Number(value)), 'Avg Order Value'];
              return [value, name];
            }}
            labelFormatter={(label) => `Period: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="revenue"
            stroke={CHART_COLORS.revenue}
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
            dot={{ r: 2, fill: CHART_COLORS.revenue }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
