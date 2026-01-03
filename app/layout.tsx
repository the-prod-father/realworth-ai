
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { AuthProvider } from "@/components/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import BottomTabNav from "@/components/BottomTabNav";
import ChatFAB from "@/components/ChatFAB";
import FeedbackWidget from "@/components/FeedbackWidget";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://realworth.ai'),
  title: "RealWorth.ai",
  description: "Turn your clutter into cash. Snap a photo and get an instant AI valuation.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RealWorth",
  },
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#14B8A6",
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
      <body className={`${inter.className} pb-nav md:pb-0`}>
        <AuthProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <ChatFAB />
          <FeedbackWidget position="bottom-left" />
        </AuthProvider>
        <BottomTabNav />
        <Toaster position="top-center" richColors closeButton />
        {/* Portal container for modals */}
        <div id="modal-root" />
        <Analytics />
        <SpeedInsights />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('ServiceWorker registered:', registration.scope);
                  },
                  function(err) {
                    console.log('ServiceWorker registration failed:', err);
                  }
                );
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
