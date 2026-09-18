// STAGE 0 · GUARDRAIL — code thuần, 0 token, deterministic.
// Chủ sở hữu: Hiếu. Ba luật này kiểm được bằng unit test, đừng nhờ LLM làm.
// Xem docs/architecture.md §4 "Luật Stage 0".

import type { Stage0Result, Topic } from "./types";

const MIN_WORDS = 15;
const COPY_WINDOW = 12; // trùng >= 12 từ liên tiếp với tài liệu => coi là dán nguyên văn

const GIVE_UP = ["không biết", "ko biết", "ko bit", "chịu", "chiu", "bó tay", "no idea"];

const ASK_ANSWER_RE =
  /(cho|nói|giải thích|trả lời|chỉ)\s*(tôi|mình|tao|em)?\s*(đáp án|câu trả lời|luôn đi|đi|với)/i;

function words(s: string): string[] {
  return s.toLowerCase().replace(/[.,!?;:"'()\[\]]/g, " ").split(/\s+/).filter(Boolean);
}

/** Trượt cửa sổ COPY_WINDOW từ, xem có khớp đoạn nào trong excerpts không. */
function isVerbatimCopy(text: string, topic: Topic): boolean {
  const w = words(text);
  if (w.length < COPY_WINDOW) return false;
  const corpus = Object.values(topic.excerpts).map((e) => words(e).join(" "));
  for (let i = 0; i + COPY_WINDOW <= w.length; i++) {
    const window = w.slice(i, i + COPY_WINDOW).join(" ");
    if (corpus.some((c) => c.includes(window))) return true;
  }
  return false;
}

/** Câu chỉ có hỏi, không có mệnh đề giải thích nào. */
function isAskingAI(text: string): boolean {
  if (ASK_ANSWER_RE.test(text)) return true;
  const t = text.trim();
  if (!t.endsWith("?")) return false;
  // Nhiều câu mà câu nào cũng là câu hỏi => học viên đang hỏi ngược, không dạy
  const sentences = t.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  return sentences.length <= 1;
}

function isLowEffort(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (GIVE_UP.some((g) => t === g || t.startsWith(g))) return true;
  return words(text).length < MIN_WORDS;
}

// Lời thoại của agent LUÔN tiếng Việt, không đổi theo toggle EN/VI của giao diện —
// toggle đó chỉ đổi nhãn nút, tiêu đề, chú thích. Tài liệu gốc là tiếng Việt nên
// bắt bạn học nói tiếng Anh sẽ lệch hẳn với nội dung học viên đang giảng.
export function runGuard(text: string, topic: Topic): Stage0Result {
  if (isVerbatimCopy(text, topic)) {
    return {
      blocked: true,
      verdict: "verbatim_copy",
      reply:
        "Ơ, câu này giống hệt trong tài liệu mà bạn. Mình đọc rồi vẫn không hiểu — " +
        "bạn nói lại theo cách của bạn cho mình dễ hình dung được không?",
    };
  }
  if (isAskingAI(text)) {
    return {
      blocked: true,
      verdict: "asked_ai",
      reply:
        "Mình chưa biết nên mới nhờ bạn chỉ mà! Hay bạn thử xem lại phần đó rồi " +
        "giảng cho mình nghe nhé?",
    };
  }
  if (isLowEffort(text)) {
    return {
      blocked: true,
      verdict: "low_effort",
      reply:
        "Bạn bắt đầu từ chỗ nào cũng được, kể cả chỉ một ý thôi cũng được mà. " +
        "Bạn nhớ được gì về cái này?",
    };
  }
  return { blocked: false };
}
