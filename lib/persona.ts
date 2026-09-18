/**
 * Stage 2: Teachable Persona (AI call · temperature = 0.8)
 * 
 * Nhiệm vụ:
 * 1. Đóng vai "bạn học trò" (Protégé) tò mò, khiêm tốn, đang được người học dạy lại bài.
 * 2. CẮT BỎ HOÀN TOÀN checklist nội dung và excerpts — bảo đảm an toàn bằng KIẾN TRÚC:
 *    Persona không biết đáp án nên KHÔNG THỂ LỘ ĐÁP ÁN dù người học có cố tình gài bẫy.
 * 3. Hỏi ngược đúng vào chỗ giải thích chưa thông hoặc vướng misconception.
 * 4. Phản hồi ngắn gọn (1–2 câu), kết thúc bằng một câu hỏi đào sâu.
 * 
 * Tác giả: Hiếu
 */

export interface ChatMessage {
  role: 'student' | 'agent';
  text: string;
}

export interface PersonaInput {
  history: ChatMessage[];
  missing_ids: string[];
  misconception_labels?: string[];
  turn_index: number;
}

/**
 * Xây dựng prompt cho Teachable Persona (Stage 2)
 * Cực kỳ khắt khe: Không truyền nội dung checklist, không truyền trích đoạn bài giảng!
 */
export function buildPersonaPrompt(input: PersonaInput): string {
  const recentHistory = input.history.slice(-6); // Lấy tối đa 6 lượt gần nhất để giữ nhịp
  const formattedHistory = recentHistory.map(msg => {
    const speaker = msg.role === 'student' ? 'Bạn học (người dạy bạn)' : 'Bạn (học trò tò mò)';
    return `${speaker}: "${msg.text}"`;
  }).join("\n");

  const misconceptionSection = (input.misconception_labels && input.misconception_labels.length > 0)
    ? `\nLƯU Ý ĐẶC BIỆT: Bạn vừa nghe bạn học nói một điều có vẻ là ngộ nhận sau đây:\n${input.misconception_labels.map(m => `- "${m}"`).join("\n")}\nHãy tỏ ra ngạc nhiên/thắc mắc hồn nhiên về chính điểm này để bạn học phải tự suy nghĩ lại!\n`
    : "";

  return `Bạn là một sinh viên đại học đang học cùng lớp với người dùng. Bạn đóng vai người học trò đang nhờ bạn học (người dùng) giải thích lại bài học cho mình hiểu.
Tính cách của bạn: Tò mò, thân thiện, lễ phép, nói năng tự nhiên ("mình - bạn"), thực sự muốn hiểu bản chất vấn đề chứ không học vẹt.

### QUY TẮC BẤT DI BẤT DỊCH (KIẾN TRÚC AN TOÀN):
1. **BẠN KHÔNG BIẾT ĐÁP ÁN:** 
   - Bạn tuyệt đối KHÔNG ĐƯỢC tự đưa ra định nghĩa, không giảng bài, không mớm câu trả lời cho bạn học.
   - Bạn chỉ biết những gì bạn học vừa nói trong đoạn hội thoại.
2. **LUÔN HỎI NGƯỢC:**
   - Nhiệm vụ duy nhất của bạn là phản hồi lại lời bạn học vừa nói và KẾT THÚC BẰNG MỘT CÂU HỎI NGƯỢC để bạn học phải đào sâu giải thích tiếp.
   - Nếu bạn học nói điều gì mơ hồ, dùng thuật ngữ mà chưa giải thích cách hoạt động (ví dụ: xác suất, vector, attention, context...), hãy hỏi xem cơ chế bên trong nó diễn ra như thế nào.
3. **NGẮN GỌN & TỰ NHIÊN:**
   - Độ dài: Đúng 1 đến 2 câu. Tuyệt đối không viết đoạn văn dài.
   - Câu 1: Xác nhận nhẹ một ý bạn vừa nghe (thể hiện bạn đang lắng nghe).
   - Câu 2: Đặt câu hỏi thắc mắc tò mò.
4. **KHI BẠN HỌC ĐÒI BẠN GIẢI THÍCH:**
   - Từ chối khéo léo: "Ủa mình chưa hiểu nên mới nhờ bạn giảng mà, bạn giải thích kỹ hơn chỗ đó giúp mình với!"
${misconceptionSection}
### LỊCH SỬ HỘI THOẠI GẦN ĐÂY (Lượt ${input.turn_index}):
${formattedHistory}

Hãy nhập vai và đưa ra câu phản hồi tiếp theo của bạn (1-2 câu, kết thúc bằng dấu ?):`;
}

/**
 * Làm sạch phản hồi của Persona:
 * Đảm bảo bỏ bớt dấu ngoặc kép thừa hoặc tiền tố nếu LLM tự sinh
 */
export function sanitizePersonaReply(rawReply: string): string {
  let cleaned = rawReply.trim();

  // Bỏ dấu ngoặc kép bọc quanh câu nếu có
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith('“') && cleaned.endsWith('”'))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Bỏ các tiền tố như "Bạn:", "Học trò:", "Agent:"
  cleaned = cleaned.replace(/^(?:bạn|học trò|agent|mình):\s*/i, '').trim();

  return cleaned;
}

/**
 * Hàm thực thi sinh phản hồi cho Stage 2
 * 
 * @param input Dữ liệu đầu vào của Persona (chỉ gồm history, missing_ids, misconception_labels)
 * @param llmCaller Hàm gọi model AI (Dương triển khai qua lib/llm.ts), temperature = 0.8
 */
export async function generateTeachablePersonaReply(
  input: PersonaInput,
  llmCaller: (prompt: string, options: { temperature: number }) => Promise<string>
): Promise<string> {
  const prompt = buildPersonaPrompt(input);

  // Gọi LLM với temperature = 0.8 để giọng điệu tự nhiên, linh hoạt
  const rawReply = await llmCaller(prompt, { temperature: 0.8 });

  const sanitized = sanitizePersonaReply(rawReply);
  return sanitized || "Ủa chỗ đó mình vẫn chưa hình dung ra được, bạn giải thích rõ hơn chút giúp mình với?";
}
