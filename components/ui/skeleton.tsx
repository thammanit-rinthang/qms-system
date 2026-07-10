import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Animated skeleton placeholder. Uses the `.skeleton` utility defined in globals.css.
 *
 * @example
 * <Skeleton className="h-4 w-48 rounded-md" />
 * <Skeleton className="h-10 w-full rounded-xl" />
 */
export function Skeleton({ className }: Props) {
  return <div className={cn("skeleton", className)} />;
}
