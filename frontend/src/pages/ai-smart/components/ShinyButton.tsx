import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface ShinyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'gold' | 'outline';
  size?: 'default' | 'lg';
  href?: string;
}

export function ShinyButton({
  children,
  variant = 'gold',
  size = 'default',
  className,
  href,
  ...props
}: ShinyButtonProps) {
  const isGold = variant === 'gold';

  const base = cn(
    'group relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl font-medium transition-all duration-300',
    size === 'lg' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm',
    isGold
      ? 'bg-gradient-to-r from-[#C8A44E] to-[#DFC170] text-[#000000] shadow-[0_0_24px_rgba(200,164,78,0.25)] hover:shadow-[0_0_40px_rgba(200,164,78,0.4)]'
      : 'border border-[#1E2D48] bg-transparent text-[#C0CDD8] hover:border-[#C8A44E]/40 hover:text-[#DFC170]',
    className,
  );

  const content = (
    <>
      {/* Shine sweep */}
      <span className="pointer-events-none absolute inset-0">
        <span
          className={cn(
            'absolute -left-full top-0 h-full w-1/2 -skew-x-12 transition-transform duration-700 group-hover:translate-x-[400%]',
            isGold
              ? 'bg-gradient-to-r from-transparent via-white/30 to-transparent'
              : 'bg-gradient-to-r from-transparent via-[#C8A44E]/10 to-transparent',
          )}
        />
      </span>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </>
  );

  if (href) {
    return (
      <motion.a
        href={href}
        className={base}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      className={base}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      {...(props as object)}
    >
      {content}
    </motion.button>
  );
}
