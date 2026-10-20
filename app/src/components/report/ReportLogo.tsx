import type { LabProfile } from '../../lib/types'

const NAVY = '#15275e'
const TEAL = '#0f766e'
const PURPLE = '#6d4fd6'

/**
 * Logo slot in the report header: the report logo, else the lab logo, else the Meridian wordmark
 * (star on the mean line inside its limits, "Meridian", and the company line), drawn to the slot height.
 */
export function ReportLogo({ lab, x, y, w, h }: { lab: LabProfile; x: number; y: number; w: number; h: number }) {
  const href = lab.reportLogoDataUrl ?? lab.logoDataUrl
  if (href) return <image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMaxYMid meet" />
  return <MeridianWordmark x={x} y={y} w={w} h={h} />
}

/** Same composition as public/brand/meridian-logo.png, as vector: right-aligned inside the slot. */
export function MeridianWordmark({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const u = h / 13.5
  const m = 10.8 * u // mark size
  const total = m + 1.9 * u + 34.6 * u
  const left = x + w - Math.min(total, w)
  const my = y + (h - m) / 2
  const sc = m / 30
  const tx = left + m + 1.9 * u
  return (
    <g>
      <g transform={`translate(${left} ${my}) scale(${sc})`}>
        <rect width={30} height={30} rx={9} fill={TEAL} />
        <path d="M6 9.6h18M6 20.4h18" stroke="#fff" strokeOpacity={0.38} strokeWidth={1.4} strokeLinecap="round" />
        <path d="M6 15h18" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        <path d="M15 8.6l1.75 4.65L21.4 15l-4.65 1.75L15 21.4l-1.75-4.65L8.6 15l4.65-1.75z" fill="#fff" />
      </g>
      <text x={tx} y={my + m * 0.64} fontSize={7.2 * u} fontWeight={800} fill={NAVY} letterSpacing={-0.18 * u}>
        Meridian
      </text>
      <text x={tx + 0.15 * u} y={my + m * 0.98} fontSize={2.35 * u} fontWeight={600} fill={PURPLE} letterSpacing={0.28 * u}>
        STELLAR INFOMATICA
      </text>
    </g>
  )
}
