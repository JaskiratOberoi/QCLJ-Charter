import type { LabProfile } from '../../lib/types'

/** Logo slot in the report header: the report logo, else the lab logo, else the product wordmark. */
export function ReportLogo({ lab, x, y, w, h }: { lab: LabProfile; x: number; y: number; w: number; h: number }) {
  const href = lab.reportLogoDataUrl ?? lab.logoDataUrl
  if (href)
    return <image href={href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMaxYMid meet" />
  const navy = '#15275e'
  return (
    <g>
      <circle cx={x + w - 44.2} cy={y + h / 2} r={5.4} fill="none" stroke={navy} strokeWidth={2.2} />
      <path d={`M${x + w - 42.4} ${y + h / 2 + 1.2} l3.6 3.9`} stroke={navy} strokeWidth={2.2} strokeLinecap="round" />
      <text x={x + w} y={y + h - 2.4} fontSize={11.4} fontWeight={700} fill={navy} textAnchor="end" letterSpacing={-0.3}>
        QCLJ
      </text>
    </g>
  )
}
