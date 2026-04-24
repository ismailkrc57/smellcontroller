import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '▦' },
  { to: '/monitor', label: 'Canlı İzleme', icon: '◈' },
  { to: '/collection', label: 'Veri Toplama', icon: '⊕' },
  { to: '/training', label: 'Model Eğitimi', icon: '⊞' },
  { to: '/detection', label: 'Koku Tespiti', icon: '◎' },
]

export default function Sidebar({ connectionStatus, port, wsStatus }) {
  const sensorDot =
    connectionStatus === 'live'     ? 'conn-dot connected' :
    connectionStatus === 'simulate' ? 'conn-dot simulated' :
    'conn-dot'

  const sensorLabel =
    connectionStatus === 'live'     ? 'Smell Inspector Bağlı' :
    connectionStatus === 'simulate' ? 'Demo Modu' :
    'Sensör bağlı değil'

  const wsDot =
    wsStatus === 'connected'   ? 'conn-dot connected' :
    wsStatus === 'connecting'  ? 'conn-dot simulated' :
    'conn-dot'

  const wsLabel =
    wsStatus === 'connected'  ? 'Sunucu bağlı' :
    wsStatus === 'connecting' ? 'Bağlanıyor...' :
    'Sunucu bağlantısı yok'

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
        <div className="conn-badge" style={{ marginBottom: 8 }}>
          <div className={sensorDot} />
          <span>{sensorLabel}</span>
        </div>
        <div className="conn-badge">
          <div className={wsDot} />
          <span style={{ fontSize: 11 }}>{wsLabel}</span>
        </div>
      </div>
    </aside>
  )
}
