import csv
import re
import os
import sys
import time
import json
import sqlite3

# Đảm bảo UTF-8 trên Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Đường dẫn file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH_PRIMARY = os.path.join(BASE_DIR, "data", "vlearn-pack", "chatlog", "tutor_turns.csv")
CSV_PATH_FALLBACK = os.path.join(BASE_DIR, "tutor_turns.csv")
DB_PATH = os.path.join(BASE_DIR, "vlearn.db")

# Regex bóc tách metadata từ câu hỏi & câu trả lời (chuẩn hóa theo visualize & statistics scripts)
TRANG_Q_RE = re.compile(r'\((?:Trang|Page|Slide)\s*(\d+)', re.IGNORECASE)
PART_Q_RE = re.compile(r'\((?:Đang học phần|Currently on the part)\s*[“"\'`]([^”"\'`]+)[”"\'`]', re.IGNORECASE)
SNIPPET_RE = re.compile(r'(?:đoạn được chọn|Đoạn đang hỏi):\s*""?([^"\n\r]{3,120})', re.IGNORECASE)
TUTOR_TRANG_RE = re.compile(r'\[trang\s*(\d+)\]', re.IGNORECASE)

def get_csv_path():
    if os.path.exists(CSV_PATH_PRIMARY):
        return CSV_PATH_PRIMARY
    if os.path.exists(CSV_PATH_FALLBACK):
        return CSV_PATH_FALLBACK
    raise FileNotFoundError(f"Không tìm thấy file tutor_turns.csv tại:\n- {CSV_PATH_PRIMARY}\n- {CSV_PATH_FALLBACK}")

def create_schema(cursor):
    """Tạo các bảng cho cả 2 tầng: Analytics/Mining và Runtime App D3"""
    
    # 1. BẢNG DỮ LIỆU KHAI PHÁ (ANALYTICS & MINING LAYER)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS raw_tutor_turns (
        turn_id TEXT PRIMARY KEY,
        period TEXT,
        cohort_hint TEXT,
        asked_at_vn TEXT,
        asked_date TEXT,
        asked_hour INTEGER,
        student_id TEXT,
        course_id TEXT,
        lecture_code TEXT,
        lecture_title TEXT,
        is_preset BOOLEAN,
        q_len INTEGER,
        student_question TEXT,
        
        -- Các trường bóc tách (Engineered / Extracted features)
        slide_in_question INTEGER,
        part_in_question TEXT,
        selected_snippet TEXT,
        
        -- Phản hồi của tutor
        tutor_reply TEXT,
        reply_len INTEGER,
        move_used TEXT,
        understanding_level INTEGER,
        has_citation BOOLEAN,
        grade_missing BOOLEAN,
        rating TEXT,
        reply_ms INTEGER,
        cited_slides TEXT          -- JSON Array: e.g. [12, 15]
    );
    """)

    # 2. BẢNG TỔNG HỢP HOTSPOTS (Cụm kiến thức thắc mắc nhiều nhất theo Slide / Part / Khung giờ)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS lecture_hotspots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cohort_hint TEXT,
        course_id TEXT,
        lecture_code TEXT,
        lecture_title TEXT,
        hotspot_type TEXT,         -- 'slide' hoặc 'part'
        target_identifier TEXT,    -- 'Slide 14' hoặc tên module 'Tạo môi trường...'
        total_questions INTEGER,
        organic_questions INTEGER,
        preset_questions INTEGER,
        citation_count INTEGER
    );
    """)

    # Runtime của sản phẩm KHÔNG nằm ở đây.
    # topics/checklist/misconceptions  → content/<topic>.json (app đọc trực tiếp)
    # sessions/turns                   → SessionStore adapter, xem docs/architecture.md §6
    # golden_cases                     → golden/cases.json (vlearn.db bị gitignore nên
    #                                     bảng trong DB vô hình với người chấm)

    # TẠO INDEX ĐỂ QUERY PHÂN TÍCH NHANH TRÊN HÀNG VẠN DÒNG
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_raw_lecture ON raw_tutor_turns(course_id, lecture_code);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_raw_slide ON raw_tutor_turns(slide_in_question);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_raw_cohort_preset ON raw_tutor_turns(cohort_hint, is_preset);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_raw_date ON raw_tutor_turns(asked_date, asked_hour);")

def import_tutor_turns(conn, csv_file):
    cursor = conn.cursor()
    print(f"[*] Đang đọc và bóc tách dữ liệu từ: {csv_file}")
    
    start_time = time.time()
    rows_to_insert = []
    total_count = 0
    batch_size = 2000

    insert_sql = """
    INSERT OR REPLACE INTO raw_tutor_turns (
        turn_id, period, cohort_hint, asked_at_vn, asked_date, asked_hour,
        student_id, course_id, lecture_code, lecture_title, is_preset,
        q_len, student_question, slide_in_question, part_in_question, selected_snippet,
        tutor_reply, reply_len, move_used, understanding_level, has_citation,
        grade_missing, rating, reply_ms, cited_slides
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    with open(csv_file, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for r in reader:
            total_count += 1
            t_id = (r.get('turn_id') or '').strip()
            period = (r.get('period') or '').strip()
            cohort = (r.get('cohort_hint') or '').strip()
            asked_at = (r.get('asked_at_vn') or '').strip()
            
            # Tách ngày và giờ
            asked_date = asked_at[:10] if len(asked_at) >= 10 else None
            asked_hour = None
            if len(asked_at) >= 13:
                try:
                    asked_hour = int(asked_at[11:13])
                except ValueError:
                    pass

            student = (r.get('student') or '').strip()
            c_raw = (r.get('course_id') or '').strip()
            course_id = c_raw.upper() if c_raw else 'UNKNOWN'
            lec_code = (r.get('lecture_code') or '').strip()
            lec_title = (r.get('lecture_title') or '').strip()
            is_preset = 1 if r.get('is_preset') == 'True' else 0
            
            q = r.get('student_question') or ''
            try:
                q_len = int(r.get('q_len') or len(q))
            except ValueError:
                q_len = len(q)

            # 1. Trích xuất slide từ question
            m_trang = TRANG_Q_RE.search(q)
            slide_in_q = int(m_trang.group(1)) if m_trang else None

            # 2. Trích xuất part/module từ question
            m_part = PART_Q_RE.search(q)
            part_in_q = m_part.group(1).strip() if m_part else None

            # 3. Trích xuất đoạn bôi đen từ question
            m_snip = SNIPPET_RE.search(q)
            snip_in_q = m_snip.group(1).strip() if m_snip else None

            rep = r.get('tutor_reply') or ''
            try:
                rep_len = int(r.get('reply_len') or len(rep))
            except ValueError:
                rep_len = len(rep)

            move_used = (r.get('move_used') or '').strip()
            
            # Understanding level
            u_lvl = None
            if r.get('understanding_level') and r.get('understanding_level').strip():
                try:
                    u_lvl = int(r.get('understanding_level'))
                except ValueError:
                    pass

            has_citation = 1 if r.get('has_citation') == 'True' else 0
            grade_missing = 1 if r.get('grade_missing') == 'True' else 0
            rating = (r.get('rating') or '').strip() or None
            
            reply_ms = None
            if r.get('reply_ms') and r.get('reply_ms').strip():
                try:
                    reply_ms = int(r.get('reply_ms'))
                except ValueError:
                    pass

            # 4. Trích xuất citations từ tutor_reply
            cites = TUTOR_TRANG_RE.findall(rep)
            cited_slides_json = json.dumps([int(c) for c in cites]) if cites else None

            row_tuple = (
                t_id, period, cohort, asked_at, asked_date, asked_hour,
                student, course_id, lec_code, lec_title, is_preset,
                q_len, q, slide_in_q, part_in_q, snip_in_q,
                rep, rep_len, move_used, u_lvl, has_citation,
                grade_missing, rating, reply_ms, cited_slides_json
            )
            rows_to_insert.append(row_tuple)

            if len(rows_to_insert) >= batch_size:
                cursor.executemany(insert_sql, rows_to_insert)
                rows_to_insert = []

        if rows_to_insert:
            cursor.executemany(insert_sql, rows_to_insert)

    conn.commit()
    elapsed = time.time() - start_time
    print(f"[✓] Đã import thành công {total_count:,} lượt hỏi đáp vào SQLite trong {elapsed:.2f}s!")

def build_hotspots_summary(conn):
    """Tổng hợp tự động bảng lecture_hotspots theo cả Slide (K3) và Module/Part (K4)"""
    cursor = conn.cursor()
    print("[*] Đang tính toán bảng tổng hợp lecture_hotspots...")
    
    cursor.execute("DROP TABLE IF EXISTS lecture_hotspots;")
    create_schema(conn)
    
    # 1. Gom nhóm theo Slide (phổ biến ở K3)
    query_slide = """
    INSERT INTO lecture_hotspots (
        cohort_hint, course_id, lecture_code, lecture_title, hotspot_type, target_identifier,
        total_questions, organic_questions, preset_questions, citation_count
    )
    SELECT 
        cohort_hint,
        course_id,
        lecture_code,
        lecture_title,
        'slide' as hotspot_type,
        'Slide ' || CAST(slide_in_question AS TEXT) as target_identifier,
        COUNT(*) as total_questions,
        SUM(CASE WHEN is_preset = 0 THEN 1 ELSE 0 END) as organic_questions,
        SUM(CASE WHEN is_preset = 1 THEN 1 ELSE 0 END) as preset_questions,
        SUM(CASE WHEN has_citation = 1 THEN 1 ELSE 0 END) as citation_count
    FROM raw_tutor_turns
    WHERE slide_in_question IS NOT NULL
    GROUP BY cohort_hint, course_id, lecture_code, lecture_title, slide_in_question
    HAVING total_questions >= 5
    ORDER BY total_questions DESC;
    """
    cursor.execute(query_slide)

    # 2. Gom nhóm theo Part / Module (phổ biến ở K4)
    query_part = """
    INSERT INTO lecture_hotspots (
        cohort_hint, course_id, lecture_code, lecture_title, hotspot_type, target_identifier,
        total_questions, organic_questions, preset_questions, citation_count
    )
    SELECT 
        cohort_hint,
        course_id,
        lecture_code,
        lecture_title,
        'part' as hotspot_type,
        part_in_question as target_identifier,
        COUNT(*) as total_questions,
        SUM(CASE WHEN is_preset = 0 THEN 1 ELSE 0 END) as organic_questions,
        SUM(CASE WHEN is_preset = 1 THEN 1 ELSE 0 END) as preset_questions,
        SUM(CASE WHEN has_citation = 1 THEN 1 ELSE 0 END) as citation_count
    FROM raw_tutor_turns
    WHERE part_in_question IS NOT NULL AND part_in_question != ''
    GROUP BY cohort_hint, course_id, lecture_code, lecture_title, part_in_question
    HAVING total_questions >= 5
    ORDER BY total_questions DESC;
    """
    cursor.execute(query_part)
    conn.commit()
    
    cursor.execute("SELECT COUNT(*) FROM lecture_hotspots;")
    hs_count = cursor.fetchone()[0]
    print(f"[✓] Đã tạo {hs_count} hotspots (theo Slide và Module/Part có >= 5 câu hỏi).")

def main():
    csv_file = get_csv_path()
    
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    
    create_schema(conn)
    import_tutor_turns(conn, csv_file)
    build_hotspots_summary(conn)

    # In kiểm tra nhanh Top 5 Hotspots trong khoá K4 (Module/Part có nhiều câu hỏi nhất)
    cursor = conn.cursor()
    print("\n--- TOP 5 HOTSPOTS CỦA KHOÁ K4 (DỮ LIỆU THỰC TẾ) ---")
    cursor.execute("""
    SELECT course_id, lecture_code, target_identifier, total_questions, organic_questions, preset_questions
    FROM lecture_hotspots
    WHERE cohort_hint = 'K4'
    ORDER BY total_questions DESC
    LIMIT 5;
    """)
    rows = cursor.fetchall()
    for r in rows:
        print(f"• [{r[0]}] {r[1]} | {r[2]}: {r[3]} câu (Tự gõ: {r[4]}, Preset: {r[5]})")
        
    conn.close()
    print(f"\n[DONE] Database sẵn sàng tại: {DB_PATH}")

if __name__ == "__main__":
    main()
