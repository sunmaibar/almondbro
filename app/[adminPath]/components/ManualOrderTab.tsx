'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { DistrictDB, MenuItemDB } from '../page'

interface PickupPoint {
 label: string
 location: string
 start_time: string
 end_time: string
}

interface Schedule {
 id: string
 date: string
 district: string
 pickup_points: PickupPoint[]
}

interface CartItem {
 id: number
 name: string
 price: number
 quantity: number
}

const SOURCES = ['地方社團', '杏仁弟弟社團', '其他']
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function formatDateLabel(dateStr: string) {
 const d = new Date(dateStr + 'T00:00:00')
 return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

interface Props {
 districtList: DistrictDB[]
 menuItems: MenuItemDB[]
}

export default function ManualOrderTab({ districtList, menuItems }: Props) {
 const [schedules, setSchedules] = useState<Schedule[]>([])
 const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
 const [selectedPoint, setSelectedPoint] = useState<string>('')
 const [customerName, setCustomerName] = useState('')
 const [customerPhone, setCustomerPhone] = useState('')
 const [source, setSource] = useState(SOURCES[0])
 const [cart, setCart] = useState<CartItem[]>([])
 const [submitting, setSubmitting] = useState(false)
 const [success, setSuccess] = useState(false)
 const [errors, setErrors] = useState<Record<string, string>>({})

 useEffect(() => {
  async function fetchSchedules() {
   const { data } = await supabase
    .from('schedules')
    .select('*, pickup_points(*)')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
   setSchedules(data ?? [])
  }
  fetchSchedules()
 }, [])

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

 const totalAmount = cart.reduce((s, c) => s + c.price * c.quantity, 0)

 function validate() {
  const errs: Record<string, string> = {}
  if (!customerName.trim()) errs.name = '請填寫姓名'
  if (!selectedSchedule) errs.schedule = '請選擇行程日期'
  if (!selectedPoint) errs.point = '請選擇取貨地點'
  if (cart.length === 0) errs.cart = '請至少選擇一項商品'
  return errs
 }

 async function handleSubmit() {
  const errs = validate()
  setErrors(errs)
  if (Object.keys(errs).length > 0) return

  setSubmitting(true)
  await supabase.from('orders').insert({
   customer_name: customerName.trim(),
   customer_gender: '',
   customer_phone: customerPhone.trim(),
   district: selectedSchedule!.district,
   pickup_point_label: selectedPoint,
   items: cart,
   total_amount: totalAmount,
   source,
   customer_ip: 'manual',
   is_completed: false,
  })

  // 重置表單
  setCustomerName('')
  setCustomerPhone('')
  setSelectedPoint('')
  setCart([])
  setSource(SOURCES[0])
  setSubmitting(false)
  setSuccess(true)
  setTimeout(() => setSuccess(false), 3000)
 }

 return (
  <div className="max-w-xl mx-auto">
   <h1 className="text-lg font-medium mb-5 hidden md:block" style={{ color: 'var(--text)' }}>
    手動輸入訂單
   </h1>

   {/* 成功提示 */}
   {success && (
    <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2"
     style={{ background: '#e8f5e9', border: '1px solid #a5d6a7' }}>
     <svg width="16" height="16" fill="none" stroke="#2e7d32" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
     </svg>
     <span className="text-sm font-medium" style={{ color: '#2e7d32' }}>訂單已新增成功</span>
    </div>
   )}

   <div className="space-y-4">

    {/* 訂單來源 */}
    <div className="rounded-xl p-4"
     style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
     <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>訂單來源</div>
     <div className="flex gap-2 flex-wrap">
      {SOURCES.map(s => (
       <button key={s} onClick={() => setSource(s)}
        className="px-3 py-1.5 rounded-lg text-sm transition-all"
        style={{
         background: source === s ? 'var(--accent)' : 'var(--bg)',
         color: source === s ? '#fff' : 'var(--text)',
         border: `1px solid ${source === s ? 'var(--accent)' : 'var(--border)'}`,
        }}>
        {s}
       </button>
      ))}
     </div>
    </div>

    {/* 購買者資訊 */}
    <div className="rounded-xl p-4"
     style={{ background: 'var(--surface)', border: `1px solid ${errors.name ? '#fcc' : 'var(--border)'}` }}>
     <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>購買者資訊</div>
     <div className="space-y-2">
      <div>
       <input
        className="w-full px-3 py-2 text-sm rounded-lg"
        style={{
         border: `1px solid ${errors.name ? '#c0392b' : 'var(--border)'}`,
         background: 'var(--bg)',
         color: 'var(--text)',
        }}
        placeholder="姓名（必填）"
        value={customerName}
        onChange={e => { setCustomerName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
       />
       {errors.name && (
        <div className="text-xs mt-1" style={{ color: '#c0392b' }}>{errors.name}</div>
       )}
      </div>
      <input
       className="w-full px-3 py-2 text-sm rounded-lg"
       style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
       placeholder="電話（選填）"
       value={customerPhone}
       onChange={e => setCustomerPhone(e.target.value)}
       type="tel"
       inputMode="numeric"
      />
     </div>
    </div>

    {/* 選擇行程 */}
    <div className="rounded-xl p-4"
     style={{ background: 'var(--surface)', border: `1px solid ${errors.schedule ? '#fcc' : 'var(--border)'}` }}>
     <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>選擇行程日期</div>
     {schedules.length === 0 ? (
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>尚無排定行程</div>
     ) : (
      <div className="flex flex-wrap gap-2">
       {schedules.map(s => (
        <button key={s.id}
         onClick={() => {
          setSelectedSchedule(s)
          setSelectedPoint('')
          setErrors(p => ({ ...p, schedule: '', point: '' }))
         }}
         className="px-3 py-2 rounded-lg text-sm transition-all"
         style={{
          background: selectedSchedule?.id === s.id ? 'var(--accent)' : 'var(--bg)',
          color: selectedSchedule?.id === s.id ? '#fff' : 'var(--text)',
          border: `1px solid ${selectedSchedule?.id === s.id ? 'var(--accent)' : 'var(--border)'}`,
         }}>
         <div>{formatDateLabel(s.date)}</div>
         <div className="text-xs mt-0.5 opacity-75">{s.district}</div>
        </button>
       ))}
      </div>
     )}
     {errors.schedule && (
      <div className="text-xs mt-2" style={{ color: '#c0392b' }}>{errors.schedule}</div>
     )}
    </div>

    {/* 選擇取貨地點 */}
    {selectedSchedule && (
     <div className="rounded-xl p-4"
      style={{ background: 'var(--surface)', border: `1px solid ${errors.point ? '#fcc' : 'var(--border)'}` }}>
      <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
       選擇取貨地點 — {selectedSchedule.district}
      </div>
      <div className="space-y-2">
       {selectedSchedule.pickup_points
        .sort((a, b) => a.label.localeCompare(b.label))
        .map(p => {
         const isSelected = selectedPoint === p.label
         const d = districtList.find(x => x.name === selectedSchedule.district)
         return (
          <button key={p.label}
           onClick={() => { setSelectedPoint(p.label); setErrors(pr => ({ ...pr, point: '' })) }}
           className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
           style={{
            background: isSelected ? 'var(--accent-light)' : 'var(--bg)',
            border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
           }}>
           <div className="w-7 h-7 rounded-md flex items-center justify-center font-medium text-sm flex-shrink-0"
            style={{
             background: isSelected ? 'var(--accent)' : (d?.bg_color ?? 'var(--bg)'),
             color: isSelected ? '#fff' : (d?.color ?? 'var(--text)'),
            }}>
            {p.label}
           </div>
           <div className="flex-1 min-w-0">
            <div className="text-sm truncate" style={{ color: 'var(--text)' }}>{p.location}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
             {p.start_time} – {p.end_time}
            </div>
           </div>
           {isSelected && (
            <svg width="14" height="14" fill="none" stroke="var(--accent)" strokeWidth="2.5" viewBox="0 0 24 24">
             <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
           )}
          </button>
         )
        })}
      </div>
      {errors.point && (
       <div className="text-xs mt-2" style={{ color: '#c0392b' }}>{errors.point}</div>
      )}
     </div>
    )}

    {/* 選擇商品 */}
    <div className="rounded-xl p-4"
     style={{ background: 'var(--surface)', border: `1px solid ${errors.cart ? '#fcc' : 'var(--border)'}` }}>
     <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>選擇商品</div>
     <div className="space-y-2">
      {menuItems.map(item => {
       const qty = getQty(item.id)
       return (
        <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
         style={{
          background: qty > 0 ? 'var(--accent-light)' : 'var(--bg)',
          border: `1px solid ${qty > 0 ? 'var(--accent)' : 'var(--border)'}`,
          transition: 'all 0.15s',
         }}>
         <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.name}</div>
          <div className="text-xs" style={{ color: 'var(--accent)' }}>${item.price}</div>
         </div>
         <div className="flex items-center gap-2 flex-shrink-0">
          <button
           onClick={() => { setQuantity(item, qty - 1); setErrors(p => ({ ...p, cart: '' })) }}
           disabled={qty === 0}
           className="w-8 h-8 rounded-full flex items-center justify-center text-base transition-all"
           style={{
            background: qty > 0 ? 'var(--accent)' : 'var(--bg)',
            color: qty > 0 ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${qty > 0 ? 'var(--accent)' : 'var(--border)'}`,
           }}>
           −
          </button>
          <span className="w-6 text-center text-sm font-medium" style={{ color: 'var(--text)' }}>
           {qty}
          </span>
          <button
           onClick={() => { setQuantity(item, qty + 1); setErrors(p => ({ ...p, cart: '' })) }}
           className="w-8 h-8 rounded-full flex items-center justify-center text-base"
           style={{ background: 'var(--accent)', color: '#fff' }}>
           +
          </button>
         </div>
        </div>
       )
      })}
     </div>
     {errors.cart && (
      <div className="text-xs mt-2" style={{ color: '#c0392b' }}>{errors.cart}</div>
     )}

     {/* 小計 */}
     {cart.length > 0 && (
      <div className="mt-3 flex justify-between items-center px-1">
       <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {cart.reduce((s, c) => s + c.quantity, 0)} 件商品
       </span>
       <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
        小計 ${totalAmount}
       </span>
      </div>
     )}
    </div>

    {/* 送出 */}
    <button
     onClick={handleSubmit}
     disabled={submitting}
     className="w-full py-3 rounded-xl text-sm font-medium transition-all"
     style={{
      background: 'var(--accent)',
      color: '#fff',
      opacity: submitting ? 0.7 : 1,
     }}>
     {submitting ? '新增中...' : `新增訂單${totalAmount > 0 ? ` · $${totalAmount}` : ''}`}
    </button>
   </div>
  </div>
 )
}