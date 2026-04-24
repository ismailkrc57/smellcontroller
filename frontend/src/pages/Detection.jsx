import { useState, useEffect } from 'react'
import { detection, training } from '../services/api'

const SMELL_ICONS = {
  'Hava': '🌬️', 'Kahve': '☕', 'Kolonya': '🧴', 'Parfüm': '🌸',
  'air': '🌬️', 'coffee': '☕', 'coffe': '☕', 'cologne': '🧴', 'perfume': '🌸',
}

export default function Detection({ sensorData, connectionStatus }) {
  const [activeModel, setActiveModel] = useState(null)
  const [history, setHistory] = useState([])
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [autoDetect, setAutoDetect] = useState(false)

  useEffect(() => {
    training.activeModel().then(r => setActiveModel(r.data)).catch(() => {})
    detection.history().then(r => setHistory(r.data.history)).catch(() => {})
  }, [])

  useEffect(() => {
    if (autoDetect && sensorData?.detection) {
      setLastResult(sensorData.detection)
      setHistory(prev => [{ ...sensorData.detection, timestamp: sensorData.timestamp }, ...prev].slice(0, 50))
    }
  }, [sensorData, autoDetect])

  const handleScan = async () => {
    if (!sensorData?.channels) return alert('Sensör bağlı değil veya veri yok')
    setScanning(true)
    try {
      const r = await detection.predict(sensorData.channels, sensorData.temperature, sensorData.humidity)
      setLastResult(r.data)
      setHistory(prev => [r.data, ...prev].slice(0, 50))
    } catch (e) {
      alert('Hata: ' + (e.response?.data?.detail || e.message))
    } finally {
      setScanning(false)
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('Geçmiş silinsin mi?')) return
    await detection.clearHistory()
    setHistory([])
  }

  const topLabel = lastResult?.label
  const topIcon = SMELL_ICONS[topLabel] || '◎'
  const confidence = lastResult?.confidence || {}
  const sortedConf = Object.entries(confidence).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="page-header">
        <h2>Koku Tespiti</h2>
        <p>Anlık sensör verisiyle ML tabanlı koku tanıma</p>
      </div>

      {!activeModel?.loaded && (
        <div style={{ background: 'rgba(255,209,102,0.1)', border: '1px solid var(--warning)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
          ⚠ Model yüklü değil. <a href="/training" style={{ color: 'var(--accent)' }}>Model Eğitimi</a> sayfasından bir model yükleyin.
        </div>
      )}

      <div className="grid-2 mb-4" style={{ alignItems: 'start' }}>
        {/* Main Result */}
        <div className="card">
          <div className="card-title">Tespit Sonucu</div>

          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 72, marginBottom: 8 }}>{lastResult ? topIcon : '◎'}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: lastResult ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 4 }}>
              {lastResult ? topLabel : '—'}
            </div>
            {lastResult && (
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {confidence[topLabel]?.toFixed(1)}% güven
              </div>
            )}
          </div>

          {sortedConf.length > 0 && (
            <div>
              {sortedConf.map(([label, pct]) => (
                <div key={label} className="mb-3">
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 13, fontWeight: label === topLabel ? 600 : 400 }}>
                      {SMELL_ICONS[label] || ''} {label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: label === topLabel ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{
                      width: `${pct}%`,
                      background: label === topLabel ? 'var(--accent)' : 'var(--surface2)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <hr className="divider" />

          <div className="flex gap-2 mb-2">
            <button
              className="btn btn-primary w-full"
              onClick={handleScan}
              disabled={scanning || !activeModel?.loaded || connectionStatus === 'idle'}
            >
              {scanning ? <><span className="spinner" /> Taranıyor...</> : 'Şimdi Tara'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoDetect"
              checked={autoDetect}
              onChange={e => setAutoDetect(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
              disabled={!activeModel?.loaded}
            />
            <label htmlFor="autoDetect" style={{ fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>
              Otomatik tespit (her veri geldiğinde)
            </label>
          </div>

          {connectionStatus === 'idle' && (
            <div className="text-muted mt-2" style={{ fontSize: 11 }}>⚠ Sensörü Monitor sayfasından bağlayın</div>
          )}
        </div>

        {/* Model Info */}
        <div className="card">
          <div className="card-title">Model Bilgisi</div>
          <div style={{ marginBottom: 16 }}>
            <div className="flex items-center gap-2 mb-2">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: activeModel?.loaded ? 'var(--success)' : 'var(--danger)', boxShadow: activeModel?.loaded ? '0 0 5px var(--success)' : 'none' }} />
              <span style={{ fontSize: 13 }}>{activeModel?.model || 'Yüklü değil'}</span>
            </div>
          </div>

          <div className="card-title">Tespit Geçmişi ({history.length})</div>
          {history.length > 0 && (
            <button className="btn btn-ghost mb-2" style={{ fontSize: 11, padding: '4px 10px' }} onClick={handleClearHistory}>
              Temizle
            </button>
          )}
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.length === 0 ? (
              <div className="text-muted">Henüz tespit yok</div>
            ) : (
              history.map((h, i) => (
                <div key={i} className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 18 }}>{SMELL_ICONS[h.label] || '◎'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{h.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 12, color: 'var(--accent)' }}>
                      {h.confidence?.[h.label]?.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {h.timestamp ? new Date(h.timestamp * 1000).toLocaleTimeString() : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
