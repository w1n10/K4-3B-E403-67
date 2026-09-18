// Phát hiện học viên bị kẹt: nhắc xem slide, rồi nếu vẫn không tiến bộ thì dừng phiên.
// Thuần code, không gọi AI — để hành vi này đo được và không tốn token.
//
// Một lượt gọi là "không tiến bộ" nếu:
//   - Stage 0 chặn vì low_effort ("không biết", "chịu", để trống…), hoặc
//   - lượt được chấm nhưng không nói được Ý mà câu hỏi lượt trước nhắm vào.
// Lượt bị chặn vì lý do khác (dán nguyên văn, hỏi ngược) là trung tính.

import type { ChecklistItem, PersonaStyleId, Stage0Verdict, Topic, TurnRecord } from "./types";

export const HINT_AT = 3; // không tiến bộ liên tiếp lần 3 -> nhắc xem slide
export const END_AT = 5; // nhắc rồi vẫn không tiến bộ thêm 2 lần -> dừng phiên

/**
 * Verdict Stage 0 tính là "không tiến bộ": lượt đó KHÔNG có nội dung nào để chấm.
 *   - low_effort   : "không biết", "chịu", câu quá ngắn
 *   - short_affirm : "ok", "đúng rồi" — gật đầu nhưng chưa giải thích gì
 *   - short_negate : "ko", "không"    — phủ nhận nhưng chưa giải thích gì
 *
 * verbatim_copy và asked_ai là TRUNG TÍNH: học viên vẫn đang tương tác, chỉ sai cách.
 */
const NO_PROGRESS: readonly Stage0Verdict[] = ["low_effort", "short_affirm", "short_negate"];

export function isNoProgress(verdict: Stage0Verdict | null | undefined): boolean {
  return !!verdict && NO_PROGRESS.includes(verdict);
}

/** Số lượt "không tiến bộ" liên tiếp ở cuối phiên. */
export function noProgressStreak(turns: TurnRecord[], initialTarget?: string): number {
  let streak = 0;
  let openTarget: string | undefined = initialTarget;

  for (const t of turns) {
    if (isNoProgress(t.stage0_verdict)) {
      streak += 1;
      continue; // không có lượt chấm mới nên openTarget giữ nguyên
    }
    if (!t.stage1_json || t.stage2_reply?.startsWith("[STAGE")) continue; // chặn vì lý do khác / lỗi: trung tính

    const covered = t.stage1_json.covered.map((c) => c.id);
    if (openTarget && !covered.includes(openTarget)) streak += 1;
    else streak = 0;
    openTarget = t.stage1_json.next_probe?.target;
  }

  return streak;
}

/** Ý mà agent đã hỏi ở lượt chấm gần nhất — chỗ học viên đang kẹt. */
export function lastProbedTarget(turns: TurnRecord[]): string | undefined {
  return [...turns].reverse().find((t) => t.stage1_json)?.stage1_json?.next_probe?.target;
}

/**
 * Chọn Ý để nhắc xem lại.
 * Ưu tiên Ý đang kẹt thật (id truyền vào). Nếu chưa có lượt nào được chấm
 * (học viên bỏ cuộc ngay từ đầu) thì lấy Ý chưa giảng được, ưu tiên Ý có slide
 * để luôn có chỗ mở tới.
 */
export function pickReviewTarget(
  topic: Topic,
  coveredIds: string[],
  ...ids: (string | undefined)[]
): ChecklistItem | undefined {
  for (const id of ids) {
    const hit = id ? topic.items.find((i) => i.id === id) : undefined;
    if (hit) return hit;
  }
  const uncovered = topic.items.filter((i) => !coveredIds.includes(i.id));
  return uncovered.find((i) => i.slide_page) ?? uncovered[0] ?? topic.items[0];
}

/** Chỗ cần xem lại: slide của Ý, hoặc đoạn transcript nếu Ý không nằm trong bộ slide. */
function reviewRef(topic: Topic, item: ChecklistItem | undefined): string {
  if (item?.slide_page) {
    return item.slide_title
      ? `slide ${item.slide_page} ("${item.slide_title}")`
      : `slide ${item.slide_page}`;
  }
  return item ? `bài giảng, đoạn ${item.source}` : "lại bài giảng";
}

/**
 * Câu mời học viên xem lại bài giảng — lịch sự, không trách móc,
 * KHÔNG nêu nội dung của Ý nên không lộ đáp án.
 */
export function getReviewHint(
  topic: Topic,
  item: ChecklistItem | undefined,
  style: PersonaStyleId = "ban_minh"
): string {
  const ref = reviewRef(topic, item);

  switch (style) {
    case "convo_toi":
      return `Không sao đâu con vợ, phần này khó thật. Con vợ mở lại ${ref} đọc kỹ rồi kể lại cho tôi nghe nha.`;
    case "senpai_em":
      return `Senpai đừng lo ạ, phần này khó thật. Senpai mở lại ${ref} xem kỹ rồi giảng lại cho em nha.`;
    case "thay_em":
      return `Dạ không sao đâu thầy, phần này khó thật ạ. Thầy xem lại ${ref} rồi giảng lại cho em nhé ạ.`;
    default:
      return `Không sao đâu, phần này khó thật. Bạn mở lại ${ref} đọc kỹ rồi giảng lại cho mình nha.`;
  }
}

/** Câu khép phiên khi đã nhắc xem slide mà học viên vẫn không tiến bộ. */
export function getWrapUp(style: PersonaStyleId = "ban_minh"): string {
  switch (style) {
    case "convo_toi":
      return "Thôi mình tạm dừng ở đây nha con vợ. Con vợ xem phần tổng kết rồi bữa khác làm lại với tôi hen.";
    case "senpai_em":
      return "Em xin phép tạm dừng ở đây ạ. Senpai xem phần tổng kết rồi hôm khác thử lại nha ạ.";
    case "thay_em":
      return "Dạ thầy cho em xin phép tạm dừng ở đây ạ. Thầy xem phần tổng kết rồi khi khác thử lại nhé ạ.";
    default:
      return "Mình tạm dừng phiên ở đây nhé. Bạn xem phần tổng kết rồi khi nào sẵn sàng thì thử lại nha.";
  }
}
