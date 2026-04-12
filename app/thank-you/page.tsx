'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ThankYouContent() {
 const router = useRouter()
 const params = useSearchParams()

 const date = params.get('date') ?? ''
 const district = params.get('district') ?? ''
 const point = params.get('point') ?? ''
 const location = params.get('location') ?? ''
 const startTime = params.get('start_time') ?? ''
 const endTime = params.get('end_time') ?? ''

 return (
  <div className="min-h-screen flex items-center justify-center px-4"
   style={{ background: 'var(--bg)' }}>
   <div className="w-full max-w-sm">

    {/* 成功圖示 */}
    <div className="flex justify-center mb-6">
     <div className="w-16 h-16 rounded-full flex items-center justify-center"
      style={{ background: 'var(--accent-light)' }}>
      <svg width="28" height="28" fill="none" stroke="var(--accent)"
       strokeWidth="2.5" viewBox="0 0 24 24">
       <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
     </div>
    </div>

    {/* 標題 */}
    <h1 className="text-2xl font-medium text-center mb-2" style={{ color: 'var(--text)' }}>
     感謝您的訂購！
    </h1>
    <p className="text-sm text-center mb-8" style={{ color: 'var(--text-muted)' }}>
     我們將在以下時間地點與您面交取貨
    </p>

    {/* 取貨資訊卡 */}
    <div className="rounded-2xl overflow-hidden mb-4"
     style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>

     {/* 頂部色條 */}
     <div style={{ height: '4px', background: 'var(--accent)' }} />

     <div className="px-5 py-5 space-y-4">

      {/* 日期時間 */}
      <div className="flex gap-3 items-start">
       <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'var(--accent-light)' }}>
        <svg width="15" height="15" fill="none" stroke="var(--accent)"
         strokeWidth="2" viewBox="0 0 24 24">
         <rect x="3" y="4" width="18" height="18" rx="2" />
         <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
       </div>
       <div>
        <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>取貨日期與時間</div>
        <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
         {date}
        </div>
        <div className="text-sm" style={{ color: 'var(--text)' }}>
         {startTime} – {endTime}
        </div>
       </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border)' }} />

      {/* 地點 */}
      <div className="flex gap-3 items-start">
       <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'var(--accent-light)' }}>
        <svg width="15" height="15" fill="none" stroke="var(--accent)"
         strokeWidth="2" viewBox="0 0 24 24">
         <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
         <circle cx="12" cy="9" r="2.5" />
        </svg>
       </div>
       <div>
        <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
         {district} · {point} 點
        </div>
        <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
         {location}
        </div>
       </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border)' }} />

      {/* 聯絡資訊 */}
      <div className="flex gap-3 items-start">
       <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'var(--accent-light)' }}>
        <svg width="15" height="15" fill="none" stroke="var(--accent)"
         strokeWidth="2" viewBox="0 0 24 24">
         <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.15a16 16 0 006.94 6.94l1.51-1.51a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
       </div>
       <div>
        <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>有任何問題請聯絡</div>
        <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
         徐鋒
        </div>
        <a href="tel:0937883893"
         className="text-sm"
         style={{ color: 'var(--accent)', textDecoration: 'none' }}>
         0937-883-893
        </a>
       </div>
      </div>
     </div>
    </div>

    {/* 提示文字 */}
    <p className="text-xs text-center mb-6" style={{ color: 'var(--text-muted)' }}>
     請準時前往取貨，逾時恕不保留
    </p>

    {/* 回首頁按鈕 */}
    <button
     onClick={() => router.push('/')}
     className="w-full py-3 rounded-xl text-sm font-medium"
     style={{ background: 'var(--accent)', color: '#fff' }}>
     回首頁
    </button>
   </div>
  </div>
 )
}

export default function ThankYouPage() {
 return (
  <Suspense fallback={
   <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>載入中...</div>
   </div>
  }>
   <ThankYouContent />
  </Suspense>
 )
}