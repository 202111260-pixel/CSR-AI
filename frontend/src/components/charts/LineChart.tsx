import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { cn } from '../../utils/cn.ts';
import { useTheme } from '../../hooks/useTheme.ts';

export interface LineChartProps {
  data: { month: string; amount: number }[];
  className?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  isDark,
  accent,
  border,
  card,
  textHi,
  textMd,
}: TooltipProps<ValueType, NameType> & {
  isDark: boolean;
  accent: string;
  border: string;
  card: string;
  textHi: string;
  textMd: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${border}`,
      background: card,
      padding: '10px 16px',
      boxShadow: isDark ? `0 0 20px rgba(0,0,0,0.6)` : '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      <p style={{ fontSize: 12, color: textMd, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: isDark ? accent : textHi }}>
        OMR {Number(value).toLocaleString()}
      </p>
    </div>
  );
}

export function LineChart({ data, className }: LineChartProps) {
  const { isDark, colors: C } = useTheme();

  const gridColor   = isDark ? '#2A2A2A' : '#E5E7EB';
  const tickColor   = isDark ? C.textLo  : '#6B7280';
  const strokeColor = isDark ? C.accent  : '#802B1B';

  return (
    <div className={cn('h-[300px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGradientLine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={strokeColor} stopOpacity={isDark ? 0.35 : 0.4} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: tickColor, fontSize: 12 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: tickColor, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k`}
          />
          <Tooltip
            content={
              <CustomTooltip
                isDark={isDark}
                accent={C.accent}
                border={C.border}
                card={C.card}
                textHi={C.textHi}
                textMd={C.textMd}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={strokeColor}
            strokeWidth={2.5}
            fill="url(#areaGradientLine)"
            dot={false}
            activeDot={{
              r: 5,
              fill: strokeColor,
              stroke: isDark ? C.card : '#f9fafb',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default LineChart;
