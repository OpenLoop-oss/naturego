'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-forest mb-1.5">{label}</label>}
        <textarea
          className={cn(
            'flex min-h-[120px] w-full rounded-xl border border-sand/50 bg-white/80 px-4 py-3 text-sm text-forest ring-offset-background placeholder:text-sage/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/30 focus-visible:border-sage disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 resize-none',
            error && 'border-terracotta focus-visible:ring-terracotta/30',
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-terracotta">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
