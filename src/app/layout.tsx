import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'GroqLab — The Interactive LLM Exploratorium',
  description:
    'An interactive, playful, and deeply educational AI science lab where complete beginners can explore how Large Language Models actually work under the hood using Groq LPUs.',
  keywords: ['Groq', 'LPU', 'LLM', 'AI', 'Tokenization', 'Logprobs', 'Education', 'Interactive Lab'],
  authors: [{ name: 'GroqLab Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080c14',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#080c14] text-slate-100 selection:bg-orange-500/30 selection:text-orange-200">
        {children}
      </body>
    </html>
  );
}
