import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { loadTopic } from "@/lib/content";
import DebriefClient, { type DebriefData } from "./debrief-client";

// Đọc phiên ở server, gom thành DebriefData rồi để client render (cần i18n).
export default async function DebriefPage({ params }: { params: Promise<{ session: string }> }) {
  const { session: sessionId } = await params;

  const s = await db.getSession(sessionId);
  if (!s) notFound();

  const topic = loadTopic(s.topic_id);
  const covered = new Set(s.turns.at(-1)?.covered_after ?? []);

  // Hiểu lầm từng mắc trong phiên; "open" = còn ở lượt CHẤM gần nhất.
  const stillOpen = new Set(
    [...s.turns].reverse().find((t) => t.stage1_json)?.stage1_json?.misconception.map((m) => m.id) ?? []
  );
  const seen = new Map<string, string>();
  s.turns.forEach((t) =>
    t.stage1_json?.misconception.forEach((m) => {
      const label = topic.misconceptions.find((x) => x.id === m.id)?.label;
      if (label) seen.set(m.id, label);
    })
  );

  const data: DebriefData = {
    topicId: s.topic_id,
    topicTitle: topic.title,
    exitReason: s.exit_reason,
    turnCount: s.turns.length,
    totalItems: topic.items.length,
    // Một danh sách duy nhất, giữ đúng thứ tự trong bài: ý đã giảng hiện rõ,
    // ý chưa giảng để mờ. Như vậy học viên thấy được toàn cảnh mình phủ tới đâu.
    points: topic.items.map((i) => ({
      id: i.id,
      label: i.label,
      source: i.source,
      covered: covered.has(i.id),
    })),
    // Đường học: số ý phủ được sau từng lượt — chỉ số về HỌC, không phải "AI trả lời đúng".
    curve: s.turns.map((t) => t.covered_after.length),
    misconceptions: [...seen].map(([id, label]) => ({ id, label, open: stillOpen.has(id) })),
  };

  return <DebriefClient d={data} />;
}
