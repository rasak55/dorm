import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/',         icon: 'fas fa-tachometer-alt', label: 'แดชบอร์ด' },
  { to: '/rooms',    icon: 'fas fa-door-open',       label: 'ห้องพัก' },
  { to: '/tenants',  icon: 'fas fa-users',           label: 'ผู้เช่า' },
  { to: '/finance',  icon: 'fas fa-file-invoice-dollar', label: 'การเงิน' },
  { to: '/rates',    icon: 'fas fa-sliders-h',       label: 'อัตราค่าใช้จ่าย' },
  { to: '/reports',  icon: 'fas fa-chart-bar',       label: 'รายงาน' },
  { to: '/history',  icon: 'fas fa-history',         label: 'ประวัติ' },
]

function formatThaiDate() {
  const d = new Date()
  const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
  const months = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  return `${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()+1]} ${d.getFullYear()+543}`
}

const PAGE_TITLES: Record<string, string> = {
  '/':         'แดชบอร์ด',
  '/rooms':    'ห้องพัก',
  '/tenants':  'ผู้เช่า',
  '/finance':  'การเงิน',
  '/rates':    'อัตราค่าใช้จ่าย',
  '/reports':  'รายงาน',
  '/history':  'ประวัติกิจกรรม',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const path = window.location.hash.replace('#', '') || '/'
  const title = PAGE_TITLES[path] ?? 'ระบบจัดการหอพัก'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><i className="fas fa-building"></i></div>
          <div>
            <div className="sidebar-logo-text">หอพักสุขใจ</div>
            <div className="sidebar-logo-sub">v1.0 — {user?.full_name}</div>
          </div>
        </div>

        <div className="sidebar-menu">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <i className={n.icon}></i>
              <span className="nav-label">{n.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span className="nav-label">ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className={`content-wrapper${collapsed ? ' collapsed' : ''}`}>
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="topbar-toggle" onClick={() => setCollapsed(c => !c)}>
              <i className={`fas fa-${collapsed ? 'bars' : 'times'}`}></i>
            </button>
            <div>
              <div className="topbar-title">{title}</div>
              <div className="topbar-date">{formatThaiDate()}</div>
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#8892a4' }}>
            <i className="fas fa-user-circle mr-1"></i>{user?.full_name}
          </div>
        </div>
        <div className="page-content">{children}</div>
      </div>
    </div>
  )
}
