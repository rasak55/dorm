import { useEffect, useState, useCallback } from 'react'
import { activitiesApi } from '../api/client'
import type { Activity } from '../types'

const MODULE_LABELS: Record<string, string> = {
  auth: 'ล็อกอิน', rooms: 'ห้องพัก', tenants: 'ผู้เช่า', finance: 'การเงิน', rates: 'เรท', history: 'ประวัติ',
}
const MODULE_COLORS: Record<string, string> = {
  auth: '#e3f2fd', rooms: '#fff3e0', tenants: '#e8f5e9', finance: '#fce4ec', rates: '#f3e5f5', history: '#f5f5f5',
}
const MODULE_ICON: Record<string, string> = {
  auth: 'fas fa-sign-in-alt', rooms: 'fas fa-door-open', tenants: 'fas fa-users',
  finance: 'fas fa-file-invoice-dollar', rates: 'fas fa-sliders-h', history: 'fas fa-history',
}

function timeStr(dt: string) {
  const d = new Date(dt)
  return d.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function History() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState({ module: '', search: '', date: '' })
  const [alert,      setAlert]      = useState<{ type: string; msg: string } | null>(null)

  const showAlert = (type: string, msg: string) => {
    setAlert({ type, msg }); setTimeout(() => setAlert(null), 3500)
  }

  const load = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (filter.module) params.module = filter.module
    if (filter.search) params.search = filter.search
    if (filter.date)   params.date   = filter.date
    activitiesApi.list(params).then(r => {
      if (r.success) setActivities(r.data!)
      setLoading(false)
    })
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleClear = async (days: number) => {
    if (!window.confirm(`ลบ log เก่ากว่า ${days} วัน?`)) return
    const res = await activitiesApi.clear(days)
    if (res.success) { showAlert('success', (res as any).data?.message ?? 'ลบเรียบร้อย'); load() }
    else showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
  }

  return (
    <>
      {alert && <div className={`alert alert-${alert.type} alert-dismissible`}>{alert.msg}<button className="close" onClick={() => setAlert(null)}><span>&times;</span></button></div>}

      {/* Filter */}
      <div className="card">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-auto">
              <select className="form-control form-control-sm" value={filter.module} onChange={e => setFilter(f => ({ ...f, module: e.target.value }))}>
                <option value="">ทุกโมดูล</option>
                {Object.entries(MODULE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="col-auto">
              <input type="date" className="form-control form-control-sm" value={filter.date} onChange={e => setFilter(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="col-auto">
              <input className="form-control form-control-sm" placeholder="ค้นหา..." value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} style={{ width: 180 }} />
            </div>
            <div className="col-auto ml-auto">
              <div className="dropdown">
                <button className="btn btn-outline-danger btn-sm dropdown-toggle" data-toggle="dropdown">
                  <i className="fas fa-trash mr-1"></i>ล้าง log เก่า
                </button>
                <div className="dropdown-menu dropdown-menu-right">
                  <button className="dropdown-item" onClick={() => handleClear(30)}>เก่ากว่า 30 วัน</button>
                  <button className="dropdown-item" onClick={() => handleClear(90)}>เก่ากว่า 90 วัน</button>
                  <button className="dropdown-item" onClick={() => handleClear(365)}>เก่ากว่า 1 ปี</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <i className="fas fa-history"></i>ประวัติกิจกรรม
          <span className="badge badge-primary ml-2">{activities.length} รายการ</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr><th>#</th><th>การกระทำ</th><th>รายละเอียด</th><th>โมดูล</th><th>ผู้ใช้</th><th>เวลา</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-4"><i className="fas fa-spinner fa-spin"></i></td></tr>
                ) : activities.map((a, i) => (
                  <tr key={a.id}>
                    <td>{i + 1}</td>
                    <td><code style={{ fontSize: '0.8rem', background: '#f5f6fa', padding: '2px 6px', borderRadius: 4 }}>{a.action}</code></td>
                    <td>{a.description}</td>
                    <td>
                      <span style={{ background: MODULE_COLORS[a.module] ?? '#f5f5f5', padding: '3px 8px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600 }}>
                        <i className={`${MODULE_ICON[a.module] ?? 'fas fa-circle'} mr-1`} style={{ fontSize: '0.7rem' }}></i>
                        {MODULE_LABELS[a.module] ?? a.module}
                      </span>
                    </td>
                    <td>{a.full_name ?? '-'}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: '#8892a4' }}>{timeStr(a.created_at)}</td>
                  </tr>
                ))}
                {!loading && activities.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted py-4">ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
