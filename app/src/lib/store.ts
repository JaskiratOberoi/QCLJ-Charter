import { del, get, set } from 'idb-keyval'
import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { summarize, valuesInRange } from './stats'
import { activeLab, activeLabId, DEFAULT_LAB, renameLab, workspaceKey } from './labs'
import type {
  Analyte, Capa, ControlLot, Exclusion, InsertRange, Instrument, LabProfile, Run, Target, WestgardConfig, Workspace,
} from './types'

const idb: StateStorage = {
  getItem: async (k) => (await get(k)) ?? null,
  setItem: (k, v) => set(k, v),
  removeItem: (k) => del(k),
}

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

export function emptyWorkspace(): Workspace {
  return {
    version: 1,
    lab: {
      organization: '',
      branch: '',
      address: '',
      contact: '',
      reportBrand: 'QCLJ Studio',
      copyright: '© Copyright 2025 QCLJ Studio. All rights reserved.',
      capaDocNo: '',
    },
    instruments: [],
    analytes: [],
    lots: [],
    inserts: [],
    targets: [],
    runs: [],
    exclusions: [],
    capas: [],
    westgard: { warn12s: true, r13s: true, r22s: true, rR4s: true, r41s: true, r10x: true },
  }
}

const sameKey = (a: { lotId: string; analyteId: string; level: number }, b: typeof a) =>
  a.lotId === b.lotId && a.analyteId === b.analyteId && a.level === b.level

export interface AddRunsResult {
  added: number
  duplicates: number
}

interface Actions {
  hydrated: boolean
  setLab: (p: Partial<LabProfile>) => void
  upsertInstrument: (i: Instrument) => void
  removeInstrument: (id: string) => void
  upsertAnalyte: (a: Analyte) => void
  removeAnalyte: (id: string) => void
  upsertLot: (l: ControlLot) => void
  removeLot: (id: string) => void
  setActiveLot: (id: string) => void
  setInsert: (r: InsertRange) => void
  setTarget: (t: Target) => void
  removeTarget: (k: Pick<Target, 'lotId' | 'analyteId' | 'level'>) => void
  establishTargets: (lotId: string, from: string, to: string, includeExcluded: boolean) => number
  targetsFromInserts: (lotId: string, sdDivisor: number) => number
  addRuns: (runs: Omit<Run, 'id' | 'createdAt'>[], dedupe?: boolean) => AddRunsResult
  updateRun: (id: string, p: Partial<Run>) => void
  removeRuns: (ids: string[]) => void
  upsertRunValue: (k: Pick<Run, 'lotId' | 'analyteId' | 'level' | 'date'>, value: number | null) => void
  setExclusion: (e: Exclusion) => void
  removeExclusion: (date: string) => void
  upsertCapa: (c: Capa) => void
  removeCapa: (id: string) => void
  setWestgard: (p: Partial<WestgardConfig>) => void
  replaceWorkspace: (w: Workspace) => void
  reset: () => void
}

export type Store = Workspace & Actions

export const useStore = create<Store>()(
  persist(
    (setState, getState) => ({
      ...emptyWorkspace(),
      hydrated: false,
      setLab: (p) => {
        if (p.organization !== undefined) renameLab(activeLabId(), p.organization)
        setState((s) => ({ lab: { ...s.lab, ...p } }))
      },
      upsertInstrument: (i) =>
        setState((s) => ({ instruments: upsert(s.instruments, i) })),
      removeInstrument: (id) => setState((s) => ({ instruments: s.instruments.filter((x) => x.id !== id) })),
      upsertAnalyte: (a) => setState((s) => ({ analytes: upsert(s.analytes, a).sort((x, y) => x.order - y.order) })),
      removeAnalyte: (id) =>
        setState((s) => ({
          analytes: s.analytes.filter((x) => x.id !== id),
          runs: s.runs.filter((r) => r.analyteId !== id),
          targets: s.targets.filter((t) => t.analyteId !== id),
          inserts: s.inserts.filter((t) => t.analyteId !== id),
        })),
      upsertLot: (l) => setState((s) => ({ lots: upsert(s.lots, l), activeLotId: s.activeLotId ?? l.id })),
      removeLot: (id) =>
        setState((s) => ({
          lots: s.lots.filter((x) => x.id !== id),
          runs: s.runs.filter((r) => r.lotId !== id),
          targets: s.targets.filter((t) => t.lotId !== id),
          inserts: s.inserts.filter((t) => t.lotId !== id),
          activeLotId: s.activeLotId === id ? s.lots.find((x) => x.id !== id)?.id : s.activeLotId,
        })),
      setActiveLot: (id) => setState({ activeLotId: id }),
      setInsert: (r) =>
        setState((s) => ({ inserts: [...s.inserts.filter((x) => !sameKey(x, r)), r] })),
      setTarget: (t) => setState((s) => ({ targets: [...s.targets.filter((x) => !sameKey(x, t)), t] })),
      removeTarget: (k) => setState((s) => ({ targets: s.targets.filter((x) => !sameKey(x, k)) })),
      establishTargets: (lotId, from, to, includeExcluded) => {
        const ws = getState()
        const lot = ws.lots.find((l) => l.id === lotId)
        if (!lot) return 0
        const next = ws.targets.filter((t) => t.lotId !== lotId || t.source !== 'baseline')
        let count = 0
        for (const a of ws.analytes)
          for (const level of lot.chartLevels) {
            const v = valuesInRange(ws, lotId, a.id, level, { from, to, includeExcluded }).map((r) => r.value)
            if (v.length < 2) continue
            const s = summarize(v)
            const k = { lotId, analyteId: a.id, level }
            const existing = next.findIndex((t) => sameKey(t, k))
            if (existing >= 0) next.splice(existing, 1)
            next.push({ ...k, mean: s.mean, sd: s.sd, n: s.n, from, to, source: 'baseline' })
            count++
          }
        setState({ targets: next })
        return count
      },
      targetsFromInserts: (lotId, sdDivisor) => {
        const ws = getState()
        let count = 0
        const next = [...ws.targets]
        for (const r of ws.inserts.filter((x) => x.lotId === lotId)) {
          if (r.low == null || r.high == null) continue
          const m = r.mean ?? (r.low + r.high) / 2
          const s = (r.high - r.low) / (2 * sdDivisor)
          const i = next.findIndex((t) => sameKey(t, r))
          if (i >= 0) next.splice(i, 1)
          next.push({ lotId, analyteId: r.analyteId, level: r.level, mean: m, sd: s, source: 'insert' })
          count++
        }
        setState({ targets: next })
        return count
      },
      addRuns: (incoming, dedupe = true) => {
        const ws = getState()
        const seen = new Set(
          dedupe ? ws.runs.map((r) => `${r.lotId}|${r.analyteId}|${r.level}|${r.date}|${r.time ?? ''}|${r.value}`) : [],
        )
        const now = Date.now()
        const add: Run[] = []
        let duplicates = 0
        for (const r of incoming) {
          const key = `${r.lotId}|${r.analyteId}|${r.level}|${r.date}|${r.time ?? ''}|${r.value}`
          if (seen.has(key)) {
            duplicates++
            continue
          }
          seen.add(key)
          add.push({ ...r, id: uid('r'), createdAt: now })
        }
        setState({ runs: [...ws.runs, ...add] })
        return { added: add.length, duplicates }
      },
      updateRun: (id, p) => setState((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, ...p } : r)) })),
      removeRuns: (ids) => {
        const del = new Set(ids)
        setState((s) => ({ runs: s.runs.filter((r) => !del.has(r.id)) }))
      },
      upsertRunValue: (k, value) =>
        setState((s) => {
          const idx = s.runs.findIndex((r) => sameKey(r, k) && r.date === k.date && !r.rejected)
          if (value == null) return idx >= 0 ? { runs: s.runs.filter((_, i) => i !== idx) } : {}
          if (idx >= 0) {
            const runs = [...s.runs]
            runs[idx] = { ...runs[idx], value, source: 'manual' }
            return { runs }
          }
          return { runs: [...s.runs, { ...k, value, id: uid('r'), source: 'manual', createdAt: Date.now() }] }
        }),
      setExclusion: (e) =>
        setState((s) => ({ exclusions: [...s.exclusions.filter((x) => x.date !== e.date), e].sort((a, b) => a.date.localeCompare(b.date)) })),
      removeExclusion: (date) => setState((s) => ({ exclusions: s.exclusions.filter((x) => x.date !== date) })),
      upsertCapa: (c) => setState((s) => ({ capas: upsert(s.capas, c) })),
      removeCapa: (id) => setState((s) => ({ capas: s.capas.filter((x) => x.id !== id) })),
      setWestgard: (p) => setState((s) => ({ westgard: { ...s.westgard, ...p } })),
      replaceWorkspace: (w) => {
        if (w.lab?.organization) renameLab(activeLabId(), w.lab.organization)
        setState({ ...emptyWorkspace(), ...w })
      },
      reset: () => setState({ ...emptyWorkspace(), activeLotId: undefined }),
    }),
    {
      name: workspaceKey(activeLabId()),
      storage: createJSONStorage(() => idb),
      partialize: (s) => {
        const { hydrated: _h, ...rest } = s
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as unknown as Store
      },
      onRehydrateStorage: () => async (s) => {
        const empty = !s?.lots.length && !s?.runs.length
        if (activeLabId() === DEFAULT_LAB.id) {
          if (empty && !localStorage.getItem(SEEDED)) await loadLabData().catch(() => undefined)
          else if (!empty) await upgradeDefaultLab().catch(() => undefined)
          localStorage.setItem(SEEDED, '1')
        } else if (empty && !s?.lab.organization) {
          useStore.setState((x) => ({ lab: { ...x.lab, organization: activeLab().name } }))
        }
        useStore.setState({ hydrated: true })
      },
    },
  ),
)

function upsert<T extends { id: string }>(list: T[], item: T) {
  const i = list.findIndex((x) => x.id === item.id)
  if (i < 0) return [...list, item]
  const next = [...list]
  next[i] = item
  return next
}

export function workspaceOf(s: Store): Workspace {
  return {
    version: s.version,
    lab: s.lab,
    instruments: s.instruments,
    analytes: s.analytes,
    lots: s.lots,
    inserts: s.inserts,
    targets: s.targets,
    runs: s.runs,
    exclusions: s.exclusions,
    capas: s.capas,
    westgard: s.westgard,
    activeLotId: s.activeLotId,
  }
}

/** Stable workspace snapshot for derived computations. */
export function useWorkspace(): Workspace {
  const s = useStore()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => workspaceOf(s), [
    s.lab, s.instruments, s.analytes, s.lots, s.inserts, s.targets, s.runs, s.exclusions, s.capas, s.westgard, s.activeLotId,
  ])
}

export function useActiveLot() {
  const lots = useStore((s) => s.lots)
  const id = useStore((s) => s.activeLotId)
  return lots.find((l) => l.id === id) ?? lots[0]
}

/** Set once the default lab's bundled record has been loaded, so "Erase all" is not undone on the next visit. */
const SEEDED = 'qclj-seeded'

/** Where the bundled lab record lives. The Hostinger build points this at api-qclj (served from the lab's own server). */
const LAB_DATA_URL: string = import.meta.env.VITE_DATA_URL || '/data/noble.json'

const fetchLabData = async () => (await (await fetch(LAB_DATA_URL, { cache: 'no-cache' })).json()) as Workspace

/** Noble Diagnostic Centre's IQC record, built by scripts/build-lab-data.py. */
export async function loadLabData() {
  useStore.getState().replaceWorkspace(await fetchLabData())
}

/**
 * Brings a default-lab workspace saved by an earlier version up to the bundled record:
 * the old demo dataset is swapped for the record (keeping results and CAPAs the user added),
 * and missing report branding is filled in.
 */
async function upgradeDefaultLab() {
  const s = useStore.getState()
  const isOldDemo = s.runs.some((r) => r.source === 'demo')
  const oldCopyright = /Copyright 2026 QCLJ Studio/.test(s.lab.copyright)
  if (!isOldDemo && s.lab.reportLogoDataUrl && !oldCopyright) return
  const record = await fetchLabData()
  if (isOldDemo) {
    const ownRuns = s.runs.filter((r) => r.source !== 'demo')
    const recordCapas = new Set(record.capas.map((c) => c.id))
    s.replaceWorkspace({
      ...record,
      runs: [...record.runs, ...ownRuns],
      capas: [...record.capas, ...s.capas.filter((c) => !recordCapas.has(c.id))],
      westgard: s.westgard,
    })
    return
  }
  s.setLab({
    reportLogoDataUrl: s.lab.reportLogoDataUrl ?? record.lab.reportLogoDataUrl,
    logoDataUrl: s.lab.logoDataUrl ?? record.lab.logoDataUrl,
    ...(oldCopyright ? { copyright: record.lab.copyright } : {}),
  })
}
