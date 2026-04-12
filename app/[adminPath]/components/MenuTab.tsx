'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { MenuItemDB } from '../page'

interface Props {
 menuItems: MenuItemDB[]
 onUpdate: () => void
}

interface NewItemForm {
 name: string
 price: string
 description: string
}

export default function MenuTab({ menuItems, onUpdate }: Props) {
 const [editingId, setEditingId] = useState<number | null>(null)
 const [editName, setEditName] = useState('')
 const [editPrice, setEditPrice] = useState('')
 const [editDesc, setEditDesc] = useState('')
 const [uploadingId, setUploadingId] = useState<number | null>(null)
 const [pendingUploadId, setPendingUploadId] = useState<number | null>(null)
 const fileInputRef = useRef<HTMLInputElement>(null)

 // 新增品項
 const [showAddForm, setShowAddForm] = useState(false)
 const [newItem, setNewItem] = useState<NewItemForm>({ name: '', price: '', description: '' })
 const [addingItem, setAddingItem] = useState(false)
 const [newItemError, setNewItemError] = useState('')

 function startEdit(item: MenuItemDB) {
  setEditingId(item.id)
  setEditName(item.name)
  setEditPrice(String(item.price))
  setEditDesc(item.description ?? '')
 }

 async function saveEdit(id: number) {
  if (!editName.trim() || !editPrice) return
  await supabase
   .from('menu_items')
   .update({ name: editName.trim(), price: Number(editPrice), description: editDesc })
   .eq('id', id)
  setEditingId(null)
  onUpdate()
 }

 async function deleteItem(id: number) {
  if (!confirm('確定刪除此品項？')) return
  await supabase.from('menu_items').delete().eq('id', id)
  onUpdate()
 }

 async function handleAddItem() {
  setNewItemError('')
  if (!newItem.name.trim()) { setNewItemError('品名不能為空'); return }
  if (!newItem.price || Number(newItem.price) <= 0) { setNewItemError('請輸入有效價格'); return }
  setAddingItem(true)

  // 自動產生 id（取現有最大值 +1）
  const maxId = menuItems.length > 0 ? Math.max(...menuItems.map(m => m.id)) : 0
  const newId = maxId + 1

  await supabase.from('menu_items').insert({
   id: newId,
   name: newItem.name.trim(),
   price: Number(newItem.price),
   description: newItem.description ?? '',
   emoji: '🍱',
   image_url: '',
  })

  setNewItem({ name: '', price: '', description: '' })
  setShowAddForm(false)
  setAddingItem(false)
  onUpdate()
 }

 async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, itemId: number) {
  const file = e.target.files?.[0]
  if (!file) return
  setUploadingId(itemId)

  const ext = file.name.split('.').pop()
  const fileName = `item-${itemId}-${Date.now()}.${ext}`

  const { data: uploadData, error } = await supabase.storage
   .from('menu-images')
   .upload(fileName, file, { upsert: true })

  if (!error) {
   const { data: urlData } = supabase.storage
    .from('menu-images')
    .getPublicUrl(fileName)

   // 強制加 cache-busting 讓圖片立即顯示
   const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`

   await supabase
    .from('menu_items')
    .update({ image_url: urlData.publicUrl })
    .eq('id', itemId)

   onUpdate()
  }

  setUploadingId(null)
  if (fileInputRef.current) fileInputRef.current.value = ''
 }

 return (
  <div className="max-w-xl mx-auto">
   <div className="flex items-center justify-between mb-5">
    <h1 className="text-lg font-medium hidden md:block" style={{ color: 'var(--text)' }}>菜單管理</h1>
    <button
     onClick={() => setShowAddForm(v => !v)}
     className="text-sm px-4 py-2 rounded-lg font-medium ml-auto"
     style={{ background: 'var(--accent)', color: '#fff' }}>
     + 新增品項
    </button>
   </div>

   {/* 新增品項表單 */}
   {showAddForm && (
    <div className="rounded-xl p-4 mb-4"
     style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
     <div className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>新增品項</div>
     <div className="space-y-2">
      <input
       className="w-full px-3 py-2 text-sm rounded-lg"
       style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
       placeholder="品名（必填）"
       value={newItem.name}
       onChange={e => setNewItem(v => ({ ...v, name: e.target.value }))}
       autoFocus
      />
      <div className="flex items-center gap-2">
       <span className="text-sm flex-shrink-0" style={{ color: 'var(--text-muted)' }}>$</span>
       <input
        type="number"
        className="w-32 px-3 py-2 text-sm rounded-lg"
        style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
        placeholder="價格（必填）"
        value={newItem.price}
        onChange={e => setNewItem(v => ({ ...v, price: e.target.value }))}
       />
      </div>
      <input
       className="w-full px-3 py-2 text-sm rounded-lg"
       style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
       placeholder="描述（選填）"
       value={newItem.description}
       onChange={e => setNewItem(v => ({ ...v, description: e.target.value }))}
      />
      {newItemError && (
       <div className="text-xs" style={{ color: '#c0392b' }}>• {newItemError}</div>
      )}
      <div className="flex gap-2 pt-1">
       <button
        onClick={handleAddItem}
        disabled={addingItem}
        className="text-sm px-4 py-2 rounded-lg flex-1"
        style={{ background: 'var(--accent)', color: '#fff', opacity: addingItem ? 0.7 : 1 }}>
        {addingItem ? '新增中...' : '確認新增'}
       </button>
       <button
        onClick={() => { setShowAddForm(false); setNewItem({ name: '', price: '', description: '' }); setNewItemError('') }}
        className="text-sm px-4 py-2 rounded-lg"
        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        取消
       </button>
      </div>
     </div>
    </div>
   )}

   {/* hidden file input */}
   <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    className="hidden"
    onChange={e => pendingUploadId !== null && handleImageUpload(e, pendingUploadId)}
   />

   {/* 品項列表 */}
   <div className="rounded-xl overflow-hidden"
    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
    {menuItems.length === 0 ? (
     <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
      尚無品項，點上方「+ 新增品項」開始新增
     </div>
    ) : (
     menuItems.map((item, i) => (
      <div key={item.id}
       style={{ borderBottom: i < menuItems.length - 1 ? '1px solid var(--border)' : 'none' }}>

       {/* 圖片區 */}
       <div className="relative w-full overflow-hidden"
        style={{ height: item.image_url ? '180px' : '48px', background: 'var(--bg)', transition: 'height 0.2s' }}>
        {item.image_url ? (
         <img
          src={`${item.image_url}?t=${Date.now()}`}
          alt={item.name}
          className="w-full h-full object-cover"
          key={item.image_url}
         />
        ) : (
         <div className="flex items-center px-4 h-full">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>尚無產品照片</span>
         </div>
        )}
        <button
         onClick={() => {
          setPendingUploadId(item.id)
          setTimeout(() => fileInputRef.current?.click(), 50)
         }}
         disabled={uploadingId === item.id}
         className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded-lg"
         style={{
          background: uploadingId === item.id ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.6)',
          color: '#fff',
          cursor: uploadingId === item.id ? 'not-allowed' : 'pointer',
         }}>
         {uploadingId === item.id
          ? '上傳中...'
          : item.image_url ? '更換照片' : '上傳照片'}
        </button>
       </div>

       {/* 資訊區 */}
       <div className="px-4 py-3">
        {editingId === item.id ? (
         <div className="space-y-2">
          <input
           className="w-full px-2 py-1.5 text-sm rounded-lg"
           style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
           value={editName}
           onChange={e => setEditName(e.target.value)}
           placeholder="品名"
          />
          <div className="flex gap-2 items-center">
           <span className="text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
           <input
            type="number"
            className="w-24 px-2 py-1.5 text-sm rounded-lg"
            style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            value={editPrice}
            onChange={e => setEditPrice(e.target.value)}
           />
          </div>
          <input
           className="w-full px-2 py-1.5 text-sm rounded-lg"
           style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
           value={editDesc}
           onChange={e => setEditDesc(e.target.value)}
           placeholder="描述（選填）"
          />
          <div className="flex gap-2">
           <button onClick={() => saveEdit(item.id)}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            儲存
           </button>
           <button onClick={() => setEditingId(null)}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            取消
           </button>
          </div>
         </div>
        ) : (
         <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
           <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.name}</div>
           {item.description && (
            <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
             {item.description}
            </div>
           )}
          </div>
          <span className="text-sm font-medium flex-shrink-0" style={{ color: 'var(--accent)' }}>
           ${item.price}
          </span>
          <button onClick={() => startEdit(item)}
           className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
           style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
           編輯
          </button>
          <button onClick={() => deleteItem(item.id)}
           className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
           style={{ color: '#c0392b', border: '1px solid #fcc' }}>
           刪除
          </button>
         </div>
        )}
       </div>
      </div>
     ))
    )}
   </div>
  </div>
 )
}