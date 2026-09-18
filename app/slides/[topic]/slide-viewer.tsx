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
          className="shrink-0 rounded-lg border px-3 py-1.5 text-xs no-underline"
          style={{ borderColor: "var(--border-strong)", color: "var(--fg-muted)" }}
        >
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
              className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
              style={{ borderColor: "var(--border-strong)", color: "var(--fg)" }}
            >
              {t("slides.prev")}
            </button>

            <span className="text-xs font-medium tabular-nums" style={{ color: "var(--fg)" }}>
              {t("slides.page", { n: page, total: pages })}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={!hasPages || page >= pages}
              className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
              style={{ borderColor: "var(--border-strong)", color: "var(--fg)" }}
            >
              {t("slides.next")}
            </button>

            <a
              href={`${pdfUrl}#page=${page}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium no-underline"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              {t("slides.openNew")}
            </a>
          </div>

          {/* key={page}: đổi trang phải nhúng lại PDF, vì hash #page không tự nhảy. */}
          <iframe
            key={page}
            src={`${pdfUrl}#page=${page}&view=FitH`}
            title={title}
            className="h-[70vh] w-full rounded-xl border md:h-[calc(100vh-13rem)]"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          />
        </>
      )}
    </main>
  );
}
