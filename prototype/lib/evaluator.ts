/**
 * STAGE 1: EVALUATOR (AI Call - Temperature: 0)
 * Người sở hữu: Khôi
 * 
 * Nhiệm vụ: So khớp lời giải thích của học viên với Checklist kiến thức.
 * Yêu cầu nghiêm ngặt:
 * - Nhiệt độ = 0 để đảm bảo tính tái lập (Golden set)
 * - Evidence phải là trích nguyên văn câu học viên nói
 * - Paraphrase_ok = true nếu nói đúng ý nhưng khác từ ngữ trong tài liệu
 */

export interface ChecklistItem {
  id: string;
  label: string;
  source: string;
}

export interface MisconceptionItem {
  id: string;
  label: string;
}

export interface EvaluatorInput {
  student_text: string;
  checklist: ChecklistItem[];
  misconceptions: MisconceptionItem[];
  currently_covered: string[];
}

export interface EvaluatorOutput {
  covered: Array<{
    id: string;
    evidence: string;
  }>;
  missing: string[];
  misconception: Array<{
    id: string;
    student_said: string;
    source: string;
  }>;
  paraphrase_ok: boolean;
  coverage: number;
}

export const STAGE1_SYSTEM_PROMPT = `
Bạn là AI Evaluator khách quan và chặt chẽ trong hệ thống giáo dục.
Nhiệm vụ: Đối chiếu lời giải thích của học viên với Checklist các ý kiến thức cốt lõi.

QUY TẮC BẮT BUỘC:
1. Chỉ đánh dấu một mục là "covered" khi học viên THỰC SỰ diễn đạt đúng bản chất của ý đó.
2. Học viên dùng từ ngữ khác tài liệu nhưng đúng ý thì VẪN TÍNH covered (paraphrase_ok = true).
3. Field "evidence" BẮT BUỘC trích nguyên văn câu/vế câu mà học viên đã nói, TUYỆT ĐỐI KHÔNG tóm tắt hay bịa thêm.
4. Phát hiện nếu học viên thể hiện các hiểu sai (misconceptions) được liệt kê.
5. Chỉ trả về duy nhất định dạng JSON đúng schema sau:
{
  "covered": [{ "id": "K1", "evidence": "trích nguyên văn lời học viên" }],
  "missing": ["K2", "K3"],
  "misconception": [{ "id": "M1", "student_said": "trích lời", "source": "T06-xxx" }],
  "paraphrase_ok": true,
  "coverage": 0.5
}
`;
