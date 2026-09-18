// STAGE 0 · GUARDRAIL — code thuần, 0 token, deterministic.
// Chủ sở hữu: Hiếu. Ba luật này kiểm được bằng unit test, đừng nhờ LLM làm.
// Xem docs/architecture.md §4 "Luật Stage 0".

import type { PersonaStyleId, Stage0Result, Stage0Verdict, Topic } from "./types";

const MIN_WORDS = 15;
const COPY_WINDOW = 12; // trùng >= 12 từ liên tiếp với tài liệu => coi là dán nguyên văn

const GIVE_UP = ["không biết", "ko biết", "ko bit", "chịu", "chiu", "bó tay", "no idea", "khong biet", "bo tay"];

const ASK_ANSWER_RE =
  /(cho|nói|giải thích|trả lời|chỉ)\s*(tôi|mình|tao|em)?\s*(đáp án|câu trả lời|luôn đi|đi|với)/i;

// Các câu phản hồi/xác nhận ngắn hợp lệ trong đối thoại Feynman
const SHORT_AFFIRMATIONS = new Set([
  "đúng", "đúng vậy", "đúng rồi", "đúng thế", "đúng nè", "đúng nha", "chuẩn", "chuẩn rồi",
  "chuẩn luôn", "chính xác", "phải rồi", "phải", "không phải", "sai rồi", "không đúng",
  "chưa đúng", "sai", "ừ", "vâng", "dạ", "ừ đúng", "ừ chuẩn", "uhm", "yes", "no", "ok", "okay"
]);

function words(s: string): string[] {
  return s.toLowerCase().replace(/[.,!?;:"'()\[\]]/g, " ").split(/\s+/).filter(Boolean);
}

function isShortAffirmation(text: string): boolean {
  const clean = text
    .trim()
    .toLowerCase()
    .replace(/^[.,!?;:\s]+|[.,!?;:\s]+$/g, "")
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return SHORT_AFFIRMATIONS.has(clean);
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

function isLowEffort(text: string, isReplyingToAgent = false): boolean {
  const t = text.trim().toLowerCase();
  if (GIVE_UP.some((g) => t === g || t.startsWith(g))) return true;
  if (isShortAffirmation(text)) return false;
  if (isReplyingToAgent) {
    // Khi đang đối thoại trả lời bot ở các lượt sau, chỉ chặn nếu câu rỗng hoặc bỏ cuộc
    return words(text).length < 1;
  }
  return words(text).length < MIN_WORDS;
}

export function getGuardReply(verdict: Stage0Verdict, style: PersonaStyleId = "ban_minh"): string {
  if (style === "convo_toi") {
    switch (verdict) {
      case "verbatim_copy":
        return "Ơ kìa, câu này giống y xì đúc trong tài liệu mà con vợ. Tôi đọc rồi vẫn lú — con vợ giải thích lại theo văn con vợ cho tôi hiểu đi!";
      case "asked_ai":
        return "Tôi không biết nên mới nhờ con vợ chỉ mà! Hay con vợ xem lại tài liệu rồi chỉ tôi đi nè?";
      case "low_effort":
        return "Con vợ bắt đầu từ chỗ nào cũng được, ném ra một ý thôi cũng được mà. Con vợ nhớ được gì về cái này?";
    }
  }
  if (style === "senpai_em") {
    switch (verdict) {
      case "verbatim_copy":
        return "Ơ, câu này giống hệt trong tài liệu mà senpai. Em đọc rồi vẫn chưa hiểu lắm — senpai nói lại theo cách của senpai cho em dễ hình dung được không ạ?";
      case "asked_ai":
        return "Em chưa biết nên mới nhờ senpai chỉ dạy mà! Hay senpai xem lại tài liệu rồi giảng cho em nghe nha senpai?";
      case "low_effort":
        return "Senpai bắt đầu từ chỗ nào cũng được ạ, kể cả chỉ một ý nhỏ thôi. Senpai nhớ được gì về cái này ạ?";
    }
  }
  if (style === "thay_em") {
    switch (verdict) {
      case "verbatim_copy":
        return "Dạ thưa thầy, câu này giống hệt trong tài liệu ạ. Em đọc rồi vẫn chưa hiểu — thầy giảng lại theo cách của thầy cho em dễ hình dung được không ạ?";
      case "asked_ai":
        return "Dạ em chưa rõ nên mới nhờ thầy chỉ dạy ạ! Thầy xem lại bài rồi giảng cho em nghe với ạ.";
      case "low_effort":
        return "Dạ thầy bắt đầu từ chỗ nào cũng được ạ, chỉ cần một ý thôi. Thầy nhớ được điểm mấu chốt nào về phần này ạ?";
    }
  }

  // Default: ban_minh
  switch (verdict) {
    case "verbatim_copy":
      return (
        "Ơ, câu này giống hệt trong tài liệu mà bạn. Mình đọc rồi vẫn không hiểu — " +
        "bạn nói lại theo cách của bạn cho mình dễ hình dung được không?"
      );
    case "asked_ai":
      return (
        "Mình chưa biết nên mới nhờ bạn chỉ mà! Hay bạn thử xem lại phần đó rồi " +
        "giảng cho mình nghe nhé?"
      );
    case "low_effort":
      return (
        "Bạn bắt đầu từ chỗ nào cũng được, kể cả chỉ một ý thôi cũng được mà. " +
        "Bạn nhớ được gì về cái này?"
      );
  }
}

export function runGuard(
  text: string,
  topic: Topic,
  history: { role: string; text: string }[] = [],
  style: PersonaStyleId = "ban_minh"
): Stage0Result {
  if (isVerbatimCopy(text, topic)) {
    return {
      blocked: true,
      verdict: "verbatim_copy",
      reply: getGuardReply("verbatim_copy", style),
    };
  }
  if (isAskingAI(text)) {
    return {
      blocked: true,
      verdict: "asked_ai",
      reply: getGuardReply("asked_ai", style),
    };
  }
  const lastAgentMsg = [...history].reverse().find((m) => m.role === "agent");
  const isReplyingToAgent = Boolean(lastAgentMsg && lastAgentMsg.text.trim().endsWith("?"));

  if (isLowEffort(text, isReplyingToAgent)) {
    return {
      blocked: true,
      verdict: "low_effort",
      reply: getGuardReply("low_effort", style),
    };
  }
  return { blocked: false };
}
