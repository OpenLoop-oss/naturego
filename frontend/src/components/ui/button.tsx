'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'default', size = 'default', isLoading, children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-gradient-to-r from-forest to-forest-light text-cream hover:shadow-lg hover:shadow-forest/20 shadow-md shadow-forest/10':
              variant === 'default',
            'bg-terracotta text-cream hover:bg-terracotta-light shadow-sm shadow-terracotta/20':
              variant === 'destructive',
            'border-2 border-sage/30 bg-white text-forest hover:bg-sage/10 hover:border-sage':
              variant === 'outline',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'text-forest hover:bg-sage/10': variant === 'ghost',
            'text-forest underline-offset-4 hover:underline': variant === 'link',
          },
          {
            'h-10 px-5 py-2': size === 'default',
            'h-8 rounded-lg px-4 text-xs': size === 'sm',
            'h-12 rounded-xl px-8 text-base': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className,
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button };
