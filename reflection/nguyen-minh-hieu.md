# BÁO CÁO THU HOẠCH CÁ NHÂN (PERSONAL REFLECTION)
## Mini Hackathon AI — Lớp 3B · Phòng E403 · Nhóm 67
**Dự án:** VLearn Teachable Learner (Track D3: Agent Học Trò — Protégé Effect)

---

### Thông tin cá nhân
- **Họ và tên:** Nguyễn Minh Hiếu
- **Vai trò trong nhóm:** Core AI / Backend Engineer
- **Phần việc trực tiếp phụ trách:** Triển khai kiến trúc 3 tầng — `lib/guard.ts` (Stage 0), `lib/evaluator.ts` (Stage 1), `lib/persona.ts` (Stage 2); route handler điều phối tại `app/api/checkpoint/route.ts`; adapter model `lib/llm.ts`; và tầng lưu phiên `lib/db.ts` + `lib/supabase-store.ts`.

---

## 1. Vai trò cá nhân & Phần việc trực tiếp phụ trách

### 1.1. Kiến trúc 3 tầng và nguyên tắc Zero Answer Leakage
1. Tôi viết `lib/guard.ts` (Stage 0) với 3 luật thuần code, 0 token: chặn dán nguyên văn tài liệu, chặn hỏi ngược để xin đáp án, và chặn câu bỏ cuộc/lười gõ; mỗi luật có câu trả lời mẫu riêng theo từng phong cách nhân vật.
2. Tôi viết `lib/evaluator.ts` (Stage 1) chạy `temperature = 0`, buộc model trích dẫn `evidence` nguyên văn và có assertion kiểm tra `student_text.includes(evidence)` để hủy mọi căn cứ do model tự bịa.
3. Tôi viết `lib/persona.ts` (Stage 2) theo nguyên tắc **cắt quyền đọc checklist**: tầng này chỉ nhận đúng một câu hỏi gợi mở, không nhận `items`, `excerpts` hay nhãn đáp án — nên về mặt kiến trúc, agent không thể lộ đáp án kể cả khi bị dụ.

### 1.2. Orchestrator chạy trên serverless và luật "kẹt" tất định
1. Tôi viết `app/api/checkpoint/route.ts` điều phối Stage 0 → 1 → 2, với điều kiện thoát: phủ `≥ 5/7` và không còn misconception mở, hoặc chạm trần 8 lượt.
2. Vì route chạy trên môi trường không giữ state, tôi dựng lại toàn bộ trạng thái phiên từ các lượt đã ghi trong DB ở mỗi request, thay vì tin vào biến trong RAM.
3. Tôi thêm luật "kẹt" trong `lib/stuck.ts`: đếm số lượt liên tiếp không tiến bộ (sai câu hỏi vừa rồi, hoặc bỏ cuộc) — lần thứ 3 thì nhắc xem lại bài giảng kèm nút mở đúng trang slide, nhắc rồi vẫn không tiến bộ thêm 2 lần thì dừng phiên với `exit_reason = "stuck"`. Luật này thuần code nên không tốn token và đo được.

### 1.3. Tầng lưu phiên và an toàn khoá dữ liệu
1. Tôi định nghĩa interface `SessionStore` trong `lib/db.ts` để đổi nơi lưu mà không phải sửa orchestrator, kèm `MemoryStore` cho lúc phát triển và `SupabaseStore` cho lúc chạy thật.
2. Tôi cấu hình Supabase dùng `service_role` **chỉ ở phía server**, bật RLS trên `sessions`/`turns` và không thêm policy cho `anon` — repo nhóm là công khai nên đây là điều kiện bắt buộc.
3. Tôi đảm bảo mọi lượt đều được ghi log (kể cả lượt bị Stage 0 chặn hoặc lỗi), vì đó chính là dữ liệu hành vi đáng giá nhất cho CP3.

---

## 2. Cách ứng dụng AI trong quá trình xây dựng

### 2.1. Thiết kế prompt bằng AI và ràng buộc bằng schema
1. Tôi dùng AI để phác prompt cho Evaluator rồi tự siết lại thành một schema JSON cố định, có `evidence` bắt buộc, để code kiểm tra được thay vì tin vào lời văn của model.
2. Tôi dùng AI sinh các biến thể câu trả lời (diễn đạt đời thường, dùng ẩn dụ) để kiểm tra Evaluator có nhận đúng bản chất thay vì so khớp từ khoá.

### 2.2. Tự tấn công hệ thống (Adversarial self-testing)
1. Tôi để AI đóng vai học viên lười, đòi đáp án và cố tình dán slide vào khung chat để thử Stage 0.
2. Chính các lần thử này phát hiện lỗi ở case `TC03` (ký tự đặc biệt làm lọt lưới so khớp), sau đó tôi bổ sung chuẩn hoá ký tự trước khi so trùng.

### 2.3. Rà soát mã và rủi ro biên
1. Tôi dùng AI review lại route handler để tìm các nhánh có thể làm mất log hoặc trả về lỗi rỗng cho client.
2. Tôi cũng dùng AI để liệt kê các trường hợp biên của việc đếm chuỗi "không tiến bộ" (lượt bị chặn vì lý do khác, lượt lỗi model) và quyết định lượt trung tính không được cộng cũng không được reset.

---

## 3. Bài học thực tế rút ra từ trường hợp thất bại của nhóm

### 3.1. Lọt lưới Guardrail ở case `TC03` (thất bại kỹ thuật)
1. Ở `TC03`, học viên dán nguyên văn slide nhưng câu chứa ký tự đặc biệt (`=` và em-dash `—`) khiến bộ tách từ của Stage 0 so khớp trượt, câu lọt vào Stage 1 và bị chấm sai.
2. Nguyên nhân là luật chống dán quá thô, chưa chuẩn hoá Unicode và dấu câu trước khi so khớp.
3. Bài học: phòng thủ bằng rule-based rất rẻ nhưng phải chuẩn hoá dữ liệu đầu vào trước; nếu không, chính ký tự đặc biệt sẽ mở đường cho lỗi.

### 3.2. Evaluator tự bịa bằng chứng (rủi ro nguồn sự thật)
1. Nếu chỉ tin vào lời model, Evaluator có thể "cho điểm" một ý mà học viên chưa hề nói và tự chế câu trích dẫn.
2. Tôi đã thêm bước kiểm chứng trong code: evidence phải là chuỗi con nguyên văn của câu học viên, sai thì hủy khỏi `covered`, đẩy về `missing` và ghi log cảnh báo.
3. Bài học: khi giao cho model một quyết định, luôn phải có một tầng code kiểm chứng độc lập — đây cũng chính là lý do nguyên tắc Zero Leakage được bảo đảm bằng kiến trúc chứ không bằng câu lệnh "đừng tiết lộ đáp án".

---

## 4. Tự đánh giá & Chuẩn bị cho vòng phản biện (CP6)
1. Tôi làm chủ luồng dữ liệu giữa 3 tầng: giải thích được vì sao Stage 2 chỉ nhận một câu hỏi, và vì sao mọi lượt đều phải được ghi log bất kể kết quả.
2. Tôi sẵn sàng giải trình cơ chế assertion chống bịa ở Stage 1, luật "kẹt" ở `lib/stuck.ts`, và cách route dựng lại state từ DB để chạy đúng trên serverless.
3. Phần tôi sẽ nói thẳng nếu bị hỏi là luật "kẹt" hiện dùng ngưỡng cố định 3 và 5 lượt — con số này nên được kiểm lại bằng log tester thật trước khi coi là tối ưu.
