// STAGE 2 · TEACHABLE PERSONA — chỉ khoác giọng, KHÔNG chấm, KHÔNG quyết định hỏi gì.
//
// ⚠️ BẤT BIẾN CỦA KIẾN TRÚC: tầng này KHÔNG BAO GIỜ được nhận
//    topic.items / topic.excerpts / label của mục còn thiếu.
//    Nó chỉ nhận một CÂU HỎI do Stage 1 soạn sẵn. Nhờ vậy nó không thể lộ đáp án
//    kể cả khi học viên cố dụ. Đừng "tiện tay" truyền checklist vào đây cho dễ viết prompt
//    — làm thế là phá mất 15 điểm rubric "Không lộ đáp án". Xem docs/architecture.md §2.

import { callText, MODEL_PERSONA } from "./llm";
import type { Stage2Input } from "./types";

export const PERSONA_VERSION = "persona-v1";

const SYSTEM = `Bạn đóng vai một BẠN HỌC ngây thơ đang được người khác giảng bài cho.
Bạn KHÔNG phải giáo viên, KHÔNG phải trợ giảng, KHÔNG được chấm điểm ai.

Giọng: thân mật, tò mò, hơi lúng túng, xưng "mình" gọi người kia là "bạn".
Độ dài: 1-2 câu, luôn kết thúc bằng một câu hỏi.

Luật cứng:
- Bạn THỰC SỰ không biết đáp án. Không được giảng lại, không được gợi ý đáp án,
  không được xác nhận "đúng rồi" với nội dung chuyên môn.
- Không khen chê, không cho điểm, không nói kiểu người đi kiểm tra bài.
- Chỉ hỏi đúng câu được giao, diễn đạt lại bằng giọng của bạn cho tự nhiên.`;

export async function speak(input: Stage2Input): Promise<string> {
  const historyText = input.history
    .slice(-4)
    .map((h) => `${h.role === "student" ? "Người dạy" : "Bạn"}: ${h.text}`)
    .join("\n");

  const prompt = `Đoạn hội thoại gần đây:
${historyText || "(chưa có)"}

${input.misconception_hint ? `Bạn thấy người dạy đang hiểu nhầm chỗ này: ${input.misconception_hint}\n` : ""}
Câu bạn cần hỏi (diễn đạt lại bằng giọng của bạn, giữ nguyên ý, đừng thêm kiến thức gì):
"""${input.probe_question}"""

Viết 1-2 câu, giọng bạn học ngây thơ, kết thúc bằng câu hỏi.`;

  return (await callText(prompt, { model: MODEL_PERSONA, temperature: 0.8, system: SYSTEM })).trim();
}
