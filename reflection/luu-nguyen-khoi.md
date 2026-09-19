# BÁO CÁO THU HOẠCH CÁ NHÂN (PERSONAL REFLECTION)
## Mini Hackathon AI — Lớp 3B · Phòng E403 · Nhóm 67
**Dự án:** VLearn Teachable Learner (Track D3: Agent Học Trò — Protégé Effect)

---

### Thông tin cá nhân
- **Họ và tên:** Lưu Nguyên Khôi
- **Vai trò trong nhóm:** Frontend / UI-UX Engineer & Deployment
- **Phần việc trực tiếp phụ trách:** Xây dựng giao diện Next.js (App Router) cho toàn bộ sản phẩm, hệ thống theme sáng/tối và song ngữ VI/EN, bộ nhận diện VLearn, màn chat "Dạy cho bạn học" và màn Debrief; deploy và hoàn thiện báo cáo; tổ chức khảo sát validation với người dùng ngoài nhóm.

---

## 1. Vai trò cá nhân & Phần việc trực tiếp phụ trách

### 1.1. Dựng giao diện Next.js cho bốn màn chính
1. Tôi dựng bố cục chung trong `app/layout.tsx` — chọn bộ đôi font `Be Vietnam Pro` (thân bài) và `Lexend` (tiêu đề) vì tiếng Việt nhiều dấu, font khác rất dễ hỏng ở cỡ nhỏ.
2. Tôi hoàn thiện các màn: trang chủ chọn chủ đề (`app/home-client.tsx`), màn dạy (`app/teach/[topic]/teach-client.tsx`), màn tổng kết (`app/debrief/[session]/debrief-client.tsx`) và trang xem slide bài giảng.
3. Tôi làm thanh điều hướng `components/top-nav.tsx` theo đúng nhận diện VLearn: logo bên trái, nút đổi EN/VI và sáng/tối bên phải, dùng biến màu chung trong `app/globals.css`.

### 1.2. Hệ thống theme, song ngữ và trải nghiệm chat
1. Tôi viết `lib/theme.tsx` kèm đoạn script chống nháy màu trong `layout.tsx`: đọc `localStorage` **trước khi paint** để không bị trắng-xong-mới-tối.
2. Tôi viết `lib/i18n.tsx` — từ điển phẳng VI/EN có kiểu dữ liệu ràng buộc, thiếu một bên là TypeScript báo lỗi ngay, nhờ đó không bị sót chuỗi khi thêm tính năng.
3. Về trải nghiệm chat, tôi xử lý gửi bằng Enter / xuống dòng bằng Shift+Enter, trạng thái "bạn học đang nghĩ…", và đặc biệt là **không hiện thanh tiến độ K1–K7 trong lúc học** — chỉ hiện ở Debrief.

### 1.3. Deploy, báo cáo và khảo sát người dùng ngoài nhóm
1. Tôi phụ trách cấu hình `next.config.ts`, `postcss.config.mjs` và quy trình deploy để cả nhóm có bản chạy thật cho tester.
2. Tôi lập bảng khảo sát và tổng hợp phản hồi vào `validation/form.md` (3 người ngoài nhóm): điểm hiểu kiến thức 4–5★, có người góp ý "hơi nhiều câu hỏi", một tester nhóm phát hiện lỗi chatbox nhảy chữ.
3. Tôi rà lại README và các tài liệu trình bày để nhóm nộp đúng cấu trúc yêu cầu.

---

## 2. Cách ứng dụng AI trong quá trình xây dựng

### 2.1. Dựng nhanh component và token thiết kế
1. Tôi dùng AI sinh khung component Tailwind (card, nút, thẻ trạng thái ok/warn/danger) rồi tự chỉnh lại cho khớp bảng màu VLearn.
2. Tôi dùng AI để chuyển các giá trị màu rải rác thành biến `--surface`, `--border`, `--primary`… trong `globals.css`, giúp theme tối không phải sửa từng component.

### 2.2. Săn lỗi hydration và lệch giao diện
1. AI hỗ trợ tôi truy vết lỗi hydration do theme/lang đọc từ `localStorage` lệch với server; cách chữa là khởi tạo state giống server rồi cập nhật trong `useEffect`, kết hợp script chống nháy.
2. Tôi cũng dùng AI rà các trạng thái rỗng (chưa có chủ đề, chưa giảng được ý nào) để màn hình không bao giờ trắng trơn.

### 2.3. Phản biện nội dung chữ hiển thị
1. Tôi đưa các chuỗi VI/EN cho AI đóng vai người dùng khó tính để bắt lỗi diễn đạt và lỗi dịch sát nghĩa.
2. Nhờ đó phần consent và phần Debrief nói rõ "đây là buổi luyện, không phải bài kiểm tra" — đúng tinh thần chống áp lực điểm số của track D3.

---

## 3. Bài học thực tế rút ra từ trường hợp thất bại của nhóm

### 3.1. Thanh tiến độ gây áp lực thi cử (thất bại UX)
1. Ở bản thử đầu, giao diện hiện 7 chấm tiến độ K1–K7 sáng dần; tester phản hồi cảm giác như đang ngồi phòng thi và sợ nói sai.
2. Tôi đã ẩn toàn bộ thanh tiến độ trong lúc trò chuyện, chuyển việc đánh giá thành cơ chế ngầm và chỉ hiện ở màn Debrief.
3. Bài học: thứ "trực quan hoá tiến độ" nghe rất hợp lý khi làm kỹ thuật lại phản tác dụng với người học — phải thử với người thật mới biết.

### 3.2. Lỗi vặt ở ô nhập liệu và bất đồng bộ ngôn ngữ
1. Một tester phát hiện chatbox bị nhảy thêm ký tự khi gửi, và khi họ nhắn tiếng Anh thì bot vẫn trả lời tiếng Việt.
2. Nguyên nhân là ô nhập chưa xử lý đúng sự kiện gõ của bộ gõ tiếng Việt, còn ngôn ngữ giao diện chưa được truyền xuống tầng sinh câu trả lời.
3. Bài học: UI đa ngôn ngữ không chỉ là dịch chữ — nó phải đồng bộ xuyên suốt từ giao diện tới prompt, và các lỗi kiểu con trỏ/nhảy ký tự phải tự tay thử mới thấy.

---

## 4. Tự đánh giá & Chuẩn bị cho vòng phản biện (CP6)
1. Tôi làm chủ toàn bộ phần giao diện: giải thích được vì sao chọn font, vì sao có script chống nháy màu, và vì sao thanh tiến độ bị ẩn trong lúc học.
2. Tôi sẵn sàng mở DevTools để chứng minh app không gửi `excerpts` (tài liệu gốc) xuống client và không lộ checklist trong lúc trò chuyện.
3. Phần tôi sẽ nói thẳng nếu bị hỏi là các góp ý từ `validation/form.md` chưa được xử lý hết (chọn giới tính persona, đồng bộ tiếng Anh), và đây là việc nhóm đưa vào danh sách sửa sau CP5.
