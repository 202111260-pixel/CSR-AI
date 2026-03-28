import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '../../utils/cn.ts';
import { useTheme } from '../../hooks/useTheme.ts';

export interface StackedBarChartProps {
  data: { category: string; male: number; female: number; children: number }[];
  className?: string;
}

interface StackedTooltipEntry { name?: string; value?: number; color?: string; }

function CustomTooltip({
  active, payload, label,
  isDark, border, card, textHi, textMd,
}: {
  active?: boolean;
  payload?: StackedTooltipEntry[];
  label?: string;
  isDark: boolean;
  border: string;
  card: string;
  textHi: string;
  textMd: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((sum, e) => sum + (e.value ?? 0), 0);
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
        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color }} />
          <span style={{ color: textMd }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, color: textHi }}>{Number(entry.value ?? 0).toLocaleString()}</span>
        </div>
      ))}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${border}`, fontSize: 13, fontWeight: 700, color: textHi }}>
        Total: {total.toLocaleString()}
      </div>
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

export function StackedBarChart({ data, className }: StackedBarChartProps) {
  const { isDark, colors: C } = useTheme();

  const gridColor = isDark ? '#2A2A2A' : '#E5E7EB';
  const tickColor = isDark ? C.textLo  : '#6B7280';

  // In dark mode: lime, sky-blue, pink — vivid & high contrast
  const maleColor     = isDark ? C.accent  : '#3b82f6';
  const femaleColor   = isDark ? '#38BDF8' : '#a855f7';
  const childrenColor = isDark ? '#F472B6' : '#10b981';

  return (
    <div className={cn('h-[300px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis
            dataKey="category"
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
                isDark={isDark} border={C.border} card={C.card}
                textHi={C.textHi} textMd={C.textMd}
              />
            }
            cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
          />
          <Legend content={<CustomLegend textMd={C.textMd} />} />
          <Bar dataKey="male"     stackId="a" fill={maleColor}     radius={[0, 0, 0, 0]} name="Male" />
          <Bar dataKey="female"   stackId="a" fill={femaleColor}   radius={[0, 0, 0, 0]} name="Female" />
          <Bar dataKey="children" stackId="a" fill={childrenColor} radius={[4, 4, 0, 0]} name="Children" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default StackedBarChart;
