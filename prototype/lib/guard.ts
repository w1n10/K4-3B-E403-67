/**
 * STAGE 0: GUARDRAILS (Code thuần, 0 token)
 * Người sở hữu: Khôi
 * 
 * Nhiệm vụ: Chặn ngay các input vi phạm trước khi gọi AI, trả về template reply trực tiếp.
 */

export interface Stage0Verdict {
  flagged: boolean;
  verdict: 'verbatim_copy' | 'asked_ai' | 'low_effort' | null;
  reply?: string;
}

export function evaluateStage0(studentText: string, excerpts: Record<string, string>): Stage0Verdict {
  const text = studentText.trim();
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);

  // 1. verbatim_copy: trùng >= 12 từ liên tiếp với excerpts
  if (words.length >= 12) {
    for (const sourceId in excerpts) {
      const excerptWords = excerpts[sourceId].toLowerCase().split(/\s+/).filter(Boolean);
      for (let i = 0; i <= words.length - 12; i++) {
        const studentChunk = words.slice(i, i + 12).join(' ');
        for (let j = 0; j <= excerptWords.length - 12; j++) {
          const excerptChunk = excerptWords.slice(j, j + 12).join(' ');
          if (studentChunk === excerptChunk) {
            return {
              flagged: true,
              verdict: 'verbatim_copy',
              reply: 'Đây là câu trong tài liệu mà, bạn nói theo cách của bạn được không?'
            };
          }
        }
      }
    }
  }

  // 2. asked_ai: câu kết thúc ? và không có mệnh đề giải thích, hoặc đòi đáp án
  const askRegex = /(đáp án là gì|cho mình đáp án|bot giải thích đi|nói luôn đi|đáp án đâu|chỉ mình với\?)/i;
  const isQuestion = text.endsWith('?');
  if (askRegex.test(lower) || (isQuestion && words.length < 8)) {
    return {
      flagged: true,
      verdict: 'asked_ai',
      reply: 'Mình chưa biết nên mới nhờ bạn chỉ mà! Hay bạn xem lại trang 6 rồi chỉ mình nhé?'
    };
  }

  // 3. low_effort: < 15 từ, hoặc thuộc tập từ lười
  const lazyPhrases = ['không biết', 'ko bit', 'chịu', 'k bit', 'chịu rồi', 'k rõ', 'hổng biết'];
  if (lazyPhrases.some(phrase => lower === phrase || lower.startsWith(phrase)) || words.length < 4) {
    return {
      flagged: true,
      verdict: 'low_effort',
      reply: 'Bạn bắt đầu từ chỗ nào cũng được, kể cả chỉ một ý thôi.'
    };
  }

  return {
    flagged: false,
    verdict: null
  };
}
