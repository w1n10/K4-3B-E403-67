"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import type { TopicSummary } from "@/lib/content";

export default function HomeClient({ topics }: { topics: TopicSummary[] }) {
  const { t } = useT();
  const { theme } = useTheme();

  return (
    <div className="relative overflow-hidden">
      {/* Mảng màu trang trí lấp hai bên — chỉ nền, không bắt chuột */}
      <div
        className="blob"
        style={{ width: 460, height: 460, top: -140, left: -180, background: "var(--ok-border)" }}
      />
      <div
        className="blob"
        style={{ width: 380, height: 380, top: 220, right: -160, background: "var(--warn-bg)" }}
      />
      <div
        className="blob"
        style={{ width: 340, height: 340, bottom: -120, left: "35%", background: "var(--border-strong)" }}
      />

      <main className="relative mx-auto max-w-4xl px-6 py-10" style={{ zIndex: 1 }}>
        <img
          src={theme === "dark" ? "/brand/vlearn-banner-dark.svg" : "/brand/vlearn-banner-horizontal.svg"}
          alt="VLearn — Teachable Learner"
          className="fade-up w-full rounded-2xl"
        />

        <header className="fade-up mt-10 max-w-2xl" style={{ animationDelay: "60ms" }}>
          <h1 className="text-3xl font-semibold">{t("home.title")}</h1>
          <p className="mt-3 leading-relaxed" style={{ color: "var(--fg-muted)" }}>
            {t("home.intro")}
          </p>
        </header>

        {/* ---------- Chọn chủ đề ---------- */}
        <h2
          className="fade-up mt-12 text-xs font-semibold tracking-[0.18em]"
          style={{ color: "var(--fg-muted)", animationDelay: "120ms" }}
        >
          {t("home.sectionTopics")}
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {topics.map((topic, i) => (
            <Link
              key={topic.topic_id}
              href={`/teach/${topic.topic_id}`}
              className="topic-card fade-up flex flex-col rounded-2xl border p-5 no-underline"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--fg)",
                animationDelay: `${160 + i * 70}ms`,
              }}
            >
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: "var(--border-strong)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* flex-1: tiêu đề dài ngắn khác nhau vẫn đẩy phần dưới xuống sát đáy,
                  nên chip và nút của mọi thẻ thẳng hàng nhau. */}
              <span className="mt-2 flex-1 text-base font-semibold leading-snug">{topic.title}</span>

              <span className="mt-3 flex flex-wrap gap-1.5">
                <Chip>{t("home.cardItems", { n: topic.itemCount })}</Chip>
              </span>

              <span
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: "var(--primary)" }}
              >
                {t("home.start").replace("→", "").trim()}
                <span className="arrow">→</span>
              </span>
            </Link>
          ))}

          {topics.length === 0 && (
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
              {t("home.empty")}
            </p>
          )}
        </div>

        {/* ---------- Diễn ra thế nào ---------- */}
        <h2
          className="fade-up mt-14 text-xs font-semibold tracking-[0.18em]"
          style={{ color: "var(--fg-muted)", animationDelay: "320ms" }}
        >
          {t("home.sectionHow")}
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { icon: <IconSpeak />, title: t("home.step1Title"), body: t("home.step1Body") },
            { icon: <IconAsk />, title: t("home.step2Title"), body: t("home.step2Body") },
            { icon: <IconCheck />, title: t("home.step3Title"), body: t("home.step3Body") },
          ].map((step, i) => (
            <div
              key={step.title}
              className="fade-up rounded-2xl border p-5"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                animationDelay: `${360 + i * 70}ms`,
              }}
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ background: "var(--ok-bg)", color: "var(--primary)" }}
              >
                {step.icon}
              </span>
              <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs" style={{ color: "var(--fg-muted)" }}>
          {t("teach.consent")}
        </p>
      </main>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: "var(--surface-2)", color: "var(--fg-muted)" }}
    >
      {children}
    </span>
  );
}

const svg = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconSpeak() {
  return (
    <svg {...svg}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconAsk() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg {...svg}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
