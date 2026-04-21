import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await login(username, password)
    setLoading(false)
    if (err) setError(err)
    else navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #1e2140 0%, #3949ab 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, background: '#5c6bc0',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', color: '#fff', marginBottom: 16,
          }}>
            <i className="fas fa-building"></i>
          </div>
          <h4 style={{ color: '#fff', fontWeight: 800, margin: 0 }}>ระบบจัดการหอพัก</h4>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '4px 0 0' }}>หอพักสุขใจ</p>
        </div>

        <div className="card" style={{ borderRadius: 18 }}>
          <div className="card-body" style={{ padding: 32 }}>
            <h5 style={{ fontWeight: 700, marginBottom: 24 }}>เข้าสู่ระบบ</h5>

            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="fas fa-exclamation-circle mr-2"></i>{error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>ชื่อผู้ใช้</label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text"><i className="fas fa-user"></i></span>
                  </div>
                  <input
                    type="text" className="form-control"
                    placeholder="กรอกชื่อผู้ใช้"
                    value={username} onChange={e => setUsername(e.target.value)}
                    required autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>รหัสผ่าน</label>
                <div className="input-group">
                  <div className="input-group-prepend">
                    <span className="input-group-text"><i className="fas fa-lock"></i></span>
                  </div>
                  <input
                    type="password" className="form-control"
                    placeholder="กรอกรหัสผ่าน"
                    value={password} onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block mt-3" disabled={loading}>
                {loading
                  ? <><i className="fas fa-spinner fa-spin mr-2"></i>กำลังเข้าสู่ระบบ...</>
                  : <><i className="fas fa-sign-in-alt mr-2"></i>เข้าสู่ระบบ</>
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
