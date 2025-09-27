import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import OneSignalInit from "./components/OneSignalInit";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tennis Captain - Team Management App",
  description: "Complete tennis team management solution with training schedules, match results, and player tracking",
  keywords: "tennis, team management, training, matches, sports app",
  viewport: "width=device-width, initial-scale=1, user-scalable=yes",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tennis Captain",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Tennis Captain",
    "apple-touch-fullscreen": "yes",
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes" />
        <meta name="theme-color" content="#9333ea" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎾</text></svg>" />
        <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 180 180%22><rect width=%22180%22 height=%22180%22 fill=%22%239333ea%22/><text x=%2290%22 y=%22120%22 font-size=%2290%22 text-anchor=%22middle%22 fill=%22white%22>🎾</text></svg>" />
        <link rel="apple-touch-icon" sizes="180x180" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 180 180%22><rect width=%22180%22 height=%22180%22 fill=%22%239333ea%22/><text x=%2290%22 y=%22120%22 font-size=%2290%22 text-anchor=%22middle%22 fill=%22white%22>🎾</text></svg>" />
        <meta name="msapplication-TileColor" content="#9333ea" />
        <meta name="msapplication-config" content="none" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <OneSignalInit />
        <AuthProvider>
          <Navigation />
          <main className="min-h-screen">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
