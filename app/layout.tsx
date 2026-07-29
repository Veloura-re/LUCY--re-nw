import type { Metadata } from "next";
import "@fontsource/space-grotesk";
import "@fontsource/cinzel";
import "@fontsource/permanent-marker";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUCY OS",
  description: "Advanced Learning Unified Cognitive Yield Architecture",
  icons: {
    icon: "/icon.svg",
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
