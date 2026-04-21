import { useEffect, useState } from 'react'
import { tenantsApi, roomsApi } from '../api/client'
import type { Tenant, Room } from '../types'

declare const $: any

function StatusBadge({ status }: { status: string }) {
  return status === 'active'
    ? <span className="badge badge-success">อยู่อาศัย</span>
    : <span className="badge badge-secondary">ย้ายออกแล้ว</span>
}

const BLANK_FORM = {
  room_id: 0, full_name: '', id_card: '', phone: '', email: '',
  address: '', emergency_contact: '', emergency_phone: '',
  start_date: new Date().toISOString().slice(0, 10), end_date: '',
  deposit: 0, notes: '',
}

export default function Tenants() {
  const [tenants,       setTenants]      = useState<Tenant[]>([])
  const [vacantRooms,   setVacantRooms]  = useState<Room[]>([])
  const [loading,       setLoading]      = useState(true)
  const [filterStatus,  setFilterStatus] = useState('active')
  const [search,        setSearch]       = useState('')
  const [form,          setForm]         = useState({ ...BLANK_FORM })
  const [editId,        setEditId]       = useState<number | null>(null)
  const [saving,        setSaving]       = useState(false)
  const [alert,         setAlert]        = useState<{ type: string; msg: string } | null>(null)

  const load = async () => {
    const [tr, rr] = await Promise.all([
      tenantsApi.list(),
      roomsApi.list(),
    ])
    if (tr.success) setTenants(tr.data!)
    if (rr.success) setVacantRooms(rr.data!.filter(r => r.status === 'vacant'))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const showAlert = (type: string, msg: string) => {
    setAlert({ type, msg }); setTimeout(() => setAlert(null), 3500)
  }

  const filtered = tenants.filter(t =>
    (filterStatus === 'all' || t.status === filterStatus) &&
    (!search || t.full_name.includes(search) || (t.room_number ?? '').includes(search))
  )

  const openAdd = () => {
    setForm({ ...BLANK_FORM }); setEditId(null)
    $('#tenantModal').modal('show')
  }
  const openEdit = (t: Tenant) => {
    setForm({
      room_id: t.room_id, full_name: t.full_name, id_card: t.id_card ?? '',
      phone: t.phone ?? '', email: t.email ?? '', address: t.address ?? '',
      emergency_contact: t.emergency_contact ?? '', emergency_phone: t.emergency_phone ?? '',
      start_date: t.start_date?.slice(0, 10) ?? '', end_date: t.end_date?.slice(0, 10) ?? '',
      deposit: t.deposit, notes: t.notes ?? '',
    })
    setEditId(t.id)
    $('#tenantModal').modal('show')
  }

  const handleSave = async () => {
    setSaving(true)
    const res = editId
      ? await tenantsApi.update(editId, form)
      : await tenantsApi.create(form)
    setSaving(false)
    if (res.success) {
      $('#tenantModal').modal('hide')
      showAlert('success', editId ? 'แก้ไขข้อมูลเรียบร้อย' : 'เพิ่มผู้เช่าเรียบร้อย')
      load()
    } else {
      showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
    }
  }

  const handleCheckout = async (t: Tenant) => {
    if (!window.confirm(`ยืนยันย้ายออก: ${t.full_name}?`)) return
    const res = await tenantsApi.checkout(t.id)
    if (res.success) { showAlert('success', 'ย้ายออกเรียบร้อย'); load() }
    else showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
  }

  const handleDelete = async (t: Tenant) => {
    if (!window.confirm(`ลบข้อมูล ${t.full_name}?`)) return
    const res = await tenantsApi.remove(t.id)
    if (res.success) { showAlert('success', 'ลบเรียบร้อย'); load() }
    else showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
  }

  if (loading) return <div className="text-center py-5"><i className="fas fa-spinner fa-spin fa-2x text-primary"></i></div>

  return (
    <>
      {alert && <div className={`alert alert-${alert.type} alert-dismissible`}>{alert.msg}<button className="close" onClick={() => setAlert(null)}><span>&times;</span></button></div>}

      {/* Filter bar */}
      <div className="card">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-auto">
              <select className="form-control form-control-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="active">อยู่อาศัย</option>
                <option value="inactive">ย้ายออกแล้ว</option>
                <option value="all">ทั้งหมด</option>
              </select>
            </div>
            <div className="col-auto">
              <input className="form-control form-control-sm" placeholder="ค้นหาชื่อ / ห้อง..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            </div>
            <div className="col-auto ml-auto">
              <button className="btn btn-primary btn-sm" onClick={openAdd}>
                <i className="fas fa-user-plus mr-1"></i>เพิ่มผู้เช่า
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <i className="fas fa-users"></i>รายชื่อผู้เช่า
          <span className="badge badge-primary ml-2">{filtered.length} รายการ</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>ห้อง</th>
                  <th>โทรศัพท์</th>
                  <th>วันที่เข้าอยู่</th>
                  <th>มัดจำ</th>
                  <th>สถานะ</th>
                  <th style={{ minWidth: 160 }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id}>
                    <td>{i + 1}</td>
                    <td><strong>{t.full_name}</strong></td>
                    <td>{t.room_number ? <span className="badge badge-primary">ห้อง {t.room_number}</span> : '-'}</td>
                    <td>{t.phone || '-'}</td>
                    <td>{t.start_date?.slice(0, 10) || '-'}</td>
                    <td>฿{Number(t.deposit).toLocaleString()}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm btn-outline-primary mr-1" onClick={() => openEdit(t)}>
                        <i className="fas fa-edit mr-1"></i>แก้ไข
                      </button>
                      {t.status === 'active' && (
                        <button className="btn btn-sm btn-outline-warning mr-1" onClick={() => handleCheckout(t)}>
                          <i className="fas fa-sign-out-alt mr-1"></i>ย้ายออก
                        </button>
                      )}
                      {t.status === 'inactive' && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(t)}>
                          <i className="fas fa-trash mr-1"></i>ลบ
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-4">ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      <div className="modal fade" id="tenantModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editId ? 'แก้ไขข้อมูลผู้เช่า' : 'เพิ่มผู้เช่า'}</h5>
              <button className="close" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div className="modal-body">
              <div className="row">
                {!editId && (
                  <div className="col-md-6">
                    <div className="form-group">
                      <label>ห้องพัก *</label>
                      <select className="form-control" value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: +e.target.value }))}>
                        <option value={0}>-- เลือกห้อง --</option>
                        {vacantRooms.map(r => (
                          <option key={r.id} value={r.id}>ห้อง {r.room_number} (ชั้น {r.floor}) — ฿{Number(r.rent_price).toLocaleString()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="col-md-6">
                  <div className="form-group">
                    <label>ชื่อ-นามสกุล *</label>
                    <input className="form-control" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>เลขบัตรประชาชน</label>
                    <input className="form-control" value={form.id_card} onChange={e => setForm(f => ({ ...f, id_card: e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>โทรศัพท์</label>
                    <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>อีเมล</label>
                    <input type="email" className="form-control" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>มัดจำ (บาท)</label>
                    <input type="number" className="form-control" value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: +e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>วันที่เข้าอยู่</label>
                    <input type="date" className="form-control" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>วันที่สิ้นสุดสัญญา</label>
                    <input type="date" className="form-control" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="col-12">
                  <div className="form-group">
                    <label>ที่อยู่</label>
                    <textarea className="form-control" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>ผู้ติดต่อฉุกเฉิน</label>
                    <input className="form-control" value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>เบอร์ฉุกเฉิน</label>
                    <input className="form-control" value={form.emergency_phone} onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))} />
                  </div>
                </div>
                <div className="col-12">
                  <div className="form-group">
                    <label>หมายเหตุ</label>
                    <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
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
