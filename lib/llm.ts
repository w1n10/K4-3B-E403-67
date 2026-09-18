// Adapter model — đổi nhà cung cấp chỉ sửa file này.
// Mặc định Gemini (free tier ~1.500 req/ngày, guide §3.4 khuyến nghị).
// Có ANTHROPIC_API_KEY thì tự chuyển sang Claude.

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

export const MODEL_EVALUATOR = ANTHROPIC_KEY ? "claude-sonnet-5" : "gemini-2.5-flash";
export const MODEL_PERSONA = ANTHROPIC_KEY ? "claude-haiku-4-5-20251001" : "gemini-2.5-flash";

type CallOpts = { model: string; temperature: number; system?: string; json?: boolean };

async function callGemini(prompt: string, o: CallOpts): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${o.model}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      ...(o.system ? { systemInstruction: { parts: [{ text: o.system }] } } : {}),
      generationConfig: {
        temperature: o.temperature,
        ...(o.json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callClaude(prompt: string, o: CallOpts): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: o.model,
      max_tokens: 1024,
      temperature: o.temperature,
      ...(o.system ? { system: o.system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

export async function callText(prompt: string, o: CallOpts): Promise<string> {
  if (!GEMINI_KEY && !ANTHROPIC_KEY) {
    throw new Error("Chưa có API key. Đặt GEMINI_API_KEY hoặc ANTHROPIC_API_KEY trong .env.local");
  }
  return ANTHROPIC_KEY ? callClaude(prompt, o) : callGemini(prompt, o);
}

/**
 * Gọi model và ép ra JSON. Model trả JSON hỏng là chuyện SẼ xảy ra
 * (nhất là lúc demo) — thử lại 1 lần rồi mới chịu thua.
 */
export async function callJSON<T>(prompt: string, o: Omit<CallOpts, "json">): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callText(prompt, { ...o, json: true });
    try {
      // Gỡ rào ```json nếu model tự quấn vào
      const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
      return JSON.parse(cleaned) as T;
    } catch {
      if (attempt === 1) throw new Error(`Model trả JSON hỏng sau 2 lần thử:\n${raw.slice(0, 500)}`);
    }
  }
  throw new Error("unreachable");
}
