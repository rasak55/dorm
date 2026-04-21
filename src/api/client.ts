import type { ApiResponse } from '../types'

// ===== URL ของ Apps Script Web App =====
// Dev: ใช้ /gas (Vite proxy → GAS) เพื่อหลีกเลี่ยง CORS redirect issue
// Prod: ใช้ VITE_GAS_URL โดยตรง
const _RAW_GAS_URL = (import.meta.env.VITE_GAS_URL as string) || ''
const GAS_URL = import.meta.env.DEV ? '/gas' : _RAW_GAS_URL

// ===== Token จาก localStorage =====
function getToken(): string {
  return localStorage.getItem('dorm_token') || ''
}
export function setToken(token: string) {
  localStorage.setItem('dorm_token', token)
}
export function clearToken() {
  localStorage.removeItem('dorm_token')
}

// ===== แปลง response เป็น JSON อย่างปลอดภัย =====
async function safeJson<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text()
  if (!text) return { success: false, message: 'Server ไม่ตอบกลับ (empty response)' }
  try {
    return JSON.parse(text) as ApiResponse<T>
  } catch {
    // GAS อาจ return HTML error page
    const snippet = text.slice(0, 120)
    console.error('Non-JSON response:', snippet)
    return { success: false, message: 'ตอบกลับไม่ใช่ JSON — ตรวจสอบ GAS URL หรือ deployment' }
  }
}

// ===== GET request =====
async function get<T>(resource: string, params: Record<string, string | number> = {}): Promise<ApiResponse<T>> {
  if (!_RAW_GAS_URL) return { success: false, message: 'ยังไม่ได้ตั้งค่า VITE_GAS_URL ใน .env' }
  const token = getToken()
  const p = new URLSearchParams({ resource, token: token || '' })
  Object.entries(params).forEach(([k, v]) => p.set(k, String(v)))
  const res = await fetch(`${GAS_URL}?${p.toString()}`)
  return safeJson<T>(res)
}

// ===== POST request (form-encoded เพื่อหลีกเลี่ยง CORS preflight) =====
async function post<T>(resource: string, action: string, data: Record<string, string | number> = {}): Promise<ApiResponse<T>> {
  if (!_RAW_GAS_URL) return { success: false, message: 'ยังไม่ได้ตั้งค่า VITE_GAS_URL ใน .env' }
  const token = getToken()
  const body  = new URLSearchParams({ resource, action, token: token || '' })
  Object.entries(data).forEach(([k, v]) => body.set(k, String(v ?? '')))
  const res = await fetch(GAS_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
    redirect: 'follow',
  })
  return safeJson<T>(res)
}

// ===== Auth =====
export const authApi = {
  me:     () => get<import('../types').User>('auth', { action: 'me' }),
  login:  (username: string, password: string) =>
    post<import('../types').User & { token: string }>('auth', 'login', { username, password }),
  logout: () => post('auth', 'logout'),
}

// ===== Dashboard =====
export const dashboardApi = {
  get: () => get<{
    stats:        import('../types').DashboardStats
    chart6months: import('../types').MonthlyIncome[]
    recent:       import('../types').Activity[]
  }>('dashboard'),
}

// ===== Rooms =====
export const roomsApi = {
  list:   () => get<import('../types').Room[]>('rooms'),
  create: (data: Record<string, unknown>) => post<import('../types').Room>('rooms', 'create', data as Record<string, string | number>),
  update: (id: number, data: Record<string, unknown>) => post<import('../types').Room>('rooms', 'update', { id, ...data } as Record<string, string | number>),
  remove: (id: number) => post('rooms', 'delete', { id }),
}

// ===== Tenants =====
export const tenantsApi = {
  list:     (status?: string) => get<import('../types').Tenant[]>('tenants', status ? { status } : {}),
  create:   (data: Record<string, unknown>) => post<import('../types').Tenant>('tenants', 'create', data as Record<string, string | number>),
  update:   (id: number, data: Record<string, unknown>) => post<import('../types').Tenant>('tenants', 'update', { id, ...data } as Record<string, string | number>),
  checkout: (id: number) => post('tenants', 'checkout', { id }),
  remove:   (id: number) => post('tenants', 'delete', { id }),
}

// ===== Bills =====
export const billsApi = {
  list:          (month: number, year: number, status?: string) => get<import('../types').Bill[]>('bills', { month, year, ...(status ? { status } : {}) }),
  occupiedRooms: () => get<import('../types').OccupiedRoom[]>('bills', { action: 'occupied_rooms' }),
  create:        (data: Record<string, unknown>) => post<import('../types').Bill>('bills', 'create', data as Record<string, string | number>),
  createAll:     (month: number, year: number) => post<{ created: number; skipped: number }>('bills', 'create_all', { month, year }),
  update:        (id: number, data: Record<string, unknown>) => post<import('../types').Bill>('bills', 'update', { id, ...data } as Record<string, string | number>),
  remove:        (id: number) => post('bills', 'delete', { id }),
}

// ===== Rates =====
export const ratesApi = {
  list:       () => get<import('../types').UtilityRate[]>('rates'),
  create:     (data: Record<string, unknown>) => post<import('../types').UtilityRate>('rates', 'create', data as Record<string, string | number>),
  update:     (id: number, data: Record<string, unknown>) => post<import('../types').UtilityRate>('rates', 'update', { id, ...data } as Record<string, string | number>),
  setCurrent: (id: number) => post('rates', 'set_current', { id }),
  remove:     (id: number) => post('rates', 'delete', { id }),
}

// ===== Reports =====
export const reportsApi = {
  get: (year: number) => get('reports', { year }),
}

// ===== Activities =====
export const activitiesApi = {
  list:  (params: Record<string, string> = {}) => get<import('../types').Activity[]>('activities', params),
  clear: (days: number) => post('activities', 'clear', { days }),
}
