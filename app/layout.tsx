import type { Metadata } from "next";
import { Be_Vietnam_Pro, Lexend } from "next/font/google";
import "./globals.css";

// Thân bài: Be Vietnam Pro — thiết kế riêng cho tiếng Việt, dấu chồng (ướ, ễ, ậ)
// không bị chạm vào thân chữ ở cỡ nhỏ. Đây là chỗ hầu hết font đẹp bị hỏng.
const sans = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Tiêu đề: Lexend — vốn được thiết kế để tăng tốc độ đọc hiểu, hợp với sản phẩm
// học tập; dáng hình học khớp với logo "VLearn." đang dùng weight 900.
const display = Lexend({
  subsets: ["latin", "vietnamese"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
import { LangProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import TopNav from "@/components/top-nav";

export const metadata: Metadata = {
  title: "Bạn học AI — dạy lại để hiểu sâu",
  description: "Học viên dạy lại khái niệm cho một agent đóng vai học trò (Track D3)",
};

// Chạy TRƯỚC khi paint để không nháy trắng rồi mới sang tối.
const NO_FLASH = `
try {
  var t = localStorage.getItem('theme');
  if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  var l = localStorage.getItem('lang');
  if (l) document.documentElement.lang = l;
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      data-theme="light"
      className={`${sans.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <LangProvider>
            <TopNav />
            {children}
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
