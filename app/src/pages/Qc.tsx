import { useGSAP } from '@gsap/react'
import { FilePdf, NotePencil, X } from '@phosphor-icons/react'
import gsap from 'gsap'
import { useMemo, useRef, useState } from 'react'
import { usePrint } from '../components/print'
import { CapaFormPage, ROOT_CAUSES } from '../components/report/CapaFormPage'
import { Button, Card, Empty, Field, Input, PageHeader, Pill, Segmented, Toggle, cx } from '../components/ui'
import { ddmmyyyy, monthLongLabel } from '../lib/dates'
import { monthSummary } from '../lib/stats'
import { uid, useActiveLot, useStore, useWorkspace } from '../lib/store'
import type { Capa, WestgardConfig } from '../lib/types'
import { useUi } from '../lib/ui'
import { RULES, evaluateLot, type RuleId, type Violation } from '../lib/westgard'

export function QcPage() {
  const ws = useWorkspace()
  const lot = useActiveLot()
  const month = useUi((s) => s.month)
  const print = usePrint()
  const setWestgard = useStore((s) => s.setWestgard)
  const [filter, setFilter] = useState<'all' | 'reject' | 'warning'>('all')
  const [editing, setEditing] = useState<Capa | null>(null)

  const all = useMemo(() => (lot ? evaluateLot(ws, lot.id) : []), [ws, lot])
  const monthV = all.filter((v) => v.date.startsWith(month))
  const grouped = useMemo(() => {
    const m = new Map<string, Violation[]>()
    for (const v of monthV) m.set(v.runId, [...(m.get(v.runId) ?? []), v])
    return [...m.values()].sort((a, b) => a[0].date.localeCompare(b[0].date))
  }, [monthV])
  const shown = grouped.filter((g) => filter === 'all' || g.some((v) => v.severity === filter))
  const capas = ws.capas.filter((c) => c.lotId === lot?.id && c.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date))
  const cvOver = lot
    ? ws.analytes.flatMap((a) => lot.chartLevels.map((l) => ({ a, l, s: monthSummary(ws, lot.id, a.id, l, month) })).filter((x) => x.s.cv > a.cvLimit))
    : []
  const amap = new Map(ws.analytes.map((a) => [a.id, a]))
  const inst = ws.instruments.find((i) => i.id === lot?.instrumentId)

  if (!lot) return <Empty title="No control lot yet" />

  const startCapa = (g: Violation[]) => {
    const v = g[0]
    const existing = ws.capas.find((c) => c.runId === v.runId)
    setEditing(
      existing ?? {
        id: uid('c'), runId: v.runId, lotId: v.lotId, analyteId: v.analyteId, level: v.level, date: v.date,
        rule: g.map((x) => x.rule).join(', '),
        outlierType: g.some((x) => x.rule !== '1-2s' && x.rule !== '1-3s') ? `Westgard ${g.map((x) => x.rule).join(', ')}` : 'Daily QC Out',
        rootCauses: [], corrective: 'Random error. QC - Repeat. Correct result obtained.', preventive: '', takenBy: '', verifiedBy: '', createdAt: Date.now(),
      },
    )
  }

  const printForms = () => {
    const pages = []
    for (let i = 0; i < capas.length; i += 2)
      pages.push({ key: `capa${i}`, landscape: true, node: <CapaFormPage entries={capas.slice(i, i + 2)} lab={ws.lab} analytes={ws.analytes} instrument={inst} /> })
    print(pages, `IQC Corrective Action ${monthLongLabel(month)}`)
  }

  return (
    <>
      <PageHeader
        title={<>Westgard & corrective action · {monthLongLabel(month)}</>}
        sub="Multirule evaluation on the fixed targets, across runs and across levels. Record a corrective action against any finding and print the signed form."
        actions={<Button variant="dark" disabled={!capas.length} onClick={printForms}><FilePdf size={16} /> Print CAPA forms ({capas.length})</Button>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <Card data-reveal className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
              <span className="text-sm font-semibold">Findings</span>
              <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: `All ${grouped.length}` }, { value: 'reject', label: 'Rejects' }, { value: 'warning', label: 'Warnings' }]} />
            </div>
            {shown.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted">No findings for this month.</p>
            ) : (
              <ul>
                {shown.map((g) => {
                  const v = g[0]
                  const a = amap.get(v.analyteId)
                  const done = ws.capas.some((c) => c.runId === v.runId)
                  return (
                    <li key={v.runId} className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-3 first:border-t-0">
                      <span className="num w-24 text-[13px] text-muted">{ddmmyyyy(v.date)}</span>
                      <span className="w-40 text-[13.5px] font-medium">{a?.name} <span className="text-muted">L{v.level}</span></span>
                      <span className="num w-36 text-[13px]">{v.value.toFixed(a?.decimals ?? 2)} <span className={cx(Math.abs(v.z) > 2 ? 'text-bad' : 'text-muted')}>({v.z >= 0 ? '+' : ''}{v.z.toFixed(2)} SD)</span></span>
                      <span className="flex flex-wrap gap-1">{g.map((x) => <Pill key={x.rule} tone={x.severity === 'reject' ? 'bad' : 'warn'}>{x.rule}</Pill>)}</span>
                      <Button size="sm" variant={done ? 'ghost' : 'outline'} className="ml-auto" onClick={() => startCapa(g)}>
                        <NotePencil size={14} /> {done ? 'Edit action' : 'Record action'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {cvOver.length > 0 && (
            <Card data-reveal className="p-4">
              <div className="mb-2 text-sm font-semibold">Monthly CV above limit</div>
              <div className="flex flex-wrap gap-2">
                {cvOver.map((x) => <Pill key={x.a.id + x.l} tone="bad">{x.a.name} L{x.l} · {x.s.cv.toFixed(2)}% &gt; {x.a.cvLimit}%</Pill>)}
              </div>
            </Card>
          )}

          <Card data-reveal className="overflow-hidden">
            <div className="border-b border-line p-4 text-sm font-semibold">Corrective actions this month</div>
            {capas.length === 0 ? <p className="p-6 text-sm text-muted">None recorded.</p> : (
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {capas.map((c) => (
                  <button key={c.id} onClick={() => setEditing(c)} className="rounded-xl border border-line p-4 text-left transition-colors hover:border-ink/30">
                    <div className="flex justify-between text-[12px] text-muted"><span>{ddmmyyyy(c.date)}</span><span>{c.rule}</span></div>
                    <div className="mt-1 font-medium">{amap.get(c.analyteId)?.name} · Level {c.level}</div>
                    <div className="mt-1 line-clamp-2 text-[13px] text-muted">{c.corrective}</div>
                    <div className="mt-2 text-[12px] text-faint">Taken by {c.takenBy || '—'} · verified {c.verifiedBy || '—'}</div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card data-reveal className="h-fit p-5">
          <div className="text-sm font-semibold">Rules in use</div>
          <div className="mt-4 flex flex-col gap-4">
            {(Object.keys(RULES) as RuleId[]).map((r) => {
              const key = ({ '1-2s': 'warn12s', '1-3s': 'r13s', '2-2s': 'r22s', 'R-4s': 'rR4s', '4-1s': 'r41s', '10x': 'r10x' } as const)[r] as keyof WestgardConfig
              return (
                <div key={r} className="flex gap-3">
                  <Toggle checked={ws.westgard[key]} onChange={(v) => setWestgard({ [key]: v })} />
                  <div>
                    <div className="flex items-center gap-2 text-[13.5px] font-semibold">{r} <Pill tone={RULES[r].severity === 'reject' ? 'bad' : 'warn'} className="h-5">{RULES[r].severity}</Pill></div>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{RULES[r].desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {editing && <CapaDrawer capa={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function CapaDrawer({ capa, onClose }: { capa: Capa; onClose: () => void }) {
  const [c, setC] = useState(capa)
  const upsert = useStore((s) => s.upsertCapa)
  const remove = useStore((s) => s.removeCapa)
  const analytes = useStore((s) => s.analytes)
  const exists = useStore((s) => s.capas.some((x) => x.id === capa.id))
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap.from(ref.current!.querySelector('[data-panel]'), { x: 60, opacity: 0, duration: 0.6, ease: 'expo.out' })
    gsap.from(ref.current!.querySelector('[data-scrim]'), { opacity: 0, duration: 0.4 })
  }, { scope: ref })
  const set = (p: Partial<Capa>) => setC((x) => ({ ...x, ...p }))
  const a = analytes.find((x) => x.id === c.analyteId)

  return (
    <div ref={ref} className="fixed inset-0 z-50 flex justify-end">
      <div data-scrim className="absolute inset-0 bg-night/40 backdrop-blur-sm" onClick={onClose} />
      <div data-panel className="scroll-thin relative flex h-full w-full max-w-lg flex-col gap-5 overflow-y-auto bg-surface p-7 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[12px] text-muted">{ddmmyyyy(c.date)} · {c.rule}</div>
            <div className="text-xl font-semibold tracking-[-0.02em]">{a?.name} · Level {c.level}</div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5"><X size={18} /></button>
        </div>
        <Field label="Outlier type"><Input value={c.outlierType} onChange={(e) => set({ outlierType: e.target.value })} /></Field>
        <div>
          <div className="mb-2 text-[12px] font-medium text-muted">Root cause</div>
          <div className="flex flex-col gap-2">
            {ROOT_CAUSES.map((rc, i) => (
              <label key={rc} className="flex items-center gap-2.5 text-[13.5px]">
                <input type="checkbox" checked={c.rootCauses.includes(i + 1)} onChange={(e) => set({ rootCauses: e.target.checked ? [...c.rootCauses, i + 1] : c.rootCauses.filter((x) => x !== i + 1) })} />
                {i + 1}) {rc}
              </label>
            ))}
          </div>
        </div>
        <Field label="Corrective action taken">
          <textarea value={c.corrective} onChange={(e) => set({ corrective: e.target.value })} className="h-24 rounded-xl border border-line-2 p-3 text-sm outline-none focus:border-accent" />
        </Field>
        <Field label="Preventive action taken">
          <textarea value={c.preventive} onChange={(e) => set({ preventive: e.target.value })} className="h-20 rounded-xl border border-line-2 p-3 text-sm outline-none focus:border-accent" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Taken by (technician)"><Input value={c.takenBy} onChange={(e) => set({ takenBy: e.target.value })} /></Field>
          <Field label="Verified by"><Input value={c.verifiedBy} onChange={(e) => set({ verifiedBy: e.target.value })} /></Field>
        </div>
        <div className="mt-auto flex gap-2 pt-4">
          {exists && <Button variant="danger" onClick={() => { remove(c.id); onClose() }}>Delete</Button>}
          <Button variant="ghost" className="ml-auto" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { upsert(c); onClose() }}>Save action</Button>
        </div>
      </div>
    </div>
  )
}
