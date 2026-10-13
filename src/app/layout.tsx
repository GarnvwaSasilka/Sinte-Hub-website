import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { SITE_URL } from '@/lib/env';
import './globals.css';

const heading = Playfair_Display({ subsets: ['latin'], variable: '--font-heading', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL()),
  title: {
    default: "Sinte's Hub | Clothing & Fashion Accessories",
    template: "%s | Sinte's Hub",
  },
  description:
    "Shop gowns, abayas, bubu dresses, jeans, jerseys, shoes, bags and premium Ankara fabrics at Sinte's Hub. Order online and confirm on WhatsApp.",
  openGraph: {
    siteName: "Sinte's Hub",
    type: 'website',
    images: ['/logo.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#101010',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${heading.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
