// Phục vụ file slide (PDF) trong data/vlearn-pack/slides.
// data/ bị .gitignore nên KHÔNG copy vào public/ — đọc thẳng từ đĩa ở server,
// chỉ cho phép tên file .pdf phẳng để chặn path traversal.

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const SLIDES_DIR = path.join(process.cwd(), "data", "vlearn-pack", "slides");

export async function GET(_req: Request, { params }: { params: Promise<{ deck: string }> }) {
  const { deck } = await params;

  if (!/^[A-Za-z0-9._-]+\.pdf$/.test(deck)) {
    return NextResponse.json({ error: "Không tìm thấy slide" }, { status: 404 });
  }

  const file = path.join(SLIDES_DIR, deck);
  if (!file.startsWith(SLIDES_DIR + path.sep) || !fs.existsSync(file)) {
    return NextResponse.json({ error: "Không tìm thấy slide" }, { status: 404 });
  }

  const bytes = new Uint8Array(fs.readFileSync(file));
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${deck}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
