import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'
import { daysBetween, daysInMonth, ddmm, monthStart, addDays } from '../../lib/dates'
import { levelHeader, type LJLevel, type LJPageModel, type LJPoint } from '../../lib/report'
import type { LabProfile } from '../../lib/types'
import { A4, ARIAL, CHART, FOOT, INK, MUTED, PAGE, baseline } from './geometry'
import { ReportLogo } from './ReportLogo'

export interface LJPageOptions {
  showMenuGlyph?: boolean
  /** Ring points that break a rejection rule (on-screen review aid; off for print). */
  markRejects?: boolean
}

interface Props {
  model: LJPageModel
  lab: LabProfile
  pageNo: number
  animate?: boolean
  options?: LJPageOptions
  onPointHover?: (p: LJPoint | null, level: number, evt?: React.MouseEvent) => void
  className?: string
}

export function LJReportPage({ model, lab, pageNo, animate, options, onPointHover, className }: Props) {
  const ref = useRef<SVGSVGElement>(null)

  useGSAP(
    () => {
      if (!animate || !ref.current) return
      const svg = ref.current
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(svg.querySelectorAll('[data-anim="head"]'), { opacity: 0, y: -6, duration: 0.5, stagger: 0.03 })
      tl.from(svg.querySelectorAll('[data-anim="limit"]'), { scaleX: 0, transformOrigin: 'left center', duration: 0.7, stagger: 0.025 }, 0.15)
      tl.from(svg.querySelectorAll('[data-anim="badge"]'), { opacity: 0, x: 8, duration: 0.4, stagger: 0.02 }, 0.35)
      svg.querySelectorAll<SVGPolylineElement>('[data-anim="series"]').forEach((pl, i) => {
        const len = pl.getTotalLength()
        gsap.set(pl, { strokeDasharray: len, strokeDashoffset: len })
        tl.to(pl, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' }, 0.45 + i * 0.15)
      })
      tl.from(svg.querySelectorAll('[data-anim="pt"]'), {
        scale: 0, transformOrigin: 'center center', duration: 0.35, stagger: 0.012, ease: 'back.out(3)',
      }, 0.6)
    },
    { scope: ref, dependencies: [model.monthKey, model.analyte.id, animate] },
  )

  const d = model.analyte.decimals
  return (
    <svg
      ref={ref}
      className={className}
      viewBox={`0 0 ${A4.w} ${A4.h}`}
      width="100%"
      fontFamily={ARIAL}
      style={{ background: '#fff', display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g data-anim="head">
        <text x={A4.w / 2} y={baseline(PAGE.titleTop, PAGE.titleSize)} fontSize={PAGE.titleSize} fontWeight={700} fill={INK} textAnchor="middle">
          {lab.reportBrand ? `${lab.reportBrand} ` : ''}LJ Chart Report
        </text>
        <ReportLogo lab={lab} {...PAGE.logo} />
        <text x={PAGE.marginR} y={baseline(PAGE.pageLabelTop, PAGE.pageLabelSize)} fontSize={PAGE.pageLabelSize} fill={INK} textAnchor="end">
          Page {pageNo}
        </text>
      </g>
      {model.info.map(([label, value], i) => (
        <g key={label} data-anim="head">
          <text x={PAGE.info.labelX} y={baseline(PAGE.info.tops[i], PAGE.info.size)} fontSize={PAGE.info.size} fontWeight={700} fill={INK}>
            {label}
          </text>
          <text x={PAGE.info.valueX} y={baseline(PAGE.info.tops[i], PAGE.info.size)} fontSize={PAGE.info.size} fill={INK}>
            {value}
          </text>
        </g>
      ))}

      {model.levels.map((lvl, k) => (
        <LevelChart
          key={lvl.level}
          lvl={lvl}
          decimals={d}
          offset={k * CHART.blockStep}
          monthKey={model.monthKey}
          options={options}
          onPointHover={onPointHover}
        />
      ))}

      <g fontSize={PAGE.footerSize} fill={INK}>
        <text x={PAGE.marginL} y={baseline(PAGE.footerTop, PAGE.footerSize)}>Comments ____________________</text>
        <text x={PAGE.reviewedX} y={baseline(PAGE.footerTop, PAGE.footerSize)}>Reviewed by ____________________</text>
        <text x={PAGE.marginR} y={baseline(PAGE.footerTop, PAGE.footerSize)} textAnchor="end">Sign &amp; Date ____________________</text>
      </g>
      <text x={A4.w / 2} y={baseline(PAGE.copyrightTop, PAGE.copyrightSize)} fontSize={PAGE.copyrightSize} fill={FOOT} textAnchor="middle">
        {lab.copyright}
      </text>
    </svg>
  )
}

function LevelChart({
  lvl, decimals, offset, monthKey, options, onPointHover,
}: {
  lvl: LJLevel
  decimals: number
  offset: number
  monthKey: string
  options?: LJPageOptions
  onPointHover?: Props['onPointHover']
}) {
  const top = CHART.plotTop + offset
  const bottom = top + CHART.plotH
  const center = top + CHART.plotH / 2
  const step = CHART.plotH / (2 * CHART.sdSpan)
  const { plotX0: x0, plotX1: x1 } = CHART
  const n = daysInMonth(monthKey)
  const first = monthStart(monthKey)
  const xOf = (date: string) => x0 + (daysBetween(first, date) * (x1 - x0)) / (n - 1)
  const t = lvl.target
  const yOf = (z: number) => {
    const c = Math.max(-CHART.sdSpan, Math.min(CHART.sdSpan, z))
    return center - c * step
  }
  const ticks = Array.from({ length: CHART.xLabel.count }, (_, k) => Math.round((k * (n - 1)) / (CHART.xLabel.count - 1)))
  const pts = t ? lvl.points.filter((p) => isFinite(p.z)) : []
  const sds = [3, 2, 1, 0, -1, -2, -3]

  return (
    <g>
      <text data-anim="head" x={PAGE.marginL} y={baseline(CHART.headerTop + offset, CHART.headerSize)} fontSize={CHART.headerSize} fontWeight={700} fill={INK}>
        {levelHeader(lvl, decimals)}
      </text>
      <rect x={x0} y={top} width={x1 - x0} height={CHART.plotH} fill="#fff" stroke={CHART.border.color} strokeWidth={CHART.border.width} />

      {sds.map((k) => {
        const y = center - k * step
        const color = CHART.colors[Math.abs(k)]
        const label = k === 0 ? 'Mean' : `${k > 0 ? '+' : '-'}${Math.abs(k)}SD`
        return (
          <g key={k}>
            {k === 0 ? (
              <line data-anim="limit" x1={x0} x2={x1} y1={y} y2={y} stroke={CHART.meanLine.color} strokeWidth={CHART.meanLine.width} />
            ) : (
              <line data-anim="limit" x1={x0} x2={x1} y1={y} y2={y} stroke={color} strokeWidth={CHART.limit.width} strokeDasharray={CHART.limit.dash} />
            )}
            {t && (
              <text x={CHART.yLabel.right} y={y + CHART.yLabel.dy} fontSize={CHART.yLabel.size} fill={MUTED} textAnchor="end">
                {(t.mean + k * t.sd).toFixed(decimals)}
              </text>
            )}
            <g data-anim="badge">
              <rect x={CHART.badge.x} y={y - CHART.badge.h / 2} width={CHART.badge.w} height={CHART.badge.h} rx={CHART.badge.r} fill={color} />
              <text x={CHART.badge.x + CHART.badge.w / 2} y={y + CHART.badge.dy} fontSize={CHART.badge.size} fontWeight={700} fill="#fff" textAnchor="middle">
                {label}
              </text>
            </g>
          </g>
        )
      })}

      {options?.showMenuGlyph &&
        CHART.menu.dys.map((dy) => (
          <line key={dy} x1={CHART.menu.x0} x2={CHART.menu.x1} y1={top + dy} y2={top + dy} stroke={CHART.menu.color} strokeWidth={CHART.menu.width} />
        ))}

      {ticks.map((i) => {
        const x = x0 + (i * (x1 - x0)) / (n - 1)
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={bottom} y2={bottom + CHART.tick.len} stroke={CHART.tick.color} strokeWidth={CHART.tick.width} />
            <text x={x} y={bottom + CHART.xLabel.dy} fontSize={CHART.xLabel.size} fill={MUTED} textAnchor="middle">
              {ddmm(addDays(first, i))}
            </text>
          </g>
        )
      })}

      {pts.length > 1 && (
        <polyline
          data-anim="series"
          points={pts.map((p) => `${xOf(p.date)},${yOf(p.z)}`).join(' ')}
          fill="none"
          stroke={CHART.series.color}
          strokeWidth={CHART.series.width}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {pts.map((p) => {
        const out = Math.abs(p.z) > 2
        const reject = options?.markRejects && p.violations.some((v) => v.severity === 'reject')
        const cx = xOf(p.date)
        const cy = yOf(p.z)
        return (
          <g key={p.runId}>
            {reject && <circle cx={cx} cy={cy} r={4.6} fill="none" stroke="#c62828" strokeWidth={0.7} strokeDasharray="1.2 0.9" />}
            <circle
              data-anim="pt"
              cx={cx}
              cy={cy}
              r={CHART.marker.r}
              fill={out ? CHART.marker.outFill : CHART.marker.fill}
              stroke={out ? CHART.marker.outEdge : CHART.marker.edge}
              strokeWidth={CHART.marker.stroke}
            />
            {onPointHover && (
              <circle
                cx={cx}
                cy={cy}
                r={6}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => onPointHover(p, lvl.level, e)}
                onMouseMove={(e) => onPointHover(p, lvl.level, e)}
                onMouseLeave={() => onPointHover(null, lvl.level)}
              />
            )}
          </g>
        )
      })}
    </g>
  )
}
