// ORCHESTRATOR — code thuần, không gọi AI.
// Gộp state, quyết định khi nào phiên kết thúc, nối 3 tầng lại.
// Xem docs/architecture.md §4 "Luồng một lượt".
//
// ⚠️ KHÔNG giữ state phiên trong biến module (Map/object toàn cục).
// Vercel là serverless: mỗi request có thể rơi vào một instance khác, biến module
// sẽ rỗng ở lượt sau -> checklist không bao giờ tick, agent mất trí nhớ.
// State được DỰNG LẠI TỪ DB mỗi lượt, vì mọi thứ cần thiết đã ghi vào bảng turns.

import { NextRequest, NextResponse } from "next/server";
import { loadTopic } from "@/lib/content";
import { runGuard } from "@/lib/guard";
import { evaluate, PROMPT_VERSION } from "@/lib/evaluator";
import { speak } from "@/lib/persona";
import { db } from "@/lib/db";
import { MODEL_EVALUATOR } from "@/lib/llm";
import type { SessionWithTurns, Stage1Output, TurnRecord } from "@/lib/types";

const TURN_CAP = 8;
const COVERAGE_TO_PASS = 5 / 7;

type State = {
  coveredIds: string[];
  openMisconceptions: string[];
  turnIndex: number;
  history: { role: "student" | "agent"; text: string }[];
};

/** Dựng lại state phiên từ các lượt đã ghi trong DB. */
function rebuildState(prev: SessionWithTurns | null): State {
  const turns = prev?.turns ?? [];

  // coveredIds cộng dồn: đã ghi sẵn ở covered_after của lượt gần nhất.
  const coveredIds = turns.at(-1)?.covered_after ?? [];

  // Misconception còn mở = danh sách ở lượt CHẤM gần nhất. Lượt bị Stage 0 chặn
  // có stage1_json = null nên phải bỏ qua, không thì tưởng đã gỡ hết.
  const lastEval = [...turns].reverse().find((t) => t.stage1_json)?.stage1_json ?? null;
  const openMisconceptions = lastEval?.misconception.map((m) => m.id) ?? [];

  const history = turns.flatMap((t) => [
    { role: "student" as const, text: t.student_text },
    ...(t.stage2_reply ? [{ role: "agent" as const, text: t.stage2_reply }] : []),
  ]);

  return { coveredIds, openMisconceptions, turnIndex: turns.length + 1, history };
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const {
    sessionId,
    text,
    topicId = "llm-hallucination",
    testerCode = "U00",
    giveUp = false,
  } = await req.json();

  const topic = loadTopic(topicId);

  // ---- Mở phiên hoặc nạp lại phiên cũ ----
  let sid: string = sessionId;
  let prev: SessionWithTurns | null = null;

  if (sid) {
    prev = await db.getSession(sid);
    if (!prev) return NextResponse.json({ error: "Phiên không tồn tại" }, { status: 404 });
    if (prev.ended_at) return NextResponse.json({ error: "Phiên đã kết thúc" }, { status: 409 });
  } else {
    sid = await db.createSession(testerCode, topicId, MODEL_EVALUATOR, PROMPT_VERSION);
  }

  const st = rebuildState(prev);

  // ---- Học viên chủ động bỏ cuộc ----
  if (giveUp) {
    await db.endSession(sid, st.coveredIds.length / topic.items.length, "gave_up");
    return NextResponse.json({ sessionId: sid, reply: null, coveredIds: st.coveredIds, done: true });
  }

  st.history.push({ role: "student", text });

  // Ghi một lượt rồi trả về — dùng chung cho mọi nhánh để không nhánh nào làm mất log.
  const logTurn = (extra: Partial<TurnRecord>) =>
    db.appendTurn(sid, {
      turn_index: st.turnIndex,
      student_text: text,
      stage0_verdict: null,
      stage1_json: null,
      stage2_reply: "",
      covered_after: st.coveredIds,
      latency_ms: Date.now() - t0,
      ...extra,
    });

  // ---- STAGE 0: chặn trước, 0 token ----
  const guard = runGuard(text, topic);
  if (guard.blocked) {
    await logTurn({ stage0_verdict: guard.verdict, stage2_reply: guard.reply });
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
    // Vẫn ghi lượt lỗi: đây chính là case "hành vi khi sai" đáng giá nhất cho CP3.
    const msg = (e as Error).message;
    await logTurn({ stage2_reply: `[STAGE1_ERROR] ${msg}` });
    return NextResponse.json({ error: `Stage 1 lỗi: ${msg}` }, { status: 502 });
  }

  // ---- ORCHESTRATOR: gộp state ----
  const coveredIds = [...new Set([...st.coveredIds, ...ev.covered.map((c) => c.id)])];
  const openMisconceptions = ev.misconception.map((m) => m.id);

  const coverage = coveredIds.length / topic.items.length;
  const passed = coverage >= COVERAGE_TO_PASS && openMisconceptions.length === 0;
  const capped = st.turnIndex >= TURN_CAP;

  if (passed || capped) {
    await logTurn({ stage1_json: ev, covered_after: coveredIds });
    await db.endSession(sid, coverage, passed ? "completed" : "turn_cap");
    return NextResponse.json({ sessionId: sid, reply: null, coveredIds, done: true });
  }

  // ---- STAGE 2: khoác giọng. Chỉ nhận CÂU HỎI, không nhận đáp án ----
  let reply: string;
  try {
    reply = await speak({
      history: st.history,
      probe_question: ev.next_probe.question,
      misconception_hint: openMisconceptions.length
        ? topic.misconceptions.find((m) => m.id === openMisconceptions[0])?.label
        : undefined,
      turn_index: st.turnIndex,
    });
  } catch (e) {
    const msg = (e as Error).message;
    await logTurn({ stage1_json: ev, covered_after: coveredIds, stage2_reply: `[STAGE2_ERROR] ${msg}` });
    return NextResponse.json({ error: `Stage 2 lỗi: ${msg}` }, { status: 502 });
  }

  await logTurn({ stage1_json: ev, covered_after: coveredIds, stage2_reply: reply });

  // KHÔNG trả coverage về client giữa phiên — luật an toàn D3: không chấm điểm ngầm.
  // Số chỉ được hiện ở màn Debrief.
  return NextResponse.json({ sessionId: sid, reply, coveredIds, done: false });
}
