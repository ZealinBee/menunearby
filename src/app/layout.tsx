import type { Metadata } from "next";
import { Playfair_Display, Cormorant_Garamond, Libre_Franklin } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const libreFranklin = Libre_Franklin({
  variable: "--font-libre-franklin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MenuNearby",
  description: "Discover exceptional dining experiences near you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${playfairDisplay.variable} ${cormorantGaramond.variable} ${libreFranklin.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
