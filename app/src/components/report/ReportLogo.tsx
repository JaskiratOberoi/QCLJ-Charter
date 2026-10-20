import type { LabProfile } from '../../lib/types'

const NAVY = '#15275e'
const PURPLE = '#6d4fd6'

/**
 * Logo slot in the report header: the report logo, else the lab logo, else the Zenith-Q wordmark
 * (the Z monogram with the star at its zenith, "Zenith-Q", and the company line), drawn to the slot height.
 */
export function ReportLogo({ lab, x, y, w, h }: { lab: LabProfile; x: number; y: number; w: number; h: number }) {
  const href = lab.reportLogoDataUrl ?? lab.logoDataUrl
  if (href) return <image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMaxYMid meet" />
  return <ZenithWordmark x={x} y={y} w={w} h={h} />
}

/** Same composition as public/brand/zenith-q-logo.png, as vector: right-aligned inside the slot. */
export function ZenithWordmark({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const u = h / 13.5
  const m = 12.6 * u
  const total = m + 1.0 * u + 32 * u
  const left = x + w - Math.min(total, w)
  const my = y + (h - m) / 2
  const sc = m / 40
  const tx = left + m + 1.0 * u
  return (
    <g>
      <g transform={`translate(${left} ${my}) scale(${sc})`}>
        <path d="M7 8h18L7 32h30" stroke={PURPLE} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M31 2.8l1.5 3.5L36 7.8l-3.5 1.5L31 12.8l-1.5-3.5L26 7.8l3.5-1.5z" fill={PURPLE} />
      </g>
      <text x={tx} y={y + h * 0.56} fontSize={7.6 * u} fontWeight={600} fill={NAVY} letterSpacing={-0.23 * u}>
        Zenith-Q
      </text>
      <text x={tx + 0.2 * u} y={y + h * 0.83} fontSize={2.3 * u} fontWeight={500} fill={PURPLE} letterSpacing={0.37 * u}>
        STELLAR INFOMATICA
      </text>
    </g>
  )
}
