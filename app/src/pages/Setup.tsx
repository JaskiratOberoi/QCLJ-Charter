import { DownloadSimple, Plus, Trash, UploadSimple } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button, Card, Field, Input, PageHeader, Pill, Segmented, Select, Toggle, cx } from '../components/ui'
import { addDays, ddmmyyyy, todayISO } from '../lib/dates'
import { cv, fmt, getTarget } from '../lib/stats'
import { activeLab, DEFAULT_LAB, removeLab } from '../lib/labs'
import { loadLabData, uid, useActiveLot, useStore, useWorkspace, workspaceOf } from '../lib/store'
import type { Analyte, ControlLot, Instrument } from '../lib/types'

type Tab = 'lab' | 'instrument' | 'tests' | 'lot' | 'targets' | 'days' | 'data'

export function SetupPage() {
  const [tab, setTab] = useState<Tab>('lab')
  return (
    <>
      <PageHeader title="Setup" sub="Everything the reports print: the lab header, instrument, tests, control lot and its manufacturer ranges, and the fixed targets the LJ charts are drawn on." />
      <div data-reveal className="mb-6 overflow-x-auto">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'lab', label: 'Lab profile' },
            { value: 'instrument', label: 'Instrument' },
            { value: 'tests', label: 'Tests' },
            { value: 'lot', label: 'Control lot & ranges' },
            { value: 'targets', label: 'Fixed targets' },
            { value: 'days', label: 'Excluded days' },
            { value: 'data', label: 'Backup & data' },
          ]}
        />
      </div>
      <div data-reveal key={tab}>
        {tab === 'lab' && <LabTab />}
        {tab === 'instrument' && <InstrumentTab />}
        {tab === 'tests' && <TestsTab />}
        {tab === 'lot' && <LotTab />}
        {tab === 'targets' && <TargetsTab />}
        {tab === 'days' && <DaysTab />}
        {tab === 'data' && <DataTab />}
      </div>
    </>
  )
}

function LabTab() {
  const lab = useStore((s) => s.lab)
  const setLab = useStore((s) => s.setLab)
  return (
    <Card className="grid gap-5 p-6 md:grid-cols-2">
      <Field label="Organization"><Input value={lab.organization} onChange={(e) => setLab({ organization: e.target.value })} placeholder="Noble Diagnostic Centre" /></Field>
      <Field label="Lab / branch name"><Input value={lab.branch} onChange={(e) => setLab({ branch: e.target.value })} /></Field>
      <Field label="Lab address" className="md:col-span-2"><Input value={lab.address} onChange={(e) => setLab({ address: e.target.value })} /></Field>
      <Field label="Contact" hint="Printed as-is, e.g. “SHIPRA | M: 9511018366”"><Input value={lab.contact} onChange={(e) => setLab({ contact: e.target.value })} /></Field>
      <Field label="CAPA form document number"><Input value={lab.capaDocNo} onChange={(e) => setLab({ capaDocNo: e.target.value })} placeholder="NDC / DI / 7.3.7" /></Field>
      <Field label="Report title prefix" hint="Appears before “LJ Chart Report”. Leave blank for none."><Input value={lab.reportBrand} onChange={(e) => setLab({ reportBrand: e.target.value })} /></Field>
      <Field label="Report footer line"><Input value={lab.copyright} onChange={(e) => setLab({ copyright: e.target.value })} /></Field>
      <LogoField
        label="Report header logo"
        hint="Top-right of LJ, CV and cumulative reports (49.5 × 13.5 pt slot). Uses the lab logo when empty."
        value={lab.reportLogoDataUrl}
        wide
        onChange={(v) => setLab({ reportLogoDataUrl: v })}
      />
      <LogoField label="Lab logo" hint="Footer of the corrective action form." value={lab.logoDataUrl} onChange={(v) => setLab({ logoDataUrl: v })} />
    </Card>
  )
}

function LogoField({ label, hint, value, wide, onChange }: { label: string; hint: string; value?: string; wide?: boolean; onChange: (v?: string) => void }) {
  const onFile = (f?: File) => {
    if (!f) return
    const r = new FileReader()
    r.onload = () => onChange(String(r.result))
    r.readAsDataURL(f)
  }
  return (
    <div>
      <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">{label}</div>
      <div className="flex items-center gap-3">
        <div className={cx('grid h-16 shrink-0 place-items-center rounded-xl border border-dashed border-line-2 bg-paper', wide ? 'w-40' : 'w-16')}>
          {value ? <img src={value} alt="" className={cx('object-contain', wide ? 'max-h-10 max-w-36' : 'max-h-12 max-w-12')} /> : <span className="text-[11px] text-faint">None</span>}
        </div>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line-2 bg-surface px-5 text-sm font-medium whitespace-nowrap hover:border-ink/40">
          <UploadSimple size={16} /> Upload
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {value && <Button variant="ghost" onClick={() => onChange(undefined)}>Remove</Button>}
      </div>
      <p className="mt-1.5 text-[12px] text-muted">{hint}</p>
    </div>
  )
}

function InstrumentTab() {
  const list = useStore((s) => s.instruments)
  const upsert = useStore((s) => s.upsertInstrument)
  const remove = useStore((s) => s.removeInstrument)
  const add = () => upsert({ id: uid('i'), manufacturer: '', model: '', serial: '', method: 'CLIA - Chemiluminescence immunoassay' })
  return (
    <div className="flex flex-col gap-4">
      {list.map((i) => (
        <Card key={i.id} className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_1fr_1.4fr_auto]">
          {(['manufacturer', 'model', 'serial', 'method'] as (keyof Instrument)[]).map((k) => (
            <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
              <Input value={i[k]} onChange={(e) => upsert({ ...i, [k]: e.target.value })} />
            </Field>
          ))}
          <Button variant="ghost" className="self-end" onClick={() => remove(i.id)}><Trash size={16} /></Button>
        </Card>
      ))}
      <div><Button onClick={add}><Plus size={16} /> Add instrument</Button></div>
    </div>
  )
}

function TestsTab() {
  const analytes = useStore((s) => s.analytes)
  const upsert = useStore((s) => s.upsertAnalyte)
  const remove = useStore((s) => s.removeAnalyte)
  const add = () => upsert({ id: uid('a'), code: '', name: '', unit: '', decimals: 2, order: analytes.length, cvLimit: 10 })
  const move = (a: Analyte, d: number) => {
    const other = analytes.find((x) => x.order === a.order + d)
    if (!other) return
    upsert({ ...other, order: a.order })
    upsert({ ...a, order: a.order + d })
  }
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-[13px]">
        <thead className="bg-paper/60 text-left text-[11.5px] text-muted">
          <tr>{['', 'Instrument code', 'Report name', 'Unit', 'Decimals', 'CV limit %', 'TEa %', ''].map((h, i) => <th key={i} className="px-3 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {analytes.map((a, i) => (
            <tr key={a.id} className="border-t border-line">
              <td className="px-3 py-2 text-faint">
                <button disabled={i === 0} onClick={() => move(a, -1)} className="px-1 disabled:opacity-20">↑</button>
                <button disabled={i === analytes.length - 1} onClick={() => move(a, 1)} className="px-1 disabled:opacity-20">↓</button>
              </td>
              <td className="px-2 py-2"><Input className="h-9 font-mono" value={a.code} onChange={(e) => upsert({ ...a, code: e.target.value })} /></td>
              <td className="px-2 py-2"><Input className="h-9" value={a.name} onChange={(e) => upsert({ ...a, name: e.target.value })} /></td>
              <td className="px-2 py-2"><Input className="h-9 w-28" value={a.unit} onChange={(e) => upsert({ ...a, unit: e.target.value })} /></td>
              <td className="px-2 py-2"><Input className="h-9 w-20" type="number" min={0} max={5} value={a.decimals} onChange={(e) => upsert({ ...a, decimals: Number(e.target.value) })} /></td>
              <td className="px-2 py-2"><Input className="h-9 w-24" type="number" value={a.cvLimit} onChange={(e) => upsert({ ...a, cvLimit: Number(e.target.value) })} /></td>
              <td className="px-2 py-2"><Input className="h-9 w-24" type="number" value={a.tea ?? ''} placeholder="—" onChange={(e) => upsert({ ...a, tea: e.target.value === '' ? undefined : Number(e.target.value) })} /></td>
              <td className="px-3 py-2"><Button variant="ghost" size="sm" onClick={() => remove(a.id)}><Trash size={15} /></Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-4 border-t border-line p-4">
        <Button onClick={add}><Plus size={16} /> Add test</Button>
        <span className="text-[12.5px] text-muted">The instrument code must match the PDF “Assay” column. Report order sets the page order. Removing a test deletes its results.</span>
      </div>
    </Card>
  )
}

function LotTab() {
  const ws = useWorkspace()
  const upsert = useStore((s) => s.upsertLot)
  const remove = useStore((s) => s.removeLot)
  const setActive = useStore((s) => s.setActiveLot)
  const setInsert = useStore((s) => s.setInsert)
  const active = useActiveLot()
  const lot = active
  const addLot = () => {
    const id = uid('l')
    upsert({
      id, manufacturer: '', product: '', instrumentId: ws.instruments[0]?.id ?? '', startDate: todayISO(), sampleIdPattern: 'L(\\d)',
      levels: [{ level: 1, lotNo: '', expiry: addDays(todayISO(), 365) }, { level: 2, lotNo: '', expiry: addDays(todayISO(), 365) }],
      chartLevels: [1, 2],
    })
    setActive(id)
  }
  const set = (p: Partial<ControlLot>) => lot && upsert({ ...lot, ...p })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {ws.lots.map((l) => (
          <button key={l.id} onClick={() => setActive(l.id)} className={cx('h-9 rounded-full px-4 text-[13px] font-medium ring-1', l.id === lot?.id ? 'bg-ink text-white ring-ink' : 'bg-surface ring-line-2')}>
            {l.manufacturer || 'New lot'} · {l.levels.map((x) => x.lotNo || '—').join('/')}
          </button>
        ))}
        <Button size="sm" onClick={addLot}><Plus size={14} /> New control lot</Button>
      </div>
      {lot && (
        <>
          <Card className="grid gap-5 p-6 md:grid-cols-3">
            <Field label="Control manufacturer"><Input value={lot.manufacturer} onChange={(e) => set({ manufacturer: e.target.value })} placeholder="Bio-Rad" /></Field>
            <Field label="Product" className="md:col-span-2"><Input value={lot.product} onChange={(e) => set({ product: e.target.value })} placeholder="Lyphochek Immunoassay Plus Control" /></Field>
            <Field label="Instrument">
              <Select value={lot.instrumentId} onChange={(e) => set({ instrumentId: e.target.value })}>
                <option value="">—</option>
                {ws.instruments.map((i) => <option key={i.id} value={i.id}>{i.manufacturer} {i.model}</option>)}
              </Select>
            </Field>
            <Field label="In use from" hint="Cumulative statistics start here."><Input type="date" value={lot.startDate} onChange={(e) => set({ startDate: e.target.value })} /></Field>
            <Field label="Sample ID → level pattern" hint={<>Regex with one group. <code>L(\d)</code> reads “BIORAD L1 CON” as level 1.</>}>
              <Input className="font-mono" value={lot.sampleIdPattern} onChange={(e) => set({ sampleIdPattern: e.target.value })} />
            </Field>
            <div className="md:col-span-3">
              <div className="mb-2 text-[12px] font-medium text-muted">Levels (all are printed in the lot line; ticked levels are charted)</div>
              <div className="flex flex-col gap-2">
                {lot.levels.map((lv, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3">
                    <Input className="h-9 w-20" type="number" value={lv.level} onChange={(e) => set({ levels: lot.levels.map((x, j) => (j === i ? { ...x, level: Number(e.target.value) } : x)) })} />
                    <Input className="h-9 w-40" placeholder="Lot number" value={lv.lotNo} onChange={(e) => set({ levels: lot.levels.map((x, j) => (j === i ? { ...x, lotNo: e.target.value } : x)) })} />
                    <Input className="h-9 w-44" type="date" value={lv.expiry} onChange={(e) => set({ levels: lot.levels.map((x, j) => (j === i ? { ...x, expiry: e.target.value } : x)) })} />
                    <Toggle checked={lot.chartLevels.includes(lv.level)} onChange={(v) => set({ chartLevels: v ? [...lot.chartLevels, lv.level].sort() : lot.chartLevels.filter((x) => x !== lv.level) })} label="Charted" />
                    <Button size="sm" variant="ghost" onClick={() => set({ levels: lot.levels.filter((_, j) => j !== i), chartLevels: lot.chartLevels.filter((x) => x !== lv.level) })}><Trash size={14} /></Button>
                  </div>
                ))}
                <div><Button size="sm" onClick={() => set({ levels: [...lot.levels, { level: lot.levels.length + 1, lotNo: '', expiry: lot.levels[0]?.expiry ?? todayISO() }] })}><Plus size={14} /> Add level</Button></div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line p-4">
              <div>
                <div className="text-sm font-semibold">Manufacturer reference ranges (package insert)</div>
                <div className="text-[12.5px] text-muted">Enter in the instrument's reporting units. Used for acceptance checks and optional insert-based targets.</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-paper/60 text-left text-[11.5px] text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Test</th>
                    {lot.chartLevels.map((l) => <th key={l} className="px-4 py-2.5 font-medium">Level {l}: low · mean · high</th>)}
                  </tr>
                </thead>
                <tbody>
                  {ws.analytes.map((a) => (
                    <tr key={a.id} className="border-t border-line">
                      <td className="px-4 py-2 font-medium">{a.name} <span className="text-faint">{a.unit}</span></td>
                      {lot.chartLevels.map((l) => {
                        const r = ws.inserts.find((x) => x.lotId === lot.id && x.analyteId === a.id && x.level === l) ?? { lotId: lot.id, analyteId: a.id, level: l }
                        const upd = (k: 'low' | 'mean' | 'high', v: string) => setInsert({ ...r, [k]: v === '' ? undefined : Number(v) })
                        return (
                          <td key={l} className="px-4 py-2">
                            <div className="flex gap-1.5">
                              {(['low', 'mean', 'high'] as const).map((k) => (
                                <input key={k} defaultValue={r[k] != null ? +Number(r[k]).toFixed(4) : ''} onBlur={(e) => upd(k, e.target.value)} placeholder={k} className="num h-8 w-20 rounded-md border border-line-2 px-2 text-right outline-none focus:border-accent" />
                              ))}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div>
            <Button variant="danger" onClick={() => confirm('Delete this lot and all of its results?') && remove(lot.id)}><Trash size={16} /> Delete lot</Button>
          </div>
        </>
      )}
    </div>
  )
}

function TargetsTab() {
  const ws = useWorkspace()
  const lot = useActiveLot()
  const establish = useStore((s) => s.establishTargets)
  const fromInserts = useStore((s) => s.targetsFromInserts)
  const setTarget = useStore((s) => s.setTarget)
  const [from, setFrom] = useState(lot?.startDate ?? todayISO())
  const [to, setTo] = useState(addDays(lot?.startDate ?? todayISO(), 19))
  const [incl, setIncl] = useState(true)
  const [div, setDiv] = useState(2)
  const [msg, setMsg] = useState('')
  if (!lot) return <p className="text-sm text-muted">Create a control lot first.</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="text-sm font-semibold">Establish from your own baseline</div>
          <p className="mt-1 text-[12.5px] text-muted">Mean and sample SD of the results in this window (CLSI C24 suggests ≥ 20 runs).</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Toggle checked={incl} onChange={setIncl} label="Include excluded days in baseline" />
            <Button variant="primary" className="ml-auto" onClick={() => setMsg(`${establish(lot.id, from, to, incl)} targets calculated from ${ddmmyyyy(from)}–${ddmmyyyy(to)}.`)}>Calculate targets</Button>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold">Use the manufacturer insert</div>
          <p className="mt-1 text-[12.5px] text-muted">Mean from the insert (or range midpoint); SD from the range width. Handy for a new lot before your own baseline exists.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Insert range represents">
              <Select value={div} onChange={(e) => setDiv(Number(e.target.value))} className="w-48">
                <option value={2}>mean ± 2 SD</option>
                <option value={3}>mean ± 3 SD</option>
              </Select>
            </Field>
            <Button className="ml-auto" onClick={() => setMsg(`${fromInserts(lot.id, div)} targets set from insert ranges.`)}>Apply insert targets</Button>
          </div>
        </Card>
      </div>
      {msg && <Pill tone="accent" className="self-start">{msg}</Pill>}

      <Card className="overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-paper/60 text-left text-[11.5px] text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Test</th>
              {lot.chartLevels.map((l) => <th key={l} className="px-4 py-2.5 font-medium">Level {l}: mean · SD · CV · source</th>)}
            </tr>
          </thead>
          <tbody>
            {ws.analytes.map((a) => (
              <tr key={a.id} className="border-t border-line">
                <td className="px-4 py-2 font-medium">{a.name}</td>
                {lot.chartLevels.map((l) => {
                  const t = getTarget(ws, lot.id, a.id, l)
                  const ins = ws.inserts.find((x) => x.lotId === lot.id && x.analyteId === a.id && x.level === l)
                  const save = (k: 'mean' | 'sd', v: string) => {
                    const n = Number(v)
                    if (v === '' || !isFinite(n)) return
                    setTarget({ lotId: lot.id, analyteId: a.id, level: l, mean: t?.mean ?? n, sd: t?.sd ?? 0, ...{ [k]: n }, source: 'manual' })
                  }
                  const outside = t && ins?.low != null && ins.high != null && (t.mean < ins.low || t.mean > ins.high)
                  return (
                    <td key={l} className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <input key={`m${t?.mean}`} defaultValue={t ? +t.mean.toFixed(a.decimals + 2) : ''} onBlur={(e) => save('mean', e.target.value)} placeholder="mean" className="num h-8 w-24 rounded-md border border-line-2 px-2 text-right outline-none focus:border-accent" />
                        <input key={`s${t?.sd}`} defaultValue={t ? +t.sd.toFixed(a.decimals + 2) : ''} onBlur={(e) => save('sd', e.target.value)} placeholder="SD" className="num h-8 w-20 rounded-md border border-line-2 px-2 text-right outline-none focus:border-accent" />
                        <span className="num w-14 text-right text-muted">{t ? `${fmt(cv(t.sd, t.mean), 2)}%` : ''}</span>
                        {t && <Pill tone={t.source === 'manual' ? 'neutral' : 'accent'} className="h-5">{t.source}{t.n ? ` · n${t.n}` : ''}</Pill>}
                        {outside && <Pill tone="warn" className="h-5">outside insert</Pill>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function DaysTab() {
  const ex = useStore((s) => s.exclusions)
  const setEx = useStore((s) => s.setExclusion)
  const remove = useStore((s) => s.removeExclusion)
  const [d, setD] = useState(todayISO())
  const [reason, setReason] = useState('Holiday')
  return (
    <Card className="p-6">
      <p className="text-[13px] text-muted">Excluded days are left off the LJ plot and out of monthly and cumulative statistics, but their results stay stored. You can also toggle a day from the month grid in Enter results.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="Date"><Input type="date" value={d} onChange={(e) => setD(e.target.value)} /></Field>
        <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <Button onClick={() => setEx({ date: d, reason })}><Plus size={16} /> Add</Button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {ex.map((e) => (
          <span key={e.date} className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-[13px] ring-1 ring-line">
            <span className="num font-medium">{ddmmyyyy(e.date)}</span> <span className="text-muted">{e.reason}</span>
            <button onClick={() => remove(e.date)} className="text-faint hover:text-bad">×</button>
          </span>
        ))}
        {!ex.length && <span className="text-[13px] text-faint">None.</span>}
      </div>
    </Card>
  )
}

function DataTab() {
  const s = useStore()
  const [busy, setBusy] = useState(false)
  const lab = activeLab()
  const isDefault = lab.id === DEFAULT_LAB.id
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(workspaceOf(s))], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `qclj-backup-${todayISO()}.json`
    a.click()
  }
  const importJson = async (f?: File) => {
    if (!f) return
    try {
      const ws = JSON.parse(await f.text())
      if (!ws.runs || !ws.lots) throw new Error('Not a Zenith-Q backup')
      s.replaceWorkspace(ws)
      alert(`Restored ${ws.runs.length} results.`)
    } catch (e) {
      alert((e as Error).message)
    }
  }
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="p-6">
        <div className="text-sm font-semibold">Back up</div>
        <p className="mt-1 text-[12.5px] text-muted">All data lives in this browser (IndexedDB). Export regularly; the file restores everything.</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={exportJson}><DownloadSimple size={16} /> Export</Button>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line-2 bg-surface px-5 text-sm font-medium hover:border-ink/40">
            <UploadSimple size={16} /> Restore
            <input type="file" accept="application/json" className="sr-only" onChange={(e) => importJson(e.target.files?.[0])} />
          </label>
        </div>
        <div className="mt-4 text-[12px] text-faint">{s.runs.length} results · {s.lots.length} lots · {s.capas.length} CAPA records</div>
      </Card>
      {isDefault && (
        <Card className="p-6">
          <div className="text-sm font-semibold">Noble Diagnostic Centre record</div>
          <p className="mt-1 text-[12.5px] text-muted">Oct 2025 – Sep 2026 on Bio-Rad Lyphochek Immunoassay Plus (40471/40472), Snibe Maglumi X3: every daily result, the 16 repeated failures and their corrective actions. Replaces current data.</p>
          <Button className="mt-4" variant="dark" disabled={busy} onClick={async () => { if (!s.runs.length || confirm('Replace current data with the Noble Diagnostic Centre record?')) { setBusy(true); await loadLabData(); setBusy(false) } }}>
            {busy ? 'Loading…' : 'Reload lab record'}
          </Button>
        </Card>
      )}
      <Card className="p-6">
        <div className="text-sm font-semibold">Reset</div>
        <p className="mt-1 text-[12.5px] text-muted">{isDefault ? `Erase ${lab.name}'s data stored in this browser.` : `Erase ${lab.name}'s data, or remove the lab entirely.`}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="danger" onClick={() => confirm(`Erase all of ${lab.name}'s data?`) && s.reset()}><Trash size={16} /> Erase data</Button>
          {!isDefault && <Button variant="ghost" onClick={() => confirm(`Remove ${lab.name} and its data from this browser?`) && removeLab(lab.id)}>Remove lab</Button>}
        </div>
      </Card>
    </div>
  )
}
