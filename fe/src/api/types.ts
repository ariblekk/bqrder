export type Role = 'super_admin' | 'branch_admin' | 'cashier'

export interface User {
  id: number
  branch_id: number
  name: string
  email: string
  role: Role
  is_active: boolean
  created_at?: string
}

export interface AuthData {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

export interface Branch {
  id: number
  name: string
  address?: string
  phone?: string
  is_active: boolean
}

export interface Table {
  id: number
  branch_id: number
  table_number: string
  qr_token: string
  qr_link: string
  capacity: number
  is_active: boolean
}

export interface Category {
  id: number
  branch_id: number
  name: string
  description?: string
  created_at?: string
}

export interface Product {
  id: number
  branch_id: number
  category_id: number
  category_name?: string
  name: string
  description?: string
  price: number
  stock: number
  image_url?: string
  is_active: boolean
}

export interface ProductList extends Envelope<Product[]> {
  total: number
  page: number
  limit: number
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  product_name: string
  quantity: number
  price: number
  notes?: string
  subtotal: number
}

export interface Order {
  id: number
  branch_id: number
  order_number: string
  table_id?: number
  table_number?: string
  customer_name: string
  total_amount: number
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method?: string | null
  created_at: string
  updated_at?: string
  items: OrderItem[]
}

export interface MenuProduct {
  id: number
  name: string
  description?: string
  price: number
  stock: number
  image_url?: string
}

export interface MenuCategory {
  id: number
  name: string
  description?: string
  products: MenuProduct[]
}

export interface SalesSummary {
  total_orders: number
  total_revenue: number
  completed_orders: number
  cancelled_orders: number
  pending_orders: number
  average_order_value: number
}

export interface DailySales {
  date: string
  total_orders: number
  total_revenue: number
}

export interface TopProduct {
  product_id: number
  product_name: string
  total_sold: number
  total_revenue: number
}

export interface CustomReport {
  period: string
  start_date: string
  end_date: string
  summary: SalesSummary
  daily_sales: DailySales[]
  top_products: TopProduct[]
}