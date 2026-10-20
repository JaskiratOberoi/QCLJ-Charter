import type { LabProfile } from '../../lib/types'

const NAVY = '#15275e'
const PURPLE = '#6d4fd6'

/**
 * Logo slot in the report header: the report logo, else the lab logo, else the Zenith-Q wordmark
 * (star at the top of its arc, "Zenith-Q", and the company line), drawn to the slot height.
 */
export function ReportLogo({ lab, x, y, w, h }: { lab: LabProfile; x: number; y: number; w: number; h: number }) {
  const href = lab.reportLogoDataUrl ?? lab.logoDataUrl
  if (href) return <image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMaxYMid meet" />
  return <ZenithWordmark x={x} y={y} w={w} h={h} />
}

/** Same composition as public/brand/zenith-q-logo.png, as vector: right-aligned inside the slot. */
export function ZenithWordmark({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const u = h / 13.5
  const m = 10.8 * u
  const total = m + 1.9 * u + 34.6 * u
  const left = x + w - Math.min(total, w)
  const my = y + (h - m) / 2
  const sc = m / 30
  const tx = left + m + 1.9 * u
  return (
    <g>
      <g transform={`translate(${left} ${my}) scale(${sc})`}>
        <rect width={30} height={30} rx={9} fill={PURPLE} />
        <path d="M6 22.5h18" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        <path d="M7.5 22.5a7.5 7.5 0 0 1 15 0" stroke="#fff" strokeOpacity={0.38} strokeWidth={1.4} strokeLinecap="round" fill="none" />
        <path d="M15 6.2l1.6 4.2 4.2 1.6-4.2 1.6L15 17.8l-1.6-4.2-4.2-1.6 4.2-1.6z" fill="#fff" />
      </g>
      <text x={tx} y={my + m * 0.64} fontSize={7.2 * u} fontWeight={800} fill={NAVY} letterSpacing={-0.18 * u}>
        Zenith-Q
      </text>
      <text x={tx + 0.15 * u} y={my + m * 0.98} fontSize={2.35 * u} fontWeight={600} fill={PURPLE} letterSpacing={0.28 * u}>
        STELLAR INFOMATICA
      </text>
    </g>
  )
}
