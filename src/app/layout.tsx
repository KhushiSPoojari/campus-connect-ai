import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CampusClockSelector } from '@/components/layout/CampusClockSelector';
import { CampusTimeProvider } from '@/lib/context/campus-time-context';
import { AuthProvider } from '@/lib/context/auth-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Campus Connect AI | Smart Campus Solutions',
  description:
    'A unified portal for instant campus search, faculty office finder, real-time classroom occupancy tracker, campus wayfinding, and notices.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-x-hidden">
        <AuthProvider>
          <CampusTimeProvider>
            <CampusClockSelector />
            <Navbar />
            <main id="main-content" className="flex-1 flex flex-col">
              {children}
            </main>
            <Footer />
          </CampusTimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
