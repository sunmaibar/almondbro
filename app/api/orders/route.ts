import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RATE_LIMIT = 3
const RATE_WINDOW_MINUTES = 30

export async function POST(req: NextRequest) {
  const body = await req.json()

  // 1. Honeypot 檢查
  if (body._trap) {
    return NextResponse.json({ error: 'blocked' }, { status: 400 })
  }

  // 2. 最短提交時間（頁面載入後至少 5 秒）
  if (!body._ts || Date.now() - body._ts < 5000) {
    return NextResponse.json({ error: 'too_fast' }, { status: 429 })
  }

  // 3. IP rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const windowStart = new Date(
    Date.now() - RATE_WINDOW_MINUTES * 60 * 1000
  ).toISOString()

  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('customer_ip', ip)
    .gte('created_at', windowStart)

  if ((count ?? 0) >= RATE_LIMIT) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  // 4. 基本欄位驗證
  const {
    customer_name,
    customer_phone,
    customer_gender,
    district,
    pickup_point_label,
    items,
    total_amount,
  } = body

  if (
    !customer_name ||
    !customer_phone ||
    !district ||
    !pickup_point_label ||
    !items?.length
  ) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  if (!/^09\d{8}$/.test(customer_phone)) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 400 })
  }

  // 5. 寫入訂單
  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_name,
      customer_phone,
      customer_gender: customer_gender ?? '',
      district,
      pickup_point_label,
      items,
      total_amount,
      customer_ip: ip,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ success: true, order: data })
}
