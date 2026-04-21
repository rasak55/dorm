import { useEffect, useRef, useState } from 'react'
import { reportsApi } from '../api/client'

declare const Chart: any

const THAI_MONTHS = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function fmoney(v: number) { return '฿' + Number(v).toLocaleString('th-TH', { minimumFractionDigits: 2 }) }

interface MonthData { month: number; income: number; paid_count: number; pending_count: number }
interface ReportData {
  year: number; monthly: MonthData[]; year_total: number;
  breakdown: { rent: number; electric: number; water: number; other: number }
  occupancy_rate: number; total_rooms: number; occupied_rooms: number
}

export default function Reports() {
  const [year,    setYear]    = useState(new Date().getFullYear())
  const [data,    setData]    = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const chartRef    = useRef<HTMLCanvasElement>(null)
  const chartInst   = useRef<any>(null)

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  const load = (y: number) => {
    setLoading(true)
    reportsApi.get(y).then((r: any) => {
      if (r.success) setData(r.data)
      setLoading(false)
    })
  }

  useEffect(() => { load(year) }, [year])

  useEffect(() => {
    if (!data || !chartRef.current) return
    if (chartInst.current) chartInst.current.destroy()
    chartInst.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: data.monthly.map(m => THAI_MONTHS[m.month]),
        datasets: [{
          label: 'รายรับ (฿)',
          data: data.monthly.map(m => m.income),
          backgroundColor: 'rgba(92,107,192,0.7)',
          borderColor: '#5c6bc0', borderWidth: 1, borderRadius: 6,
        }],
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    })
  }, [data])

  return (
    <>
      {/* Year filter */}
      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center" style={{ gap: 12 }}>
            <label style={{ fontWeight: 600, margin: 0 }}>ปี:</label>
            <select className="form-control form-control-sm" style={{ width: 120 }} value={year} onChange={e => setYear(+e.target.value)}>
              {years.map(y => <option key={y} value={y}>{y + 543}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><i className="fas fa-spinner fa-spin fa-2x text-primary"></i></div>
      ) : data && (
        <>
          {/* Summary cards */}
          <div className="row">
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#5c6bc0' }}><i className="fas fa-coins"></i></div>
                <div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{fmoney(data.year_total)}</div><div className="stat-label">รายรับรวมปีนี้</div></div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#43a047' }}><i className="fas fa-percentage"></i></div>
                <div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{data.occupancy_rate}%</div><div className="stat-label">อัตราการเช่า</div></div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#fb8c00' }}><i className="fas fa-bolt"></i></div>
                <div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{fmoney(data.breakdown.electric)}</div><div className="stat-label">ค่าไฟรวม</div></div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#0277bd' }}><i className="fas fa-tint"></i></div>
                <div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{fmoney(data.breakdown.water)}</div><div className="stat-label">ค่าน้ำรวม</div></div>
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="card">
            <div className="card-header"><i className="fas fa-chart-bar mr-2"></i>รายรับรายเดือน ปี {year + 543}</div>
            <div className="card-body"><canvas ref={chartRef}></canvas></div>
          </div>

          {/* Monthly breakdown table */}
          <div className="card">
            <div className="card-header"><i className="fas fa-table mr-2"></i>สรุปรายเดือน</div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr><th>เดือน</th><th>รายรับ</th><th>บิลชำระแล้ว</th><th>บิลรอชำระ</th></tr>
                  </thead>
                  <tbody>
                    {data.monthly.map(m => (
                      <tr key={m.month} style={m.income > 0 ? { fontWeight: 500 } : {}}>
                        <td>{THAI_MONTHS[m.month]}</td>
                        <td className={m.income > 0 ? 'text-success font-weight-bold' : 'text-muted'}>{m.income > 0 ? fmoney(m.income) : '-'}</td>
                        <td>{m.paid_count > 0 ? <span className="badge badge-success">{m.paid_count} บิล</span> : '-'}</td>
                        <td>{m.pending_count > 0 ? <span className="badge badge-warning">{m.pending_count} บิล</span> : '-'}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f9faff', fontWeight: 700 }}>
                      <td>รวมทั้งปี</td>
                      <td className="text-primary">{fmoney(data.year_total)}</td>
                      <td>{data.monthly.reduce((s, m) => s + m.paid_count, 0)} บิล</td>
                      <td>{data.monthly.reduce((s, m) => s + m.pending_count, 0)} บิล</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Income breakdown */}
          <div className="card">
            <div className="card-header"><i className="fas fa-chart-pie mr-2"></i>สัดส่วนรายรับ</div>
            <div className="card-body">
              <div className="row text-center">
                {[
                  { label: 'ค่าเช่า', value: data.breakdown.rent, color: '#5c6bc0' },
                  { label: 'ค่าไฟ', value: data.breakdown.electric, color: '#fb8c00' },
                  { label: 'ค่าน้ำ', value: data.breakdown.water, color: '#0277bd' },
                  { label: 'อื่นๆ', value: data.breakdown.other, color: '#8892a4' },
                ].map((item, i) => (
                  <div key={i} className="col-6 col-md-3 mb-3">
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: item.color, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>
                      <i className="fas fa-coins"></i>
                    </div>
                    <div style={{ fontWeight: 700 }}>{fmoney(item.value)}</div>
                    <div className="text-muted" style={{ fontSize: '0.82rem' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
