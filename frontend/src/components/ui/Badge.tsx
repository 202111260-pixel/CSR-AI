import { type ReactNode } from 'react';
import { cn } from '../../utils/cn.ts';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-gray-700/50 text-gray-300 border-gray-600/50',
  success: 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40',
  warning: 'bg-amber-900/40 text-amber-400 border-amber-700/40',
  danger: 'bg-red-900/40 text-red-400 border-red-700/40',
  info: 'bg-sky-900/40 text-sky-400 border-sky-700/40',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
