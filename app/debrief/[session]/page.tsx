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

  const uncovered = topic.items.filter((i) => !covered.has(i.id));

  // Phiên dừng vì kẹt (đã nhắc xem slide): KHÔNG gửi label của Ý còn thiếu xuống client,
  // kể cả trong payload RSC — ẩn ở UI thôi là vẫn đọc được qua DevTools.
  const hiddenTodo = s.exit_reason === "stuck" && uncovered.length > 0;

  const data: DebriefData = {
    topicId: s.topic_id,
    topicTitle: topic.title,
    exitReason: s.exit_reason,
    turnCount: s.turns.length,
    totalItems: topic.items.length,
    done: topic.items.filter((i) => covered.has(i.id)).map((i) => ({ id: i.id, label: i.label })),
    hiddenTodo,
    todo: hiddenTodo ? [] : uncovered.map((i) => ({ id: i.id, label: i.label, source: i.source })),
    // Đường học: số ý phủ được sau từng lượt — chỉ số về HỌC, không phải "AI trả lời đúng".
    curve: s.turns.map((t) => t.covered_after.length),
    misconceptions: [...seen].map(([id, label]) => ({ id, label, open: stillOpen.has(id) })),
  };

  return <DebriefClient d={data} />;
}
