// ===== Auth =====
export interface User {
  id: number
  username: string
  full_name: string
  role: 'admin' | 'staff'
}

// ===== Rooms =====
export interface Room {
  id: number
  room_number: string
  floor: number
  room_type: 'standard' | 'deluxe' | 'suite' | 'studio'
  rent_price: number
  status: 'vacant' | 'occupied' | 'maintenance'
  description?: string
  tenant_name?: string
  created_at: string
  updated_at: string
}

// ===== Tenants =====
export interface Tenant {
  id: number
  room_id: number
  full_name: string
  id_card?: string
  phone?: string
  email?: string
  address?: string
  emergency_contact?: string
  emergency_phone?: string
  start_date: string
  end_date?: string
  deposit: number
  status: 'active' | 'inactive'
  notes?: string
  room_number?: string
  created_at: string
  updated_at: string
}

// ===== Utility Rates =====
export interface UtilityRate {
  id: number
  name: string
  electric_rate: number
  water_rate: number
  other_fee: number
  effective_date: string
  notes?: string
  created_at: string
  is_current?: boolean
}

// ===== Bills =====
export interface Bill {
  id: number
  room_id: number
  tenant_id: number
  bill_month: number
  bill_year: number
  rent_amount: number
  electric_units: number
  electric_amount: number
  water_units: number
  water_amount: number
  other_amount: number
  other_description?: string
  total_amount: number
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
  notes?: string
  room_number?: string
  tenant_name?: string
  prev_electric?: number
  curr_electric?: number
  prev_water?: number
  curr_water?: number
  created_at: string
  updated_at: string
}

// ===== Activities =====
export interface Activity {
  id: number
  user_id?: number
  action: string
  description: string
  module: string
  ref_id?: number
  full_name?: string
  created_at: string
}

// ===== Dashboard =====
export interface DashboardStats {
  total_rooms: number
  vacant_rooms: number
  occupied_rooms: number
  maintenance_rooms: number
  active_tenants: number
  monthly_income: number
  pending_bills: number
  overdue_bills: number
  room_status: Record<string, number>
}

export interface MonthlyIncome {
  label: string
  value: number
  month: number
  year: number
}

// ===== API Response =====
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
}

// ===== Occupied Room (for bill creation) =====
export interface OccupiedRoom {
  id: number
  room_number: string
  floor: number
  rent_price: number
  tenant_name: string
  last_electric?: number
  last_water?: number
  last_meter_month?: number
  last_meter_year?: number
}
