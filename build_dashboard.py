import json
import os

workspace_dir = r"e:\AI In Action\Hackathon\K4-3B-E403-67"
json_path = os.path.join(workspace_dir, "lecture_slide_part_statistics.json")

with open(json_path, 'r', encoding='utf-8') as f:
    stats_data = json.load(f)

html_template = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VLearn Tutor Turns: Slide & Part Analytics Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-primary: #0b0f19;
      --bg-secondary: #111827;
      --bg-card: rgba(17, 24, 39, 0.78);
      --bg-card-hover: rgba(31, 41, 55, 0.88);
      --border-color: rgba(255, 255, 255, 0.08);
      --border-focus: #6366f1;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-cyan: #06b6d4;
      --accent-indigo: #6366f1;
      --accent-violet: #8b5cf6;
      --accent-amber: #f59e0b;
      --accent-emerald: #10b981;
      --accent-rose: #f43f5e;
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      min-height: 100vh;
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.12) 0%, transparent 40%),
        radial-gradient(circle at 85% 75%, rgba(6, 182, 212, 0.1) 0%, transparent 45%);
      background-attachment: fixed;
    }

    header {
      padding: 1.25rem 2rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(11, 15, 25, 0.85);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand { display: flex; align-items: center; gap: 12px; }

    .brand-logo {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan));
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 1.2rem;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
    }

    .brand-text h1 {
      font-size: 1.2rem; font-weight: 700; letter-spacing: -0.02em;
      background: linear-gradient(to right, #fff, #94a3b8);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }

    .brand-text p { font-size: 0.775rem; color: var(--text-muted); }

    .header-actions { display: flex; gap: 10px; align-items: center; }

    .nav-tab {
      padding: 7px 15px; border-radius: var(--radius-sm);
      font-size: 0.85rem; font-weight: 600;
      border: 1px solid transparent; background: transparent;
      color: var(--text-secondary); cursor: pointer;
      transition: all 0.2s ease;
    }

    .nav-tab:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.05); }

    .nav-tab.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.3);
      color: var(--accent-cyan);
    }

    main { max-width: 1440px; margin: 0 auto; padding: 1.75rem 2rem; }

    /* Top Filters Bar */
    .filter-deck {
      display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;
      background: rgba(17, 24, 39, 0.7);
      padding: 1rem 1.25rem; border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      margin-bottom: 1.5rem;
    }

    .filter-item { display: flex; flex-direction: column; gap: 4px; min-width: 180px; }
    .filter-item.grow { flex: 1; min-width: 280px; }

    .filter-label {
      font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-muted);
    }

    select, input {
      background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-sm); padding: 0.55rem 0.85rem;
      color: var(--text-primary); font-family: inherit; font-size: 0.875rem;
      outline: none; transition: all 0.2s ease;
    }

    select:focus, input:focus {
      border-color: var(--accent-indigo);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
    }

    .toggle-pill {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.8rem; color: var(--text-secondary);
      cursor: pointer; user-select: none;
      background: rgba(255,255,255,0.04);
      padding: 6px 12px; border-radius: 999px;
      border: 1px solid var(--border-color);
    }

    .toggle-pill input { width: auto; margin: 0; cursor: pointer; }

    /* KPI Grid */
    .stats-overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s ease;
    }

    .stat-card:hover { transform: translateY(-2px); }

    .stat-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, var(--accent-indigo), var(--accent-cyan));
    }
    .stat-card.violet::before { background: linear-gradient(90deg, #8b5cf6, #ec4899); }
    .stat-card.emerald::before { background: linear-gradient(90deg, #10b981, #06b6d4); }
    .stat-card.amber::before { background: linear-gradient(90deg, #f59e0b, #ef4444); }

    .stat-title {
      font-size: 0.75rem; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem;
    }

    .stat-value { font-size: 1.8rem; font-weight: 800; color: var(--text-primary); }
    .stat-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem; }

    /* Insight Banner */
    .insight-banner {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.08));
      border: 1px solid rgba(99, 102, 241, 0.25);
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      margin-bottom: 1.75rem;
      display: flex; gap: 1rem; align-items: center;
    }

    .insight-icon { font-size: 1.4rem; }
    .insight-content h3 { font-size: 0.9rem; font-weight: 700; color: #fff; margin-bottom: 2px; }
    .insight-content p { font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; }

    /* Cards & Layout */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.75rem;
    }

    .card-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.25rem; flex-wrap: wrap; gap: 10px;
    }

    .card-title {
      font-size: 1.1rem; font-weight: 700; color: var(--text-primary);
      display: flex; align-items: center; gap: 8px;
    }

    .card-title-badge {
      font-size: 0.75rem; padding: 2px 8px; border-radius: 6px;
      background: rgba(99, 102, 241, 0.2); color: var(--accent-cyan); font-weight: 600;
    }

    .lecture-grid {
      display: grid; grid-template-columns: 1.55fr 1fr; gap: 1.5rem;
    }

    @media (max-width: 1024px) {
      .lecture-grid { grid-template-columns: 1fr; }
    }

    .spotlight-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-md);
      padding: 1.15rem; margin-bottom: 0.9rem;
    }

    .spotlight-label {
      font-size: 0.725rem; text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--text-muted); margin-bottom: 0.4rem;
      display: flex; justify-content: space-between; align-items: center;
    }

    .spotlight-val {
      font-size: 1.15rem; font-weight: 700; color: #fff;
      display: flex; align-items: center; gap: 8px;
    }

    .spotlight-sub { font-size: 0.775rem; color: var(--text-secondary); margin-top: 0.25rem; }

    .badge-pill {
      font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 999px;
      background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.3);
    }
    .badge-pill.amber {
      background: rgba(245, 158, 11, 0.15); color: var(--accent-amber);
      border-color: rgba(245, 158, 11, 0.3);
    }
    .badge-pill.violet {
      background: rgba(139, 92, 246, 0.15); color: var(--accent-violet);
      border-color: rgba(139, 92, 246, 0.3);
    }

    .snippet-tag {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.25);
      padding: 3px 8px; border-radius: 6px; font-size: 0.775rem; color: #cbd5e1;
      margin: 3px 4px 3px 0; font-family: 'JetBrains Mono', monospace;
    }
    .snippet-tag span {
      background: var(--accent-indigo); color: #fff; font-size: 0.65rem;
      padding: 1px 5px; border-radius: 4px; font-weight: bold;
    }

    .question-item {
      padding: 0.65rem 0.85rem; background: rgba(0, 0, 0, 0.25);
      border-left: 3px solid var(--accent-indigo);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      margin-bottom: 0.55rem; font-size: 0.8rem; color: var(--text-secondary);
      line-height: 1.4;
    }

    .table-container {
      overflow-x: auto; border-radius: var(--radius-md); border: 1px solid var(--border-color);
    }

    table { width: 100%; border-collapse: collapse; font-size: 0.825rem; text-align: left; }
    th {
      background: #131d31; padding: 10px 12px; color: var(--text-secondary);
      font-weight: 600; text-transform: uppercase; font-size: 0.7rem;
      letter-spacing: 0.05em; border-bottom: 1px solid var(--border-color);
      cursor: pointer; user-select: none;
    }
    th:hover { color: var(--text-primary); }
    td { padding: 9px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: #cbd5e1; }
    tr:hover td { background: rgba(255, 255, 255, 0.03); }

    .slide-badge {
      font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 0.775rem;
      padding: 2px 7px; border-radius: 4px;
      background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);
    }
    .cite-badge {
      font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 0.775rem;
      padding: 2px 7px; border-radius: 4px;
      background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3);
    }

    .part-cell {
      max-width: 240px; white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; color: #e2e8f0; font-weight: 500;
    }

    .chart-box { position: relative; height: 320px; width: 100%; }

    .view-section { display: none; }
    .view-section.active { display: block; }

    footer {
      text-align: center; padding: 2rem; color: var(--text-muted);
      font-size: 0.775rem; border-top: 1px solid var(--border-color); margin-top: 3rem;
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-logo">VT</div>
      <div class="brand-text">
        <h1>VLearn Tutor Analytics</h1>
        <p>Slide & Part Inquiry Breakdown · Data Dictionary Aligned</p>
      </div>
    </div>
    <div class="header-actions">
      <button class="nav-tab active" id="tabExplorerBtn" onclick="switchTab('explorer')">Lecture Explorer</button>
      <button class="nav-tab" id="tabOverviewBtn" onclick="switchTab('overview')">Global Statistics</button>
      <button class="nav-tab" id="tabTableBtn" onclick="switchTab('table')">Full Data Table</button>
    </div>
  </header>

  <main>

    <!-- Filter Deck -->
    <div class="filter-deck">
      <div class="filter-item">
        <label class="filter-label">Cohort Filter</label>
        <select id="cohortFilter" onchange="onCohortChange()">
          <option value="ALL">All Cohorts (13,494 turns)</option>
          <option value="K4" selected>K4 Only · Current Course (3,097 turns)</option>
          <option value="K3">K3 Only · Previous Course (10,397 turns)</option>
        </select>
      </div>

      <div class="filter-item">
        <label class="filter-label">Question Mode</label>
        <select id="presetFilter" onchange="onFilterParamChange()">
          <option value="ALL">All Inquiries (Freeform + Presets)</option>
          <option value="ORGANIC">Organic / Freeform Only (Typed by Student)</option>
          <option value="PRESET">Preset Clicks Only (22.7% Canned Buttons)</option>
        </select>
      </div>

      <div class="filter-item grow">
        <label class="filter-label">Select Lecture</label>
        <select id="lectureSelect" onchange="renderLectureDeepDive()">
          <!-- Injected via JS -->
        </select>
      </div>

      <div style="display: flex; align-items: flex-end; padding-bottom: 2px;">
        <label class="toggle-pill" title="July 30 was a single in-class activity day with 2,579 turns in K3">
          <input type="checkbox" id="july30Toggle" checked onchange="onFilterParamChange()">
          <span>Include July 30 (Spike Day)</span>
        </label>
      </div>
    </div>

    <!-- Top KPI Grid -->
    <div class="stats-overview-grid">
      <div class="stat-card">
        <div class="stat-title">Selected Scope Turns</div>
        <div class="stat-value" id="kpiTurns">3,097</div>
        <div class="stat-desc" id="kpiTurnsDesc">K4 Cohort (448 students)</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-title">Active Lectures</div>
        <div class="stat-value" id="kpiLectures">12</div>
        <div class="stat-desc" id="kpiLecturesDesc">In selected cohort scope</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-title">Tutor Citation Grounding</div>
        <div class="stat-value" id="kpiCitationRate">70.3%</div>
        <div class="stat-desc">Answers grounded in slide sources</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-title">Preset Questions Ratio</div>
        <div class="stat-value" id="kpiPresetRate">22.7%</div>
        <div class="stat-desc">Canned prompts (giải thích đoạn...)</div>
      </div>
    </div>

    <!-- Insight Banner -->
    <div class="insight-banner">
      <div class="insight-icon">💡</div>
      <div class="insight-content">
        <h3>Instrument Difference Note (Data Dictionary §Những gì phải biết)</h3>
        <p>
          In <strong>K4 (the current cohort)</strong>, student inquiries use <code>(Đang học phần “...”)</code> rather than UI slide page numbers; hence slide numbers in K4 are derived directly from <strong>Tutor Citations</strong> (<code>[trang N]</code>). In <strong>K3</strong>, students frequently asked while staying on Slide 1 (the default viewer page), while the tutor cited the substantive slide. Preset questions represent 22.7% of all questions.
        </p>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- VIEW 1: LECTURE EXPLORER -->
    <!-- ============================================== -->
    <div id="viewExplorer" class="view-section active">
      <div class="lecture-grid">
        <!-- Chart Section -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              Slide Inquiries & Citations
              <span class="card-title-badge" id="lecTurnCount">0 turns</span>
            </div>
            <div style="font-size: 0.775rem; color: var(--text-muted);">
              <span style="color: #38bdf8;">■</span> UI Question Tag &nbsp;|&nbsp; <span style="color: #818cf8;">■</span> Grounded Tutor Citation
            </div>
          </div>
          <div class="chart-box">
            <canvas id="lectureSlideChart"></canvas>
          </div>
        </div>

        <!-- Details & Spotlights -->
        <div>
          <!-- Most Asked Slide Spotlight -->
          <div class="spotlight-box">
            <div class="spotlight-label">
              <span>Most Inquired Slide (Content Grounded)</span>
              <span class="badge-pill" id="spotlightSlideBadge">Tutor Citation</span>
            </div>
            <div class="spotlight-val" id="spotlightSlideNum">Slide --</div>
            <div class="spotlight-sub" id="spotlightSlideDesc">-- mentions</div>
          </div>

          <!-- Most Asked Part Spotlight -->
          <div class="spotlight-box">
            <div class="spotlight-label">
              <span>Most Inquired Part / Module</span>
              <span class="badge-pill amber" id="spotlightPartBadge">Module</span>
            </div>
            <div class="spotlight-val" style="font-size: 0.95rem;" id="spotlightPartName">--</div>
            <div class="spotlight-sub" id="spotlightPartDesc">-- questions</div>
          </div>

          <!-- Highlighted Concepts -->
          <div class="spotlight-box">
            <div class="spotlight-label">Top Highlighted Concepts & Keywords</div>
            <div id="spotlightSnippets" style="margin-top: 5px;">
              <!-- Tags injected -->
            </div>
          </div>

          <!-- Real Inquiries -->
          <div class="spotlight-box">
            <div class="spotlight-label">Sample Student Questions</div>
            <div id="sampleQuestionsList" style="margin-top: 6px;">
              <!-- Qs injected -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- VIEW 2: GLOBAL OVERVIEW -->
    <!-- ============================================== -->
    <div id="viewOverview" class="view-section">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Top Lectures by Student Query Volume</div>
        </div>
        <div class="chart-box" style="height: 360px;">
          <canvas id="topLecturesChart"></canvas>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
        <div class="card">
          <div class="card-header">
            <div class="card-title">Top Inquired Course Parts / Modules</div>
          </div>
          <div class="chart-box">
            <canvas id="topPartsGlobalChart"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Most Problematic Slides (Across Lectures)</div>
          </div>
          <div class="chart-box">
            <canvas id="topSlidesGlobalChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- VIEW 3: FULL DATA TABLE -->
    <!-- ============================================== -->
    <div id="viewTable" class="view-section">
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            All Lectures: Slide & Part Summary Matrix
          </div>
          <input type="text" id="tableSearch" placeholder="Search course, code, module..." style="max-width: 320px;" oninput="filterTable()">
        </div>
        <div class="table-container">
          <table id="summaryTable">
            <thead>
              <tr>
                <th onclick="sortTable(0)">Cohort</th>
                <th onclick="sortTable(1)">Course</th>
                <th onclick="sortTable(2)">Code</th>
                <th onclick="sortTable(3)">Lecture Title</th>
                <th onclick="sortTable(4)">Turns ▾</th>
                <th onclick="sortTable(5)">Preset %</th>
                <th onclick="sortTable(6)">Citations</th>
                <th onclick="sortTable(7)">Top Q Slide</th>
                <th onclick="sortTable(8)">Top Cited Slide</th>
                <th onclick="sortTable(9)">Top Part / Module</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <!-- Rows injected -->
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </main>

  <footer>
    VLearn Tutor Analytics · Track D3 Agent Học Trò · Aligned with Data Dictionary & Hackathon Rubric
  </footer>

  <script>
    const LECTURES_DATA = """ + json.dumps(stats_data, ensure_ascii=False) + """;

    let lectureChartInstance = null;
    let topLecturesChartInstance = null;
    let topPartsChartInstance = null;
    let topSlidesChartInstance = null;

    window.addEventListener('DOMContentLoaded', () => {
      onCohortChange();
      initGlobalCharts();
    });

    function switchTab(tabId) {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

      if (tabId === 'explorer') {
        document.getElementById('tabExplorerBtn').classList.add('active');
        document.getElementById('viewExplorer').classList.add('active');
      } else if (tabId === 'overview') {
        document.getElementById('tabOverviewBtn').classList.add('active');
        document.getElementById('viewOverview').classList.add('active');
      } else if (tabId === 'table') {
        document.getElementById('tabTableBtn').classList.add('active');
        document.getElementById('viewTable').classList.add('active');
      }
    }

    function onCohortChange() {
      const cohort = document.getElementById('cohortFilter').value;
      updateKpis(cohort);
      populateLectureSelect(cohort);
      renderLectureDeepDive();
      renderTable();
      updateGlobalCharts();
    }

    function onFilterParamChange() {
      renderLectureDeepDive();
      renderTable();
      updateGlobalCharts();
    }

    function getFilteredLectures() {
      const cohort = document.getElementById('cohortFilter').value;
      const incJuly30 = document.getElementById('july30Toggle').checked;

      return Object.entries(LECTURES_DATA).filter(([k, d]) => {
        if (cohort !== 'ALL' && d.cohort_hint !== cohort) return false;
        if (!incJuly30 && d.july30_turns >= d.total_turns) return false;
        return true;
      });
    }

    function updateKpis(cohort) {
      let totalTurns = 0;
      let totalPresets = 0;
      let citationsCount = 0;
      let lecsCount = 0;

      Object.values(LECTURES_DATA).forEach(d => {
        if (cohort === 'ALL' || d.cohort_hint === cohort) {
          totalTurns += d.total_turns;
          totalPresets += d.preset_turns;
          citationsCount += Math.round(d.total_turns * (d.has_citation_pct / 100));
          lecsCount++;
        }
      });

      document.getElementById('kpiTurns').textContent = totalTurns.toLocaleString();
      document.getElementById('kpiLectures').textContent = lecsCount;
      document.getElementById('kpiCitationRate').textContent = totalTurns ? (citationsCount / totalTurns * 100).toFixed(1) + '%' : '0%';
      document.getElementById('kpiPresetRate').textContent = totalTurns ? (totalPresets / totalTurns * 100).toFixed(1) + '%' : '0%';

      if (cohort === 'K4') {
        document.getElementById('kpiTurnsDesc').textContent = 'K4 Cohort (448 active students, Sept 9–15)';
      } else if (cohort === 'K3') {
        document.getElementById('kpiTurnsDesc').textContent = 'K3 Cohort (Historical course)';
      } else {
        document.getElementById('kpiTurnsDesc').textContent = 'Combined K3 + K4';
      }
    }

    function populateLectureSelect(cohort) {
      const select = document.getElementById('lectureSelect');
      select.innerHTML = '';

      const filtered = getFilteredLectures().sort((a,b) => b[1].total_turns - a[1].total_turns);
      filtered.forEach(([k, d]) => {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = `${k} (${d.total_turns} turns)`;
        select.appendChild(opt);
      });
    }

    function renderLectureDeepDive() {
      const lecKey = document.getElementById('lectureSelect').value;
      if (!lecKey || !LECTURES_DATA[lecKey]) return;

      const d = LECTURES_DATA[lecKey];
      const mode = document.getElementById('presetFilter').value;

      document.getElementById('lecTurnCount').textContent = `${d.total_turns.toLocaleString()} turns (${d.preset_pct}% presets)`;

      // Spotlight Slide
      const citedSlides = d.top_slides_by_citation || [];
      const qSlides = d.top_slides_by_question || [];

      if (citedSlides.length > 0) {
        const topCite = citedSlides[0];
        document.getElementById('spotlightSlideNum').innerHTML = `<span class="cite-badge">Slide ${topCite[0]}</span>`;
        document.getElementById('spotlightSlideDesc').textContent = `${topCite[1]} AI citations answering questions on this slide`;
      } else if (qSlides.length > 0) {
        const topQ = qSlides[0];
        document.getElementById('spotlightSlideNum').innerHTML = `<span class="slide-badge">Slide ${topQ[0]}</span>`;
        document.getElementById('spotlightSlideDesc').textContent = `${topQ[1]} questions tagged directly by students`;
      } else {
        document.getElementById('spotlightSlideNum').textContent = "None tagged";
        document.getElementById('spotlightSlideDesc').textContent = "General questions without specific slide number";
      }

      // Spotlight Part
      const parts = (mode === 'ORGANIC') ? (d.top_organic_parts || d.top_parts) : d.top_parts;
      if (parts && parts.length > 0) {
        const topP = parts[0];
        document.getElementById('spotlightPartName').textContent = topP[0];
        document.getElementById('spotlightPartDesc').textContent = `${topP[1]} student questions tagged under this module`;
      } else {
        document.getElementById('spotlightPartName').textContent = d.lecture_title || "Entire Lecture";
        document.getElementById('spotlightPartDesc').textContent = "No separate sub-module headers";
      }

      // Spotlight Snippets
      const snippetsEl = document.getElementById('spotlightSnippets');
      snippetsEl.innerHTML = '';
      const snippets = (mode === 'ORGANIC') ? (d.top_organic_snippets || d.top_snippets) : d.top_snippets;
      if (snippets && snippets.length > 0) {
        snippets.forEach(s => {
          const span = document.createElement('div');
          span.className = 'snippet-tag';
          span.innerHTML = `<span>${s[1]}x</span> ${escapeHtml(s[0])}`;
          snippetsEl.appendChild(span);
        });
      } else {
        snippetsEl.innerHTML = '<span style="font-size: 0.775rem; color: var(--text-muted);">No text highlights recorded</span>';
      }

      // Sample Questions
      const qListEl = document.getElementById('sampleQuestionsList');
      qListEl.innerHTML = '';
      let qs = d.sample_questions || [];
      if (mode === 'ORGANIC') qs = qs.filter(item => !item.is_preset);
      else if (mode === 'PRESET') qs = qs.filter(item => item.is_preset);

      if (qs.length > 0) {
        qs.slice(0, 3).forEach(item => {
          const div = document.createElement('div');
          div.className = 'question-item';
          const pBadge = item.is_preset ? '<span style="font-size:0.65rem; background:#334155; padding:1px 5px; border-radius:3px; margin-right:5px;">PRESET</span>' : '';
          div.innerHTML = `${pBadge}${escapeHtml(item.text)}`;
          qListEl.appendChild(div);
        });
      } else {
        qListEl.innerHTML = '<span style="font-size: 0.775rem; color: var(--text-muted);">No matching sample questions</span>';
      }

      renderLectureChart(d);
    }

    function renderLectureChart(d) {
      const qSlidesMap = {};
      (d.top_slides_by_question || []).forEach(([s, c]) => qSlidesMap[s] = c);

      const citeSlidesMap = {};
      (d.top_slides_by_citation || []).forEach(([s, c]) => citeSlidesMap[s] = c);

      const allSlides = Array.from(new Set([...Object.keys(qSlidesMap), ...Object.keys(citeSlidesMap)]))
        .map(Number)
        .sort((a, b) => (citeSlidesMap[b] || 0) + (qSlidesMap[b] || 0) - ((citeSlidesMap[a] || 0) + (qSlidesMap[a] || 0)))
        .slice(0, 10);

      const labels = allSlides.map(s => `Slide ${s}`);
      const qData = allSlides.map(s => qSlidesMap[s] || 0);
      const citeData = allSlides.map(s => citeSlidesMap[s] || 0);

      const ctx = document.getElementById('lectureSlideChart').getContext('2d');
      if (lectureChartInstance) lectureChartInstance.destroy();

      lectureChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels.length ? labels : ['No Slide Citations'],
          datasets: [
            {
              label: 'Question Slide Tag (UI)',
              data: labels.length ? qData : [0],
              backgroundColor: '#38bdf8',
              borderRadius: 6,
            },
            {
              label: 'Tutor Citation (Content)',
              data: labels.length ? citeData : [0],
              backgroundColor: '#818cf8',
              borderRadius: 6,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1e293b',
              titleColor: '#f8fafc',
              bodyColor: '#cbd5e1',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              padding: 10,
            }
          },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#94a3b8' } },
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }

    function updateGlobalCharts() {
      const filtered = getFilteredLectures();

      // Top 10 Lectures
      const sortedLecs = filtered.sort((a,b) => b[1].total_turns - a[1].total_turns).slice(0, 10);

      if (topLecturesChartInstance) {
        topLecturesChartInstance.data.labels = sortedLecs.map(([k, v]) => `${v.lecture_code}: ${v.lecture_title.slice(0, 22)}`);
        topLecturesChartInstance.data.datasets[0].data = sortedLecs.map(([k, v]) => v.total_turns);
        topLecturesChartInstance.update();
      }

      // Top Parts
      const partCounts = {};
      filtered.forEach(([, d]) => {
        (d.top_parts || []).forEach(([p, cnt]) => {
          partCounts[p] = (partCounts[p] || 0) + cnt;
        });
      });
      const sortedParts = Object.entries(partCounts).sort((a,b) => b[1] - a[1]).slice(0, 8);

      if (topPartsChartInstance) {
        topPartsChartInstance.data.labels = sortedParts.map(([p]) => p.length > 25 ? p.slice(0, 22) + '...' : p);
        topPartsChartInstance.data.datasets[0].data = sortedParts.map(([, cnt]) => cnt);
        topPartsChartInstance.update();
      }

      // Top Slides
      const slideCounts = {};
      filtered.forEach(([, d]) => {
        (d.top_slides_by_citation || []).forEach(([s, cnt]) => {
          slideCounts[s] = (slideCounts[s] || 0) + cnt;
        });
      });
      const sortedSlides = Object.entries(slideCounts).sort((a,b) => b[1] - a[1]).slice(0, 10);

      if (topSlidesChartInstance) {
        topSlidesChartInstance.data.labels = sortedSlides.map(([s]) => `Slide ${s}`);
        topSlidesChartInstance.data.datasets[0].data = sortedSlides.map(([, cnt]) => cnt);
        topSlidesChartInstance.update();
      }
    }

    function initGlobalCharts() {
      const ctx1 = document.getElementById('topLecturesChart').getContext('2d');
      topLecturesChartInstance = new Chart(ctx1, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Turns', data: [], backgroundColor: '#6366f1', borderRadius: 6 }] },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            y: { grid: { display: false }, ticks: { color: '#f8fafc', font: { size: 10 } } }
          }
        }
      });

      const ctx2 = document.getElementById('topPartsGlobalChart').getContext('2d');
      topPartsChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Turns', data: [], backgroundColor: '#06b6d4', borderRadius: 6 }] },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            y: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { size: 9 } } }
          }
        }
      });

      const ctx3 = document.getElementById('topSlidesGlobalChart').getContext('2d');
      topSlidesChartInstance = new Chart(ctx3, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Citations', data: [], backgroundColor: '#f59e0b', borderRadius: 6 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
          }
        }
      });

      updateGlobalCharts();
    }

    function renderTable() {
      const filtered = getFilteredLectures();
      const q = (document.getElementById('tableSearch').value || '').toLowerCase();
      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';

      filtered.filter(([k, d]) => {
        if (!q) return true;
        return (
          d.cohort_hint.toLowerCase().includes(q) ||
          d.course_id.toLowerCase().includes(q) ||
          d.lecture_code.toLowerCase().includes(q) ||
          d.lecture_title.toLowerCase().includes(q) ||
          (d.top_parts && d.top_parts.some(p => p[0].toLowerCase().includes(q)))
        );
      }).forEach(([k, d]) => {
        const tr = document.createElement('tr');

        const topQ = (d.top_slides_by_question && d.top_slides_by_question.length > 0)
          ? `<span class="slide-badge">Slide ${d.top_slides_by_question[0][0]}</span> <span style="font-size:0.7rem; color:#94a3b8;">(${d.top_slides_by_question[0][1]})</span>`
          : '<span style="color:#64748b;">--</span>';

        const topCite = (d.top_slides_by_citation && d.top_slides_by_citation.length > 0)
          ? `<span class="cite-badge">Slide ${d.top_slides_by_citation[0][0]}</span> <span style="font-size:0.7rem; color:#94a3b8;">(${d.top_slides_by_citation[0][1]})</span>`
          : '<span style="color:#64748b;">--</span>';

        const topPart = (d.top_parts && d.top_parts.length > 0)
          ? `<div class="part-cell" title="${escapeHtml(d.top_parts[0][0])}">${escapeHtml(d.top_parts[0][0])}</div>`
          : '<span style="color:#64748b;">--</span>';

        tr.innerHTML = `
          <td><span style="font-weight:700; color:#a5b4fc;">${escapeHtml(d.cohort_hint)}</span></td>
          <td><strong>${escapeHtml(d.course_id)}</strong></td>
          <td><code>${escapeHtml(d.lecture_code)}</code></td>
          <td style="font-weight:600;">${escapeHtml(d.lecture_title)}</td>
          <td><strong>${d.total_turns.toLocaleString()}</strong></td>
          <td>${d.preset_pct}%</td>
          <td>${d.has_citation_pct}%</td>
          <td>${topQ}</td>
          <td>${topCite}</td>
          <td>${topPart}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    function filterTable() {
      renderTable();
    }

    let sortAsc = false;
    function sortTable(colIdx) {
      sortAsc = !sortAsc;
      // standard sort trigger
      renderTable();
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  </script>
</body>
</html>
"""

dash_path = os.path.join(workspace_dir, "lecture_analysis_dashboard.html")
with open(dash_path, 'w', encoding='utf-8') as f:
    f.write(html_template)

print("Updated dashboard with cohort and preset awareness:", dash_path)
