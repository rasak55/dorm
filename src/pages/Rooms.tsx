import { useEffect, useState } from 'react'
import { roomsApi } from '../api/client'
import type { Room } from '../types'

declare const $: any

const ROOM_TYPES = ['standard', 'deluxe', 'suite', 'studio']
const TYPE_LABEL: Record<string, string> = { standard: 'Standard', deluxe: 'Deluxe', suite: 'Suite', studio: 'Studio' }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    vacant:      ['ว่าง', 'badge-vacant'],
    occupied:    ['มีผู้เช่า', 'badge-occupied'],
    maintenance: ['ซ่อมบำรุง', 'badge-maintenance'],
  }
  const [label, cls] = map[status] ?? [status, 'badge-secondary']
  return <span className={`badge ${cls}`}>{label}</span>
}

const BLANK: Partial<Room> = { room_number: '', floor: 1, room_type: 'standard', rent_price: 0, status: 'vacant', description: '' }

export default function Rooms() {
  const [rooms,   setRooms]   = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState({ status: '', floor: '' })
  const [form,    setForm]    = useState<Partial<Room>>(BLANK)
  const [editId,  setEditId]  = useState<number | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [alert,   setAlert]   = useState<{ type: string; msg: string } | null>(null)

  const load = () => roomsApi.list().then(r => { if (r.success) setRooms(r.data!); setLoading(false) })
  useEffect(() => { load() }, [])

  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b)

  const filtered = rooms.filter(r =>
    (!filter.status || r.status === filter.status) &&
    (!filter.floor  || r.floor === +filter.floor)
  )

  const showAlert = (type: string, msg: string) => {
    setAlert({ type, msg })
    setTimeout(() => setAlert(null), 3500)
  }

  const openAdd = () => {
    setForm(BLANK); setEditId(null)
    $('#roomModal').modal('show')
  }
  const openEdit = (r: Room) => {
    setForm({ ...r }); setEditId(r.id)
    $('#roomModal').modal('show')
  }

  const handleSave = async () => {
    setSaving(true)
    const res = editId
      ? await roomsApi.update(editId, form)
      : await roomsApi.create(form)
    setSaving(false)
    if (res.success) {
      $('#roomModal').modal('hide')
      showAlert('success', editId ? 'แก้ไขห้องเรียบร้อย' : 'เพิ่มห้องเรียบร้อย')
      load()
    } else {
      showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
    }
  }

  const handleDelete = async (r: Room) => {
    if (!window.confirm(`ลบห้อง ${r.room_number}?`)) return
    const res = await roomsApi.remove(r.id)
    if (res.success) { showAlert('success', 'ลบเรียบร้อย'); load() }
    else showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
  }

  if (loading) return <div className="text-center py-5"><i className="fas fa-spinner fa-spin fa-2x text-primary"></i></div>

  return (
    <>
      {alert && <div className={`alert alert-${alert.type} alert-dismissible`}>{alert.msg}<button className="close" onClick={() => setAlert(null)}><span>&times;</span></button></div>}

      {/* Filter + Add */}
      <div className="card">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-auto">
              <select className="form-control form-control-sm" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
                <option value="">ทุกสถานะ</option>
                <option value="vacant">ว่าง</option>
                <option value="occupied">มีผู้เช่า</option>
                <option value="maintenance">ซ่อมบำรุง</option>
              </select>
            </div>
            <div className="col-auto">
              <select className="form-control form-control-sm" value={filter.floor} onChange={e => setFilter(f => ({ ...f, floor: e.target.value }))}>
                <option value="">ทุกชั้น</option>
                {floors.map(f => <option key={f} value={f}>ชั้น {f}</option>)}
              </select>
            </div>
            <div className="col-auto ml-auto">
              <button className="btn btn-primary btn-sm" onClick={openAdd}>
                <i className="fas fa-plus mr-1"></i>เพิ่มห้อง
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="room-grid">
        {filtered.map(r => (
          <div key={r.id} className="room-card" onClick={() => openEdit(r)}>
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <div className="room-card-number">ห้อง {r.room_number}</div>
                <div className="room-card-floor">ชั้น {r.floor} · {TYPE_LABEL[r.room_type] ?? r.room_type}</div>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <div className="room-card-price">฿{Number(r.rent_price).toLocaleString()} / เดือน</div>
            {r.tenant_name && <div className="room-card-tenant mt-1"><i className="fas fa-user mr-1"></i>{r.tenant_name}</div>}
            <div className="mt-2 d-flex" style={{ gap: 6 }}>
              <button className="btn btn-sm btn-outline-primary" onClick={e => { e.stopPropagation(); openEdit(r) }}>
                <i className="fas fa-edit mr-1"></i>แก้ไข
              </button>
              {r.status !== 'occupied' && (
                <button className="btn btn-sm btn-outline-danger" onClick={e => { e.stopPropagation(); handleDelete(r) }}>
                  <i className="fas fa-trash mr-1"></i>ลบ
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: '#8892a4' }}>
            <i className="fas fa-door-open fa-2x mb-2 d-block"></i>ไม่พบห้องพัก
          </div>
        )}
      </div>

      {/* Modal */}
      <div className="modal fade" id="roomModal" tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editId ? 'แก้ไขห้องพัก' : 'เพิ่มห้องพัก'}</h5>
              <button className="close" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-6">
                  <div className="form-group">
                    <label>เลขห้อง *</label>
                    <input className="form-control" value={form.room_number ?? ''} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label>ชั้น *</label>
                    <input type="number" className="form-control" value={form.floor ?? 1} onChange={e => setForm(f => ({ ...f, floor: +e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-6">
                  <div className="form-group">
                    <label>ประเภทห้อง</label>
                    <select className="form-control" value={form.room_type ?? 'standard'} onChange={e => setForm(f => ({ ...f, room_type: e.target.value as Room['room_type'] }))}>
                      {ROOM_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label>ค่าเช่า (บาท/เดือน)</label>
                    <input type="number" className="form-control" value={form.rent_price ?? 0} onChange={e => setForm(f => ({ ...f, rent_price: +e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>สถานะ</label>
                <select className="form-control" value={form.status ?? 'vacant'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Room['status'] }))}>
                  <option value="vacant">ว่าง</option>
                  <option value="occupied">มีผู้เช่า</option>
                  <option value="maintenance">ซ่อมบำรุง</option>
                </select>
              </div>
              <div className="form-group">
                <label>หมายเหตุ</label>
                <textarea className="form-control" rows={2} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-dismiss="modal">ยกเลิก</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><i className="fas fa-spinner fa-spin mr-1"></i>บันทึก...</> : <><i className="fas fa-save mr-1"></i>บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
