import json
import os
from collections import Counter
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Set styling
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'sans-serif']
plt.rcParams['axes.edgecolor'] = '#cbd5e1'
plt.rcParams['axes.linewidth'] = 0.8

workspace_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "evidence")
json_path = os.path.join(workspace_dir, "lecture_slide_part_statistics.json")

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# ----------------------------------------------------
# 1. K4 COHORT (Khoá 4 hiện tại) Focus: Top Slides & Parts
# ----------------------------------------------------
k4_lecs = [item for item in data.items() if item[1].get('cohort_hint') == 'K4']
k4_lecs.sort(key=lambda x: x[1]['total_turns'], reverse=True)

fig, axes = plt.subplots(3, 2, figsize=(15, 12))
axes = axes.flatten()

for idx in range(6):
    ax = axes[idx]
    if idx < len(k4_lecs):
        lkey, ldata = k4_lecs[idx]
        top_cites = ldata['top_slides_by_citation'][:6]
        if top_cites:
            slides, counts = zip(*top_cites)
            labels = [f"Slide {s}" for s in slides]
            colors = sns.color_palette("rocket", len(slides))
            bars = ax.bar(labels, counts, color=colors, edgecolor='none', width=0.55)
            for bar in bars:
                h = bar.get_height()
                ax.text(bar.get_x() + bar.get_width()/2, h + 2, f"{int(h)}", ha='center', va='bottom', fontsize=9, fontweight='bold')
        else:
            ax.text(0.5, 0.5, "No slide citations", ha='center', va='center')
            
        top_p = ldata['top_parts'][0][0] if ldata['top_parts'] else 'N/A'
        if len(top_p) > 35:
            top_p = top_p[:32] + "..."
        ax.set_title(f"[{ldata['course_id']}] {ldata['lecture_code']} - {ldata['lecture_title']}\nTop Part: {top_p} ({ldata['total_turns']} turns)", 
                     fontsize=10, fontweight='bold')
        ax.set_ylabel('Tutor Citations', fontsize=8)
        ax.grid(axis='y', linestyle='--', alpha=0.5)

plt.suptitle('K4 Cohort (Current Course) - Top Inquired Slides & Modules by Lecture', fontsize=14, fontweight='bold', y=0.99)
plt.tight_layout()
fig_k4_path = os.path.join(workspace_dir, "visualization_k4_hotspots.png")
fig.savefig(fig_k4_path, dpi=300)
plt.close(fig)
print("Saved:", fig_k4_path)

# ----------------------------------------------------
# 2. Top Parts / Modules with most student questions
# ----------------------------------------------------
part_counter = {}
for lec_key, ldata in data.items():
    for part, cnt in ldata['top_parts']:
        clean_part = part.strip()
        part_counter[clean_part] = part_counter.get(clean_part, 0) + cnt

top_12_parts = sorted(part_counter.items(), key=lambda x: x[1], reverse=True)[:12]
parts, p_counts = zip(*top_12_parts[::-1])

fig, ax = plt.subplots(figsize=(12, 7))
colors = sns.color_palette("mako", len(parts))
bars = ax.barh(range(len(parts)), p_counts, color=colors, edgecolor='none', height=0.65)

ax.set_yticks(range(len(parts)))
ax.set_yticklabels([p if len(p) <= 45 else p[:42] + '...' for p in parts], fontsize=10, fontweight='500')
ax.set_xlabel('Number of Student Questions / Turns', fontsize=12, fontweight='bold', labelpad=10)
ax.set_title('Top 12 Most Frequently Inquired Parts / Modules Across Lectures', fontsize=14, fontweight='bold', pad=15)

for bar in bars:
    w = bar.get_width()
    ax.text(w + 10, bar.get_y() + bar.get_height()/2, f"{int(w):,}", va='center', ha='left', fontsize=10, fontweight='bold', color='#1e293b')

ax.set_xlim(0, max(p_counts) * 1.15)
plt.tight_layout()
fig_part_path = os.path.join(workspace_dir, "visualization_top_parts.png")
fig.savefig(fig_part_path, dpi=300)
plt.close(fig)
print("Saved:", fig_part_path)

# ----------------------------------------------------
# 3. Overall Top Inquired Slides: Tags vs Citations
# ----------------------------------------------------
top_lecs = sorted(data.items(), key=lambda x: x[1]['total_turns'], reverse=True)[:6]

fig, axes = plt.subplots(3, 2, figsize=(15, 12))
axes = axes.flatten()

for idx, (lkey, ldata) in enumerate(top_lecs):
    ax = axes[idx]
    cited_slides = dict(ldata['top_slides_by_citation'][:6])
    q_slides = dict(ldata['top_slides_by_question'][:6])
    
    all_s = sorted(list(set(list(cited_slides.keys()) + list(q_slides.keys()))), 
                   key=lambda s: cited_slides.get(s, 0) + q_slides.get(s, 0), reverse=True)[:5]
    
    if not all_s:
        ax.text(0.5, 0.5, "No specific slide tags", ha='center', va='center')
        ax.set_title(f"{ldata['lecture_code']}: {ldata['lecture_title'][:30]}", fontsize=10, fontweight='bold')
        continue
        
    s_labels = [f"Slide {s}" for s in all_s]
    c_vals = [cited_slides.get(s, 0) for s in all_s]
    q_vals = [q_slides.get(s, 0) for s in all_s]
    
    x = np.arange(len(all_s))
    width = 0.38
    
    ax.bar(x - width/2, q_vals, width, label='Question Tag (UI)', color='#38bdf8', alpha=0.9)
    ax.bar(x + width/2, c_vals, width, label='Tutor Citation (Content)', color='#6366f1', alpha=0.9)
    
    short_title = f"{ldata['course_id']} | {ldata['lecture_code']} - {ldata['lecture_title']}"
    if len(short_title) > 40:
        short_title = short_title[:37] + "..."
    ax.set_title(f"{short_title}\n({ldata['total_turns']} turns | Presets: {ldata['preset_pct']}%)", fontsize=10, fontweight='bold')
    ax.set_xticks(x)
    ax.set_xticklabels(s_labels, fontsize=9)
    ax.set_ylabel('Count', fontsize=8)
    ax.legend(fontsize=8, loc='upper right')
    ax.grid(axis='y', linestyle='--', alpha=0.5)

plt.suptitle('Slide Inquiry Hotspots: Student UI Tags vs. Grounded Tutor Citations', 
             fontsize=14, fontweight='bold', y=0.99)
plt.tight_layout()
fig_slides_path = os.path.join(workspace_dir, "visualization_top_slides.png")
fig.savefig(fig_slides_path, dpi=300)
plt.close(fig)
print("Saved:", fig_slides_path)
