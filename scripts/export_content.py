# Export tầng authoring trong vlearn.db ra content/<topic_id>.json.
#
# Chạy: python scripts/export_content.py
# Output: content/<topic_id>.json — artifact commit vào repo, app đọc trực tiếp.
# Validate trước khi ghi: file hỏng thì không ghi đè file cũ.

import json
import os
import sqlite3
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "vlearn.db")
CONTENT_DIR = os.path.join(BASE_DIR, "content")


def parse_json_array(raw):
    if not raw:
        return []
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return value if isinstance(value, list) else []


def build_topic(cur, topic_id, title, source_lecture):
    items = []
    for item_id, label, source, keywords in cur.execute(
        "SELECT id, label, source, keywords FROM checklist_items "
        "WHERE topic_id = ? ORDER BY sort_order",
        (topic_id,),
    ):
        item = {"id": item_id, "label": label, "source": source}
        kws = parse_json_array(keywords)
        if kws:
            item["keywords"] = kws
        items.append(item)

    misconceptions = []
    for mis_id, label, evidence, note in cur.execute(
        "SELECT id, label, evidence_turn_ids, note FROM misconceptions "
        "WHERE topic_id = ? ORDER BY sort_order",
        (topic_id,),
    ):
        mis = {"id": mis_id, "label": label}
        evidence_ids = parse_json_array(evidence)
        if evidence_ids:
            mis["evidence_turn_ids"] = evidence_ids
        if note:
            mis["note"] = note
        misconceptions.append(mis)

    excerpts = {
        marker: text
        for marker, text in cur.execute(
            "SELECT marker, text FROM excerpts WHERE topic_id = ? ORDER BY marker",
            (topic_id,),
        )
    }

    return {
        "topic_id": topic_id,
        "title": title,
        "source_lecture": source_lecture,
        "items": items,
        "misconceptions": misconceptions,
        "excerpts": excerpts,
    }


def validate(topic):
    errors = []
    topic_id = topic["topic_id"]

    if not topic["title"].strip():
        errors.append("title rỗng")
    if not topic["items"]:
        errors.append("không có item nào")

    item_ids = [i["id"] for i in topic["items"]]
    if len(item_ids) != len(set(item_ids)):
        errors.append(f"item id trùng: {item_ids}")

    for item in topic["items"]:
        if not item["source"].strip():
            errors.append(f"item {item['id']} thiếu source")
        elif item["source"] not in topic["excerpts"]:
            errors.append(f"item {item['id']} trỏ {item['source']} nhưng không có excerpt")

    mis_ids = [m["id"] for m in topic["misconceptions"]]
    if len(mis_ids) != len(set(mis_ids)):
        errors.append(f"misconception id trùng: {mis_ids}")

    if errors:
        raise ValueError(f"{topic_id}:\n  - " + "\n  - ".join(errors))


def main():
    if not os.path.exists(DB_PATH):
        raise SystemExit(f"Không thấy {DB_PATH}. Chạy `python scripts/seed_content.py` trước.")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    rows = list(cur.execute("SELECT topic_id, title, source_lecture FROM topics ORDER BY topic_id"))
    if not rows:
        conn.close()
        raise SystemExit("DB chưa có topic nào. Chạy `python scripts/seed_content.py` trước.")

    os.makedirs(CONTENT_DIR, exist_ok=True)
    written = []

    for topic_id, title, source_lecture in rows:
        topic = build_topic(cur, topic_id, title, source_lecture)
        validate(topic)

        out_path = os.path.join(CONTENT_DIR, f"{topic_id}.json")
        with open(out_path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(topic, f, ensure_ascii=False, indent=2)
            f.write("\n")
        written.append((topic_id, len(topic["items"]), len(topic["misconceptions"]), out_path))

    conn.close()

    print("--- Đã export ---")
    for topic_id, n_items, n_mis, path in written:
        print(f"  • {topic_id}: {n_items} item · {n_mis} misconception → {path}")


if __name__ == "__main__":
    main()
