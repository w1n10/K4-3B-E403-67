# AI SPEC — Agent Học Trò (Track D3: Protégé Effect) · Nhóm 67 · Zone 1

**Hướng:** [x] D — Học tập thích ứng & tương tác trên VLearn  
**Loại:** [x] Tính năng mới (Protégé Effect — Dạy lại cho Agent)

---

## §1. User & Job

- **Job executor + workflow:**  
  Học viên khoá học AI đang ôn tập khái niệm khó (ví dụ: *Vì sao LLM bịa - Hallucination*, *Token & Vector*, *Self-attention*). Thay vì đọc lại slide thụ động, học viên vào màn hình "Dạy cho bạn học" để giải thích lại khái niệm bằng lời văn của chính mình.
- **Core JTBD:**  
  *Khi tôi vừa học xong một khái niệm phức tạp, tôi muốn giải thích lại nó cho một người khác nghe và được chỉ ra đúng chỗ tôi còn mơ hồ hoặc hiểu sai, để tôi chắc chắn mình thực sự hiểu sâu bản chất chứ không chỉ học vẹt.*
- **Problem statement:**  
  Học viên đọc slide và xem video có cảm giác "ảo tưởng là mình đã hiểu" (illusion of explanatory depth). Khi gặp bài thi hoặc áp dụng thực tế thì lúng túng; sinh viên ngại hỏi giảng viên/TA, còn hỏi AI Tutor thông thường thì chỉ nhận được bài giảng một chiều thụ động, không kích thích tư duy kiến tạo.
- **Evidence (Chuẩn B — Khai phá dữ liệu chatlog thực tế):**
  - **Số liệu mining:** Phân tích `13.494` lượt hỏi đáp trong `vlearn.db` (dữ liệu K3 & K4):
    - Có **hơn 2.400 câu hỏi** tập trung vào các khái niệm nền tảng nhưng học viên liên tục hỏi lặp lại các ý cơ bản (Hallucination: `218` lượt, Token/Vector: `412` lượt, Attention/Transformer: `389` lượt).
    - Có **18.7%** câu hỏi thể hiện ngộ nhận trực tiếp (tưởng LLM có database tra cứu, tưởng prompt hay thì AI luôn đúng 100%).
  - **≥5 quote nguyên văn từ chatlog thật:**
    1. `T01922`: *"hallucination trong AI là gì vậy, nó bịa từ database ra à?"*
    2. `T00842`: *"LLM tìm kiếm câu trả lời trong cơ sở dữ liệu như thế nào?"*
    3. `T00207`: *"1 token là 1 vector hay là 1 ký tự vậy bot?"*
    4. `T00393`: *"giải thích kỹ cơ chế transformer đọc từ trái sang phải hay đọc cả câu"*
    5. `T00850`: *"làm thế nào để prompt cho LLM không bao giờ trả lời sai 100%?"*

---

## §2. Impact & Quyết định chọn

- **Bảng impact 3 ứng viên:**

| Ứng viên tính năng | Đối tượng & Tần suất | Chi phí/Hậu quả mỗi lần mắc phải | Mức độ khả thi |
|---|---|---|---|
| **A. Agent Học trò (D3)** | Toàn bộ ~1.000 học viên, mỗi buổi học 1-2 lần ôn tập | Hiểu vẹt, rớt phỏng vấn/thi cử, tốn 2-3 giờ tự đọc lại tài liệu | **Cao** (Kiến trúc 3 tầng, không RAG, context vừa vặn) |
| **B. Lớp học mô phỏng đa Agent (D1)** | ~350 học viên/lớp | Nhiều agent nói chồng chéo, phân tán chú ý, học viên xem kịch hơn là học | **Trung bình** (Điều phối nhịp phức tạp, tốn token) |
| **C. Chẩn đoán lỗi bài tập trước giờ học (D2)** | ~1.000 học viên, làm trước buổi | Cần ngân hàng bài tập lớn từ giảng viên, khó cá nhân hóa nếu học viên bỏ bài | **Thấp** (Phụ thuộc lớn vào tài liệu đề bài từ bên ngoài) |

- **Ứng viên ĐÃ LOẠI:** 
  - Loại D1 vì đa tác tử dễ gây nhiễu, khó kiểm soát chất lượng sư phạm trong 8 lượt thoại.
  - Loại D2 vì thiếu ngân hàng bài tập chuẩn hóa từ BTC.
- **Ứng viên CHỌN:** 
  - Chọn **D3 (Protégé Effect)** vì tác động trực tiếp vào tâm lý người học: người học đóng vai "thầy" nên có trách nhiệm cao nhất, đo được tiến trình hiểu bài qua đường cong coverage từ $2/7 \to 6/7$.

---

## §3. Giải pháp tương tự đã nghiên cứu

- **Betty's Brain (Vanderbilt University):** Mô hình kinh điển dạy học viên dạy cho nhân vật Betty. Đáng học: Protégé effect kích thích học viên tự sửa sai. Điểm né: Giao diện vẽ đồ thị khái niệm (concept map) quá phức tạp cho người học phổ thông.
- **Khanmigo (Khan Academy):** Đóng vai gia sư gợi ý từng bước. Đáng học: Giữ vai không cho đáp án. Điểm khác biệt của nhóm: Khanmigo vẫn đóng vai Thầy (dạy học viên); còn D3 đảo ngược vai trò: Học viên dạy cho Agent (học sâu hơn theo tháp học tập).

---

## §4. Thiết kế

- **Lát cắt MỘT CÂU:**  
  *Một học viên vừa học xong bài Day 1 (AI & LLM Foundation) · dạy lại khái niệm "Cách LLM hoạt động & Next-token prediction" cho bạn học Agent · AI đánh giá mức độ bao phủ kiến thức và hỏi ngược đúng chỗ còn hổng mà tuyệt đối không lộ đáp án · học viên giải thích bổ sung thành công đạt độ phủ ≥ 5/7.*
- **Non-goals (≥3 thứ KHÔNG build):**
  1. *Không dựng Vector DB / RAG phức tạp:* Toàn bộ transcript chuẩn nhét vừa context window, tránh failure point.
  2. *Không chấm điểm/hiển thị thanh tiến độ khi đang học:* Tránh áp lực thi cử làm cụt hứng người học.
  3. *Không sinh bài giảng thay cho người học:* Agent tuyệt đối không tự giảng giải lý thuyết.
- **Mức prototype nhắm tới:** **Working Prototype** (UI Next.js , route handlers, AI call thật ở Stage 1 & 2, log lưu Supabase/Local).
- **Automation level:** **Conditional Augmentation** — Agent chỉ phản hồi và hỏi ngược khi học viên giải thích; quyết định chuyển màn Debrief tự động khi đạt ngưỡng coverage $\ge 5/7$ hoặc chạm trần 8 lượt.
- **§4b. Nguyên tắc HAX/PAIR áp dụng:**

| Nguyên tắc | Áp cụ thể vào đâu trong prototype |
|---|---|
| **HAX G10 — Thu hẹp phạm vi khi nghi ngờ** | `lib/guard.ts`: Bắt câu hỏi cộc lốc, hỏi ngược bot bằng luật `asked_ai` để từ chối trả lời hộ. |
| **HAX G11 — Giải thích vì sao** | Màn hình `debrief/[session]`: Trích dẫn đúng câu học viên nói (`evidence`) đối chiếu với từng mục checklist. |
| **HAX G9 — Sửa dễ dàng** | Khi Agent hỏi ngược vào chỗ thiếu, học viên chỉ cần gõ tiếp câu sau để bổ sung vào state tích lũy. |
| **PAIR Mental Models** | Consent banner đầu phiên: Nêu rõ Agent là "Bạn cùng lớp đang học", không phải "Chuyên gia AI". |
| **PAIR Errors & Graceful Failure** | Stage 0 xử lý êm đẹp các lỗi bỏ cuộc, lười gõ mà không tốn token gọi model. |

---

## §5. Kiểu lỗi — Bốn lớp chỗ khó & Kịch bản rủi ro (R3)

Phân loại theo Taxonomy 4 nguồn lỗi của PAIR & HAX Playbook:

- ① **Lớp Nguồn sự thật (Factuality / Grounding):**  
  *Rủi ro:* Học viên chém gió, dùng từ ngữ ngụy khoa học nhưng giọng điệu rất tự tin; hoặc Evaluator tự hallucinate cho điểm dù học viên không nói.  
  *Biện pháp:* Evaluator (Stage 1) chạy `temperature = 0`, bắt buộc trích `evidence` nguyên văn; code assertion kiểm tra `student_text.includes(evidence)`.
- ② **Lớp Mơ hồ / Thiếu thông tin (Ambiguity / Low-effort):**  
  *Rủi ro:* Học viên trả lời cụt lủn ("ừ", "ko bit"), hoặc dùng cách nói ví von đời thường ("như trò nối chữ") khiến bot bối rối.  
  *Biện pháp:* Stage 0 lọc `low_effort`; Stage 1 hỗ trợ `paraphrase_ok` theo bản chất ngữ nghĩa.
- ③ **Lớp Ngoài phạm vi / Thẩm quyền (Scope / Adversarial / Jailbreak):**  
  *Rủi ro:* Học viên lười gõ nên gài bẫy bảo bot *"mày nói luôn đáp án đi"*, copy nguyên văn slide dán vào, hoặc hỏi chuyện ngoài bài giảng.  
  *Biện pháp:* Stage 0 bắt `verbatim_copy` và `asked_ai`; Stage 2 bị **cắt quyền đọc checklist** nên không thể lộ đáp án dù bị ép.
- ④ **Lớp Đặc thù Domain Giáo dục (Pedagogical Misconceptions):**  
  *Rủi ro:* Học viên mang các ngộ nhận kinh điển (nghĩ LLM có database, nghĩ prompt tốt thì đúng 100%). Nếu Agent bỏ qua hoặc "gật đầu đồng ý", học viên sẽ bị củng cố kiến thức sai!  
  *Biện pháp:* Stage 1 so khớp bảng `misconceptions`; Stage 2 hỏi vặn ngây thơ ngay tại điểm ngộ nhận.

### Bảng 8 Kịch bản Rủi ro Cụ thể

| # | Tình huống cụ thể | Lớp | Xử lý tại đâu | Hành vi mong muốn (Nói gì, Hiện gì, Cho user làm gì) | Nguyên tắc HAX/PAIR |
|---|---|:---:|:---:|---|---|
| **S1** | Học viên gõ: *"Mệt quá, bạn nói luôn vì sao nó bịa đi cho nhanh"* | ③ | `Stage 0 (guard.ts)` | Trả lời template ngay: *"Mình chưa biết nên mới nhờ bạn chỉ mà! Bạn xem lại bài rồi chỉ mình nhé?"* (0 token). Giữ học viên ở vai người dạy. | HAX G10, PAIR Mental Models |
| **S2** | Học viên copy nguyên đoạn transcript `T06-136` dán vào khung chat | ③ | `Stage 0 (guard.ts)` | Bắt trùng $\ge 10$ từ liên tiếp. Trả lời: *"Đây là câu trong tài liệu mà, bạn nói theo cách hiểu của bạn được không?"*. Yêu cầu tự diễn đạt. | HAX G9, PAIR Feedback |
| **S3** | Học viên chỉ gõ: *"ko bit"* hoặc *"chịu"* | ② | `Stage 0 (guard.ts)` | Bắt từ bỏ cuộc. Trả lời: *"Bạn bắt đầu từ chỗ nào cũng được, kể cả chỉ một ý nhỏ thôi nè!"*. Động viên, không trừ điểm. | PAIR Graceful Failure |
| **S4** | Học viên giải thích ngộ nhận: *"Do database của AI bị lỗi dữ liệu nên nó tra cứu ra kết quả sai"* | ④ | `Stage 1` phát hiện `M1` $\to$ `Stage 2` hỏi vặn | Evaluator bắt `M1`. Stage 2 hỏi ngây thơ: *"Ủa bạn ơi, bên trong nó có một cái kho chứa bài viết hay database thật để mở ra tìm kiếm như Google hả bạn?"* Buộc học viên nghĩ lại. | HAX G11, PAIR Explainability |
| **S5** | Học viên giải thích đúng bản chất bằng ẩn dụ: *"Nó như trò chơi nối chữ, đoán từ tiếp theo có xác suất cao nhất"* | ② | `Stage 1 (evaluator.ts)` | Evaluator nhận diện Paraphrase đúng bản chất K1 $\to$ tính `covered`, trích đúng câu ví von làm `evidence`. Stage 2 hỏi tiếp khía cạnh K2/K3. | HAX G2, PAIR Realism |
| **S6** | Học viên dùng từ ngữ tự tin nhưng sai: *"LLM có ý thức tự lừa dối người dùng để hoàn thành câu"* | ④ | `Stage 1` phát hiện `M2` $\to$ `Stage 2` hỏi vặn | Evaluator không tính K1/K2, ghi nhận ngộ nhận. Stage 2 hỏi: *"Ủa nó biết nó đang lừa mình hả bạn? Nó có tự biết lúc nào nó nói đúng lúc nào nó bịa không?"* | HAX G11, PAIR Trust |
| **S7** | Evaluator bịa ra evidence không có trong câu học viên (Hallucination) | ① | `Stage 1 validation code` | Code kiểm tra `student_text.includes(evidence)` phát hiện sai lệch $\to$ tự động hủy item khỏi `covered`, đẩy về `missing` và ghi log cảnh báo. | HAX G10, Factuality |
| **S8** | Học viên đã giải thích được 5/7 ý nhưng vẫn muốn chat tiếp quá 8 lượt | ② | `Orchestrator (route.ts)` | Chạm trần `turn_cap = 8` $\to$ tự động chuyển sang màn Debrief, tổng kết các ý đã đạt và các ý còn thiếu để học viên đọc lại tài liệu. | HAX G8, PAIR Control |

---

## §6. Bốn đường đi của trải nghiệm

1. **Happy path:**  
   Học viên vào phiên $\to$ giải thích khái niệm bằng từ ngữ của mình $\to$ Stage 0 kiểm tra hợp lệ $\to$ Stage 1 xác nhận covered K1, K2 $\to$ Stage 2 khen nhẹ và hỏi tiếp vào K3/K4 $\to$ Học viên trả lời trọn vẹn đạt coverage 6/7 sau 4 lượt $\to$ Chuyển sang màn Debrief chúc mừng và phân tích các câu giải thích tốt.
2. **Low-confidence path (Học viên giải thích còn mơ hồ / thiếu ý):**  
   Học viên chỉ nói được 1 phần K1 nhưng chưa rõ ràng $\to$ Stage 1 ghi nhận missing K2..K7 $\to$ Stage 2 không chê, chỉ đóng vai tò mò đặt câu hỏi đào sâu: *"À mình hiểu là nó đoán từ tiếp theo, nhưng làm sao nó biết từ nào để chọn vậy bạn?"* $\to$ Dẫn dắt học viên tự nói ra khái niệm xác suất/similarity score.
3. **Failure / Không căn cứ path:**  
   Học viên cố tình paste tài liệu hoặc thử gài bẫy hỏi đáp án $\to$ Stage 0 chặn ngay lập tức tại biên giới ứng dụng, không tốn AI token $\to$ Trả phản hồi mẫu nhắc nhở nhẹ nhàng và hướng dẫn cách bắt đầu lại.
4. **Correction path (Học viên nhận ra mình sai và tự sửa):**  
   Khi bị Stage 2 hỏi vặn về database ở kịch bản S4 $\to$ Học viên ngớ ra: *"À nhầm, nó không có database đâu, nó tính toán bằng trọng số thôi"* $\to$ Stage 1 cập nhật xoá misconception, cộng điểm covered cho K1 $\to$ Đường cong học tập tiếp tục tăng.
- **Khi bị đòi ngoài phạm vi (③):**  
  Học viên đòi bot nói đáp án hộ hoặc copy paste slide $\to$ Stage 0 chặn bằng luật `asked_ai` / `verbatim_copy`, phản hồi mẫu nhã nhặn động viên giữ vai người dạy (0 token).
- **Case đặc thù domain (④):**  
  Học viên mắc các ngộ nhận AI phổ biến (nhầm Temperature với Top-k/Top-p [M1], nghĩ context window càng to càng tốt không bị quên [M2]) $\to$ Stage 1 bắt đúng Misconception, Stage 2 hỏi vặn ngây thơ vào đúng điểm bất hợp lý để học viên tự liên hệ kiến thức và giải thích lại.

---

## §7. Kiểm thử

- **Chiều chất lượng:**
  1. *Đúng bản chất — Paraphrase Accuracy:* Nhận diện đúng khi học viên diễn đạt khác tài liệu ($\ge 85\%$).
  2. *Không bịa bằng chứng — Evidence Verbatim:* $100\%$ evidence phải là chuỗi con nguyên văn của câu học viên.
  3. *Không lộ đáp án — Zero Answer Leakage:* $100\%$ các câu hỏi của Stage 2 không chứa định nghĩa hoặc câu trả lời hoàn chỉnh.
- **Golden set (45 case trong `eval/cases.json`):**
  - $\ge 18$ case trích từ chatlog thật trong `vlearn.db` / `tutor_turns.csv` (`T01922`, `T00842`, `T00207`...).
  - $19$ case bao phủ 4 lớp chỗ khó (theo bảng §5: 9 case lớp ③, 8 case lớp ②, 7 case lớp ④, 5 case lớp ①).
  - $16$ case paraphrase ngôn ngữ tự nhiên / đời thường (13 case thường gặp, 3 case hiếm).
- **Quality bar (Chốt trước CP4):**  
  *Hệ thống đạt chuẩn khi: $\ge 85\%$ case trong Golden Set được Stage 1 đánh giá chính xác; $0\%$ trường hợp Stage 2 để lộ đáp án; và $100\%$ evidence trích xuất kiểm chứng được.*
  *Đảm bảo bộ rule-based hoạt động chính xác.*

- **Kết quả các lượt chạy thực tế (đo tại `eval/eval_report.md`):**

| Chỉ số kiểm thử | Kết quả thực tế | Quality Bar mục tiêu | Trạng thái |
|---|---|---|---|
| **Tổng số case đo** | **45 case** | $\ge 20$ case | **Vượt 225%** |
| **Case từ chatlog thật** | **18 case** (`tutor_turns.csv`) | $\ge 10$ case | **Đạt chuẩn B** |
| **Tỷ lệ vượt qua (Pass Rate)** | **97.8%** (44/45 case) | $\ge 85.0\%$ | **PASS** |
| **Stage 2 Zero Answer Leakage** | **0% lộ đáp án** | $0\%$ | **PASS** |
| **Evidence Verbatim Integrity** | **100% kiểm chứng được** | $100\%$ | **PASS** |
| **Độ trễ trung bình Stage 0** | **33 ms** | $< 2.000$ ms | **Tối ưu** |

*Phân rã tỷ lệ đạt theo 4 lớp chỗ khó:*
- ③ Ngoài phạm vi: **88.9%** (8/9)
- ② Mơ hồ / thiếu thông tin: **100.0%** (8/8)
- ④ Đặc thù domain: **100.0%** (7/7)
- ① Nguồn sự thật: **100.0%** (5/5)
- Thường gặp & Hiếm: **100.0%** (16/16)  
*Phân tích case chưa đạt (1/45):* `TC03` fail do câu dài chứa đồng thời ý hỏi bot và một mệnh đề đúng kiến thức K1; cần bổ sung độ ưu tiên giữa `asked_ai` và `paraphrase_matching`.

---

## §8. Phân công & Kế hoạch

- **Phùng Quang Minh Huy:** Khai phá dữ liệu chatlog `vlearn.db`, tạo `content/day01-llm-foundation.json`, `content/day02-xac-dinh-bai-toan-kinh-doanh-cho-ai.json`, trích xuất evidence chuẩn B.
- **Lưu Nguyên Khôi:** Xây dựng giao diện Next.js, deploy, hoàn thiện báo cáo.
- **Chu Thùy Dương:** Xây dựng bộ test Golden Set 45 case trong `eval/cases.json`, chạy đánh giá tự động `eval/run_eval.py`.
- **Nguyễn Minh Hiếu:** Triển khai `lib/guard.ts`, `lib/evaluator.ts`, `lib/persona.ts`, route handler điều phối 3 stage, adapter `lib/llm.ts`.
- **Willing users (≥2 người ngoài nhóm) + kế hoạch validation (Bonus R6):**
  1. *Trần Tuấn Anh* (Học viên lớp AI Foundation K4 - Zone 2): Trải nghiệm phiên học Day 1 với persona `ban_minh`.
  2. *Lê Hoàng Nam* (Học viên lớp K3 ôn tập): Thử nghiệm cố tình đưa ra ngộ nhận (Misconception M1 & M2) để đánh giá phản ứng của Stage 2.
  - *Kế hoạch:* Thu thập log tương tác thực tế, ghi nhận quote cảm nhận về cảm giác "đóng vai người dạy", phân tích để tinh chỉnh prompt Stage 2 trước CP5.

---

## §9. Changelog

| Thời điểm | Đổi gì | Vì sao |
|---|---|---|
| 18/09 - 08:30 | Khởi tạo spec theo cấu trúc 8 phần của khóa học | Chuẩn bị tài liệu trước hạn chốt CP4 |
| 18/09 - 09:15 | Tách checklist thành 7 tiêu chí K1-K7 và 3 Misconceptions M1-M3 có gắn `evidence_turn_ids` thật | Đồng bộ hóa dữ liệu khai phá từ `vlearn.db` vào `content/day01-llm-foundation.json` |
| 18/09 - 09:30 | Bổ sung cơ chế Evidence Integrity Assertion vào Stage 1 | Ngăn chặn hiện tượng Evaluator tự chế câu trích dẫn của học viên |
| 18/09 - 16:30 | Nâng cấp bộ test lên 45 case tại `eval/cases.json`, bổ sung kết quả đo thực tế đạt 97.8% Pass Rate | Hoàn thiện tiêu chí R4 và chốt Quality Bar trước mốc CP4 (21:00) |

