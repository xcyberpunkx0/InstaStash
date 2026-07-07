import type { Metadata } from 'next';
import {
  Cormorant_Garamond,
  DM_Sans,
  Bricolage_Grotesque,
  Caveat,
  Kalam,
  JetBrains_Mono,
} from 'next/font/google';
import { BackgroundAnime } from '@/components/ui/BackgroundAnime';
import { DesktopTitleBar } from '@/components/DesktopTitleBar';
import './globals.css';

// ─── Fonts (self-hosted via next/font, preloaded, no FOUT) ───────────────────

const fontDisplay = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display-loaded',
  display: 'swap',
});

const fontSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans-loaded',
  display: 'swap',
});

const fontGrotesk = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-grotesk-loaded',
  display: 'swap',
});

const fontHand = Caveat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-hand-loaded',
  display: 'swap',
});

const fontKalam = Kalam({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-kalam-loaded',
  display: 'swap',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono-loaded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'InstaStash — Save the internet, beautifully.',
  description:
    'Download videos from YouTube, Instagram, TikTok and seventy more — fast, open-source, and blessedly distraction-free.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontGrotesk.variable} ${fontHand.variable} ${fontKalam.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply persisted theme before paint so there's no flash of the default. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('instastash.theme');if(t){document.documentElement.dataset.theme=t;}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <DesktopTitleBar />
        <BackgroundAnime />
        {children}
      </body>
    </html>
  );
}
