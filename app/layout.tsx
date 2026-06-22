import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";

import { Sidebar } from "@/components/layout/Sidebar";

import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "ERUTY 자금관리 시스템",
  description: "사내 자금 사용 기안·승인·회계정산을 위한 관리자 대시보드 프로토타입",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} antialiased`}>
        <div className="min-h-screen">
          <div className="mx-auto flex min-h-screen max-w-[1920px]">
            <Sidebar />
            <main className="min-w-0 flex-1">
              <div className="min-h-screen px-5 py-5 sm:px-6 lg:px-8 lg:py-6 xl:px-10">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
