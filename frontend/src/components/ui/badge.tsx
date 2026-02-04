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
        backgroundColor: 'rgba(229, 57, 53, 0.15)',
        border: '1px solid rgba(229, 57, 53, 0.3)',
        color: '#E53935'
      },
      secondary: {
        backgroundColor: 'rgba(161, 161, 170, 0.15)',
        border: '1px solid rgba(161, 161, 170, 0.3)',
        color: '#A1A1AA'
      },
      destructive: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#EF4444'
      },
      outline: {
        backgroundColor: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: '#D4D4D8'
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
