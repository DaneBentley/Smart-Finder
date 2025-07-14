import type React from "react"
import type { Metadata } from "next"
import { Saira } from "next/font/google"
import "./globals.css"

const saira = Saira({
  subsets: ["latin"],
  variable: "--font-saira",
})

export const metadata: Metadata = {
  title: "Smart Finder - Find what matters—fast",
  description: "Free Chrome extension that makes finding information on web pages faster and smarter. Use traditional search, pattern detection for emails/phones/dates, or AI-powered natural language queries.",
  generator: 'v0.dev',
  keywords: ["chrome extension", "search", "find", "AI search", "pattern search", "web search", "smart finder"],
  authors: [{ name: "Smart Finder Team" }],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Smart Finder - Find what matters—fast",
    description: "Free Chrome extension that makes finding information on web pages faster and smarter.",
    url: "https://smart-finder.com",
    siteName: "Smart Finder",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${saira.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
