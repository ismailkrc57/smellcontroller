import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts'

const CHIP_COLORS = ['#6c63ff', '#00d4aa', '#ffd166', '#ff6b6b']
const CHIP_LABELS = ['Dedektör 1', 'Dedektör 2', 'Dedektör 3', 'Dedektör 4']

function logNorm(val, min, max) {
  const lv = Math.log10(Math.max(val, 1))
  const lmn = Math.log10(Math.max(min, 1))
  const lmx = Math.log10(Math.max(max, 1))
  if (lmx === lmn) return 50
  return Math.round(((lv - lmn) / (lmx - lmn)) * 100)
}

// One radar per chip — 16 axes, normalized 0-100
export function ChipRadar({ channels, chipIndex }) {
  if (!channels?.length) return null

  const start = chipIndex * 16
  const slice = channels.slice(start, start + 16)
  const min   = Math.min(...channels)
  const max   = Math.max(...channels)

  const data = slice.map((v, i) => ({
    channel: `K${i + 1}`,
    value: logNorm(v, min, max),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#2e3350" />
        <PolarAngleAxis dataKey="channel" tick={{ fontSize: 9, fill: '#7b82a0' }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name={CHIP_LABELS[chipIndex]}
          dataKey="value"
          stroke={CHIP_COLORS[chipIndex]}
          fill={CHIP_COLORS[chipIndex]}
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{ background: '#1a1d27', border: '1px solid #2e3350', borderRadius: 8, fontSize: 11 }}
          formatter={(v) => [`${v}%`, 'Yoğunluk']}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// Combined radar: all 4 chips averaged per channel position
export function CombinedRadar({ channels }) {
  if (!channels?.length) return null

  const min = Math.min(...channels)
  const max = Math.max(...channels)

  const data = Array.from({ length: 16 }, (_, i) => {
    const entry = { channel: `K${i + 1}` }
    for (let chip = 0; chip < 4; chip++) {
      entry[CHIP_LABELS[chip]] = logNorm(channels[chip * 16 + i], min, max)
    }
    return entry
  })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#2e3350" />
        <PolarAngleAxis dataKey="channel" tick={{ fontSize: 9, fill: '#7b82a0' }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        {CHIP_LABELS.map((label, i) => (
          <Radar
            key={label}
            name={label}
            dataKey={label}
            stroke={CHIP_COLORS[i]}
            fill={CHIP_COLORS[i]}
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
        ))}
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(v) => <span style={{ color: 'var(--text-muted)' }}>{v}</span>}
        />
        <Tooltip
          contentStyle={{ background: '#1a1d27', border: '1px solid #2e3350', borderRadius: 8, fontSize: 11 }}
          formatter={(v) => [`${v}%`, '']}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
