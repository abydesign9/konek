import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import { getSessionUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";

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

// Theme preference lives on users.theme (see Migration 0021), applied
// server-side via a data-theme attribute so there's no light-mode flash
// before client JS runs. "system" falls back to prefers-color-scheme in
// CSS. Applies to backgrounds/text globally — a full per-component dark
// palette for every screen is still rolling out, same honest scope as the
// rest of this Settings expansion.
async function getTheme(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) return "system";
  const { rows } = await query<{ theme: string }>(`SELECT theme FROM users WHERE id = $1`, [userId]);
  return rows[0]?.theme ?? "system";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getTheme();
  return (
    <html lang="en" data-theme={theme}>
      <body className={`${sora.variable} ${inter.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
