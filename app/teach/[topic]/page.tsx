import { loadTopic } from "@/lib/content";
import { getRandomPersonaStyle, formatQuestionForPersona } from "@/lib/persona";
import TeachClient from "./teach-client";

export default async function TeachPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: topicId } = await params;
  const topic = loadTopic(topicId);

  // Chọn ngẫu nhiên phong cách persona theo tỉ lệ:
  // - Bạn – Mình: 70%
  // - Con vợ - Tôi: 2%
  // - Senpai - Em: 10%
  // - Thầy - Em: 18%
  const personaStyle = getRandomPersonaStyle();

  const starterPool =
    topic.starter_questions && topic.starter_questions.length > 0
      ? topic.starter_questions
      : [
          "Chào bạn! Mình nghe giảng viên nói LLM không hề đọc hiểu câu chữ như con người, mà bản chất chỉ là tính xác suất đoán token tiếp theo. Chỗ này hoạt động như thế nào vậy bạn?",
        ];
  const rawQuestion = starterPool[Math.floor(Math.random() * starterPool.length)];
  const initialQuestion = formatQuestionForPersona(rawQuestion, personaStyle);

  // Chỉ truyền id + label xuống client. KHÔNG truyền excerpts — đó là tài liệu gốc,
  // để lộ ra client là học viên mở DevTools đọc được đáp án.
  return (
    <TeachClient
      topicId={topic.topic_id}
      title={topic.title}
      initialQuestion={initialQuestion}
      personaStyle={personaStyle}
      items={topic.items.map((i) => ({ id: i.id, label: i.label }))}
    />
  );
}
