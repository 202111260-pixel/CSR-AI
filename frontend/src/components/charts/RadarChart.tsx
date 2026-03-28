import {
  ResponsiveContainer,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { cn } from '../../utils/cn.ts';
import { useTheme } from '../../hooks/useTheme.ts';

export interface RadarChartProps {
  data: { subject: string; value: number; fullMark: number }[];
  className?: string;
}

interface RadarTooltipEntry { name?: string; value?: number; }

function CustomTooltip({
  active, payload, label,
  isDark, accent, border, card, textHi, textMd,
}: {
  active?: boolean;
  payload?: RadarTooltipEntry[];
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
      <p style={{ fontSize: 12, color: textMd, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: isDark ? accent : textHi }}>
        {payload[0]?.value}%
      </p>
    </div>
  );
}

export function RadarChart({ data, className }: RadarChartProps) {
  const { isDark, colors: C } = useTheme();

  const gridColor   = isDark ? '#2A2A2A' : '#E5E7EB';
  const tickColor   = isDark ? C.textLo  : '#6B7280';
  const radarColor  = isDark ? C.accent  : '#802B1B';

  return (
    <div className={cn('h-[300px] w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis dataKey="subject" tick={{ fill: tickColor, fontSize: 10 }} />
          <PolarRadiusAxis
            angle={90} domain={[0, 100]}
            tick={{ fill: tickColor, fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            name="Alignment"
            dataKey="value"
            stroke={radarColor}
            fill={radarColor}
            fillOpacity={isDark ? 0.2 : 0.25}
            strokeWidth={2}
          />
          <Tooltip
            content={
              <CustomTooltip
                isDark={isDark} accent={C.accent} border={C.border}
                card={C.card} textHi={C.textHi} textMd={C.textMd}
              />
            }
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RadarChart;
