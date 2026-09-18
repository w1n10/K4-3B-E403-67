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
  hiddenTodo: boolean;
  /** label chỉ có giá trị khi covered = true. Ý chưa đạt luôn về null — server
   *  không bao giờ gửi đáp án chưa kiếm được xuống client. */
  points: { id: string; label: string | null; source: string; covered: boolean }[];
  curve: number[];
  misconceptions: { id: string; label: string; open: boolean }[];
};

const EXIT_KEY: Record<string, Key> = {
  completed: "debrief.completed",
  turn_cap: "debrief.turn_cap",
  gave_up: "debrief.gave_up",
  stuck: "debrief.stuck",
};

export default function DebriefClient({ d }: { d: DebriefData }) {
  const { t } = useT();
  const openCount = d.misconceptions.filter((m) => m.open).length;

  const coveredCount = d.points.filter((p) => p.covered).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {/* ----- Thẻ tổng quan: vòng tiến độ + kết quả + số liệu phụ ----- */}
      <section
        className="fade-up relative overflow-hidden rounded-2xl border p-6"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {/* quầng màu mềm ở góc, cắt theo thẻ nhờ overflow-hidden */}
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full"
          style={{ background: "var(--ok-bg)", filter: "blur(48px)" }}
        />

        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <ProgressRing covered={coveredCount} total={d.totalItems} />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
              {d.topicTitle}
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight">
              {t(EXIT_KEY[d.exitReason ?? ""] ?? "debrief.ended")}
            </h1>

            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <MetaChip value={String(d.turnCount)} label={t("debrief.statTurns")} />
              {/* Luôn hiện số, kể cả 0 — để hai chip cùng dạng "con số + nhãn",
                  đọc lướt không phải chuyển kiểu. */}
              <MetaChip value={String(openCount)} label={t("debrief.statMis")} warn={openCount > 0} />
            </div>
          </div>
        </div>
      </section>

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

      {/* ----- Toàn bộ ý của bài: đã giảng thì rõ, chưa giảng thì mờ ----- */}
      <Section title={t("debrief.done")}>
        <ul className="space-y-2">
          {d.points.map((i) => {
            // Hai trạng thái:
            //   covered  -> hiện rõ, đây là lời chính học viên nói ra
            //   chưa đạt -> mờ vĩnh viễn (chữ giả), chỉ để lại mã đoạn tài liệu
            return (
              <li
                key={i.id}
                className="rounded-xl border p-3 text-sm transition-colors"
                style={
                  i.covered
                    ? { borderColor: "var(--ok-border)", background: "var(--ok-bg)", color: "var(--ok-fg)" }
                    : { borderColor: "var(--border)", background: "var(--surface)" }
                }
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 font-mono text-xs" style={{ opacity: i.covered ? 1 : 0.45 }}>
                    {i.covered ? "✓" : "○"}
                  </span>

                  {i.covered ? (
                    <span className="flex-1">{i.label}</span>
                  ) : (
                    // Ý chưa giảng được: luôn mờ, không có cách nào hiện ra.
                    // Server không gửi nội dung thật xuống, nên đây là chữ giả —
                    // độ dài suy từ id để mỗi dòng dài ngắn khác nhau, nhìn tự nhiên
                    // như văn bản bị làm mờ chứ không phải một vạch đều tăm tắp.
                    <span
                      className="flex-1 select-none"
                      style={{ filter: "blur(5px)", opacity: 0.7 }}
                      aria-hidden
                    >
                      {fillerFor(i.id)}
                    </span>
                  )}
                </div>

                {!i.covered && (
                  <div
                    className="mt-1.5 pl-6 font-mono text-xs"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {t("debrief.source", { code: i.source })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Phiên kết thúc vì kẹt: không liệt kê Ý còn thiếu, chỉ mời mở lại slide. */}
        {d.hiddenTodo && (
          <div
            className="mt-4 rounded-xl border p-4"
            style={{ borderColor: "var(--warn-border)", background: "var(--warn-bg)" }}
          >
            <p className="text-sm leading-relaxed" style={{ color: "var(--warn-fg)" }}>
              {t("debrief.todoHidden")}
            </p>
            <Link
              href={`/slides/${d.topicId}`}
              target="_blank"
              rel="noreferrer"
              className="btn-press mt-3 inline-block rounded-lg px-4 py-2 text-xs font-medium no-underline"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              {t("debrief.openSlides")}
            </Link>
          </div>
        )}
      </Section>

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
          className="btn-press inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-medium no-underline"
          style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
        >
          <IconRepeat />
          {t("debrief.again")}
        </Link>
        <Link
          href="/"
          className="btn-press inline-flex items-center gap-1.5 rounded-xl border px-5 py-2.5 text-sm font-medium no-underline"
          style={{ borderColor: "var(--border-strong)", color: "var(--fg)" }}
        >
          <IconGrid />
          {t("debrief.other")}
        </Link>
      </div>

      <p className="mt-8 text-xs" style={{ color: "var(--fg-muted)" }}>
        {t("debrief.footer")}
      </p>
    </main>
  );
}

/**
 * Chữ giả để làm mờ. Server không gửi nội dung Ý chưa đạt xuống nữa, nhưng vẫn cần
 * một khối chữ để blur — nếu để trống thì dòng nào cũng y hệt nhau, nhìn ra ngay
 * là placeholder. Độ dài suy từ id nên cố định giữa các lần render.
 */
const FILLER_WORDS =
  "khái niệm cơ chế xác suất mô hình dữ liệu ngữ cảnh huấn luyện giới hạn token suy luận".split(" ");

function fillerFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const count = 7 + (h % 7); // 7..13 từ
  return Array.from({ length: count }, (_, k) => FILLER_WORDS[(h + k * 7) % FILLER_WORDS.length]).join(" ");
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

const ico = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconRepeat() {
  return (
    <svg {...ico}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg {...ico}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

/** Vòng tiến độ: bao nhiêu ý trong bài đã giảng được. */
function ProgressRing({ covered, total }: { covered: number; total: number }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  const pct = total > 0 ? covered / total : 0;

  return (
    <div className="relative h-[104px] w-[104px] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="9" stroke="var(--surface-2)" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke="var(--primary)"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center leading-none">
        <div className="text-center">
          <div className="text-xl font-bold tabular-nums">
            {covered}
            <span style={{ color: "var(--fg-muted)" }}>/{total}</span>
          </div>
          <div className="mt-1 text-[10px]" style={{ color: "var(--fg-muted)" }}>
            {Math.round(pct * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaChip({ value, label, warn }: { value: string; label: string; warn?: boolean }) {
  return (
    <span
      className="inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1.5 text-xs"
      style={
        warn
          ? { borderColor: "var(--warn-border)", background: "var(--warn-bg)", color: "var(--warn-fg)" }
          : { borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--fg-muted)" }
      }
    >
      <strong className="text-sm font-bold tabular-nums">{value}</strong>
      {label}
    </span>
  );
}
