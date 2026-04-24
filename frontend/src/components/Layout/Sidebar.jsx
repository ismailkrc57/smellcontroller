import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/monitor', label: 'Canlı İzleme', icon: '◈' },
  { to: '/collection', label: 'Veri Toplama', icon: '⊕' },
  { to: '/training', label: 'Model Eğitimi', icon: '⊞' },
  { to: '/detection', label: 'Koku Tespiti', icon: '◎' },
]

export default function Sidebar({ connectionStatus, port }) {
  const dotClass =
    connectionStatus === 'live' ? 'conn-dot connected' :
    connectionStatus === 'simulate' ? 'conn-dot simulated' :
    'conn-dot'

  const connLabel =
    connectionStatus === 'live' ? port :
    connectionStatus === 'simulate' ? 'Simülatör' :
    'Bağlı değil'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>SmellController</h1>
        <span>E-Nose Platform</span>
      </div>
      <nav className="nav-section">
        <div className="nav-label">Gezinme</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="conn-badge">
          <div className={dotClass} />
          <span>{connLabel}</span>
        </div>
      </div>
    </aside>
  )
}
