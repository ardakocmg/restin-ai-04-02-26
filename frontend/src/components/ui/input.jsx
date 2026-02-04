import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        backgroundColor: '#27272A',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#F5F5F7',
        ...props.style
      }}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
