import { useCallback, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  Sector,
} from 'recharts';
import { cn } from '../../utils/cn.ts';
import { useTheme } from '../../hooks/useTheme.ts';

export interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  className?: string;
}

interface TooltipPayloadEntry { name?: string; value?: number; }

function CustomTooltip({
  active, payload,
  isDark, border, card, textHi, textMd,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  isDark: boolean;
  border: string;
  card: string;
  textHi: string;
  textMd: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${border}`,
      background: card,
      padding: '10px 16px',
      boxShadow: isDark ? '0 0 20px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0,0,0,0.1)',
    }}>
      <p style={{ fontSize: 12, color: textMd, marginBottom: 4 }}>{entry?.name}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: textHi }}>
        {Number(entry?.value ?? 0).toLocaleString()} projects
      </p>
    </div>
  );
}

interface SectorShapeProps {
  cx: number; cy: number;
  innerRadius: number; outerRadius: number;
  startAngle: number; endAngle: number;
  fill: string;
}

function renderActiveShape(props: SectorShapeProps) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
}

interface LegendEntry { value: string; color: string; }

function CustomLegend({ payload, textMd }: { payload?: LegendEntry[]; textMd: string }) {
  if (!payload) return null;
  return (
    <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px' }}>
      {payload.map((entry) => (
        <div key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color }} />
          <span style={{ fontSize: 12, color: textMd }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ data, className }: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const { isDark, colors: C } = useTheme();

  const onPieEnter = useCallback((_: unknown, index: number) => setActiveIndex(index), []);
  const onPieLeave = useCallback(() => setActiveIndex(-1), []);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={cn('h-[300px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="45%"
            innerRadius={60} outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            activeShape={renderActiveShape as never}
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                opacity={activeIndex === -1 || activeIndex === index ? 1 : 0.5}
              />
            ))}
          </Pie>
          <Tooltip
            content={
              <CustomTooltip
                isDark={isDark} border={C.border} card={C.card}
                textHi={C.textHi} textMd={C.textMd}
              />
            }
          />
          <Legend content={<CustomLegend textMd={C.textMd} />} />
          <text x="50%" y="42%" textAnchor="middle" dominantBaseline="middle"
            style={{ fill: C.textHi, fontSize: 22, fontWeight: 700 }}>
            {total}
          </text>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
            style={{ fill: C.textMd, fontSize: 12 }}>
            Total
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DonutChart;
