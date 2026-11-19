import { useEffect, useRef, useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Tooltip,
} from 'recharts'
import { getSession } from '../services/session'
import { createSim, stepSim, triggerIncident, ventilate, evacuate, nowLabel } from './commandSim'
import './CommandCenter.css'

const DEFAULT_LEVEL = 70
const CHART_H = 260
const PLOT = { top: 12, right: 64, bottom: 24, left: 40 } // grafik çizim alanı kenar boşlukları
const LOG_KEY = 'smellcontrol_cc_log'

const CHANNELS = [
  { key: 'whatsapp', label: 'WhatsApp', to: 'Vardiya sorumlusu · +90 5•• ••• •• 12', color: '#25d366' },
  { key: 'telegram', label: 'Telegram', to: 'SmellControl Alarm grubu', color: '#2aabee' },
  { key: 'email', label: 'E-posta', to: 'isg@firma.com', color: '#ea4335' },
]

const STEPS = [
  { key: 'vent', label: 'Ortamı havalandır', hint: 'Havalandırma %90+ kapasiteye alınır' },
  { key: 'notify', label: 'Sorumluya haber ver', hint: 'Alan sorumlusu ve İSG ekibi bilgilendirilir' },
  { key: 'evac', label: 'Alanı boşalt', hint: 'Personel güvenli toplanma alanına yönlendirilir' },
]

function ChannelIcon({ k, size = 16 }) {
  if (k === 'whatsapp') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.4z" /></svg>
  )
  if (k === 'telegram') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 3.3 2.9 10.5c-1.3.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.3-1.6zM9.3 13.3l9-5.7-7.4 6.9-.3 3.2-1.3-4.4z" /></svg>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.3L4.4 7H4v.4l8 5.6 8-5.6V7h-.4L12 12.3z" /></svg>
  )
}

function loadLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY)) || [] } catch { return [] }
}

function statusOf(risk, level) {
  if (risk >= level) return 'danger'
  if (risk >= level - 15) return 'warn'
  return 'ok'
}

const STATUS_TEXT = { ok: 'Normal', warn: 'Yükseliyor', danger: 'Alarm' }

export default function CommandCenter() {
  // Demo simülasyonu: tek bir değiştirilebilir nesne, her saniye yeniden çizilir
  const [sim] = useState(createSim)

  const [, setTick] = useState(0)
  const [selected, setSelected] = useState('waste')
  const [levels, setLevels] = useState(() => Object.fromEntries(sim.points.map((p) => [p.id, DEFAULT_LEVEL])))
  const [channels, setChannels] = useState({ whatsapp: true, telegram: true, email: true })
  const [hoverLevel, setHoverLevel] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [toasts, setToasts] = useState([])
  const [log, setLog] = useState(loadLog)

  const levelsRef = useRef(levels)
  const channelsRef = useRef(channels)
  const armedRef = useRef({})
  useEffect(() => { levelsRef.current = levels }, [levels])
  useEffect(() => { channelsRef.current = channels }, [channels])

  const user = getSession()?.user
  const userName = user?.name || user?.email || 'Operatör'

  const addLog = (entry) => {
    setLog((prev) => {
      const next = [{ id: crypto.randomUUID(), at: new Date().toISOString(), ...entry }, ...prev].slice(0, 60)
      try { localStorage.setItem(LOG_KEY, JSON.stringify(next)) } catch { /* depolama kapalı olabilir */ }
      return next
    })
  }

  // ── Alarm tetikleme: kanallara "gönderim" animasyonu ───────────────
  const fireAlert = (p, level) => {
    const active = CHANNELS.filter((c) => channelsRef.current[c.key])
    const alert = {
      id: crypto.randomUUID(),
      pointId: p.id,
      pointName: p.name,
      value: p.risk.toFixed(0),
      level,
      at: nowLabel(),
      channels: active.map((c) => ({ key: c.key, status: 'sending' })),
      steps: STEPS.map((s) => ({ key: s.key, doneBy: null, doneAt: null })),
    }
    setAlerts((prev) => [alert, ...prev].slice(0, 6))
    addLog({ point: p.name, event: `Alarm: risk skoru ${alert.value} > ${level}`, by: 'Sistem' })

    active.forEach((c, i) => {
      setTimeout(() => {
        setAlerts((prev) => prev.map((a) => a.id !== alert.id ? a : {
          ...a, channels: a.channels.map((ch) => ch.key === c.key ? { ...ch, status: 'sent' } : ch),
        }))
        const toast = { id: crypto.randomUUID(), channel: c, point: p.name, value: alert.value }
        setToasts((prev) => [...prev, toast])
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 5200)
      }, 700 + i * 650)
    })
    if (active.length) {
      setTimeout(() => addLog({
        point: p.name, event: `Uyarı gönderildi: ${active.map((c) => c.label).join(', ')}`, by: 'Sistem',
      }), 700 + active.length * 650)
    }
  }

  // ── Canlı akış ─────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      stepSim(sim)
      for (const p of sim.points) {
        const level = levelsRef.current[p.id]
        const armed = armedRef.current[p.id] !== false
        if (armed && p.risk >= level) {
          armedRef.current[p.id] = false
          fireAlert(p, level)
        } else if (!armed && p.risk < level - 5) {
          armedRef.current[p.id] = true
        }
      }
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const point = sim.points.find((p) => p.id === selected)
  const level = levels[selected]
  const history = point.history

  // ── Alarm çizgisi: grafiğe dokunarak seviye belirleme ───────────────
  const levelFromEvent = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const y = Math.min(Math.max(e.clientY - r.top, 0), r.height)
    return Math.round(100 * (1 - y / r.height))
  }
  const placeAlarm = (e) => {
    const v = Math.min(Math.max(levelFromEvent(e), 5), 98)
    setLevels((prev) => ({ ...prev, [selected]: v }))
    armedRef.current[selected] = point.risk < v
    addLog({ point: point.name, event: `Alarm çizgisi ${v} olarak ayarlandı`, by: userName })
  }

  const confirmStep = (alertId, stepKey) => {
    const a = alerts.find((x) => x.id === alertId)
    const step = STEPS.find((s) => s.key === stepKey)
    const at = nowLabel()
    setAlerts((prev) => prev.map((x) => x.id !== alertId ? x : {
      ...x, steps: x.steps.map((s) => s.key === stepKey ? { ...s, doneBy: userName, doneAt: at } : s),
    }))
    if (stepKey === 'vent') ventilate(sim, a.pointId)
    if (stepKey === 'evac') evacuate(sim, a.pointId)
    addLog({ point: a.pointName, event: `Adım onaylandı: ${step.label}`, by: userName })
  }

  const st = statusOf(point.risk, level)
  const openAlerts = alerts.filter((a) => a.steps.some((s) => !s.doneBy)).length

  return (
    <div className="cc">
      <div className="page-header cc-header">
        <div>
          <h2>Command Center</h2>
          <p>Tüm ölçüm noktalarının canlı durumu, alarm çizgileri ve müdahale adımları</p>
        </div>
        <div className="cc-header-badges">
          <span className="cc-live"><i />Canlı · Demo verisi</span>
          <span className={`badge ${openAlerts ? 'badge-danger' : 'badge-success'}`}>
            {openAlerts ? `${openAlerts} açık uyarı` : 'Açık uyarı yok'}
          </span>
        </div>
      </div>

      <div className="cc-grid">
        {/* ── Sol: tesis haritası + nokta listesi ── */}
        <div className="cc-col">
          <div className="card">
            <div className="card-title">Tesis Haritası · Bir noktaya tıklayın</div>
            <svg className="cc-map" viewBox="0 0 420 260">
              <rect x="6" y="6" width="408" height="248" rx="12" className="cc-map-bg" />
              <rect x="20" y="20" width="120" height="100" rx="6" className="cc-room" />
              <rect x="150" y="20" width="120" height="100" rx="6" className="cc-room" />
              <rect x="280" y="20" width="120" height="100" rx="6" className="cc-room" />
              <rect x="20" y="140" width="140" height="100" rx="6" className="cc-room" />
              <rect x="170" y="140" width="110" height="100" rx="6" className="cc-room" />
              <rect x="290" y="140" width="110" height="100" rx="6" className="cc-room" />
              {sim.points.map((p) => {
                const s = statusOf(p.risk, levels[p.id])
                return (
                  <g key={p.id} className={`cc-pin ${s}${p.id === selected ? ' sel' : ''}`}
                    transform={`translate(${p.x} ${p.y})`} onClick={() => setSelected(p.id)}>
                    <circle r="18" className="cc-pin-ring" />
                    <circle r="7" className="cc-pin-dot" />
                    <text y="34" textAnchor="middle">{p.name}</text>
                  </g>
                )
              })}
            </svg>
          </div>

          <div className="card">
            <div className="card-title">Ölçüm Noktaları</div>
            <div className="cc-points">
              {sim.points.map((p) => {
                const s = statusOf(p.risk, levels[p.id])
                return (
                  <button key={p.id} className={`cc-point${p.id === selected ? ' sel' : ''}`} onClick={() => setSelected(p.id)}>
                    <span className={`cc-dot ${s}`} />
                    <span className="cc-point-name">{p.name}<small>{p.zone}</small></span>
                    <span className={`cc-point-val ${s}`}>{p.risk.toFixed(0)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Orta: canlı grafikler ── */}
        <div className="cc-col cc-main">
          <div className="card">
            <div className="cc-chart-head">
              <div>
                <div className="card-title" style={{ marginBottom: 4 }}>{point.name} · Koku Risk Skoru</div>
                <div className="cc-big">
                  <span className={st}>{point.risk.toFixed(0)}</span>
                  <small>/ 100</small>
                  <span className={`badge ${st === 'danger' ? 'badge-danger' : st === 'warn' ? 'badge-warning' : 'badge-success'}`}>
                    {STATUS_TEXT[st]}
                  </span>
                </div>
              </div>
              <div className="cc-chart-actions">
                <span className="text-muted">Alarm çizgisi: <b className="cc-level">{level}</b></span>
                <button className="btn btn-ghost" onClick={() => triggerIncident(sim, selected)}>Olay simüle et</button>
              </div>
            </div>

            <div className="cc-chart" style={{ height: CHART_H }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: PLOT.top, right: PLOT.right, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="ccRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#04e0b0" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#04e0b0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#2e3350" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="t" height={PLOT.bottom} tick={{ fill: '#7b82a0', fontSize: 10 }} interval={14} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} width={PLOT.left} tick={{ fill: '#7b82a0', fontSize: 10 }} tickLine={false} axisLine={false} ticks={[0, 25, 50, 75, 100]} />
                  {hoverLevel != null && (
                    <ReferenceLine y={hoverLevel} stroke="#7b82a0" strokeDasharray="2 4"
                      label={{ value: `+ ${hoverLevel}`, position: 'right', fill: '#7b82a0', fontSize: 11 }} />
                  )}
                  <ReferenceLine y={level} stroke="#ef476f" strokeWidth={1.5} strokeDasharray="6 4"
                    label={{ value: `Alarm ${level}`, position: 'right', fill: '#ef476f', fontSize: 11 }} />
                  <Area type="monotone" dataKey="risk" stroke="#04e0b0" strokeWidth={2} fill="url(#ccRisk)" isAnimationActive={false} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div
                className="cc-chart-hit"
                style={{ top: PLOT.top, right: PLOT.right, bottom: PLOT.bottom, left: PLOT.left }}
                onMouseMove={(e) => setHoverLevel(levelFromEvent(e))}
                onMouseLeave={() => setHoverLevel(null)}
                onClick={placeAlarm}
                title="Alarm çizgisi koymak için bir seviyeye dokunun"
              />
            </div>
            <div className="cc-hint">Grafikte bir seviyeye dokunarak alarm çizgisi koyun. Skor çizgiyi geçince seçili kanallardan uyarı gider.</div>

            <div className="cc-mini-grid">
              {[
                { key: 'temp', label: 'Sıcaklık', unit: '°C', color: '#ffd166', domain: ['dataMin - 1', 'dataMax + 1'] },
                { key: 'hum', label: 'Nem', unit: '%', color: '#7aa7ff', domain: ['dataMin - 3', 'dataMax + 3'] },
                { key: 'vent', label: 'Havalandırma', unit: '%', color: '#c792ea', domain: [0, 100] },
              ].map((m) => (
                <div key={m.key} className="cc-mini">
                  <div className="cc-mini-head">
                    <span>{m.label}</span>
                    <b style={{ color: m.color }}>{history.at(-1)[m.key]}{m.unit}</b>
                  </div>
                  <ResponsiveContainer width="100%" height={70}>
                    <LineChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                      <YAxis hide domain={m.domain} />
                      <Tooltip contentStyle={{ background: '#1a1d27', border: '1px solid #2e3350', fontSize: 11 }} labelStyle={{ color: '#7b82a0' }} formatter={(v) => [`${v}${m.unit}`, m.label]} />
                      <Line type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Kayıt Defteri · Kim, ne zaman?</div>
            <div className="cc-log">
              {log.length === 0 && <div className="text-muted">Henüz kayıt yok.</div>}
              {log.map((l) => (
                <div key={l.id} className="cc-log-row">
                  <span className="cc-log-time">{new Date(l.at).toLocaleString('tr-TR', { hour12: false })}</span>
                  <span className="cc-log-point">{l.point}</span>
                  <span className="cc-log-event">{l.event}</span>
                  <span className="cc-log-by">{l.by}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sağ: kanallar + uyarılar ── */}
        <div className="cc-col">
          <div className="card">
            <div className="card-title">Uyarı Kanalları</div>
            {CHANNELS.map((c) => (
              <label key={c.key} className={`cc-channel${channels[c.key] ? ' on' : ''}`}>
                <span className="cc-channel-icon" style={{ background: c.color }}><ChannelIcon k={c.key} /></span>
                <span className="cc-channel-text">{c.label}<small>{c.to}</small></span>
                <input type="checkbox" checked={channels[c.key]}
                  onChange={(e) => setChannels((prev) => ({ ...prev, [c.key]: e.target.checked }))} />
                <span className="cc-switch" />
              </label>
            ))}
          </div>

          <div className="card cc-alerts-card">
            <div className="card-title">Aktif Uyarılar</div>
            {alerts.length === 0 && <div className="text-muted">Skor alarm çizgisini geçtiğinde burada uyarı açılır.</div>}
            {alerts.map((a) => {
              const done = a.steps.every((s) => s.doneBy)
              return (
                <div key={a.id} className={`cc-alert${done ? ' done' : ''}`}>
                  <div className="cc-alert-head">
                    <div>
                      <b>{a.pointName}</b>
                      <small>{a.at} · Skor {a.value} &gt; alarm {a.level}</small>
                    </div>
                    <span className={`badge ${done ? 'badge-success' : 'badge-danger'}`}>{done ? 'Kapatıldı' : 'Açık'}</span>
                  </div>
                  <div className="cc-alert-channels">
                    {a.channels.length === 0 && <span className="text-muted">Kanal seçili değil</span>}
                    {a.channels.map((ch) => {
                      const c = CHANNELS.find((x) => x.key === ch.key)
                      return (
                        <span key={ch.key} className={`cc-sent ${ch.status}`} style={{ '--c': c.color }}>
                          <ChannelIcon k={ch.key} size={12} />
                          {ch.status === 'sent' ? `${c.label} ✓` : `${c.label}…`}
                        </span>
                      )
                    })}
                  </div>
                  <ol className="cc-steps">
                    {STEPS.map((s) => {
                      const rec = a.steps.find((x) => x.key === s.key)
                      return (
                        <li key={s.key} className={rec.doneBy ? 'ok' : ''}>
                          <span className="cc-step-check">{rec.doneBy ? '✓' : ''}</span>
                          <span className="cc-step-text">
                            {s.label}
                            <small>{rec.doneBy ? `${rec.doneBy} · ${rec.doneAt}` : s.hint}</small>
                          </span>
                          {!rec.doneBy && (
                            <button className="btn btn-ghost cc-step-btn" onClick={() => confirmStep(a.id, s.key)}>Onayla</button>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="cc-disclaimer">Ortam izleme sistemidir, tıbbi teşhis değildir.</div>

      <div className="cc-toasts">
        {toasts.map((t) => (
          <div key={t.id} className="cc-toast" style={{ '--c': t.channel.color }}>
            <span className="cc-channel-icon" style={{ background: t.channel.color }}><ChannelIcon k={t.channel.key} /></span>
            <div>
              <b>{t.channel.label} uyarısı gönderildi</b>
              <small>{t.point} · risk skoru {t.value} · {t.channel.to}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
