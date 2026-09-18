// ORCHESTRATOR — code thuần, không gọi AI.
// Giữ state phiên, quyết định khi nào phiên kết thúc, nối 3 tầng lại.
// Xem docs/architecture.md §4 "Luồng một lượt".

import { NextRequest, NextResponse } from "next/server";
import { loadTopic } from "@/lib/content";
import { runGuard } from "@/lib/guard";
import { evaluate, PROMPT_VERSION } from "@/lib/evaluator";
import { speak } from "@/lib/persona";
import { db } from "@/lib/db";
import { MODEL_EVALUATOR } from "@/lib/llm";
import type { PersonaStyleId, Stage1Output, TurnRecord } from "@/lib/types";

const TURN_CAP = 8;
const COVERAGE_TO_PASS = 5 / 7;

// State phiên. coveredIds CỘNG DỒN: học viên nói đúng K1 ở lượt 1 thì
// lượt 5 không phải nói lại, nếu không coverage sẽ nhảy lung tung.
type State = {
  coveredIds: string[];
  openMisconceptions: string[];
  turnIndex: number;
  history: { role: "student" | "agent"; text: string }[];
  personaStyle: PersonaStyleId;
};
const states = new Map<string, State>();

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const {
    sessionId,
    text,
    topicId = "llm-hallucination",
    testerCode = "U00",
    personaStyle = "ban_minh",
  } = await req.json();

  const topic = loadTopic(topicId);

  // Lượt đầu: mở phiên
  let sid = sessionId as string | undefined;
  if (!sid) {
    sid = await db.createSession(testerCode, topicId, MODEL_EVALUATOR, PROMPT_VERSION);
    states.set(sid, {
      coveredIds: [],
      openMisconceptions: [],
      turnIndex: 0,
      history: [],
      personaStyle: (personaStyle as PersonaStyleId) || "ban_minh",
    });
  }
  const st = states.get(sid);
  if (!st) return NextResponse.json({ error: "Phiên không tồn tại" }, { status: 404 });

  st.turnIndex += 1;
  st.history.push({ role: "student", text });

  // ---- STAGE 0: chặn trước, 0 token ----
  const guard = runGuard(text, topic, st.history, st.personaStyle);
  if (guard.blocked) {
    st.history.push({ role: "agent", text: guard.reply });
    await db.appendTurn(sid, {
      turn_index: st.turnIndex,
      student_text: text,
      stage0_verdict: guard.verdict,
      stage1_json: null,
      stage2_reply: guard.reply,
      covered_after: st.coveredIds,
      latency_ms: Date.now() - t0,
    });
    return NextResponse.json({
      sessionId: sid,
      reply: guard.reply,
      coveredIds: st.coveredIds,
      done: false,
    });
  }

  // ---- STAGE 1: chấm ----
  let ev: Stage1Output;
  try {
    ev = await evaluate(
      text,
      topic,
      st.coveredIds,
      st.history.slice(-5).map((h) => `${h.role}: ${h.text}`)
    );
  } catch (e) {
    return NextResponse.json({ error: `Stage 1 lỗi: ${(e as Error).message}` }, { status: 502 });
  }

  // ---- ORCHESTRATOR: gộp state ----
  st.coveredIds = [...new Set([...st.coveredIds, ...ev.covered.map((c) => c.id)])];
  const newMis = ev.misconception.map((m) => m.id);
  st.openMisconceptions = [
    ...new Set([...st.openMisconceptions.filter((id) => newMis.includes(id)), ...newMis]),
  ];

  const coverage = st.coveredIds.length / topic.items.length;
  const done = coverage >= COVERAGE_TO_PASS && st.openMisconceptions.length === 0;
  const capped = st.turnIndex >= TURN_CAP;

  if (done || capped) {
    await db.appendTurn(sid, {
      turn_index: st.turnIndex,
      student_text: text,
      stage0_verdict: null,
      stage1_json: ev,
      stage2_reply: "",
      covered_after: st.coveredIds,
      latency_ms: Date.now() - t0,
    });
    await db.endSession(sid, coverage, done ? "completed" : "turn_cap");
    return NextResponse.json({ sessionId: sid, reply: null, coveredIds: st.coveredIds, done: true });
  }

  // ---- STAGE 2: khoác giọng. Chỉ nhận câu hỏi, không nhận đáp án ----
  let reply: string;
  try {
    reply = await speak({
      history: st.history,
      probe_question: ev.next_probe.question,
      misconception_hint: ev.misconception[0]
        ? topic.misconceptions.find((m) => m.id === ev.misconception[0].id)?.label
        : undefined,
      turn_index: st.turnIndex,
      persona_style: st.personaStyle,
    });
  } catch (e) {
    return NextResponse.json({ error: `Stage 2 lỗi: ${(e as Error).message}` }, { status: 502 });
  }
  st.history.push({ role: "agent", text: reply });

  await db.appendTurn(sid, {
    turn_index: st.turnIndex,
    student_text: text,
    stage0_verdict: null,
    stage1_json: ev,
    stage2_reply: reply,
    covered_after: st.coveredIds,
    latency_ms: Date.now() - t0,
  });

  // KHÔNG trả coverage về client giữa phiên — luật an toàn D3:
  // không tạo cảm giác bị chấm điểm ngầm. Số chỉ hiện ở màn Debrief.
  return NextResponse.json({ sessionId: sid, reply, coveredIds: st.coveredIds, done: false });
}
