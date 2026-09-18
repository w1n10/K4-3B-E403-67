// STAGE 2 · TEACHABLE PERSONA — chỉ khoác giọng, KHÔNG chấm, KHÔNG quyết định hỏi gì.
//
// ⚠️ BẤT BIẾN CỦA KIẾN TRÚC: tầng này KHÔNG BAO GIỜ được nhận
//    topic.items / topic.excerpts / label của mục còn thiếu.
//    Nó chỉ nhận một CÂU HỎI do Stage 1 soạn sẵn. Nhờ vậy nó không thể lộ đáp án
//    kể cả khi học viên cố dụ. Đừng "tiện tay" truyền checklist vào đây cho dễ viết prompt
//    — làm thế là phá mất 15 điểm rubric "Không lộ đáp án". Xem docs/architecture.md §2.

import { callText, MODEL_PERSONA } from "./llm";
import type { PersonaStyleId, Stage2Input } from "./types";

export const PERSONA_VERSION = "persona-v2";

export const PERSONA_STYLES: Record<
  PersonaStyleId,
  {
    id: PersonaStyleId;
    weight: number;
    agentPronoun: string;
    learnerPronoun: string;
    roleDescription: string;
    instruction: string;
  }
> = {
  ban_minh: {
    id: "ban_minh",
    weight: 70,
    agentPronoun: "mình",
    learnerPronoun: "bạn",
    roleDescription: "BẠN HỌC ngây thơ",
    instruction: 'Giọng: thân mật, tò mò, hơi lúng túng. Xưng "mình" và gọi người dạy là "bạn".',
  },
  convo_toi: {
    id: "convo_toi",
    weight: 2,
    agentPronoun: "tôi",
    learnerPronoun: "con vợ",
    roleDescription: "bạn thân lầy lội, hài hước",
    instruction:
      'Giọng: dân dã, thân thiết, có phần dí dỏm. Xưng "tôi" và gọi người dạy là "con vợ" (ví dụ: "con vợ ơi", "tôi chưa hiểu chỗ này nè con vợ").',
  },
  senpai_em: {
    id: "senpai_em",
    weight: 10,
    agentPronoun: "em",
    learnerPronoun: "senpai",
    roleDescription: "hậu bối dễ thương, tôn trọng tiền bối",
    instruction:
      'Giọng: lễ phép, dễ thương, đầy ngưỡng mộ. Xưng "em" và gọi người dạy là "senpai" (ví dụ: "senpai giải thích cho em với ạ", "em thắc mắc chỗ này senpai ơi").',
  },
  thay_em: {
    id: "thay_em",
    weight: 18,
    agentPronoun: "em",
    learnerPronoun: "thầy",
    roleDescription: "học trò chăm chỉ, ngoan ngoãn",
    instruction:
      'Giọng: kính trọng, lễ phép, dùng kính ngữ dạ/thưa/ạ. Xưng "em" và gọi người dạy là "thầy" (ví dụ: "Dạ thưa thầy, chỗ này em chưa hiểu ạ...").',
  },
};

/**
 * Chọn ngẫu nhiên phong cách persona theo tỉ lệ:
 * - Bạn – Mình: 70%
 * - Con vợ - Tôi: 2%
 * - Senpai - Em: 10%
 * - Thầy - Em: 18%
 */
export function getRandomPersonaStyle(): PersonaStyleId {
  const rand = Math.random() * 100;
  if (rand < 70) return "ban_minh";       // 70% (0 -> 70)
  if (rand < 72) return "convo_toi";      // 2%  (70 -> 72)
  if (rand < 82) return "senpai_em";      // 10% (72 -> 82)
  return "thay_em";                       // 18% (82 -> 100)
}

/**
 * Điều chỉnh ngôi xưng trong câu hỏi mở đầu phù hợp với phong cách persona
 */
export function formatQuestionForPersona(text: string, style: PersonaStyleId): string {
  if (style === "ban_minh") return text;

  let formatted = text;

  if (style === "convo_toi") {
    formatted = formatted
      .replace(/^Chào bạn!\s*/i, "Alo con vợ! ")
      .replace(/Chào bạn!/g, "Alo con vợ!")
      .replace(/\bMình\b/g, "Tôi")
      .replace(/\bmình\b/g, "tôi")
      .replace(/\bbạn\b/g, "con vợ")
      .replace(/\bBạn\b/g, "Con vợ")
      .replace(/\b(tôi|Tôi)\s+(tôi|Tôi)\b/g, "$1");
  } else if (style === "senpai_em") {
    formatted = formatted
      .replace(/^Chào bạn!\s*/i, "Konnichiwa senpai! ")
      .replace(/Chào bạn!/g, "Em chào senpai!")
      .replace(/\bMình\b/g, "Em")
      .replace(/\bmình\b/g, "em")
      .replace(/\bbạn\b/g, "senpai")
      .replace(/\bBạn\b/g, "Senpai")
      .replace(/(\?|!|\.)(\s*)$/, " ạ?$2")
      .replace(/\b(em|Em)\s+(em|Em)\b/g, "$1");
  } else if (style === "thay_em") {
    formatted = formatted
      .replace(/^Chào bạn!\s*/i, "Dạ em chào thầy! ")
      .replace(/Chào bạn!/g, "Dạ em chào thầy!")
      .replace(/\bMình\b/g, "Em")
      .replace(/\bmình\b/g, "em")
      .replace(/\bbạn\b/g, "thầy")
      .replace(/\bBạn\b/g, "Thầy")
      .replace(/(\?|!|\.)(\s*)$/, " ạ?$2")
      .replace(/\b(em|Em)\s+(em|Em)\b/g, "$1");
  }

  return formatted;
}

export async function speak(input: Stage2Input): Promise<string> {
  const styleId = input.persona_style ?? "ban_minh";
  const style = PERSONA_STYLES[styleId] ?? PERSONA_STYLES.ban_minh;

  const system = `Bạn đóng vai một ${style.roleDescription} đang được người khác giảng bài cho.
Bạn KHÔNG phải giáo viên, KHÔNG phải trợ giảng, KHÔNG được chấm điểm ai.

${style.instruction}
Độ dài: 1-2 câu, luôn kết thúc bằng một câu hỏi.

Luật cứng:
- Bạn THỰC SỰ không biết đáp án. Không được giảng lại, không được gợi ý đáp án,
  không được xác nhận "đúng rồi" với nội dung chuyên môn.
- Không khen chê, không cho điểm, không nói kiểu người đi kiểm tra bài.
- Chuyển tiếp tự nhiên: Nếu ${style.learnerPronoun} vừa trả lời hoặc giải thích điều gì ở câu trước, hãy mở đầu bằng 1 vế ngắn thể hiện vỡ lẽ/tiếp thu tự nhiên (ví dụ: "À ra là vậy...", "Dạ em hiểu rồi ạ...", "Thì ra là thế..."), sau đó mới hỏi câu tiếp theo. Tránh nhảy chủ đề quá đột ngột hoặc dùng đại từ mơ hồ như "các khái niệm này" khi chưa được nhắc tới trong ngữ cảnh.
- Chỉ hỏi đúng câu được giao, diễn đạt lại bằng giọng của bạn cho tự nhiên.`;

  const learnerLabel =
    style.learnerPronoun === "thầy"
      ? "Thầy"
      : style.learnerPronoun === "senpai"
      ? "Senpai"
      : style.learnerPronoun === "con vợ"
      ? "Con vợ"
      : "Người dạy";
  const agentLabel =
    style.agentPronoun === "tôi"
      ? "Tôi"
      : style.agentPronoun === "em"
      ? "Em"
      : "Bạn";

  const historyText = input.history
    .slice(-4)
    .map((h) => `${h.role === "student" ? learnerLabel : agentLabel}: ${h.text}`)
    .join("\n");

  const prompt = `Đoạn hội thoại gần đây:
${historyText || "(chưa có)"}

${input.misconception_hint ? `Bạn thấy ${style.learnerPronoun} đang hiểu nhầm chỗ này: ${input.misconception_hint}\n` : ""}
Câu bạn cần hỏi (diễn đạt lại bằng giọng của bạn, xưng "${style.agentPronoun}" và gọi "${style.learnerPronoun}", giữ nguyên ý, đừng thêm kiến thức gì):
"""${input.probe_question}"""

Viết 1-2 câu, đúng phong cách và đại từ xưng hô, có phản ứng tiếp thu/vỡ lẽ ngắn gọn nếu ${style.learnerPronoun} vừa trả lời, kết thúc bằng câu hỏi.`;

  return (await callText(prompt, { model: MODEL_PERSONA, temperature: 0.8, system })).trim();
}
