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
/** unlocked = số ý câu này giảng trúng. Lưu theo tin nhắn nên cuộn lên vẫn thấy. */
type Msg = { role: "student" | "agent"; text: string; unlocked?: number };

/** Sticker cảm xúc gắn ở góc avatar, khớp tính cách từng persona. */
const MOOD: Record<PersonaStyleId, string> = {
  ban_minh: "🙂",
  convo_toi: "😎",
  senpai_em: "🥺",
  thay_em: "🙇",
};

/** Sticker đổi theo kết cục phiên — bot phản ứng đúng với chuyện vừa xảy ra. */
const MOOD_EXIT: Record<string, string> = {
  completed: "🥳",
  turn_cap: "😮‍💨",
  stuck: "🥲",
  gave_up: "🫂",
};

/** Sticker ăn mừng khi học viên vừa giảng trúng ý mới. */
const CHEERS = ["🎉", "✨", "🤩", "👏"];
const SPARKS = ["⭐", "💫", "✨"];

/** Câu bot reo lên khi vừa hiểu thêm được ý — lời agent nên luôn tiếng Việt. */
function cheerLine(style: PersonaStyleId, n: number): string {
  switch (style) {
    case "convo_toi":
      return `Ồ, tôi hiểu thêm ${n} ý rồi nè!`;
    case "senpai_em":
      return `A, em hiểu thêm ${n} ý rồi ạ!`;
    case "thay_em":
      return `Dạ, em hiểu thêm ${n} ý rồi ạ!`;
    default:
      return `À, mình hiểu thêm ${n} ý rồi!`;
  }
}

export default function TeachClient({
  topicId,
  title,
  items,
  initialQuestion,
  initialTarget,
  personaStyle = "ban_minh",
}: {
  topicId: string;
  title: string;
  items: Item[];
  initialQuestion?: string;
  initialTarget?: string;
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
  const [exitReason, setExitReason] = useState<string | null>(null);
  // Giây còn phải chờ trước khi được gửi tiếp. Server mới là lớp chặn thật
  // (api/checkpoint trả 429), đây chỉ để người dùng thấy rõ vì sao nút khoá.
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Khi agent nhắc xem slide: { page, title } để hiện nút mở trang slide đúng trang.
  const [slideHint, setSlideHint] = useState<{ page: number; title?: string } | null>(null);

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

  // Ý vừa được mở khoá ở lượt này -> chạy hiệu ứng "mở kho báu" rồi tự tắt,
  // để lần render sau không chạy lại animation.
  const [justUnlocked, setJustUnlocked] = useState<string[]>([]);
  const prevCovered = useRef<string[]>([]);
  useEffect(() => {
    const fresh = coveredIds.filter((id) => !prevCovered.current.includes(id));
    prevCovered.current = coveredIds;
    if (fresh.length === 0) return;
    setJustUnlocked(fresh);
    const timer = setTimeout(() => setJustUnlocked([]), 1000);
    return () => clearTimeout(timer);
  }, [coveredIds]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading || done || cooldown > 0) return;

    setInput("");
    setError(null);
    setSlideHint(null);
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
          initialQuestion,
          initialTarget,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);

      setSessionId(data.sessionId);

      // Số ý mới mở được ở lượt này -> gắn vào chính câu học viên vừa gửi,
      // để cuộn lên vẫn biết câu nào là câu giảng trúng.
      const nextCovered: string[] = data.coveredIds ?? [];
      const gained = nextCovered.filter((id: string) => !coveredIds.includes(id)).length;
      if (gained > 0) {
        setTurns((m) => {
          const copy = [...m];
          for (let k = copy.length - 1; k >= 0; k--) {
            if (copy[k].role === "student") {
              copy[k] = { ...copy[k], unlocked: gained };
              break;
            }
          }
          return copy;
        });
      }
      setCoveredIds(nextCovered);
      if (data.exitReason) setExitReason(data.exitReason);
      setSlideHint(data.slide ?? null);
      if (data.reply) setTurns((m) => [...m, { role: "agent", text: data.reply }]);
      if (data.done) setDone(true);
      else setCooldown(3);
    } catch (e) {
      // Rollback tin nhắn vừa gửi khỏi UI để không bị hiển thị lặp
      setTurns((m) => m.slice(0, -1));
      // Điền lại câu vừa gõ vào ô input để người học không phải gõ lại từ đầu
      setInput(text);

      const rawMsg = (e as Error).message || "";
      if (rawMsg.includes("gửi hơi nhanh")) setCooldown(3);
      if (
        rawMsg.includes("503") ||
        rawMsg.includes("429") ||
        rawMsg.includes("quá tải") ||
        rawMsg.includes("502") ||
        rawMsg.includes("high demand") ||
        rawMsg.includes("overloaded")
      ) {
        setError("Máy chủ AI đang có lưu lượng truy cập cao trong giây lát. Bạn bấm 'Gửi' lại nhé!");
      } else {
        setError(rawMsg);
      }
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
      setExitReason("gave_up");
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
                "btn-press rounded-lg border px-3 py-1.5 text-xs whitespace-nowrap" +
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
                      className="btn-press rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40"
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
              <div key={i}>
                <div className="text-right">
                  {/* text-left ở chính bong bóng: khung ngoài dùng text-right để đẩy
                      bong bóng sang phải, nhưng thuộc tính đó kế thừa xuống chữ bên
                      trong làm dòng xuống hàng bị căn phải, mép trái lởm chởm. */}
                  <div
                    className="inline-block max-w-[85%] rounded-2xl px-4 py-2 text-left text-sm"
                    style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
                  >
                    {m.text}
                  </div>
                </div>

                {/* Bot reo lên ngay dưới câu giảng trúng. Là một lượt nói thật của bot
                    nên để nguyên dạng avatar + bong bóng, chỉ đổi màu sang tông "đạt".
                    Ở LẠI VĨNH VIỄN — cuộn lên vẫn biết câu nào trúng. */}
                {m.unlocked && (
                  <div className="mt-2 flex items-start gap-2">
                    <span className="relative mt-0.5 shrink-0">
                      <img src={avatar} alt="" width={30} height={30} className="rounded-full" />
                      <span className="mood-badge" aria-hidden>
                        {CHEERS[m.unlocked % CHEERS.length]}
                      </span>
                    </span>

                    <span
                      className="cheer max-w-[85%] rounded-2xl px-4 py-2 text-sm"
                      style={{ background: "var(--ok-bg)", color: "var(--ok-fg)" }}
                    >
                      {/* Hạt chỉ bắn ở lượt vừa đạt; các lượt cũ giữ bong bóng tĩnh. */}
                      {i === messages.length - 1 &&
                        justUnlocked.length > 0 &&
                        SPARKS.map((sp, k) => (
                          <span
                            key={k}
                            className="cheer-particle"
                            style={
                              {
                                "--dx": `${[-16, 16, -2][k]}px`,
                                "--dy": `${[-24, -20, -30][k]}px`,
                                "--rot": `${[-40, 35, 15][k]}deg`,
                                animationDelay: `${k * 90}ms`,
                              } as React.CSSProperties
                            }
                            aria-hidden
                          >
                            {sp}
                          </span>
                        ))}
                      {cheerLine(personaStyle, m.unlocked)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2">
                <span className="relative mt-0.5 shrink-0">
                  <img src={avatar} alt="" width={30} height={30} className="rounded-full" />
                  {/* Bình thường là sticker của persona; tin nhắn cuối khi phiên đã
                      khép lại thì đổi theo kết cục (xong / hết lượt / kẹt / bỏ cuộc). */}
                  <span
                    className={
                      "mood-badge" +
                      (done && i === messages.length - 1 ? " sticker-in" : "")
                    }
                    aria-hidden
                  >
                    {done && i === messages.length - 1 && exitReason
                      ? MOOD_EXIT[exitReason] ?? MOOD[personaStyle]
                      : MOOD[personaStyle] ?? MOOD.ban_minh}
                  </span>
                </span>

                <div className="min-w-0">
                  <div
                    className="inline-block max-w-[85%] rounded-2xl px-4 py-2 text-sm"
                    style={{ background: "var(--surface-2)", color: "var(--fg)" }}
                  >
                    {m.text}
                  </div>

                </div>
              </div>
            )
          )}

          {/* Xưng hô đổi theo persona được bốc; đây là lời agent nên luôn tiếng Việt. */}
          {loading && (
            <div className="flex items-center gap-2">
              <span className="relative shrink-0">
                <img src={avatar} alt="" width={30} height={30} className="rounded-full opacity-70" />
                <span className="mood-badge" aria-hidden>
                  💭
                </span>
              </span>

              <span
                className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm"
                style={{ background: "var(--surface-2)", color: "var(--fg-muted)" }}
              >
                {personaStyle === "convo_toi"
                  ? "Tôi đang nghĩ"
                  : personaStyle === "senpai_em" || personaStyle === "thay_em"
                  ? "Em đang nghĩ"
                  : "Bạn học đang nghĩ"}
                {/* ba chấm nảy so le thay cho dấu "…" đứng yên */}
                <span className="ml-0.5 inline-flex gap-1" aria-hidden>
                  <i className="dot" />
                  <i className="dot" />
                  <i className="dot" />
                </span>
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
                className="btn-press mt-3 inline-block rounded-lg px-4 py-2 text-xs font-medium no-underline"
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

        {/* Agent nhắc xem lại bài giảng: mở tab riêng để phiên chat không mất state. */}
        {slideHint && !done && (
          <div
            className="mt-3 rounded-xl border p-3 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--fg)" }}
          >
            <p>{t("teach.slideHint")}</p>
            <Link
              href={`/slides/${topicId}?page=${slideHint.page}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block rounded-lg px-4 py-2 text-xs font-medium no-underline"
              style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
            >
              {t("teach.slideCta", { page: slideHint.page })}
            </Link>
          </div>
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
            disabled={loading || done || cooldown > 0 || !input.trim()}
            className="btn-press inline-flex items-center gap-1.5 rounded-xl px-5 text-sm font-medium disabled:opacity-40"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {cooldown > 0 ? `${cooldown}s` : t("teach.send")}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4z" />
            </svg>
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
            const fresh = justUnlocked.includes(it.id);
            return (
              <li
                key={it.id}
                className={
                  "point-row rounded-xl border p-3 text-xs" +
                  (ok ? "" : " point-locked") +
                  (fresh ? " unlocking" : "")
                }
                style={
                  ok
                    ? { borderColor: "var(--ok-border)", background: "var(--ok-bg)", color: "var(--ok-fg)" }
                    : { borderColor: "var(--border-strong)", background: "var(--surface)", color: "var(--fg-muted)" }
                }
              >
                {/* Tia sáng bắn ra đúng lúc ý vừa mở khoá */}
                {fresh && (
                  <span
                    className="unlock-spark pointer-events-none absolute -right-1 -top-2 text-base"
                    style={{ color: "var(--primary)" }}
                    aria-hidden
                  >
                    ✦
                  </span>
                )}

                <div className="relative flex items-start gap-2">
                  <span
                    className="point-badge"
                    style={
                      ok
                        ? { background: "var(--primary)", color: "var(--primary-fg)" }
                        : { background: "var(--surface-2)", color: "var(--fg-muted)" }
                    }
                    aria-hidden
                  >
                    {ok ? "✓" : idx + 1}
                  </span>

                  {/* Chưa đạt thì KHÔNG hiện label — hiện ra là lộ đáp án */}
                  <span className={"flex-1 leading-snug" + (fresh ? " unlock-text" : "")}>
                    {ok ? it.label : t("teach.hiddenItem", { n: idx + 1 })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>
    </main>
  );
}
