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
  const { colors } = useTheme();
  return {
    default: {
      background: colors.card,
      border: `1px solid ${colors.border}`,
    },
    glass: {
      background: `${colors.card}cc`,
      border: `1px solid ${colors.border}`,
    },
    gradient: {
      background: `linear-gradient(168deg, ${colors.card} 0%, ${colors.bg} 100%)`,
      border: `1px solid ${colors.border}`,
    },
  };
}

export function Card({ children, className, variant = 'default', style, ...props }: CardProps) {
  const variantStyles = useVariantStyles();
  return (
    <div
      className={cn(
        'rounded-[20px] p-6 transition-all duration-300',
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
  return (
    <h3 className={cn('text-lg font-semibold', className)} style={{ color: '#F0EFE2' }} {...props}>
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
