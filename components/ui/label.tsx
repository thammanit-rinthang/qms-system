import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-800"
)

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  requiredIndicator?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, requiredIndicator, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(labelVariants(), className)}
      {...props}
    >
      {children}
      {requiredIndicator && <span className="text-rose-600 ml-1">*</span>}
    </label>
  )
)
Label.displayName = "Label"

export { Label }
