| # | Dòng | Nội dung |
|---|---|---|
| 1 | Track + đề | |
| 2 | Job executor (ai · đang ở đâu · làm gì) | |
| 3 | Pain một câu (ai – đang làm gì – vướng đâu – hậu quả) | |
| 4 | 1–2 bằng chứng đầu (số + cách đếm + mã hội thoại/tin nhắn, hoặc khảo sát/phỏng vấn có số người) | |
| 5 | Lát cắt MỘT CÂU (1 user · 1 việc · 1 quyết định AI · 1 kết quả) | |
| 6 | AI tự làm đến đâu + 1 dòng lý do · ≥3 willing users ngoài nhóm | |
| 7 | Phân công có tên | |

1. **Track + đề:** D · VLearn Tutor
2. **Job executor:** Học viên đang theo dõi slide trong buổi học, kết hợp với nghe giảng
3. **Pain:** TA/Giảng viên không nắm được liệu học viên trong lớp có hiểu bài thật sự hay không? Nhưng sinh viên lại cảm thấy ngại khi đặt câu hỏi cho giảng viên.
4. **Bằng chứng đầu:**
   - `XXX/X.XXX` phản hồi tutor có `citations` rỗng (`XX%`). *Cách đếm:* lọc `role = tutor` trong `tutor_turns.csv`, đếm `citations = []`. *Mã hội thoại minh hoạ:* `T0XXXX`, `T0XXXX`, `T0XXXX`.
   - Khảo sát nhanh `XX` học viên trong lớp: `XX/XX` nói "lần gần nhất hỏi tutor, không biết câu trả lời lấy từ trang nào".
5. **Lát cắt:** Học viên đang đọc slide, tới từng checkpoint, AI sẽ đặt câu hỏi cho học viên trả lời bằng văn bản và AI sẽ dẫn dắt để học viên trả lời trọn vẹn, chính xác kiến thức trong slide
6. **AI tự làm đến đâu:** *Tự:* truy xuất bài học, chọn đoạn nguồn, sinh câu trả lời kèm trang. *Không tự:* suy đoán khi không tìm được nguồn — phải nêu rõ chưa đủ căn cứ. *Lý do:* `XX%` phản hồi hiện không có citation; nội dung học tập không kiểm chứng được có thể làm học viên học sai. **Willing users (ngoài nhóm, đã hỏi và đồng ý):** `[Tên 1]`, `[Tên 2]`, `[Tên 3]`.
7. **Phân công:** `Phùng Quang Minh Huy` — mining evidence, bảng đếm + mã hội thoại · `Lưu Nguyên Khôi` — retrieval/prompt + tiêu chí "đủ căn cứ" · `Chu Thùy Dương` — prototype + AI call thật · `Nguyễn Minh Hiếu` — spec, golden set, demo