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
import { ClusterMetric, RfmSegmentItem } from '@/types';
import { formatNumber, formatPercent } from '@/utils/formatting';
import { CATEGORY_PALETTE } from '@/utils/colors';

interface SegmentChartProps {
  data: Array<ClusterMetric | RfmSegmentItem | any>;
}

export function SegmentChart({ data }: SegmentChartProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((item: any) => ({
    name: item.segment_name || item.segment || `Cluster ${item.cluster_id}`,
    count: item.segment_size !== undefined ? item.segment_size : (item.count || 0),
    percentage: item.percentage_of_customers !== undefined ? item.percentage_of_customers : (item.percentage || 0),
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
            tickFormatter={(val) => formatNumber(val, true)}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            width={135}
          />
          <Tooltip
            formatter={(value: any, _, props: any) => [
              `${formatNumber(Number(value))} (${formatPercent(props.payload.percentage)})`,
              'Customers',
            ]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
            {chartData.map((_, index) => (
              <Cell
                key={`segment-cell-${index}`}
                fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
