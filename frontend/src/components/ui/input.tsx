'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-forest mb-1.5">{label}</label>}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sage">{icon}</div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-11 w-full rounded-xl border border-sand/50 bg-white/80 px-4 py-2 text-sm text-forest ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-sage/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/30 focus-visible:border-sage disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200',
              icon && 'pl-10',
              error && 'border-terracotta focus-visible:ring-terracotta/30',
              className,
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-terracotta">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
