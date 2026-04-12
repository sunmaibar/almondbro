'use client'

import { useState, useEffect } from 'react'
import { useParams, redirect } from 'next/navigation'

const ADMIN_PASSWORD = '8888'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
 const params = useParams()
 const adminPath = params.adminPath as string

 const [verified, setVerified] = useState(false)
 const [input, setInput] = useState('')
 const [error, setError] = useState(false)
 const [checking, setChecking] = useState(true)

 // 路徑不對直接跳回首頁
 useEffect(() => {
  if (adminPath !== process.env.NEXT_PUBLIC_ADMIN_PATH) {
   window.location.href = '/'
   return
  }
  // 檢查 sessionStorage 是否已通過驗證
  const ok = sessionStorage.getItem('admin_verified')
  if (ok === 'true') setVerified(true)
  setChecking(false)
 }, [adminPath])

 function handleSubmit() {
  if (input === ADMIN_PASSWORD) {
   sessionStorage.setItem('admin_verified', 'true')
   setVerified(true)
   setError(false)
  } else {
   setError(true)
   setInput('')
  }
 }

 if (checking) return null

 if (!verified) {
  return (
   <div className="min-h-screen flex items-center justify-center px-4"
    style={{ background: 'var(--bg)' }}>
    <div className="w-full max-w-xs">

     {/* Logo */}
     <div className="text-center mb-8">
      <div className="text-3xl mb-2">🌰</div>
      <div className="font-medium" style={{ color: 'var(--text)' }}>杏仁弟弟</div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>管理後台</div>
     </div>

     {/* 密碼輸入 */}
     <div className="rounded-2xl p-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-sm font-medium mb-4 text-center" style={{ color: 'var(--text)' }}>
       請輸入密碼
      </div>

      {/* 四格密碼顯示 */}
      <div className="flex gap-3 justify-center mb-4">
       {[0, 1, 2, 3].map(i => (
        <div key={i}
         className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-medium"
         style={{
          background: 'var(--bg)',
          border: `1px solid ${error ? '#fcc' : input.length > i ? 'var(--accent)' : 'var(--border)'}`,
          color: error ? '#c0392b' : 'var(--text)',
         }}>
         {input.length > i ? '●' : ''}
        </div>
       ))}
      </div>

      {error && (
       <div className="text-xs text-center mb-3" style={{ color: '#c0392b' }}>
        密碼錯誤，請再試一次
       </div>
      )}

      {/* 數字鍵盤 */}
      <div className="grid grid-cols-3 gap-2">
       {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
        <button key={n}
         onClick={() => {
          if (input.length >= 4) return
          const next = input + n
          setInput(next)
          setError(false)
          if (next.length === 4) {
           setTimeout(() => {
            if (next === ADMIN_PASSWORD) {
             sessionStorage.setItem('admin_verified', 'true')
             setVerified(true)
            } else {
             setError(true)
             setInput('')
            }
           }, 150)
          }
         }}
         className="h-12 rounded-xl text-lg font-medium transition-all active:scale-95"
         style={{
          background: 'var(--bg)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
         }}>
         {n}
        </button>
       ))}

       {/* 清除 */}
       <button
        onClick={() => { setInput(''); setError(false) }}
        className="h-12 rounded-xl text-sm transition-all active:scale-95"
        style={{
         background: 'var(--bg)',
         color: 'var(--text-muted)',
         border: '1px solid var(--border)',
        }}>
        清除
       </button>

       {/* 0 */}
       <button
        onClick={() => {
         if (input.length >= 4) return
         const next = input + '0'
         setInput(next)
         setError(false)
         if (next.length === 4) {
          setTimeout(() => {
           if (next === ADMIN_PASSWORD) {
            sessionStorage.setItem('admin_verified', 'true')
            setVerified(true)
           } else {
            setError(true)
            setInput('')
           }
          }, 150)
         }
        }}
        className="h-12 rounded-xl text-lg font-medium transition-all active:scale-95"
        style={{
         background: 'var(--bg)',
         color: 'var(--text)',
         border: '1px solid var(--border)',
        }}>
        0
       </button>

       {/* 退格 */}
       <button
        onClick={() => { setInput(prev => prev.slice(0, -1)); setError(false) }}
        className="h-12 rounded-xl text-sm transition-all active:scale-95"
        style={{
         background: 'var(--bg)',
         color: 'var(--text-muted)',
         border: '1px solid var(--border)',
        }}>
        ←
       </button>
      </div>
     </div>
    </div>
   </div>
  )
 }

 return (
  <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
   {children}
  </div>
 )
}