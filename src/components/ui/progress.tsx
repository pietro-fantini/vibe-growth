import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-transparent border border-border",
      className
    )}
    {...props}
  >
    {/* Base track so the bar is visible even at 0% */}
    <div className="absolute inset-0 rounded-full bg-secondary/60" />
    {typeof value === "number" ? (
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'var(--vg-progress-gradient, linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--success)) 100%))',
          WebkitMask: `linear-gradient(90deg, #000 0% ${Math.max(0, Math.min(100, value || 0))}%, transparent ${Math.max(0, Math.min(100, value || 0))}% 100%)`,
          mask: `linear-gradient(90deg, #000 0% ${Math.max(0, Math.min(100, value || 0))}%, transparent ${Math.max(0, Math.min(100, value || 0))}% 100%)`,
          transition: 'mask-position 150ms ease, -webkit-mask-position 150ms ease',
        }}
      />
    ) : (
      <Skeleton className="absolute inset-0 h-full w-full" />
    )}
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
