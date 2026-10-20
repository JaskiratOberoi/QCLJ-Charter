import type { LabProfile } from '../../lib/types'

const NAVY = '#15275e'
const PURPLE = '#6d4fd6'

/**
 * Logo slot in the report header: the report logo, else the lab logo, else the Zenith-Q wordmark
 * (the solid Z monogram with the star at its zenith, "Zenith-Q", and the company line), drawn to the slot height.
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
      <g transform={`translate(${left} ${my}) scale(${sc})`} fill={PURPLE}>
        <path d="M6 8h23v5.5L15.5 28H34v6H6v-5.5L19.5 14H6z" />
        <path d="M33.5 1.1l1.72 4.68L39.9 7.5l-4.68 1.72L33.5 13.9l-1.72-4.68L27.1 7.5l4.68-1.72z" />
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
