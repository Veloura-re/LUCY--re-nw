import type { Metadata } from "next";
import { Orbitron, Space_Grotesk, Cinzel, Permanent_Marker } from "next/font/google";

import "./globals.css";

const orbitron = Orbitron({ 
  subsets: ["latin"], 
  display: 'swap',
  variable: '--font-orbitron'
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  display: 'swap', 
  variable: '--font-body'
});

const cinzel = Cinzel({ 
  subsets: ["latin"],
  display: 'swap', 
  variable: '--font-cinzel'
});

const permanentMarker = Permanent_Marker({ 
  weight: "400",
  subsets: ["latin"],
  display: 'swap', 
  variable: '--font-permanent-marker'
});


export const metadata: Metadata = {
  title: "LUCY",
  description: "Advanced School Management Platform",
};

import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${orbitron.variable} ${cinzel.variable} ${permanentMarker.variable} font-space-grotesk antialiased`} suppressHydrationWarning>
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
        {children}
        <Toaster position="top-right" theme="dark" closeButton richColors />
      </body>
    </html>
  );
}
