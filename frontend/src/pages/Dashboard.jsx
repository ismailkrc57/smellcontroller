import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sensor, training, detection } from '../services/api'

export default function Dashboard({ sensorData, connectionStatus }) {
  const [ports, setPorts] = useState([])
  const [activeModel, setActiveModel] = useState(null)
  const [historyCount, setHistoryCount] = useState(0)

  useEffect(() => {
    sensor.getPorts().then(r => setPorts(r.data.ports)).catch(() => {})
    training.activeModel().then(r => setActiveModel(r.data)).catch(() => {})
    detection.status().then(r => setHistoryCount(r.data.history_count)).catch(() => {})
  }, [])

  const lastDetection = sensorData?.detection
  const isConnected = connectionStatus !== 'idle'

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>SmellController sistemine genel bakış</p>
      </div>

      <div className="grid-4 mb-4">
        <div className="stat-card">
          <div className="stat-value" style={{ color: isConnected ? 'var(--success)' : 'var(--text-muted)' }}>
            {isConnected ? (connectionStatus === 'live' ? 'Canlı' : 'Sim') : 'Kapalı'}
          </div>
          <div className="stat-label">Bağlantı</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{sensorData ? sensorData.temperature?.toFixed(1) + '°C' : '—'}</div>
          <div className="stat-label">Sıcaklık</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{sensorData ? sensorData.humidity?.toFixed(1) + '%' : '—'}</div>
          <div className="stat-label">Nem</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{historyCount}</div>
          <div className="stat-label">Tespit Sayısı</div>
        </div>
      </div>

      <div className="grid-2 mb-4">
        <div className="card">
          <div className="card-title">Son Tespit</div>
          {lastDetection ? (
            <div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)', marginBottom: 12 }}>
                {lastDetection.label}
              </div>
              {Object.entries(lastDetection.confidence || {}).map(([label, pct]) => (
                <div key={label} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 12 }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: label === lastDetection.label ? 'var(--accent)' : 'var(--surface2)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted">Henüz tespit yapılmadı</div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Sistem Durumu</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StatusRow label="Bağlantı" value={
              connectionStatus === 'live' ? 'Canlı Cihaz' :
              connectionStatus === 'simulate' ? 'Simülatör' : 'Yok'
            } ok={isConnected} />
            <StatusRow label="Aktif Model" value={activeModel?.model || 'Yüklü değil'} ok={activeModel?.loaded} />
            <StatusRow label="Tespit Geçmişi" value={`${historyCount} kayıt`} ok={true} />
            <StatusRow label="Mevcut Portlar" value={`${ports.length} port`} ok={ports.length > 0} />
          </div>

          <hr className="divider" />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/monitor" className="btn btn-primary" style={{ fontSize: 12, padding: '7px 14px' }}>
              Canlı İzleme
            </Link>
            <Link to="/collection" className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }}>
              Veri Topla
            </Link>
            <Link to="/detection" className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }}>
              Koku Tespiti
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Mevcut Portlar</div>
        {ports.length === 0 ? (
          <div className="text-muted">USB port bulunamadı</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ports.map(p => (
              <div key={p.device} className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{p.device}</span>
                  <span className="text-muted" style={{ marginLeft: 8 }}>{p.description}</span>
                </div>
                <span className="badge badge-muted">{p.manufacturer || 'Unknown'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: ok ? 'var(--success)' : 'var(--text-muted)',
          boxShadow: ok ? '0 0 5px var(--success)' : 'none',
          flexShrink: 0
        }} />
      </div>
    </div>
  )
}
