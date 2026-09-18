"use client";

// Khung chat. Hai luật về UI không được phá:
//  1. KHÔNG hiện coverage/% trong lúc đang học (luật an toàn D3: không chấm điểm ngầm).
//  2. Mục checklist CHƯA đạt thì KHÔNG hiện label — hiện ra là học viên đọc được đáp án.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import type { PersonaStyleId } from "@/lib/types";

type Item = { id: string; label: string };
type Msg = { role: "student" | "agent"; text: string };

export default function TeachClient({
  topicId,
  title,
  items,
  initialQuestion,
  personaStyle = "ban_minh",
}: {
  topicId: string;
  title: string;
  items: Item[];
  initialQuestion?: string;
  personaStyle?: PersonaStyleId;
}) {
  const { t } = useT();
  const { theme } = useTheme();
  const avatar = theme === "dark" ? "/brand/vlearn-avatar-dark.svg" : "/brand/vlearn-avatar-circle.svg";

  // Mã tester lấy từ URL: /teach/<topic>?tester=U03
  // Nhóm gửi cho mỗi bạn một link riêng -> không ai phải tự gõ, không ai quên.
  // Tính trong useEffect chứ KHÔNG phải lúc render: window và Math.random()
  // cho kết quả khác nhau giữa server và client -> hydration mismatch.
  const [testerCode, setTesterCode] = useState("");
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tester");
    setTesterCode(fromUrl?.trim() || `U-${Math.random().toString(36).slice(2, 6)}`);
  }, []);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [turns, setTurns] = useState<Msg[]>([]);
  const [coveredIds, setCoveredIds] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lời thoại của agent LUÔN tiếng Việt, không theo toggle EN/VI — toggle chỉ đổi
  // nhãn nút và tiêu đề. Giữ giống hệt các câu do Stage 0/Stage 2 sinh ra ở backend.
  //
  // Câu mở đầu ưu tiên initialQuestion do server soạn (đã khớp persona được bốc),
  // không có thì dùng câu chào mặc định theo tên chủ đề.
  const messages = useMemo<Msg[]>(
    () => [
      {
        role: "agent",
        text:
          initialQuestion ??
          `Chào bạn! Mình nghe nói tới "${title}" mà đọc mãi vẫn không hiểu gì cả. Bạn giảng lại cho mình được không?`,
      },
      ...turns,
    ],
    [turns, title, initialQuestion]
  );

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading || done) return;

    setInput("");
    setError(null);
    setTurns((m) => [...m, { role: "student", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          text,
          topicId,
          testerCode: testerCode || "U00", // effect chưa kịp chạy thì vẫn có mã mặc định
          personaStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);

      setSessionId(data.sessionId);
      setCoveredIds(data.coveredIds ?? []);
      if (data.reply) setTurns((m) => [...m, { role: "agent", text: data.reply }]);
      if (data.done) setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  /** Học viên chủ động dừng -> exit_reason = gave_up.
   *  Số này cho biết bao nhiêu người bỏ cuộc và bỏ ở lượt thứ mấy. */
  async function giveUp() {
    // Chặn bấm lặp: done rồi thì thôi, đang gửi cũng thôi.
    if (!sessionId || loading || done) return;
    setLoading(true);
    try {
      const res = await fetch("/api/checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text: "", topicId, giveUp: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `Lỗi ${res.status}`);
      setDone(true);
      setConfirmQuit(false); // đóng popover, không để bấm thêm lần nữa
    } catch (e) {
      setError((e as Error).message);
      setConfirmQuit(false);
    } finally {
      setLoading(false);
    }
  }

  const covered = new Set(coveredIds);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 md:flex-row">
      {/* ----- Cột chat ----- */}
      {/* Chiều cao CHẶN (h-, không phải min-h-) thì khung chat mới cuộn bên trong
          thay vì đẩy cả trang dài ra. 11rem = nav + padding trên dưới. */}
      <section className="flex h-[70vh] flex-1 flex-col md:h-[calc(100vh-11rem)]">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
              {t("teach.subtitle")}
            </p>
          </div>

          {/* Luôn chiếm chỗ (invisible chứ không phải bỏ render) để lúc phiên bắt đầu
              nút hiện ra không làm tiêu đề nhảy. Hộp xác nhận là popover tuyệt đối
              -> mở ra không đẩy gì cả. */}
          <div className="relative shrink-0">
            <button
              onClick={() => setConfirmQuit(true)}
              className={
                "rounded-lg border px-3 py-1.5 text-xs whitespace-nowrap" +
                (sessionId && !done ? "" : " invisible")
              }
              style={{ borderColor: "var(--border-strong)", color: "var(--fg-muted)" }}
            >
              {t("teach.quit")}
            </button>

            {confirmQuit && !done && (
              <>
                {/* bấm ra ngoài để đóng */}
                <div className="fixed inset-0 z-10" onClick={() => setConfirmQuit(false)} />
                <div
                  className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border p-3 shadow-lg"
                  style={{ borderColor: "var(--warn-border)", background: "var(--warn-bg)" }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: "var(--warn-fg)" }}>
                    {t("teach.quitConfirm")}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => void giveUp()}
                      disabled={loading}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40"
                      style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                    >
                      {t("teach.quitYes")}
                    </button>
                    <button
                      onClick={() => setConfirmQuit(false)}
                      className="text-xs underline"
                      style={{ color: "var(--warn-fg)" }}
                    >
                      {t("teach.quitNo")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* min-h-0: không có nó thì flex-1 từ chối co lại và overflow-y-auto vô hiệu */}
        <div
          className="chat-scroll min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {messages.map((m, i) =>
            m.role === "student" ? (
              <div key={i} className="text-right">
                <div
                  className="inline-block max-w-[85%] rounded-2xl px-4 py-2 text-sm"
                  style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                >
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2">
                <img src={avatar} alt="" width={30} height={30} className="mt-0.5 shrink-0 rounded-full" />
                <div
                  className="inline-block max-w-[85%] rounded-2xl px-4 py-2 text-sm"
                  style={{ background: "var(--surface-2)", color: "var(--fg)" }}
                >
                  {m.text}
                </div>
              </div>
            )
          )}

          {/* Xưng hô đổi theo persona được bốc; đây là lời agent nên luôn tiếng Việt. */}
          {loading && (
            <div className="flex items-center gap-2">
              <img src={avatar} alt="" width={30} height={30} className="shrink-0 rounded-full opacity-60" />
              <span className="text-sm" style={{ color: "var(--fg-muted)" }}>
                {personaStyle === "convo_toi"
                  ? "Tôi đang suy nghĩ…"
                  : personaStyle === "senpai_em" || personaStyle === "thay_em"
                  ? "Em đang suy nghĩ…"
                  : "Bạn học đang nghĩ…"}
              </span>
            </div>
          )}

          {done && sessionId && (
            <div
              className="rounded-xl border p-4 text-sm"
              style={{ borderColor: "var(--ok-border)", background: "var(--ok-bg)", color: "var(--ok-fg)" }}
            >
              <div className="font-medium">{t("teach.doneTitle")}</div>
              <p className="mt-1">{t("teach.doneBody")}</p>
              {/* Phải là <Link>, không phải <a>: thẻ <a> tải lại cả trang, provider
                  ngôn ngữ bị dựng lại từ đầu nên nhảy về tiếng Việt mặc định. */}
              <Link
                href={`/debrief/${sessionId}`}
                className="mt-3 inline-block rounded-lg px-4 py-2 text-xs font-medium no-underline"
                style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
              >
                {t("teach.doneCta")}
              </Link>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {error && (
          <p
            className="mt-2 rounded-lg border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--danger-border)",
              background: "var(--danger-bg)",
              color: "var(--danger-fg)",
            }}
          >
            {error}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={done}
            rows={2}
            placeholder={t("teach.placeholder")}
            className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-60"
            style={{ borderColor: "var(--border-strong)", background: "var(--surface)", color: "var(--fg)" }}
          />
          <button
            onClick={() => void send()}
            disabled={loading || done || !input.trim()}
            className="rounded-xl px-5 text-sm font-medium disabled:opacity-40"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {t("teach.send")}
          </button>
        </div>

        <div
          className="mt-3 flex items-center justify-between text-xs"
          style={{ color: "var(--fg-muted)" }}
        >
          <span>{t("teach.consent")}</span>
          <span className="font-mono">{testerCode}</span>
        </div>
      </section>

      {/* ----- Thanh checklist ----- */}
      <aside className="w-full shrink-0 md:w-64">
        <h2 className="mb-3 text-xs font-semibold tracking-wider" style={{ color: "var(--fg-muted)" }}>
          {t("teach.checklist")}
        </h2>
        <ul className="space-y-2">
          {items.map((it, idx) => {
            const ok = covered.has(it.id);
            return (
              <li
                key={it.id}
                className="rounded-xl border p-3 text-xs transition-colors"
                style={
                  ok
                    ? { borderColor: "var(--ok-border)", background: "var(--ok-bg)", color: "var(--ok-fg)" }
                    : { borderColor: "var(--border)", background: "var(--surface)", color: "var(--fg-muted)" }
                }
              >
                <span className="mr-1 font-mono">{ok ? "✓" : "○"}</span>
                {/* Chưa đạt thì KHÔNG hiện label — hiện ra là lộ đáp án */}
                {ok ? it.label : t("teach.hiddenItem", { n: idx + 1 })}
              </li>
            );
          })}
        </ul>
      </aside>
    </main>
  );
}
