import { excludedSet, getTarget, seriesRuns, zScore } from './stats'
import type { ISODate, Run, Workspace } from './types'

export type RuleId = '1-2s' | '1-3s' | '2-2s' | 'R-4s' | '4-1s' | '10x'

export const RULES: Record<RuleId, { label: string; severity: 'warning' | 'reject'; desc: string }> = {
  '1-2s': { label: '1-2s', severity: 'warning', desc: 'One control result beyond ±2 SD. Warning — inspect with the other rules.' },
  '1-3s': { label: '1-3s', severity: 'reject', desc: 'One control result beyond ±3 SD. Random error.' },
  '2-2s': { label: '2-2s', severity: 'reject', desc: 'Two consecutive results beyond the same ±2 SD limit (same level across runs or both levels in a run). Systematic error.' },
  'R-4s': { label: 'R-4s', severity: 'reject', desc: 'Within a run, one level above +2 SD and another below −2 SD. Random error.' },
  '4-1s': { label: '4-1s', severity: 'reject', desc: 'Four consecutive results beyond the same ±1 SD limit. Systematic error.' },
  '10x': { label: '10x', severity: 'reject', desc: 'Ten consecutive results on the same side of the mean. Systematic shift.' },
}

const RULE_CONFIG_KEY: Record<RuleId, keyof Workspace['westgard']> = {
  '1-2s': 'warn12s',
  '1-3s': 'r13s',
  '2-2s': 'r22s',
  'R-4s': 'rR4s',
  '4-1s': 'r41s',
  '10x': 'r10x',
}

export interface Violation {
  runId: string
  lotId: string
  analyteId: string
  level: number
  date: ISODate
  value: number
  z: number
  rule: RuleId
  severity: 'warning' | 'reject'
}

interface Pt {
  run: Run
  z: number
}

/** Evaluates the configured Westgard multirules for one lot/analyte across all charted levels. */
export function evaluateAnalyte(ws: Workspace, lotId: string, analyteId: string): Violation[] {
  const lot = ws.lots.find((l) => l.id === lotId)
  if (!lot) return []
  const ex = excludedSet(ws)
  const enabled = (r: RuleId) => ws.westgard[RULE_CONFIG_KEY[r]]
  const out: Violation[] = []
  const push = (p: Pt, rule: RuleId) =>
    out.push({
      runId: p.run.id,
      lotId,
      analyteId,
      level: p.run.level,
      date: p.run.date,
      value: p.run.value,
      z: p.z,
      rule,
      severity: RULES[rule].severity,
    })

  const byLevel = new Map<number, Pt[]>()
  for (const level of lot.chartLevels) {
    const t = getTarget(ws, lotId, analyteId, level)
    if (!t) continue
    const pts = seriesRuns(ws, lotId, analyteId, level)
      .filter((r) => !ex.has(r.date))
      .map((run) => ({ run, z: zScore(run.value, t) }))
    byLevel.set(level, pts)
  }

  for (const pts of byLevel.values()) {
    pts.forEach((p, i) => {
      const az = Math.abs(p.z)
      if (enabled('1-3s') && az > 3) push(p, '1-3s')
      else if (enabled('1-2s') && az > 2) push(p, '1-2s')
      const prev = pts[i - 1]
      if (enabled('2-2s') && prev && az > 2 && Math.abs(prev.z) > 2 && Math.sign(prev.z) === Math.sign(p.z)) push(p, '2-2s')
      if (enabled('4-1s') && i >= 3) {
        const w = pts.slice(i - 3, i + 1)
        if (w.every((q) => q.z > 1) || w.every((q) => q.z < -1)) push(p, '4-1s')
      }
      if (enabled('10x') && i >= 9) {
        const w = pts.slice(i - 9, i + 1)
        if (w.every((q) => q.z > 0) || w.every((q) => q.z < 0)) push(p, '10x')
      }
    })
  }

  // Across levels within the same run (date).
  const byDate = new Map<ISODate, Pt[]>()
  for (const pts of byLevel.values())
    for (const p of pts) {
      const a = byDate.get(p.run.date) ?? []
      a.push(p)
      byDate.set(p.run.date, a)
    }
  for (const pts of byDate.values()) {
    if (pts.length < 2) continue
    const hi = pts.filter((p) => p.z > 2)
    const lo = pts.filter((p) => p.z < -2)
    if (enabled('R-4s') && hi.length && lo.length) for (const p of [...hi, ...lo]) push(p, 'R-4s')
    if (enabled('2-2s') && (hi.length >= 2 || lo.length >= 2))
      for (const p of hi.length >= 2 ? hi : lo)
        if (!out.some((v) => v.runId === p.run.id && v.rule === '2-2s')) push(p, '2-2s')
  }
  return out
}

export function evaluateLot(ws: Workspace, lotId: string) {
  return ws.analytes.flatMap((a) => evaluateAnalyte(ws, lotId, a.id))
}

export function worstSeverity(vs: Violation[]) {
  if (vs.some((v) => v.severity === 'reject')) return 'reject'
  if (vs.length) return 'warning'
  return 'ok'
}
