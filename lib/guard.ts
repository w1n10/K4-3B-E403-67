/**
 * Stage 0: Guardrail (Code thuần - 0 token)
 * 
 * Nhiệm vụ: Chặn ngay các input vi phạm phổ biến trước khi gọi AI:
 * 1. asked_ai: Đòi đáp án, hỏi ngược lại bot mà không giải thích
 * 2. low_effort: Trả lời cụt lủn, bỏ cuộc, < 5 từ vô nghĩa
 * 3. verbatim_copy: Copy-paste nguyên văn từ tài liệu (trùng >= 10 từ liên tiếp)
 * 
 * Tác giả: Hiếu
 */

export type Stage0Rule = 'verbatim_copy' | 'asked_ai' | 'low_effort';

export interface Stage0Result {
  triggered: boolean;
  rule: Stage0Rule | null;
  reply: string | null;
}

export interface GuardrailOptions {
  excerpts?: Record<string, string> | string[];
  minWords?: number; // Mặc định: 5 từ
  nGramVerbatimThreshold?: number; // Mặc định: 10 từ liên tiếp
}

// Danh sách các cụm từ thể hiện sự bỏ cuộc / không muốn trả lời
const GIVE_UP_PHRASES = [
  'không biết', 'ko bit', 'k bit', 'ko biết', 'k biết',
  'chịu', 'chịu thôi', 'chịu rồi', 'chịu thua',
  'bỏ qua', 'pass', 'skip',
  'hổng biết', 'không rõ', 'ko rõ', 'chưa biết',
  'không nhớ', 'quên rồi', 'chả biết'
];

// Regex bắt ý đồ đòi đáp án / ép agent giải thích hộ
const ASKED_AI_PATTERNS = [
  /(?:nói|chỉ|cho)\s+(?:luôn|hộ|giùm|ngay)?\s*(?:đáp án|câu trả lời)/i,
  /(?:đáp án|câu trả lời)\s+(?:là gì|đâu)/i,
  /(?:nói|giải thích|chỉ)\s+(?:luôn|cho mình|hộ mình)\s*đi/i,
  /(?:sao|tại sao|vì sao)\s+bạn\s+không\s+(?:nói|giải thích|chỉ)/i,
  /bạn\s+(?:nói|giải thích|trả lời)\s+đi/i,
  /thế\s+tóm lại\s+(?:là gì|như nào|ra sao)/i,
  /thôi\s+bạn\s+nói\s+đi/i,
];

/**
 * Chuẩn hóa chuỗi văn bản: xóa dấu câu đặc biệt, đưa về chữ thường, chuẩn hóa khoảng trắng
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tách văn bản thành danh sách từ
 */
export function extractWords(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

/**
 * Kiểm tra xem studentText có trùng >= N từ liên tiếp với excerpts hay không
 */
export function checkVerbatimCopy(
  studentText: string,
  excerpts?: Record<string, string> | string[],
  threshold = 10
): boolean {
  if (!excerpts) return false;

  const studentWords = extractWords(studentText);
  if (studentWords.length < threshold) return false;

  // Thu thập toàn bộ văn bản excerpts thành 1 chuỗi chuẩn hóa
  const rawExcerptList = Array.isArray(excerpts)
    ? excerpts
    : Object.values(excerpts);

  const normalizedExcerpts = rawExcerptList
    .map(e => normalizeText(e))
    .join(' ');

  if (!normalizedExcerpts) return false;

  // Quét sliding window N từ liên tiếp của studentText
  for (let i = 0; i <= studentWords.length - threshold; i++) {
    const phrase = studentWords.slice(i, i + threshold).join(' ');
    if (normalizedExcerpts.includes(phrase)) {
      return true;
    }
  }

  return false;
}

/**
 * Kiểm tra xem người học có đang đòi đáp án mà không đưa ra lời giải thích không
 */
export function checkAskedAi(studentText: string): boolean {
  const trimmed = studentText.trim();
  const words = extractWords(trimmed);

  // Khớp trực tiếp các regex đòi đáp án
  for (const pattern of ASKED_AI_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  // Câu kết thúc bằng dấu '?' và rất ngắn (< 8 từ) mà mang tính chất hỏi ngược
  if (trimmed.endsWith('?') && words.length < 8) {
    const questionKeywords = ['sao', 'gì', 'sao thế', 'thế nào', 'sao vậy', 'hả', 'chưa'];
    const hasQuestionKw = questionKeywords.some(kw => trimmed.toLowerCase().includes(kw));
    // Nếu chỉ hỏi cộc lốc mà không có mệnh đề giải thích
    if (hasQuestionKw) {
      return true;
    }
  }

  return false;
}

/**
 * Kiểm tra xem người học có trả lời quá hời hợt hoặc bỏ cuộc không
 */
export function checkLowEffort(studentText: string, minWords = 5): boolean {
  const normalized = normalizeText(studentText);
  const words = extractWords(studentText);

  // 1. Quá ít từ
  if (words.length < minWords) {
    return true;
  }

  // 2. Chứa cụm từ đầu hàng / bỏ cuộc
  for (const phrase of GIVE_UP_PHRASES) {
    if (normalized === phrase || normalized.startsWith(phrase + ' ') || normalized.endsWith(' ' + phrase)) {
      return true;
    }
  }

  return false;
}

/**
 * Hàm điều phối chính của Stage 0
 * 
 * @param studentText Nội dung người học nhập
 * @param options Các tùy chọn (excerpts, minWords, nGramVerbatimThreshold)
 * @returns Stage0Result
 */
export function runStage0Guard(
  studentText: string,
  options: GuardrailOptions = {}
): Stage0Result {
  const text = (studentText || '').trim();
  const minWords = options.minWords ?? 5;
  const verbatimThreshold = options.nGramVerbatimThreshold ?? 10;

  // 1. Kiểm tra asked_ai (Đòi đáp án) - Ưu tiên bắt trước
  if (checkAskedAi(text)) {
    return {
      triggered: true,
      rule: 'asked_ai',
      reply: 'Mình chưa biết nên mới nhờ bạn chỉ mà! Hay bạn xem lại tài liệu rồi hướng dẫn từng bước cho mình nhé?'
    };
  }

  // 2. Kiểm tra low_effort (Quá ngắn hoặc bỏ cuộc)
  if (checkLowEffort(text, minWords)) {
    return {
      triggered: true,
      rule: 'low_effort',
      reply: 'Bạn bắt đầu từ chỗ nào cũng được, kể cả chỉ một ý nhỏ thôi. Cứ thử nói theo cách hiểu của bạn xem sao!'
    };
  }

  // 3. Kiểm tra verbatim_copy (Copy nguyên văn tài liệu)
  if (options.excerpts && checkVerbatimCopy(text, options.excerpts, verbatimThreshold)) {
    return {
      triggered: true,
      rule: 'verbatim_copy',
      reply: 'Đây là câu trong tài liệu mà, bạn nói theo cách diễn đạt của bạn được không?'
    };
  }

  // Hợp lệ, cho phép đi tiếp vào Stage 1
  return {
    triggered: false,
    rule: null,
    reply: null
  };
}
