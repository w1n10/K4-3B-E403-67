"use client";

// Màn tổng kết sau phiên dạy.
// Đây là chỗ DUY NHẤT được hiện coverage — trong lúc học thì không, vì luật an toàn D3
// cấm tạo cảm giác bị chấm điểm ngầm. Ở đây phiên đã xong nên hiện là đúng lúc.

import Link from "next/link";
import { useT, type Key } from "@/lib/i18n";

export type DebriefData = {
  topicId: string;
  topicTitle: string;
  exitReason: string | null;
  turnCount: number;
  totalItems: number;
  done: { id: string; label: string }[];
  todo: { id: string; label: string; source: string }[];
  curve: number[];
  misconceptions: { id: string; label: string; open: boolean }[];
};

const EXIT_KEY: Record<string, Key> = {
  completed: "debrief.completed",
  turn_cap: "debrief.turn_cap",
  gave_up: "debrief.gave_up",
};

export default function DebriefClient({ d }: { d: DebriefData }) {
  const { t } = useT();
  const openCount = d.misconceptions.filter((m) => m.open).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
        {d.topicTitle}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">
        {t(EXIT_KEY[d.exitReason ?? ""] ?? "debrief.ended")}
      </h1>

      {/* ----- Tổng quan ----- */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat value={`${d.done.length}/${d.totalItems}`} label={t("debrief.statCovered")} />
        <Stat value={String(d.turnCount)} label={t("debrief.statTurns")} />
        <Stat value={openCount === 0 ? t("debrief.none") : String(openCount)} label={t("debrief.statMis")} />
      </div>

      {/* ----- Đường học: chỉ số về HỌC mà track D bắt buộc ----- */}
      {d.curve.length > 1 && (
        <Section title={t("debrief.curve")}>
          <div className="flex items-end gap-1.5">
            {d.curve.map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, (n / d.totalItems) * 72)}px`,
                    background: "var(--ok-border)",
                  }}
                />
                <span className="text-[10px]" style={{ color: "var(--fg-muted)" }}>
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ----- Ý đã giảng được ----- */}
      <Section title={t("debrief.done")}>
        <ul className="space-y-2">
          {d.done.map((i) => (
            <li
              key={i.id}
              className="rounded-xl border p-3 text-sm"
              style={{ borderColor: "var(--ok-border)", background: "var(--ok-bg)", color: "var(--ok-fg)" }}
            >
              <span className="mr-2 font-mono text-xs">✓</span>
              {i.label}
            </li>
          ))}
          {d.done.length === 0 && (
            <li className="text-sm" style={{ color: "var(--fg-muted)" }}>
              {t("debrief.doneEmpty")}
            </li>
          )}
        </ul>
      </Section>

      {/* ----- Chỗ cần ôn lại ----- */}
      {d.todo.length > 0 && (
        <Section title={t("debrief.todo")}>
          <ul className="space-y-2">
            {d.todo.map((i) => (
              <li
                key={i.id}
                className="rounded-xl border p-3 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div>{i.label}</div>
                <div className="mt-1 font-mono text-xs" style={{ color: "var(--fg-muted)" }}>
                  {t("debrief.source", { code: i.source })}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* ----- Hiểu lầm: luật D3 cấm để học viên rời đi với kiến thức sai ----- */}
      {d.misconceptions.length > 0 && (
        <Section title={t("debrief.mis")}>
          <ul className="space-y-2">
            {d.misconceptions.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border p-3 text-sm"
                style={
                  m.open
                    ? { borderColor: "var(--warn-border)", background: "var(--warn-bg)", color: "var(--warn-fg)" }
                    : { borderColor: "var(--border)", background: "var(--surface)", color: "var(--fg-muted)" }
                }
              >
                {t(m.open ? "debrief.misOpen" : "debrief.misFixed")}
                {m.label}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={`/teach/${d.topicId}`}
          className="rounded-xl px-5 py-2.5 text-sm font-medium no-underline"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
        >
          {t("debrief.again")}
        </Link>
        <Link
          href="/"
          className="rounded-xl border px-5 py-2.5 text-sm font-medium no-underline"
          style={{ borderColor: "var(--border-strong)", color: "var(--fg)" }}
        >
          {t("debrief.other")}
        </Link>
      </div>

      <p className="mt-8 text-xs" style={{ color: "var(--fg-muted)" }}>
        {t("debrief.footer")}
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xs font-semibold tracking-wider" style={{ color: "var(--fg-muted)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs" style={{ color: "var(--fg-muted)" }}>
        {label}
      </div>
    </div>
  );
}
