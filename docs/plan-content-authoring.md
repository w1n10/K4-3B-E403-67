# Plan — Sinh content JSON từ `vlearn.db` (authoring layer)

> Trạng thái: chờ duyệt. File tạm để review, có thể xoá sau khi xong.

## 0. Phạm vi đã chốt

- `vlearn.db` = nơi **authoring** nội dung; `content/<topic>.json` = **artifact export** đem đi chạy.
- Chỉ sinh **2 topic** (khớp 2 bộ slide trong `data/vlearn-pack/slides/`):
  - `day01-llm-foundation` — `d1-slide-hackathon.pdf`
  - `day02-xac-dinh-bai-toan-kinh-doanh-cho-ai` — `d2-slide-hackathon.pdf`
- Sửa schema DB cho **khớp `Topic`** để export là ánh xạ thẳng.
- `lib/content.ts` + type `Topic` **không đổi**; app không biết gì về DB.

## 1. Hiện trạng đã kiểm trên `vlearn.db`

| Nhóm | Bảng | Số dòng | Ghi chú |
|---|---|---|---|
| Mining | `raw_tutor_turns` | 13.494 | nguồn bằng chứng |
| Mining | `lecture_hotspots` | 489 | nguồn số impact |
| Nội dung | `topics` | 1 | `llm-hallucination` |
| Nội dung | `checklist_items` | 2 | `K1`,`K2` |
| Nội dung | `misconceptions` | 1 | `M1` |
| Golden | `golden_cases` | 0 | chưa dùng |
| Runtime | `sessions`, `turns` | 0 | **rác**, thuộc Supabase, không nên nằm ở DB mining |

`scripts/init_db.py` chỉ tạo 2 bảng mining — các bảng còn lại do thao tác ngoài repo, nên DB **không tái lập được**. Bước seed phải nằm trong repo.

### Provenance có thật cho 2 topic (từ `lecture_hotspots` / `raw_tutor_turns`)

| Topic | Hotspot part | Tổng | Organic |
|---|---|---|---|
| day01 | `day01-llm-foundation-1` (K4P1 · D01) | 127 | 109 |
| day01 | `day01-slide-v2-blue` (K4P1 · D01) | 74 | 64 |
| day01 | `Phân biệt AI, Machine Learning, Generative AI và LLM` (K4P1 · D01) | 52 | 52 |
| day02 | `day02-xac-dinh-bai-toan-kinh-doanh-cho-ai` (K4P1 · D03) | 46 | 38 |

Transcript tương ứng: day01 ← `transcript-04` (Foundation) và `transcript-06` (transformer/attention); day02 ← `transcript-01/02/03`.

## 2. Schema DB mới (khớp `Topic`)

Tên cột trùng key của `Topic` để export không phải đổi tên:

```sql
-- authoring, KHÔNG commit .db, chỉ commit script tạo
CREATE TABLE topics (
  topic_id       TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  source_lecture TEXT
);

CREATE TABLE checklist_items (
  topic_id     TEXT NOT NULL REFERENCES topics(topic_id) ON DELETE CASCADE,
  id           TEXT NOT NULL,          -- K1..K7   -> items[].id
  sort_order   INTEGER NOT NULL,       -- giữ đúng thứ tự
  label        TEXT NOT NULL,          -- items[].label
  source       TEXT NOT NULL,          -- items[].source  (vd T04-136)
  keywords     TEXT,                   -- items[].keywords, JSON array
  PRIMARY KEY (topic_id, id)
);

-- excerpts TÁCH RIÊNG vì một marker dùng chung cho nhiều item
-- (hiện tại K1 và K7 cùng trỏ T06-136 -> để trên item là trùng/lệch)
CREATE TABLE excerpts (
  topic_id TEXT NOT NULL REFERENCES topics(topic_id) ON DELETE CASCADE,
  marker   TEXT NOT NULL,              -- T04-136 -> excerpts[marker]
  text     TEXT NOT NULL,
  PRIMARY KEY (topic_id, marker)
);

CREATE TABLE misconceptions (
  topic_id          TEXT NOT NULL REFERENCES topics(topic_id) ON DELETE CASCADE,
  id                TEXT NOT NULL,     -- M1..M3
  sort_order        INTEGER NOT NULL,
  label             TEXT NOT NULL,
  evidence_turn_ids TEXT,              -- JSON array ['T00824',...]
  note              TEXT,
  PRIMARY KEY (topic_id, id)
);
```

- Bỏ `created_at` khỏi `topics` (không có trong `Topic`, không cần cho export).
- **Xoá `sessions`/`turns`** khỏi DB mining (đang rỗng) để không lẫn với Supabase.
- Giữ `golden_cases` nguyên trạng — ngoài phạm vi đợt này.

## 3. Scripts

| File | Việc | Commit? |
|---|---|---|
| `scripts/seed_content.py` | Tạo schema mục 2 + upsert nội dung authoring 2 topic. Chạy lại được nhiều lần (idempotent: xoá theo `topic_id` rồi insert). | Có — đây là bản ghi tái lập DB |
| `scripts/export_content.py` | Đọc DB → ghi `content/<topic_id>.json`, validate trước khi ghi. | Có |
| `scripts/init_db.py` | Giữ nguyên phần mining; cập nhật comment cho khớp thực tế (content tables giờ nằm ở `seed_content.py`, runtime vẫn ở Supabase). | Có |

Không thêm `@supabase`/SDK gì. `export_content.py` chạy local, chỉ đọc SQLite.

## 4. Nội dung authoring cho 2 topic

Với mỗi topic, seed vào DB:

- **5–7 item** (`K1..K7`) rút từ slide + transcript, mỗi item kèm `source` là mã đoạn `[Txx-NNN]`.
- **2–3 misconception** lấy từ `raw_tutor_turns` của đúng module (day01: K4P1/D01; day02: K4P1/D03), `evidence_turn_ids` là `turn_id` thật, `note` ghi ngắn.
- **`excerpts`**: mỗi `source` phải có một đoạn trích ngắn tương ứng (dùng cho `runGuard` so trùng nguyên văn). Giới hạn độ dài để không vi phạm luật "chỉ trích ngắn".

Thứ tự làm: đọc `d1/d2` slide trước để chốt khung ý, đối chiếu transcript để lấy câu chữ + mã `[Txx-NNN]`, rồi tra chatlog lấy misconception + `turn_id`.

> Đây là phần cần người sở hữu nội dung (Huy) duyệt wording trước khi seed, vì `label` là "một ý, không phải một câu chữ" (`architecture.md §3.1`).

## 5. Hợp đồng export

- Tên file = `content/<topic_id>.json`.
- `items` sắp theo `sort_order`; `misconceptions` sắp theo `sort_order`.
- `keywords` parse từ JSON array; rỗng thì bỏ key (giữ đúng `Topic`).
- `excerpts` = map `marker → text`.
- **Validate trước khi ghi**, fail thì không ghi:
  - `topic_id` khớp tên file, `title` không rỗng;
  - ít nhất 1 item; `id` không trùng; mọi `source` không rỗng;
  - mọi `source` của item **phải có trong `excerpts`**;
  - `misconceptions` id không trùng.
- Ghi deterministic (thứ tự ổn định) để diff sạch khi review.

## 6. Thay đổi file dự kiến

```
scripts/seed_content.py        (mới)
scripts/export_content.py      (mới)
scripts/init_db.py             (sửa comment)
content/day01-llm-foundation.json                      (mới, sinh ra)
content/day02-xac-dinh-bai-toan-kinh-doanh-cho-ai.json (mới, sinh ra)
content/llm-hallucination.json (QUYẾT ĐỊNH: xoá — day01 là bản Foundation thay thế)
docs/data-pipeline.md §3       (sửa: content authoring nằm trong DB, export ra JSON)
docs/README.md                 (sửa mục mô tả content)
```

`vlearn.db` vẫn bị gitignore — không commit.

## 7. Tiêu chí hoàn thành

1. `python scripts/seed_content.py` → DB có 2 topic, mỗi topic 5–7 item + 2–3 misconception + excerpts phủ đủ `source`.
2. `python scripts/export_content.py` → đúng 2 file JSON, validate pass.
3. JSON load được bằng `loadTopic`, `listTopics()` trả 2 topic.
4. `npm run dev`: trang chủ hiện 2 bài; vào `/teach/<topic>` chat chạy; Stage 0 `verbatim_copy` bắt được khi dán đoạn trong `excerpts`.
5. `git status` không có `.db`, `data/`, key.

## 8. Rủi ro & câu hỏi còn lại

- **day01 thay `llm-hallucination`?** day01 Foundation bao trùm nội dung hiện tại → đề xuất xoá file cũ; nếu giữ thì app có 3 bài và phải rà lại canvas/spec đang nhắc `llm-hallucination`.
- **Misconception phải là hiểu lầm thật**: chỉ lấy từ chatlog K4/D01–D03, không tự bịa.
- **Excerpt ngắn**: cắt còn 1–2 câu, tránh vi phạm luật bảo mật data pack.
- **Số item ≠ 7**: code dùng `topic.items.length` nên vẫn chạy; ngưỡng `5/7` giữ nguyên tỉ lệ, không cần sửa.

## 9. Thứ tự thực hiện

1. Viết `seed_content.py` + schema mục 2 (chưa cần nội dung đầy đủ, seed tạm 1 topic để test).
2. Viết `export_content.py` + validate.
3. Author nội dung 2 topic từ slide/transcript/chatlog, seed vào DB.
4. Export, kiểm `npm run dev`, rà `git status`.
5. Xoá `llm-hallucination.json` (nếu chốt) và đồng bộ docs.
