// Command Center için demo (dummy) veri üreticisi.
// Cihaz bağlı olmadan ölçüm noktalarının canlı akıyormuş gibi görünmesini sağlar.

export const HISTORY = 90

export const POINTS = [
  { id: 'line-a', name: 'Üretim Hattı A', zone: 'Üretim', x: 70, y: 70, base: 34 },
  { id: 'lab', name: 'Kalite Laboratuvarı', zone: 'Laboratuvar', x: 210, y: 58, base: 22 },
  { id: 'store', name: 'Hammadde Deposu', zone: 'Depo', x: 330, y: 80, base: 28 },
  { id: 'boiler', name: 'Kazan Dairesi', zone: 'Teknik', x: 92, y: 192, base: 40 },
  { id: 'waste', name: 'Atık Su Ünitesi', zone: 'Çevre', x: 230, y: 196, base: 46 },
  { id: 'dock', name: 'Yükleme Alanı', zone: 'Lojistik', x: 340, y: 200, base: 25 },
]

const rnd = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const fmt = (d) => d.toLocaleTimeString('tr-TR', { hour12: false })

function stepPoint(p, now, tick) {
  // Olay (koku artışı) başlat / bitir
  if (!p.incident && Math.random() < 0.0035) {
    p.incident = { until: tick + Math.round(rnd(25, 45)), peak: rnd(76, 94) }
  }
  if (p.incident && tick > p.incident.until) p.incident = null
  if (p.ventUntil && tick > p.ventUntil) p.ventUntil = 0

  let target = p.base
  if (p.incident) target = p.incident.peak
  if (p.ventUntil) target -= 34
  if (p.evacuated) target -= 6

  p.risk = clamp(p.risk + (target - p.risk) * 0.11 + rnd(-2.4, 2.4), 2, 99)
  p.temp = clamp(21.4 + p.risk * 0.035 + rnd(-0.25, 0.25), 15, 40)
  p.hum = clamp(p.hum + rnd(-0.6, 0.6) + (47 - p.hum) * 0.05, 25, 80)
  const ventTarget = p.ventUntil ? 94 : 32 + p.risk * 0.22
  p.vent = clamp(p.vent + (ventTarget - p.vent) * 0.25 + rnd(-1.5, 1.5), 0, 100)

  // Yeni dizi: grafiklere verilen eski dizi React tarafından dondurulmuş olabilir
  p.history = [...p.history.slice(-(HISTORY - 1)), {
    t: fmt(now),
    risk: +p.risk.toFixed(1),
    temp: +p.temp.toFixed(1),
    hum: +p.hum.toFixed(1),
    vent: +p.vent.toFixed(0),
  }]
}

export function createSim() {
  const start = Date.now() - HISTORY * 1000
  const points = POINTS.map((def) => ({
    ...def,
    risk: def.base,
    temp: 22,
    hum: 46,
    vent: 38,
    incident: null,
    ventUntil: 0,
    evacuated: false,
    history: [],
  }))
  const sim = { tick: 0, points }
  // Grafik boş başlamasın diye geçmişi doldur (olaysız)
  for (let i = 0; i < HISTORY; i++) {
    for (const p of points) {
      stepPoint(p, new Date(start + i * 1000), -1)
      p.incident = null
    }
  }
  // Demo açılınca kısa sürede bir alarm görülsün
  const waste = points.find((p) => p.id === 'waste')
  waste.incident = { until: 40, peak: 88 }
  waste.incident.startAt = 6
  return sim
}

export function stepSim(sim) {
  sim.tick += 1
  const now = new Date()
  for (const p of sim.points) {
    if (p.incident?.startAt && sim.tick < p.incident.startAt) {
      const saved = p.incident
      p.incident = null
      stepPoint(p, now, sim.tick)
      p.incident = saved
    } else {
      stepPoint(p, now, sim.tick)
    }
  }
}

export function triggerIncident(sim, id) {
  const p = sim.points.find((x) => x.id === id)
  if (p) p.incident = { until: sim.tick + 35, peak: rnd(86, 96) }
}

export function ventilate(sim, id) {
  const p = sim.points.find((x) => x.id === id)
  if (p) {
    p.ventUntil = sim.tick + 40
    if (p.incident) p.incident.until = Math.min(p.incident.until, sim.tick + 8)
  }
}

export function evacuate(sim, id) {
  const p = sim.points.find((x) => x.id === id)
  if (p) p.evacuated = true
}

export const nowLabel = () => fmt(new Date())
