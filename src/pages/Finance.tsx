import { useEffect, useState, useCallback } from 'react'
import { billsApi, ratesApi } from '../api/client'
import type { Bill, OccupiedRoom, UtilityRate } from '../types'

declare const $: any

const THAI_MONTHS = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

function fmoney(v: number) { return '฿' + v.toLocaleString('th-TH', { minimumFractionDigits: 2 }) }
function fnum(v: number)   { return v.toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

function BillStatus({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending: ['รอชำระ', 'badge-warning'],
    paid:    ['ชำระแล้ว', 'badge-success'],
    overdue: ['เกินกำหนด', 'badge-danger'],
  }
  const [label, cls] = map[status] ?? [status, 'badge-secondary']
  return <span className={`badge ${cls}`}>{label}</span>
}

const lastMonthDate = new Date(new Date().setMonth(new Date().getMonth() - 1))

const BLANK_BILL = {
  room_id: 0, bill_month: lastMonthDate.getMonth() + 1, bill_year: lastMonthDate.getFullYear(),
  rent_amount: 0, prev_electric: 0, curr_electric: 0,
  prev_water: 0, curr_water: 0, other_amount: 0,
}

export default function Finance() {
  const now = new Date()
  const [filterMonth, setFilterMonth] = useState(lastMonthDate.getMonth() + 1)
  const [filterYear,  setFilterYear]  = useState(lastMonthDate.getFullYear())
  const [filterStatus,setFilterStatus]= useState('')
  const [bills,       setBills]       = useState<Bill[]>([])
  const [rooms,       setRooms]       = useState<OccupiedRoom[]>([])
  const [rate,        setRate]        = useState<UtilityRate | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [alert,       setAlert]       = useState<{ type: string; msg: string } | null>(null)
  const [saving,      setSaving]      = useState(false)

  // Create bill form
  const [cForm, setCForm] = useState({ ...BLANK_BILL })
  // Edit bill form
  const [eForm, setEForm] = useState<Partial<Bill> & { prev_electric: number; curr_electric: number; prev_water: number; curr_water: number }>({
    id: 0, rent_amount: 0, prev_electric: 0, curr_electric: 0,
    prev_water: 0, curr_water: 0, other_amount: 0, status: 'pending',
  })

  const showAlert = (type: string, msg: string) => {
    setAlert({ type, msg }); setTimeout(() => setAlert(null), 4000)
  }

  const loadBills = useCallback(() => {
    setLoading(true)
    billsApi.list(filterMonth, filterYear, filterStatus).then(r => {
      if (r.success) setBills(r.data!)
      setLoading(false)
    })
  }, [filterMonth, filterYear, filterStatus])

  useEffect(() => { loadBills() }, [loadBills])

  useEffect(() => {
    billsApi.occupiedRooms().then(r => { if (r.success) setRooms(r.data!) })
    ratesApi.list().then(r => {
      if (r.success) {
        const current = r.data!.find(x => x.is_current) ?? r.data![0]
        setRate(current ?? null)
      }
    })
  }, [])

  // Calculated totals from create form
  const calcCreate = () => {
    const eu = Math.max(0, cForm.curr_electric - cForm.prev_electric)
    const wu = Math.max(0, cForm.curr_water - cForm.prev_water)
    const ea = eu * (rate?.electric_rate ?? 0)
    const wa = wu * (rate?.water_rate ?? 0)
    return { eu, wu, ea, wa, total: cForm.rent_amount + ea + wa + cForm.other_amount }
  }

  // Calculated totals from edit form
  const calcEdit = () => {
    const eu = Math.max(0, eForm.curr_electric - eForm.prev_electric)
    const wu = Math.max(0, eForm.curr_water - eForm.prev_water)
    const ea = eu * (rate?.electric_rate ?? 0)
    const wa = wu * (rate?.water_rate ?? 0)
    return { eu, wu, ea, wa, total: (eForm.rent_amount ?? 0) + ea + wa + (eForm.other_amount ?? 0) }
  }

  const handleRoomSelect = (roomId: number) => {
    const room = rooms.find(r => r.id === roomId)
    if (room) {
      const lastE = room.last_electric ?? 0
      const lastW = room.last_water ?? 0
      setCForm(f => ({ ...f, room_id: roomId, rent_amount: room.rent_price, prev_electric: lastE, curr_electric: lastE, prev_water: lastW, curr_water: lastW }))
    } else {
      setCForm(f => ({ ...f, room_id: 0 }))
    }
  }

  const openEdit = (bill: Bill) => {
    const prevE = bill.prev_electric ?? 0
    const currE = bill.curr_electric ?? (prevE === 0 && bill.electric_units > 0 ? bill.electric_units : 0)
    const prevW = bill.prev_water ?? 0
    const currW = bill.curr_water ?? (prevW === 0 && bill.water_units > 0 ? bill.water_units : 0)
    setEForm({
      id: bill.id, rent_amount: bill.rent_amount,
      prev_electric: prevE, curr_electric: currE,
      prev_water: prevW, curr_water: currW,
      other_amount: bill.other_amount, status: bill.status,
      room_number: bill.room_number, tenant_name: bill.tenant_name,
      bill_month: bill.bill_month, bill_year: bill.bill_year,
    })
    $('#editBillModal').modal('show')
  }

  const handleCreateBill = async () => {
    if (!cForm.room_id) return showAlert('warning', 'กรุณาเลือกห้อง')
    const room = rooms.find(r => r.id === cForm.room_id)
    setSaving(true)
    const calc = calcCreate()
    const res = await billsApi.create({
      ...cForm,
      room_number: room?.room_number,
      electric_units: calc.eu, electric_amount: calc.ea,
      water_units: calc.wu, water_amount: calc.wa, total_amount: calc.total,
    })
    setSaving(false)
    if (res.success) {
      $('#billModal').modal('hide')
      setCForm({ ...BLANK_BILL })
      showAlert('success', 'สร้างบิลเรียบร้อย')
      loadBills()
    } else showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
  }

  const handleCreateAll = async () => {
    if (!window.confirm(`สร้างบิลทุกห้องเดือน ${THAI_MONTHS[filterMonth]} ${filterYear + 543}?`)) return
    setSaving(true)
    const res = await billsApi.createAll(filterMonth, filterYear)
    setSaving(false)
    if (res.success) {
      showAlert('success', `สร้าง ${res.data!.created} ห้อง, ข้าม ${res.data!.skipped} ห้อง`)
      loadBills()
    } else showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
  }

  const handleUpdateBill = async () => {
    if (!eForm.id) return
    setSaving(true)
    const res = await billsApi.update(eForm.id, {
      rent_amount: eForm.rent_amount, prev_electric: eForm.prev_electric,
      curr_electric: eForm.curr_electric, prev_water: eForm.prev_water,
      curr_water: eForm.curr_water, other_amount: eForm.other_amount, status: eForm.status,
    })
    setSaving(false)
    if (res.success) {
      $('#editBillModal').modal('hide')
      showAlert('success', 'บันทึกเรียบร้อย')
      loadBills()
    } else showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
  }

  const handleDelete = async (bill: Bill) => {
    if (!window.confirm('ลบบิลนี้?')) return
    const res = await billsApi.remove(bill.id)
    if (res.success) { showAlert('success', 'ลบเรียบร้อย'); loadBills() }
    else showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
  }

  const cc = calcCreate()
  const ce = calcEdit()
  const totalPaid    = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.total_amount, 0)
  const totalPending = bills.filter(b => b.status === 'pending').reduce((s, b) => s + b.total_amount, 0)
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)

  return (
    <>
      {alert && <div className={`alert alert-${alert.type} alert-dismissible`}>{alert.msg}<button className="close" onClick={() => setAlert(null)}><span>&times;</span></button></div>}

      {/* Summary + filter */}
      <div className="row mb-3">
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#43a047' }}><i className="fas fa-check-circle"></i></div>
            <div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{fmoney(totalPaid)}</div><div className="stat-label">ชำระแล้ว</div></div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fb8c00' }}><i className="fas fa-clock"></i></div>
            <div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{fmoney(totalPending)}</div><div className="stat-label">รอชำระ</div></div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#5c6bc0' }}><i className="fas fa-file-invoice-dollar"></i></div>
            <div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{bills.length}</div><div className="stat-label">บิลทั้งหมด</div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-auto">
              <select className="form-control form-control-sm" value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}>
                {THAI_MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div className="col-auto">
              <select className="form-control form-control-sm" value={filterYear} onChange={e => setFilterYear(+e.target.value)}>
                {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
              </select>
            </div>
            <div className="col-auto">
              <select className="form-control form-control-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">ทุกสถานะ</option>
                <option value="pending">รอชำระ</option>
                <option value="paid">ชำระแล้ว</option>
                <option value="overdue">เกินกำหนด</option>
              </select>
            </div>
            <div className="col-auto ml-auto d-flex" style={{ gap: 8 }}>
              <button className="btn btn-outline-success btn-sm" onClick={handleCreateAll} disabled={saving}>
                <i className="fas fa-magic mr-1"></i>สร้างบิลทุกห้อง
              </button>
              <button className="btn btn-primary btn-sm" data-toggle="modal" data-target="#billModal">
                <i className="fas fa-plus mr-1"></i>สร้างบิล
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bills table */}
      <div className="card">
        <div className="card-header">
          <i className="fas fa-file-invoice-dollar"></i>
          รายการบิล — {THAI_MONTHS[filterMonth]} {filterYear + 543}
          <span className="badge badge-primary ml-2">{bills.length} รายการ</span>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>#</th><th>ห้อง</th><th>ผู้เช่า</th>
                  <th>ค่าเช่า</th><th>ค่าไฟ</th><th>ค่าน้ำ</th>
                  <th>อื่นๆ</th><th>รวม</th><th>สถานะ</th>
                  <th className="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-4"><i className="fas fa-spinner fa-spin"></i></td></tr>
                ) : bills.map((b, i) => (
                  <tr key={b.id}>
                    <td>{i + 1}</td>
                    <td><span className="badge badge-primary">ห้อง {b.room_number}</span></td>
                    <td>{b.tenant_name}</td>
                    <td>{fmoney(b.rent_amount)}</td>
                    <td>{fmoney(b.electric_amount)}<div className="small text-muted">{fnum(b.electric_units)} หน่วย</div></td>
                    <td>{fmoney(b.water_amount)}<div className="small text-muted">{fnum(b.water_units)} หน่วย</div></td>
                    <td>{fmoney(b.other_amount)}</td>
                    <td><strong>{fmoney(b.total_amount)}</strong></td>
                    <td><BillStatus status={b.status} /></td>
                    <td className="text-center" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm btn-outline-primary mr-1" onClick={() => openEdit(b)}><i className="fas fa-edit"></i></button>
                      {b.status !== 'paid' && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(b)}><i className="fas fa-trash"></i></button>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && bills.length === 0 && (
                  <tr><td colSpan={10} className="text-center text-muted py-4">ไม่พบบิล</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Bill Modal */}
      <div className="modal fade" id="billModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">สร้างบิล</h5>
              <button className="close" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>ห้อง *</label>
                    <select className="form-control" value={cForm.room_id} onChange={e => handleRoomSelect(+e.target.value)}>
                      <option value={0}>-- เลือกห้อง --</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>ห้อง {r.room_number} — {r.tenant_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>เดือน</label>
                    <select className="form-control" value={cForm.bill_month} onChange={e => setCForm(f => ({ ...f, bill_month: +e.target.value }))}>
                      {THAI_MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>ปี</label>
                    <select className="form-control" value={cForm.bill_year} onChange={e => setCForm(f => ({ ...f, bill_year: +e.target.value }))}>
                      {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>ค่าเช่า</label>
                    <input type="number" className="form-control" value={cForm.rent_amount} onChange={e => setCForm(f => ({ ...f, rent_amount: +e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>มิเตอร์ไฟเดิม</label>
                    <input type="number" className="form-control" value={cForm.prev_electric} onChange={e => setCForm(f => ({ ...f, prev_electric: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>มิเตอร์ไฟใหม่</label>
                    <input type="number" className="form-control" value={cForm.curr_electric} onChange={e => setCForm(f => ({ ...f, curr_electric: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-md-3 offset-md-6">
                  <div className="form-group">
                    <label>มิเตอร์น้ำเดิม</label>
                    <input type="number" className="form-control" value={cForm.prev_water} onChange={e => setCForm(f => ({ ...f, prev_water: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>มิเตอร์น้ำใหม่</label>
                    <input type="number" className="form-control" value={cForm.curr_water} onChange={e => setCForm(f => ({ ...f, curr_water: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>ค่าอื่นๆ</label>
                    <input type="number" className="form-control" value={cForm.other_amount} onChange={e => setCForm(f => ({ ...f, other_amount: +e.target.value }))} />
                  </div>
                </div>
              </div>
              {/* Summary */}
              <div className="alert alert-info mb-0">
                <div className="row text-center">
                  <div className="col-3"><small className="text-muted">ค่าไฟ ({fnum(cc.eu)} หน่วย)</small><br/><strong>{fmoney(cc.ea)}</strong></div>
                  <div className="col-3"><small className="text-muted">ค่าน้ำ ({fnum(cc.wu)} หน่วย)</small><br/><strong>{fmoney(cc.wa)}</strong></div>
                  <div className="col-3"><small className="text-muted">ค่าเช่า</small><br/><strong>{fmoney(cForm.rent_amount)}</strong></div>
                  <div className="col-3"><small className="text-muted">รวม</small><br/><strong style={{ color: '#5c6bc0' }}>{fmoney(cc.total)}</strong></div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-dismiss="modal">ยกเลิก</button>
              <button className="btn btn-primary" onClick={handleCreateBill} disabled={saving}>
                {saving ? <><i className="fas fa-spinner fa-spin mr-1"></i>บันทึก...</> : <><i className="fas fa-save mr-1"></i>บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Bill Modal */}
      <div className="modal fade" id="editBillModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">แก้ไขบิล — ห้อง {eForm.room_number} <small className="text-muted ml-2">{eForm.tenant_name}</small></h5>
              <button className="close" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>ค่าเช่า</label>
                    <input type="number" className="form-control" value={eForm.rent_amount} onChange={e => setEForm(f => ({ ...f, rent_amount: +e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>มิเตอร์ไฟเดิม</label>
                    <input type="number" className="form-control" value={eForm.prev_electric} onChange={e => setEForm(f => ({ ...f, prev_electric: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>มิเตอร์ไฟใหม่</label>
                    <input type="number" className="form-control" value={eForm.curr_electric} onChange={e => setEForm(f => ({ ...f, curr_electric: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-md-3 offset-md-6">
                  <div className="form-group">
                    <label>มิเตอร์น้ำเดิม</label>
                    <input type="number" className="form-control" value={eForm.prev_water} onChange={e => setEForm(f => ({ ...f, prev_water: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="form-group">
                    <label>มิเตอร์น้ำใหม่</label>
                    <input type="number" className="form-control" value={eForm.curr_water} onChange={e => setEForm(f => ({ ...f, curr_water: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>ค่าอื่นๆ</label>
                    <input type="number" className="form-control" value={eForm.other_amount} onChange={e => setEForm(f => ({ ...f, other_amount: +e.target.value }))} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>สถานะ</label>
                    <select className="form-control" value={eForm.status} onChange={e => setEForm(f => ({ ...f, status: e.target.value as Bill['status'] }))}>
                      <option value="pending">รอชำระ</option>
                      <option value="paid">ชำระแล้ว</option>
                      <option value="overdue">เกินกำหนด</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="alert alert-info mb-0">
                <div className="row text-center">
                  <div className="col-3"><small className="text-muted">ค่าไฟ ({fnum(ce.eu)} หน่วย)</small><br/><strong>{fmoney(ce.ea)}</strong></div>
                  <div className="col-3"><small className="text-muted">ค่าน้ำ ({fnum(ce.wu)} หน่วย)</small><br/><strong>{fmoney(ce.wa)}</strong></div>
                  <div className="col-3"><small className="text-muted">ค่าเช่า</small><br/><strong>{fmoney(eForm.rent_amount ?? 0)}</strong></div>
                  <div className="col-3"><small className="text-muted">รวม</small><br/><strong style={{ color: '#5c6bc0' }}>{fmoney(ce.total)}</strong></div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-dismiss="modal">ยกเลิก</button>
              <button className="btn btn-primary" onClick={handleUpdateBill} disabled={saving}>
                {saving ? <><i className="fas fa-spinner fa-spin mr-1"></i>บันทึก...</> : <><i className="fas fa-save mr-1"></i>บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
