import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export default function EmptyState({ title, description, ctaLabel, ctaHref }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      {/* Illustration container */}
      <div className="relative w-24 h-24 mb-2">
        <div className="absolute inset-0 bg-[#0F1059]/10 rounded-full animate-float"></div>
        <div className="absolute inset-2 bg-gradient-to-br from-[#0F1059] to-[#1D6A8A] rounded-full opacity-20 blur-md"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-[#0F1059]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      </div>

      {/* Text */}
      <div className="flex flex-col gap-1">
        <p className="text-sm md:text-base font-semibold text-primary">{title}</p>
        {description && (
          <p className="text-xs md:text-sm text-neutral">{description}</p>
        )}
      </div>

      {/* CTA */}
      {ctaLabel && ctaHref && (
        <Button asChild size="sm" className="mt-2">
          <Link href={ctaHref}>
            {ctaLabel}
          </Link>
        </Button>
      )}
    </div>
  );
}
