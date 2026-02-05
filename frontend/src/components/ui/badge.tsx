import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "",
        secondary: "",
        destructive: "",
        outline: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    const styles: Record<string, React.CSSProperties> = {
      default: {
        backgroundColor: 'var(--brand-accent-soft)',
        border: '1px solid var(--brand-accent-glow)',
        color: 'var(--brand-accent)'
      },
      secondary: {
        backgroundColor: 'var(--secondary)',
        border: '1px solid var(--border)',
        color: 'var(--secondary-foreground)'
      },
      destructive: {
        backgroundColor: 'var(--destructive)',
        border: '1px solid var(--destructive)',
        color: 'var(--destructive-foreground)'
      },
      outline: {
        backgroundColor: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--foreground)'
      }
    };

    const variantKey = variant || "default";

    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        style={styles[variantKey] || styles.default}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
