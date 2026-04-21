import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi, setToken, clearToken } from '../api/client'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // ตรวจสอบ token ที่เก็บไว้ตอน app โหลด
  useEffect(() => {
    authApi.me().then(res => {
      if (res.success && res.data) setUser(res.data)
      else clearToken()
      setLoading(false)
    }).catch(() => {
      clearToken()
      setLoading(false)
    })
  }, [])

  const login = async (username: string, password: string): Promise<string | null> => {
    const res = await authApi.login(username, password)
    if (res.success && res.data) {
      // บันทึก token ลง localStorage
      setToken((res.data as User & { token: string }).token)
      setUser({ id: res.data.id, username: res.data.username, full_name: res.data.full_name, role: res.data.role })
      return null
    }
    return res.message ?? 'เกิดข้อผิดพลาด'
  }

  const logout = async () => {
    await authApi.logout()
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
