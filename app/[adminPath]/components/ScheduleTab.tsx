'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DistrictDB, PublishedSchedule, PickupPointDB } from '../page'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const AUTO_COLORS = [
 { color: '#185FA5', bg: '#E6F1FB' },
 { color: '#0F6E56', bg: '#E1F5EE' },
 { color: '#993C1D', bg: '#FAECE7' },
 { color: '#854F0B', bg: '#FAEEDA' },
 { color: '#993556', bg: '#FBEAF0' },
 { color: '#3B6D11', bg: '#EAF3DE' },
 { color: '#534AB7', bg: '#EEEDFE' },
 { color: '#5F5E5A', bg: '#F1EFE8' },
 { color: '#0F6E6E', bg: '#E1F5F5' },
 { color: '#7A3B69', bg: '#F5E8F2' },
]

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function pickColor(existingCount: number) {
 return AUTO_COLORS[existingCount % AUTO_COLORS.length]
}

// 刪除某點後，重新按順序分配 ABCD 標籤
function reorderLabels(pts: EditingPoint[]): EditingPoint[] {
 return pts.map((p, i) => ({ ...p, label: LABELS[i] ?? String(i + 1) }))
}

function getNext14Days() {
 return Array.from({ length: 14 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() + i)
  return d
 })
}

function formatDate(d: Date) {
 return `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`
}

function toISODate(d: Date) {
 return d.toISOString().split('T')[0]
}

function isValidTime(t: string) {
 if (!/^\d{2}:\d{2}$/.test(t)) return false
 const [h, m] = t.split(':').map(Number)
 return h >= 0 && h <= 23 && m >= 0 && m <= 59
}

interface EditingPoint {
 label: string
 location: string
 start_time: string
 end_time: string
}

interface Props {
 districtList: DistrictDB[]
 publishedSchedules: PublishedSchedule[]
 onDistrictChange: () => void
 onScheduleChange: () => void
}

export default function ScheduleTab({
 districtList, publishedSchedules, onDistrictChange, onScheduleChange
}: Props) {
 const next14Days = getNext14Days()
 const [selectedDateIdx, setSelectedDateIdx] = useState(0)
 const [showAll14, setShowAll14] = useState(false)
 const [selectedDistrict, setSelectedDistrict] = useState<DistrictDB | null>(null)
 const [points, setPoints] = useState<EditingPoint[]>([])
 const [saving, setSaving] = useState(false)
 const [errors, setErrors] = useState<string[]>([])
 const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)

 // 新增地區
 const [showAddDistrict, setShowAddDistrict] = useState(false)
 const [newName, setNewName] = useState('')
 const [addingDistrict, setAddingDistrict] = useState(false)

 // 刪除地區確認 modal
 const [deletingDistrict, setDeletingDistrict] = useState<DistrictDB | null>(null)

 const visibleDates = showAll14 ? next14Days : next14Days.slice(0, 7)
 const selectedDate = next14Days[selectedDateIdx]
 const scheduleOnDate = publishedSchedules.find(s => s.date === toISODate(selectedDate))

 function getDistrictForDate(d: Date) {
  return publishedSchedules.find(s => s.date === toISODate(d))?.district ?? null
 }

 async function handleSelectDistrict(d: DistrictDB) {
  setSelectedDistrict(d)
  setErrors([])
  setEditingScheduleId(null)
  const { data } = await supabase
   .from('district_default_points')
   .select('*')
   .eq('district_id', d.id)
   .order('label', { ascending: true })
  if (data && data.length > 0) {
   setPoints(data.map(p => ({
    label: p.label,
    location: p.location,
    start_time: p.start_time,
    end_time: p.end_time,
   })))
  } else {
   setPoints([{ label: 'A', location: '', start_time: '20:00', end_time: '20:20' }])
  }
 }

 function handleEditSchedule(schedule: PublishedSchedule) {
  const d = districtList.find(x => x.name === schedule.district)
  if (d) setSelectedDistrict(d)
  setEditingScheduleId(schedule.id)
  setErrors([])
  setPoints(reorderLabels(
   (schedule.pickup_points ?? []).map(p => ({
    label: p.label,
    location: p.location,
    start_time: p.start_time,
    end_time: p.end_time,
   }))
  ))
 }

 function updatePoint(idx: number, field: keyof EditingPoint, value: string) {
  // location 和 start/end_time 可以直接改，label 不開放手動改（由系統維護）
  setPoints(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  setErrors([])
 }

 function addPoint() {
  setPoints(prev => {
   const next = [...prev, { label: '', location: '', start_time: '20:00', end_time: '20:20' }]
   return reorderLabels(next)
  })
 }

 function removePoint(idx: number) {
  setPoints(prev => reorderLabels(prev.filter((_, i) => i !== idx)))
 }

 function validate() {
  const errs: string[] = []
  if (points.length === 0) { errs.push('請至少新增一個取貨地點'); return errs }
  points.forEach((p, i) => {
   const row = `${p.label} 點`
   if (!p.location.trim()) errs.push(`${row}：地點描述不能為空`)
   if (!isValidTime(p.start_time)) errs.push(`${row}：開始時間格式錯誤（HH:MM，如 20:00）`)
   if (!isValidTime(p.end_time)) errs.push(`${row}：結束時間格式錯誤（HH:MM，如 20:30）`)
  })
  return errs
 }

 async function handleSave() {
  if (!selectedDistrict) return
  const errs = validate()
  if (errs.length > 0) { setErrors(errs); return }
  setSaving(true)
  const dateStr = toISODate(selectedDate)

  const existing = publishedSchedules.find(s => s.date === dateStr)
  if (existing) await supabase.from('schedules').delete().eq('id', existing.id)

  const { data: schedule, error } = await supabase
   .from('schedules')
   .insert({ date: dateStr, district: selectedDistrict.name })
   .select()
   .single()

  if (error || !schedule) { setSaving(false); return }

  await supabase.from('pickup_points').insert(
   points.map(p => ({ ...p, schedule_id: schedule.id }))
  )

  await supabase.from('district_default_points').delete().eq('district_id', selectedDistrict.id)
  await supabase.from('district_default_points').insert(
   points.map(p => ({ ...p, district_id: selectedDistrict.id }))
  )

  setSaving(false)
  setSelectedDistrict(null)
  setPoints([])
  setErrors([])
  setEditingScheduleId(null)
  onScheduleChange()
 }

 async function deleteSchedule(id: string) {
  await supabase.from('schedules').delete().eq('id', id)
  if (editingScheduleId === id) {
   setSelectedDistrict(null)
   setPoints([])
   setEditingScheduleId(null)
  }
  onScheduleChange()
 }

 // 刪除地區：同時刪除所有排定該地區的行程
 async function confirmDeleteDistrict() {
  if (!deletingDistrict) return

  // 找出所有排定此地區的行程並刪除
  const affected = publishedSchedules.filter(s => s.district === deletingDistrict.name)
  for (const s of affected) {
   await supabase.from('schedules').delete().eq('id', s.id)
  }

  // 刪除地區（cascade 會自動刪 district_default_points）
  await supabase.from('districts_db').delete().eq('id', deletingDistrict.id)

  if (selectedDistrict?.id === deletingDistrict.id) {
   setSelectedDistrict(null)
   setPoints([])
  }

  setDeletingDistrict(null)
  onDistrictChange()
  onScheduleChange()
 }

 async function handleAddDistrict() {
  if (!newName.trim() || addingDistrict) return
  setAddingDistrict(true)
  const picked = pickColor(districtList.length)
  await supabase.from('districts_db').insert({
   name: newName.trim(),
   color: picked.color,
   bg_color: picked.bg,
  })
  setNewName('')
  setShowAddDistrict(false)
  setAddingDistrict(false)
  onDistrictChange()
 }

 return (
  <div className="max-w-2xl mx-auto">
   <h1 className="text-lg font-medium mb-5 hidden md:block" style={{ color: 'var(--text)' }}>設定行程</h1>

   {/* 刪除地區確認 modal */}
   {deletingDistrict && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
     style={{ background: 'rgba(0,0,0,0.4)' }}>
     <div className="rounded-xl p-6 w-full max-w-sm"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="font-medium mb-2" style={{ color: 'var(--text)' }}>
       刪除「{deletingDistrict.name}」地區？
      </div>
      <div className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
       {publishedSchedules.filter(s => s.district === deletingDistrict.name).length > 0
        ? `此地區已有排定行程，刪除後相關行程也會一併移除。`
        : `刪除後無法復原。`
       }
      </div>
      <div className="flex gap-2 justify-end">
       <button
        onClick={() => setDeletingDistrict(null)}
        className="text-sm px-4 py-2 rounded-lg"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        取消
       </button>
       <button
        onClick={confirmDeleteDistrict}
        className="text-sm px-4 py-2 rounded-lg font-medium"
        style={{ background: '#c0392b', color: '#fff' }}>
        確認刪除
       </button>
      </div>
     </div>
    </div>
   )}

   {/* 日期選擇 */}
   <div className="rounded-xl p-4 mb-4"
    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
    <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>選擇日期</div>
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
     {visibleDates.map((d, i) => {
      const tag = getDistrictForDate(d)
      const isSelected = selectedDateIdx === i
      return (
       <button key={i}
        onClick={() => {
         setSelectedDateIdx(i)
         setSelectedDistrict(null)
         setPoints([])
         setErrors([])
         setEditingScheduleId(null)
        }}
        className="flex flex-col items-center justify-center rounded-lg py-2 transition-colors"
        style={{
         background: isSelected ? 'var(--accent)' : 'var(--bg)',
         color: isSelected ? '#fff' : 'var(--text)',
         border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
         minHeight: '52px',
         fontSize: '11px',
        }}>
        <span>{formatDate(d)}</span>
        {tag
         ? <span className="mt-1 opacity-80" style={{ fontSize: '10px' }}>{tag}</span>
         : <span className="mt-1 opacity-25" style={{ fontSize: '10px' }}>—</span>
        }
       </button>
      )
     })}
    </div>
    <button onClick={() => setShowAll14(v => !v)}
     className="mt-3 text-xs px-3 py-1.5 rounded-lg w-full"
     style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--bg)' }}>
     {showAll14 ? '▲ 收起後七天' : '▼ 展開後七天'}
    </button>
   </div>

   {/* 已發布行程 */}
   {scheduleOnDate && (
    <div className="rounded-xl p-4 mb-4"
     style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
     <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
      {formatDate(selectedDate)} 已發布行程
     </div>
     {(() => {
      const d = districtList.find(x => x.name === scheduleOnDate.district)
      return (
       <div className="rounded-lg p-3" style={{ background: d?.bg_color ?? '#f5f5f5' }}>
        <div className="flex items-center justify-between mb-2">
         <span className="text-sm font-medium" style={{ color: d?.color }}>
          {scheduleOnDate.district}
         </span>
         <div className="flex gap-2">
          <button onClick={() => handleEditSchedule(scheduleOnDate)}
           className="text-xs px-2 py-1 rounded"
           style={{ color: d?.color, border: `1px solid ${d?.color}60`, background: 'white' }}>
           編輯
          </button>
          <button onClick={() => deleteSchedule(scheduleOnDate.id)}
           className="text-xs px-2 py-1 rounded"
           style={{ color: '#c0392b', border: '1px solid #fcc', background: 'white' }}>
           刪除
          </button>
         </div>
        </div>
        {scheduleOnDate.pickup_points?.map((p, i) => (
         <div key={i} className="text-xs flex gap-2 mt-1" style={{ color: d?.color }}>
          <span className="font-medium w-4">{p.label}</span>
          <span className="flex-1">{p.location}</span>
          <span className="opacity-70">{p.start_time}–{p.end_time}</span>
         </div>
        ))}
       </div>
      )
     })()}
    </div>
   )}

   {/* 地區選擇 */}
   <div className="rounded-xl p-4 mb-4"
    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
    <div className="flex items-center justify-between mb-3">
     <div className="text-xs" style={{ color: 'var(--text-muted)' }}>選擇地區</div>
     <button
      onClick={() => { if (!addingDistrict) setShowAddDistrict(v => !v) }}
      disabled={showAddDistrict || addingDistrict}
      className="text-xs px-3 py-1.5 rounded-lg transition-opacity"
      style={{
       background: (showAddDistrict || addingDistrict) ? 'var(--border)' : 'var(--accent)',
       color: (showAddDistrict || addingDistrict) ? 'var(--text-muted)' : '#fff',
       cursor: (showAddDistrict || addingDistrict) ? 'not-allowed' : 'pointer',
       opacity: addingDistrict ? 0.6 : 1,
      }}>
      {addingDistrict ? '新增中...' : '+ 新增地區'}
     </button>
    </div>

    {/* 新增地區表單 */}
    {showAddDistrict && (
     <div className="rounded-lg p-3 mb-3"
      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <input
       className="w-full px-3 py-2 text-sm rounded-lg mb-2"
       style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
       placeholder="地區名稱，例如：林口"
       value={newName}
       onChange={e => setNewName(e.target.value)}
       onKeyDown={e => e.key === 'Enter' && handleAddDistrict()}
       autoFocus
      />
      <div className="flex gap-2">
       <button
        onClick={handleAddDistrict}
        disabled={!newName.trim() || addingDistrict}
        className="text-xs px-3 py-1.5 rounded-lg flex-1"
        style={{
         background: newName.trim() && !addingDistrict ? 'var(--accent)' : 'var(--border)',
         color: newName.trim() && !addingDistrict ? '#fff' : 'var(--text-muted)',
         cursor: newName.trim() && !addingDistrict ? 'pointer' : 'not-allowed',
        }}>
        {addingDistrict ? '新增中...' : '確認新增'}
       </button>
       <button
        onClick={() => { setShowAddDistrict(false); setNewName('') }}
        className="text-xs px-3 py-1.5 rounded-lg"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        取消
       </button>
      </div>
     </div>
    )}

    {/* 地區按鈕 */}
    <div className="flex flex-wrap gap-2">
     {districtList.map(d => {
      const isSelected = selectedDistrict?.id === d.id
      return (
       <button key={d.id}
        onClick={() => handleSelectDistrict(d)}
        className="px-3 py-1.5 rounded-lg text-sm transition-colors"
        style={{
         background: isSelected ? d.color : 'var(--bg)',
         color: isSelected ? '#fff' : 'var(--text)',
         border: `1px solid ${isSelected ? d.color : 'var(--border)'}`,
        }}>
        {d.name}
       </button>
      )
     })}
    </div>

    {/* 選中地區後顯示刪除按鈕（獨立在下方，不在按鈕旁） */}
    {selectedDistrict && (
     <div className="mt-3 pt-3 flex items-center justify-between"
      style={{ borderTop: '1px solid var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
       已選擇：{selectedDistrict.name}
      </span>
      <button
       onClick={() => setDeletingDistrict(selectedDistrict)}
       className="text-xs px-3 py-1.5 rounded-lg"
       style={{ color: '#c0392b', border: '1px solid #fcc', background: 'transparent' }}>
       刪除此地區
      </button>
     </div>
    )}
   </div>

   {/* 取貨地點編輯 */}
   {selectedDistrict && (
    <div className="rounded-xl p-4"
     style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
     <div className="flex items-center justify-between mb-4">
      <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>
       {selectedDistrict.name} — 取貨地點
       {editingScheduleId && (
        <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
         style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
         編輯模式
        </span>
       )}
      </div>
      <button onClick={addPoint}
       className="text-xs px-3 py-1.5 rounded-lg"
       style={{ background: 'var(--accent)', color: '#fff' }}>
       + 新增地點
      </button>
     </div>

     <div className="space-y-3">
      {points.map((p, i) => (
       <div key={i} className="rounded-lg p-3"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        {/* 標籤（唯讀，系統自動） + 地點 */}
        <div className="flex gap-2 mb-2 items-center">
         <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0"
          style={{ background: selectedDistrict.bg_color, color: selectedDistrict.color }}>
          {p.label}
         </div>
         <input
          className="flex-1 px-2 py-1.5 text-sm rounded-lg"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          value={p.location}
          onChange={e => updatePoint(i, 'location', e.target.value)}
          placeholder="取貨地點（必填）"
         />
        </div>
        {/* 時間 + 刪除 */}
        <div className="flex gap-2 items-center">
         <input
          className="flex-1 px-2 py-1.5 text-sm rounded-lg"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          value={p.start_time}
          onChange={e => updatePoint(i, 'start_time', e.target.value)}
          placeholder="20:00"
          maxLength={5}
         />
         <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>–</span>
         <input
          className="flex-1 px-2 py-1.5 text-sm rounded-lg"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          value={p.end_time}
          onChange={e => updatePoint(i, 'end_time', e.target.value)}
          placeholder="20:20"
          maxLength={5}
         />
         <button onClick={() => removePoint(i)}
          className="text-xs px-2 py-1.5 rounded-lg flex-shrink-0"
          style={{ color: '#c0392b', border: '1px solid #fcc', background: 'transparent' }}>
          刪除
         </button>
        </div>
       </div>
      ))}
     </div>

     {errors.length > 0 && (
      <div className="mt-3 rounded-lg p-3"
       style={{ background: '#fff5f5', border: '1px solid #fcc' }}>
       {errors.map((e, i) => (
        <div key={i} className="text-xs" style={{ color: '#c0392b' }}>• {e}</div>
       ))}
      </div>
     )}

     <div className="flex justify-end gap-2 mt-4">
      <button
       onClick={() => {
        setSelectedDistrict(null)
        setPoints([])
        setErrors([])
        setEditingScheduleId(null)
       }}
       className="text-sm px-4 py-2 rounded-lg"
       style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
       取消
      </button>
      <button onClick={handleSave} disabled={saving}
       className="text-sm px-4 py-2 rounded-lg font-medium"
       style={{ background: 'var(--accent)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
       {saving ? '儲存中...' : editingScheduleId ? '更新發布' : '送出發布'}
      </button>
     </div>
    </div>
   )}
  </div>
 )
}