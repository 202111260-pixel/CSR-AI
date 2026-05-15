import React from 'react';
import { cn } from '../../utils/cn.ts';
import { useTheme } from '../../hooks/useTheme';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient';
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  default: '',
  glass: 'backdrop-blur-xl',
  gradient: '',
};

function useVariantStyles() {
  const { colors, isDark } = useTheme();
  return {
    default: {
      background: isDark ? 'rgba(10,10,10, 0.60)' : colors.card,
      border: `1px solid ${isDark ? '#1a1a1a' : colors.border}`,
      backdropFilter: isDark ? 'blur(16px)' : undefined,
      WebkitBackdropFilter: isDark ? 'blur(16px)' : undefined,
    },
    glass: {
      background: isDark ? 'rgba(10,10,10, 0.50)' : `${colors.card}cc`,
      border: `1px solid ${isDark ? 'rgba(26,26,26, 0.60)' : colors.border}`,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    },
    gradient: {
      background: isDark
        ? `linear-gradient(168deg, rgba(10,10,10, 0.80) 0%, rgba(18,18,18, 0.60) 100%)`
        : `linear-gradient(168deg, ${colors.card} 0%, ${colors.bg} 100%)`,
      border: `1px solid ${isDark ? '#1a1a1a' : colors.border}`,
      backdropFilter: isDark ? 'blur(12px)' : undefined,
      WebkitBackdropFilter: isDark ? 'blur(12px)' : undefined,
    },
  } as Record<string, React.CSSProperties>;
}

export function Card({ children, className, variant = 'default', style, ...props }: CardProps) {
  const variantStyles = useVariantStyles();
  return (
    <div
      className={cn(
        'rounded-2xl p-6 transition-all duration-300',
        'hover:-translate-y-1 hover:border-[#C8A44E]/30',
        variantClasses[variant],
        className
      )}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { colors } = useTheme();
  return (
    <h3 className={cn('text-lg font-semibold', className)} style={{ color: colors.textHi }} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
