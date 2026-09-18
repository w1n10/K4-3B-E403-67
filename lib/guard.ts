// STAGE 0 · GUARDRAIL — code thuần, 0 token, deterministic.
// Chủ sở hữu: Hiếu. Ba luật này kiểm được bằng unit test, đừng nhờ LLM làm.
// Xem docs/architecture.md §4 "Luật Stage 0".

import type { PersonaStyleId, Stage0Result, Stage0Verdict, Topic } from "./types";

const MIN_WORDS = 15;
const COPY_WINDOW = 12; // trùng >= 12 từ liên tiếp với tài liệu => coi là dán nguyên văn

const GIVE_UP = ["không biết", "ko biết", "ko bit", "chịu", "chiu", "bó tay", "no idea", "khong biet", "bo tay"];

const ASK_ANSWER_RE =
  /(cho|nói|giải thích|trả lời|chỉ)\s*(tôi|mình|tao|em)?\s*(đáp án|câu trả lời|luôn đi|đi|với)/i;

// Xác nhận ngắn — hợp lệ trong đối thoại Feynman nhưng CHƯA CÓ NỘI DUNG để chấm.
// Tách "đúng" và "không" ra hai nhóm vì agent phải hỏi lại theo hai kiểu khác nhau.
const SHORT_YES = new Set([
  "đúng", "đúng vậy", "đúng rồi", "đúng thế", "đúng nè", "đúng nha", "chuẩn", "chuẩn rồi",
  "chuẩn luôn", "chính xác", "phải rồi", "phải", "ừ", "ừ đúng", "ừ chuẩn", "uhm", "um",
  "vâng", "dạ", "yes", "ok", "okay", "oke", "okê",
]);

const SHORT_NO = new Set([
  "không", "ko", "khong", "không phải", "ko phải", "không đúng", "ko đúng",
  "chưa đúng", "sai", "sai rồi", "no", "nope",
]);

function words(s: string): string[] {
  return s.toLowerCase().replace(/[.,!?;:"'()\[\]]/g, " ").split(/\s+/).filter(Boolean);
}

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/^[.,!?;:\s]+|[.,!?;:\s]+$/g, "")
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

// Lượt đầu phải giải thích tử tế (15 từ). Từ lượt 2 trở đi đang đối thoại nên
// câu ngắn hơn là bình thường — nhưng KHÔNG thể là 1 từ, vì agent lúc nào cũng
// kết bằng "?" nên ngưỡng quá thấp sẽ vô hiệu hoá guard ở mọi lượt sau.
const MIN_WORDS_IN_DIALOGUE = 4;

function isLowEffort(text: string, isReplyingToAgent = false): boolean {
  const t = text.trim().toLowerCase();
  if (GIVE_UP.some((g) => t === g || t.startsWith(g))) return true;
  return words(text).length < (isReplyingToAgent ? MIN_WORDS_IN_DIALOGUE : MIN_WORDS);
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
      case "short_affirm":
        return "Ừ thì ừ, nhưng mà vì sao lại thế hả con vợ? Giải thích cho tôi nghe cái coi!";
      case "short_negate":
        return "Ơ sao lại không? Vậy đúng ra là sao hả con vợ, nói tôi nghe với!";
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
      case "short_affirm":
        return "Dạ vâng ạ, nhưng mà vì sao lại như thế hả senpai? Senpai giải thích thêm cho em với ạ?";
      case "short_negate":
        return "Ơ không ạ? Vậy thì đúng ra phải thế nào hả senpai, senpai chỉ em với ạ?";
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
      case "short_affirm":
        return "Dạ vâng ạ, nhưng vì sao lại như vậy hả thầy? Thầy giảng thêm cho em hiểu với ạ.";
      case "short_negate":
        return "Dạ không ạ? Vậy đúng ra là thế nào hả thầy, thầy chỉ cho em với ạ?";
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
    case "short_affirm":
      return (
        "Ừ nhưng mà vì sao lại thế nhỉ? Bạn giải thích thêm cho mình hiểu với?"
      );
    case "short_negate":
      return (
        "Ơ sao lại không nhỉ? Vậy đúng ra là thế nào, bạn nói cho mình nghe với?"
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
  // Trả lời cụt "ừ" / "không": hợp lệ về mặt hội thoại nhưng không có nội dung nào
  // để Stage 1 chấm. Hỏi ngược ngay tại đây, không tốn lời gọi AI nào.
  const clean = normalize(text);
  if (SHORT_YES.has(clean)) {
    return { blocked: true, verdict: "short_affirm", reply: getGuardReply("short_affirm", style) };
  }
  if (SHORT_NO.has(clean)) {
    return { blocked: true, verdict: "short_negate", reply: getGuardReply("short_negate", style) };
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
