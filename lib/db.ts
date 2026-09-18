// Lưu phiên học — đổi DB chỉ cần viết một class mới cài SessionStore.
// Orchestrator và UI KHÔNG BAO GIỜ được viết SQL trực tiếp, chỉ gọi qua interface này.

import type { ExitReason, SessionRecord, SessionWithTurns, TurnRecord } from "./types";
import { SupabaseStore } from "./supabase-store";

export interface SessionStore {
  createSession(testerCode: string, topicId: string, model: string, promptVersion: string): Promise<string>;
  appendTurn(sessionId: string, turn: TurnRecord): Promise<void>;
  endSession(sessionId: string, coverage: number, reason: ExitReason): Promise<void>;
  getSession(sessionId: string): Promise<SessionWithTurns | null>;
  listSessions(): Promise<SessionRecord[]>;
  exportAll(): Promise<SessionWithTurns[]>;
}

/**
 * Store tạm để cả nhóm build song song mà không phải chờ ai đăng ký dịch vụ nào.
 *
 * ⚠️ MẤT SẠCH KHI RESTART SERVER. Trước khi cho 5 tester chạy thật thì PHẢI
 * cắm store thật vào — mất log là mất R6 (+8đ) và mất bằng chứng bắt buộc của track D.
 */
export class MemoryStore implements SessionStore {
  private sessions = new Map<string, SessionWithTurns>();

  async createSession(testerCode: string, topicId: string, model: string, promptVersion: string) {
    const id = crypto.randomUUID();
    this.sessions.set(id, {
      id,
      tester_code: testerCode,
      topic_id: topicId,
      model,
      prompt_version: promptVersion,
      started_at: new Date().toISOString(),
      ended_at: null,
      final_coverage: null,
      exit_reason: null,
      turns: [],
    });
    return id;
  }

  async appendTurn(sessionId: string, turn: TurnRecord) {
    this.sessions.get(sessionId)?.turns.push(turn);
  }

  async endSession(sessionId: string, coverage: number, reason: ExitReason) {
    const s = this.sessions.get(sessionId);
    if (!s) return;
    s.ended_at = new Date().toISOString();
    s.final_coverage = coverage;
    s.exit_reason = reason;
  }

  async getSession(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  async listSessions() {
    return [...this.sessions.values()].map(({ turns, ...rest }) => rest);
  }

  async exportAll() {
    return [...this.sessions.values()];
  }
}

// Dev server của Next.js hot-reload liên tục -> giữ store trên globalThis
// để không mất phiên đang chạy mỗi lần sửa code.
const g = globalThis as unknown as { __store?: SessionStore };

function pickStore(): SessionStore {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    console.log("[db] SupabaseStore — log phiên được lưu thật");
    return new SupabaseStore();
  }
  console.warn("[db] MemoryStore — LOG SẼ MẤT KHI RESTART. Đặt SUPABASE_URL + SUPABASE_SERVICE_KEY trước khi cho tester chạy.");
  return new MemoryStore();
}

export const db: SessionStore = g.__store ?? (g.__store = pickStore());
