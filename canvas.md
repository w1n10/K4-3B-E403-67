| # | Dòng | Nội dung |
|---|---|---|
| 1 | Track + đề | |
| 2 | Job executor (ai · đang ở đâu · làm gì) | |
| 3 | Pain một câu (ai – đang làm gì – vướng đâu – hậu quả) | |
| 4 | 1–2 bằng chứng đầu (số + cách đếm + mã hội thoại/tin nhắn, hoặc khảo sát/phỏng vấn có số người) | |
| 5 | Lát cắt MỘT CÂU (1 user · 1 việc · 1 quyết định AI · 1 kết quả) | |
| 6 | AI tự làm đến đâu + 1 dòng lý do · ≥3 willing users ngoài nhóm | |
| 7 | Phân công có tên | |

1. **Track + đề:** D3 · Agent Học Trò — Học bằng cách dạy (Protégé Effect)
2. **Job executor:** Học viên đang theo dõi slide trong buổi học trên VLearn, kết hợp với nghe giảng, cần ôn lại và kiểm tra xem mình đã hiểu đúng chưa
3. **Pain:** Học viên không có cách kiểm chứng liệu mình đã thực sự hiểu bài hay chỉ đọc qua — tutor AI hiện tại chỉ trả lời thụ động (90% dùng `review_concept`, chỉ 28/13.494 lượt `ask_probing_question`), không bao giờ hỏi ngược để kiểm tra mức hiểu; giảng viên/TA không thể kiểm tra 1:1 với ~450 học viên.
4. **Bằng chứng đầu:**
   - **3.781/13.494** phản hồi tutor **không có trích dẫn tài liệu** (`has_citation = False`, chiếm **28,0%**). *Cách đếm:* lọc `has_citation = False` trong `tutor_turns.csv`, đếm số dòng. *Mã hội thoại minh hoạ:* `T00009` (hỏi "giải thích LLM là gì" — tutor trả lời không dẫn nguồn), `T00480` (hỏi "lấy ví dụ trang 45 để hiểu rõ hơn" — không citation), `T00486` (hỏi "sự khác nhau ML và DL chưa rõ" — không citation), `T01922` (hỏi "hallucination trong AI là gì vậy" — không citation), `T00850` (hỏi "phân loại output vào correct, safe fallback hay hallucinated?" — không citation).
   - Tutor hiện tại **gần như không hỏi ngược học viên**: chỉ **28/13.494 lượt** dùng `ask_probing_question` (0,2%), trong khi `review_concept` chiếm **12.127 lượt** (89,9%). *Cách đếm:* đếm `move_used` trong `tutor_turns.csv`. *Mã minh hoạ:* `T00470` (học viên hỏi "làm sao đánh giá mình đã học xong?" — tutor chỉ tóm tắt, không hỏi ngược kiểm tra), `T10291` (học viên hỏi "nên ôn phần nào trước?" — tutor chỉ gợi ý, không kiểm tra xem đã hiểu phần nào).
5. **Lát cắt:** Một học viên · dạy lại khái niệm "Vì sao LLM bịa (hallucination)" cho agent học trò · agent so khớp lời giải thích với checklist 7 ý từ transcript-06 và hỏi ngược tại chỗ giải thích còn hổng · học viên bổ sung đủ ý và giải thích được bằng cách diễn đạt của mình.
6. **AI tự làm đến đâu:** *Tự:* so khớp lời giải thích của học viên với checklist kiến thức (Stage 1 Evaluator, temp=0), sinh câu hỏi ngây thơ tại ý còn thiếu (Stage 2 Persona, temp=0.8). *Không tự:* khi không match được ý nào — báo rõ chưa hiểu và nhờ học viên giải thích lại, không bao giờ đưa đáp án. *Lý do:* Stage 2 bị cắt quyền đọc nội dung checklist — chỉ nhận mã ý thiếu (K3, K5) mà không biết K3 viết gì — đảm bảo bằng kiến trúc rằng agent không thể lộ đáp án. **Willing users (ngoài nhóm, đã hỏi và đồng ý):** `[Tên 1]`, `[Tên 2]`, `[Tên 3]`.
7. **Phân công:** `Phùng Quang Minh Huy` — mining evidence, content/*.json, bảng đếm + mã hội thoại, database · `Lưu Nguyên Khôi` — Stage 0 guardrail + Stage 1 evaluator prompt · `Chu Thùy Dương` — prototype UI + orchestrator + Stage 2 persona + AI call · `Nguyễn Minh Hiếu` — spec, golden set, debrief, dashboard, demo