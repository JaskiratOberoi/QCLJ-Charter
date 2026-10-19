import { monthEnd, monthKey, monthStart } from './dates'
import type { ISODate, Run, Target, Workspace } from './types'

export function mean(v: number[]) {
  if (!v.length) return NaN
  let s = 0
  for (const x of v) s += x
  return s / v.length
}

/** Sample standard deviation (n − 1). */
export function sd(v: number[]) {
  if (v.length < 2) return NaN
  const m = mean(v)
  let s = 0
  for (const x of v) s += (x - m) ** 2
  return Math.sqrt(s / (v.length - 1))
}

export const cv = (s: number, m: number) => (s / m) * 100

export interface Summary {
  n: number
  mean: number
  sd: number
  cv: number
}

export function summarize(v: number[]): Summary {
  const m = mean(v)
  const s = sd(v)
  return { n: v.length, mean: m, sd: s, cv: cv(s, m) }
}

export function excludedSet(ws: Workspace) {
  return new Set(ws.exclusions.map((e) => e.date))
}

/** Accepted runs for one lot/analyte/level, sorted chronologically. */
export function seriesRuns(ws: Workspace, lotId: string, analyteId: string, level: number): Run[] {
  return ws.runs
    .filter((r) => r.lotId === lotId && r.analyteId === analyteId && r.level === level && !r.rejected)
    .sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))
}

export interface RangeOpts {
  from: ISODate
  to: ISODate
  includeExcluded?: boolean
}

export function valuesInRange(ws: Workspace, lotId: string, analyteId: string, level: number, o: RangeOpts) {
  const ex = o.includeExcluded ? null : excludedSet(ws)
  return seriesRuns(ws, lotId, analyteId, level).filter(
    (r) => r.date >= o.from && r.date <= o.to && !(ex && ex.has(r.date)),
  )
}

export function getTarget(ws: Workspace, lotId: string, analyteId: string, level: number): Target | undefined {
  return ws.targets.find((t) => t.lotId === lotId && t.analyteId === analyteId && t.level === level)
}

export function monthSummary(ws: Workspace, lotId: string, analyteId: string, level: number, key: string) {
  const runs = valuesInRange(ws, lotId, analyteId, level, { from: monthStart(key), to: monthEnd(key) })
  return { runs, ...summarize(runs.map((r) => r.value)) }
}

export function cumulativeSummary(ws: Workspace, lotId: string, analyteId: string, level: number, key: string) {
  const lot = ws.lots.find((l) => l.id === lotId)
  const runs = valuesInRange(ws, lotId, analyteId, level, {
    from: lot?.startDate ?? '0000-01-01',
    to: monthEnd(key),
  })
  return summarize(runs.map((r) => r.value))
}

/** Months (YYYY-MM) that contain any run for the lot. */
export function lotMonths(ws: Workspace, lotId: string) {
  const s = new Set<string>()
  for (const r of ws.runs) if (r.lotId === lotId) s.add(monthKey(r.date))
  return [...s].sort()
}

export function zScore(value: number, t?: Pick<Target, 'mean' | 'sd'>) {
  if (!t || !t.sd) return NaN
  return (value - t.mean) / t.sd
}

/** Sigma metric = (TEa − |bias|) / CV, all in %. */
export function sigmaMetric(tea: number | undefined, biasPct: number, cvPct: number) {
  if (tea == null || !isFinite(cvPct) || cvPct <= 0) return NaN
  return (tea - Math.abs(biasPct)) / cvPct
}

export function fmt(v: number | undefined, d: number) {
  if (v == null || !isFinite(v)) return '—'
  return v.toFixed(d)
}
