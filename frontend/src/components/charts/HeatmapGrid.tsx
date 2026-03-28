import { motion } from 'framer-motion';
import { cn } from '../../utils/cn.ts';

export interface HeatmapGridProps {
  data: { month: string; region: string; value: number }[];
  months: string[];
  regions: string[];
  className?: string;
}

function getHeatColor(value: number, max: number): string {
  if (max === 0) return 'bg-gray-100';
  const ratio = value / max;
  if (ratio === 0) return 'bg-gray-100';
  if (ratio < 0.25) return 'bg-[#802B1B]/20';
  if (ratio < 0.5) return 'bg-[#802B1B]/40';
  if (ratio < 0.75) return 'bg-[#802B1B]/60';
  return 'bg-[#802B1B]/90';
}

function getTextColor(value: number, max: number): string {
  if (max === 0) return 'text-gray-600';
  const ratio = value / max;
  if (ratio < 0.5) return 'text-gray-500';
  return 'text-gray-100';
}

export function HeatmapGrid({ data, months, regions, className }: HeatmapGridProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  const getValue = (month: string, region: string): number => {
    return data.find((d) => d.month === month && d.region === region)?.value ?? 0;
  };

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <div className="min-w-[400px]">
        {/* Header row */}
        <div className="mb-1 flex">
          <div className="w-20 shrink-0" />
          {months.map((month) => (
            <div
              key={month}
              className="flex-1 text-center text-[10px] font-medium text-gray-500"
            >
              {month}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {regions.map((region, ri) => (
          <div key={region} className="mb-1 flex items-center">
            <div className="w-20 shrink-0 truncate pr-2 text-right text-[11px] text-gray-500">
              {region}
            </div>
            {months.map((month, mi) => {
              const value = getValue(month, region);
              return (
                <motion.div
                  key={`${region}-${month}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (ri * months.length + mi) * 0.015, duration: 0.3 }}
                  className={cn(
                    'mx-0.5 flex flex-1 items-center justify-center rounded',
                    'h-8 text-[10px] font-medium transition-all duration-200',
                    'hover:ring-1 hover:ring-[#802B1B]/50',
                    getHeatColor(value, max),
                    getTextColor(value, max),
                  )}
                  title={`${region} - ${month}: ${value} projects`}
                >
                  {value > 0 ? value : ''}
                </motion.div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="mt-3 flex items-center justify-end gap-1">
          <span className="mr-1 text-[10px] text-gray-500">Less</span>
          {['bg-gray-100', 'bg-[#802B1B]/20', 'bg-[#802B1B]/40', 'bg-[#802B1B]/60', 'bg-[#802B1B]/90'].map(
            (bg, i) => (
              <div key={i} className={cn('h-3 w-3 rounded-sm', bg)} />
            ),
          )}
          <span className="ml-1 text-[10px] text-gray-500">More</span>
        </div>
      </div>
    </div>
  );
}

export default HeatmapGrid;
