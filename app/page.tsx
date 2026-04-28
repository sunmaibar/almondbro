'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { MenuItemDB } from './[adminPath]/page'

interface ScheduleWithPoints {
  id: string
  date: string
  district: string
  pickup_points: {
    id: string
    label: string
    location: string
    start_time: string
    end_time: string
  }[]
}

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

export default function HomePage() {
  const router = useRouter()
  const pageLoadTime = useRef(Date.now())

  const [schedules, setSchedules] = useState<ScheduleWithPoints[]>([])
  const [menuItems, setMenuItems] = useState<MenuItemDB[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])

  const [name, setName] = useState('')
  const [gender, setGender] = useState<'先生' | '小姐' | ''>('')
  const [phone, setPhone] = useState('')

  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showNotice, setShowNotice] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const [{ data: sched }, { data: menu }] = await Promise.all([
        supabase
          .from('schedules')
          .select('*, pickup_points(*)')
          .gte('date', new Date().toISOString().split('T')[0])
          .order('date', { ascending: true }),
        supabase.from('menu_items').select('*').order('id'),
      ])
      setSchedules(sched ?? [])
      setMenuItems(menu ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const selectedSchedule = schedules.find(s => s.date === selectedDate)
  const selectedPointData = selectedSchedule?.pickup_points.find(p => p.label === selectedPoint)

  function setQuantity(item: MenuItemDB, qty: number) {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.id !== item.id))
    } else {
      setCart(prev => {
        const exists = prev.find(c => c.id === item.id)
        if (exists) return prev.map(c => c.id === item.id ? { ...c, quantity: qty } : c)
        return [...prev, { id: item.id, name: item.name, price: item.price, quantity: qty }]
      })
    }
  }

  function getQty(itemId: number) {
    return cart.find(c => c.id === itemId)?.quantity ?? 0
  }

  const totalAmount = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0)

  function validate() {
    const errs: Record<string, string> = {}
    if (!selectedDate) errs.date = '請選擇取貨日期'
    if (!selectedPoint) errs.point = '請選擇取貨地點'
    if (cart.length === 0) errs.cart = '請至少選擇一項商品'
    if (!name.trim()) errs.name = '請填寫姓名'
    if (!gender) errs.gender = '請選擇稱謂'
    if (!/^09\d{8}$/.test(phone)) errs.phone = '請填寫有效的手機號碼（09 開頭 10 碼）'
    return errs
  }

  function handleSubmitClick() {
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length === 0) setShowConfirm(true)
  }

  async function handleConfirmOrder() {
    setSubmitting(true)
    setSubmitError('')

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: name.trim(),
        customer_gender: gender,
        customer_phone: phone,
        district: selectedSchedule?.district,
        pickup_point_label: selectedPoint,
        items: cart,
        total_amount: totalAmount,
        _ts: pageLoadTime.current,
        _trap: '',
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      const msgMap: Record<string, string> = {
        rate_limited: '您已送出過多訂單，請稍後再試',
        too_fast: '操作過快，請稍後再試',
        invalid_phone: '手機號碼格式不正確',
        missing_fields: '請確認所有欄位已填寫',
      }
      setSubmitError(msgMap[data.error] ?? '送出失敗，請稍後再試')
      setSubmitting(false)
      return
    }

    const params = new URLSearchParams({
      date: formatDateLabel(selectedDate!),
      district: selectedSchedule?.district ?? '',
      point: selectedPoint ?? '',
      location: selectedPointData?.location ?? '',
      start_time: selectedPointData?.start_time ?? '',
      end_time: selectedPointData?.end_time ?? '',
    })
    router.push(`/thank-you?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>載入中...</div>
      </div>
    )
  }


  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ height: 'min(480px, 55vw)', minHeight: '260px' }}>
        {/* 漸層底色（圖片載入前或失敗時顯示） */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #8B5E3C 0%, #C4956A 50%, #E8C9A0 100%)' }} />

        {/* Hero 圖片：用 fill 模式覆蓋整個 section */}
        <Image
          src="/images/hero.JPEG"
          alt="杏仁弟弟"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ zIndex: 1 }}
        />

        {/* 漸層遮罩 */}
        <div className="absolute inset-0" style={{
          zIndex: 2,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)'
        }} />

        {/* 文字內容 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4"
          style={{ zIndex: 3 }}>
          <Image
            src="/images/杏仁弟弟.png"
            alt="杏仁弟弟"
            width={200}
            height={200}
          />
          {/* <h1 className="text-3xl md:text-5xl font-medium text-white mb-3"
            style={{ textShadow: '0 2px 16px rgba(0,0,0,0.4)', letterSpacing: '-0.02em' }}>
            杏仁弟弟
          </h1> */}
          <p className="text-white/80 text-sm md:text-base">
            手工杏仁甜品，滿2000元外送到府
          </p>
        </div>
      </section>

      {/* ── 訂購須知 ── */}
      <section className="max-w-lg mx-auto px-4 pt-6 pb-2">
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

          {/* 標題列（可點擊） */}
          <button
            onClick={() => setShowNotice(v => !v)}
            className="w-full px-5 py-4 flex items-center gap-3 transition-all"
            style={{ background: 'var(--accent)' }}>
            <div className="text-2xl">📋</div>
            <div className="flex-1 text-left">
              <div className="font-medium text-white" style={{ fontSize: '1.05rem' }}>訂購須知</div>
              <div className="text-white/70" style={{ fontSize: '0.75rem' }}>
                {showNotice ? '點擊收合' : '點擊展開查看'}
              </div>
            </div>
            <div className="text-white/80 transition-transform duration-300"
              style={{ transform: showNotice ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '1.2rem' }}>
              ▾
            </div>
          </button>

          {/* 須知內容（可收合） */}
          <div style={{
            maxHeight: showNotice ? '600px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.35s ease',
          }}>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {[
                {
                  icon: '📅',
                  text: '我們皆已安排下一週的日期與行程，於約定的時間地點取貨與現場付款。',
                },
                {
                  icon: '🌰',
                  text: '杏仁弟弟產品為確保新鮮品質，皆為接單後開始製作。',
                },
                {
                  icon: '🛵',
                  text: '大台北地區滿 2,000 元即可外送，部分地區會因路途稍做調整。',
                },
                {
                  icon: '🎁',
                  text: '全品項滿 300 元，再送一顆杏仁豆腐。',
                },
                {
                  icon: '📞',
                  text: '有問題可以來電',
                  highlight: '0937-883-893 ／ 徐鋒',
                  href: 'tel:0937883893',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4 px-5 py-4 items-start">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: 'var(--accent-light)' }}>
                    {item.icon}
                  </div>
                  <div className="flex-1 pt-1" style={{ color: 'var(--text)', lineHeight: '1.6' }}>
                    {item.text}
                    {item.highlight && item.href && (
                      <>
                        {' '}
                        <a href={item.href}
                          className="font-medium"
                          style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                          {item.highlight}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── 主內容 ── */}
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* STEP 1：選擇日期 */}
        <StepCard step={1} title="選擇取貨日期" error={fieldErrors.date}>
          {schedules.length === 0 ? (
            <div className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
              目前尚無排定行程，請稍後再來
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {schedules.map(s => (
                <button key={s.date}
                  onClick={() => {
                    setSelectedDate(s.date)
                    setSelectedPoint(null)
                    setFieldErrors(prev => ({ ...prev, date: '', point: '' }))
                  }}
                  className="w-full py-3 rounded-xl transition-all"
                  style={{
                    background: selectedDate === s.date ? 'var(--accent)' : 'var(--surface)',
                    color: selectedDate === s.date ? '#fff' : 'var(--text)',
                    border: `1px solid ${selectedDate === s.date ? 'var(--accent)' : 'var(--border)'}`,
                    fontWeight: selectedDate === s.date ? 500 : 400,
                  }}>
                  <div>{formatDateLabel(s.date)}</div>
                  <div className="mt-0.5 opacity-75" style={{ fontSize: '0.75em' }}>{s.district}</div>
                </button>
              ))}
            </div>
          )}
        </StepCard>

        {/* STEP 2：選擇取貨地點 */}
        {selectedSchedule && (
          <StepCard step={2} title="選擇取貨地點" error={fieldErrors.point}>
            <div className="space-y-2">
              {selectedSchedule.pickup_points
                .sort((a, b) => a.label.localeCompare(b.label))
                .map(p => (
                  <button key={p.label}
                    onClick={() => {
                      setSelectedPoint(p.label)
                      setFieldErrors(prev => ({ ...prev, point: '' }))
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                    style={{
                      background: selectedPoint === p.label ? 'var(--accent-light)' : 'var(--surface)',
                      border: `1px solid ${selectedPoint === p.label ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-medium text-sm flex-shrink-0"
                      style={{
                        background: selectedPoint === p.label ? 'var(--accent)' : 'var(--bg)',
                        color: selectedPoint === p.label ? '#fff' : 'var(--text)',
                      }}>
                      {p.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--text)', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                        {p.location}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {p.start_time} – {p.end_time}
                      </div>
                    </div>
                    {selectedPoint === p.label && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--accent)' }}>
                        <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
            </div>
          </StepCard>
        )}

        {/* STEP 3：選擇商品 */}
        {selectedPoint && (
          <StepCard step={3} title="選擇商品" error={fieldErrors.cart}>
            <div className="grid grid-cols-2 gap-3">
              {menuItems.map(item => {
                const qty = getQty(item.id)
                return (
                  <div key={item.id} className="rounded-xl overflow-hidden"
                    style={{
                      border: `1px solid ${qty > 0 ? 'var(--accent)' : 'var(--border)'}`,
                      background: 'var(--surface)',
                      transition: 'border-color 0.15s',
                    }}>
                    {/* 商品圖片：4:3 比例 */}
                    <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          sizes="(max-width: 640px) 100vw, 512px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-4xl"
                          style={{ background: 'var(--accent-light)' }}>
                          {item.emoji}
                        </div>
                      )}
                    </div>

                    {/* 商品資訊 + 數量控制 */}
                    <div className="px-3 py-3">
                      <div className="mb-2">
                        <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {item.description}
                          </div>
                        )}
                        <div className="text-sm font-medium mt-1" style={{ color: 'var(--accent)' }}>
                          ${item.price}
                        </div>
                      </div>

                      {/* 數量控制 */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setQuantity(item, qty - 1)}
                          disabled={qty === 0}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all"
                          style={{
                            background: qty > 0 ? 'var(--accent)' : 'var(--bg)',
                            color: qty > 0 ? '#fff' : 'var(--text-muted)',
                            border: `1px solid ${qty > 0 ? 'var(--accent)' : 'var(--border)'}`,
                          }}>
                          −
                        </button>
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                          {qty}
                        </span>
                        <button
                          onClick={() => setQuantity(item, qty + 1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all"
                          style={{ background: 'var(--accent)', color: '#fff' }}>
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 小計 */}
            {totalItems > 0 && (
              <div className="mt-4 px-4 py-3 rounded-xl flex items-center justify-between"
                style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)' }}>
                <span className="text-sm" style={{ color: 'var(--accent)' }}>共 {totalItems} 件</span>
                <span className="font-medium" style={{ color: 'var(--accent)' }}>小計 ${totalAmount}</span>
              </div>
            )}
          </StepCard>
        )}

        {/* STEP 4：訂購人資訊 */}
        {selectedPoint && cart.length > 0 && (
          <StepCard step={4} title="訂購人資訊">
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    className="w-full px-3 py-2.5 text-sm rounded-xl"
                    style={{
                      border: `1px solid ${fieldErrors.name ? '#c0392b' : 'var(--border)'}`,
                      background: 'var(--surface)',
                      color: 'var(--text)',
                    }}
                    placeholder="姓名"
                    value={name}
                    onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: '' })) }}
                  />
                  {fieldErrors.name && (
                    <div className="text-xs mt-1" style={{ color: '#c0392b' }}>{fieldErrors.name}</div>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {(['先生', '小姐'] as const).map(g => (
                    <button key={g}
                      onClick={() => { setGender(g); setFieldErrors(p => ({ ...p, gender: '' })) }}
                      className="px-3 py-2.5 rounded-xl text-sm transition-all"
                      style={{
                        background: gender === g ? 'var(--accent)' : 'var(--surface)',
                        color: gender === g ? '#fff' : 'var(--text)',
                        border: `1px solid ${fieldErrors.gender ? '#c0392b' : gender === g ? 'var(--accent)' : 'var(--border)'}`,
                      }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              {fieldErrors.gender && (
                <div className="text-xs" style={{ color: '#c0392b' }}>{fieldErrors.gender}</div>
              )}

              <div>
                <input
                  className="w-full px-3 py-2.5 text-sm rounded-xl"
                  style={{
                    border: `1px solid ${fieldErrors.phone ? '#c0392b' : 'var(--border)'}`,
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                  placeholder="手機號碼（09 開頭 10 碼）"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setFieldErrors(p => ({ ...p, phone: '' })) }}
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                />
                {fieldErrors.phone && (
                  <div className="text-xs mt-1" style={{ color: '#c0392b' }}>{fieldErrors.phone}</div>
                )}
              </div>

              {/* Honeypot */}
              <input type="text" name="_trap" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
            </div>
          </StepCard>
        )}

        {/* 送出按鈕 */}
        {selectedPoint && cart.length > 0 && (
          <button
            onClick={handleSubmitClick}
            className="w-full py-4 rounded-2xl font-medium text-base transition-all"
            style={{ background: 'var(--accent)', color: '#fff', letterSpacing: '0.02em' }}>
            確認訂購 · ${totalAmount}
          </button>
        )}

        <div style={{ height: '2rem' }} />
      </div>

      {/* ── 確認 Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full md:max-w-sm rounded-t-3xl md:rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="px-6 pt-6 pb-2">
              <div className="w-10 h-1 rounded-full mx-auto mb-5 md:hidden"
                style={{ background: 'var(--border)' }} />
              <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--text)' }}>確認訂單</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>請確認以下資訊無誤後送出</p>

              <div className="rounded-xl p-4 mb-3"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>取貨資訊</div>
                <div className="space-y-1">
                  <InfoRow label="日期" value={formatDateLabel(selectedDate!)} />
                  <InfoRow label="地區" value={selectedSchedule?.district ?? ''} />
                  <InfoRow label="地點" value={`${selectedPoint} 點｜${selectedPointData?.location}`} />
                  <InfoRow label="時間" value={`${selectedPointData?.start_time} – ${selectedPointData?.end_time}`} />
                </div>
              </div>

              <div className="rounded-xl p-4 mb-3"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>商品明細</div>
                <div className="space-y-1">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span style={{ color: 'var(--text)' }}>{item.name} × {item.quantity}</span>
                      <span style={{ color: 'var(--text-muted)' }}>${item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-medium pt-2"
                    style={{ borderTop: '1px solid var(--border)', color: 'var(--text)' }}>
                    <span>合計</span>
                    <span style={{ color: 'var(--accent)' }}>${totalAmount}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-4 mb-4"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>訂購人</div>
                <InfoRow label="姓名" value={`${name} ${gender}`} />
                <InfoRow label="電話" value={phone} />
              </div>

              {submitError && (
                <div className="text-sm px-4 py-3 rounded-xl mb-4"
                  style={{ background: '#fff5f5', color: '#c0392b', border: '1px solid #fcc' }}>
                  {submitError}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setSubmitError('') }}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                返回修改
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'var(--accent)', color: '#fff', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? '送出中...' : '確認送出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StepCard({
  step, title, children, error
}: {
  step: number
  title: string
  children: React.ReactNode
  error?: string
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: `1px solid ${error ? '#c0392b' : 'var(--border)'}` }}>
      <div className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          {step}
        </div>
        <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{title}</span>
      </div>
      <div className="p-4">
        {children}
        {error && (
          <div className="text-xs mt-3" style={{ color: '#c0392b' }}>⚠ {error}</div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="flex-shrink-0 w-10" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  )
}