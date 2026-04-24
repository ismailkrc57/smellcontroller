import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell, ReferenceLine
} from 'recharts'

const CHIP_COLORS = ['#6c63ff', '#00d4aa', '#ffd166', '#ff6b6b']
const CHIP_LABELS = ['Dedektör 1', 'Dedektör 2', 'Dedektör 3', 'Dedektör 4']

export function formatVal(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}MΩ`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}kΩ`
  return `${v?.toFixed(0)}Ω`
}

function chipOf(idx) { return Math.floor(idx / 16) }

const CustomTooltip = ({ active, payload, label, extraInfo }) => {
  if (!active || !payload?.length) return null
  const chip = chipOf(parseInt(label?.replace('CH', '')) - 1)
  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2e3350', borderRadius: 8, padding: '8px 12px', fontSize: 12, minWidth: 140 }}>
      <div style={{ color: CHIP_COLORS[chip] ?? '#7b82a0', marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ color: '#e8eaf0', fontWeight: 700, fontSize: 14 }}>{formatVal(payload[0].value)}</div>
      {extraInfo && <div style={{ color: '#7b82a0', marginTop: 4 }}>{extraInfo(label)}</div>}
    </div>
  )
}

// ── All 64 channels, color-coded by chip
export function AllChannelsChart({ channels }) {
  if (!channels?.length) return <EmptyState />

  const data = channels.map((v, i) => ({
    name: `CH${i + 1}`,
    value: v,
    chip: chipOf(i),
  }))

  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 52 }}>
        <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#7b82a0' }} interval={3} />
        <YAxis scale="log" domain={['auto', 'auto']} tickFormatter={formatVal} tick={{ fontSize: 9, fill: '#7b82a0' }} width={52} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={CHIP_COLORS[d.chip]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Single chip, 16 channels
export function ChipGroupChart({ channels, chipIndex }) {
  if (!channels?.length) return null
  const start = chipIndex * 16
  const data = channels.slice(start, start + 16).map((v, i) => ({
    name: `K${i + 1}`,
    fullName: `CH${start + i + 1}`,
    value: v,
  }))

  const ChipTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#1a1d27', border: '1px solid #2e3350', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <div style={{ color: CHIP_COLORS[chipIndex], fontWeight: 600, marginBottom: 2 }}>
          {payload[0].payload.fullName} · {CHIP_LABELS[chipIndex]}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{formatVal(payload[0].value)}</div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 44 }}>
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7b82a0' }} />
        <YAxis scale="log" domain={['auto', 'auto']} tickFormatter={formatVal} tick={{ fontSize: 9, fill: '#7b82a0' }} width={44} />
        <Tooltip content={<ChipTooltip />} />
        <Bar dataKey="value" fill={CHIP_COLORS[chipIndex]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── 16 aggregated ML features
export function FeaturesChart({ features }) {
  if (!features?.length) return null
  const data = features.map((v, i) => ({
    name: `Ö${i + 1}`,
    label: `Özellik ${i + 1}`,
    value: v,
  }))

  const FeatTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#1a1d27', border: '1px solid #2e3350', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <div style={{ color: '#00d4aa', fontWeight: 600, marginBottom: 2 }}>{payload[0].payload.label}</div>
        <div style={{ fontWeight: 700 }}>{formatVal(payload[0].value)}</div>
        <div style={{ color: '#7b82a0', fontSize: 11, marginTop: 2 }}>ML modeline giren değer</div>
      </div>
    )
  }

  const avg = features.reduce((a, b) => a + b, 0) / features.length

  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 44 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7b82a0' }} />
        <YAxis scale="log" domain={['auto', 'auto']} tickFormatter={formatVal} tick={{ fontSize: 9, fill: '#7b82a0' }} width={44} />
        <Tooltip content={<FeatTooltip />} />
        <ReferenceLine y={avg} stroke="rgba(255,209,102,0.4)" strokeDasharray="4 3" />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value > avg ? '#00d4aa' : '#6c63ff'} fillOpacity={0.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Feature history line chart with multiple lines
export function HistoryLineChart({ history, selectedFeatures = [0] }) {
  if (!history?.length) return null
  const reversed = [...history].reverse()
  const data = reversed.map((h, i) => {
    const entry = { t: i }
    selectedFeatures.forEach(fi => {
      entry[`f${fi}`] = h.features?.[fi]
    })
    return entry
  })

  const lineColors = ['#6c63ff', '#00d4aa', '#ffd166', '#ff6b6b', '#a78bfa', '#34d399']

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 44 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2236" />
        <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#7b82a0' }} label={{ value: 'Zaman (örnek)', position: 'insideBottom', offset: -2, style: { fontSize: 9, fill: '#7b82a0' } }} />
        <YAxis tickFormatter={formatVal} tick={{ fontSize: 9, fill: '#7b82a0' }} width={44} />
        <Tooltip
          contentStyle={{ background: '#1a1d27', border: '1px solid #2e3350', borderRadius: 8, fontSize: 11 }}
          formatter={(v, name) => [formatVal(v), `Özellik ${name.replace('f', '')} (F${parseInt(name.replace('f',''))+1})`]}
        />
        {selectedFeatures.map((fi, idx) => (
          <Line
            key={fi}
            type="monotone"
            dataKey={`f${fi}`}
            stroke={lineColors[idx % lineColors.length]}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Overall intensity bar (single metric)
export function IntensityMeter({ channels }) {
  if (!channels?.length) return null

  const vals = channels.filter(v => v > 1200)  // exclude floor-clamped channels
  if (!vals.length) return null

  const logMean = vals.reduce((s, v) => s + Math.log10(v), 0) / vals.length
  // typical air baseline ~log10(30000) ≈ 4.47, high intensity ~log10(5M) ≈ 6.7
  const MIN_LOG = 3.5, MAX_LOG = 7.2
  const pct = Math.round(Math.max(0, Math.min(1, (logMean - MIN_LOG) / (MAX_LOG - MIN_LOG))) * 100)

  const color = pct < 30 ? 'var(--success)' : pct < 60 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div>
      <div className="flex justify-between mb-1" style={{ fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>Genel Direnç Seviyesi</span>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div className="progress-bar-wrap" style={{ height: 10 }}>
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

function EmptyState() {
  return <div className="text-muted" style={{ textAlign: 'center', padding: '40px 0' }}>Veri bekleniyor...</div>
}
