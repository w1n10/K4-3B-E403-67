// Nội dung bài học đọc thẳng từ content/<topic>.json — không cần DB.
// File này do Huy mining từ vlearn.db rồi viết ra, xem docs/data-pipeline.md §4.

import fs from "node:fs";
import path from "node:path";
import type { Topic } from "./types";

const cache = new Map<string, Topic>();

export function loadTopic(topicId: string): Topic {
  const hit = cache.get(topicId);
  if (hit) return hit;

  const file = path.join(process.cwd(), "content", `${topicId}.json`);
  if (!fs.existsSync(file)) throw new Error(`Không tìm thấy chủ đề: ${topicId}`);

  const topic = JSON.parse(fs.readFileSync(file, "utf-8")) as Topic;
  cache.set(topicId, topic);
  return topic;
}

export type TopicSummary = {
  topic_id: string;
  title: string;
  itemCount: number;
  misconceptionCount: number;
  sourceLecture: string;
};

/** Tóm tắt cho trang chủ. KHÔNG trả items/excerpts — đó là đáp án, để lộ ra
 *  client là học viên mở DevTools đọc được. Chỉ trả con số đếm. */
export function listTopics(): TopicSummary[] {
  const dir = path.join(process.cwd(), "content");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const t = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as Topic;
      return {
        topic_id: t.topic_id,
        title: t.title,
        itemCount: t.items?.length ?? 0,
        misconceptionCount: t.misconceptions?.length ?? 0,
        sourceLecture: t.source_lecture ?? "",
      };
    });
}
