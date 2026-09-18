import Link from "next/link";
import { listTopics } from "@/lib/content";

export default function Home() {
  const topics = listTopics();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Dạy lại cho bạn học</h1>
      <p className="mt-2 text-slate-600">
        Bạn sẽ giảng một khái niệm cho một bạn học chưa biết gì. Bạn ấy sẽ hỏi lại chỗ nào
        bạn giải thích còn thiếu. Đây là buổi luyện, không phải bài kiểm tra.
      </p>

      <div className="mt-8 space-y-3">
        {topics.map((t) => (
          <Link
            key={t.topic_id}
            href={`/teach/${t.topic_id}`}
            className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-400"
          >
            <div className="font-medium">{t.title}</div>
            <div className="mt-1 text-sm text-slate-500">Bắt đầu dạy →</div>
          </Link>
        ))}
        {topics.length === 0 && (
          <p className="text-sm text-slate-500">
            Chưa có chủ đề nào trong <code>content/</code>.
          </p>
        )}
      </div>

      <p className="mt-10 text-xs text-slate-400">
        Phiên học được ghi lại để nhóm cải tiến sản phẩm.
      </p>
    </main>
  );
}
