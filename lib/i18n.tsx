"use client";

// Song ngữ VI/EN. Từ điển phẳng, không dùng thư viện — app chỉ có 3 màn.
// Thêm chuỗi mới: khai cả 2 ngôn ngữ, TypeScript sẽ bắt nếu thiếu bên nào.

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "vi" | "en";

const vi = {
  "nav.brand": "Bạn học AI",
  "nav.theme": "Đổi sáng/tối",

  "home.title": "Dạy lại cho bạn học",
  "home.intro":
    "Bạn sẽ giảng một khái niệm cho một bạn học chưa biết gì. Bạn ấy sẽ hỏi lại chỗ nào bạn giải thích còn thiếu. Đây là buổi luyện, không phải bài kiểm tra.",
  "home.start": "Bắt đầu dạy →",
  "home.empty": "Chưa có chủ đề nào trong content/.",
  "home.sectionTopics": "CHỌN CHỦ ĐỀ",

  "teach.subtitle": "Bạn là người dạy. Giải thích bằng lời của bạn — đừng chép lại tài liệu.",
  "teach.greeting":
    'Chào bạn! Mình nghe nói tới "{title}" mà đọc mãi vẫn không hiểu gì cả. Bạn giảng lại cho mình được không?',
  "teach.thinking": "Bạn học đang nghĩ…",
  "teach.doneTitle": "Xong phiên dạy!",
  "teach.doneBody": "Cảm ơn bạn đã giảng cho mình nghe.",
  "teach.doneCta": "Xem tổng kết →",
  "teach.placeholder": "Giảng cho bạn học nghe…  (Enter để gửi, Shift+Enter xuống dòng)",
  "teach.send": "Gửi",
  "teach.quit": "Dừng phiên tại đây",
  "teach.quitConfirm":
    "Dừng ở đây nhé? Phiên sẽ kết thúc và bạn xem được tổng kết những ý đã giảng cùng chỗ nên ôn lại.",
  "teach.quitYes": "Dừng và xem tổng kết",
  "teach.quitNo": "Giảng tiếp",
  "teach.consent": "Phiên này được ghi lại để nhóm cải tiến sản phẩm.",
  "teach.checklist": "Ý ĐÃ GIẢNG ĐƯỢC",
  "teach.hiddenItem": "Ý thứ {n} — chưa nhắc tới",

  "debrief.completed": "Bạn đã giảng đủ ý",
  "debrief.turn_cap": "Hết lượt trao đổi",
  "debrief.gave_up": "Dừng giữa chừng",
  "debrief.ended": "Kết thúc phiên",
  "debrief.statCovered": "ý giảng được",
  "debrief.statTurns": "lượt trao đổi",
  "debrief.statMis": "hiểu lầm còn lại",
  "debrief.none": "không",
  "debrief.curve": "BẠN TIẾN BỘ QUA TỪNG LƯỢT",
  "debrief.done": "Ý BẠN ĐÃ GIẢNG ĐƯỢC",
  "debrief.doneEmpty": "Chưa ý nào — thử lại nhé, không sao cả.",
  "debrief.todo": "NÊN XEM LẠI NHỮNG CHỖ NÀY",
  "debrief.source": "đoạn {code}",
  "debrief.mis": "HIỂU LẦM GẶP TRONG PHIÊN",
  "debrief.misOpen": "⚠ còn vướng: ",
  "debrief.misFixed": "✓ đã gỡ: ",
  "debrief.again": "Dạy lại lần nữa",
  "debrief.other": "Chủ đề khác",
  "debrief.footer": "Đây là buổi luyện, không phải bài kiểm tra — kết quả không vào điểm của bạn.",
};

const en: Record<keyof typeof vi, string> = {
  "nav.brand": "AI Study Buddy",
  "nav.theme": "Toggle light/dark",

  "home.title": "Teach it back",
  "home.intro":
    "You'll explain a concept to a classmate who knows nothing about it. They'll ask back wherever your explanation has gaps. This is practice, not a test.",
  "home.start": "Start teaching →",
  "home.empty": "No topics found in content/.",
  "home.sectionTopics": "PICK A TOPIC",

  "teach.subtitle": "You're the teacher. Explain in your own words — don't copy the material.",
  "teach.greeting":
    'Hi! I keep hearing about "{title}" but I really don\'t get it. Could you explain it to me?',
  "teach.thinking": "Your classmate is thinking…",
  "teach.doneTitle": "Session complete!",
  "teach.doneBody": "Thanks for teaching me.",
  "teach.doneCta": "See summary →",
  "teach.placeholder": "Explain it to your classmate…  (Enter to send, Shift+Enter for a new line)",
  "teach.send": "Send",
  "teach.quit": "End session here",
  "teach.quitConfirm":
    "Stop here? The session will end and you'll see a summary of what you covered plus what to review.",
  "teach.quitYes": "End and see summary",
  "teach.quitNo": "Keep teaching",
  "teach.consent": "This session is recorded so the team can improve the product.",
  "teach.checklist": "POINTS YOU'VE COVERED",
  "teach.hiddenItem": "Point {n} — not mentioned yet",

  "debrief.completed": "You covered enough points",
  "debrief.turn_cap": "Out of turns",
  "debrief.gave_up": "Stopped early",
  "debrief.ended": "Session ended",
  "debrief.statCovered": "points covered",
  "debrief.statTurns": "turns",
  "debrief.statMis": "misconceptions left",
  "debrief.none": "none",
  "debrief.curve": "YOUR PROGRESS EACH TURN",
  "debrief.done": "POINTS YOU EXPLAINED",
  "debrief.doneEmpty": "None yet — give it another go, no worries.",
  "debrief.todo": "WORTH REVIEWING",
  "debrief.source": "section {code}",
  "debrief.mis": "MISCONCEPTIONS IN THIS SESSION",
  "debrief.misOpen": "⚠ still unresolved: ",
  "debrief.misFixed": "✓ cleared: ",
  "debrief.again": "Teach it again",
  "debrief.other": "Another topic",
  "debrief.footer": "This is practice, not a test — it doesn't count toward your grade.",
};

export type Key = keyof typeof vi;
const DICT = { vi, en };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key, vars?: Record<string, string | number>) => string };
const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");

  // Đọc trong useEffect, không phải lúc render -> tránh hydration mismatch.
  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "vi" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
      document.documentElement.lang = l;
    } catch {}
  };

  const t = (k: Key, vars?: Record<string, string | number>) => {
    let s = DICT[lang][k] ?? k;
    if (vars) for (const [key, v] of Object.entries(vars)) s = s.replaceAll(`{${key}}`, String(v));
    return s;
  };

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useT() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useT phải nằm trong <LangProvider>");
  return ctx;
}
