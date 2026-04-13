import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const pretendard = localFont({
  src: [
    { path: '../../public/fonts/Pretendard-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Pretendard-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Pretendard-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/Pretendard-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/Pretendard-ExtraBold.woff2', weight: '800', style: 'normal' },
    { path: '../../public/fonts/Pretendard-Black.woff2', weight: '900', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-pretendard',
})

export const metadata: Metadata = {
  title: '사자성어 학습',
  description: '사자성어 플래시카드 & 글자 배열 퀴즈 학습 앱',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={pretendard.className}>
        {children}
      </body>
    </html>
  )
}
