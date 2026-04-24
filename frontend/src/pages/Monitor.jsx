import { useState, useEffect, useRef } from 'react'
import { sensor } from '../services/api'
import { AllChannelsChart, ChipGroupChart, FeaturesChart, HistoryLineChart, IntensityMeter, formatVal } from '../components/SensorChart/ChannelChart'
import { IntensityHeatmap } from '../components/SensorChart/IntensityHeatmap'
import { CombinedRadar, ChipRadar } from '../components/SensorChart/OdorRadar'

const MAX_HISTORY = 80

const TABS = [
  { key: 'heatmap',  label: 'Isı Haritası',      icon: '▦', desc: '64 kanalın yoğunluk renk haritası' },
  { key: 'radar',    label: 'Koku Parmak İzi',    icon: '◎', desc: '4 dedektörün radar görünümü' },
  { key: 'bars',     label: 'Kanal Grafikleri',   icon: '▐', desc: '64 kanal direnç değerleri' },
  { key: 'features', label: 'ML Özellikleri',     icon: '⊞', desc: '16 agregat özellik (model girdisi)' },
  { key: 'timeline', label: 'Zaman Serisi',       icon: '◈', desc: 'Seçili özelliğin geçmişi' },
]

const CHIP_COLORS = ['#6c63ff', '#00d4aa', '#ffd166', '#ff6b6b']
const CHIP_LABELS = ['Dedektör 1\n(CH 1–16)', 'Dedektör 2\n(CH 17–32)', 'Dedektör 3\n(CH 33–48)', 'Dedektör 4\n(CH 49–64)']

function friendlyPort(port) {
  return port.friendly_name || 'Smell Inspector'
}

export default function Monitor({ sensorData, connectionStatus, onSend, wsStatus }) {
  const [ports, setPorts] = useState([])
  const [selectedPort, setSelectedPort] = useState('')
  const [tab, setTab] = useState('heatmap')
  const [history, setHistory] = useState([])
  const [selectedFeatures, setSelectedFeatures] = useState([0, 1, 2])
  const [fanSpeed, setFanSpeed] = useState(null)
  const [chipView, setChipView] = useState(0)
  const [connectError, setConnectError] = useState(null)

  useEffect(() => {
    sensor.getPorts().then(r => {
      const p = r.data.ports
      setPorts(p)
      if (p.length > 0) setSelectedPort(p[0].device)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (sensorData?.channels) {
      setHistory(prev => [sensorData, ...prev].slice(0, MAX_HISTORY))
    }
  }, [sensorData])

  const isConnected = connectionStatus !== 'idle'
  const wsReady = wsStatus === 'connected'

  const handleConnect = () => {
    setConnectError(null)
    const ok = onSend({ action: 'connect', port: selectedPort })
    if (ok === false) setConnectError('Sunucu bağlantısı kurulamadı. Lütfen bekleyin...')
  }
  const handleSimulate = () => {
    setConnectError(null)
    const ok = onSend({ action: 'simulate' })
    if (ok === false) setConnectError('Sunucu bağlantısı kurulamadı. Lütfen bekleyin...')
  }
  const handleDisconnect = () => onSend({ action: 'disconnect' })

  const toggleFeature = (fi) => {
    setSelectedFeatures(prev =>
      prev.includes(fi)
        ? prev.filter(x => x !== fi)
        : [...prev, fi].slice(0, 6)
    )
  }

  return (
    <div>
      <div className="page-header">
        <h2>Canlı Sensör İzleme</h2>
        <p>Cihazdan gelen koku sinyallerini gerçek zamanlı görüntüle</p>
      </div>

      {/* ── WS not ready banner ── */}
      {!wsReady && (
        <div style={{ background: 'rgba(255,209,102,0.1)', border: '1px solid var(--warning)', borderRadius: 10, padding: '10px 16px', marginBottom: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--warning)', borderColor: 'rgba(255,209,102,0.3)' }} />
          <span style={{ color: 'var(--warning)' }}>
            {wsStatus === 'connecting' ? 'Sunucuya bağlanılıyor...' : 'Sunucu bağlantısı kesildi, yeniden deneniyor...'}
          </span>
        </div>
      )}

      {connectError && (
        <div style={{ background: 'rgba(239,71,111,0.1)', border: '1px solid var(--danger)', borderRadius: 10, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: 'var(--danger)' }}>
          {connectError}
        </div>
      )}

      {/* ── Connection Card ── */}
      <div className="card mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {!isConnected ? (
            <>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="field-label">Cihaz</label>
                {ports.length === 0 ? (
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                    Bağlı USB cihaz bulunamadı
                  </div>
                ) : (
                  <select className="select" value={selectedPort} onChange={e => setSelectedPort(e.target.value)}>
                    {ports.map(p => (
                      <option key={p.device} value={p.device}>{friendlyPort(p)}</option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ paddingTop: 18 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleConnect}
                  disabled={!selectedPort || !wsReady}
                  title={!wsReady ? 'Sunucu bağlantısı bekleniyor...' : ''}
                >
                  {wsReady ? 'Cihaza Bağlan' : <><span className="spinner" style={{ width: 14, height: 14 }} /> Bekleniyor</>}
                </button>
              </div>
              <div style={{ paddingTop: 18 }}>
                <button className="btn btn-ghost" onClick={handleSimulate} disabled={!wsReady}>
                  Demo Modu
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: connectionStatus === 'live' ? 'var(--success)' : 'var(--warning)', boxShadow: `0 0 8px ${connectionStatus === 'live' ? 'var(--success)' : 'var(--warning)'}` }} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {connectionStatus === 'live' ? 'Smell Inspector Bağlı' : 'Demo Modu Aktif'}
                  </span>
                  {sensorData && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      · {history.length} örnek alındı
                    </span>
                  )}
                </div>
              </div>
              {/* Fan control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fan hızı:</span>
                {[
                  { s: 0, label: 'Kapalı' },
                  { s: 1, label: 'Düşük' },
                  { s: 2, label: 'Orta' },
                  { s: 3, label: 'Yüksek' },
                ].map(({ s, label }) => (
                  <button key={s} className="btn btn-ghost"
                    style={{ padding: '5px 10px', fontSize: 11, background: fanSpeed === s ? 'var(--accent)' : undefined, color: fanSpeed === s ? 'white' : undefined }}
                    onClick={() => { setFanSpeed(s); onSend({ action: 'fan', speed: s }) }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button className="btn btn-danger" onClick={handleDisconnect}>Bağlantıyı Kes</button>
            </>
          )}
        </div>
      </div>

      {/* ── Live Metrics Row ── */}
      {sensorData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 12, marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 22 }}>{sensorData.temperature?.toFixed(1)}°C</div>
            <div className="stat-label">Sıcaklık</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 22 }}>{sensorData.humidity?.toFixed(1)}%</div>
            <div className="stat-label">Nem</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: 22, color: sensorData.simulated ? 'var(--warning)' : 'var(--success)' }}>
              {sensorData.simulated ? 'Demo' : 'Canlı'}
            </div>
            <div className="stat-label">Kaynak</div>
          </div>
          <div className="stat-card">
            <IntensityMeter channels={sensorData.channels} />
            <div className="stat-label" style={{ marginTop: 8 }}>
              Min: {formatVal(Math.min(...sensorData.channels))} &nbsp;·&nbsp;
              Maks: {formatVal(Math.max(...sensorData.channels))}
            </div>
          </div>
        </div>
      )}

      {/* ── Chart Tabs ── */}
      <div className="card">
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key}
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '7px 14px', background: tab === t.key ? 'var(--accent)' : undefined, color: tab === t.key ? 'white' : undefined }}
              onClick={() => setTab(t.key)}
              title={t.desc}
            >
              <span style={{ marginRight: 5 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* ── Heatmap ── */}
        {tab === 'heatmap' && (
          <div>
            <div className="card-title">Koku Yoğunluk Haritası — 64 Kanal</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Her hücre bir sensör kanalını temsil eder. Sıcak renkler (kırmızı/sarı) yüksek direnç değişimini,
              soğuk renkler (mavi) düşük tepkiyi gösterir. Koku geldiğinde belirli bölgeler parlar.
            </p>
            <IntensityHeatmap channels={sensorData?.channels} />
          </div>
        )}

        {/* ── Radar ── */}
        {tab === 'radar' && (
          <div>
            <div className="card-title">Koku Parmak İzi Radarı</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Her dedektörün 16 kanalı bir radar grafiğinde gösterilir. Farklı kokular farklı "şekiller" oluşturur —
              bu şekil kokunun benzersiz parmak izidir.
            </p>
            <div style={{ marginBottom: 12 }}>
              <CombinedRadar channels={sensorData?.channels} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {[0, 1, 2, 3].map(i => (
                <button key={i} className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '5px 12px', borderColor: CHIP_COLORS[i], color: chipView === i ? 'white' : CHIP_COLORS[i], background: chipView === i ? CHIP_COLORS[i] : undefined }}
                  onClick={() => setChipView(i)}
                >
                  {CHIP_LABELS[i].split('\n')[0]}
                </button>
              ))}
            </div>
            <ChipRadar channels={sensorData?.channels} chipIndex={chipView} />
          </div>
        )}

        {/* ── Bar charts ── */}
        {tab === 'bars' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[0, 1, 2, 3].map(i => (
                <button key={i} className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '5px 12px', borderColor: CHIP_COLORS[i], color: chipView === 4 ? undefined : chipView === i ? 'white' : CHIP_COLORS[i], background: chipView === i ? CHIP_COLORS[i] : undefined }}
                  onClick={() => setChipView(i)}
                >
                  {CHIP_LABELS[i].split('\n')[0]}
                </button>
              ))}
              <button className="btn btn-ghost"
                style={{ fontSize: 11, padding: '5px 12px', background: chipView === 4 ? 'var(--accent)' : undefined, color: chipView === 4 ? 'white' : undefined }}
                onClick={() => setChipView(4)}
              >
                Tümü
              </button>
            </div>

            {chipView === 4 ? (
              <div>
                <div className="card-title">Tüm 64 Kanal — Ham Direnç (logaritmik ölçek)</div>
                <AllChannelsChart channels={sensorData?.channels} />
                <ChannelLegend />
              </div>
            ) : (
              <div>
                <div className="card-title" style={{ color: CHIP_COLORS[chipView] }}>
                  {CHIP_LABELS[chipView].replace('\n', ' ')} · 16 Kanal
                </div>
                <ChipGroupChart channels={sensorData?.channels} chipIndex={chipView} />
                <ChipChannelTable channels={sensorData?.channels} chipIndex={chipView} />
              </div>
            )}
          </div>
        )}

        {/* ── ML Features ── */}
        {tab === 'features' && (
          <div>
            <div className="card-title">16 ML Özelliği (Agregat)</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              64 kanal, her 4 dedektördeki aynı konumdaki kanalların ortalaması alınarak 16 özelliğe indirgenir.
              Bu 16 değer makine öğrenmesi modeline girdi olarak verilir.
              Sarı referans çizgisi ortalamayı gösterir; ortalama üzeri (yeşil) daha aktif kanallardır.
            </p>
            <FeaturesChart features={sensorData?.features} />
          </div>
        )}

        {/* ── Timeline ── */}
        {tab === 'timeline' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <div className="card-title" style={{ margin: 0 }}>Zaman Serisi — Son {MAX_HISTORY} Örnek</div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Seçili özelliklerin zaman içindeki değişimi. Koku yaklaştığında veya uzaklaştığında ani değişimler görürsünüz.
              En fazla 6 özellik aynı anda gösterilebilir.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {Array.from({ length: 16 }, (_, i) => (
                <button key={i}
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '4px 10px', background: selectedFeatures.includes(i) ? 'var(--accent)' : undefined, color: selectedFeatures.includes(i) ? 'white' : undefined }}
                  onClick={() => toggleFeature(i)}
                >
                  Ö{i + 1}
                </button>
              ))}
            </div>
            <HistoryLineChart history={history} selectedFeatures={selectedFeatures} />
          </div>
        )}
      </div>

      {/* ── Channel Guide ── */}
      <div className="card mt-4">
        <div className="card-title">Sensör Kanalları Hakkında</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { icon: '⊞', title: 'Kanal nedir?', desc: 'Cihaz içinde 64 adet minik karbon nanotüp sensörü var. Her biri farklı kimyasal bileşiklere farklı tepki verir. Tıpkı burnumuzda farklı alıcı hücrelerin olması gibi.' },
            { icon: '◈', title: 'Değer ne anlama gelir?', desc: 'Her kanal elektriksel direncini (Ohm) ölçer. Koku molekülleri sensörle temas edince direnç değişir. Bu değişim, o kokunun "parmak izini" oluşturur.' },
            { icon: '▦', title: 'Neden bu kadar farklı değerler?', desc: 'Her kanalın kimyasal hassasiyeti farklıdır. Bazı kanallar belirli kokulara çok duyarlı (büyük değişim), bazıları ise o koku için neredeyse hiç tepki vermez.' },
            { icon: '◎', title: 'Logaritmik ölçek neden var?', desc: 'Değerler 1kΩ ile 10MΩ arasında değişebilir — bu 10.000 kat fark. Logaritmik ölçek, tüm kanalları aynı grafikte anlamlı biçimde gösterir.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Chip map */}
        <div className="card-title">Dedektör Haritası</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {CHIP_LABELS.map((label, i) => (
            <div key={i} style={{ background: 'var(--surface2)', border: `1px solid ${CHIP_COLORS[i]}33`, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: CHIP_COLORS[i], marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {label.split('\n')[0]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label.split('\n')[1]}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>16 kanal · logaritmik</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── helpers ──

function ChannelLegend() {
  const CHIP_COLORS = ['#6c63ff', '#00d4aa', '#ffd166', '#ff6b6b']
  const CHIP_LABELS = ['Dedektör 1 (CH1–16)', 'Dedektör 2 (CH17–32)', 'Dedektör 3 (CH33–48)', 'Dedektör 4 (CH49–64)']
  return (
    <div className="flex gap-4 mt-2" style={{ flexWrap: 'wrap' }}>
      {CHIP_LABELS.map((l, i) => (
        <div key={i} className="flex items-center gap-2" style={{ fontSize: 11 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: CHIP_COLORS[i] }} />
          <span style={{ color: 'var(--text-muted)' }}>{l}</span>
        </div>
      ))}
    </div>
  )
}

function ChipChannelTable({ channels, chipIndex }) {
  if (!channels?.length) return null
  const CHIP_COLORS = ['#6c63ff', '#00d4aa', '#ffd166', '#ff6b6b']
  const start = chipIndex * 16
  const slice = channels.slice(start, start + 16)
  const max = Math.max(...slice)
  const min = Math.min(...slice)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 12 }}>
      {slice.map((v, i) => {
        const pct = Math.round(((Math.log10(Math.max(v,1)) - Math.log10(Math.max(min,1))) / (Math.log10(Math.max(max,1)) - Math.log10(Math.max(min,1)) || 1)) * 100)
        return (
          <div key={i} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '7px 10px', borderLeft: `2px solid ${CHIP_COLORS[chipIndex]}` }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>CH{start + i + 1} · Kanal {i + 1}</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{formatVal(v)}</div>
            <div style={{ marginTop: 4, height: 3, background: 'var(--border)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: CHIP_COLORS[chipIndex], borderRadius: 2 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
