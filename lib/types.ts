export interface Schedule {
  id: string
  date: string
  district: string
  created_at: string
  pickup_points?: PickupPointDB[]
}

export interface PickupPointDB {
  id: string
  schedule_id: string
  label: string
  location: string
  start_time: string
  end_time: string
}

export interface OrderItem {
  id: number
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
