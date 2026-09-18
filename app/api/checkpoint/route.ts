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
import {
  END_AT,
  getReviewHint,
  getWrapUp,
  isNoProgress,
  HINT_AT,
  lastProbedTarget,
  noProgressStreak,
  pickReviewTarget,
} from "@/lib/stuck";
import { db } from "@/lib/db";
import { MODEL_EVALUATOR } from "@/lib/llm";
import type {
  ChecklistItem,
  PersonaStyleId,
  SessionWithTurns,
  Stage1Output,
  TurnRecord,
} from "@/lib/types";

const TURN_CAP = 8;

// personaStyle KHÔNG nằm trong State: nó do client giữ và gửi kèm mỗi request,
// nên không cần dựng lại từ DB (và cũng không có cột nào trong bảng sessions).
type State = {
  coveredIds: string[];
  openMisconceptions: string[];
  turnIndex: number;
  history: { role: "student" | "agent"; text: string }[];
};

/** Dựng lại state phiên từ các lượt đã ghi trong DB. */
function rebuildState(prev: SessionWithTurns | null, initialQuestion?: string): State {
  const allTurns = prev?.turns ?? [];

  // Lượt lỗi hạ tầng (503/429/model timeout) không tính vào số lượt thoại hợp lệ của học viên
  const validTurns = allTurns.filter((t) => !t.stage2_reply?.startsWith("[STAGE"));

  // coveredIds cộng dồn: đã ghi sẵn ở covered_after của lượt gần nhất.
  const coveredIds = validTurns.at(-1)?.covered_after ?? [];

  // Misconception còn mở = danh sách ở lượt CHẤM gần nhất. Lượt bị Stage 0 chặn
  // có stage1_json = null nên phải bỏ qua, không thì tưởng đã gỡ hết.
  const lastEval = [...validTurns].reverse().find((t) => t.stage1_json)?.stage1_json ?? null;
  const openMisconceptions = lastEval?.misconception.map((m) => m.id) ?? [];

  const history = [
    ...(initialQuestion && validTurns.length === 0 ? [{ role: "agent" as const, text: initialQuestion }] : []),
    ...validTurns.flatMap((t) => [
      { role: "student" as const, text: t.student_text },
      ...(t.stage2_reply ? [{ role: "agent" as const, text: t.stage2_reply }] : []),
    ]),
  ];

  return { coveredIds, openMisconceptions, turnIndex: validTurns.length + 1, history };
}

/** Trang slide để client mở, nếu Ý có gắn slide. Không có thì client tự ẩn. */
function slideRef(item: ChecklistItem | undefined) {
  return item?.slide_page ? { page: item.slide_page, title: item.slide_title } : undefined;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const {
    sessionId,
    text,
    topicId,
    testerCode = "U00",
    personaStyle = "ban_minh",
    giveUp = false,
    initialQuestion,
    initialTarget,
  } = await req.json();

  // Không đặt mặc định một chủ đề cụ thể: có nhiều chủ đề, đoán bừa thì phiên
  // sẽ được chấm theo checklist của bài khác mà không ai nhận ra.
  if (!topicId) {
    return NextResponse.json({ error: "Thiếu topicId" }, { status: 400 });
  }

  const style = personaStyle as PersonaStyleId;

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

  const st = rebuildState(prev, initialQuestion);

  // Chuỗi "không tiến bộ" tính từ các lượt đã ghi trong DB — sống sót qua serverless.
  const prevTurns = prev?.turns ?? [];
  const priorStreak = noProgressStreak(prevTurns, initialTarget);
  const prevProbTarget = lastProbedTarget(prevTurns) || initialTarget;

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
  const guard = runGuard(text, topic, st.history, style);
  if (guard.blocked) {
    // Lượt không có nội dung để chấm ("không biết", "ok", "ko") tính là không tiến bộ;
    // verdict khác (dán nguyên văn, hỏi ngược) trung tính vì học viên vẫn đang tương tác.
    const noProgress = isNoProgress(guard.verdict);
    const streak = noProgress ? priorStreak + 1 : priorStreak;

    if (noProgress && streak >= END_AT) {
      // Đã nhắc xem slide mà vẫn bỏ cuộc tiếp -> dừng phiên, cho xem tổng kết.
      const targetItem = pickReviewTarget(topic, st.coveredIds, prevProbTarget);
      const reply = getWrapUp(style);
      await logTurn({ stage0_verdict: guard.verdict, stage2_reply: reply });
      await db.endSession(sid, st.coveredIds.length / topic.items.length, "stuck");
      return NextResponse.json({
        sessionId: sid,
        reply,
        coveredIds: st.coveredIds,
        done: true,
        slide: slideRef(targetItem),
      });
    }

    if (noProgress && streak === HINT_AT) {
      // Lần thứ 3 bỏ cuộc -> mời mở đúng slide rồi quay lại, chưa dừng phiên.
      const targetItem = pickReviewTarget(topic, st.coveredIds, prevProbTarget);
      const reply = getReviewHint(topic, targetItem, style);
      await logTurn({ stage0_verdict: guard.verdict, stage2_reply: reply });
      return NextResponse.json({
        sessionId: sid,
        reply,
        coveredIds: st.coveredIds,
        done: false,
        slide: slideRef(targetItem),
      });
    }

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
      st.history.slice(-5).map((h) => `${h.role}: ${h.text}`),
      prevProbTarget
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

  // LUẬT SƯ PHẠM: Học viên trả lời không đúng câu hỏi (prevProbTarget),
  // dù có vô tình trúng 1 Ý khác trong checklist thì cũng KHÔNG được nhảy sang câu khác!
  // Giữ nguyên next_probe.target là prevProbTarget và kéo học viên về câu hỏi đang dang dở.
  if (prevProbTarget && !coveredIds.includes(prevProbTarget)) {
    const targetDidDrift = ev.next_probe?.target !== prevProbTarget;
    ev.next_probe.target = prevProbTarget;
    const lastAgentMsg = [...st.history].reverse().find((h) => h.role === "agent")?.text;
    const otherCovered = ev.covered.filter((c) => c.id !== prevProbTarget);

    if (otherCovered.length > 0) {
      if (lastAgentMsg) {
        ev.next_probe.question = `Ý vừa rồi bạn giải thích thì mình hiểu rồi nè. Nhưng câu lúc nãy mình đang hỏi là: "${lastAgentMsg}". Bạn giải thích giúp mình câu này trước được không?`;
      }
    } else if (targetDidDrift || !ev.next_probe.question) {
      if (lastAgentMsg) {
        ev.next_probe.question = `Câu trả lời vừa rồi có vẻ chưa đúng trọng tâm câu hỏi của mình. Bạn giải thích lại giúp mình câu hỏi lúc nãy nhé: "${lastAgentMsg}"`;
      }
    }
  }

  const coverage = coveredIds.length / topic.items.length;
  // Phải phủ ĐỦ mọi Ý mới coi là xong. Trước đây chỉ cần 5/7 nên phiên tự kết thúc
  // khi còn 2 Ý chưa hề nhắc tới — học viên mất luôn cơ hội giảng nốt phần đó.
  const passed = coveredIds.length >= topic.items.length && openMisconceptions.length === 0;
  const capped = st.turnIndex >= TURN_CAP;

  if (passed || capped) {
    await logTurn({ stage1_json: ev, covered_after: coveredIds });
    await db.endSession(sid, coverage, passed ? "completed" : "turn_cap");
    return NextResponse.json({ sessionId: sid, reply: null, coveredIds, done: true });
  }

  // ---- KẸT ----
  // Lượt này "không tiến bộ" nếu không nói được Ý mà câu hỏi vừa rồi nhắm vào.
  const progressed = prevProbTarget ? ev.covered.some((c) => c.id === prevProbTarget) : true;
  const streak = progressed ? 0 : priorStreak + 1;

  if (streak >= END_AT) {
    // Đã nhắc xem slide mà vẫn sai thêm 2 lần -> dừng phiên, cho xem tổng kết.
    const targetItem = pickReviewTarget(topic, coveredIds, prevProbTarget, ev.next_probe?.target);
    const reply = getWrapUp(style);
    await logTurn({ stage1_json: ev, covered_after: coveredIds, stage2_reply: reply });
    await db.endSession(sid, coverage, "stuck");
    return NextResponse.json({
      sessionId: sid,
      reply,
      coveredIds,
      done: true,
      slide: slideRef(targetItem),
    });
  }

  if (streak === HINT_AT) {
    // Lần thứ 3 không tiến bộ -> nhắc xem slide, chưa dừng phiên.
    const targetItem = pickReviewTarget(topic, coveredIds, prevProbTarget, ev.next_probe?.target);
    const reply = getReviewHint(topic, targetItem, style);
    await logTurn({ stage1_json: ev, covered_after: coveredIds, stage2_reply: reply });
    return NextResponse.json({
      sessionId: sid,
      reply,
      coveredIds,
      done: false,
      slide: slideRef(targetItem),
    });
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
      persona_style: style,
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
