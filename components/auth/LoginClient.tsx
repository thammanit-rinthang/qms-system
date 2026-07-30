"use client";

import Image from "next/image";

const YT_ID = "XKch3HFovaQ";
const YT_SRC =
  `https://www.youtube-nocookie.com/embed/${YT_ID}` +
  `?autoplay=1&mute=1&loop=1&playlist=${YT_ID}` +
  `&controls=0&showinfo=0&rel=0&iv_load_policy=3` +
  `&modestbranding=1&disablekb=1&fs=0&playsinline=1`;

interface LoginClientProps {
  authCenterLoginUrl: string;
}

export default function LoginClient({ authCenterLoginUrl }: LoginClientProps) {

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* ── YouTube background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <iframe
          src={YT_SRC}
          allow="autoplay; encrypted-media"
          className="absolute"
          style={{
            /* Cover viewport at any aspect ratio */
            top: "50%",
            left: "50%",
            width: "max(120vw, 213.33vh)",
            height: "max(120vh, 67.5vw)",
            transform: "translate(-50%, -50%)",
            border: "none",
            pointerEvents: "none",
          }}
          title="background"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* ── Dark overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* ── Main card ── */}
      <div className="relative z-10 flex flex-col items-center gap-9 px-10 py-12 w-full max-w-90 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg">
        {/* Logo */}
        <div
          className="flex flex-col items-center gap-3"
          style={{
            animation: "fade-up 0.7s 0.15s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          <Image
            src="/logo/cropped-ndc_icon_site.png"
            alt="NDC Logo"
            width={56}
            height={56}
            className="object-contain"
            priority
          />

          <div className="text-center">
            <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-black/50 mb-0.5">
              NDC Industrial
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#0f1059] drop-shadow-sm">
              QMS System
            </h1>
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-full h-px"
          style={{
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent)",
            animation: "fade-in 0.6s 0.4s ease both",
          }}
        />

        {/* Sign-in */}
        <div
          className="flex flex-col items-center gap-5 w-full"
          style={{
            animation: "fade-up 0.7s 0.3s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          <p className="text-sm text-black/50 text-center drop-shadow-sm">
            เข้าสู่ระบบด้วยบัญชีองค์กร
          </p>

          <a
            href={authCenterLoginUrl}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-[13.5px] font-medium text-black transition-all duration-300 cursor-pointer no-underline"
            style={{
              background: "rgba(0,0,0,0)",
              border: "1px solid #000000",
              backdropFilter: "blur(8px)",
              color: "black",
              textShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,0,0,0.1)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,0,0,0)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
            }}
          >
            <MicrosoftIcon />
            <span>Continue with Microsoft 365</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 21 21"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
