import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

// Configure fonts with proper options
const geist = Geist({
  subsets: ["latin"],
  variable: '--font-geist',
  display: 'swap',
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: '--font-geist-mono',
  display: 'swap',
})
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://casper.network'),
  title: {
    default: "Asset402 — Autonomous RWA Yield Protocol on Casper",
    template: "%s | Asset402",
  },
  description:
    "Autonomous Real-World Asset (RWA) monetization protocol on the Casper Network. Connect industrial equipment, list assets, and stream real-time usage yield.",
  keywords: ["Casper Network", "Real World Assets", "RWA Tokenization", "Next.js", "React", "TypeScript", "AI Telemetry", "Carbon Use Credits", "Smart Contracts"],
  authors: [{ name: "Casper Network Developers", url: "https://github.com/casper-network" }],
  creator: "Casper Network Developers",
  publisher: "Casper Network Developers",
  generator: "v0.app",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Asset402 — Autonomous RWA Yield Protocol on Casper",
    description: "Autonomous Real-World Asset (RWA) monetization protocol on the Casper Network. Connect industrial equipment, list assets, and stream real-time usage yield.",
    siteName: "Asset402",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Asset402 — Autonomous RWA Yield Protocol on Casper",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Asset402 — Autonomous RWA Yield Protocol on Casper",
    description: "Autonomous Real-World Asset (RWA) monetization protocol on the Casper Network. Connect industrial equipment, list assets, and stream real-time usage yield.",
    creator: "@Casper_Network",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/site.webmanifest",
}

import { ClickProvider } from "@/lib/casper-click"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true} storageKey="theme-mode">
          <ClickProvider>
            {children}
          </ClickProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
