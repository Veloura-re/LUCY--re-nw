import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LUCY OS // 4xctrl Admin Portal',
  description: 'Isolated Administrative Control Center for LUCY OS Platform Governance',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070709] text-zinc-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-400">
        {children}
      </body>
    </html>
  );
}
