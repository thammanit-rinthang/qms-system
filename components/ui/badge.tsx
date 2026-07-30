import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F1059] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#0F1059] text-white hover:bg-[#161875]",
        secondary:
          "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200",
        destructive:
          "border-transparent bg-rose-50 text-rose-600 border-rose-200",
        outline: "text-slate-800 border-slate-200",
        success: "border-transparent bg-emerald-50 text-emerald-600 border-emerald-200",
        warning: "border-transparent bg-amber-50 text-amber-600 border-amber-200",
        info: "border-transparent bg-sky-50 text-sky-600 border-sky-200",
        draft: "border-transparent bg-slate-50 text-slate-500 border-slate-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
