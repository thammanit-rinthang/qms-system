"use client";

import { useContext, useEffect, useState } from "react";
import type { Announcement } from "@/generated/prisma/client";
import { LocaleContext } from "@/lib/locale-context";
import { useT } from "@/lib/i18n";

const SOURCE_ACCENT: Record<string, string> = {
  QMS: "#38BDF8", IT: "#A78BFA", HR: "#F472B6", GA: "#34D399", SAFETY: "#FB923C",
};

export default function HeroBanner({ announcements }: { announcements: Announcement[] }) {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const locale = useContext(LocaleContext);
  const t = useT();

  const go = (idx: number) => {
    setFading(true);
    setTimeout(() => { setCurrent(idx); setFading(false); }, 200);
  };

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => go((current + 1) % announcements.length), 7000);
    return () => clearInterval(timer);
  }, [current, announcements.length]);

  const slide = announcements[current];
  const accent = slide ? (SOURCE_ACCENT[slide.sourceSystem] ?? "#38BDF8") : "#38BDF8";
  const textCol = slide?.textColor ?? "#FFFFFF";

  const slideStyle = slide?.bgImageUrl
    ? { backgroundImage: `url(${slide.bgImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : slide?.bgColor
      ? { background: `linear-gradient(135deg, ${slide.bgColor}ee 0%, ${slide.bgColor}99 100%)` }
      : { background: "linear-gradient(135deg,#060714 0%,#0F1059 55%,#0D2B45 100%)" };

  return (
    <div className="relative overflow-hidden rounded-2xl min-h-50 flex items-stretch" style={slideStyle}>
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.7) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle,${accent},transparent 70%)` }} />
      <div className="absolute left-0 top-8 bottom-8 w-0.75 rounded-r-full"
        style={{ background: `linear-gradient(to bottom,transparent,${accent},transparent)` }} />

      <div className={`relative z-10 flex flex-col justify-center px-8 md:px-14 py-10 flex-1 transition-all duration-200 ${fading ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}>
        {slide ? (
          <>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-xs font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-md"
                style={{ background: `${accent}1A`, color: accent, border: `1px solid ${accent}40` }}>
                {slide.sourceSystem}
              </span>
              <span className="text-xs text-white/30">
                {new Date(slide.createdAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight mb-3 max-w-2xl"
              style={{ color: textCol, textShadow: `0 0 60px ${accent}22` }}>
              {slide.title}
            </h1>
            <p className="text-sm leading-relaxed max-w-xl line-clamp-2" style={{ color: `${textCol}99` }}>{slide.content}</p>
            {slide.spWebUrl && (
              <a href={slide.spWebUrl} target="_blank" rel="noopener noreferrer"
                className="mt-5 h-11 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider w-fit px-4 rounded-xl transition-all duration-150 hover:scale-[1.04]"
                style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}40` }}>
                {t("dashboard.heroBanner.viewDetails")}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            )}
          </>
        ) : (
          <p className="text-white/30 text-sm">{t("dashboard.heroBanner.empty")}</p>
        )}
      </div>

      {announcements.length > 1 && (
        <div className="absolute bottom-4 right-6 flex items-center gap-1.5 z-20">
          {announcements.map((_, i) => (
            <button key={i} onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="flex items-center justify-center h-8 min-w-5 transition-all duration-300">
              <span className="block rounded-full transition-all duration-300"
                style={{ width: i === current ? 18 : 5, height: 5, background: i === current ? accent : "rgba(255,255,255,0.2)" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
