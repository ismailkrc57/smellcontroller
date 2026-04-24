import { useState, useEffect, useCallback, useRef } from 'react'
import { sensor } from '../services/api'
import { AllChannelsChart, ChipGroupChart, FeaturesChart, HistoryLineChart } from '../components/SensorChart/ChannelChart'

const CHIP_NAMES = ['Çip 1 (CH1–16)', 'Çip 2 (CH17–32)', 'Çip 3 (CH33–48)', 'Çip 4 (CH49–64)']
const MAX_HISTORY = 60

export default function Monitor({ sensorData, connectionStatus, onSend }) {
  const [ports, setPorts] = useState([])
  const [selectedPort, setSelectedPort] = useState('')
  const [view, setView] = useState('all') // all | chips | features | history
  const [history, setHistory] = useState([])
  const [histFeature, setHistFeature] = useState(0)
  const [fanSpeed, setFanSpeed] = useState(null)

  useEffect(() => {
    sensor.getPorts().then(r => {
      const p = r.data.ports
      setPorts(p)
      const smell = p.find(x => x.description?.includes('CP210') || x.description?.includes('UART'))
      if (smell) setSelectedPort(smell.device)
      else if (p.length > 0) setSelectedPort(p[0].device)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (sensorData?.channels) {
      setHistory(prev => {
        const next = [sensorData, ...prev].slice(0, MAX_HISTORY)
        return next
      })
    }
  }, [sensorData])

  const handleConnect = () => {
    if (!selectedPort) return
    onSend({ action: 'connect', port: selectedPort })
  }

  const handleSimulate = () => onSend({ action: 'simulate' })
  const handleDisconnect = () => onSend({ action: 'disconnect' })

  const handleFan = (speed) => {
    setFanSpeed(speed)
    onSend({ action: 'fan', speed })
  }

  const isConnected = connectionStatus !== 'idle'

  return (
    <div>
      <div className="page-header">
        <h2>Canlı Sensör İzleme</h2>
        <p>64 kanal gerçek zamanlı direnç değerleri (Ω)</p>
      </div>

      {/* Connection Panel */}
      <div className="card mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div style={{ flex: 1, minWidth: 180 }}>
            <select
              className="select"
              value={selectedPort}
              onChange={e => setSelectedPort(e.target.value)}
              disabled={isConnected}
            >
              {ports.map(p => (
                <option key={p.device} value={p.device}>{p.device} — {p.description}</option>
              ))}
              {ports.length === 0 && <option value="">Port bulunamadı</option>}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleConnect} disabled={isConnected || !selectedPort}>
            Bağlan
          </button>
          <button className="btn btn-ghost" onClick={handleSimulate} disabled={isConnected}>
            Simülatör
          </button>
          <button className="btn btn-danger" onClick={handleDisconnect} disabled={!isConnected}>
            Bağlantıyı Kes
          </button>

          {isConnected && (
            <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fan:</span>
              {[0, 1, 2, 3].map(s => (
                <button
                  key={s}
                  className={`btn btn-ghost`}
                  style={{ padding: '5px 10px', fontSize: 11, background: fanSpeed === s ? 'var(--accent)' : undefined }}
                  onClick={() => handleFan(s)}
                >
                  {s === 0 ? 'Kapalı' : `H${s}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Stats */}
      {sensorData && (
        <div className="grid-4 mb-4">
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 20 }}>{sensorData.temperature?.toFixed(2)}°C</div>
            <div className="stat-label">Sıcaklık</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 20 }}>{sensorData.humidity?.toFixed(2)}%</div>
            <div className="stat-label">Nem</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 20 }}>{history.length}</div>
            <div className="stat-label">Örnek Sayısı</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 20, color: sensorData.simulated ? 'var(--warning)' : 'var(--success)' }}>
              {sensorData.simulated ? 'SİMÜLE' : 'CANLI'}
            </div>
            <div className="stat-label">Kaynak</div>
          </div>
        </div>
      )}

      {/* Chart View Tabs */}
      <div className="card">
        <div className="flex gap-2 mb-4">
          {[
            { key: 'all', label: '64 Kanal' },
            { key: 'chips', label: '4 Çip Grubu' },
            { key: 'features', label: '16 Özellik' },
            { key: 'history', label: 'Geçmiş' },
          ].map(tab => (
            <button
              key={tab.key}
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '6px 14px', background: view === tab.key ? 'var(--accent)' : undefined, color: view === tab.key ? 'white' : undefined }}
              onClick={() => setView(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {view === 'all' && (
          <div>
            <div className="card-title">Tüm 64 Kanal — Ham Direnç (Ω)</div>
            <AllChannelsChart channels={sensorData?.channels} />
            <div className="text-muted mt-2" style={{ fontSize: 11 }}>
              Her bar bir kemirezistör kanalının anlık direnç değerini gösterir. Koku geldiğinde direnç değişimi artar.
            </div>
          </div>
        )}

        {view === 'chips' && (
          <div>
            <div className="card-title">4 Çip Grubu (16 Kanal / Çip)</div>
            <div className="grid-2" style={{ gap: 20 }}>
              {[0, 1, 2, 3].map(chip => (
                <div key={chip}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                    {CHIP_NAMES[chip]}
                  </div>
                  <ChipGroupChart channels={sensorData?.channels} chipIndex={chip} />
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'features' && (
          <div>
            <div className="card-title">16 Agregat Özellik (ML Girdisi)</div>
            <FeaturesChart features={sensorData?.features} />
            <div className="text-muted mt-2" style={{ fontSize: 11 }}>
              64 kanalın 4 çip içindeki ortalamalarıdır. F1 = ort(CH1, CH17, CH33, CH49) ... F16 = ort(CH16, CH32, CH48, CH64)
            </div>
          </div>
        )}

        {view === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="card-title" style={{ margin: 0 }}>Özellik Geçmişi (son {MAX_HISTORY} örnek)</div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Özellik:</span>
                <select
                  className="select"
                  style={{ width: 80, padding: '4px 8px', fontSize: 12 }}
                  value={histFeature}
                  onChange={e => setHistFeature(Number(e.target.value))}
                >
                  {Array.from({ length: 16 }, (_, i) => (
                    <option key={i} value={i}>F{i + 1}</option>
                  ))}
                </select>
              </div>
            </div>
            <HistoryLineChart history={history} featureIndex={histFeature} />
          </div>
        )}
      </div>

      {/* Channel Info */}
      <div className="card mt-4">
        <div className="card-title">Kanal Açıklaması</div>
        <div className="grid-2" style={{ gap: 12 }}>
          {[
            { title: 'Ne ölçülüyor?', desc: 'Her kanal bir kemirezistörün elektriksel direncini (Ohm) ölçer. Bu değer saf bir yoğunluk değildir; koku moleküllerinin sensör yüzeyindeki kimyasal etkileşiminin sonucudur.' },
            { title: 'Değer nasıl yorumlanır?', desc: 'Baseline (temiz hava) değerinden sapma ne kadar büyükse koku o kadar güçlüdür. Farklı koku tipleri farklı kanal kombinasyonlarında tepki verir — bu "parmak izi" ML tarafından öğrenilir.' },
            { title: 'Sıcaklık ve Nem', desc: 'Sensör tepkisi ortam sıcaklığına ve nemine duyarlıdır. Bu iki değer ML modelinde normalizasyon için kullanılabilir.' },
            { title: 'MΩ değerleri neden var?', desc: 'Bazı kanallar bazı kokulara çok az tepki verir ve direnç çok yükselir (10MΩ üzeri). Bu normal — o kanal o koku için seçici değil demektir.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
