import { useGSAP } from '@gsap/react'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import gsap from 'gsap'
import { useMemo, useRef, useState } from 'react'
import { Button, Card, Pill, Select, Toggle, cx } from '../../components/ui'
import { ddmmyyyy } from '../../lib/dates'
import { levelFromSampleId } from '../../lib/parsers/level'
import { getTarget } from '../../lib/stats'
import { uid, useActiveLot, useStore, useWorkspace } from '../../lib/store'
import type { Run, RunSource } from '../../lib/types'

export interface StagedRow {
  assay: string
  sampleId?: string
  level?: number
  date: string
  time?: string
  value: number
  rlu?: number
  unit?: string
  file?: string
  flag?: string
}

type Map = Record<string, string> // assay code -> analyte id | '__new' | '__skip'

export function StagedImport({ rows, source, onDone }: { rows: StagedRow[]; source: RunSource; onDone: (msg: string) => void }) {
  const ws = useWorkspace()
  const activeLot = useActiveLot()
  const lots = useStore((s) => s.lots)
  const addRuns = useStore((s) => s.addRuns)
  const upsertAnalyte = useStore((s) => s.upsertAnalyte)
  const updateRun = useStore((s) => s.updateRun)
  const [lotId, setLotId] = useState(activeLot?.id ?? '')
  const lot = lots.find((l) => l.id === lotId)
  const [supersede, setSupersede] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  const codes = useMemo(() => [...new Set(rows.map((r) => r.assay))], [rows])
  const [map, setMap] = useState<Map>(() =>
    Object.fromEntries(
      codes.map((c) => {
        const a = ws.analytes.find((x) => codeKey(x.code) === codeKey(c) || codeKey(x.name) === codeKey(c))
        return [c, a ? a.id : '__new']
      }),
    ),
  )
  const sampleIds = useMemo(() => [...new Set(rows.filter((r) => r.level == null).map((r) => r.sampleId ?? ''))], [rows])
  const [levelMap, setLevelMap] = useState<Record<string, number | undefined>>({})
  const levelOf = (r: StagedRow) => r.level ?? levelMap[r.sampleId ?? ''] ?? (lot ? levelFromSampleId(r.sampleId ?? '', lot.sampleIdPattern) : undefined)

  const existing = useMemo(() => new Set(ws.runs.map((r) => `${r.lotId}|${r.analyteId}|${r.level}|${r.date}|${r.time ?? ''}|${r.value}`)), [ws.runs])

  const staged = rows.map((r) => {
    const target = map[r.assay]
    const level = levelOf(r)
    const analyteId = target && !target.startsWith('__') ? target : undefined
    let status: 'new' | 'dup' | 'unmapped' | 'skip' | 'nolevel' = 'new'
    if (target === '__skip') status = 'skip'
    else if (!level) status = 'nolevel'
    else if (!analyteId && target !== '__new') status = 'unmapped'
    else if (analyteId && existing.has(`${lotId}|${analyteId}|${level}|${r.date}|${r.time ?? ''}|${r.value}`)) status = 'dup'
    const t = analyteId && level ? getTarget(ws, lotId, analyteId, level) : undefined
    const z = t ? (r.value - t.mean) / t.sd : NaN
    return { r, level, analyteId, status, z }
  })
  const counts = staged.reduce<Record<string, number>>((m, s) => ((m[s.status] = (m[s.status] ?? 0) + 1), m), {})

  useGSAP(() => {
    gsap.from(ref.current!.querySelectorAll('[data-row]'), { opacity: 0, x: -8, duration: 0.4, stagger: 0.008, ease: 'power2.out' })
  }, { scope: ref, dependencies: [rows] })

  const commit = () => {
    if (!lot) return
    const ids = { ...map }
    for (const c of codes)
      if (ids[c] === '__new') {
        const sample = rows.find((r) => r.assay === c)
        const dec = String(sample?.value ?? '').split('.')[1]?.length ?? 2
        const id = uid('a')
        upsertAnalyte({ id, code: c, name: c, unit: normaliseUnit(sample?.unit ?? ''), decimals: Math.max(2, dec), order: ws.analytes.length + codes.indexOf(c), cvLimit: 10 })
        ids[c] = id
      }
    const toAdd: Omit<Run, 'id' | 'createdAt'>[] = []
    for (const s of staged) {
      if (s.status === 'skip' || s.status === 'nolevel' || s.status === 'unmapped' || s.status === 'dup') continue
      toAdd.push({
        lotId: lot.id,
        analyteId: ids[s.r.assay],
        level: s.level!,
        date: s.r.date,
        time: s.r.time,
        value: s.r.value,
        rlu: s.r.rlu,
        source,
        fileName: s.r.file,
        note: s.r.flag || undefined,
      })
    }
    if (supersede) markRepeats(toAdd)
    const res = addRuns(toAdd)
    if (supersede) {
      const touched = new Set(toAdd.map((r) => `${r.lotId}|${r.analyteId}|${r.level}|${r.date}`))
      const latest = useStore.getState().runs
      const byKey = new globalThis.Map<string, typeof latest>()
      for (const r of latest) {
        const k = `${r.lotId}|${r.analyteId}|${r.level}|${r.date}`
        if (r.rejected || !touched.has(k)) continue
        byKey.set(k, [...(byKey.get(k) ?? []), r])
      }
      for (const group of byKey.values())
        if (group.length > 1) {
          group.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '') || a.createdAt - b.createdAt)
          group.slice(0, -1).forEach((r) => updateRun(r.id, { rejected: true, note: r.note ?? 'Superseded by repeat' }))
        }
    }
    onDone(`${res.added} results saved${res.duplicates ? `, ${res.duplicates} duplicates skipped` : ''}.`)
  }

  return (
    <div ref={ref} className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <div className="mb-2 text-[12px] font-medium text-muted">Control lot</div>
            <Select value={lotId} onChange={(e) => setLotId(e.target.value)}>
              {lots.map((l) => <option key={l.id} value={l.id}>{l.manufacturer} {l.product} · {l.levels.map((x) => x.lotNo).join('/')}</option>)}
            </Select>
            <div className="mt-4">
              <Toggle checked={supersede} onChange={setSupersede} label="If a day has repeats, keep the latest and mark earlier ones rejected" />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="mb-2 text-[12px] font-medium text-muted">Map instrument assay codes to tests</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {codes.map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate font-mono text-[12.5px]" title={c}>{c}</span>
                  <Select value={map[c]} onChange={(e) => setMap((m) => ({ ...m, [c]: e.target.value }))} className="h-9">
                    {ws.analytes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    <option value="__new">+ Create test “{c}”</option>
                    <option value="__skip">Ignore</option>
                  </Select>
                </div>
              ))}
            </div>
            {sampleIds.length > 0 && (
              <>
                <div className="mt-4 mb-2 text-[12px] font-medium text-muted">Sample ID → control level</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sampleIds.map((sid) => {
                    const auto = lot ? levelFromSampleId(sid, lot.sampleIdPattern) : undefined
                    return (
                      <div key={sid} className="flex items-center gap-2">
                        <span className="w-28 shrink-0 truncate font-mono text-[12.5px]" title={sid}>{sid || '(blank)'}</span>
                        <Select value={levelMap[sid] ?? auto ?? ''} onChange={(e) => setLevelMap((m) => ({ ...m, [sid]: e.target.value ? Number(e.target.value) : undefined }))} className="h-9">
                          <option value="">Not a control</option>
                          {lot?.levels.map((l) => <option key={l.level} value={l.level}>Level {l.level} · {l.lotNo}</option>)}
                        </Select>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="ok">{counts.new ?? 0} new</Pill>
        {counts.dup ? <Pill>{counts.dup} already saved</Pill> : null}
        {counts.nolevel ? <Pill tone="warn">{counts.nolevel} no level</Pill> : null}
        {counts.unmapped ? <Pill tone="warn">{counts.unmapped} unmapped</Pill> : null}
        {counts.skip ? <Pill>{counts.skip} ignored</Pill> : null}
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={() => onDone('')}>Discard</Button>
          <Button variant="primary" disabled={!lot || !(counts.new ?? 0)} onClick={commit}>
            <CheckCircle size={16} weight="bold" /> Save {counts.new ?? 0} results
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="scroll-thin max-h-[520px] overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-paper text-left text-[11.5px] text-muted">
              <tr>
                {['Date', 'Time', 'Sample ID', 'Assay', 'Level', 'Value', 'z', 'File', 'Status'].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {staged.slice(0, 800).map((s, i) => (
                <tr key={i} data-row className="border-t border-line">
                  <td className="num px-4 py-2">{ddmmyyyy(s.r.date)}</td>
                  <td className="num px-4 py-2 text-muted">{s.r.time}</td>
                  <td className="px-4 py-2 font-mono text-[12px]">{s.r.sampleId}</td>
                  <td className="px-4 py-2 font-mono text-[12px]">{s.r.assay}</td>
                  <td className="px-4 py-2">{s.level ?? '—'}</td>
                  <td className="num px-4 py-2 font-semibold">{s.r.value} <span className="font-normal text-faint">{s.r.unit}</span></td>
                  <td className={cx('num px-4 py-2', Math.abs(s.z) > 3 ? 'font-semibold text-bad' : Math.abs(s.z) > 2 ? 'text-warn' : 'text-muted')}>{isFinite(s.z) ? s.z.toFixed(2) : ''}</td>
                  <td className="max-w-[180px] truncate px-4 py-2 text-muted">{s.r.file}</td>
                  <td className="px-4 py-2">
                    {s.status === 'new' && <Pill tone="ok">New</Pill>}
                    {s.status === 'dup' && <Pill>Saved</Pill>}
                    {s.status === 'skip' && <Pill>Ignored</Pill>}
                    {(s.status === 'nolevel' || s.status === 'unmapped') && <Pill tone="warn"><WarningCircle size={12} /> {s.status === 'nolevel' ? 'No level' : 'Unmapped'}</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staged.length > 800 && <div className="px-4 py-3 text-[12px] text-muted">Showing 800 of {staged.length} rows — all will be saved.</div>}
        </div>
      </Card>
    </div>
  )
}

function markRepeats(rows: Omit<Run, 'id' | 'createdAt'>[]) {
  const by = new Map<string, typeof rows>()
  for (const r of rows) {
    const k = `${r.lotId}|${r.analyteId}|${r.level}|${r.date}`
    by.set(k, [...(by.get(k) ?? []), r])
  }
  for (const g of by.values())
    if (g.length > 1) {
      g.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
      g.slice(0, -1).forEach((r) => {
        r.rejected = true
        r.note = r.note ?? 'Superseded by repeat'
      })
    }
}

const codeKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function normaliseUnit(u: string) {
  return u.replace(/^ml[Uu]/, 'mIU').replace(/^ul[Uu]/, 'µIU').replace(/^ug/, 'µg')
}
