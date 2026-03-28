import { type ReactNode } from 'react';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export interface KpiCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: ReactNode;
  iconBg: string;
  trend?: { value: number; isPositive: boolean };
}

export function KpiCard({
  title,
  value,
  prefix,
  suffix,
  icon,
  iconBg,
  trend,
}: KpiCardProps) {
  const { colors: P } = useTheme();
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative overflow-hidden rounded-[20px] p-6"
      style={{
        background: P.card,
        border: `1px solid ${P.border}`,
        boxShadow: `inset 0 1px 0 ${P.borderHi}40, 0 12px 40px rgba(0,0,0,0.05)`,
      }}
    >
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent" />

      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: P.textMd }}>{title}</p>
          <div className="mt-3 flex items-baseline gap-1">
            {prefix && (
              <span className="text-lg font-semibold" style={{ color: P.textMd }}>
                {prefix}
              </span>
            )}
            <span className="text-3xl font-bold tracking-tight" style={{ color: P.textHi }}>
              <CountUp
                end={value}
                duration={2}
                separator=","
                decimals={0}
                preserveValue
              />
            </span>
            {suffix && (
              <span className="text-lg font-semibold" style={{ color: P.textMd }}>
                {suffix}
              </span>
            )}
          </div>

          {trend && (
            <div className="mt-3 flex items-center gap-1.5">
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" style={{ color: '#34d399' }} />
              ) : (
                <TrendingDown className="h-4 w-4" style={{ color: '#f87171' }} />
              )}
              <span
                className="text-sm font-medium"
                style={{ color: trend.isPositive ? '#34d399' : '#f87171' }}
              >
                {trend.isPositive ? '+' : '-'}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-xs" style={{ color: P.textLo }}>vs last month</span>
            </div>
          )}
        </div>

        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

export default KpiCard;
