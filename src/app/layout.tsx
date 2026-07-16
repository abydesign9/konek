import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Konek",
  description: "A digital connectivity platform for Africans at home and abroad. Airtime, data, eSIM, bills and global payments in one place.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#22315C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${inter.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
