import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { PaymentDistributionItem, KeyValueMetric } from '@/types';
import { formatINR, formatPercent, formatLabel } from '@/utils/formatting';
import { CATEGORY_PALETTE } from '@/utils/colors';

interface PaymentChartProps {
  data: Array<PaymentDistributionItem | KeyValueMetric | any>;
}

export function PaymentChart({ data }: PaymentChartProps) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((item) => ({
    name: formatLabel(item.payment_type || item.label || 'Unknown'),
    value: item.revenue !== undefined ? item.revenue : (item.value || 0),
    orders: item.order_count !== undefined ? item.order_count : (item.count || 0),
    share: item.share_percentage !== undefined ? item.share_percentage : (item.percentage || 0),
  }));

  return (
    <div className="w-full h-full min-h-[290px] flex items-center justify-center" style={{ minHeight: 290 }}>
      <ResponsiveContainer width="100%" height={290}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="44%"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell
                key={`payment-cell-${index}`}
                fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, name: string, props: any) => [
              `${formatINR(Number(value))} (${formatPercent(props.payload.share)})`,
              name,
            ]}
          />
          <Legend
            iconType="circle"
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
