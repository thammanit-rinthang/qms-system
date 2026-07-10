import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm",
          "ring-offset-white placeholder:text-slate-400",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:border-[#0F1059] focus-visible:bg-white",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none transition-colors",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
