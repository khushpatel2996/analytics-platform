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
import { formatINR, formatLabel } from '@/utils/formatting';
import { CHART_COLORS } from '@/utils/colors';

interface CategoryChartProps {
  data: Array<any>;
  valueKey?: string;
  labelKey?: string;
}

export function CategoryChart({
  data,
  valueKey = 'value',
  labelKey = 'label',
}: CategoryChartProps) {
  if (!data || data.length === 0) return null;

  // Format data for chart safely supporting both formats
  const formattedData = data.slice(0, 10).map((item: any) => ({
    name: formatLabel(item[labelKey] || item.category || item.label),
    val: item[valueKey] !== undefined ? item[valueKey] : (item.revenue !== undefined ? item.revenue : item.value || 0),
    rawName: item[labelKey] || item.category || item.label,
  }));

  return (
    <div className="w-full h-full min-h-[290px]" style={{ minHeight: 290 }}>
      <ResponsiveContainer width="100%" height={290}>
        <BarChart
          layout="vertical"
          data={formattedData}
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
            formatter={(value: any) => [formatINR(Number(value)), 'Revenue']}
            labelFormatter={(label) => `Category: ${label}`}
          />
          <Bar
            dataKey="val"
            fill={CHART_COLORS.revenue}
            radius={[0, 4, 4, 0]}
            barSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
