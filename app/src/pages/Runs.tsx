import { Trash } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Button, Card, Empty, PageHeader, Pill, Select, Toggle, cx } from '../components/ui'
import { ddmmyyyy, monthLongLabel } from '../lib/dates'
import { excludedSet, getTarget } from '../lib/stats'
import { useActiveLot, useStore, useWorkspace } from '../lib/store'
import { useUi } from '../lib/ui'

export function RunsPage() {
  const ws = useWorkspace()
  const lot = useActiveLot()
  const month = useUi((s) => s.month)
  const updateRun = useStore((s) => s.updateRun)
  const removeRuns = useStore((s) => s.removeRuns)
  const [analyte, setAnalyte] = useState('')
  const [level, setLevel] = useState('')
  const [showRejected, setShowRejected] = useState(true)
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const ex = useMemo(() => excludedSet(ws), [ws])
  const rows = useMemo(
    () =>
      ws.runs
        .filter((r) => r.lotId === lot?.id && r.date.startsWith(month) && (!analyte || r.analyteId === analyte) && (!level || r.level === Number(level)) && (showRejected || !r.rejected))
        .sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')) || a.level - b.level),
    [ws.runs, lot, month, analyte, level, showRejected],
  )
  const amap = new Map(ws.analytes.map((a) => [a.id, a]))

  if (!lot) return <Empty title="No control lot yet" />

  return (
    <>
      <PageHeader
        title={<>Run log · {monthLongLabel(month)}</>}
        sub="Every stored control result with its source. Rejected results stay in the audit trail but are left off the charts and statistics."
        actions={picked.size > 0 && <Button variant="danger" onClick={() => { removeRuns([...picked]); setPicked(new Set()) }}><Trash size={16} /> Delete {picked.size}</Button>}
      />
      <div data-reveal className="mb-5 flex flex-wrap items-center gap-3">
        <Select value={analyte} onChange={(e) => setAnalyte(e.target.value)} className="w-52">
          <option value="">All tests</option>
          {ws.analytes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
        <Select value={level} onChange={(e) => setLevel(e.target.value)} className="w-36">
          <option value="">All levels</option>
          {lot.chartLevels.map((l) => <option key={l} value={l}>Level {l}</option>)}
        </Select>
        <Toggle checked={showRejected} onChange={setShowRejected} label="Show rejected" />
        <span className="ml-auto text-[13px] text-muted">{rows.length} results</span>
      </div>
      <Card data-reveal className="overflow-hidden">
        <div className="scroll-thin max-h-[calc(100vh-300px)] overflow-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-paper text-left text-[11.5px] text-muted">
              <tr>
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" checked={picked.size > 0 && picked.size === rows.length} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
                </th>
                {['Date', 'Time', 'Test', 'Level', 'Value', 'z', 'Source', 'Status', 'Note'].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const a = amap.get(r.analyteId)
                const t = getTarget(ws, r.lotId, r.analyteId, r.level)
                const z = t ? (r.value - t.mean) / t.sd : NaN
                return (
                  <tr key={r.id} className={cx('border-t border-line', r.rejected && 'text-faint')}>
                    <td className="px-4 py-1.5">
                      <input type="checkbox" checked={picked.has(r.id)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n })} />
                    </td>
                    <td className="num px-3 py-1.5">{ddmmyyyy(r.date)} {ex.has(r.date) && <Pill className="ml-1 h-5">excluded</Pill>}</td>
                    <td className="num px-3 py-1.5 text-muted">{r.time}</td>
                    <td className="px-3 py-1.5 font-medium">{a?.name}</td>
                    <td className="px-3 py-1.5">L{r.level}</td>
                    <td className="px-3 py-1.5">
                      <input
                        key={r.value}
                        defaultValue={r.value}
                        onBlur={(e) => { const v = Number(e.target.value); if (isFinite(v) && v !== r.value) updateRun(r.id, { value: v, note: r.note ?? 'Edited' }) }}
                        className="num h-7 w-24 rounded-md bg-transparent px-2 text-right font-semibold outline-none hover:bg-paper focus:bg-accent-soft"
                      />
                    </td>
                    <td className={cx('num px-3 py-1.5', Math.abs(z) > 3 ? 'font-semibold text-bad' : Math.abs(z) > 2 ? 'text-warn' : 'text-muted')}>{isFinite(z) ? z.toFixed(2) : ''}</td>
                    <td className="px-3 py-1.5 text-muted">{r.source}{r.fileName ? ` · ${r.fileName}` : ''}</td>
                    <td className="px-3 py-1.5">
                      <button onClick={() => updateRun(r.id, { rejected: !r.rejected })}>
                        {r.rejected ? <Pill tone="bad">Rejected</Pill> : <Pill tone="ok">Accepted</Pill>}
                      </button>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        key={r.note}
                        defaultValue={r.note}
                        placeholder="—"
                        onBlur={(e) => e.target.value !== (r.note ?? '') && updateRun(r.id, { note: e.target.value || undefined })}
                        className="h-7 w-44 rounded-md bg-transparent px-2 outline-none hover:bg-paper focus:bg-accent-soft"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!rows.length && <div className="p-10 text-center text-sm text-muted">No results for this month.</div>}
        </div>
      </Card>
    </>
  )
}
