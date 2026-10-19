import type { LabProfile } from '../../lib/types'

const NAVY = '#15275e'
const PURPLE = '#6d4fd6'

/**
 * Logo slot in the report header: the report logo, else the lab logo, else the QCLJ wordmark
 * (the Stellar Infomatica frame-and-star mark, "QCLJ", and the company line), drawn to the slot height.
 */
export function ReportLogo({ lab, x, y, w, h }: { lab: LabProfile; x: number; y: number; w: number; h: number }) {
  const href = lab.reportLogoDataUrl ?? lab.logoDataUrl
  if (href) return <image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMaxYMid meet" />
  return <QcljWordmark x={x} y={y} w={w} h={h} />
}

/** Same composition as public/brand/qclj-logo.png, as vector: right-aligned inside the slot. */
export function QcljWordmark({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const mh = h * 0.8
  const sc = mh / 28
  const my = y + (h - mh) / 2
  const total = 40 * sc + 2 * (h / 13.5) + 33.6 * (h / 13.5)
  const left = x + w - Math.min(total, w)
  const tx = left + 40 * sc + 2 * (h / 13.5)
  const u = h / 13.5
  return (
    <g>
      <g transform={`translate(${left} ${my}) scale(${sc})`} fill={NAVY} stroke={NAVY}>
        <rect x={0.95} y={0.95} width={38.1} height={26.1} rx={1.6} fill="none" strokeWidth={1.9} />
        {[4, 10, 16, 22].map((yy) => (
          <g key={yy} stroke="none">
            <rect x={3.5} y={yy} width={3} height={2.4} />
            <rect x={33.5} y={yy} width={3} height={2.4} />
          </g>
        ))}
        <path stroke="none" d="M20 6.5l2.1 5.4 5.7.3-4.5 3.6 1.5 5.6L20 18.3l-4.8 3.1 1.5-5.6-4.5-3.6 5.7-.3L20 6.5z" />
      </g>
      <text x={tx} y={my + mh * 0.66} fontSize={8 * u} fontWeight={800} fill={NAVY} letterSpacing={-0.2 * u}>
        QCLJ
      </text>
      <text x={tx + 0.2 * u} y={my + mh * 0.985} fontSize={2.4 * u} fontWeight={600} fill={PURPLE} letterSpacing={0.29 * u}>
        STELLAR INFOMATICA
      </text>
    </g>
  )
}
