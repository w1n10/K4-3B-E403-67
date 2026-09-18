// Hợp đồng dữ liệu giữa các tầng — xem docs/architecture.md §3.
// Ai sửa file này phải báo cả nhóm: đây là ranh giới giữa các phần việc.

export type ChecklistItem = {
  id: string;            // K1..K7
  label: string;         // một Ý, không phải câu chữ trong tài liệu
  source: string;        // mã đoạn transcript, vd T06-136
  keywords?: string[];
};

export type Misconception = {
  id: string;            // M1..M3
  label: string;
  evidence_turn_ids?: string[];
  note?: string;
};

export type Topic = {
  topic_id: string;
  title: string;
  source_lecture: string;
  starter_questions?: string[];
  items: ChecklistItem[];
  misconceptions: Misconception[];
  excerpts: Record<string, string>;
};

// ---------- STAGE 0 ----------

export type Stage0Verdict = "verbatim_copy" | "asked_ai" | "low_effort";

export type Stage0Result =
  | { blocked: false }
  | { blocked: true; verdict: Stage0Verdict; reply: string };

// ---------- STAGE 1 ----------

export type Stage1Output = {
  covered: { id: string; evidence: string }[];   // evidence = trích NGUYÊN VĂN lời học viên
  missing: string[];
  misconception: { id: string; student_said: string; source?: string }[];
  paraphrase_ok: boolean;
  coverage: number;
  next_probe: {
    target: string;        // mã mục đang nhắm, vd "K2"
    question: string;      // CÂU HỎI trung tính — không được chứa đáp án
    leaks_answer: boolean; // Stage 1 tự kiểm: câu hỏi trên có lộ đáp án không
  };
};

// ---------- STAGE 2 ----------
// Chỉ nhận bấy nhiêu. KHÔNG có items, KHÔNG có excerpts, KHÔNG có label mục thiếu.
// Đáp án không bao giờ rời khỏi Stage 1 — xem docs/architecture.md §2.

export type PersonaStyleId = "ban_minh" | "convo_toi" | "senpai_em" | "thay_em";

export type Stage2Input = {
  history: { role: "student" | "agent"; text: string }[];
  probe_question: string;
  misconception_hint?: string;
  turn_index: number;
  persona_style?: PersonaStyleId;
};

// ---------- LƯU PHIÊN ----------

export type ExitReason = "completed" | "gave_up" | "turn_cap";

export type TurnRecord = {
  turn_index: number;
  student_text: string;
  stage0_verdict: Stage0Verdict | null;
  stage1_json: Stage1Output | null;
  stage2_reply: string;
  covered_after: string[];
  latency_ms: number;
};

export type SessionRecord = {
  id: string;
  tester_code: string;
  topic_id: string;
  model: string;
  prompt_version: string;
  started_at: string;
  ended_at: string | null;
  final_coverage: number | null;
  exit_reason: ExitReason | null;
};

export type SessionWithTurns = SessionRecord & { turns: TurnRecord[] };
