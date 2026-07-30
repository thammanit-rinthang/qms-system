
import type { Metadata } from "next";
import { Inter, Sarabun } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s — QMS System",
    default: "QMS System",
  },
  description: "Quality Management System",
};

import QueryProvider from "@/components/common/QueryProvider";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${sarabun.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <QueryProvider>{children}</QueryProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}


