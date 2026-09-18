# Prototype — Teachable Agent (Track D3)

Thư mục này chứa bản mock bấm được và các hợp đồng dữ liệu chuẩn phục vụ cho các mốc **CP2 (Prototype bấm được)** và **CP3 (AI thật)**.

---

## 1. Bản Mock Bấm Được (Xem & Thử nghiệm ngay)

Không cần cài đặt `npm` hay chạy server, có thể mở trực tiếp bằng trình duyệt:
* File: [`mock_demo.html`](./mock_demo.html) (hoặc [`index.html`](./index.html))
* **Cách mở:** Nhấp đúp chuột vào file `mock_demo.html` trên máy tính hoặc kéo thả vào Chrome / Edge / Firefox.

### Tính năng mô phỏng:
1. **Màn 1 — Khởi tạo:** Nhập mã tester (`U01`), chọn bài học, hiện Consent đạo đức D3.
2. **Màn 2 — Dạy học & Khay thử nghiệm nhanh:**
   - Chat 2 chiều giữa Học viên và Bé Bot (Teachable Agent).
   - Thanh tiến độ mở khóa ý kiến thức (không lộ % điểm ngầm).
   - Simulator: Bấm thử các nút test nhanh Stage 0 (`verbatim_copy`, `asked_ai`, `low_effort`), Stage 1 + 2 (K1 đúng, M1 hiểu sai, Hoàn thành 5/5).
   - Ô gõ tự do (free input).
3. **Màn 3 — Debrief (Tổng kết):**
   - Đồ thị tiến trình học qua từng lượt (`covered_after` bar chart).
   - Bảng trích dẫn bằng chứng (`evidence`) từ lời học viên.
   - Chỗ cần ôn lại kèm mã nguồn (`T06-142`).
   - Nút **"Tải log phiên (.json)"** xuất dữ liệu chuẩn để nộp repo.
4. **Màn 4 — Dashboard Giảng viên:** Xem tỷ lệ bao phủ và heatmap các hiểu sai của cả lớp.

---

## 2. Cấu trúc mã nguồn & Phân công (Hợp đồng dữ liệu)

```
prototype/
├── mock_demo.html          # Web mock interactive độc lập (mở trình duyệt xem ngay)
├── index.html              # Bản sao của mock_demo.html
├── content/
│   └── llm-hallucination.json   # Checklist 5 ý kiến thức + trích đoạn (Huy)
├── lib/
│   ├── guard.ts            # Stage 0: Guardrail code thuần chặn 3 luật (Khôi)
│   ├── evaluator.ts        # Stage 1: Evaluator temp=0 so khớp checklist (Khôi)
│   ├── persona.ts          # Stage 2: Teachable Persona hỏi ngược, cắt checklist (Dương)
│   └── llm.ts              # Adapter gọi Gemini / Claude / OpenAI (Dương)
└── package.json            # Cấu hình phụ thuộc khi nhóm dựng Next.js
```

---

## 3. Nguyên tắc kiến trúc quan trọng nhất

* **Stage 2 bị cắt quyền đọc nội dung checklist:** Persona chỉ nhận mã `missing_ids: ["K3", "K5"]` và `misconception_labels`, không bao giờ nhận nội dung đáp án hay trích đoạn tài liệu.
* **Stage 0 chạy trước AI:** Bắt `verbatim_copy`, `asked_ai`, `low_effort` với chi phí 0 token, trả lời bằng template ngay.
* **Lưu log sau mỗi lượt:** Bảng `turns` lưu `covered_after` để chứng minh chỉ số tiến bộ trong học tập.

