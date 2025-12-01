
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { AuthProvider } from "@/components/contexts/AuthContext";
import BottomTabNav from "@/components/BottomTabNav";
import ChatFAB from "@/components/ChatFAB";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RealWorth.ai",
  description: "Turn your clutter into cash. Snap a photo and get an instant AI valuation.",
  icons: {
    icon: "/logo.svg",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "RealWorth.ai",
    description: "Turn your clutter into cash. Snap a photo and get an instant AI valuation.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 1200,
        alt: "RealWorth.ai Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RealWorth.ai",
    description: "Turn your clutter into cash. Snap a photo and get an instant AI valuation.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <GoogleAnalytics />
      </head>
      <body className={`${inter.className} pb-16 md:pb-0`}>
        <AuthProvider>
          {children}
          <ChatFAB />
        </AuthProvider>
        <BottomTabNav />
        <Analytics />
        <SpeedInsights />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
