import { ddmmyyyy, monthEnd, monthStart } from './dates'
import { cv, fmt, getTarget, monthSummary } from './stats'
import type { Analyte, ControlLot, ISODate, Target, Workspace } from './types'
import type { Violation } from './westgard'

export interface LJPoint {
  runId: string
  date: ISODate
  value: number
  z: number
  violations: Violation[]
}

export interface LJLevel {
  level: number
  target?: Target
  n: number
  monthCv: number
  monthMean: number
  monthSd: number
  points: LJPoint[]
}

export interface LJPageModel {
  monthKey: string
  from: ISODate
  to: ISODate
  info: [string, string][]
  analyte: Analyte
  levels: LJLevel[]
}

export function lotInfo(lot: ControlLot) {
  return [lot.manufacturer, lot.product, ...lot.levels.flatMap((l) => [l.lotNo, l.expiry ? ddmmyyyy(l.expiry) : ''])]
    .filter((x) => x !== undefined)
    .join(' | ')
}

export function instrumentInfo(ws: Workspace, lot: ControlLot, withMethod = false) {
  const i = ws.instruments.find((x) => x.id === lot.instrumentId)
  if (!i) return ''
  return [i.manufacturer, i.model, i.serial, withMethod ? i.method : null].filter(Boolean).join(' | ')
}

export function orgLine(ws: Workspace) {
  return [ws.lab.organization, ws.lab.branch].filter(Boolean).join(' / ')
}

export function buildLJPage(
  ws: Workspace,
  lot: ControlLot,
  analyte: Analyte,
  monthKey: string,
  violations: Violation[] = [],
): LJPageModel {
  const from = monthStart(monthKey)
  const to = monthEnd(monthKey)
  const inst = ws.instruments.find((x) => x.id === lot.instrumentId)
  const info: [string, string][] = [
    ['Data Range', `From: ${ddmmyyyy(from)} To: ${ddmmyyyy(to)}`],
    ['Organization/Lab name', orgLine(ws)],
    ['Lab Address', ws.lab.address],
    ['Contact', ws.lab.contact],
    ['QC Lot Information', lotInfo(lot)],
    ['Instrument Information', instrumentInfo(ws, lot)],
    ['Test Information', [analyte.name, analyte.unit, inst?.method].filter(Boolean).join(' | ')],
  ]
  const levels: LJLevel[] = lot.chartLevels.map((level) => {
    const target = getTarget(ws, lot.id, analyte.id, level)
    const m = monthSummary(ws, lot.id, analyte.id, level, monthKey)
    return {
      level,
      target,
      n: m.n,
      monthCv: m.cv,
      monthMean: m.mean,
      monthSd: m.sd,
      points: m.runs.map((r) => ({
        runId: r.id,
        date: r.date,
        value: r.value,
        z: target ? (r.value - target.mean) / target.sd : NaN,
        violations: violations.filter((v) => v.runId === r.id),
      })),
    }
  })
  return { monthKey, from, to, info, analyte, levels }
}

export function levelHeader(l: LJLevel, d: number) {
  const t = l.target
  const parts = [
    `Level ${l.level} - Mean: ${fmt(t?.mean, d)}`,
    `SD: ${fmt(t?.sd, d)}`,
    `CV: ${t ? fmt(cv(t.sd, t.mean), 2) : '—'}`,
    `N: ${l.n}`,
    `Month CV: ${fmt(l.monthCv, 2)}`,
  ]
  return parts.join(' | ')
}
