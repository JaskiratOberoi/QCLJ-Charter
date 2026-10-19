import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'
import type { LabProfile } from '../../lib/types'
import { A4L, ARIAL, FOOT, INK, MUTED, TABLE, baseline } from './geometry'
import { ReportLogo } from './ReportLogo'

export interface TableRow {
  level: string
  fixed: string
  values: string[]
  /** Indices of values to render in red (e.g. CV above the acceptance limit). */
  flagged?: number[]
}

export interface TableGroup {
  name: string
  unit: string
  rows: TableRow[]
}

export interface TableModel {
  title: string
  info: [string, string][]
  fixedHeader: string
  columns: string[]
  nLabel: string
  nValues: string[]
  groups: TableGroup[]
  footnote: string
}

const S = TABLE.fontSize

export function TableReportPage({ model, lab, animate }: { model: TableModel; lab: LabProfile; animate?: boolean }) {
  const ref = useRef<SVGSVGElement>(null)
  useGSAP(
    () => {
      if (!animate || !ref.current) return
      gsap.from(ref.current.querySelectorAll('[data-anim="row"]'), {
        opacity: 0, y: 4, duration: 0.45, stagger: 0.025, ease: 'power3.out',
      })
    },
    { scope: ref, dependencies: [model.title, animate] },
  )

  const tableTop = TABLE.info.tops[model.info.length - 1] + 15.3
  const x0 = TABLE.marginL
  const xLevel = x0 + TABLE.colTest
  const xFixed = xLevel + TABLE.colLevel
  const xMonths = xFixed + TABLE.colFixed
  const colW = (TABLE.right - xMonths) / Math.max(model.columns.length, 1)
  const H = TABLE.rowH
  const cy = (top: number) => top + H / 2 + S * 0.35

  const rowCount = model.groups.reduce((n, g) => n + g.rows.length, 0)
  const tableBottom = tableTop + H * (2 + rowCount)
  const foot = wrap(model.footnote, 232)
  const footTop = tableBottom + 4.5
  const signTop = footTop + 7.5 * (foot.length - 1) + 30.1

  let r = 0
  return (
    <svg ref={ref} viewBox={`0 0 ${A4L.w} ${A4L.h}`} width="100%" fontFamily={ARIAL} style={{ background: '#fff', display: 'block' }}>
      <text x={A4L.w / 2} y={baseline(TABLE.titleTop, 11.62)} fontSize={11.62} fontWeight={700} fill={INK} textAnchor="middle">
        {lab.reportBrand ? `${lab.reportBrand} ` : ''}{model.title}
      </text>
      <ReportLogo lab={lab} {...TABLE.logo} />
      {model.info.map(([label, value], i) => (
        <g key={label}>
          <text x={TABLE.info.labelX} y={baseline(TABLE.info.tops[i], TABLE.info.size)} fontSize={TABLE.info.size} fontWeight={700} fill={INK}>{label}</text>
          <text x={TABLE.info.valueX} y={baseline(TABLE.info.tops[i], TABLE.info.size)} fontSize={TABLE.info.size} fill={INK}>{value}</text>
        </g>
      ))}

      <g fontSize={S} fill={INK}>
        <rect x={x0} y={tableTop} width={TABLE.right - x0} height={H} fill={TABLE.headBg} />
        <rect x={x0} y={tableTop + H} width={TABLE.right - x0} height={H} fill={TABLE.nBg} />
        <g fontWeight={700} textAnchor="middle">
          <text x={x0 + TABLE.colTest / 2} y={cy(tableTop)}>Test</text>
          <text x={xLevel + TABLE.colLevel / 2} y={cy(tableTop)}>Level</text>
          <text x={xFixed + TABLE.colFixed / 2} y={cy(tableTop)}>{model.fixedHeader}</text>
          {model.columns.map((c, i) => (
            <text key={c} x={xMonths + colW * (i + 0.5)} y={cy(tableTop)}>{c}</text>
          ))}
          <text x={xLevel + 1.2} y={cy(tableTop + H)}>{model.nLabel}</text>
          {model.nValues.map((v, i) => (
            <text key={i} x={xMonths + colW * (i + 0.5)} y={cy(tableTop + H)}>{v}</text>
          ))}
        </g>

        {model.groups.map((g) => {
          const gTop = tableTop + H * (2 + r)
          const gH = H * g.rows.length
          const rows = g.rows.map((row, j) => {
            const top = gTop + H * j
            return (
              <g key={row.level} data-anim="row">
                <text x={xLevel + TABLE.colLevel / 2} y={cy(top)} textAnchor="middle">{row.level}</text>
                <text x={xFixed + TABLE.colFixed / 2} y={cy(top)} textAnchor="middle">{row.fixed}</text>
                {row.values.map((v, i) => (
                  <text key={i} x={xMonths + colW * (i + 0.5)} y={cy(top)} textAnchor="middle" fill={row.flagged?.includes(i) ? '#c62828' : INK} fontWeight={row.flagged?.includes(i) ? 700 : 400}>
                    {v}
                  </text>
                ))}
                {j < g.rows.length - 1 && <line x1={xLevel} x2={TABLE.right} y1={top + H} y2={top + H} stroke={TABLE.rule} strokeWidth={0.75} />}
              </g>
            )
          })
          r += g.rows.length
          return (
            <g key={g.name}>
              <text x={x0 + 3.4} y={gTop + gH / 2 + S * 0.35} data-anim="row">
                {g.name} <tspan fill={FOOT}>({g.unit})</tspan>
              </text>
              {rows}
              <line x1={x0} x2={TABLE.right} y1={gTop + gH} y2={gTop + gH} stroke={TABLE.groupRule} strokeWidth={0.8} />
            </g>
          )
        })}

        <line x1={x0} x2={TABLE.right} y1={tableTop} y2={tableTop} stroke={TABLE.rule} strokeWidth={0.75} />
        <line x1={x0} x2={TABLE.right} y1={tableTop + H} y2={tableTop + H} stroke={TABLE.rule} strokeWidth={0.75} />
        <line x1={x0} x2={TABLE.right} y1={tableTop + 2 * H} y2={tableTop + 2 * H} stroke={TABLE.rule} strokeWidth={0.75} />
        {[x0, xLevel, xFixed, ...model.columns.map((_, i) => xMonths + colW * i), TABLE.right].map((x, i) =>
          i === 1 || i === 2 ? (
            <g key={i}>
              <line x1={x} x2={x} y1={tableTop} y2={tableTop + H} stroke={TABLE.rule} strokeWidth={0.75} />
              <line x1={x} x2={x} y1={tableTop + 2 * H} y2={tableBottom} stroke={TABLE.rule} strokeWidth={0.75} />
            </g>
          ) : (
            <line key={i} x1={x} x2={x} y1={tableTop} y2={tableBottom} stroke={TABLE.rule} strokeWidth={0.75} />
          ),
        )}
      </g>

      <g fontSize={6.75} fill={MUTED}>
        {foot.map((line, i) => (
          <text key={i} x={x0} y={baseline(footTop + 7.5 * i, 6.75)}>{line}</text>
        ))}
      </g>
      <g fontSize={8.25} fill={INK}>
        <text x={x0} y={baseline(signTop, 8.25)}>Comments ____________________</text>
        <text x={348.4} y={baseline(signTop, 8.25)}>Reviewed by ____________________</text>
        <text x={813.7} y={baseline(signTop, 8.25)} textAnchor="end">Sign &amp; Date ____________________</text>
      </g>
      <text x={A4L.w / 2} y={baseline(signTop + 20.5, 7.12)} fontSize={7.12} fill={FOOT} textAnchor="middle">{lab.copyright}</text>
    </svg>
  )
}

function wrap(text: string, max: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      lines.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines
}
