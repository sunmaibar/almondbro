import type { Metadata } from 'next'
import './globals.css'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://almondbro.com'

export const metadata: Metadata = {
  title: '杏仁弟弟 — 手工杏仁甜品',
  description: '手工製作杏仁豆腐、杏仁茶、蜂蜜銀耳飲，限時現場取貨，新鮮好喝。',
  metadataBase: new URL(BASE_URL),

  // Favicon
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },

  // Open Graph（FB / Line 分享縮圖）
  openGraph: {
    title: '杏仁弟弟 — 手工杏仁甜品',
    description: '手工製作杏仁豆腐、杏仁茶、蜂蜜銀耳飲，限時現場取貨，新鮮好喝。',
    url: BASE_URL,
    siteName: '杏仁弟弟',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '杏仁弟弟 — 手工杏仁甜品',
      },
    ],
    locale: 'zh_TW',
    type: 'website',
  },

  // Twitter / X card
  twitter: {
    card: 'summary_large_image',
    title: '杏仁弟弟 — 手工杏仁甜品',
    description: '手工製作杏仁豆腐、杏仁茶、蜂蜜銀耳飲，限時現場取貨，新鮮好喝。',
    images: ['/images/og-image.jpg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}