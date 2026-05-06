import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-gradient-to-r from-forest to-forest-light text-cream shadow-sm',
        secondary: 'border-transparent bg-sage/10 text-sage',
        destructive: 'border-transparent bg-terracotta text-cream shadow-sm',
        outline: 'border border-sage/30 text-forest bg-transparent',
        success: 'border-transparent bg-olive/15 text-olive',
        warning: 'border-transparent bg-wheat/30 text-earth',
        info: 'border-transparent bg-sage/20 text-sage',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
