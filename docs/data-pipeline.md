# Đường ống Dữ liệu & Bằng chứng (Track D3 — Agent Học Trò)

> **Tài liệu tổng hợp:** Chiến lược khai phá chatlog, chuẩn hóa sự sai lệch giữa các khóa học, bảo mật dữ liệu tuyệt đối, và cách biến số liệu mining thành artifact ăn điểm trong repo.

**Repo này không chứa database của sản phẩm.** SQLite ở đây chỉ phục vụ một việc: **khai phá dữ liệu để lấy bằng chứng**. Runtime của app nằm chỗ khác — xem §3.

---

## 1. Nguyên tắc Bảo mật Dữ liệu Tuyệt đối (Security & Zero-Leakage)

Theo quy định bắt buộc của Hackathon và `README.md` (§"Bảo mật dữ liệu được cung cấp"):

- **Không bao giờ đăng tải dữ liệu lên mạng công khai (Public):** Toàn bộ file dữ liệu gốc (`tutor_turns.csv`), file database (`vlearn.db`), các bản trích xuất thống kê `.csv` / `.json` phải được giữ 100% Offline trên máy cục bộ.
- **Cấu hình `.gitignore` đã áp dụng:**
  ```gitignore
  data/
  *.csv
  *.db
  *.sqlite
  *.sqlite3
  *.duckdb
  *.env*
  !*.env.example
  ```
- **Tính di động (Portability) giữa các máy:**
  - Không truyền file database qua Git.
  - Thay vào đó, commit script tái lập [scripts/init_db.py](../scripts/init_db.py). Bất kỳ thành viên nào chỉ cần kéo code về, đặt data vào thư mục `data/` và chạy `python scripts/init_db.py` là có ngay database hoàn chỉnh trong ~1 giây.
- **App deploy công khai:** file duy nhất mang nội dung data pack ra ngoài là `content/<topic>.json`. Chỉ được chứa **trích đoạn ngắn** minh hoạ, không phải nguyên transcript. Soát lại file này trước mỗi lần deploy.

---

## 2. Một tầng, một mục đích: khai phá bằng chứng

```
                    ┌─────────────────────────────┐
                    │      vlearn.db (SQLite)      │   local, không bao giờ rời máy
                    └──────────────┬───────────────┘
                                   │
                 ┌─────────────────┴──────────────────┐
                 ▼                                    ▼
      raw_tutor_turns (13.494 dòng)        lecture_hotspots (489 dòng)
      câu hỏi + trả lời + trường            tổng hợp thắc mắc theo
      trích xuất bằng regex                 Slide / Module (≥5 câu hỏi)
                 │                                    │
                 └─────────────────┬──────────────────┘
                                   ▼
                        artifact commit vào repo  (§4)
```

**Chi tiết hai bảng:**

1. **`raw_tutor_turns` (13.494 dòng):** Lưu toàn bộ lịch sử hỏi đáp được làm giàu bằng các trường trích xuất:
   - `slide_in_question`: Số trang trích từ regex `(Trang \d+)`.
   - `part_in_question`: Tên module trích từ regex `(Đang học phần "...")`.
   - `selected_snippet`: Đoạn bôi đen từ regex `(đoạn được chọn: "...")`.
   - `cited_slides`: Mảng JSON các trang slide do tutor trích dẫn `[trang \d+]`.
2. **`lecture_hotspots` (489 dòng):** Bảng tổng hợp các cụm kiến thức có từ 5 câu hỏi trở lên theo từng Slide hoặc Module.

---

## 3. Runtime của sản phẩm KHÔNG nằm ở đây

Trước đây `init_db.py` tạo thêm 5 bảng runtime (`topics`, `checklist_items`, `misconceptions`, `sessions`, `turns`, `golden_cases`). **Đã bỏ.** Lý do: `vlearn.db` bị `.gitignore` chặn, nên mọi thứ nằm trong đó đều **vô hình với người chấm**.

Chúng chuyển đi đâu:

| Dữ liệu | Giờ nằm ở |
|---|---|
| `topics`, `checklist_items`, `misconceptions` | `content/<topic>.json` — app đọc trực tiếp, không cần DB |
| `sessions`, `turns` | `SessionStore` adapter — xem [architecture.md §6](architecture.md#6-lưu-phiên-học) |
| `golden_cases` | `golden/cases.json` — file commit được |

---

## 4. Đầu ra: artifact phải commit vào repo

> Rubric ghi rõ: *"chấm trên artifact trong repo — mỗi con điểm trỏ về một file"*.
> **Số liệu nằm trong `vlearn.db` không tính điểm.** Phải xuất ra file.

| File | Phục vụ | Cần có gì |
|---|---|---|
| `evidence/mining-report.md` | **R1 · 15đ** | xem bảng dưới |
| `content/<topic>.json` | đầu vào sản phẩm | 5–7 checklist item + 2–3 misconception, mỗi cái gắn mã nguồn |
| `golden/cases.json` | **R4 · 15đ** | ≥20 case, ≥10 lấy từ `raw_tutor_turns` |
| `logs/session-*.json` | **R5 · 8đ · R6 · +8đ** | export từ `SessionStore` sau khi tester chạy |

**`evidence/mining-report.md` phải có đủ 4 thứ** (mỗi thứ là một dòng điểm R1):

| Thành phần | Điểm | Ghi chú |
|---|---|---|
| Số mining đếm được + **phương pháp đếm kiểm lại được** | 6 | dán thẳng câu SQL đã dùng cho từng con số |
| **≥5 ví dụ nguyên văn** kèm `turn_id` | (trong 6đ trên) | `T0xxxx` để TA mở ra đối chiếu |
| Pain cụ thể: ai — đang làm gì — vướng đâu — hậu quả | 3 | |
| **Bảng impact ≥3 ứng viên** có con số (bao nhiêu người × tần suất × tốn gì mỗi lần) | 3 | |
| **Ứng viên bị loại + lý do chọn bằng số** | 3 | giữ lại cả phương án đã bỏ |

Biểu đồ PNG và dashboard HTML là phần phụ trợ — chúng có số nhưng **không có cách đếm và không có quote**, nên một mình chúng không đủ lấy 6 điểm chuẩn B.

---

## 5. Bản chất Sự lệch (Mismatch) Dữ liệu & Phương án Chuẩn hóa

### 5.1. Vì sao `lecture_code` và `lecture_title` khác nhau?
- `lecture_code` (`D01`, `D02`...) là mã nội bộ của từng môn/khóa (`course_id`), **không mang tính duy nhất trên toàn hệ thống**:
  - `D01` ở `COMP2010` (K3 Core): là "Day01 - LLM Foundation".
  - `D01` ở `BIOM3010` (K3 Track 2 - Cloud): là "Day16 - Cloud Infrastructure".
  - `D01` ở `COMP3011` (K3 Track 1 - PM): là "Day16 - AI Product Manager".
  - `D01` ở `L2-L3-K4P1` (K4 Track Thị giác máy tính): là "Data".
- **Đặc biệt ở khóa K4 (`K4P1`):** Giảng viên chia nhỏ các phần tải lên LMS dẫn đến mã bài học bị nhảy:
  - Buổi 1: `D01` ("Day01")
  - **Buổi 2: `D03` ("DAY02")** — *(không phải D02!)*
  - **Buổi 3: `D04` ("DAY03")**
  - **Buổi 4: `D08` ("DAY04")**
- 👉 **Quy tắc:** Luôn kết hợp `course_id` + `lecture_code` hoặc dùng `lecture_title` để nhận diện bài học.

### 5.2. Xử lý Mismatch giữa Slide Hotspot và Module Hotspot
- **Khoá K3:** Học viên chọn Slide rồi hỏi → Có `slide_in_question`, nhưng thiếu tên module.
- **Khoá K4:** Học viên học theo Module trên web → Có `part_in_question` (99.7% câu hỏi), nhưng `slide_in_question` bị `NULL`.
- **Cầu nối (Bridge) chuẩn hóa:** Dùng trường **`cited_slides`** từ câu trả lời của Tutor. Trong khóa K4, có hơn **2.210 lượt Tutor trả lời kèm trích dẫn `[trang N]`**. Ta ánh xạ `Module <-> Slide` dựa trên số trang slide mà tutor thường trích dẫn nhiều nhất tại module đó.
- **Chuẩn hóa nhãn buổi học (`canonical_day`):** Gom toàn bộ các biến thể tên về nhãn chung (`Day 01`, `Day 02`, `Day 03`...).

---

## 6. Đánh giá Sư phạm về Ý tưởng "Lấy câu hỏi nhiều nhất để hỏi dẫn dắt"

### 6.1. Điểm mạnh (Evidence chuẩn B cho Rubric R1 & R4)
- Dựa trên dữ liệu thực tế chứng minh điểm nghẽn nhận thức lớn nhất của lớp học.
- Trích xuất được các hiểu lầm thật (`misconceptions`) thay vì tự phỏng đoán.

### 6.2. Cạm bẫy cần tránh
1. **Cạm bẫy thời gian (Time-window Trap):**
   - Ngày **30/07/2026** có **2.579 câu hỏi** (chiếm gần 20% data) do có hoạt động làm bài trực tiếp trên lớp.
   - Ngày **02/08/2026** hệ thống sập 23 giờ (rớt data, không phải học viên hiểu bài).
   - 👉 *Khắc phục:* Không nhóm theo khoảng thời gian/ngày giờ đơn thuần, mà nhóm theo **Module / Chủ đề** và lọc câu hỏi tự gõ (`is_preset = 0`).
2. **Nguy cơ lệch đề sang Track A (Socratic Tutor):**
   - **Track D3 là "Học bằng cách dạy" (Protégé Effect):** Học viên là **Thầy**, Agent là **Học trò ngây thơ**.
   - Nếu Agent mang câu hỏi khó ra để "hỏi dẫn dắt / vặn vẹo", Agent sẽ bị chấm lệch sang vai Trợ giảng (Track A), vi phạm rubric D3: *"Agent ngây thơ có kiểm soát, không lộ đáp án, không đóng vai người chấm thi"*.

### 6.3. Giải pháp tối ưu: Biến câu hỏi khó thành câu hỏi ngây thơ của bạn học trò
Dùng các câu hỏi có thật từ học viên trong quá khứ để làm mồi nhử cho **Stage 2 (Teachable Persona)** khi học viên giải thích còn thiếu ý hoặc hiểu sai:

| Câu hỏi gốc của học viên trong Data | Chuyển thành câu hỏi ngây thơ của Agent học trò (Stage 2) |
| :--- | :--- |
| **`T11435` (K4 Live - Buổi 2):**<br>*"tôi đang ko hiểu ở cái AI lifecycle thì baseline lại đứng sau data readline nhỉ"* | *"Ủa bạn ơi, mình đọc chỗ AI Lifecycle mà lú quá: sao người ta lại cần làm cái baseline đứng sau data readiness vậy bạn? Không có baseline thì mô hình AI không chạy được hả bạn?"* |
| **`T11837` (K4 Live - Buổi 2):**<br>*"Double Diamond áp dụng vào bài toán phân loại khách hàng thì giai đoạn Discover cần làm gì?"* | *"Bạn ơi, cái mô hình Double Diamond nghe lạ quá, nếu mình muốn làm AI phân loại khách hàng thì bước đầu tiên mình phải làm gì để không bị làm sai bài toán vậy bạn?"* |
| **`T00824` (K3 Core - Buổi 1):**<br>*"LLM tìm kiếm câu trả lời trong cơ sở dữ liệu như thế nào?"* | *"Ủa bạn ơi, hôm trước mình nghe nói LLM nhớ siêu lắm, có phải bên trong nó có một cái database khổng lồ để tra cứu dữ kiện như Google Search không bạn?"* |

> **Lưu ý kiến trúc:** bảng chuyển đổi này là **nguyên liệu soạn prompt Stage 2**, không phải dữ liệu Stage 2 được đọc lúc chạy. Stage 2 vẫn không được nhận nội dung checklist — xem [architecture.md §2](architecture.md#2-kiến-trúc-lõi--3-tầng).

---

## 7. Hướng dẫn Truy vấn Thực tế (SQL Queries)

### 7.1. Câu lệnh SQL lọc câu hỏi Buổi 2 ngây thơ (Ưu tiên Live > History)
```sql
SELECT 
    turn_id,
    period,
    cohort_hint,
    course_id,
    lecture_code,
    part_in_question,
    student_question,
    cited_slides
FROM raw_tutor_turns
WHERE is_preset = 0
  -- Lọc đúng nội dung Buổi 2 (gồm cả K4 D03 và K3 D02/D17)
  AND (
      (course_id = 'K4P1' AND lecture_code = 'D03')
      OR (course_id = 'COMP2010' AND lecture_code IN ('D02', 'D17'))
      OR lecture_title LIKE '%day02%'
  )
  -- Lọc độ dài hợp lý (không cụt, không quá dài)
  AND q_len BETWEEN 30 AND 200
  -- Bỏ câu hỏi tải tài liệu hoặc trêu chọc bot
  AND student_question NOT LIKE '%download%'
  AND student_question NOT LIKE '%tải về%'
  AND student_question NOT LIKE '%mày là%'
ORDER BY 
  -- 1. Ưu tiên kỳ Live trên History
  CASE WHEN period = 'live' THEN 1 ELSE 2 END ASC,
  -- 2. Ưu tiên khoá K4 gần nhất
  CASE WHEN cohort_hint = 'K4' THEN 1 ELSE 2 END ASC,
  -- 3. Ưu tiên câu có gắn module bài học
  CASE WHEN part_in_question IS NOT NULL THEN 1 ELSE 2 END ASC,
  turn_id DESC
LIMIT 10;
```

### 7.2. Đoạn mã Python chạy truy vấn trực tiếp
```python
import sqlite3

conn = sqlite3.connect("vlearn.db")
cursor = conn.cursor()

query = """
SELECT turn_id, cohort_hint, period, part_in_question, student_question
FROM raw_tutor_turns
WHERE is_preset = 0
  AND ((course_id = 'K4P1' AND lecture_code = 'D03') OR lecture_title LIKE '%day02%')
  AND q_len BETWEEN 35 AND 180
  AND student_question NOT LIKE '%tải%'
ORDER BY 
  CASE WHEN period = 'live' THEN 1 ELSE 2 END ASC,
  CASE WHEN cohort_hint = 'K4' THEN 1 ELSE 2 END ASC
LIMIT 5;
"""

cursor.execute(query)
for tid, cohort, period, part, q in cursor.fetchall():
    print(f"[{tid} | {cohort} | {period}] Phần: {part}")
    print(f"Câu hỏi: {q.strip()}\n---")

conn.close()
```

> **Mỗi câu SQL dùng để ra một con số trong `evidence/mining-report.md` thì phải dán vào báo cáo đó.** Rubric R1 chấm *"phương pháp đếm kiểm lại được"* — câu SQL chính là phương pháp.

---

## 8. Checklist cho Thành viên Nhóm

- [x] Đã chạy `python scripts/init_db.py` tạo `vlearn.db`.
- [x] Đã cấu hình `.gitignore` chặn rò rỉ dữ liệu `*.db`, `*.csv`.
- [ ] Chọn 1 chủ đề trọng tâm từ Top Hotspots (Khuyến nghị: `day03-tu-chatbot-den-agentic-agent-react` hoặc `llm-hallucination`).
- [ ] Rút 5–7 checklist items (`K1..K7`) và 2–3 misconceptions (`M1..M3`) đưa vào `content/<topic>.json`.
- [ ] Dùng các câu hỏi thật đã query để xây dựng Golden Set (≥ 20 case) trong `golden/cases.json`.
- [ ] **Viết `evidence/mining-report.md`** — số + SQL + ≥5 quote có `turn_id` + bảng impact + ứng viên đã loại (§4).
