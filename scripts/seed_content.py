# Seed tầng AUTHORING nội dung vào vlearn.db.
#
# Vai trò: DB là nơi biên soạn nội dung, `scripts/export_content.py` đổ ra
# `content/<topic_id>.json` cho app đọc. App KHÔNG đọc DB.
#
# Vì `vlearn.db` bị .gitignore, file này là bản ghi để tái lập DB (~1 giây):
#   python scripts/seed_content.py && python scripts/export_content.py
#
# Schema bám đúng type `Topic` trong lib/types.ts để export là ánh xạ thẳng:
#   topics → Topic (topic_id, title, source_lecture)
#   checklist_items → items[] (id, label, source, keywords)
#   misconceptions → misconceptions[] (id, label, evidence_turn_ids, note)
#   excerpts → excerpts{} (marker → text). Tách bảng vì một marker dùng chung
#   cho nhiều item (K1 và K7 cùng trỏ T06-136 ở bản cũ).

import os
import sqlite3
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "vlearn.db")

# ---------------------------------------------------------------------------
# NỘI DUNG BIÊN SOẠN
# Nguồn: data/vlearn-pack/transcript/*.md (mã đoạn [Txx-NNN]) và chatlog
# raw_tutor_turns (turn_id) cho misconception. Chỉ trích ngắn, không dán dài.
# ---------------------------------------------------------------------------

TOPICS = [
    {
        "topic_id": "day01-llm-foundation",
        "title": "Day 1 — AI & LLM Foundation: cách LLM hoạt động",
        "source_lecture": "transcript-04",
        "items": [
            {
                "id": "K1",
                "label": "AI bao trùm machine learning, machine learning bao trùm deep learning, trong cùng là generative AI — các tầng là tập con lồng nhau và công nghệ đi từ ngoài vào trong",
                "source": "T04-015",
                "keywords": ["AI", "machine learning", "deep learning", "generative AI"],
            },
            {
                "id": "K2",
                "label": "LLM chỉ dự đoán token tiếp theo theo xác suất rồi nối vào chuỗi và lặp lại — nó không tra cứu sự thật, nên sinh ra câu nghe hợp lý nhưng vẫn sai (hallucination)",
                "source": "T04-048",
                "keywords": ["next token", "xác suất", "hallucination", "ảo giác"],
            },
            {
                "id": "K3",
                "label": "Token là đơn vị cơ bản của máy, không phải ký tự hay từ; cùng một nội dung tiếng Việt tốn nhiều token hơn tiếng Anh nên dùng API đắt hơn",
                "source": "T04-049",
                "keywords": ["token", "tiếng Việt", "chi phí"],
            },
            {
                "id": "K4",
                "label": "Context window là giới hạn lượng token mô hình xử lý một lúc; nhét quá nhiều ngữ cảnh còn làm model kém đi và quên phần đầu (context rot), nên không phải cứ lớn là tốt",
                "source": "T04-052",
                "keywords": ["context window", "context rot", "quên"],
            },
            {
                "id": "K5",
                "label": "Cơ chế attention cho mô hình nhìn cả câu và tự tính mức liên quan giữa các từ, thay vì đọc tuần tự từng chữ như RNN nên không bị quên đầu câu",
                "source": "T04-040",
                "keywords": ["attention", "transformer", "RNN"],
            },
            {
                "id": "K6",
                "label": "Temperature quyết định độ ngẫu nhiên khi chọn token (bằng 0 thì luôn lấy xác suất cao nhất), còn top-k/top-p chỉ khoanh vùng số token được phép chọn — hai thứ khác nhau",
                "source": "T04-072",
                "keywords": ["temperature", "top-k", "top-p", "sampling"],
            },
            {
                "id": "K7",
                "label": "Mô hình vẫn luôn cần con người tham gia đánh giá và gán nhãn dữ liệu (RLHF) để tốt lên, không tự thông minh lên một mình",
                "source": "T04-060",
                "keywords": ["RLHF", "gán nhãn", "human feedback"],
            },
        ],
        "misconceptions": [
            {
                "id": "M1",
                "label": "Nghĩ temperature và top-k/top-p là một — đều là \"chọn token xác suất cao\", không phân biệt khoanh vùng lựa chọn với độ ngẫu nhiên",
                "evidence_turn_ids": ["T12581", "T11581"],
                "note": "Học viên hỏi việc chỉ chọn token xác suất cao nhất ảnh hưởng thế nào tới tính ngẫu nhiên, và hỏi lại tập nucleus của top-p",
            },
            {
                "id": "M2",
                "label": "Nghĩ context window càng lớn thì mô hình càng tốt, không biết thông tin ở đầu/giữa dễ bị bỏ qua (context rot)",
                "evidence_turn_ids": ["T11073", "T09976"],
                "note": "Học viên hỏi làm sao để model weight cao phần context ở giữa thay vì tìm cách giảm ngữ cảnh",
            },
            {
                "id": "M3",
                "label": "Nghĩ mô hình nhiều tham số luôn mạnh hơn trong mọi việc, không phân biệt mô hình lớn đa dụng với mô hình nhỏ chuyên biệt",
                "evidence_turn_ids": ["T09278"],
                "note": "Học viên so sánh model 2800 tỷ tham số với model 100 tỷ chuyên code và hỏi khác gì nhau",
            },
        ],
        "excerpts": {
            "T04-015": "Rộng nhất chúng ta có AI... Vòng bên trong là machine learning... Vòng tiếp theo bên trong là deep learning... Và tầng bên trong cùng là tầng của generative AI.",
            "T04-040": "Thay vì lần lượt đọc và dịch từng chữ một, nó sẽ đọc cả cụm đấy, và nhận diện được đâu là những cụm từ có sự liên quan đến nhau, để nhận diện ra được mối liên kết giữa nhiều từ trong một câu.",
            "T04-048": "Bản chất nó chỉ là một cỗ máy, nó sinh ra và tự động nối cái từ tiếp theo vào thôi... Thế nên đấy là một lý do khiến cho văn bản AI sinh ra nhìn trông rất là có lý, nhưng mà thực ra cái thông tin nó sai.",
            "T04-049": "Nó sẽ là một đơn vị tính — nó không phải là từ, không phải là chữ cái, mà nó là token... máy nói chuyện với nhau bằng ngôn ngữ của token.",
            "T04-052": "Khi bạn càng đưa nhiều thông tin, càng đưa nhiều ngữ cảnh, thì cái mô hình càng ngày về sau nó sẽ càng kém đi, và nó sẽ thường quên những thông tin ở lúc đầu.",
            "T04-060": "Bản chất tất cả những mô hình ngôn ngữ lớn bây giờ, mặc dù nó đã đạt đến mức năng lực như vậy rồi, nhưng nó vẫn luôn cần con người tham gia vào việc huấn luyện các dữ liệu đấy.",
            "T04-072": "Nếu temperature bằng 0, mô hình sẽ luôn luôn lấy xác suất cao nhất... Nhưng khi bạn tăng temperature lên, nó sẽ random rộng hơn trong phạm vi đấy. Còn top-k/top-p là để khoanh vùng để lấy trong bao nhiêu.",
        },
    },
    {
        "topic_id": "day02-xac-dinh-bai-toan-kinh-doanh-cho-ai",
        "title": "Day 2 — Xác định bài toán kinh doanh cho AI",
        "source_lecture": "transcript-01",
        "items": [
            {
                "id": "K1",
                "label": "70% giá trị khi đưa AI vào doanh nghiệp đến từ con người và vận hành, không phải từ công nghệ",
                "source": "T01-003",
                "keywords": ["AI adoption", "vận hành", "con người"],
            },
            {
                "id": "K2",
                "label": "Đề bài thường mơ hồ (vd \"làm AI chatbot support\"); phải đào ra vấn đề thật phía sau bằng Five Whys thay vì nhảy thẳng vào giải pháp",
                "source": "T01-032",
                "keywords": ["Five Whys", "đề bài mơ hồ", "pain point"],
            },
            {
                "id": "K3",
                "label": "Double Diamond có hai pha phân kỳ rồi hội tụ: viên một để tìm đúng vấn đề, viên hai để tìm đúng giải pháp; làm đúng cái sai nguy hiểm hơn làm sai cái đúng",
                "source": "T01-049",
                "keywords": ["Double Diamond", "phân kỳ", "hội tụ", "problem discovery"],
            },
            {
                "id": "K4",
                "label": "Sản phẩm AI khác sản phẩm truyền thống: AI trả lời theo xác suất nên không lặp lại y hệt, kỳ vọng người dùng tăng nhanh và chi phí chuyển đổi thấp nên cạnh tranh gay gắt",
                "source": "T01-021",
                "keywords": ["sản phẩm AI", "xác suất", "chi phí chuyển đổi"],
            },
            {
                "id": "K5",
                "label": "Cách chắc nhất để có insight là quan sát người dùng thật và dogfooding — tự làm người dùng đầu tiên của sản phẩm mình",
                "source": "T01-042",
                "keywords": ["dogfooding", "quan sát", "user research"],
            },
            {
                "id": "K6",
                "label": "Phải định lượng bài toán và viết thành problem statement: đối tượng, workflow hiện tại, nút thắt, chỉ số thành công (tiết kiệm bao nhiêu thời gian/tiền)",
                "source": "T02-018",
                "keywords": ["problem statement", "định lượng", "chỉ số thành công"],
            },
            {
                "id": "K7",
                "label": "Chọn mức tự động hoá theo phổ automation–augmentation: bắt đầu từ augmentation (người giám sát) rồi mới tăng dần; việc có hậu quả lớn phải giữ con người trong vòng lặp",
                "source": "T02-033",
                "keywords": ["automation", "augmentation", "human in the loop"],
            },
        ],
        "misconceptions": [
            {
                "id": "M1",
                "label": "Nghĩ bài toán AI bắt đầu từ dữ liệu/model, không phải từ việc xác định vấn đề trước",
                "evidence_turn_ids": ["T11447", "T11440"],
                "note": "Học viên đề xuất đảo thứ tự thành problem scoping → business state → data readiness → model choice",
            },
            {
                "id": "M2",
                "label": "Mặc định AI/agent là lời giải, chưa xét các mức đơn giản hơn (không AI, rule, workflow)",
                "evidence_turn_ids": ["T11535", "T11537"],
                "note": "Học viên yêu cầu so sánh No AI / Rule / Workflow / Agent và xin ví dụ về rule, workflow",
            },
            {
                "id": "M3",
                "label": "Nhầm chỉ số ở giữa (số user, lượt quay lại) là chỉ số thành công cuối cùng của sản phẩm",
                "evidence_turn_ids": ["T09066"],
                "note": "Liên hệ câu hỏi \"chỉ số kết quả giống như lái xe bằng gương chiếu hậu\"",
            },
        ],
        "excerpts": {
            "T01-003": "Việc đưa AI vào ứng dụng, đặc biệt trong doanh nghiệp, thì 70% của nó đến từ con người và vận hành chứ không phải đến từ công nghệ.",
            "T01-021": "Chi phí chuyển đổi giữa một sản phẩm này sang một sản phẩm khác bây giờ rẻ hơn rất nhiều.",
            "T01-032": "Từ cái đề bài, các bạn hãy cố gắng khai thác được cái vấn đề thực sự ở phía sau... Đừng lạm dụng AI quá.",
            "T01-042": "Dogfooding là một cách thức xây dựng sản phẩm mà bạn là user và bạn dùng chính sản phẩm của bạn.",
            "T01-049": "Viên thứ nhất giúp chúng ta tìm ra đúng vấn đề, viên thứ hai giúp chúng ta tìm ra đúng giải pháp cho vấn đề đấy.",
            "T02-018": "Chúng ta phải định lượng được bài toán đấy... làm cái này tôi sẽ tiết kiệm được bao nhiêu giờ công.",
            "T02-033": "Thường người ta sẽ bắt đầu với augmentation trước — tăng cường trước, tức là luôn có con người giám sát ở đấy — sau đấy mới tăng dần mức độ automate lên.",
        },
    },
]


SCHEMA = """
DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS misconceptions;
DROP TABLE IF EXISTS excerpts;
DROP TABLE IF EXISTS topics;

-- Runtime thuộc Supabase, không thuộc DB mining này. Bảng rác thì xoá.
DROP TABLE IF EXISTS turns;
DROP TABLE IF EXISTS sessions;

CREATE TABLE topics (
    topic_id       TEXT PRIMARY KEY,
    title          TEXT NOT NULL,
    source_lecture TEXT
);

CREATE TABLE checklist_items (
    topic_id   TEXT NOT NULL REFERENCES topics(topic_id) ON DELETE CASCADE,
    id         TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    label      TEXT NOT NULL,
    source     TEXT NOT NULL,
    keywords   TEXT,
    PRIMARY KEY (topic_id, id)
);

CREATE TABLE excerpts (
    topic_id TEXT NOT NULL REFERENCES topics(topic_id) ON DELETE CASCADE,
    marker   TEXT NOT NULL,
    text     TEXT NOT NULL,
    PRIMARY KEY (topic_id, marker)
);

CREATE TABLE misconceptions (
    topic_id          TEXT NOT NULL REFERENCES topics(topic_id) ON DELETE CASCADE,
    id                TEXT NOT NULL,
    sort_order        INTEGER NOT NULL,
    label             TEXT NOT NULL,
    evidence_turn_ids TEXT,
    note              TEXT,
    PRIMARY KEY (topic_id, id)
);
"""


def seed(conn):
    cur = conn.cursor()
    cur.executescript(SCHEMA)

    for t in TOPICS:
        cur.execute(
            "INSERT INTO topics (topic_id, title, source_lecture) VALUES (?, ?, ?)",
            (t["topic_id"], t["title"], t["source_lecture"]),
        )
        for i, item in enumerate(t["items"]):
            cur.execute(
                "INSERT INTO checklist_items (topic_id, id, sort_order, label, source, keywords) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    t["topic_id"],
                    item["id"],
                    i,
                    item["label"],
                    item["source"],
                    json_dumps(item.get("keywords", [])),
                ),
            )
        for i, mis in enumerate(t["misconceptions"]):
            cur.execute(
                "INSERT INTO misconceptions (topic_id, id, sort_order, label, evidence_turn_ids, note) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    t["topic_id"],
                    mis["id"],
                    i,
                    mis["label"],
                    json_dumps(mis.get("evidence_turn_ids", [])),
                    mis.get("note"),
                ),
            )
        for marker, text in t["excerpts"].items():
            cur.execute(
                "INSERT INTO excerpts (topic_id, marker, text) VALUES (?, ?, ?)",
                (t["topic_id"], marker, text),
            )

    conn.commit()


def json_dumps(value):
    import json

    return json.dumps(value, ensure_ascii=False)


def main():
    if not os.path.exists(DB_PATH):
        raise SystemExit(f"Không thấy {DB_PATH}. Chạy `python scripts/init_db.py` trước.")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    seed(conn)

    cur = conn.cursor()
    print("--- Đã seed tầng authoring ---")
    rows = list(cur.execute("SELECT topic_id, title FROM topics ORDER BY topic_id"))
    for topic_id, title in rows:
        items = cur.execute(
            "SELECT COUNT(*) FROM checklist_items WHERE topic_id = ?", (topic_id,)
        ).fetchone()[0]
        mis = cur.execute(
            "SELECT COUNT(*) FROM misconceptions WHERE topic_id = ?", (topic_id,)
        ).fetchone()[0]
        exc = cur.execute(
            "SELECT COUNT(*) FROM excerpts WHERE topic_id = ?", (topic_id,)
        ).fetchone()[0]
        print(f"  • {topic_id}: {items} item · {mis} misconception · {exc} excerpt — {title}")
    conn.close()


if __name__ == "__main__":
    main()
