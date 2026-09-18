# Kiến trúc — Agent học trò (Track D3)

> Học viên **dạy lại** một khái niệm cho một agent đóng vai học trò. Agent hỏi ngược đúng chỗ giải thích còn hổng, **không bao giờ đưa đáp án**, và chỉ "hiểu" khi lời giải thích phủ đủ checklist kiến thức.

Đọc file này trước khi code. Mỗi người có một mục "Bạn sở hữu gì" ở §5.

---

## 1. Stack

| Lớp | Chọn | Ghi chú |
|---|---|---|
| FE | Next.js 15 (App Router) + Tailwind + shadcn/ui | 1 repo gồm cả FE lẫn BE |
| BE | Next.js Route Handlers | serverless — API key nằm server-side, client không thấy |
| DB | Supabase (Postgres, free tier) | table viewer dùng luôn làm dashboard giảng viên bản đầu |
| AI | 2 call/lượt qua `lib/llm.ts` | đổi model sửa 1 dòng |
| Deploy | Vercel | **phải có URL public** — track D bắt buộc ≥5 bạn cùng lớp học thật trên máy họ |
| Nội dung bài | File JSON tĩnh trong `content/` | transcript đã có mã đoạn `[Txx-NNN]` → nhét thẳng vào prompt |

**Không dựng vector DB, không RAG.** Một bài giảng ~100KB, nhét vừa context. Dựng RAG tốn 3 tiếng và rubric không cho thêm điểm nào.

---

## 2. Kiến trúc lõi — 3 tầng

```
Học viên gõ lời giải thích
        │
   ┌────▼──────────────────────────────┐
   │ STAGE 0 · GUARDRAIL  (code thuần)  │  0 token
   │ verbatim_copy · asked_ai · low_effort
   └────┬───────────────────┬───────────┘
        │ trúng luật        │ hợp lệ
        │ → template reply  │
        │   (không gọi AI)  ▼
        │      ┌──────────────────────────────┐
        │      │ STAGE 1 · EVALUATOR           │  AI call · temp = 0
        │      │ so giải thích ↔ Checklist     │  → JSON
        │      └──────────────┬────────────────┘
        │                     │
        │      ┌──────────────▼────────────────┐
        │      │ ORCHESTRATOR  (code thuần)     │
        │      │ gộp checklist · đếm lượt       │
        │      │ quyết định thoát vòng lặp      │
        │      └──────────────┬────────────────┘
        │                     │ chưa đủ
        │      ┌──────────────▼────────────────┐
        │      │ STAGE 2 · TEACHABLE PERSONA    │  AI call · temp = 0.8
        │      │ CHỈ nhận mã ["K3","K5"]        │
        │      │ KHÔNG nhận nội dung đáp án     │
        │      └──────────────┬────────────────┘
        └─────────────────────┴──→ trả lời học viên
```

### Nguyên tắc thiết kế quan trọng nhất

**Stage 2 bị cắt quyền đọc nội dung checklist.** Nó chỉ biết "học viên còn thiếu mục K3", không biết K3 viết gì. Nên nó **không lộ đáp án được** kể cả khi học viên cố dụ.

Đây là đảm bảo bằng *kiến trúc*, không phải bằng câu dặn trong prompt. Đừng ai "tiện tay" truyền cả checklist xuống Stage 2 cho dễ viết prompt — làm thế là phá mất điểm rubric *"Không lộ đáp án 15"*.

---

## 3. Hợp đồng dữ liệu

Ba hợp đồng dưới đây là **ranh giới giữa các phần việc**. Mock theo đúng đây thì 4 người làm song song được, không phải đợi nhau.

### 3.1 Checklist kiến thức — `content/<topic>.json`

```json
{
  "topic_id": "llm-hallucination",
  "title": "Vì sao LLM bịa",
  "source_lecture": "transcript-06",
  "items": [
    { "id": "K1",
      "label": "LLM dự đoán token kế tiếp theo xác suất, không tra cứu dữ kiện",
      "source": "T06-142" },
    { "id": "K2",
      "label": "Không có cơ chế tự phân biệt 'biết' và 'không biết'",
      "source": "T06-151" }
  ],
  "misconceptions": [
    { "id": "M1", "label": "Nghĩ LLM có database tra cứu bên trong" }
  ],
  "excerpts": {
    "T06-142": "trích ngắn nguyên văn từ transcript...",
    "T06-151": "..."
  }
}
```

**Luật viết `label`:** mỗi mục là một **ý**, không phải một **câu chữ**. Học viên diễn đạt khác tài liệu mà đúng ý thì vẫn phải được tính — đây là hard test số 1 của D3. `label` viết kiểu "câu trong slide" là sản phẩm hỏng.

Một chủ đề **5–7 mục**. Nhiều hơn thì phiên dài quá, học viên bỏ giữa chừng.

### 3.2 Stage 1 Evaluator — output

```json
{
  "covered": [
    { "id": "K1", "evidence": "trích đúng câu học viên đã nói" }
  ],
  "missing": ["K3", "K5"],
  "misconception": [
    { "id": "M1", "student_said": "...", "source": "T06-151" }
  ],
  "paraphrase_ok": true,
  "coverage": 0.57
}
```

- `temperature: 0` **bắt buộc** — golden set phải ra cùng kết quả giữa các lần chạy, nếu không thì số đo CP3 vô nghĩa.
- `evidence` phải là **trích nguyên văn lời học viên**, không được tóm tắt. Đây là thứ để kiểm Evaluator có chấm bừa không.
- `paraphrase_ok` = học viên nói đúng ý nhưng khác cách diễn đạt tài liệu → vẫn tính `covered`.

### 3.3 Stage 2 Persona — input

```json
{
  "history": [ { "role": "student|agent", "text": "..." } ],
  "missing_ids": ["K3", "K5"],
  "misconception_labels": ["Nghĩ LLM có database tra cứu bên trong"],
  "turn_index": 3
}
```

Chỉ có bấy nhiêu. **Không có `items`, không có `excerpts`, không có `label` của mục thiếu.**

Output: 1–2 câu, giọng học trò tò mò, kết thúc bằng một câu hỏi ngược.

---

## 4. Luồng một lượt

1. Client `POST /api/checkpoint { sessionId, text }`
2. **Stage 0** chạy luật → nếu trúng: trả template reply, ghi log, return luôn (tiết kiệm 1 AI call)
3. **Stage 1** → JSON evaluation
4. **Orchestrator** gộp `covered` vào state phiên
5. Xét điều kiện thoát:
   - `coverage ≥ 5/7` **và** không còn misconception mở → sang Debrief (`exit_reason: completed`)
   - chạm trần **8 lượt** → Debrief (`exit_reason: turn_cap`)
6. **Stage 2** → câu hỏi ngược
7. Ghi bản ghi `turns` vào Supabase
8. Trả `{ reply, coveredIds }` về client

**Không trả `coverage` về client trong lúc đang học.** Luật an toàn D3: không tạo cảm giác bị chấm điểm ngầm. Điểm và coverage chỉ hiện ở màn Debrief.

### Luật Stage 0

| Luật | Cách phát hiện | Phản hồi mẫu |
|---|---|---|
| `verbatim_copy` | trùng ≥12 từ liên tiếp với `excerpts` | "Đây là câu trong tài liệu mà, bạn nói theo cách của bạn được không?" |
| `asked_ai` | câu kết thúc `?` và không có mệnh đề giải thích, hoặc khớp regex đòi đáp án | "Mình chưa biết nên mới nhờ bạn chỉ mà! Hay bạn xem lại trang 6 rồi chỉ mình nhé?" |
| `low_effort` | < 15 từ, hoặc thuộc {"không biết", "ko bit", "chịu"} | "Bạn bắt đầu từ chỗ nào cũng được, kể cả chỉ một ý thôi." |

Deterministic → viết unit test, không cần golden set, không tốn token.

---

## 5. Cấu trúc repo — ai sở hữu gì

```
app/
  page.tsx                      chọn chủ đề                    · Dương
  teach/[topic]/page.tsx        khung chat + thanh checklist   · Dương
  debrief/[session]/page.tsx    tổng kết + chỗ cần ôn lại      · Hiếu
  teacher/page.tsx              dashboard lớp kẹt ở đâu        · Hiếu
  api/checkpoint/route.ts       orchestrator                   · Dương
lib/
  guard.ts        Stage 0                                      · Khôi
  evaluator.ts    Stage 1 + prompt                             · Khôi
  persona.ts      Stage 2 + prompt                             · Dương
  llm.ts          adapter đổi model                            · Dương
  supabase.ts                                                  · Hiếu
content/
  llm-hallucination.json   checklist + trích đoạn              · Huy
golden/
  cases.json      ≥20 case                                     · Hiếu
  run.ts          npm run golden                               · Hiếu
scripts/
  export-logs.ts  kéo log từ Supabase về repo                  · Hiếu
logs/             trace nộp kèm repo
```

**Huy** — mining `data/vlearn-pack/` để dựng `content/*.json`: chọn 1 bài giảng, rút 5–7 ý cốt lõi, gắn mã đoạn `T06-xxx` cho từng ý, thu misconception thật từ chatlog. Đây vừa là evidence cho canvas dòng 4, vừa là nội dung chạy được của sản phẩm — làm xong file này là xong một nửa sản phẩm mà không cần viết code.

**Khôi** — Stage 0 + Stage 1: luật guardrail và prompt Evaluator. Tiêu chí "đủ căn cứ" nằm ở đây.

**Dương** — UI + orchestrator + Stage 2 + adapter model. Người giữ AI call thật.

**Hiếu** — golden set, Debrief, dashboard, export log, `spec.md`.

---

## 6. Lưu phiên học

Ghi **sau mỗi lượt**, không đợi hết phiên — tester đóng tab giữa chừng là mất sạch.

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  tester_code text not null,        -- U01..U05, KHÔNG lưu tên thật
  topic_id text not null,
  model text, prompt_version text,  -- để so trước/sau khi sửa prompt
  started_at timestamptz default now(),
  ended_at timestamptz,
  final_coverage real,
  exit_reason text                  -- completed | gave_up | turn_cap
);

create table turns (
  id bigserial primary key,
  session_id uuid references sessions(id),
  turn_index int,
  student_text text,                -- nguyên văn học viên gõ
  stage0_verdict text,              -- null | verbatim_copy | asked_ai | low_effort
  stage1_json jsonb,                -- TOÀN BỘ output Evaluator
  stage2_reply text,
  covered_after text[],             -- ["K1","K2"] sau lượt này
  latency_ms int,
  created_at timestamptz default now()
);
```

Vì sao đúng các cột này:

- `covered_after` theo từng lượt → vẽ được đường coverage `2/7 → 6/7` qua 5 lượt. Đây là **chỉ số về *học*** mà track D bắt buộc, chứ không phải "AI trả lời đúng".
- `stage1_json` lưu thô → chính là "log/trace giữ trong repo" mà guide §3.1 yêu cầu ở CP3.
- `prompt_version` → Changelog `spec.md` §9 viết được câu có số: *"prompt v2 nâng coverage trung bình từ 0.52 lên 0.74 trên 5 phiên"*.
- **Mỗi dòng `turns` là một case golden set có sẵn** — `student_text` → `stage1_json` là cặp input/expected. Chạy 5 bạn thật là có luôn ≥10 case lấy từ data thật.
- `exit_reason` → bắt hard test *"agent hiểu quá dễ"*: phiên nào cũng `completed` sau 2 lượt là Evaluator dễ dãi.

Song song giữ bản sao `localStorage` + nút **"Tải log phiên (.json)"**. Nghe thừa, nhưng demo mà Supabase rớt mạng thì vẫn còn bằng chứng trong máy tester.

`npm run export-logs` đổ ra `logs/session-U01.json` và **commit vào repo** — giám khảo chấm trên file trong repo, không chấm trên Supabase.

---

## 7. Model AI

| Tầng | Cần gì | Nếu BTC cấp key | Nếu tự lo |
|---|---|---|---|
| Stage 1 | bám schema, so khớp ngữ nghĩa chặt | Claude Sonnet 5 | Gemini 2.5 Flash |
| Stage 2 | giọng tự nhiên, ngắn, rẻ | Claude Haiku 4.5 | Gemini 2.5 Flash |

Gemini free tier ~1.500 req/ngày — quá đủ cho 5 tester × 8 lượt × 2 call.

Cả hai đi qua `lib/llm.ts` nên đổi mất 1 dòng. Đây cũng là hạ tầng cho **multi-prototype** (`spec.md` §8): trục so sánh nên chọn là *persona ngây thơ hoàn toàn* vs *persona biết phản biện* — khác trục thật, không phải khác màu nút.

---

## 8. Luật an toàn — không ai được phá

1. **Không commit API key.** Key để `.env.local`, đã có trong `.gitignore`. Trên Vercel set bằng Environment Variables.
2. **Không commit data pack.** `data/` đã gitignore. `content/*.json` chỉ chứa **trích đoạn ngắn** của đúng bài đang demo — không đổ nguyên transcript.
3. **Không lưu tên thật của tester.** Log dùng mã `U01..U05`. Bảng ánh xạ tên ↔ mã để file riêng, gitignore. Tên willing user chỉ ghi trong `spec.md`.
4. **Hiện một dòng consent** trước khi vào phiên: *"Phiên này được ghi lại để nhóm cải tiến sản phẩm."* Đúng luật đạo đức D3, và là điểm minh bạch trong rubric — một dòng chữ đổi lấy điểm.
5. **Không hiện điểm/coverage trong lúc đang học.** Chỉ hiện ở Debrief.
6. Free tier có thể dùng data để train → **chỉ đưa data pack hoặc data giả**, không đưa dữ liệu thật của người thật.

---

## 9. Bắt đầu

```bash
npx create-next-app@latest . --typescript --tailwind --app
npx shadcn@latest init
npx shadcn@latest add button card input scroll-area progress badge

cp .env.example .env.local     # điền GEMINI_API_KEY hoặc ANTHROPIC_API_KEY
npm run dev
```

Thứ tự build:

1. **Flow bấm được, data giả, chưa cần AI** — 3 màn + 3 nút giả lập 3 nhánh Stage 0. Deploy Vercel lấy URL.
2. Nối Stage 1 thật (`temperature: 0`) + Supabase.
3. Nối Stage 2, khoá không cho nó thấy checklist content.
4. Golden set ≥20 case chạy trên Stage 1 → lấy số.
5. 5 bạn cùng lớp học thật, log đầy đủ.

Đừng dựng UI đẹp trước khi flow thông.
