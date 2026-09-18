"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function HomeClient({ topics }: { topics: { topic_id: string; title: string }[] }) {
  const { t } = useT();
  const { theme } = useTheme();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <img
        src={theme === "dark" ? "/brand/vlearn-banner-dark.svg" : "/brand/vlearn-banner-horizontal.svg"}
        alt="VLearn — Teachable Learner"
        className="mb-10 w-full rounded-2xl"
      />

      <h1 className="text-2xl font-semibold">{t("home.title")}</h1>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
        {t("home.intro")}
      </p>

      <h2 className="mt-10 text-xs font-semibold tracking-wider" style={{ color: "var(--fg-muted)" }}>
        {t("home.sectionTopics")}
      </h2>

      <div className="mt-3 space-y-3">
        {topics.map((topic) => (
          <Link
            key={topic.topic_id}
            href={`/teach/${topic.topic_id}`}
            className="block rounded-xl border p-4 no-underline transition-colors"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--fg)" }}
          >
            <div className="font-medium">{topic.title}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--primary)" }}>
              {t("home.start")}
            </div>
          </Link>
        ))}
        {topics.length === 0 && (
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            {t("home.empty")}
          </p>
        )}
      </div>

      <p className="mt-10 text-xs" style={{ color: "var(--fg-muted)" }}>
        {t("teach.consent")}
      </p>
    </main>
  );
}
