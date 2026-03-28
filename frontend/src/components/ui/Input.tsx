import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const inputVariants = cva(
  'flex w-full text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:opacity-50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      inputSize: {
        default: 'h-10 px-3 py-2',
        sm: 'h-8 px-2.5 py-1.5 text-xs',
        lg: 'h-12 px-4 py-3',
      },
      rounded: {
        default: 'rounded-xl',
        full: 'rounded-full',
        lg: 'rounded-lg',
        md: 'rounded-md',
      },
    },
    defaultVariants: {
      inputSize: 'default',
      rounded: 'default',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize, rounded, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ inputSize, rounded, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
