"use client";

// Khung xem slide: nhúng thẳng PDF của bài giảng, mở đúng trang cần ôn.
import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function SlideViewer({
  topicId,
  title,
  deck,
  pages,
  startPage,
  available,
}: {
  topicId: string;
  title: string;
  deck: string;
  pages: number;
  startPage: number;
  available: boolean;
}) {
  const { t } = useT();
  const [page, setPage] = useState(startPage);

  const pdfUrl = `/api/slides/${encodeURIComponent(deck)}`;
  const hasPages = available && pages > 1;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>
            {t("slides.subtitle")}
          </p>
        </div>
        {/* Về lại phiên dạy — phiên vẫn còn nguyên vì slide mở ở tab riêng. */}
        <Link
          href={`/teach/${topicId}`}
          className="btn-press inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs no-underline"
          style={{ borderColor: "var(--border-strong)", color: "var(--fg-muted)" }}
        >
          <IconChevron dir="left" />
          {t("slides.back")}
        </Link>
      </header>

      {!available ? (
        <p
          className="rounded-xl border p-4 text-sm"
          style={{ borderColor: "var(--warn-border)", background: "var(--warn-bg)", color: "var(--warn-fg)" }}
        >
          {t("slides.missing")}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPages || page <= 1}
              className="btn-press inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
              style={{ borderColor: "var(--border-strong)", color: "var(--fg)" }}
            >
              <IconChevron dir="left" />
              {t("slides.prev")}
            </button>

            <span className="text-xs font-medium tabular-nums" style={{ color: "var(--fg)" }}>
              {t("slides.page", { n: page, total: pages })}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={!hasPages || page >= pages}
              className="btn-press inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
              style={{ borderColor: "var(--border-strong)", color: "var(--fg)" }}
            >
              {t("slides.next")}
              <IconChevron dir="right" />
            </button>
          </div>

          {/* key={page}: đổi trang phải nhúng lại PDF, vì hash #page không tự nhảy.
              toolbar=0: ẩn thanh công cụ PDF của trình duyệt, trong đó có nút Tải và In.
              Đây là tham số cho trình xem PDF, KHÔNG phải cơ chế bảo vệ —
              ai gõ thẳng /api/slides/<file> vẫn tải được. Xem ghi chú ở route. */}
          <iframe
            key={page}
            src={`${pdfUrl}#page=${page}&view=FitH&toolbar=0&navpanes=0&statusbar=0`}
            title={title}
            className="h-[70vh] w-full rounded-xl border md:h-[calc(100vh-13rem)]"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
        </>
      )}
    </main>
  );
}

function IconChevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}
