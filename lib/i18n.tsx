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
  "home.cardItems": "{n} ý cần giảng",
  "home.cardMis": "{n} hiểu lầm hay gặp",
  "home.sectionHow": "DIỄN RA THẾ NÀO",
  "home.step1Title": "Bạn giảng",
  "home.step1Body": "Giải thích khái niệm bằng lời của bạn, như đang dạy một người chưa biết gì.",
  "home.step2Title": "Bạn học hỏi ngược",
  "home.step2Body": "Chỗ nào bạn giải thích còn hổng, bạn ấy sẽ hỏi lại — nhưng không bao giờ đưa đáp án.",
  "home.step3Title": "Xem tổng kết",
  "home.step3Body": "Cuối phiên bạn biết đã giảng được những ý nào và nên xem lại đoạn tài liệu nào.",

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
  "teach.slideHint": "Bạn xem lại bài giảng rồi quay lại giảng tiếp nhé:",
  "teach.slideCta": "Mở slide trang {page} →",

  "slides.subtitle": "Slide bài giảng — xem đúng trang được đánh dấu rồi quay lại phiên dạy.",
  "slides.back": "← Về phiên dạy",
  "slides.prev": "Trang trước",
  "slides.next": "Trang sau",
  "slides.page": "Trang {n}/{total}",
  "slides.openNew": "Mở PDF trong tab mới",
  "slides.missing": "Chưa tìm thấy file slide của chủ đề này (data/vlearn-pack/slides).",

  "debrief.completed": "Bạn đã giảng đủ ý",
  "debrief.turn_cap": "Hết lượt trao đổi",
  "debrief.gave_up": "Dừng giữa chừng",
  "debrief.stuck": "Dừng để ôn lại bài giảng",
  "debrief.ended": "Kết thúc phiên",
  "debrief.statCovered": "ý giảng được",
  "debrief.statTurns": "lượt trao đổi",
  "debrief.statMis": "hiểu lầm còn lại",
  "debrief.none": "không",
  "debrief.curve": "BẠN TIẾN BỘ QUA TỪNG LƯỢT",
  "debrief.done": "Ý BẠN ĐÃ GIẢNG ĐƯỢC",
  "debrief.doneEmpty": "Chưa ý nào — thử lại nhé, không sao cả.",
  "debrief.todo": "NÊN XEM LẠI NHỮNG CHỖ NÀY",
  "debrief.todoHidden":
    "Phiên dừng trước khi bạn giảng hết, nên danh sách Ý còn thiếu được ẩn để bạn tự ôn. Mở lại slide bài giảng rồi thử lại nhé.",
  "debrief.openSlides": "Mở slide bài giảng →",
  "debrief.source": "đoạn {code}",
  "debrief.reveal": "bấm để hiện",
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
  "home.cardItems": "{n} points to explain",
  "home.cardMis": "{n} common misconceptions",
  "home.sectionHow": "HOW IT GOES",
  "home.step1Title": "You explain",
  "home.step1Body": "Teach the concept in your own words, as if to someone who knows nothing about it.",
  "home.step2Title": "They ask back",
  "home.step2Body": "Wherever your explanation has gaps, they'll ask — but they never hand you the answer.",
  "home.step3Title": "See the summary",
  "home.step3Body": "At the end you'll see which points you covered and which sections are worth reviewing.",

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
  "teach.slideHint": "Review the lecture slide, then come back and continue:",
  "teach.slideCta": "Open slide {page} →",

  "slides.subtitle": "Lecture slides — check the highlighted page, then return to the session.",
  "slides.back": "← Back to session",
  "slides.prev": "Previous page",
  "slides.next": "Next page",
  "slides.page": "Page {n}/{total}",
  "slides.openNew": "Open PDF in new tab",
  "slides.missing": "No slide file found for this topic (data/vlearn-pack/slides).",

  "debrief.completed": "You covered enough points",
  "debrief.turn_cap": "Out of turns",
  "debrief.gave_up": "Stopped early",
  "debrief.stuck": "Stopped to review the lecture",
  "debrief.ended": "Session ended",
  "debrief.statCovered": "points covered",
  "debrief.statTurns": "turns",
  "debrief.statMis": "misconceptions left",
  "debrief.none": "none",
  "debrief.curve": "YOUR PROGRESS EACH TURN",
  "debrief.done": "POINTS YOU EXPLAINED",
  "debrief.doneEmpty": "None yet — give it another go, no worries.",
  "debrief.todo": "WORTH REVIEWING",
  "debrief.todoHidden":
    "The session stopped before you covered everything, so the remaining points are hidden for you to review. Open the lecture slides and give it another go.",
  "debrief.openSlides": "Open lecture slides →",
  "debrief.source": "section {code}",
  "debrief.reveal": "tap to reveal",
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
