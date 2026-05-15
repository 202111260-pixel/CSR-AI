import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { cn } from '../../../utils/cn';

interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  prefix?: string;
  label: string;
  duration?: number;
  className?: string;
  decimals?: number;
  separator?: string;
}

export function AnimatedCounter({
  end,
  suffix = '',
  prefix = '',
  label,
  duration = 2.5,
  className,
  decimals = 0,
  separator = ',',
}: AnimatedCounterProps) {
  const { ref, inView } = useInView({ threshold: 0.3, triggerOnce: true });

  return (
    <div ref={ref} className={cn('relative text-center', className)}>
      {/* Glow behind number */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-32 rounded-full bg-[#C8A44E]/10 blur-2xl" />

      <div className="relative">
        <div className="font-['Geist_Mono',monospace] text-4xl font-bold text-[#E8ECF1] sm:text-5xl">
          {inView ? (
            <CountUp
              start={0}
              end={end}
              duration={duration}
              suffix={suffix}
              prefix={prefix}
              decimals={decimals}
              separator={separator}
            />
          ) : (
            <span className="opacity-0">{prefix}{end.toLocaleString()}{suffix}</span>
          )}
        </div>
        <p className="mt-2 text-sm font-medium tracking-wider text-[#8899AB] uppercase">
          {label}
        </p>
      </div>
    </div>
  );
}
