# BÁO CÁO THU HOẠCH CÁ NHÂN (PERSONAL REFLECTION)
## Mini Hackathon AI — Lớp 3B · Phòng E403 · Nhóm 67
**Dự án:** VLearn Teachable Learner (Track D3: Agent Học Trò — Protégé Effect)

---

### Thông tin cá nhân
- **Họ và tên:** Phùng Quang Minh Huy
- **Vai trò trong nhóm:** Data Mining & Knowledge Content Engineer / Evidence (Chuẩn B)
- **Phần việc trực tiếp phụ trách:** Khai phá 13.494 lượt hội thoại trong `vlearn.db`, xây dựng hai bộ nội dung `content/day01-llm-foundation.json` và `content/day02-xac-dinh-bai-toan-kinh-doanh-cho-ai.json`, trích xuất bằng chứng chuẩn B (quote + `turn_id`), và dựng bảng đếm / trực quan hoá thống kê.

---

## 1. Vai trò cá nhân & Phần việc trực tiếp phụ trách

### 1.1. Khai phá chatlog thực tế (`vlearn.db`, 13.494 lượt)
1. Tôi viết `scripts/init_db.py` để nạp và chuẩn hoá dữ liệu thô từ `tutor_turns.csv` vào SQLite, tách thành hai bảng: `raw_tutor_turns` (13.494 lượt) và `lecture_hotspots` (489 cụm chủ đề nóng).
2. Tôi đếm và kiểm chứng các con số nền cho phần "pain": **3.781/13.494** phản hồi không có trích dẫn tài liệu (`has_citation = False`, 28,0%); chỉ **28/13.494** lượt dùng `ask_probing_question` (0,2%) so với **12.127** lượt `review_concept` (89,9%).
3. Tôi lọc theo `is_preset = 0` để tách câu hỏi organic khỏi câu hỏi mẫu, và giữ riêng hai cột `total_questions` / `organic_questions` để không thổi phồng mức độ ảnh hưởng của từng chủ đề.

### 1.2. Trích xuất bằng chứng chuẩn B & xây bộ nội dung hai bài giảng
1. Tôi chọn và trích ≥5 quote nguyên văn kèm `turn_id` thật (`T01922`, `T00842`, `T00207`, `T00393`, `T00850`) cùng bảng impact xếp hạng các ứng viên tính năng.
2. Tôi biên soạn hai file nội dung khớp hai bộ slide của ban tổ chức: `day01-llm-foundation` (7 ý K1–K7 + 3 misconception M1–M3, trích `transcript-04`) và `day02-xac-dinh-bai-toan-kinh-doanh-cho-ai` (7 ý + 3 misconception, trích `transcript-01` và `transcript-02`).
3. Mỗi ý đều gắn `source` là mã đoạn `[Txx-NNN]` và một `excerpts` nguyên văn ngắn. Nhờ vậy Evaluator có căn cứ đối chiếu, còn Guardrail Stage 0 có sẵn mẫu để so trùng — mọi kết luận đều "kiểm lại được" thay vì dựa vào cảm nhận.

### 1.3. Bảng đếm & trực quan hoá dữ liệu khai phá
1. Tôi dựng `generate_statistics.py` và `generate_visualizations.py` để sinh `lecture_slide_part_statistics.csv/json` cùng 4 biểu đồ PNG về hotspot K4 và top slide/part.
2. Tôi viết `build_dashboard.py` xuất `evidence/lecture_analysis_dashboard.html` giúp cả nhóm nhìn nhanh bức tranh chủ đề nóng mà không phải chạy lại SQL.
3. Toàn bộ quy trình được tài liệu hoá trong `docs/data-pipeline.md` (nguồn dữ liệu → cách đếm → cách chạy lại) để người chấm có thể tái lập từ dữ liệu gốc.

---

## 2. Cách ứng dụng AI trong quá trình xây dựng

### 2.1. Gom cụm câu hỏi và phát hiện ngộ nhận (Hotspot & Misconception Discovery)
1. Tôi dùng AI để gom cụm các câu hỏi gần nghĩa trong 489 hotspot, giúp rút ra nhanh các chủ đề lặp lại nhiều lần (token, context, attention, hallucination) thay vì đọc thủ công từng cụm.
2. Tôi dùng AI đóng vai nhiều kiểu học viên khác nhau để rà xem một câu hỏi thật có thể ẩn bao nhiêu cách hiểu sai, từ đó chốt danh sách M1–M3 cho từng bài.

### 2.2. Tăng tốc viết script SQL/pandas và trực quan hoá
1. AI hỗ trợ tôi viết khung truy vấn SQLite và pandas cho `generate_statistics.py`, đặc biệt ở các bước group-by nhiều tầng theo `cohort_hint`, `course_id`, `lecture_code`.
2. Với `generate_visualizations.py`, AI giúp tôi căn chỉnh nhãn trục và màu biểu đồ, rút ngắn đáng kể thời gian thử–sai khi muốn 4 biểu đồ đọc được nhất quán.

### 2.3. Phản biện cách chọn ứng viên chủ đề
1. Tôi đưa bảng impact 3 ứng viên (A/B/C) cho AI đóng vai giám khảo khó tính để chất vấn: con số nào lấy từ đâu, có đang đếm gộp preset không, chủ đề chọn đã khớp slide chưa.
2. Nhờ đó tôi bổ sung cột `organic_questions` và đối chiếu lại đúng hai bộ slide thực có trong `data/vlearn-pack/slides` trước khi chốt phạm vi nội dung.

---

## 3. Bài học thực tế rút ra từ trường hợp thất bại của nhóm

### 3.1. Đếm gộp preset + organic làm sai lệch mức độ ảnh hưởng (Hotspot nhiễu)
1. Ở bản đầu, bảng `lecture_hotspots` cộng cả câu hỏi mẫu của hệ thống (`is_preset = 1`) với câu hỏi thật của học viên, khiến một vài chủ đề trông "nóng" hơn thực tế.
2. Nguyên nhân là tôi chưa tách biến phân loại ngay từ bước nạp dữ liệu, dẫn tới con số impact dùng để xếp hạng bị lệch.
3. Bài học: trước khi tin một con số dùng để ra quyết định, phải kiểm tra định nghĩa của chính con số đó — tôi bổ sung `organic_questions` và chỉ xếp hạng trên phần organic.

### 3.2. Nội dung không gắn mã nguồn thì không thể kiểm chứng
1. Bản nháp đầu của `content/*.json` viết các ý theo cảm nhận và không gắn mã đoạn, nên khi bị chất vấn "ý này lấy từ đâu" thì không trả lời được.
2. Nhóm phải làm lại: mỗi ý bắt buộc có `source` `[Txx-NNN]` và một `excerpts` nguyên văn, để Evaluator và Guardrail có cùng một nguồn sự thật.
3. Bài học: với sản phẩm AI, phần "trích dẫn được" không phải trang trí — nó là điều kiện để hệ thống chống bịa và để người chấm tin được kết quả.

---

## 4. Tự đánh giá & Chuẩn bị cho vòng phản biện (CP6)
1. Tôi nắm rõ từng con số trong `spec.md §1` (13.494 lượt, 489 hotspot, 28/13.494 `ask_probing_question`, 3.781 phản hồi thiếu citation) và giải thích được cách đếm cũng như câu SQL sinh ra chúng.
2. Tôi sẵn sàng demo chạy lại `scripts/init_db.py` → `generate_statistics.py` → `generate_visualizations.py` để chứng minh dữ liệu trong `content/*.json` có nguồn gốc thật.
3. Phần tôi tự tin nhất là quy tắc "mỗi ý phải có `source`"; phần tôi sẽ nói thẳng nếu bị hỏi là các con số impact chỉ mạnh ở nhóm câu hỏi nền tảng, nên nhóm đã giới hạn phạm vi vào đúng hai bài giảng có slide thay vì hứa phủ toàn bộ khoá.
