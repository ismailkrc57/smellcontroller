import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts'

const CHIP_COLORS = ['#6c63ff', '#00d4aa', '#ffd166', '#ff6b6b']

function formatVal(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}MΩ`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}kΩ`
  return `${v.toFixed(0)}Ω`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1d27', border: '1px solid #2e3350', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: '#7b82a0', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#e8eaf0', fontWeight: 600 }}>{formatVal(payload[0].value)}</div>
    </div>
  )
}

export function AllChannelsChart({ channels }) {
  if (!channels?.length) return <div className="text-muted" style={{ textAlign: 'center', padding: 40 }}>Veri bekleniyor...</div>

  const data = channels.map((v, i) => ({
    name: `CH${i + 1}`,
    value: v,
    chip: Math.floor(i / 16),
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 40 }}>
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7b82a0' }} interval={3} />
        <YAxis tickFormatter={formatVal} tick={{ fontSize: 10, fill: '#7b82a0' }} width={48} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[2, 2, 0, 0]}
          fill="#6c63ff"
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ChipGroupChart({ channels, chipIndex }) {
  if (!channels?.length) return null
  const start = chipIndex * 16
  const data = channels.slice(start, start + 16).map((v, i) => ({
    name: `CH${start + i + 1}`,
    value: v,
  }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 36 }}>
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#7b82a0' }} />
        <YAxis tickFormatter={formatVal} tick={{ fontSize: 9, fill: '#7b82a0' }} width={44} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" fill={CHIP_COLORS[chipIndex]} radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function FeaturesChart({ features }) {
  if (!features?.length) return null
  const data = features.map((v, i) => ({ name: `F${i + 1}`, value: v }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 36 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7b82a0' }} />
        <YAxis tickFormatter={formatVal} tick={{ fontSize: 10, fill: '#7b82a0' }} width={44} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" fill="#00d4aa" radius={[2, 2, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function HistoryLineChart({ history, featureIndex = 0 }) {
  if (!history?.length) return null
  const data = history.map((h, i) => ({ t: i, value: h.features?.[featureIndex] }))

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 36 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2e3350" />
        <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#7b82a0' }} />
        <YAxis tickFormatter={formatVal} tick={{ fontSize: 9, fill: '#7b82a0' }} width={44} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="value" stroke="#6c63ff" dot={false} strokeWidth={2} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
