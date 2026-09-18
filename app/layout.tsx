import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent học trò — dạy lại để hiểu sâu",
  description: "Học viên dạy lại khái niệm cho một agent đóng vai học trò (Track D3)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
