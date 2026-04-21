import { useEffect, useRef, useState } from 'react'
import { dashboardApi } from '../api/client'
import type { DashboardStats, MonthlyIncome, Activity } from '../types'

declare const Chart: any

function formatMoney(v: number) {
  return '฿' + v.toLocaleString('th-TH', { minimumFractionDigits: 2 })
}

function timeAgo(dt: string) {
  const diff = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
  if (diff < 60) return `${diff} วินาทีที่แล้ว`
  if (diff < 3600) return `${Math.floor(diff/60)} นาทีที่แล้ว`
  if (diff < 86400) return `${Math.floor(diff/3600)} ชั่วโมงที่แล้ว`
  return `${Math.floor(diff/86400)} วันที่แล้ว`
}

const MODULE_ICON: Record<string, { icon: string; bg: string }> = {
  auth:    { icon: 'fas fa-sign-in-alt', bg: '#e3f2fd' },
  rooms:   { icon: 'fas fa-door-open',   bg: '#fff3e0' },
  tenants: { icon: 'fas fa-users',       bg: '#e8f5e9' },
  finance: { icon: 'fas fa-file-invoice-dollar', bg: '#fce4ec' },
  rates:   { icon: 'fas fa-sliders-h',   bg: '#f3e5f5' },
}

export default function Dashboard() {
  const [stats,   setStats]   = useState<DashboardStats | null>(null)
  const [chart6,  setChart6]  = useState<MonthlyIncome[]>([])
  const [recent,  setRecent]  = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const lineRef = useRef<HTMLCanvasElement>(null)
  const pieRef  = useRef<HTMLCanvasElement>(null)
  const lineChart = useRef<any>(null)
  const pieChart  = useRef<any>(null)

  useEffect(() => {
    dashboardApi.get().then(res => {
      if (res.success && res.data) {
        setStats(res.data.stats)
        setChart6(res.data.chart6months)
        setRecent(res.data.recent)
      }
      setLoading(false)
    })
  }, [])

  // Line chart — 6 month income
  useEffect(() => {
    if (!chart6.length || !lineRef.current) return
    if (lineChart.current) lineChart.current.destroy()
    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: chart6.map(d => d.label),
        datasets: [{
          label: 'รายรับ (฿)',
          data: chart6.map(d => d.value),
          borderColor: '#5c6bc0', backgroundColor: 'rgba(92,107,192,0.1)',
          borderWidth: 2, pointRadius: 4, tension: 0.3, fill: true,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    })
  }, [chart6])

  // Pie chart — room status
  useEffect(() => {
    if (!stats || !pieRef.current) return
    if (pieChart.current) pieChart.current.destroy()
    const rs = stats.room_status ?? {}
    pieChart.current = new Chart(pieRef.current, {
      type: 'doughnut',
      data: {
        labels: ['ว่าง', 'มีผู้เช่า', 'ซ่อมบำรุง'],
        datasets: [{
          data: [rs['vacant'] ?? 0, rs['occupied'] ?? 0, rs['maintenance'] ?? 0],
          backgroundColor: ['#43a047', '#fb8c00', '#e53935'],
        }],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    })
  }, [stats])

  if (loading) return <div className="text-center py-5"><i className="fas fa-spinner fa-spin fa-2x text-primary"></i></div>

  return (
    <>
      {/* Stats row */}
      <div className="row">
        {[
          { label: 'ห้องพักทั้งหมด',  value: stats?.total_rooms,    icon: 'fas fa-door-open',         bg: '#5c6bc0' },
          { label: 'ห้องว่าง',         value: stats?.vacant_rooms,   icon: 'fas fa-door-closed',       bg: '#43a047' },
          { label: 'ผู้เช่าปัจจุบัน', value: stats?.active_tenants, icon: 'fas fa-users',             bg: '#fb8c00' },
          { label: 'รายรับเดือนนี้',   value: formatMoney(stats?.monthly_income ?? 0), icon: 'fas fa-baht-sign', bg: '#e53935' },
        ].map((s, i) => (
          <div key={i} className="col-sm-6 col-xl-3">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: s.bg }}>
                <i className={s.icon}></i>
              </div>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header"><i className="fas fa-chart-line"></i>รายรับ 6 เดือนล่าสุด</div>
            <div className="card-body"><canvas ref={lineRef}></canvas></div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header"><i className="fas fa-chart-pie"></i>สถานะห้องพัก</div>
            <div className="card-body"><canvas ref={pieRef}></canvas></div>
          </div>
        </div>
      </div>

      {/* Recent activities */}
      <div className="card">
        <div className="card-header"><i className="fas fa-history"></i>กิจกรรมล่าสุด</div>
        <div className="card-body" style={{ padding: '8px 20px' }}>
          {recent.length === 0 && <p className="text-muted text-center py-3">ยังไม่มีกิจกรรม</p>}
          {recent.map(a => {
            const meta = MODULE_ICON[a.module] ?? { icon: 'fas fa-circle', bg: '#f5f5f5' }
            return (
              <div key={a.id} className="activity-item">
                <div className="activity-icon" style={{ background: meta.bg }}>
                  <i className={meta.icon} style={{ color: '#5c6bc0' }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="activity-desc">{a.description}</div>
                  <div className="activity-time">{a.full_name} · {timeAgo(a.created_at)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
