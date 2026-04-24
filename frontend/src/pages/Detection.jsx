import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { detection, training } from '../services/api'

const SMELL_ICONS = {
  'Hava': '💨', 'Kahve': '☕', 'Kolonya': '🧴', 'Parfüm': '🌸',
  'Ambient_Hava': '💨', 'CocaCola': '🥤', 'Su': '💧', 'Cay': '🍵',
  'RedBull': '⚡', 'Elma_Suyu': '🍎', 'taze_muz': '🍌', 'bozuk_muz': '🍌',
  'air': '💨', 'coffee': '☕', 'coffe': '☕', 'cologne': '🧴', 'perfume': '🌸',
}

function iconFor(label) {
  if (!label) return '◎'
  const key = Object.keys(SMELL_ICONS).find(k => label.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(label.toLowerCase()))
  return SMELL_ICONS[key] || SMELL_ICONS[label] || '🔬'
}

const CONFIDENCE_COLORS = (pct) =>
  pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)'

export default function Detection({ sensorData, connectionStatus }) {
  const [activeModel, setActiveModel] = useState(null)
  const [models, setModels] = useState([])
  const [history, setHistory] = useState([])
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [autoDetect, setAutoDetect] = useState(false)
  const [loadingModel, setLoadingModel] = useState(null)

  const refreshActiveModel = useCallback(async () => {
    try {
      const r = await training.activeModel()
      setActiveModel(r.data)
    } catch {}
  }, [])

  const refreshModels = useCallback(async () => {
    try {
      const r = await training.listModels()
      setModels(r.data.models)
    } catch {}
  }, [])

  useEffect(() => {
    refreshActiveModel()
    refreshModels()
    detection.history().then(r => setHistory(r.data.history)).catch(() => {})
  }, [])

  // Auto-refresh active model every 4s so navigating from Training page reflects immediately
  useEffect(() => {
    const interval = setInterval(refreshActiveModel, 4000)
    return () => clearInterval(interval)
  }, [refreshActiveModel])

  // autoDetect: uses backend-side prediction embedded in sensorData
  useEffect(() => {
    if (!autoDetect || !activeModel?.loaded) return
    if (sensorData?.detection) {
      setLastResult(sensorData.detection)
      setHistory(prev => [
        { ...sensorData.detection, timestamp: sensorData.timestamp },
        ...prev,
      ].slice(0, 100))
    }
  }, [sensorData, autoDetect, activeModel])

  const handleLoadModel = async (modelName) => {
    setLoadingModel(modelName)
    try {
      await training.loadModel(modelName)
      await refreshActiveModel()
      await refreshModels()
    } catch (e) {
      alert('Model yüklenemedi: ' + (e.response?.data?.detail || e.message))
    } finally {
      setLoadingModel(null)
    }
  }

  const handleScan = async () => {
    if (!sensorData?.channels) return alert('Sensör bağlı değil veya veri yok.\nÖnce Canlı İzleme sayfasından cihaza bağlanın.')
    if (!activeModel?.loaded) return alert('Model yüklü değil.\nAşağıdan bir model seçin.')
    setScanning(true)
    try {
      const r = await detection.predict(sensorData.channels, sensorData.temperature, sensorData.humidity)
      setLastResult(r.data)
      setHistory(prev => [r.data, ...prev].slice(0, 100))
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
    setLastResult(null)
  }

  const topLabel = lastResult?.label
  const topPct   = lastResult?.confidence?.[topLabel] ?? 0
  const sortedConf = Object.entries(lastResult?.confidence || {}).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="page-header">
        <h2>Koku Tespiti</h2>
        <p>Sensörden gelen anlık veriyi ML modeliyle analiz et</p>
      </div>

      {/* ── Step indicators ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { n: 1, label: 'Cihazı bağla', ok: connectionStatus !== 'idle', link: '/monitor' },
          { n: 2, label: 'Model seç', ok: !!activeModel?.loaded, link: null },
          { n: 3, label: 'Tara', ok: !!lastResult, link: null },
        ].map(step => (
          <div key={step.n} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
            background: step.ok ? 'rgba(6,214,160,0.1)' : 'var(--surface)',
            border: `1px solid ${step.ok ? 'var(--success)' : 'var(--border)'}`,
            borderRadius: 8, fontSize: 13,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: step.ok ? 'var(--success)' : 'var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: step.ok ? '#0f1117' : 'var(--text-muted)',
            }}>
              {step.ok ? '✓' : step.n}
            </div>
            {step.link
              ? <Link to={step.link} style={{ color: step.ok ? 'var(--success)' : 'var(--text-muted)', textDecoration: 'none' }}>{step.label}</Link>
              : <span style={{ color: step.ok ? 'var(--success)' : 'var(--text-muted)' }}>{step.label}</span>
            }
          </div>
        ))}
      </div>

      <div className="grid-2 mb-4" style={{ alignItems: 'start' }}>

        {/* ── Left: Result ── */}
        <div className="card">
          <div className="card-title">Tespit Sonucu</div>

          <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
            <div style={{ fontSize: 64, marginBottom: 6, lineHeight: 1 }}>
              {lastResult ? iconFor(topLabel) : '🔬'}
            </div>
            <div style={{
              fontSize: 30, fontWeight: 800, marginBottom: 4,
              color: lastResult ? 'var(--text)' : 'var(--text-muted)',
            }}>
              {lastResult ? topLabel : 'Henüz tarama yapılmadı'}
            </div>
            {lastResult && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  display: 'inline-block', padding: '4px 14px', borderRadius: 20,
                  background: `${CONFIDENCE_COLORS(topPct)}22`,
                  border: `1px solid ${CONFIDENCE_COLORS(topPct)}`,
                  color: CONFIDENCE_COLORS(topPct), fontWeight: 700, fontSize: 14,
                }}>
                  %{topPct.toFixed(1)} güven
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Model: <span style={{ color: lastResult.model === activeModel?.model ? 'var(--text-muted)' : 'var(--warning)', fontWeight: 600 }}>
                    {lastResult.model?.replace('.pkl', '') ?? '—'}
                  </span>
                  {lastResult.model !== activeModel?.model && (
                    <span style={{ color: 'var(--warning)', marginLeft: 6 }}>⚠ Aktif modelden farklı</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Confidence bars */}
          {sortedConf.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {sortedConf.map(([label, pct]) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 13, fontWeight: label === topLabel ? 700 : 400, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{iconFor(label)}</span> {label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: CONFIDENCE_COLORS(pct) }}>
                      %{pct.toFixed(1)}
                    </span>
                  </div>
                  <div className="progress-bar-wrap" style={{ height: label === topLabel ? 8 : 5 }}>
                    <div className="progress-bar-fill" style={{
                      width: `${pct}%`,
                      background: label === topLabel ? CONFIDENCE_COLORS(pct) : 'var(--surface2)',
                      transition: 'width 0.4s',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <hr className="divider" />

          <button
            className="btn btn-primary w-full"
            onClick={handleScan}
            disabled={scanning || !activeModel?.loaded || connectionStatus === 'idle'}
            style={{ marginBottom: 10 }}
          >
            {scanning
              ? <><span className="spinner" /> Analiz ediliyor...</>
              : connectionStatus === 'idle'
                ? 'Önce cihazı bağla'
                : !activeModel?.loaded
                  ? 'Önce model seç'
                  : 'Şimdi Tara'}
          </button>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="auto" checked={autoDetect}
              onChange={e => setAutoDetect(e.target.checked)}
              disabled={!activeModel?.loaded || connectionStatus === 'idle'}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
            />
            <label htmlFor="auto" style={{ fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}>
              Sürekli otomatik tarama (her ~1.8s)
            </label>
          </div>
        </div>

        {/* ── Right: Model selector + History ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Model selector */}
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <div className="card-title" style={{ margin: 0 }}>Model Seç</div>
              <Link to="/training" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>
                + Yeni model eğit
              </Link>
            </div>

            {models.length === 0 ? (
              <div className="text-muted">
                Henüz model yok. <Link to="/training" style={{ color: 'var(--accent)' }}>Model Eğitimi</Link> sayfasından oluştur.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {models.map(m => {
                  const isActive = activeModel?.model === m.name && activeModel?.loaded
                  const hasClasses = m.classes?.length > 0
                  return (
                    <div key={m.name} style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: isActive ? 'rgba(108,99,255,0.15)' : 'var(--surface2)',
                      border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                      <div className="flex justify-between items-center">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isActive && <span style={{ color: 'var(--accent)', fontSize: 11 }}>▶</span>}
                            {m.name.replace('.pkl', '')}
                            {!hasClasses && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>(meta yok)</span>}
                          </div>
                          {hasClasses && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                              {m.classes.length} sınıf: {m.classes.slice(0, 5).map(c => iconFor(c) + ' ' + c).join('  ·  ')}{m.classes.length > 5 ? '  ...' : ''}
                            </div>
                          )}
                        </div>
                        <button
                          className="btn btn-ghost"
                          style={{
                            fontSize: 11, padding: '4px 12px', flexShrink: 0, marginLeft: 8,
                            background: isActive ? 'var(--accent)' : undefined,
                            color: isActive ? 'white' : undefined,
                          }}
                          onClick={() => !isActive && handleLoadModel(m.name)}
                          disabled={loadingModel === m.name || !!loadingModel}
                        >
                          {loadingModel === m.name
                            ? <span className="spinner" style={{ width: 12, height: 12 }} />
                            : isActive ? '✓ Aktif' : 'Seç'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* History */}
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <div className="card-title" style={{ margin: 0 }}>Tarama Geçmişi ({history.length})</div>
              {history.length > 0 && (
                <button className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }} onClick={handleClearHistory}>
                  Temizle
                </button>
              )}
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {history.length === 0
                ? <div className="text-muted">Henüz tarama yok</div>
                : history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between" style={{ padding: '7px 10px', background: 'var(--surface2)', borderRadius: 7 }}>
                    <div className="flex items-center gap-2">
                      <span>{iconFor(h.label)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{h.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 12, color: CONFIDENCE_COLORS(h.confidence?.[h.label] ?? 0), fontWeight: 700 }}>
                        %{(h.confidence?.[h.label] ?? 0).toFixed(0)}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {h.timestamp ? new Date(h.timestamp * 1000).toLocaleTimeString('tr-TR') : ''}
                      </span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
