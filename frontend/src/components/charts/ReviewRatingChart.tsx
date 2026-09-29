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
import { RatingDistributionItem } from '@/types';
import { formatNumber, formatPercent } from '@/utils/formatting';

interface ReviewRatingChartProps {
  data: RatingDistributionItem[];
  averageRating?: number;
}

const RATING_COLORS: Record<number, string> = {
  5: '#10b981', // Emerald
  4: '#3b82f6', // Blue
  3: '#f59e0b', // Amber
  2: '#f97316', // Orange
  1: '#ef4444', // Red
};

export function ReviewRatingChart({ data }: ReviewRatingChartProps) {
  if (!data || data.length === 0) return null;

  const chartData = [...data]
    .sort((a, b) => b.stars - a.stars)
    .map((item) => ({
      label: `${item.stars} ★`,
      stars: item.stars,
      count: item.count,
      percentage: item.percentage,
    }));

  return (
    <div className="w-full h-full min-h-[290px]" style={{ minHeight: 290 }}>
      <ResponsiveContainer width="100%" height={290}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            stroke="#94a3b8"
            fontSize={12}
            fontWeight={600}
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
            formatter={(val: any, _, props: any) => [
              `${formatNumber(Number(val))} reviews (${formatPercent(props.payload.percentage)})`,
              'Count',
            ]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={45}>
            {chartData.map((entry) => (
              <Cell
                key={`rating-star-${entry.stars}`}
                fill={RATING_COLORS[entry.stars] || '#3b82f6'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
