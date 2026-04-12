'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ScheduleTab from './components/ScheduleTab'
import MenuTab from './components/MenuTab'
import OrdersTab from './components/OrdersTab'
import ManualOrderTab from './components/ManualOrderTab'

export interface DistrictDB {
 id: string
 name: string
 color: string
 bg_color: string
}

export interface MenuItemDB {
 id: number
 name: string
 price: number
 emoji: string
 description: string
 image_url?: string
}

export interface OrderItem {
 name: string
 price: number
 quantity: number
}

export interface Order {
 id: string
 customer_name: string
 customer_phone: string
 district: string
 pickup_point_label: string
 items: OrderItem[]
 total_amount: number
 created_at: string
}

export interface PickupPointDB {
 id: string
 schedule_id?: string
 district_id?: string
 label: string
 location: string
 start_time: string
 end_time: string
}

export interface PublishedSchedule {
 id: string
 date: string
 district: string
 pickup_points: PickupPointDB[]
}

const TAB_LABEL = {
 schedule: '行程設定',
 menu: '菜單管理',
 orders: '客戶訂單',
 manual: '手動輸入',
}

export default function AdminPage() {
 const [activeTab, setActiveTab] = useState<'schedule' | 'menu' | 'orders' | "manual">('schedule')
 const [sidebarOpen, setSidebarOpen] = useState(false)
 const [districtList, setDistrictList] = useState<DistrictDB[]>([])
 const [menuItems, setMenuItems] = useState<MenuItemDB[]>([])
 const [orders, setOrders] = useState<Order[]>([])
 const [ordersLoading, setOrdersLoading] = useState(true)
 const [publishedSchedules, setPublishedSchedules] = useState<PublishedSchedule[]>([])

 async function fetchDistricts() {
  const { data } = await supabase
   .from('districts_db')
   .select('*')
   .order('created_at', { ascending: true })
  setDistrictList(data ?? [])
 }

 async function fetchMenu() {
  const { data } = await supabase.from('menu_items').select('*').order('id')
  setMenuItems(data ?? [])
 }

 async function fetchOrders() {
  const { data } = await supabase
   .from('orders')
   .select('*')
   .order('created_at', { ascending: false })
  setOrders(data ?? [])
  setOrdersLoading(false)
 }

 async function fetchSchedules() {
  const { data } = await supabase
   .from('schedules')
   .select('*, pickup_points(*)')
   .order('date', { ascending: true })
  setPublishedSchedules(data ?? [])
 }

 useEffect(() => {
  fetchDistricts()
  fetchMenu()
  fetchOrders()
  fetchSchedules()
 }, [])

 return (
  <div className="flex min-h-screen relative">

   {/* 手機 overlay */}
   {sidebarOpen && (
    <div className="fixed inset-0 bg-black/30 z-20 md:hidden"
     onClick={() => setSidebarOpen(false)} />
   )}

   {/* Sidebar */}
   <aside className={`
        fixed md:static inset-y-0 left-0 z-30
        w-48 border-r flex-shrink-0 flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `} style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
    <div className="p-5 border-b flex items-center justify-between"
     style={{ borderColor: 'var(--border)' }}>
     <div>
      <div className="font-medium" style={{ color: 'var(--text)' }}>杏仁弟弟</div>
      <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>管理後台</div>
     </div>
     <button className="md:hidden text-lg" onClick={() => setSidebarOpen(false)}
      style={{ color: 'var(--text-muted)' }}>✕</button>
    </div>
    {(['schedule', 'menu', 'orders', 'manual'] as const).map(tab => (
     <button key={tab}
      onClick={() => { setActiveTab(tab); setSidebarOpen(false) }}
      className="text-left px-5 py-3 text-sm transition-colors"
      style={{
       color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
       fontWeight: activeTab === tab ? 500 : 400,
       background: activeTab === tab ? 'var(--accent-light)' : 'transparent',
       borderLeft: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
      }}>
      {TAB_LABEL[tab]}
     </button>
    ))}
   </aside>

   {/* Main */}
   <div className="flex-1 flex flex-col min-w-0">

    {/* 手機 header */}
    <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-10"
     style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
     <button onClick={() => setSidebarOpen(true)} style={{ color: 'var(--text)' }}>
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
       <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
     </button>
     <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
      {TAB_LABEL[activeTab]}
     </span>
    </header>

    <main className="flex-1 p-4 md:p-6 overflow-y-auto">
     {activeTab === 'schedule' && (
      <ScheduleTab
       districtList={districtList}
       publishedSchedules={publishedSchedules}
       onDistrictChange={fetchDistricts}
       onScheduleChange={fetchSchedules}
      />
     )}
     {activeTab === 'menu' && (
      <MenuTab menuItems={menuItems} onUpdate={fetchMenu} />
     )}
     {activeTab === 'orders' && (
      <OrdersTab districtList={districtList} />
     )}
     {activeTab === 'manual' && (
      <ManualOrderTab
       districtList={districtList}
       menuItems={menuItems}
      />
     )}
    </main>
   </div>
  </div>
 )
}