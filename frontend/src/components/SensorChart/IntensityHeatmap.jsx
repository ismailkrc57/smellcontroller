import { useMemo } from 'react'

const CHIP_LABELS = ['Dedektör 1', 'Dedektör 2', 'Dedektör 3', 'Dedektör 4']
const CHIP_COLORS = ['#6c63ff', '#00d4aa', '#ffd166', '#ff6b6b']

// log-normalised value 0..1 from a single channel
function logNorm(val, globalMin, globalMax) {
  const safeVal = Math.max(val, 1)
  const safeMin = Math.max(globalMin, 1)
  const safeMax = Math.max(globalMax, 1)
  if (safeMax === safeMin) return 0.5
  return (Math.log10(safeVal) - Math.log10(safeMin)) /
         (Math.log10(safeMax) - Math.log10(safeMin))
}

// 0..1 → CSS hsl, blue (low) → cyan → green → yellow → red (high)
function normToColor(t) {
  const clamped = Math.max(0, Math.min(1, t))
  // hue: 240 (blue) at 0 → 0 (red) at 1
  const hue = Math.round((1 - clamped) * 240)
  const sat = 75 + clamped * 20
  const lit  = 35 + clamped * 25
  return `hsl(${hue},${sat}%,${lit}%)`
}

function formatVal(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}MΩ`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}kΩ`
  return `${v?.toFixed(0)}Ω`
}

export function IntensityHeatmap({ channels }) {
  const { globalMin, globalMax, norms } = useMemo(() => {
    if (!channels?.length) return { globalMin: 0, globalMax: 1, norms: [] }
    const globalMin = Math.min(...channels)
    const globalMax = Math.max(...channels)
    const norms = channels.map(v => logNorm(v, globalMin, globalMax))
    return { globalMin, globalMax, norms }
  }, [channels])

  if (!channels?.length) {
    return <div className="text-muted" style={{ textAlign: 'center', padding: 40 }}>Veri bekleniyor...</div>
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(4, 1fr)', gap: 8 }}>
        {[0, 1, 2, 3].map(chip => (
          <div key={chip}>
            <div style={{ fontSize: 10, fontWeight: 700, color: CHIP_COLORS[chip], marginBottom: 4, letterSpacing: 0.5 }}>
              {CHIP_LABELS[chip]}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 3 }}>
              {Array.from({ length: 16 }, (_, ch) => {
                const idx = chip * 16 + ch
                const norm = norms[idx] ?? 0
                const val  = channels[idx]
                return (
                  <div
                    key={ch}
                    title={`CH${idx + 1}\n${formatVal(val)}\nYoğunluk: ${Math.round(norm * 100)}%`}
                    style={{
                      height: 28,
                      borderRadius: 4,
                      background: normToColor(norm),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 8,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.8)',
                      cursor: 'default',
                      transition: 'background 0.4s',
                    }}
                  >
                    {ch + 1}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Düşük tepki</span>
        <div style={{
          flex: 1, height: 8, borderRadius: 4,
          background: 'linear-gradient(to right, hsl(240,80%,40%), hsl(180,80%,40%), hsl(120,80%,40%), hsl(60,90%,45%), hsl(0,90%,50%))'
        }} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Güçlü tepki</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
        Aralık: {formatVal(globalMin)} — {formatVal(globalMax)} · Logaritmik renk ölçeği
      </div>
    </div>
  )
}
