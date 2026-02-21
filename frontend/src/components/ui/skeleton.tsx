import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md", className)}
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
      {...props}
    />
  )
}

export { Skeleton }
