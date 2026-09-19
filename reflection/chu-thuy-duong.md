# BÁO CÁO THU HOẠCH CÁ NHÂN (PERSONAL REFLECTION)
## Mini Hackathon AI — Lớp 3B · Phòng E403 · Nhóm 67
**Dự án:** VLearn Teachable Learner (Track D3: Agent Học Trò — Protégé Effect)

---

### Thông tin cá nhân
- **Họ và tên:** Chu Thùy Dương
- **Vai trò trong nhóm:** Quality Assurance & Test Case Evaluation / Presentation & Slide Designer
- **Phần việc trực tiếp phụ trách:** Xây dựng bộ Golden Set 45 test cases, thiết lập pipeline đo kiểm tự động (`eval/`), thiết kế slide thuyết trình (`demo-slides.pptx`, `demo-slides.pdf`) và sơ đồ kiến trúc hệ thống.

---

## 1. Vai trò cá nhân & Phần việc trực tiếp phụ trách

### 1.1. Thiết kế bộ dữ liệu kiểm thử Golden Set (45 Cases — `eval/cases.json`)
1. Tôi xây dựng ma trận 45 test cases phân loại theo 4 lớp rủi ro (Factuality, Ambiguity, Scope/Adversarial, Misconceptions) dựa trên taxonomy PAIR & HAX Playbook.
2. Trong đó, 18/45 case được trích xuất trực tiếp từ 13.494 lượt thoại thực tế (`vlearn.db` / `tutor_turns.csv`) nhằm phản ánh chính xác phương ngữ và lỗi diễn đạt của học viên thật.
3. Bộ dữ liệu này vượt 225% quy mô tối thiểu yêu cầu của ban tổ chức và bao phủ toàn diện từ các trường hợp thông thường đến bẫy jailbreak.

### 1.2. Hiện thực hóa Pipeline đo kiểm tự động (`eval/run_eval.py` & `eval_report.md`)
1. Tôi phát triển kịch bản tự động kiểm tra toàn bộ 45 case qua 3 tầng kiến trúc: Stage 0 (Guardrail 33ms, 0 token), Stage 1 (Evaluator với Assertion chống hallucination), và Stage 2 (Persona đảm bảo 0% lộ đáp án).
2. Kết quả đo kiểm thực tế đạt tỷ lệ vượt qua (pass rate) 97.8% (44/45 cases), chứng minh tính ổn định và an toàn sư phạm của hệ thống.
3. Báo cáo đánh giá được tự động xuất ra file Markdown với đầy đủ bảng phân tích độ trễ và phân loại kết quả chi tiết theo từng nhóm rủi ro.

### 1.3. Thiết kế Slide thuyết trình & Sơ đồ kiến trúc (`demo-slides.pptx`, `demo-slides.pdf`)
1. Tôi trực tiếp xây dựng bộ slide 11 trang chuẩn mực, dẫn dắt mạch lạc từ nỗi đau 13.494 log người học đến giải pháp 3 tầng Protégé Effect và dữ liệu kiểm thử thực tế.
2. Đồng thời, tôi lập trình bằng Python (`draw_diagrams.py`) để sinh tự động các sơ đồ kiến trúc Build Pipeline và User Journey đạt chuẩn 200 DPI.
3. Cấu trúc bài thuyết trình giúp nhóm truyền tải câu chuyện sản phẩm trực quan, thuyết phục và minh bạch về mặt kỹ thuật trước ban giám khảo.

---

## 2. Cách ứng dụng AI trong quá trình xây dựng

### 2.1. Sinh dữ liệu kiểm thử biên (Adversarial & Edge Cases Generation)
1. Tôi sử dụng AI đóng vai nhiều nhóm tính cách học viên đặc thù (lười biếng, cố tình jailbreak đòi đáp án, dùng tiếng lóng) để sinh các trường hợp biên hóc búa.
2. Nhờ đó, bộ test case mở rộng nhanh chóng từ 20 lên 45 case với độ phong phú cao, thách thức toàn diện khả năng bắt lỗi của hệ thống.

### 2.2. Tăng tốc viết script kỹ thuật và trực quan hóa dữ liệu
1. AI hỗ trợ tạo khung mã nguồn (scaffolding) cho file `run_eval.py` để đo độ trễ milisecond và tổng hợp bảng báo cáo Markdown tự động.
2. Tôi cũng tận dụng AI để căn chỉnh tọa độ bounding boxes phức tạp trong `draw_diagrams.py` (thư viện `matplotlib.patches`), rút ngắn 70% thời gian hoàn thiện sơ đồ kỹ thuật.

### 2.3. Phản biện cấu trúc bài thuyết trình (Pitching Defense)
1. Tôi đưa bản nháp slide vào AI, đóng vai giám khảo khó tính để phản biện cấu trúc nội dung và tìm ra các điểm yếu dễ bị chất vấn.
2. Từ đó, tôi tái cấu trúc lại slide 6 và 7, tập trung làm nổi bật nguyên tắc Zero Leakage và mổ xẻ trung thực case thất bại `TC03`.

---

## 3. Bài học thực tế rút ra từ trường hợp thất bại của nhóm

### 3.1. Thất bại kỹ thuật tại Case `TC03` (Lọt lưới tầng Guardrail)
1. Ở case `TC03`, học viên copy nguyên văn slide nhưng chứa ký tự đặc biệt (`=` và em-dash `—`) đã làm vô hiệu hóa bộ tách từ `split(' ')` của Stage 0, khiến câu lọt vào Stage 1 và được chấm điểm sai.
2. Nguyên nhân do bộ lọc rule-based ban đầu quá thô sơ, chưa có bước chuẩn hóa ký tự Unicode và loại bỏ dấu câu trước khi so khớp chuỗi.
3. Bài học rút ra là hệ thống AI thực tế luôn cần tiền xử lý dữ liệu chuẩn chỉ (hoặc dùng Fuzzy Token Matching) và duy trì cơ chế phòng thủ đa tầng nghiêm ngặt.

### 3.2. Thất bại UX khi thử nghiệm người dùng (Áp lực từ thanh tiến độ)
1. Ở bản thử nghiệm đầu, giao diện hiển thị 7 chấm tiến độ kiến thức (K1–K7) sáng dần khiến người dùng phản hồi cảm thấy áp lực như ngồi phòng thi và sợ nói sai.
2. Nhóm đã lập tức ẩn toàn bộ thanh tiến độ trong lúc trò chuyện và chuyển việc chấm điểm sang cơ chế đánh giá ngầm (latent evaluation) chỉ hiện ở màn hình Debrief.
3. Bài học cốt lõi là AI giáo dục phải tạo cảm giác như một người bạn học ngây thơ đồng hành, tuyệt đối tránh phán xét để người học tự tin bộc lộ lỗ hổng kiến thức.

---

## 4. Tự đánh giá & Chuẩn bị cho vòng phản biện (CP6)
1. Tuân thủ nghiêm ngặt nguyên tắc chống "vibe-coding", tôi hoàn toàn làm chủ và sẵn sàng giải thích chi tiết toàn bộ mã nguồn pipeline `eval/` cũng như logic các sơ đồ kiến trúc.
2. Tôi tự tin bảo vệ cơ chế Assertion chống hallucination ở Stage 1, nguyên tắc tước quyền đọc checklist để đảm bảo Zero Leakage ở Stage 2, và bài học mổ xẻ từ case `TC03`.
3. Mọi kết quả kiểm thử và tài liệu thiết kế đều có căn cứ kỹ thuật minh bạch, sẵn sàng demo trực tiếp và giải trình trước hội đồng giám khảo tại CP6.
