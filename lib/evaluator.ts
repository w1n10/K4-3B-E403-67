// STAGE 1 · EVALUATOR — tầng DUY NHẤT được nhìn thấy đáp án.
// temperature = 0 là bắt buộc: golden set phải ra cùng kết quả giữa các lần chạy,
// nếu không thì số đo CP3 vô nghĩa.

import { callJSON, MODEL_EVALUATOR } from "./llm";
import type { Stage1Output, Topic } from "./types";

export const PROMPT_VERSION = "eval-v2";

function buildPrompt(
  text: string,
  topic: Topic,
  coveredIds: string[],
  history: string[],
  currentTarget?: string
): string {
  const remaining = topic.items.filter((i) => !coveredIds.includes(i.id));
  const targetItem = currentTarget ? topic.items.find((i) => i.id === currentTarget) : undefined;

  return `Bạn là bộ chấm của một hệ thống học tập. Học viên đang DẠY LẠI một khái niệm cho agent.
Nhiệm vụ: đối chiếu lời giải thích của học viên với checklist kiến thức, rồi soạn câu hỏi moi tiếp.

${targetItem ? `## Câu hỏi của Agent ở lượt trước đang nhắm vào Ý mục tiêu:
- ${targetItem.id}: ${targetItem.label}  [nguồn ${targetItem.source}]
(Chú ý: đây là câu hỏi mà Agent vừa đặt ra và đang đợi học viên giải thích!)\n` : ""}
## Checklist các Ý còn thiếu
${remaining.map((i) => `- ${i.id}: ${i.label}  [nguồn ${i.source}]`).join("\n")}

## Các Ý học viên đã nói đúng ở lượt trước (đừng chấm lại)
${coveredIds.length ? coveredIds.join(", ") : "(chưa có)"}

## Hiểu lầm thường gặp cần phát hiện
${topic.misconceptions.map((m) => `- ${m.id}: ${m.label}`).join("\n")}

## Tài liệu gốc (để đối chiếu, KHÔNG dùng để chấm câu chữ)
${Object.entries(topic.excerpts).map(([k, v]) => `[${k}] ${v}`).join("\n")}

## Vài lượt gần nhất
${history.length ? history.join("\n") : "(đây là lượt đầu)"}

## Lời giải thích của học viên ở lượt này
"""${text}"""

## Luật chấm
1. Học viên diễn đạt KHÁC tài liệu nhưng ĐÚNG Ý thì vẫn tính là covered. Chấm Ý, không chấm câu chữ.
2. "evidence" phải trích NGUYÊN VĂN một đoạn học viên vừa viết, không được tóm tắt lại.
3. Chỉ đưa vào "covered" những Ý học viên thực sự nói ra, không suy diễn hộ.
4. QUY TẮC QUAN TRỌNG VỀ "next_probe":
${targetItem ? `   - Nếu học viên CHƯA giải thích đúng Ý mục tiêu "${targetItem.id}" (kể cả khi học viên nói đúng một Ý khác trong checklist):
     BẮT BUỘC "next_probe.target" PHẢI LÀ "${targetItem.id}"! TUYỆT ĐỐI KHÔNG ĐƯỢC tự ý nhảy sang hỏi Ý khác.
     "next_probe.question" phải tiếp tục hỏi sâu, gợi mở hoặc kéo học viên quay lại trả lời Ý "${targetItem.id}".
     (Nếu học viên vừa nói đúng một ý khác, hãy ghi nhận ý đó vào "covered", nhưng câu hỏi tiếp theo phải nhắc học viên trả lời câu hỏi còn dang dở về "${targetItem.id}").
   - CHỈ KHI học viên ĐÃ giải thích đúng Ý "${targetItem.id}" (được đưa vào "covered"), thì "next_probe.target" mới được chuyển sang một Ý còn thiếu khác trong checklist.` : `   - "next_probe.question" là CÂU HỎI nhắm vào chỗ hổng lớn nhất, viết trung tính, diễn đạt rõ ràng mạch lạc (không dùng đại từ mơ hồ như "các khái niệm này", "những điều trên" khi chưa được nhắc đến trong hội thoại).`}
5. "next_probe.question" TUYỆT ĐỐI không được chứa đáp án hay gợi ý quá rõ. Nếu câu hỏi bạn soạn có lộ đáp án thì đặt "leaks_answer": true và viết lại câu khác.
6. Nếu học viên mắc hiểu lầm, ưu tiên nhắm next_probe vào việc gỡ hiểu lầm đó trước.

Trả về DUY NHẤT một object JSON đúng schema:
{
  "covered": [{"id": "K1", "evidence": "trích nguyên văn lời học viên"}],
  "missing": ["K2", "K3"],
  "misconception": [{"id": "M1", "student_said": "trích nguyên văn", "source": "T06-136"}],
  "paraphrase_ok": true,
  "next_probe": {"target": "${targetItem ? targetItem.id : "K2"}", "question": "...", "leaks_answer": false}
}`;
}

export async function evaluate(
  text: string,
  topic: Topic,
  coveredIds: string[],
  history: string[] = [],
  currentTarget?: string
): Promise<Stage1Output> {
  const out = await callJSON<Omit<Stage1Output, "coverage">>(
    buildPrompt(text, topic, coveredIds, history, currentTarget),
    { model: MODEL_EVALUATOR, temperature: 0 }
  );

  // coverage tính bằng code, không để model tự tính — nó đếm sai thường xuyên.
  const allCovered = new Set([...coveredIds, ...(out.covered ?? []).map((c) => c.id)]);
  return {
    covered: out.covered ?? [],
    missing: out.missing ?? [],
    misconception: out.misconception ?? [],
    paraphrase_ok: out.paraphrase_ok ?? true,
    next_probe: out.next_probe,
    coverage: allCovered.size / topic.items.length,
  };
}
