/**
 * Stage 1: Evaluator (AI call · temperature = 0)
 * 
 * Nhiệm vụ:
 * 1. So khớp lời giải thích của học viên với Checklist kiến thức (semantic evaluation).
 * 2. Hỗ trợ Paraphrase: chỉ xét Ý, không xét Chữ. Học viên dùng cách nói bình dân,
 *    ẩn dụ, ví dụ thực tế mà đúng bản chất thì vẫn tính là covered.
 * 3. Trích xuất evidence NGUYÊN VĂN từ lời học viên (bảo đảm tính kiểm chứng).
 * 4. Phát hiện các quan niệm sai lầm (misconceptions).
 * 5. Bọc lớp bảo vệ chống Hallucination (Code validation check evidence in student_text).
 * 
 * Tác giả: Hiếu
 */

export interface TopicChecklistItem {
  id: string;
  label: string;
  source: string;
  curiosity_hook?: string;
  keywords?: string[];
}

export interface TopicMisconception {
  id: string;
  label: string;
  evidence_turn_ids?: string[];
  note?: string;
}

export interface TopicContent {
  topic_id: string;
  title: string;
  source_lecture: string;
  items: TopicChecklistItem[];
  misconceptions: TopicMisconception[];
  excerpts: Record<string, string>;
}

export interface CoveredItem {
  id: string;
  evidence: string;
}

export interface MisconceptionDetected {
  id: string;
  student_said: string;
  source?: string;
}

export interface EvaluatorOutput {
  covered: CoveredItem[];
  missing: string[];
  misconception: MisconceptionDetected[];
  paraphrase_ok: boolean;
  coverage: number;
}

/**
 * Xây dựng prompt cho Evaluator
 * Yêu cầu mô hình trả về đúng JSON theo Schema quy định
 */
export function buildEvaluatorPrompt(
  studentText: string,
  topic: TopicContent,
  alreadyCoveredIds: string[] = []
): string {
  const checklistFormat = topic.items.map(item => {
    const isAlreadyCovered = alreadyCoveredIds.includes(item.id);
    const statusNote = isAlreadyCovered ? " (ĐÃ ĐƯỢC PHỦ Ở CÁC LƯỢT TRƯỚC)" : "";
    return `  - [${item.id}]: "${item.label}" (Nguồn tham chiếu: ${item.source})${statusNote}`;
  }).join("\n");

  const misconceptionsFormat = topic.misconceptions.map(m => {
    return `  - [${m.id}]: "${m.label}"`;
  }).join("\n");

  return `Bạn là một chuyên gia sư phạm đánh giá khách quan và khắt khe nhưng thấu hiểu tư duy người học.
Nhiệm vụ của bạn là đối chiếu lời giải thích của học viên về chủ đề: "${topic.title}" với Checklist kiến thức chuẩn.

### BẢNG CHECKLIST KIẾN THỨC MỤC TIÊU:
${checklistFormat}

### CÁC QUAN NIỆM SAI LẦM PHỔ BIẾN (MISCONCEPTIONS):
${misconceptionsFormat}

### LỜI GIẢI THÍCH CỦA HỌC VIÊN:
"""
${studentText}
"""

### CÁC QUY TẮC ĐÁNH GIÁ BẮT BUỘC (TUYỆT ĐỐI TUÂN THỦ):
1. **NGUYÊN TẮC PARAPHRASE (CỐT LÕI):** 
   - Đánh giá theo Ý NGHĨA và BẢN CHẤT KHÁI NIỆM, KHÔNG bắt bẻ câu chữ hay so khớp từ vựng.
   - Nếu học viên dùng ví dụ thực tế, ẩn dụ (metaphor), hoặc diễn đạt bằng ngôn ngữ đời thường nhưng thể hiện đúng ý nghĩa của mục checklist -> BẮT BUỘC công nhận là "covered".
   - Ngược lại, nếu học viên chỉ lặp lại vài từ khóa chuyên môn nhưng diễn đạt sai bản chất hoặc mơ hồ -> KHÔNG tính covered.

2. **NGUYÊN TẮC EVIDENCE NGUYÊN VĂN (CHỐNG BỊA):**
   - Trường "evidence" của mỗi mục covered BẮT BUỘC phải là một ĐOẠN TRÍCH NGUYÊN VĂN (exact substring) lấy từ chính lời của học viên ở trên.
   - Tuyệt đối KHÔNG được tóm tắt, không chỉnh sửa, không tự thêm thắt từ ngữ vào "evidence".

3. **DANH SÁCH MISSING:**
   - Trường "missing" phải chứa danh sách tất cả các ID mục checklist (K1, K2,...) chưa được giải thích hoặc giải thích chưa đạt yêu cầu trong lượt này lẫn các lượt trước.

4. **PHÁT HIỆN MISCONCEPTION:**
   - Nếu trong lời giải thích, học viên thể hiện một quan niệm sai lầm trùng với danh sách MISCONCEPTIONS ở trên, hãy thêm vào mảng "misconception" kèm câu học viên đã nói ("student_said").

5. **ĐỊNH DẠNG ĐẦU RA:**
   - BẮT BUỘC CHỈ trả về đúng 1 JSON object hợp lệ, KHÔNG có lời chào, không giải thích ngoài JSON.
   - Schema JSON bắt buộc:
{
  "covered": [
    { "id": "K1", "evidence": "trích nguyên văn câu học viên nói" }
  ],
  "missing": ["K2", "K3"],
  "misconception": [
    { "id": "M1", "student_said": "trích câu học viên hiểu sai" }
  ],
  "paraphrase_ok": true,
  "coverage": 0.2
}`;
}

/**
 * Làm sạch chuỗi phản hồi từ LLM và parse JSON an toàn
 */
export function cleanAndParseJson<T>(rawText: string): T {
  let cleaned = rawText.trim();
  // Loại bỏ markdown code fences: ```json ... ``` hoặc ``` ... ```
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/, "");
    cleaned = cleaned.trim();
  }

  // Tìm vị trí JSON object đầu tiên nếu có ký tự thừa
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned) as T;
}

/**
 * Kiểm tra và bảo vệ tính toàn vẹn của kết quả đánh giá (Evidence Integrity Assertion)
 * Loại bỏ các covered items nếu LLM hallucinate ra evidence không có trong câu học viên.
 */
export function validateAndSanitizeEvaluatorOutput(
  rawParsed: Partial<EvaluatorOutput>,
  studentText: string,
  topic: TopicContent,
  alreadyCoveredIds: string[] = []
): EvaluatorOutput {
  const normalizedStudentText = studentText.toLowerCase().replace(/\s+/g, ' ');
  const validChecklistIds = new Set(topic.items.map(i => i.id));
  const verifiedCovered: CoveredItem[] = [];
  const coveredIdSet = new Set<string>(alreadyCoveredIds);

  // 1. Kiểm chứng từng item trong covered
  if (Array.isArray(rawParsed.covered)) {
    for (const item of rawParsed.covered) {
      if (!item.id || !validChecklistIds.has(item.id)) continue;

      const evidence = (item.evidence || '').trim();
      const normalizedEvidence = evidence.toLowerCase().replace(/\s+/g, ' ');

      // Kiểm tra xem evidence có thật sự nằm trong studentText không
      const isEvidencePresent = normalizedEvidence.length > 0 && 
        (normalizedStudentText.includes(normalizedEvidence) || normalizedEvidence.includes(normalizedStudentText));

      if (isEvidencePresent) {
        verifiedCovered.push({ id: item.id, evidence });
        coveredIdSet.add(item.id);
      } else {
        console.warn(`[Evaluator Warning] Loại bỏ item ${item.id} vì evidence không có trong lời học viên: "${evidence}"`);
      }
    }
  }

  // 2. Tính toán danh sách missing chuẩn xác
  const missing = topic.items
    .map(i => i.id)
    .filter(id => !coveredIdSet.has(id));

  // 3. Xử lý misconception
  const verifiedMisconceptions: MisconceptionDetected[] = [];
  if (Array.isArray(rawParsed.misconception)) {
    for (const m of rawParsed.misconception) {
      if (m.id && m.student_said) {
        const itemConfig = topic.misconceptions.find(tm => tm.id === m.id);
        verifiedMisconceptions.push({
          id: m.id,
          student_said: m.student_said,
          source: itemConfig?.label || m.source
        });
      }
    }
  }

  // 4. Tính toán coverage
  const totalCount = topic.items.length;
  const coverage = totalCount > 0 ? Number((coveredIdSet.size / totalCount).toFixed(2)) : 0;

  return {
    covered: verifiedCovered,
    missing,
    misconception: verifiedMisconceptions,
    paraphrase_ok: rawParsed.paraphrase_ok ?? true,
    coverage
  };
}

/**
 * Hàm thực thi toàn bộ luồng đánh giá Stage 1
 * 
 * @param studentText Lời giải thích của học viên
 * @param topic Toàn bộ checklist & metadata của chủ đề
 * @param llmCaller Hàm gọi model AI (Dương triển khai qua lib/llm.ts), bắt buộc temperature = 0
 * @param alreadyCoveredIds Danh sách các ID kiến thức đã được học viên làm rõ ở các lượt trước
 */
export async function evaluateStudentExplanation(
  studentText: string,
  topic: TopicContent,
  llmCaller: (prompt: string, options: { temperature: number }) => Promise<string>,
  alreadyCoveredIds: string[] = []
): Promise<EvaluatorOutput> {
  const prompt = buildEvaluatorPrompt(studentText, topic, alreadyCoveredIds);

  // Bắt buộc gọi với temperature = 0 để bảo đảm tính tất định (deterministc) cho Golden Set
  const rawResponse = await llmCaller(prompt, { temperature: 0 });

  try {
    const parsed = cleanAndParseJson<Partial<EvaluatorOutput>>(rawResponse);
    return validateAndSanitizeEvaluatorOutput(parsed, studentText, topic, alreadyCoveredIds);
  } catch (err) {
    console.error("[Stage 1 Evaluator Error] Không parse được JSON từ phản hồi LLM:", rawResponse, err);
    // Fallback an toàn nếu LLM trả về chuỗi dị thường
    return {
      covered: [],
      missing: topic.items.map(i => i.id).filter(id => !alreadyCoveredIds.includes(id)),
      misconception: [],
      paraphrase_ok: false,
      coverage: Number((alreadyCoveredIds.length / topic.items.length).toFixed(2))
    };
  }
}
