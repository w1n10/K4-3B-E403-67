"use client";

// Khung chat — bản chạy được, chưa trau chuốt. Restyle thoải mái.
// Hai luật về UI không được phá:
//  1. KHÔNG hiện coverage/% trong lúc đang học (luật an toàn D3: không chấm điểm ngầm).
//  2. Mục checklist CHƯA đạt thì KHÔNG hiện label — hiện ra là học viên đọc được đáp án.

import { useEffect, useRef, useState } from "react";
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
  const [testerCode, setTesterCode] = useState("U00");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "agent",
      text:
        initialQuestion ??
        `Chào bạn! Mình nghe giảng viên nói LLM không hề đọc hiểu câu chữ như con người, mà bản chất chỉ là tính xác suất đoán token tiếp theo. Chỗ này hoạt động như thế nào vậy bạn?`,
    },
  ]);
  const [coveredIds, setCoveredIds] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading || done) return;

    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "student", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text, topicId, testerCode, personaStyle }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);

      setSessionId(data.sessionId);
      setCoveredIds(data.coveredIds ?? []);
      if (data.reply) setMessages((m) => [...m, { role: "agent", text: data.reply }]);
      if (data.done) setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const covered = new Set(coveredIds);

  return (
    <main className="mx-auto flex max-w-5xl gap-6 px-6 py-8">
      {/* ----- Cột chat ----- */}
      <section className="flex min-h-[80vh] flex-1 flex-col">
        <header className="mb-4">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-slate-500">
            Bạn là người dạy. Giải thích bằng lời của bạn — đừng chép lại tài liệu.
          </p>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "student" ? "text-right" : "text-left"}>
              <div
                className={
                  "inline-block max-w-[85%] rounded-2xl px-4 py-2 text-sm " +
                  (m.role === "student"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-800")
                }
              >
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-sm text-slate-400">
              {personaStyle === "thay_em"
                ? "Em đang suy nghĩ…"
                : personaStyle === "senpai_em"
                ? "Em đang suy nghĩ…"
                : personaStyle === "convo_toi"
                ? "Tôi đang suy nghĩ…"
                : "Bạn học đang nghĩ…"}
            </div>
          )}

          {done && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <div className="font-medium text-emerald-900">Xong phiên dạy!</div>
              <p className="mt-1 text-emerald-800">
                Bạn đã giảng được {coveredIds.length}/{items.length} ý. Xem lại bên phải
                những ý chưa nhắc tới.
              </p>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {error && (
          <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
            placeholder="Giảng cho bạn học nghe…  (Enter để gửi, Shift+Enter xuống dòng)"
            className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
          />
          <button
            onClick={() => void send()}
            disabled={loading || done || !input.trim()}
            className="rounded-lg bg-slate-900 px-5 text-sm font-medium text-white disabled:opacity-40"
          >
            Gửi
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
          <span>Phiên này được ghi lại để nhóm cải tiến sản phẩm.</span>
          <label className="flex items-center gap-2">
            Mã tester
            <input
              value={testerCode}
              onChange={(e) => setTesterCode(e.target.value)}
              disabled={!!sessionId}
              className="w-16 rounded border border-slate-300 px-2 py-1 text-slate-700 disabled:bg-slate-100"
            />
          </label>
        </div>
      </section>

      {/* ----- Thanh checklist ----- */}
      <aside className="w-64 shrink-0">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Ý đã giảng được</h2>
        <ul className="space-y-2">
          {items.map((it, idx) => {
            const ok = covered.has(it.id);
            return (
              <li
                key={it.id}
                className={
                  "rounded-lg border p-3 text-xs " +
                  (ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-400")
                }
              >
                <span className="mr-1 font-mono">{ok ? "✓" : "○"}</span>
                {/* Chưa đạt thì KHÔNG hiện label — hiện ra là lộ đáp án */}
                {ok ? it.label : `Ý thứ ${idx + 1} — chưa nhắc tới`}
              </li>
            );
          })}
        </ul>
      </aside>
    </main>
  );
}
