import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '../../utils/cn.ts';
import { useTheme } from '../../hooks/useTheme.ts';

export interface AreaChartProps {
  data: { month: string; budget: number; spent: number }[];
  className?: string;
}

interface AreaTooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

function CustomTooltip({
  active, payload, label,
  isDark, border, card, textHi, textMd,
}: {
  active?: boolean;
  payload?: AreaTooltipEntry[];
  label?: string;
  isDark: boolean;
  border: string;
  card: string;
  textHi: string;
  textMd: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${border}`,
      background: card,
      padding: '10px 16px',
      boxShadow: isDark ? '0 0 20px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      <p style={{ fontSize: 12, color: textMd, marginBottom: 8 }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color }} />
          <span style={{ color: textMd }}>{entry.name}:</span>
          <span style={{ fontWeight: 700, color: textHi }}>OMR {Number(entry.value ?? 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

interface LegendEntry { value: string; color: string; }

function CustomLegend({ payload, textMd }: { payload?: LegendEntry[]; textMd: string }) {
  if (!payload) return null;
  return (
    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 16 }}>
      {payload.map((entry) => (
        <div key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color }} />
          <span style={{ fontSize: 12, color: textMd }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AreaChart({ data, className }: AreaChartProps) {
  const { isDark, colors: C } = useTheme();

  const gridColor    = isDark ? '#2A2A2A' : '#E5E7EB';
  const tickColor    = isDark ? C.textLo  : '#6B7280';
  const budgetColor  = isDark ? C.accent  : '#3b82f6';
  const spentColor   = isDark ? '#F472B6' : '#802B1B';

  return (
    <div className={cn('h-[300px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={budgetColor} stopOpacity={isDark ? 0.25 : 0.3} />
              <stop offset="95%" stopColor={budgetColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor={spentColor} stopOpacity={isDark ? 0.25 : 0.3} />
              <stop offset="95%" stopColor={spentColor} stopOpacity={0} />
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
                isDark={isDark} border={C.border} card={C.card}
                textHi={C.textHi} textMd={C.textMd}
              />
            }
          />
          <Legend content={<CustomLegend textMd={C.textMd} />} />
          <Area type="monotone" dataKey="budget" name="Budget" stroke={budgetColor} strokeWidth={2}
            fill="url(#budgetGrad)" dot={false}
            activeDot={{ r: 4, fill: budgetColor, stroke: isDark ? C.card : '#f9fafb', strokeWidth: 2 }}
          />
          <Area type="monotone" dataKey="spent" name="Spent" stroke={spentColor} strokeWidth={2}
            fill="url(#spentGrad)" dot={false}
            activeDot={{ r: 4, fill: spentColor, stroke: isDark ? C.card : '#f9fafb', strokeWidth: 2 }}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AreaChart;
