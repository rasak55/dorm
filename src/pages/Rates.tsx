import { useEffect, useState } from 'react'
import { ratesApi } from '../api/client'
import type { UtilityRate } from '../types'

declare const $: any

function fmoney(v: number) { return '฿' + Number(v).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

const BLANK: Partial<UtilityRate> = {
  name: '', electric_rate: 6, water_rate: 18, other_fee: 0,
  effective_date: new Date().toISOString().slice(0, 10), notes: '',
}

export default function Rates() {
  const [rates,   setRates]   = useState<UtilityRate[]>([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState<Partial<UtilityRate>>({ ...BLANK })
  const [editId,  setEditId]  = useState<number | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [alert,   setAlert]   = useState<{ type: string; msg: string } | null>(null)

  // Calculator
  const [calc, setCalc] = useState({ prevE: 0, currE: 0, prevW: 0, currW: 0 })

  const load = () => ratesApi.list().then(r => { if (r.success) setRates(r.data!); setLoading(false) })
  useEffect(() => { load() }, [])

  const showAlert = (type: string, msg: string) => {
    setAlert({ type, msg }); setTimeout(() => setAlert(null), 3500)
  }

  const currentRate = rates.find(r => r.is_current) ?? rates[0]

  const openAdd = () => {
    setForm({ ...BLANK }); setEditId(null)
    $('#rateModal').modal('show')
  }
  const openEdit = (r: UtilityRate) => {
    setForm({ ...r, effective_date: r.effective_date?.slice(0, 10) })
    setEditId(r.id)
    $('#rateModal').modal('show')
  }

  const handleSave = async () => {
    setSaving(true)
    const res = editId
      ? await ratesApi.update(editId, form)
      : await ratesApi.create(form)
    setSaving(false)
    if (res.success) {
      $('#rateModal').modal('hide')
      showAlert('success', editId ? 'แก้ไขเรียบร้อย' : 'เพิ่มเรทเรียบร้อย')
      load()
    } else showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
  }

  const handleSetCurrent = async (id: number) => {
    const res = await ratesApi.setCurrent(id)
    if (res.success) { showAlert('success', 'ตั้งเรทปัจจุบันเรียบร้อย'); load() }
    else showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
  }

  const handleDelete = async (r: UtilityRate) => {
    if (!window.confirm(`ลบเรท "${r.name}"?`)) return
    const res = await ratesApi.remove(r.id)
    if (res.success) { showAlert('success', 'ลบเรียบร้อย'); load() }
    else showAlert('danger', res.message ?? 'เกิดข้อผิดพลาด')
  }

  // Calculator result
  const cr = currentRate
  const eu = Math.max(0, calc.currE - calc.prevE)
  const wu = Math.max(0, calc.currW - calc.prevW)
  const ea = eu * (cr?.electric_rate ?? 0)
  const wa = wu * (cr?.water_rate ?? 0)

  if (loading) return <div className="text-center py-5"><i className="fas fa-spinner fa-spin fa-2x text-primary"></i></div>

  return (
    <>
      {alert && <div className={`alert alert-${alert.type} alert-dismissible`}>{alert.msg}<button className="close" onClick={() => setAlert(null)}><span>&times;</span></button></div>}

      <div className="row">
        {/* Rates table */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span><i className="fas fa-sliders-h mr-2"></i>อัตราค่าใช้จ่าย</span>
              <button className="btn btn-primary btn-sm" onClick={openAdd}>
                <i className="fas fa-plus mr-1"></i>เพิ่มเรท
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>ชื่อ</th><th>ค่าไฟ (฿/หน่วย)</th><th>ค่าน้ำ (฿/หน่วย)</th>
                      <th>วันที่มีผล</th><th>สถานะ</th><th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.name}</strong>{r.notes && <div className="small text-muted">{r.notes}</div>}</td>
                        <td>{fmoney(r.electric_rate)}</td>
                        <td>{fmoney(r.water_rate)}</td>
                        <td>{r.effective_date?.slice(0, 10)}</td>
                        <td>
                          {r.is_current
                            ? <span className="badge badge-success">ปัจจุบัน</span>
                            : <button className="btn btn-sm btn-outline-secondary" onClick={() => handleSetCurrent(r.id)}>ใช้เรทนี้</button>
                          }
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn btn-sm btn-outline-primary mr-1" onClick={() => openEdit(r)}><i className="fas fa-edit"></i></button>
                          {!r.is_current && (
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(r)}><i className="fas fa-trash"></i></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Calculator */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header"><i className="fas fa-calculator mr-2"></i>คำนวณค่าใช้จ่าย</div>
            <div className="card-body">
              {cr && (
                <div className="alert alert-info mb-3" style={{ fontSize: '0.85rem' }}>
                  เรทปัจจุบัน: ไฟ {fmoney(cr.electric_rate)}/หน่วย · น้ำ {fmoney(cr.water_rate)}/หน่วย
                </div>
              )}
              <div className="row">
                <div className="col-6">
                  <div className="form-group">
                    <label style={{ fontSize: '0.82rem' }}>มิเตอร์ไฟเดิม</label>
                    <input type="number" className="form-control form-control-sm" value={calc.prevE} onChange={e => setCalc(c => ({ ...c, prevE: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label style={{ fontSize: '0.82rem' }}>มิเตอร์ไฟใหม่</label>
                    <input type="number" className="form-control form-control-sm" value={calc.currE} onChange={e => setCalc(c => ({ ...c, currE: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label style={{ fontSize: '0.82rem' }}>มิเตอร์น้ำเดิม</label>
                    <input type="number" className="form-control form-control-sm" value={calc.prevW} onChange={e => setCalc(c => ({ ...c, prevW: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label style={{ fontSize: '0.82rem' }}>มิเตอร์น้ำใหม่</label>
                    <input type="number" className="form-control form-control-sm" value={calc.currW} onChange={e => setCalc(c => ({ ...c, currW: +e.target.value }))} step="0.01" />
                  </div>
                </div>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-1"><span>ค่าไฟ ({eu.toFixed(2)} หน่วย)</span><strong>{fmoney(ea)}</strong></div>
              <div className="d-flex justify-content-between mb-1"><span>ค่าน้ำ ({wu.toFixed(2)} หน่วย)</span><strong>{fmoney(wa)}</strong></div>
              <hr />
              <div className="d-flex justify-content-between"><span style={{ fontWeight: 700 }}>รวม</span><strong style={{ color: '#5c6bc0', fontSize: '1.1rem' }}>{fmoney(ea + wa)}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <div className="modal fade" id="rateModal" tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editId ? 'แก้ไขเรทค่าใช้จ่าย' : 'เพิ่มเรทค่าใช้จ่าย'}</h5>
              <button className="close" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>ชื่อเรท *</label>
                <input className="form-control" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="row">
                <div className="col-6">
                  <div className="form-group">
                    <label>ค่าไฟ (฿/หน่วย)</label>
                    <input type="number" className="form-control" value={form.electric_rate ?? 0} onChange={e => setForm(f => ({ ...f, electric_rate: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label>ค่าน้ำ (฿/หน่วย)</label>
                    <input type="number" className="form-control" value={form.water_rate ?? 0} onChange={e => setForm(f => ({ ...f, water_rate: +e.target.value }))} step="0.01" />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-6">
                  <div className="form-group">
                    <label>ค่าอื่นๆ (฿)</label>
                    <input type="number" className="form-control" value={form.other_fee ?? 0} onChange={e => setForm(f => ({ ...f, other_fee: +e.target.value }))} step="0.01" />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label>วันที่มีผล</label>
                    <input type="date" className="form-control" value={form.effective_date ?? ''} onChange={e => setForm(f => ({ ...f, effective_date: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>หมายเหตุ</label>
                <textarea className="form-control" rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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
