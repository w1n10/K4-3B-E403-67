# Báo cáo khai phá dữ liệu — bằng chứng cho lát cắt D3

> **Trạng thái: KHUNG, CHƯA ĐIỀN.** Mỗi ô `___` phải thay bằng số tự đếm trên `vlearn.db`.
> Cách dựng DB: `python scripts/init_db.py` · phương pháp: [docs/data-pipeline.md](../docs/data-pipeline.md)

**Nguồn:** `data/vlearn-pack/chatlog/tutor_turns.csv` → `raw_tutor_turns` (13.494 lượt hỏi–đáp, 1.617 học viên, 22/07 → 15/09/2026).
**Không dán data pack vào file này** — chỉ trích tối đa 2 câu mỗi ví dụ, kèm `turn_id` để đối chiếu.

---

## 1. Số mining + phương pháp đếm

> R1 · 6đ — *"số mining đếm được + ≥5 ví dụ nguyên văn + phương pháp đếm kiểm lại được"*.
> Mỗi con số phải đi kèm câu SQL đã dùng. Người khác chạy lại phải ra đúng số đó.

### 1.1 `___` / `___` lượt (`___`%) — [tên hiện tượng đang đo]

**Cách đếm:**
```sql
-- dán nguyên câu SQL đã chạy
SELECT COUNT(*) FROM raw_tutor_turns
WHERE ...;
```

**Bộ lọc đã áp dụng và vì sao:**
- `is_preset = 0` — bỏ câu mẫu bấm sẵn, chỉ giữ câu học viên tự gõ.
- Loại ngày **30/07/2026** (2.579 câu, ~20% data, do hoạt động trên lớp chi phối thống kê).
- Loại ngày **02/08/2026** (hệ thống sập 23 giờ → rớt data, không phản ánh hành vi học).

### 1.2 `___` / `___` lượt (`___`%) — [hiện tượng thứ hai]

**Cách đếm:**
```sql

```

---

## 2. Năm ví dụ nguyên văn

> Mỗi dòng ≤2 câu trích. `turn_id` để TA mở `raw_tutor_turns` đối chiếu trong 30 giây.

| # | `turn_id` | Khoá · buổi | Trích nguyên văn (≤2 câu) | Cho thấy điều gì |
|---|---|---|---|---|
| 1 | `T_____` | | | |
| 2 | `T_____` | | | |
| 3 | `T_____` | | | |
| 4 | `T_____` | | | |
| 5 | `T_____` | | | |

*Ứng viên có sẵn từ `docs/data-pipeline.md` §6.3: `T11435`, `T11837`, `T00824` — cần bổ sung thêm và kiểm lại nội dung trên DB.*

---

## 3. Pain một câu

> R1 · 3đ — phải đủ 4 vế: **ai — đang làm gì — vướng đâu — hậu quả gì**.

| Vế | Nội dung |
|---|---|
| Ai | |
| Đang làm gì | |
| Vướng đâu | |
| Hậu quả | |

**Viết liền một câu:**

> ___

*(Câu này phải khớp với dòng 3 của [canvas.md](../canvas.md) — sửa một chỗ thì sửa cả hai.)*

---

## 4. Bảng impact — so ≥3 ứng viên bằng số

> R1 · 3đ — *"bao nhiêu người × tần suất × tốn gì mỗi lần"*. Không có số thì không tính.

| Ứng viên | Bao nhiêu người | Tần suất | Tốn gì mỗi lần | Impact ước tính |
|---|---|---|---|---|
| **A.** [tên bài toán] | `___` học viên | `___` lần/buổi | `___` phút · `___` | |
| **B.** | | | | |
| **C.** | | | | |

**Cách ước tính:** ghi rõ quy tắc nhân, ví dụ *"số học viên K4 có ≥1 lượt hỏi ở module X × số buổi × thời gian trung bình tự dò lại tài liệu"*. Ước tính thô được, nhưng phải nói rõ là ước tính và dựa trên đâu.

---

## 5. Ứng viên đã loại + lý do bằng số

> R1 · 3đ — *"ứng viên bị loại được giữ lại + lý do chọn bằng số"*. Đây là mục dễ bị bỏ quên nhất.

| Ứng viên đã loại | Số liệu khiến loại | Lý do |
|---|---|---|
| | `___` | |
| | `___` | |

**Vì sao chọn ứng viên còn lại:** ___

---

## 6. Giới hạn của bằng chứng này

> Khai thật giới hạn được điểm trung thực; giấu thì mất. Rubric: *"kết quả đo được ghi nhận trung thực — kể cả khi không đạt — vẫn được tính đủ điểm"*.

- Ngày 30/07 có 2.579 lượt (một hoạt động trên lớp) chi phối thống kê → đã loại khỏi mọi phép đếm ở §1.
- `understanding_level` gần như rỗng toàn bộ data → không dùng làm bằng chứng cho mức hiểu.
- Chỉ 1,3% lượt có rating (92 up / 85 down) → mẫu quá nhỏ, không kết luận được gì về chất lượng.
- K4 học theo Module nên `slide_in_question` bị `NULL`; K3 ngược lại → xem cách bắc cầu ở [docs/data-pipeline.md](../docs/data-pipeline.md) §5.2.
- `___` (bổ sung giới hạn nhóm tự phát hiện khi mining)

---

## 7. Artifact kèm theo

| File | Là gì |
|---|---|
| [lecture_analysis_dashboard.html](lecture_analysis_dashboard.html) | Dashboard tương tác toàn bộ hotspots |
| [visualization_k4_hotspots.png](visualization_k4_hotspots.png) | Hotspot khoá K4 |
| [visualization_top_parts.png](visualization_top_parts.png) | Module bị hỏi nhiều nhất |
| [visualization_top_slides.png](visualization_top_slides.png) | Slide bị hỏi nhiều nhất |
| [visualization_overall_slides.png](visualization_overall_slides.png) | Phân bố tổng thể |
| `lecture_slide_part_statistics.json` | Số liệu thô sinh ra các biểu đồ trên |

Dựng lại toàn bộ: `python generate_statistics.py && python generate_visualizations.py && python build_dashboard.py`
