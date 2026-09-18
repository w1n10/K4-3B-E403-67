// SessionStore chạy trên Supabase Postgres, gọi qua PostgREST bằng fetch
// (không cần cài @supabase/supabase-js).
//
// ⚠️ Dùng service_role key -> bỏ qua RLS -> CHỈ ĐƯỢC import từ code chạy trên server
// (route handler, server component). Import vào file có "use client" là lộ khoá
// toàn quyền DB, mà repo nhóm đang public.

import type { SessionStore } from "./db";
import type { ExitReason, SessionRecord, SessionWithTurns, TurnRecord } from "./types";

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: KEY!,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rest<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status} ${path}: ${body}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// Hàng trong bảng turns -> TurnRecord của app
type TurnRow = {
  turn_index: number;
  student_text: string;
  stage0_verdict: TurnRecord["stage0_verdict"];
  stage1_json: TurnRecord["stage1_json"];
  stage2_reply: string;
  covered_after: string[] | null;
  latency_ms: number | null;
};

function toTurn(r: TurnRow): TurnRecord {
  return {
    turn_index: r.turn_index,
    student_text: r.student_text,
    stage0_verdict: r.stage0_verdict,
    stage1_json: r.stage1_json,
    stage2_reply: r.stage2_reply,
    covered_after: r.covered_after ?? [],
    latency_ms: r.latency_ms ?? 0,
  };
}

export class SupabaseStore implements SessionStore {
  async createSession(testerCode: string, topicId: string, model: string, promptVersion: string) {
    const rows = await rest<{ id: string }[]>("sessions", {
      method: "POST",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify({
        tester_code: testerCode,
        topic_id: topicId,
        model,
        prompt_version: promptVersion,
      }),
    });
    return rows[0].id;
  }

  async appendTurn(sessionId: string, turn: TurnRecord) {
    await rest("turns", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        session_id: sessionId,
        turn_index: turn.turn_index,
        student_text: turn.student_text,
        stage0_verdict: turn.stage0_verdict,
        stage1_json: turn.stage1_json,
        stage2_reply: turn.stage2_reply,
        covered_after: turn.covered_after,
        latency_ms: turn.latency_ms,
      }),
    });
  }

  async endSession(sessionId: string, coverage: number, reason: ExitReason) {
    await rest(`sessions?id=eq.${sessionId}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        ended_at: new Date().toISOString(),
        final_coverage: coverage,
        exit_reason: reason,
      }),
    });
  }

  async getSession(sessionId: string): Promise<SessionWithTurns | null> {
    const sessions = await rest<SessionRecord[]>(
      `sessions?id=eq.${sessionId}&select=*`,
      { headers: headers() }
    );
    if (!sessions.length) return null;

    const turns = await rest<TurnRow[]>(
      `turns?session_id=eq.${sessionId}&select=*&order=turn_index.asc`,
      { headers: headers() }
    );
    return { ...sessions[0], turns: turns.map(toTurn) };
  }

  async listSessions(): Promise<SessionRecord[]> {
    return rest<SessionRecord[]>("sessions?select=*&order=started_at.desc", {
      headers: headers(),
    });
  }

  async exportAll(): Promise<SessionWithTurns[]> {
    // Một lượt gọi lấy cả phiên lẫn turns lồng bên trong (PostgREST embed)
    const rows = await rest<(SessionRecord & { turns: TurnRow[] })[]>(
      "sessions?select=*,turns(*)&order=started_at.asc",
      { headers: headers() }
    );
    return rows.map((r) => ({
      ...r,
      turns: (r.turns ?? []).sort((a, b) => a.turn_index - b.turn_index).map(toTurn),
    }));
  }
}
