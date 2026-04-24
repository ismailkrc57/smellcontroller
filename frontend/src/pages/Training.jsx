import { useState, useEffect, useRef } from 'react'
import { recording, training } from '../services/api'

export default function Training() {
  const [files, setFiles] = useState([])
  const [selected, setSelected] = useState([])
  const [algorithm, setAlgorithm] = useState('knn')
  const [modelName, setModelName] = useState('my_model')
  const [status, setStatus] = useState({ running: false, progress: 0, message: '', result: null })
  const [models, setModels] = useState([])
  const [activeModel, setActiveModel] = useState(null)
  const [labelMapStr, setLabelMapStr] = useState('')
  const pollRef = useRef(null)

  const loadData = async () => {
    const [filesR, modelsR, activeR] = await Promise.allSettled([
      recording.list(),
      training.listModels(),
      training.activeModel(),
    ])
    if (filesR.status === 'fulfilled') setFiles(filesR.value.data.files)
    if (modelsR.status === 'fulfilled') setModels(modelsR.value.data.models)
    if (activeR.status === 'fulfilled') setActiveModel(activeR.value.data)
  }

  useEffect(() => {
    loadData()
    return () => clearInterval(pollRef.current)
  }, [])

  const toggleFile = (name) => {
    setSelected(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])
  }

  const handleTrain = async () => {
    if (selected.length === 0) return alert('En az bir CSV dosyası seçin')
    if (!modelName.trim()) return alert('Model adı girin')

    await training.start(selected, algorithm, modelName.trim())
    setStatus({ running: true, progress: 5, message: 'Başlatılıyor...', result: null })

    pollRef.current = setInterval(async () => {
      try {
        const r = await training.getStatus()
        setStatus(r.data)
        if (!r.data.running) {
          clearInterval(pollRef.current)
          loadData()
        }
      } catch {}
    }, 800)
  }

  const handleLoadModel = async (modelName, labelMap) => {
    try {
      await training.loadModel(modelName, labelMap)
      const r = await training.activeModel()
      setActiveModel(r.data)
      alert(`Model yüklendi: ${modelName}`)
    } catch (e) {
      alert('Hata: ' + e.response?.data?.detail || e.message)
    }
  }

  const parseCustomLabelMap = () => {
    try {
      return labelMapStr.trim() ? JSON.parse(labelMapStr) : null
    } catch {
      return null
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Model Eğitimi</h2>
        <p>Kayıtlı verilerden ML modeli oluşturun</p>
      </div>

      <div className="grid-2 mb-4" style={{ alignItems: 'start' }}>
        {/* Train Panel */}
        <div className="card">
          <div className="card-title">Yeni Model Eğit</div>

          <div className="mb-3">
            <label className="field-label">Eğitim Verisi — CSV Dosyaları</label>
            {files.length === 0 ? (
              <div className="text-muted">Önce Veri Toplama sayfasından kayıt alın</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {files.map(f => (
                  <label key={f.name} className="tag" style={{ cursor: 'pointer', borderColor: selected.includes(f.name) ? 'var(--accent)' : undefined }}>
                    <input type="checkbox" checked={selected.includes(f.name)} onChange={() => toggleFile(f.name)} />
                    <span>{f.name.replace('sensor_data_', '').replace(/\.csv$/, '')}</span>
                    <span className="text-muted">({f.size_kb}kb)</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label className="field-label">Algoritma</label>
            <select className="select" value={algorithm} onChange={e => setAlgorithm(e.target.value)} disabled={status.running}>
              <option value="knn">KNN (K-Nearest Neighbors)</option>
              <option value="random_forest">Random Forest</option>
              <option value="svm">SVM (Support Vector Machine)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="field-label">Model Adı</label>
            <input className="input" value={modelName} onChange={e => setModelName(e.target.value)} disabled={status.running} placeholder="my_model" />
          </div>

          {status.running && (
            <div className="mb-3">
              <div className="flex justify-between mb-1">
                <span style={{ fontSize: 12 }}>{status.message}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{status.progress}%</span>
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${status.progress}%` }} />
              </div>
            </div>
          )}

          {status.result && (
            <div className="mb-3" style={{ background: 'rgba(6,214,160,0.1)', border: '1px solid var(--success)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>
                Eğitim Tamamlandı — %{status.result.accuracy} Doğruluk
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {status.result.samples} örnek · {status.result.classes?.join(', ')}
              </div>
              {status.result.confusion_matrix && (
                <div className="mt-2">
                  <div style={{ fontSize: 11, marginBottom: 4, color: 'var(--text-muted)' }}>Confusion Matrix:</div>
                  <ConfusionMatrix matrix={status.result.confusion_matrix} labels={status.result.classes} />
                </div>
              )}
            </div>
          )}

          {status.message && !status.running && !status.result && (
            <div className="mb-3 text-danger" style={{ fontSize: 12 }}>{status.message}</div>
          )}

          <button className="btn btn-primary w-full" onClick={handleTrain} disabled={status.running || selected.length === 0}>
            {status.running ? <><span className="spinner" /> Eğitiliyor...</> : 'Modeli Eğit'}
          </button>
        </div>

        {/* Models Panel */}
        <div className="card">
          <div className="card-title">Mevcut Modeller</div>

          {activeModel?.loaded && (
            <div className="mb-3" style={{ background: 'rgba(108,99,255,0.1)', border: '1px solid var(--accent)', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>AKTİF MODEL</div>
              <div style={{ fontWeight: 600 }}>{activeModel.model}</div>
            </div>
          )}

          <div className="mb-3">
            <label className="field-label">Özel Etiket Haritası (JSON, opsiyonel)</label>
            <input
              className="input"
              placeholder='{"0": "Hava", "1": "Kahve", "2": "Kolonya"}'
              value={labelMapStr}
              onChange={e => setLabelMapStr(e.target.value)}
            />
          </div>

          {models.length === 0 ? (
            <div className="text-muted">Model bulunamadı</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {models.map(m => (
                <div key={m.name} className="flex items-center justify-between" style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</span>
                    <span className="text-muted" style={{ marginLeft: 8 }}>{m.size_kb} KB</span>
                  </div>
                  <button
                    className={`btn btn-ghost`}
                    style={{ fontSize: 11, padding: '4px 12px', background: activeModel?.model === m.name ? 'var(--accent)' : undefined, color: activeModel?.model === m.name ? 'white' : undefined }}
                    onClick={() => handleLoadModel(m.name, parseCustomLabelMap())}
                  >
                    {activeModel?.model === m.name ? 'Aktif' : 'Yükle'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <hr className="divider" />
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text)' }}>Algoritma Rehberi</strong><br />
            <br />
            <strong>KNN:</strong> Hızlı, az veriyle çalışır. Başlangıç için ideal.<br />
            <strong>Random Forest:</strong> Gürültüye dayanıklı, dengeli. Genel kullanım için en iyi.<br />
            <strong>SVM:</strong> Az sınıf, net ayrım varsa çok güçlü. Eğitimi yavaş.
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfusionMatrix({ matrix, labels }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ padding: '3px 8px', color: 'var(--text-muted)' }}>↓Gerçek / Tahmin→</th>
            {labels?.map(l => <th key={l} style={{ padding: '3px 8px', color: 'var(--accent)' }}>{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td style={{ padding: '3px 8px', color: 'var(--accent)', fontWeight: 600 }}>{labels?.[i]}</td>
              {row.map((v, j) => (
                <td key={j} style={{
                  padding: '3px 8px', textAlign: 'center',
                  background: i === j ? 'rgba(6,214,160,0.2)' : v > 0 ? 'rgba(239,71,111,0.2)' : 'transparent',
                  fontWeight: i === j ? 700 : 400,
                }}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
