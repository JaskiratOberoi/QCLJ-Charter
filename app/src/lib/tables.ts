import type { TableModel } from '../components/report/TableReportPage'
import { ddmmyyyy, monthEnd, monthShortLabel, monthStart } from './dates'
import { instrumentInfo, lotInfo, orgLine } from './report'
import { cumulativeSummary, cv, fmt, getTarget, monthSummary } from './stats'
import type { ControlLot, Workspace } from './types'

export const MAX_COLS = 12

function chunk<T>(a: T[], n: number) {
  const out: T[][] = []
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n))
  return out.length ? out : [[]]
}

function rangeInfo(months: string[]) {
  return `From: ${ddmmyyyy(monthStart(months[0]))} To: ${ddmmyyyy(monthEnd(months[months.length - 1]))}`
}

export function monthlyCvModels(ws: Workspace, lot: ControlLot, months: string[]): TableModel[] {
  return chunk(months, MAX_COLS).map((cols) => {
    const firstLevel = lot.chartLevels[0]
    const firstAnalyte = ws.analytes[0]
    return {
      title: 'Monthly CV Report',
      info: [
        ['Data Range', rangeInfo(cols)],
        ['Organization/Lab name', orgLine(ws)],
        ['QC Lot Information', lotInfo(lot)],
        ['Instrument Information', instrumentInfo(ws, lot, true)],
      ],
      fixedHeader: 'Fixed CV %',
      columns: cols.map(monthShortLabel),
      nLabel: 'N',
      nValues: cols.map((m) => (firstAnalyte ? String(monthSummary(ws, lot.id, firstAnalyte.id, firstLevel, m).n) : '')),
      groups: ws.analytes.map((a) => ({
        name: a.name,
        unit: a.unit,
        rows: lot.chartLevels.map((level) => {
          const t = getTarget(ws, lot.id, a.id, level)
          const vals = cols.map((m) => monthSummary(ws, lot.id, a.id, level, m).cv)
          return {
            level: `Level ${level}`,
            fixed: t ? fmt(cv(t.sd, t.mean), 2) : '—',
            values: vals.map((v) => fmt(v, 2)),
            flagged: vals.flatMap((v, i) => (isFinite(v) && v > a.cvLimit ? [i] : [])),
          }
        }),
      })),
      footnote:
        "Monthly CV % = SD / mean × 100 of that month's QC results only (excluded days removed). LJ charts are plotted on the fixed mean and fixed SD. Fixed CV % = fixed SD / fixed mean × 100. Values above each test's CV acceptance limit are shown in red.",
    }
  })
}

export type CumKind = 'mean' | 'sd' | 'cv'

export function cumulativeModels(ws: Workspace, lot: ControlLot, months: string[], kind: CumKind): TableModel[] {
  const title = { mean: 'Cumulative Mean Report', sd: 'Cumulative SD Report', cv: 'Cumulative CV Report' }[kind]
  const fixedHeader = { mean: 'Fixed mean', sd: 'Fixed SD', cv: 'Fixed CV %' }[kind]
  const from = ddmmyyyy(lot.startDate)
  const footnote = {
    mean: `Cumulative mean = arithmetic mean of all QC results from ${from} to the end of each month, excluded days removed. Fixed mean is the target used on the LJ charts.`,
    sd: `Cumulative SD = sample SD of all QC results from ${from} to the end of each month, excluded days removed. Fixed SD is the target SD used for the LJ chart limits.`,
    cv: 'Cumulative CV % = cumulative SD / cumulative mean × 100. Fixed CV % = fixed SD / fixed mean × 100. The LJ chart Month CV is the monthly SD / monthly mean, not this cumulative CV.',
  }[kind]
  const firstLevel = lot.chartLevels[0]
  const firstAnalyte = ws.analytes[0]
  return chunk(months, MAX_COLS).map((cols) => ({
    title,
    info: [
      ['Data Range', `From: ${from} To: ${ddmmyyyy(monthEnd(cols[cols.length - 1]))}`],
      ['Organization/Lab name', orgLine(ws)],
      ['Lab Address', ws.lab.address],
      ['QC Lot Information', lotInfo(lot)],
      ['Instrument Information', instrumentInfo(ws, lot, true)],
    ],
    fixedHeader,
    columns: cols.map(monthShortLabel),
    nLabel: 'Cumulative N',
    nValues: cols.map((m) => (firstAnalyte ? String(cumulativeSummary(ws, lot.id, firstAnalyte.id, firstLevel, m).n) : '')),
    groups: ws.analytes.map((a) => ({
      name: a.name,
      unit: a.unit,
      rows: lot.chartLevels.map((level) => {
        const t = getTarget(ws, lot.id, a.id, level)
        const d = kind === 'cv' ? 2 : a.decimals
        const fixed = !t ? NaN : kind === 'mean' ? t.mean : kind === 'sd' ? t.sd : cv(t.sd, t.mean)
        return {
          level: `Level ${level}`,
          fixed: fmt(fixed, d),
          values: cols.map((m) => fmt(cumulativeSummary(ws, lot.id, a.id, level, m)[kind], d)),
        }
      }),
    })),
    footnote,
  }))
}
