import csv
import re
import sys
import os
import json
from collections import Counter, defaultdict

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
workspace_dir = os.path.join(BASE_DIR, "evidence")
os.makedirs(workspace_dir, exist_ok=True)

csv_path = os.path.join(BASE_DIR, "data", "vlearn-pack", "chatlog", "tutor_turns.csv")
if not os.path.exists(csv_path):
    csv_path = os.path.join(BASE_DIR, "tutor_turns.csv")

trang_q_re = re.compile(r'\((?:Trang|Page|Slide)\s*(\d+)', re.IGNORECASE)
part_q_re = re.compile(r'\((?:Đang học phần|Currently on the part)\s*[“"\'`]([^”"\'`]+)[”"\'`]', re.IGNORECASE)
selected_text_re = re.compile(r'(?:đoạn được chọn|Đoạn đang hỏi):\s*""?([^"\n\r]{3,100})', re.IGNORECASE)
tutor_trang_re = re.compile(r'\[trang\s*(\d+)\]', re.IGNORECASE)

def create_lec_dict():
    return {
        'course_id': '',
        'lecture_code': '',
        'lecture_title': '',
        'cohort_hint': '',
        'total_turns': 0,
        'organic_turns': 0,
        'preset_turns': 0,
        'has_citation_count': 0,
        'july30_turns': 0,
        'q_slides': Counter(),
        'tutor_slides': Counter(),
        'parts': Counter(),
        'organic_parts': Counter(),
        'selected_snippets': Counter(),
        'organic_snippets': Counter(),
        'sample_questions': []
    }

lectures_data = defaultdict(create_lec_dict)

total_rows = 0
cohort_counter = Counter()

with open(csv_path, 'r', encoding='utf-8', errors='replace') as f:
    reader = csv.DictReader(f)
    for r in reader:
        total_rows += 1
        c_raw = (r.get('course_id') or '').strip()
        c = c_raw.upper() if c_raw else 'UNKNOWN_COURSE'
        code = (r.get('lecture_code') or '').strip() or 'UNKNOWN_CODE'
        title = (r.get('lecture_title') or '').strip() or 'UNKNOWN_TITLE'
        cohort = (r.get('cohort_hint') or '').strip() or 'UNKNOWN_COHORT'
        cohort_counter[cohort] += 1
        
        is_preset = (r.get('is_preset') == 'True')
        has_cite = (r.get('has_citation') == 'True')
        date_str = (r.get('asked_at_vn') or '')[:10]
        is_july30 = (date_str == '2026-07-30')
        
        key = f"[{c}] {code} - {title}"
        lec = lectures_data[key]
        lec['course_id'] = c
        lec['lecture_code'] = code
        lec['lecture_title'] = title
        lec['cohort_hint'] = cohort
        lec['total_turns'] += 1
        
        if is_preset:
            lec['preset_turns'] += 1
        else:
            lec['organic_turns'] += 1
            
        if has_cite:
            lec['has_citation_count'] += 1
            
        if is_july30:
            lec['july30_turns'] += 1
            
        q = r.get('student_question', '')
        rep = r.get('tutor_reply', '')
        
        # 1. Slide from question
        mq = trang_q_re.search(q)
        if mq:
            s_num = int(mq.group(1))
            lec['q_slides'][s_num] += 1
            
        # 2. Slide from tutor citation
        cites = tutor_trang_re.findall(rep)
        for ct in cites:
            lec['tutor_slides'][int(ct)] += 1
            
        # 3. Part from question
        mp = part_q_re.search(q)
        if mp:
            p = mp.group(1).strip()
            lec['parts'][p] += 1
            if not is_preset:
                lec['organic_parts'][p] += 1
                
        # 4. Snippet
        ms = selected_text_re.search(q)
        if ms:
            snip = ms.group(1).strip()
            if snip and len(snip) > 2:
                lec['selected_snippets'][snip] += 1
                if not is_preset:
                    lec['organic_snippets'][snip] += 1
                    
        # Sample questions
        if len(lec['sample_questions']) < 5:
            clean_q = re.sub(r'\s+', ' ', q).strip()
            if len(clean_q) > 15 and not clean_q.startswith('(Trang 1, đoạn được chọn: "hii")'):
                lec['sample_questions'].append({
                    'text': clean_q[:140],
                    'is_preset': is_preset
                })

# Build CSV output
export_rows = []
json_output = {}

for key, data in sorted(lectures_data.items(), key=lambda x: x[1]['total_turns'], reverse=True):
    top_q_slide, top_q_count = data['q_slides'].most_common(1)[0] if data['q_slides'] else ('N/A', 0)
    
    # Non-slide 1
    non_1 = [(s, cnt) for s, cnt in data['q_slides'].most_common() if s != 1]
    top_q_non1, top_q_non1_count = non_1[0] if non_1 else ('N/A', 0)
    
    top_cite_slide, top_cite_count = data['tutor_slides'].most_common(1)[0] if data['tutor_slides'] else ('N/A', 0)
    top_part, top_part_count = data['parts'].most_common(1)[0] if data['parts'] else ('N/A', 0)
    top_snip, top_snip_count = data['selected_snippets'].most_common(1)[0] if data['selected_snippets'] else ('N/A', 0)
    
    cite_pct = round((data['has_citation_count'] / data['total_turns']) * 100, 1)
    preset_pct = round((data['preset_turns'] / data['total_turns']) * 100, 1)
    
    row = {
        'lecture_key': key,
        'cohort_hint': data['cohort_hint'],
        'course_id': data['course_id'],
        'lecture_code': data['lecture_code'],
        'lecture_title': data['lecture_title'],
        'total_turns': data['total_turns'],
        'organic_turns': data['organic_turns'],
        'preset_turns': data['preset_turns'],
        'preset_pct': preset_pct,
        'has_citation_pct': cite_pct,
        'july30_turns': data['july30_turns'],
        'top_question_slide': top_q_slide,
        'top_question_slide_count': top_q_count,
        'top_question_slide_non1': top_q_non1,
        'top_question_slide_non1_count': top_q_non1_count,
        'top_tutor_cited_slide': top_cite_slide,
        'top_tutor_cited_slide_count': top_cite_count,
        'top_part_or_module': top_part,
        'top_part_count': top_part_count,
        'top_selected_concept': top_snip,
        'top_concept_count': top_snip_count,
    }
    export_rows.append(row)
    
    json_output[key] = {
        'cohort_hint': data['cohort_hint'],
        'course_id': data['course_id'],
        'lecture_code': data['lecture_code'],
        'lecture_title': data['lecture_title'],
        'total_turns': data['total_turns'],
        'organic_turns': data['organic_turns'],
        'preset_turns': data['preset_turns'],
        'preset_pct': preset_pct,
        'has_citation_pct': cite_pct,
        'july30_turns': data['july30_turns'],
        'top_slides_by_question': data['q_slides'].most_common(10),
        'top_slides_by_citation': data['tutor_slides'].most_common(10),
        'top_parts': data['parts'].most_common(5),
        'top_organic_parts': data['organic_parts'].most_common(5),
        'top_snippets': data['selected_snippets'].most_common(5),
        'top_organic_snippets': data['organic_snippets'].most_common(5),
        'sample_questions': data['sample_questions']
    }

csv_out_path = os.path.join(workspace_dir, "lecture_slide_part_statistics.csv")
with open(csv_out_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=list(export_rows[0].keys()))
    writer.writeheader()
    writer.writerows(export_rows)

json_out_path = os.path.join(workspace_dir, "lecture_slide_part_statistics.json")
with open(json_out_path, 'w', encoding='utf-8') as f:
    json.dump(json_output, f, ensure_ascii=False, indent=2)

print(f"Successfully processed {total_rows} rows.")
print(f"Cohorts: {dict(cohort_counter)}")
print(f"Wrote updated CSV: {csv_out_path}")
print(f"Wrote updated JSON: {json_out_path}")
