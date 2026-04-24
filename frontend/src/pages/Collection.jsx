import { useState, useEffect, useRef } from 'react'
import { recording } from '../services/api'

const PHASES = [
  { key: 'stabilization', label: 'Stabilizasyon', duration: 30, color: 'var(--accent)', desc: 'Sensörü temiz havada stabilize edin' },
  { key: 'exposure', label: 'Maruziyet', duration: 30, color: 'var(--success)', desc: 'Kokunuzu sensöre tutun' },
  { key: 'recovery', label: 'Geri Kazanım', duration: 15, color: 'var(--warning)', desc: 'Kokunuzu uzaklaştırın, sensör toparlanıyor' },
]

export default function Collection({ sensorData, connectionStatus }) {
  const [label, setLabel] = useState('')
  const [files, setFiles] = useState([])
  const [recStatus, setRecStatus] = useState({ running: false, samples: 0, duration: 0 })
  const [phase, setPhase] = useState(null) // null | 0 | 1 | 2
  const [phaseTimer, setPhaseTimer] = useState(0)
  const [usePhases, setUsePhases] = useState(false)
  const timerRef = useRef(null)
  const pollRef = useRef(null)

  const loadFiles = () => recording.list().then(r => setFiles(r.data.files)).catch(() => {})

  useEffect(() => {
    loadFiles()
    return () => {
      clearInterval(timerRef.current)
      clearInterval(pollRef.current)
    }
  }, [])

  const pollStatus = () => {
    recording.status().then(r => setRecStatus(r.data)).catch(() => {})
  }

  const handleStart = async () => {
    if (!label.trim()) return alert('Lütfen bir koku etiketi girin')
    if (connectionStatus === 'idle') return alert('Önce sensörü Monitor sayfasından bağlayın')

    await recording.start(label.trim())
    setRecStatus({ running: true, samples: 0, duration: 0 })
    pollRef.current = setInterval(pollStatus, 1000)

    if (usePhases) {
      setPhase(0)
      setPhaseTimer(PHASES[0].duration)
      runPhaseTimer(0)
    }
  }

  const runPhaseTimer = (phaseIdx) => {
    clearInterval(timerRef.current)
    let remaining = PHASES[phaseIdx].duration
    setPhaseTimer(remaining)
    timerRef.current = setInterval(() => {
      remaining -= 1
      setPhaseTimer(remaining)
      if (remaining <= 0) {
        clearInterval(timerRef.current)
        const next = phaseIdx + 1
        if (next < PHASES.length) {
          setPhase(next)
          runPhaseTimer(next)
        } else {
          handleStop(true)
        }
      }
    }, 1000)
  }

  const handleStop = async (auto = false) => {
    clearInterval(timerRef.current)
    clearInterval(pollRef.current)
    setPhase(null)
    try {
      const r = await recording.stop()
      if (r.data.ok) {
        alert(`Kaydedildi: ${r.data.file}\n${r.data.rows} örnek, ${r.data.duration}s`)
        loadFiles()
      }
    } catch (e) {
      if (!auto) alert('Durdurma hatası: ' + e.message)
    }
    setRecStatus({ running: false, samples: 0, duration: 0 })
  }

  const handleDelete = async (fname) => {
    if (!confirm(`${fname} silinsin mi?`)) return
    await recording.delete(fname)
    loadFiles()
  }

  const currentPhase = phase !== null ? PHASES[phase] : null

  return (
    <div>
      <div className="page-header">
        <h2>Veri Toplama</h2>
        <p>ML eğitimi için etiketli sensör verisi kaydedin</p>
      </div>

      <div className="grid-2 mb-4" style={{ alignItems: 'start' }}>
        {/* Recording Panel */}
        <div className="card">
          <div className="card-title">Yeni Kayıt</div>

          <div className="mb-3">
            <label className="field-label">Koku Etiketi</label>
            <input
              className="input"
              placeholder="örn: kahve, kolonya, vanilya..."
              value={label}
              onChange={e => setLabel(e.target.value)}
              disabled={recStatus.running}
            />
          </div>

          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="usePhases"
              checked={usePhases}
              onChange={e => setUsePhases(e.target.checked)}
              disabled={recStatus.running}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
            />
            <label htmlFor="usePhases" style={{ fontSize: 13, cursor: 'pointer' }}>
              3 Fazlı ölçüm protokolü kullan
            </label>
          </div>

          {usePhases && !recStatus.running && (
            <div className="mb-3" style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12 }}>
              {PHASES.map((p, i) => (
                <div key={p.key} className="flex items-center gap-2 mb-2" style={{ fontSize: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#0f1117' }}>{i + 1}</div>
                  <span style={{ fontWeight: 600 }}>{p.label}</span>
                  <span className="text-muted">— {p.duration}s — {p.desc}</span>
                </div>
              ))}
            </div>
          )}

          {recStatus.running && currentPhase && (
            <div className="mb-3" style={{ background: 'var(--surface2)', borderRadius: 8, padding: 16, border: `1px solid ${currentPhase.color}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: currentPhase.color, marginBottom: 6, textTransform: 'uppercase' }}>
                Faz {phase + 1}/{PHASES.length} — {currentPhase.label}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{currentPhase.desc}</div>
              <div className="flex items-center gap-3">
                <div style={{ fontSize: 36, fontWeight: 700, color: currentPhase.color, lineHeight: 1 }}>{phaseTimer}s</div>
                <div style={{ flex: 1 }}>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{
                      width: `${(1 - phaseTimer / currentPhase.duration) * 100}%`,
                      background: currentPhase.color
                    }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {recStatus.running && (
            <div className="mb-3" style={{ background: 'rgba(6,214,160,0.1)', borderRadius: 8, padding: 12, border: '1px solid var(--success)' }}>
              <div className="flex gap-4">
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>{recStatus.samples}</div>
                  <div className="text-muted">Örnek</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>{recStatus.duration}s</div>
                  <div className="text-muted">Süre</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{label}</div>
                  <div className="text-muted">Etiket</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button className="btn btn-success w-full" onClick={handleStart} disabled={recStatus.running || !label.trim() || connectionStatus === 'idle'}>
              {recStatus.running ? <><span className="spinner" /> Kaydediliyor...</> : 'Kaydı Başlat'}
            </button>
            <button className="btn btn-danger" onClick={() => handleStop(false)} disabled={!recStatus.running}>
              Durdur
            </button>
          </div>

          {connectionStatus === 'idle' && (
            <div className="text-muted mt-2" style={{ fontSize: 11 }}>
              ⚠ Sensörü önce Monitor sayfasından bağlayın
            </div>
          )}
        </div>

        {/* Current Sensor Values */}
        <div className="card">
          <div className="card-title">Anlık Değerler</div>
          {sensorData ? (
            <div>
              <div className="grid-2 mb-3">
                <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{sensorData.temperature?.toFixed(1)}°C</div>
                  <div className="text-muted">Sıcaklık</div>
                </div>
                <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{sensorData.humidity?.toFixed(1)}%</div>
                  <div className="text-muted">Nem</div>
                </div>
              </div>
              <div className="card-title">16 Özellik (F1–F16)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {sensorData.features?.map((v, i) => (
                  <div key={i} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 2 }}>F{i + 1}</div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>
                      {v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-muted">Sensör bağlı değil veya veri yok</div>
          )}
        </div>
      </div>

      {/* ── Usage Guide ── */}
      <div className="card mb-4">
        <div className="card-title">Nasıl Kullanılır? — Örnek: Bozuk Muz Tespiti</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Sensörü bir kokunun "nasıl göründüğünü" öğretmek için birden fazla kayıt almanız gerekir.
          Model doğruluğu için her etiket için <strong style={{ color: 'var(--text)' }}>en az 5–10 kayıt</strong> önerilir.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              step: '1', icon: '💨', label: 'ambient_hava',
              title: 'Önce taban çizgisini kaydet',
              desc: 'Sensörü temiz havaya maruz bırakın, etrafta koku olmadığında "ambient_hava" etiketiyle 3–5 kayıt alın. Bu, modelin "normal" koşulu öğrenmesini sağlar.',
              tip: 'Etiket: ambient_hava',
            },
            {
              step: '2', icon: '🍌', label: 'taze_muz',
              title: 'Taze muz kaydet',
              desc: 'Taze bir muzu soyun ve sensöre yaklaştırın. 3 fazlı protokolü açık bırakın: önce sensör stabilize olur, sonra muzu tutarsınız, sonra uzaklaştırırsınız. En az 5 kayıt alın.',
              tip: 'Etiket: taze_muz',
            },
            {
              step: '3', icon: '🍌', label: 'bozuk_muz',
              title: 'Bozuk muz kaydet',
              desc: 'Bekletilmiş veya kahverengilenmiş bir muzu sensöre tutun. Aynı şekilde 5+ kayıt alın. Model iki kokunun farkını bu verilerden öğrenir.',
              tip: 'Etiket: bozuk_muz',
            },
            {
              step: '4', icon: '⊞', label: null,
              title: 'Model Eğitimi sayfasına geç',
              desc: 'Tüm kayıtları seçin → Random Forest algoritmasıyla "muz_modeli" adıyla eğitin. Eğitim sonucunda confusion matrix ve doğruluk oranı göreceksiniz.',
              tip: 'Sayfa: Model Eğitimi',
            },
            {
              step: '5', icon: '◎', label: null,
              title: 'Koku Tespiti sayfasında test et',
              desc: 'Yeni bir muz tutun, "Şimdi Tara" butonuna basın. Model hangi koku olduğunu ve güven yüzdesini gösterecek.',
              tip: 'Sayfa: Koku Tespiti',
            },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                {item.step}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</span>
                  {item.label && (
                    <span style={{ fontSize: 10, padding: '2px 8px', background: 'rgba(108,99,255,0.2)', color: 'var(--accent)', borderRadius: 10, fontWeight: 600 }}>
                      {item.tip}
                    </span>
                  )}
                  {!item.label && (
                    <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--surface)', color: 'var(--text-muted)', borderRadius: 10 }}>
                      {item.tip}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--warning)' }}>İpucu:</strong> Aynı etiketi farklı günlerde, farklı sıcaklıklarda kaydetmek modeli daha güçlü yapar.
          Sadece 1–2 kayıtla eğitilen modeller gerçek kullanımda yanılabilir.
        </div>
      </div>

      {/* ── Suggested Labels ── */}
      <div className="card mb-4">
        <div className="card-title">Öneri: Ne Kaydedebilirsiniz?</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { icon: '💨', label: 'ambient_hava', desc: 'Her projede zorunlu taban çizgisi' },
            { icon: '🍌', label: 'taze_muz', desc: 'Gıda tazeliği' },
            { icon: '🍌', label: 'bozuk_muz', desc: 'Gıda bozulması' },
            { icon: '🍎', label: 'taze_elma', desc: 'Meyve kalitesi' },
            { icon: '🥛', label: 'taze_sut', desc: 'Süt tazeliği' },
            { icon: '🥛', label: 'bozuk_sut', desc: 'Süt bozulması' },
            { icon: '🧴', label: 'kolonya', desc: 'Kimyasal referans' },
            { icon: '☕', label: 'kahve', desc: 'Kimyasal referans' },
            { icon: '🌿', label: 'nane', desc: 'Bitki kokuları' },
            { icon: '🔥', label: 'yanma_kokusu', desc: 'Güvenlik uyarısı' },
          ].map(item => (
            <div key={item.label}
              style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)' }}
              onClick={() => { setLabel(item.label) }}
              title={`"${item.label}" etiketini kullan`}
            >
              <div style={{ fontSize: 18, textAlign: 'center', marginBottom: 4 }}>{item.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, textAlign: 'center' }}>{item.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          Bir kartı tıklayınca etiket kutusuna otomatik girer.
        </div>
      </div>

      {/* Recordings List */}
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <div className="card-title" style={{ margin: 0 }}>Kaydedilen Dosyalar ({files.length})</div>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={loadFiles}>Yenile</button>
        </div>
        {files.length === 0 ? (
          <div className="text-muted">Henüz kayıt yok</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {files.map(f => (
              <div key={f.name} className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</span>
                  <span className="text-muted" style={{ marginLeft: 8 }}>{f.size_kb} KB</span>
                </div>
                <div className="flex gap-2">
                  <a href={recording.downloadUrl(f.name)} className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} download>
                    İndir
                  </a>
                  <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => handleDelete(f.name)}>
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
