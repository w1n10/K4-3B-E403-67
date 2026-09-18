import { loadTopic } from "@/lib/content";
import TeachClient from "./teach-client";

export default async function TeachPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: topicId } = await params;
  const topic = loadTopic(topicId);

  // Chỉ truyền id + label xuống client. KHÔNG truyền excerpts — đó là tài liệu gốc,
  // để lộ ra client là học viên mở DevTools đọc được đáp án.
  return (
    <TeachClient
      topicId={topic.topic_id}
      title={topic.title}
      items={topic.items.map((i) => ({ id: i.id, label: i.label }))}
    />
  );
}
