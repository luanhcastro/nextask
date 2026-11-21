import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import './globals.css';

const nunito = localFont({
  src: './fonts/nunito-latin.woff2',
  weight: '400 700',
  display: 'swap',
});

export const metadata: Metadata = { title: 'NexTask' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={nunito.className}>{children}</body>
    </html>
  );
}
