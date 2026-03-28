import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { useCallback, useState } from 'react';
import { cn } from '../../utils/cn.ts';
import { useTheme } from '../../hooks/useTheme.ts';

export interface BarChartProps {
  data: { region: string; projects: number; budget: number }[];
  className?: string;
}

interface BarTooltipEntry {
  name?: string;
  value?: number;
  dataKey?: string;
}

function CustomTooltip({
  active, payload, label,
  isDark, accent, border, card, textHi, textMd,
}: {
  active?: boolean;
  payload?: BarTooltipEntry[];
  label?: string;
  isDark: boolean;
  accent: string;
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
      <p style={{ fontSize: 12, color: textMd, marginBottom: 6 }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ fontSize: 13, color: isDark ? accent : textHi }}>
          {entry.dataKey === 'budget' ? 'Budget: OMR ' : 'Projects: '}
          <span style={{ fontWeight: 700 }}>{Number(entry.value ?? 0).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

export function BarChart({ data, className }: BarChartProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const { isDark, colors: C } = useTheme();

  const onBarEnter  = useCallback((_: unknown, index: number) => setActiveIndex(index), []);
  const onBarLeave  = useCallback(() => setActiveIndex(-1), []);

  const gridColor   = isDark ? '#2A2A2A' : '#E5E7EB';
  const tickColor   = isDark ? C.textLo  : '#6B7280';
  const barColor    = isDark ? C.accent  : '#802B1B';
  const barHover    = isDark ? C.accentLo : '#a03525';

  return (
    <div className={cn('h-[300px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={barColor} stopOpacity={1} />
              <stop offset="100%" stopColor={barColor} stopOpacity={isDark ? 0.5 : 0.4} />
            </linearGradient>
            <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={barHover} stopOpacity={1} />
              <stop offset="100%" stopColor={barHover} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="region"
            tick={{ fill: tickColor, fontSize: 12 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: tickColor, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val: number) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val)}
          />
          <Tooltip
            content={
              <CustomTooltip
                isDark={isDark} accent={C.accent} border={C.border}
                card={C.card} textHi={C.textHi} textMd={C.textMd}
              />
            }
            cursor={false}
          />
          <Bar dataKey="projects" radius={[6, 6, 0, 0]} onMouseEnter={onBarEnter} onMouseLeave={onBarLeave}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={activeIndex === index ? 'url(#barGradHover)' : 'url(#barGrad)'}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BarChart;
