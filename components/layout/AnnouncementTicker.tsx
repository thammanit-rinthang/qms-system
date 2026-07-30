"use client";

import { useAnnouncementsTicker } from "@/hooks/api/use-announcements";

type Props = {
  locale: "th" | "en";
};

export default function AnnouncementTicker({ locale }: Props) {
  const { data: items = [], isSuccess } = useAnnouncementsTicker();

  if (!isSuccess || items.length === 0) return null;

  const tickerText = items.map((item) => `[${item.sourceSystem}]  ${item.title}`).join("     ·     ");

  return (
    <div className="w-full h-8 flex items-center overflow-hidden border-t border-primary/15 bg-primary/5">
      {/* Label badge */}
      <div className="shrink-0 h-full flex items-center gap-1.5 px-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest select-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
        {locale === "th" ? "ประกาศ" : "NEWS"}
      </div>

      {/* Scrolling area — full remaining width */}
      <div className="flex-1 overflow-hidden relative">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10"
          style={{ background: "linear-gradient(to left, rgb(248 250 252), transparent)" }} />
        <div className="flex whitespace-nowrap animate-ticker">
          <span className="text-[12px] font-medium text-primary/80 px-4">{tickerText}</span>
          <span className="text-[12px] font-medium text-primary/80 px-4">{tickerText}</span>
        </div>
      </div>
    </div>
  );
}
