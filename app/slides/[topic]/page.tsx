import fs from "node:fs";
import path from "node:path";
import { loadTopic } from "@/lib/content";
import SlideViewer from "./slide-viewer";

// Trang xem slide bài giảng. Agent chỉ người học tới đây khi kẹt ở một Ý,
// kèm số trang cần xem (?page=N). File slide nằm trong data/vlearn-pack/slides.
export default async function SlidesPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { topic: topicId } = await params;
  const { page } = await searchParams;

  const topic = loadTopic(topicId);
  const pages = topic.slide_pages ?? 0;

  let available = false;
  if (topic.slide_file) {
    const file = path.join(process.cwd(), "data", "vlearn-pack", "slides", topic.slide_file);
    available = fs.existsSync(file);
  }

  const requested = Number(page);
  const startPage = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), Math.max(pages, 1));

  return (
    <SlideViewer
      topicId={topic.topic_id}
      title={topic.title}
      deck={topic.slide_file ?? ""}
      pages={pages}
      startPage={startPage}
      available={available}
    />
  );
}
