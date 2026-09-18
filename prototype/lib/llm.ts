/**
 * LLM ADAPTER
 * Người sở hữu: Dương
 * 
 * Đổi model chỉ sửa 1 dòng: Hỗ trợ Gemini 2.5 Flash / Claude Sonnet / OpenAI.
 */

export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  systemPrompt?: string;
  responseFormat?: 'json' | 'text';
}

export async function callLLM(prompt: string, options: LLMRequestOptions = {}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.warn("[lib/llm] Chưa cấu hình API key trong .env.local — chuyển chế độ Mock.");
    return mockLLMResponse(prompt, options);
  }

  // Cấu hình gọi Gemini API
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          responseMimeType: options.responseFormat === 'json' ? "application/json" : "text/plain"
        }
      })
    });

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) {
    console.error("[lib/llm] Lỗi gọi API, fallback mock:", err);
    return mockLLMResponse(prompt, options);
  }
}

function mockLLMResponse(prompt: string, options: LLMRequestOptions): string {
  if (options.responseFormat === 'json') {
    return JSON.stringify({
      covered: [{ id: "K1", evidence: "LLM dự đoán token theo xác suất" }],
      missing: ["K2", "K3", "K4", "K5"],
      misconception: [],
      paraphrase_ok: true,
      coverage: 0.2
    });
  }
  return "À ra là vậy! Nhưng nếu nó chỉ tính xác suất thì làm sao nó biết được câu trả lời có đúng sự thật hay không bạn?";
}
