import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  delay?: number;
}

export function GlassCard({
  children,
  className,
  hover = true,
  glow = false,
  delay = 0,
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      whileHover={hover ? { y: -4, transition: { duration: 0.25 } } : undefined}
      className={cn(
        'relative rounded-2xl border border-[#1a1a1a]/60 bg-[#0a0a0a]/60 p-6 backdrop-blur-xl transition-colors duration-300',
        hover && 'cursor-pointer hover:border-[#C8A44E]/30 hover:bg-[#121212]/70',
        className,
      )}
    >
      {glow && (
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-[#C8A44E]/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}
      {children}
    </motion.div>
  );
}
