import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import { InstallPrompt } from "@/components/InstallPrompt";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Konek",
  description: "A digital connectivity platform for Africans at home and abroad. Airtime, data, eSIM, bills and global payments in one place.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    // iOS Safari ignores manifest icons and only reads this for the home
    // screen icon, so it needs its own tag rather than relying on manifest.json.
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    // Lets "Add to Home Screen" launch standalone (no Safari chrome) on iOS,
    // mirroring display: "standalone" in manifest.json, which iOS Safari
    // doesn't reliably honor on its own.
    capable: true,
    statusBarStyle: "default",
    title: "Konek",
  },
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
        <InstallPrompt />
      </body>
    </html>
  );
}
