import type { Metadata } from "next";
import "@fontsource/space-grotesk";
import "@fontsource/cinzel";
import "@fontsource/permanent-marker";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lucy-re-nw.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "LUCY OS | Next-Generation School Management & Cognitive Learning Platform",
    template: "%s | LUCY OS",
  },
  description: "LUCY is the unified school operating system powering modern K-12 and university education with real-time academic intelligence, automated grading, secure parent channels, and comprehensive school management.",
  keywords: [
    "School Management Software",
    "Education OS",
    "Student Information System",
    "LUCY OS",
    "School ERP",
    "Teacher Gradebook",
    "Parent Portal",
    "Academic Intelligence",
    "Online Exam Platform",
  ],
  authors: [{ name: "LUCY Educational Technologies" }],
  creator: "LUCY Educational Technologies",
  publisher: "LUCY Educational Technologies",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "LUCY OS",
    title: "LUCY OS — Next-Generation School Management Platform",
    description: "The intelligent operating system built for forward-thinking schools, academies, teachers, students, and parents.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LUCY OS School Management System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LUCY OS — The Operating System for Modern Education",
    description: "Real-time academic management, automated grading, attendance intelligence, and integrated financial systems.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import { GlobalConnectionProbe } from "@/components/global-connection-probe";
import { ErrorListenerInit } from "@/components/error-listener-init";
import { ThemeProvider } from "@/components/providers/theme-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-space-grotesk antialiased bg-slate-50 dark:bg-[#070709] text-slate-900 dark:text-zinc-100 transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <NextTopLoader
            color="#10b981"
            initialPosition={0.08}
            crawlSpeed={200}
            height={3}
            crawl={true}
            showSpinner={false}
            easing="ease"
            speed={200}
            shadow="0 0 10px #10b981,0 0 5px #10b981"
          />
          <ErrorListenerInit />
          <GlobalConnectionProbe />
          {children}
          <Toaster position="top-right" closeButton richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
