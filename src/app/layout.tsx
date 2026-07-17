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

// Users can save a theme preference (see /settings/preferences), but it
// has no visual effect yet — see globals.css for why applying it broke
// readability across the app when tried. Nothing here reads that
// preference, and it must not apply to this layout regardless: it also
// wraps the public marketing pages (landing, login, signup), which have
// no logged-in user and shouldn't reflect anyone's account settings.
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
