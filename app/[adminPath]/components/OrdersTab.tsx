'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { DistrictDB } from '../page'

interface OrderItem {
 name: string
 price: number
 quantity: number
}

interface Order {
 id: string
 customer_name: string
 customer_gender: string
 customer_phone: string
 district: string
 pickup_point_label: string
 items: OrderItem[]
 total_amount: number
 created_at: string
 is_completed: boolean
 source: string
}

interface Props {
 districtList: DistrictDB[]
}

function calcItemStats(orders: Order[]) {
 const map: Record<string, number> = {}
 for (const order of orders) {
  for (const item of order.items) {
   map[item.name] = (map[item.name] ?? 0) + item.quantity
  }
 }
 return Object.entries(map).sort((a, b) => b[1] - a[1])
}

export default function OrdersTab({ districtList }: Props) {
 const [orders, setOrders] = useState<Order[]>([])
 const [loading, setLoading] = useState(true)
 const [filter, setFilter] = useState('全部')
 const [showCompleted, setShowCompleted] = useState(true)
 const [togglingId, setTogglingId] = useState<string | null>(null)
 const [showClearConfirm, setShowClearConfirm] = useState(false)
 const [clearing, setClearing] = useState(false)
 const [sortByPoint, setSortByPoint] = useState(false)

 async function fetchOrders() {
  const { data } = await supabase
   .from('orders')
   .select('*')
   .order('created_at', { ascending: false })
  setOrders(data ?? [])
  setLoading(false)
 }

 useEffect(() => {
  fetchOrders()
  const channel = supabase
   .channel('orders-realtime')
   .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'orders',
   }, () => { fetchOrders() })
   .subscribe()
  return () => { supabase.removeChannel(channel) }
 }, [])

 async function toggleCompleted(order: Order) {
  setTogglingId(order.id)
  await supabase
   .from('orders')
   .update({ is_completed: !order.is_completed })
   .eq('id', order.id)
  await fetchOrders()
  setTogglingId(null)
 }

 async function clearCompleted() {
  setClearing(true)
  await supabase.from('orders').delete().eq('is_completed', true)
  await fetchOrders()
  setClearing(false)
  setShowClearConfirm(false)
 }

 const districtColor = (name: string) => districtList.find(d => d.name === name)?.color ?? '#888'
 const districtBg = (name: string) => districtList.find(d => d.name === name)?.bg_color ?? '#f5f5f5'

 const allDistricts = ['全部', ...Array.from(new Set(orders.map(o => o.district)))]

 // 地區篩選後的訂單（統計用，不過濾完成狀態）
 const statsSource = filter === '全部' ? orders : orders.filter(o => o.district === filter)
 const itemStats = calcItemStats(statsSource)
 const statsTotal = statsSource.reduce((s, o) => s + o.total_amount, 0)
 const statsOrderCount = statsSource.length
 const statsPendingCount = statsSource.filter(o => !o.is_completed).length

 // 篩選
 const afterFilter = orders.filter(o => {
  if (filter !== '全部' && o.district !== filter) return false
  if (!showCompleted && o.is_completed) return false
  return true
 })

 // 排序：依地點 A→B→C→D，同地點內依下單時間
 const filtered = sortByPoint
  ? [...afterFilter].sort((a, b) => {
   const pointDiff = a.pickup_point_label.localeCompare(b.pickup_point_label)
   if (pointDiff !== 0) return pointDiff
   return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
  : afterFilter

 // 當前排序下，有哪些地點（用於分組標題）
 const pointsInView = sortByPoint
  ? [...new Set(filtered.map(o => o.pickup_point_label))].sort()
  : []

 return (
  <div className="max-w-2xl mx-auto">

   {/* 確認清除 modal */}
   {showClearConfirm && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
     style={{ background: 'rgba(0,0,0,0.4)' }}>
     <div className="rounded-xl p-6 w-full max-w-xs"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="font-medium mb-2" style={{ color: 'var(--text)' }}>
       清除所有已完成訂單？
      </div>
      <div className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
       共 {orders.filter(o => o.is_completed).length} 筆已取貨訂單將被永久刪除，此操作無法復原。
      </div>
      <div className="flex gap-2">
       <button onClick={() => setShowClearConfirm(false)} disabled={clearing}
        className="flex-1 py-2 rounded-lg text-sm"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        取消
       </button>
       <button onClick={clearCompleted} disabled={clearing}
        className="flex-1 py-2 rounded-lg text-sm font-medium"
        style={{ background: '#c0392b', color: '#fff', opacity: clearing ? 0.7 : 1 }}>
        {clearing ? '清除中...' : '確認清除'}
       </button>
      </div>
     </div>
    </div>
   )}

   {/* 統計區塊 */}
   {!loading && orders.length > 0 && (
    <div className="rounded-xl p-4 mb-5"
     style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
     <div className="flex items-center justify-between mb-3">
      <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
       {filter === '全部' ? '全部訂單統計' : `${filter} 訂單統計`}
      </div>
      <div className="flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
       <span>共 <span className="font-medium" style={{ color: 'var(--text)' }}>{statsOrderCount}</span> 筆</span>
       <span>待取 <span className="font-medium" style={{ color: 'var(--accent)' }}>{statsPendingCount}</span> 筆</span>
       <span>總額 <span className="font-medium" style={{ color: 'var(--text)' }}>${statsTotal}</span></span>
      </div>
     </div>
     <div className="space-y-2">
      {itemStats.map(([name, qty]) => {
       const maxQty = itemStats[0][1]
       const pct = Math.round((qty / maxQty) * 100)
       return (
        <div key={name} className="flex items-center gap-3">
         <div className="text-sm flex-shrink-0" style={{ color: 'var(--text)', minWidth: '90px' }}>
          {name}
         </div>
         <div className="flex-1 rounded-full overflow-hidden" style={{ height: '6px', background: 'var(--bg)' }}>
          <div className="h-full rounded-full transition-all duration-500"
           style={{ width: `${pct}%`, background: 'var(--accent)', opacity: 0.7 + (pct / 100) * 0.3 }} />
         </div>
         <div className="text-sm font-medium flex-shrink-0 text-right"
          style={{ color: 'var(--text)', minWidth: '36px' }}>
          ×{qty}
         </div>
        </div>
       )
      })}
     </div>
    </div>
   )}

   {/* Header */}
   <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
    <h1 className="text-lg font-medium hidden md:block" style={{ color: 'var(--text)' }}>客戶訂單</h1>
    <div className="flex gap-2 ml-auto flex-wrap">
     <button
      onClick={() => setShowCompleted(v => !v)}
      className="text-xs px-3 py-1.5 rounded-lg"
      style={{
       background: showCompleted ? 'var(--bg)' : 'var(--accent)',
       color: showCompleted ? 'var(--text-muted)' : '#fff',
       border: `1px solid ${showCompleted ? 'var(--border)' : 'var(--accent)'}`,
      }}>
      {showCompleted ? '隱藏已完成' : '顯示已完成'}
     </button>
     {orders.some(o => o.is_completed) && (
      <button onClick={() => setShowClearConfirm(true)}
       className="text-xs px-3 py-1.5 rounded-lg"
       style={{ color: '#c0392b', border: '1px solid #fcc', background: 'transparent' }}>
       清除已完成
      </button>
     )}
    </div>
   </div>

   {/* 地區篩選 + 地點排序 */}
   <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
    <div className="flex gap-2 flex-wrap">
     {allDistricts.map(d => (
      <button key={d} onClick={() => setFilter(d)}
       className="text-xs px-3 py-1.5 rounded-lg"
       style={{
        background: filter === d ? 'var(--accent)' : 'var(--bg)',
        color: filter === d ? '#fff' : 'var(--text-muted)',
        border: `1px solid ${filter === d ? 'var(--accent)' : 'var(--border)'}`,
       }}>
       {d}
      </button>
     ))}
    </div>

    {/* 排序切換 */}
    <button
     onClick={() => setSortByPoint(v => !v)}
     className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 flex-shrink-0"
     style={{
      background: sortByPoint ? 'var(--accent-light)' : 'var(--bg)',
      color: sortByPoint ? 'var(--accent)' : 'var(--text-muted)',
      border: `1px solid ${sortByPoint ? 'var(--accent)' : 'var(--border)'}`,
     }}>
     <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round" />
     </svg>
     {sortByPoint ? '依地點排序中' : '依地點排序'}
    </button>
   </div>

   {/* 訂單列表 */}
   {loading ? (
    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>載入中...</div>
   ) : filtered.length === 0 ? (
    <div className="text-sm" style={{ color: 'var(--text-muted)' }}>沒有符合的訂單</div>
   ) : sortByPoint ? (
    // 依地點分組顯示
    <div className="space-y-5">
     {pointsInView.map(point => {
      const pointOrders = filtered.filter(o => o.pickup_point_label === point)
      const pointTotal = pointOrders.reduce((s, o) => s + o.total_amount, 0)
      const pointPending = pointOrders.filter(o => !o.is_completed).length
      return (
       <div key={point}>
        {/* 地點分組標題 */}
        <div className="flex items-center gap-2 mb-2 px-1">
         <div className="w-7 h-7 rounded-lg flex items-center justify-center font-medium text-sm flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#fff' }}>
          {point}
         </div>
         <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
          {point} 點
         </span>
         <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {pointOrders.length} 筆
         </span>
         {pointPending > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full"
           style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
           待取 {pointPending}
          </span>
         )}
         <span className="text-xs ml-auto font-medium" style={{ color: 'var(--text-muted)' }}>
          ${pointTotal}
         </span>
        </div>

        {/* 該地點的訂單 */}
        <div className="space-y-2">
         {pointOrders.map(order => (
          <OrderCard
           key={order.id}
           order={order}
           districtColor={districtColor}
           districtBg={districtBg}
           togglingId={togglingId}
           onToggle={toggleCompleted}
          />
         ))}
        </div>
       </div>
      )
     })}
    </div>
   ) : (
    // 一般列表（依時間）
    <div className="space-y-2">
     {filtered.map(order => (
      <OrderCard
       key={order.id}
       order={order}
       districtColor={districtColor}
       districtBg={districtBg}
       togglingId={togglingId}
       onToggle={toggleCompleted}
      />
     ))}
    </div>
   )}
  </div>
 )
}

// ── 單筆訂單卡片 ──────────────────────────────────────
function OrderCard({ order, districtColor, districtBg, togglingId, onToggle }: {
 order: Order
 districtColor: (name: string) => string
 districtBg: (name: string) => string
 togglingId: string | null
 onToggle: (order: Order) => void
}) {
 return (
  <div className="flex rounded-xl overflow-hidden transition-all duration-300"
   style={{ border: '1px solid var(--border)', opacity: order.is_completed ? 0.6 : 1 }}>
   <div className="w-1 flex-shrink-0 transition-colors duration-300"
    style={{ background: order.is_completed ? '#ccc' : districtColor(order.district) }} />
   <div className="flex-1 px-4 py-3 transition-colors duration-300"
    style={{ background: order.is_completed ? 'var(--bg)' : 'var(--surface)' }}>

    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
     <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
      {order.customer_name}{order.customer_gender}
     </span>
     {order.customer_phone && (
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
       {order.customer_phone}
      </span>
     )}
     <span className="text-xs px-2 py-0.5 rounded-full"
      style={{
       background: order.is_completed ? '#eee' : districtBg(order.district),
       color: order.is_completed ? '#999' : districtColor(order.district),
      }}>
      {order.district} {order.pickup_point_label} 點
     </span>
     {order.source && order.source !== '網站' && (
      <span className="text-xs px-2 py-0.5 rounded-full"
       style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
       {order.source}
      </span>
     )}
     <span className="font-medium text-sm ml-auto" style={{ color: 'var(--text)' }}>
      ${order.total_amount}
     </span>
    </div>

    <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
     {order.items.map(i => `${i.name} ×${i.quantity}`).join('、')}
    </div>

    <div className="flex items-center justify-between">
     <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
      {new Date(order.created_at).toLocaleString('zh-TW', {
       month: 'numeric', day: 'numeric',
       hour: '2-digit', minute: '2-digit',
      })}
     </span>
     <button
      onClick={() => onToggle(order)}
      disabled={togglingId === order.id}
      className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg transition-all"
      style={{
       background: order.is_completed ? '#e8f5e9' : 'var(--bg)',
       color: order.is_completed ? '#2e7d32' : 'var(--text-muted)',
       border: `1px solid ${order.is_completed ? '#a5d6a7' : 'var(--border)'}`,
       opacity: togglingId === order.id ? 0.5 : 1,
      }}>
      <span className="w-3 h-3 rounded-full transition-colors"
       style={{ background: order.is_completed ? '#2e7d32' : 'var(--border)' }} />
      {order.is_completed ? '已取貨' : '標記取貨'}
     </button>
    </div>
   </div>
  </div>
 )
}