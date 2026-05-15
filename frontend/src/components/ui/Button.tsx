import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../utils/cn';

// ─────────────────────────────────────────────────────────────────────────────
// Gold Glass Morphism Button — ai-smart-preview inspired
// Variants: solid | outline | ghost | subtle | link
// Schemes:  accent | danger | success | warning | neutral
// Sizes:    xs | sm | md | lg | xl | icon | icon-sm | icon-lg
// ─────────────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'subtle' | 'link';
export type ButtonScheme  = 'accent' | 'danger' | 'success' | 'warning' | 'neutral';
export type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg';

// Scheme → CSS color tokens
const SCHEMES: Record<ButtonScheme, {
  solid:   { bg: string; bgHover: string; text: string; shadow: string };
  outline: { border: string; text: string; bgHover: string };
  ghost:   { text: string; bgHover: string };
  subtle:  { bg: string; text: string; bgHover: string };
}> = {
  accent: {
    solid:   { bg: 'linear-gradient(135deg, #C8A44E, #DFC170)', bgHover: 'linear-gradient(135deg, #DFC170, #E8CF85)', text: '#000000', shadow: 'rgba(200,164,78,0.25)' },
    outline: { border: '#1a1a1a', text: 'var(--btn-accent)',    bgHover: 'rgba(200,164,78,0.08)' },
    ghost:   { text: 'var(--btn-accent)',   bgHover: 'rgba(200,164,78,0.08)' },
    subtle:  { bg: 'var(--btn-accent-subtle)', text: 'var(--btn-accent)', bgHover: 'var(--btn-accent-subtle-hover)' },
  },
  danger: {
    solid:   { bg: '#dc2626', bgHover: '#b91c1c', text: '#fff',       shadow: 'rgba(220,38,38,0.25)' },
    outline: { border: '#dc2626', text: '#dc2626',                    bgHover: 'rgba(220,38,38,0.08)' },
    ghost:   { text: '#dc2626',                                        bgHover: 'rgba(220,38,38,0.08)' },
    subtle:  { bg: 'rgba(220,38,38,0.1)', text: '#dc2626',            bgHover: 'rgba(220,38,38,0.15)' },
  },
  success: {
    solid:   { bg: '#059669', bgHover: '#047857', text: '#fff',       shadow: 'rgba(5,150,105,0.25)' },
    outline: { border: '#059669', text: '#059669',                    bgHover: 'rgba(5,150,105,0.08)' },
    ghost:   { text: '#059669',                                        bgHover: 'rgba(5,150,105,0.08)' },
    subtle:  { bg: 'rgba(5,150,105,0.1)', text: '#059669',            bgHover: 'rgba(5,150,105,0.15)' },
  },
  warning: {
    solid:   { bg: '#d97706', bgHover: '#b45309', text: '#fff',       shadow: 'rgba(217,119,6,0.25)' },
    outline: { border: '#d97706', text: '#d97706',                    bgHover: 'rgba(217,119,6,0.08)' },
    ghost:   { text: '#d97706',                                        bgHover: 'rgba(217,119,6,0.08)' },
    subtle:  { bg: 'rgba(217,119,6,0.1)', text: '#d97706',            bgHover: 'rgba(217,119,6,0.15)' },
  },
  neutral: {
    solid:   { bg: 'var(--btn-neutral)',   bgHover: 'var(--btn-neutral-hover)',   text: 'var(--btn-neutral-fg)',   shadow: 'var(--btn-neutral-shadow)' },
    outline: { border: 'var(--btn-border)', text: 'var(--btn-text)',              bgHover: 'var(--btn-neutral-subtle)' },
    ghost:   { text: 'var(--btn-text)',                                            bgHover: 'var(--btn-neutral-subtle)' },
    subtle:  { bg: 'var(--btn-neutral-subtle)', text: 'var(--btn-text)',          bgHover: 'var(--btn-neutral-subtle-hover)' },
  },
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  'xs':      'h-7 px-2.5 text-[11px] gap-1 rounded-lg',
  'sm':      'h-8 px-3 text-xs gap-1.5 rounded-lg',
  'md':      'h-9 px-4 text-sm gap-2 rounded-xl',
  'lg':      'h-10 px-5 text-sm gap-2 rounded-xl',
  'xl':      'h-12 px-7 text-base gap-2.5 rounded-xl font-semibold',
  'icon':    'h-9 w-9 rounded-xl',
  'icon-sm': 'h-8 w-8 rounded-lg',
  'icon-lg': 'h-10 w-10 rounded-xl',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  scheme?:   ButtonScheme;
  size?:     ButtonSize;
  loading?:  boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?:  boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant  = 'solid',
      scheme   = 'accent',
      size     = 'md',
      loading  = false,
      leftIcon,
      rightIcon,
      asChild  = false,
      disabled,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const tokens = SCHEMES[scheme];
    const isDisabled = disabled || loading;

    // Build inline style based on variant
    let variantStyle: React.CSSProperties = {};
    if (variant === 'solid') {
      variantStyle = {
        background: tokens.solid.bg,
        color: tokens.solid.text,
        boxShadow: `0 0 24px ${tokens.solid.shadow}, inset 0 1px 0 rgba(255,255,255,0.12)`,
      };
    } else if (variant === 'outline') {
      variantStyle = {
        background: 'transparent',
        color: tokens.outline.text,
        border: `1px solid ${tokens.outline.border}`,
      };
    } else if (variant === 'ghost') {
      variantStyle = {
        background: 'transparent',
        color: tokens.ghost.text,
      };
    } else if (variant === 'subtle') {
      variantStyle = {
        background: tokens.subtle.bg,
        color: tokens.subtle.text,
      };
    } else if (variant === 'link') {
      variantStyle = {
        background: 'transparent',
        color: tokens.outline.text,
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
        padding: 0,
        height: 'auto',
      };
    }

    return (
      <Comp
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base
          'group relative inline-flex items-center justify-center font-medium whitespace-nowrap overflow-hidden',
          'transition-all duration-300 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A44E]/50 focus-visible:ring-offset-2',
          'active:scale-[0.98]',
          'disabled:pointer-events-none disabled:opacity-40',
          '[&_svg]:pointer-events-none [&_svg]:shrink-0',
          'select-none cursor-pointer',
          SIZE_CLASSES[size],
          className,
        )}
        style={{ ...variantStyle, ...style }}
        onMouseEnter={e => {
          if (isDisabled) return;
          const el = e.currentTarget as HTMLElement;
          if (variant === 'solid') {
            el.style.background = tokens.solid.bgHover;
            el.style.boxShadow = `0 0 40px ${tokens.solid.shadow}, inset 0 1px 0 rgba(255,255,255,0.12)`;
            el.style.transform = 'scale(1.02)';
          } else if (variant === 'outline') {
            el.style.background = tokens.outline.bgHover;
            el.style.borderColor = 'rgba(200,164,78,0.4)';
          } else if (variant === 'ghost') {
            el.style.background = tokens.ghost.bgHover;
          } else if (variant === 'subtle') {
            el.style.background = tokens.subtle.bgHover;
          }
          props.onMouseEnter?.(e);
        }}
        onMouseLeave={e => {
          if (isDisabled) return;
          const el = e.currentTarget as HTMLElement;
          if (variant === 'solid') {
            el.style.background = tokens.solid.bg;
            el.style.boxShadow = `0 0 24px ${tokens.solid.shadow}, inset 0 1px 0 rgba(255,255,255,0.12)`;
            el.style.transform = 'scale(1)';
          } else if (variant === 'outline') {
            el.style.background = 'transparent';
            el.style.borderColor = tokens.outline.border;
          } else if (variant === 'ghost') {
            el.style.background = 'transparent';
          } else if (variant === 'subtle') {
            el.style.background = tokens.subtle.bg;
          }
          props.onMouseLeave?.(e);
        }}
        {...props}
      >
        {/* Shine sweep effect for solid accent buttons */}
        {variant === 'solid' && scheme === 'accent' && (
          <span className="pointer-events-none absolute inset-0">
            <span className="absolute -left-full top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[400%]" />
          </span>
        )}
        {loading && (
          <svg
            className="animate-spin"
            style={{ width: size === 'xs' || size === 'sm' ? 12 : 14, height: size === 'xs' || size === 'sm' ? 12 : 14 }}
            viewBox="0 0 24 24" fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {!loading && leftIcon}
        {children}
        {rightIcon}
      </Comp>
    );
  }
);

Button.displayName = 'Button';
export { Button };
