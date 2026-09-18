"use client";

// Thanh nav bám bố cục VLearn: thương hiệu bên trái, toggle EN/VI + sáng/tối bên phải.

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function TopNav() {
  const { lang, setLang, t } = useT();
  const { theme, toggle } = useTheme();

  return (
    <header
      className="sticky top-0 z-10 border-b backdrop-blur"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          {/* Emblem đổi theo theme: bản pastel cho nền sáng, bản espresso cho nền tối */}
          <img
            src={theme === "dark" ? "/brand/vlearn-avatar-dark.svg" : "/brand/vlearn-avatar-circle.svg"}
            alt=""
            width={34}
            height={34}
            className="rounded-lg"
          />
          <span className="flex flex-col leading-none">
            <span className="text-base font-extrabold tracking-tight" style={{ color: "var(--fg)" }}>
              VLearn<span style={{ color: "#FF5264" }}>.</span>
            </span>
            <span
              className="mt-0.5 text-[9px] font-bold tracking-[0.18em]"
              style={{ color: "var(--fg-muted)" }}
            >
              {t("nav.brand")}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* EN / VI — y hệt VLearn */}
          <div
            className="flex overflow-hidden rounded-lg border text-xs font-medium"
            style={{ borderColor: "var(--border-strong)" }}
          >
            {(["en", "vi"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className="px-2.5 py-1.5 uppercase transition-colors"
                style={
                  lang === l
                    ? { background: "var(--primary)", color: "var(--primary-fg)" }
                    : { color: "var(--fg-muted)" }
                }
              >
                {l}
              </button>
            ))}
          </div>

          <button
            onClick={toggle}
            aria-label={t("nav.theme")}
            title={t("nav.theme")}
            className="grid h-8 w-8 place-items-center rounded-lg border transition-colors"
            style={{ borderColor: "var(--border-strong)", color: "var(--fg-muted)" }}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
