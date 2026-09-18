# Quy trình — Agent học trò (Track D3)

> File vận hành: tóm tắt cách `app/` + `lib/` chạy, cách cắm Supabase, và các bước cho 5 tester.
> Đặc tả kiến trúc đầy đủ nằm ở [`architecture.md`](./architecture.md).

---

## 1. Sản phẩm làm gì

Học viên **dạy lại** một khái niệm cho một agent đóng vai bạn học ngây thơ. Agent hỏi ngược đúng chỗ còn hổng, **không bao giờ lộ đáp án**, và phiên kết thúc khi lời giảng phủ đủ checklist (hoặc chạm trần 8 lượt). Mọi lượt được ghi lại để nhóm đo và cải tiến.

---

## 2. Kiến trúc 3 tầng

```
Học viên gõ lời giải thích
        │
   ┌────▼──────────────────────────────┐
   │ STAGE 0 · GUARDRAIL   (code thuần)│  0 token
   │ verbatim_copy · asked_ai · low_effort
   └────┬───────────────────┬──────────┘
        │ trúng luật        │ hợp lệ
        │ → template reply  ▼
        │      ┌──────────────────────────────┐
        │      │ STAGE 1 · EVALUATOR           │  AI · temp = 0
        │      │ so lời giảng ↔ checklist →JSON│
        │      └──────────────┬────────────────┘
        │                     │
        │      ┌──────────────▼────────────────┐
        │      │ ORCHESTRATOR   (code thuần)    │
        │      │ gộp checklist · đếm lượt · thoát│
        │      └──────────────┬────────────────┘
        │                     │ chưa đủ
        │      ┌──────────────▼────────────────┐
        │      │ STAGE 2 · TEACHABLE PERSONA    │  AI · temp = 0.8
        │      │ CHỈ nhận một câu hỏi, KHÔNG    │
        │      │ nhận checklist/đáp án          │
        │      └──────────────┬────────────────┘
        └─────────────────────┴──→ trả lời học viên
```

**Bất biến quan trọng nhất:** Stage 2 chỉ được nhận `probe_question` do Stage 1 soạn sẵn — không nhận `items`, `excerpts` hay `label`. Nhờ vậy nó không thể lộ đáp án kể cả khi bị dụ. Xem `lib/persona.ts:1` và `architecture.md §2`.

---

## 3. Bản đồ file

### `app/` — giao diện & API

| File | Vai trò |
|---|---|
| `app/page.tsx` | Trang chủ, liệt kê chủ đề từ `content/*.json` (server component). |
| `app/teach/[topic]/page.tsx` | Nạp topic, **chỉ truyền `id` + `label`** xuống client — cố ý không truyền `excerpts` để không lộ đáp án. |
| `app/teach/[topic]/teach-client.tsx` | Khung chat (`"use client"`). Gửi `POST /api/checkpoint`, hiện checklist ✓/○, **không hiện coverage khi đang học**. |
| `app/api/checkpoint/route.ts` | **Orchestrator** — chạy Stage 0 → 1 → quyết định thoát → ghi `turns` → Stage 2. |

### `lib/` — lõi

| File | Vai trò |
|---|---|
| `lib/guard.ts` | Stage 0: 3 luật deterministic, 0 token. |
| `lib/evaluator.ts` | Stage 1: prompt chấm + `PROMPT_VERSION`, `temperature: 0`. |
| `lib/persona.ts` | Stage 2: prompt giọng học trò. |
| `lib/llm.ts` | Adapter model: Gemini mặc định, tự chuyển Claude nếu có `ANTHROPIC_API_KEY`. Có retry khi JSON hỏng. |
| `lib/content.ts` | Đọc `content/<topic>.json`, cache trong RAM. |
| `lib/types.ts` | Hợp đồng dữ liệu giữa các tầng (`Stage1Output`, `TurnRecord`…). **Sửa file này phải báo cả nhóm.** |
| `lib/supabase-store.ts` | `SessionStore` trên Supabase PostgREST (gọi bằng `fetch`, không cần SDK). |
| `lib/db.ts` | Interface `SessionStore` + `pickStore()`: có `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` thì dùng Supabase, không thì `MemoryStore`. |

---

## 4. Hợp đồng dữ liệu & biến môi trường

### Hai bảng runtime

Nội dung bài đọc từ `content/*.json` (không cần DB). Chỉ **phiên học** mới vào Postgres: `sessions` (1 dòng / phiên) và `turns` (1 dòng / lượt). Cột khớp với `lib/types.ts`.

`exit_reason` nhận một trong: `completed` · `gave_up` · `turn_cap` · `stuck`.

### Biến môi trường (để trong `.env.local`, không commit)

| Biến | Bắt buộc | Dùng ở |
|---|---|---|
| `GEMINI_API_KEY` | một trong hai | `lib/llm.ts` |
| `ANTHROPIC_API_KEY` | một trong hai | `lib/llm.ts` (nếu có sẽ ưu tiên Claude) |
| `SUPABASE_URL` | để ghi log thật | `lib/supabase-store.ts:11` |
| `SUPABASE_SERVICE_KEY` | để ghi log thật | `lib/supabase-store.ts:12` |

Thiếu 2 biến Supabase thì app vẫn chạy nhưng rơi về `MemoryStore` và **mất sạch log khi restart** (`lib/db.ts:71`).

---

## 5. Quy trình chạy local

```bash
npm install
# tạo .env.local rồi điền các biến ở mục 4
npm run dev            # http://localhost:3000
npm run golden         # chạy golden set trên Stage 1
npm run export-logs    # kéo log từ Supabase về logs/
```

Mở `/` → chọn chủ đề → vào `/teach/<topic_id>` → gõ lời giảng. Lượt đầu chưa có `sessionId` sẽ tự mở phiên mới; đổi "Mã tester" (mặc định `U00`) trước khi gửi lượt đầu.

Điều kiện dừng phiên (`app/api/checkpoint/route.ts:14`): `coverage ≥ 5/7` và không còn misconception mở, hoặc chạm `TURN_CAP = 8`.

---

## 6. Quy trình cắm Supabase

### 6.1 · Cấp quyền cả nhóm

Vào **Organization Settings → Team → Invite member**, chọn **Administrator** cho các thành viên còn lại. Người tạo tổ chức vẫn giữ **Owner** (chỉ Owner xoá được tổ chức và đụng billing) — để Administrator là an toàn.

### 6.2 · Tạo bảng (DDL)

Sidebar trái → **SQL Editor** (icon `>_`) → **New query** → dán khối dưới → **Run** (Ctrl+Enter). Thấy `Success. No rows returned` là xong.

```sql
-- 2 bảng runtime. topics/checklist đọc từ content/*.json, golden set là file trong repo.
create table sessions (
  id uuid primary key default gen_random_uuid(),
  tester_code text not null,
  topic_id text not null,
  model text,
  prompt_version text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  final_coverage real,
  exit_reason text
);

create table turns (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  turn_index int not null,
  student_text text not null,
  stage0_verdict text,
  stage1_json jsonb,
  stage2_reply text,
  covered_after text[],
  latency_ms int,
  created_at timestamptz default now()
);

create index on turns(session_id, turn_index);

-- BẮT BUỘC: khoá bảng khỏi truy cập công khai.
-- Tạo bảng bằng SQL thì Supabase KHÔNG tự bật RLS -> anon key đọc/ghi được hết.
-- Repo nhóm đang public nên phải bật. Không thêm policy nào:
-- service_role (app gọi từ server) bỏ qua RLS, còn anon thì bị chặn sạch.
alter table sessions enable row level security;
alter table turns    enable row level security;
```

### 6.3 · Kiểm tra ghi–đọc–xoá

Chạy trong SQL Editor:

```sql
insert into sessions (tester_code, topic_id, model, prompt_version)
values ('U00', 'llm-hallucination', 'test', 'v0')
returning id, tester_code, started_at;

delete from sessions where tester_code = 'U00';
```

Ra 1 dòng có `id` dạng uuid là DB chạy đúng. Sang **Table Editor** (icon bảng, dưới Home) thấy `sessions` và `turns` là hoàn tất.

### 6.4 · Lấy key và nối vào app

**Project Settings → API**: lấy `Project URL` → `SUPABASE_URL`, lấy `service_role` key → `SUPABASE_SERVICE_KEY`. Điền vào `.env.local`.

> **Key `service_role` là key toàn quyền, bỏ qua RLS.** Trong repo này nó được dùng ở `lib/supabase-store.ts`, và `lib/db.ts` là nơi chọn store. Cả hai chỉ được import từ code chạy trên server (route handler). **Tuyệt đối không import `@/lib/db`, `@/lib/supabase-store` từ file có `"use client"`** — repo nhóm đang public, lộ key là mất DB.

---

## 7. Xem dữ liệu lúc chạy thật

Trong lúc 5 tester học, mở **Table Editor → turns** là thấy từng lượt chảy vào. Đây chính là dashboard giảng viên bản đầu cho CP3 — không phải code thêm màn nào.

- `stage1_json` là log/trace thô để kiểm Evaluator chấm đúng không.
- `covered_after` theo từng lượt vẽ được đường coverage `2/7 → 6/7`.
- Mỗi dòng `turns` là một case golden set sẵn có (`student_text` → `stage1_json`).

---

## 8. Luật an toàn — không ai được phá

1. **Không commit API key.** Để trong `.env.local` (đã gitignore); trên Vercel set bằng Environment Variables.
2. **Không commit `data/`** và không dán nguyên transcript vào `content/*.json` — chỉ trích đoạn ngắn.
3. **Không lưu tên thật của tester** — log dùng mã `U01..U05`.
4. **Không hiện coverage/điểm trong lúc đang học** — chỉ hiện ở màn tổng kết.
5. Giữ nguyên dòng consent *"Phiên này được ghi lại để nhóm cải tiến sản phẩm."*

---

## 9. Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách sửa |
|---|---|
| Cảnh báo **"RLS disabled"** vàng cạnh tên bảng | Quên chạy 2 dòng `alter table ... enable row level security`. Chạy lại. |
| Bật RLS rồi Table Editor trống | Bình thường. Dashboard đọc bằng quyền của bạn nên vẫn thấy; trống là do chưa có dữ liệu thật. |
| App báo **`permission denied`** | Đang dùng nhầm `anon` key. Phải là `service_role`, và chỉ gọi từ code server. |
| Log mất sau khi restart dev server | Chưa đặt `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` → đang chạy `MemoryStore` (`lib/db.ts:76`). |
| Lỗi `Chưa có API key...` (`lib/llm.ts:55`) | Thiếu cả `GEMINI_API_KEY` lẫn `ANTHROPIC_API_KEY` trong `.env.local`. |
| `Model trả JSON hỏng sau 2 lần thử` | Model không bám schema; thử đổi model hoặc siết prompt Evaluator. |
