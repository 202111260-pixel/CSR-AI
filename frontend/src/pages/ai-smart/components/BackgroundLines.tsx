import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

/**
 * Aceternity BackgroundLines — animated SVG wave paths (inspired by height.app).
 */

export function BackgroundLines({
  children,
  className,
  svgOptions,
  lineColor = '#0a0a0a',
}: {
  children: React.ReactNode;
  className?: string;
  svgOptions?: { duration?: number };
  lineColor?: string;
}) {
  const duration = svgOptions?.duration ?? 10;

  /* Generate a set of wave paths across the container */
  const paths = useMemo(() => {
    const count = 36;
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const baseY = 8 + (84 / (count - 1)) * i; // spread 8%–92% of height
      const points = 8; // control points per path
      let d = `M -5 ${baseY}`;
      for (let j = 1; j <= points; j++) {
        const x = (100 / points) * j;
        const waveAmp = 2 + Math.sin(i * 0.5) * 1.5 + Math.random() * 1.5;
        const y = baseY + (j % 2 === 0 ? waveAmp : -waveAmp);
        const cpx = x - 100 / points / 2;
        const cpy = j % 2 === 0 ? baseY - waveAmp * 0.6 : baseY + waveAmp * 0.6;
        d += ` Q ${cpx} ${cpy} ${x} ${y}`;
      }
      d += ` L 105 ${baseY}`;
      result.push(d);
    }
    return result;
  }, []);

  return (
    <div className={cn('relative w-full overflow-hidden', className)}>
      {/* SVG wave lines */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        {paths.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            stroke={lineColor}
            strokeWidth="0.08"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: [0, 0.15, 0.3, 0.15, 0],
              pathOffset: [0, 0.5],
            }}
            transition={{
              pathLength: { duration: duration * 1.5, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.15 },
              opacity: {
                duration: duration * 2.5 + (i % 4) * 1.2,
                ease: [0.45, 0, 0.55, 1],
                repeat: Infinity,
                repeatType: 'loop',
                delay: i * 0.15,
              },
              pathOffset: {
                duration: duration * 3 + (i % 3) * 1.5,
                ease: [0.37, 0, 0.63, 1],
                repeat: Infinity,
                repeatType: 'loop',
                delay: i * 0.15,
              },
            }}
          />
        ))}
      </svg>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
