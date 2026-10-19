import { useMemo, useRef, useState } from 'react'
import { Button, Card, Field, Input, Pill, Segmented, cx } from '../../components/ui'
import { daysInMonth, ddmmyyyy, iso, parts, todayISO } from '../../lib/dates'
import { getTarget } from '../../lib/stats'
import { useActiveLot, useStore, useWorkspace } from '../../lib/store'
import { useUi } from '../../lib/ui'

export function ManualEntry({ onDone }: { onDone: (msg: string) => void }) {
  const [mode, setMode] = useState<'daily' | 'grid'>('daily')
  return (
    <div className="flex flex-col gap-5">
      <Segmented value={mode} onChange={setMode} options={[{ value: 'daily', label: "Today's run" }, { value: 'grid', label: 'Month grid' }]} />
      {mode === 'daily' ? <DailyForm onDone={onDone} /> : <MonthGrid />}
    </div>
  )
}

function zTone(z: number) {
  if (!isFinite(z)) return ''
  const a = Math.abs(z)
  if (a > 3) return 'bg-bad-soft text-bad'
  if (a > 2) return 'bg-warn-soft text-warn'
  return 'bg-ok-soft/60 text-ink'
}

function DailyForm({ onDone }: { onDone: (msg: string) => void }) {
  const ws = useWorkspace()
  const lot = useActiveLot()
  const addRuns = useStore((s) => s.addRuns)
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 8))
  const [vals, setVals] = useState<Record<string, string>>({})
  if (!lot) return null
  const key = (a: string, l: number) => `${a}|${l}`
  const entered = Object.entries(vals).filter(([, v]) => v.trim() !== '' && isFinite(Number(v)))

  const save = () => {
    const res = addRuns(
      entered.map(([k, v]) => {
        const [analyteId, level] = k.split('|')
        return { lotId: lot.id, analyteId, level: Number(level), date, time, value: Number(v), source: 'manual' as const }
      }),
    )
    setVals({})
    onDone(`${res.added} results saved for ${ddmmyyyy(date)}.`)
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-end gap-4 border-b border-line p-5">
        <Field label="Run date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Time"><Input type="time" step={1} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[13px] text-muted">{entered.length} values</span>
          <Button variant="primary" disabled={!entered.length} onClick={save}>Save run</Button>
        </div>
      </div>
      <table className="w-full text-[13.5px]">
        <thead className="bg-paper/60 text-left text-[11.5px] text-muted">
          <tr>
            <th className="px-5 py-2.5 font-medium">Test</th>
            {lot.chartLevels.map((l) => <th key={l} className="px-5 py-2.5 font-medium">Level {l} · {lot.levels.find((x) => x.level === l)?.lotNo}</th>)}
          </tr>
        </thead>
        <tbody>
          {ws.analytes.map((a) => (
            <tr key={a.id} className="border-t border-line">
              <td className="px-5 py-2.5">
                <div className="font-medium">{a.name}</div>
                <div className="text-[11.5px] text-faint">{a.unit} · {a.code}</div>
              </td>
              {lot.chartLevels.map((l) => {
                const t = getTarget(ws, lot.id, a.id, l)
                const v = vals[key(a.id, l)] ?? ''
                const z = v !== '' && t ? (Number(v) - t.mean) / t.sd : NaN
                return (
                  <td key={l} className="px-5 py-2">
                    <div className="flex items-center gap-3">
                      <input
                        inputMode="decimal"
                        value={v}
                        onChange={(e) => setVals((s) => ({ ...s, [key(a.id, l)]: e.target.value }))}
                        placeholder={t ? t.mean.toFixed(a.decimals) : '—'}
                        className={cx('num h-9 w-32 rounded-lg border border-line-2 px-3 text-right outline-none transition-colors focus:border-accent', zTone(z))}
                      />
                      {isFinite(z) && <span className={cx('num text-[12px]', Math.abs(z) > 2 ? 'font-semibold text-bad' : 'text-muted')}>{z >= 0 ? '+' : ''}{z.toFixed(2)} SD</span>}
                      {t && !isFinite(z) && <span className="num text-[11.5px] text-faint">{(t.mean - 2 * t.sd).toFixed(a.decimals)}–{(t.mean + 2 * t.sd).toFixed(a.decimals)}</span>}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function MonthGrid() {
  const ws = useWorkspace()
  const lot = useActiveLot()
  const month = useUi((s) => s.month)
  const upsert = useStore((s) => s.upsertRunValue)
  const setExclusion = useStore((s) => s.setExclusion)
  const removeExclusion = useStore((s) => s.removeExclusion)
  const [level, setLevel] = useState<number>(lot?.chartLevels[0] ?? 1)
  const table = useRef<HTMLTableElement>(null)
  const n = daysInMonth(month)
  const { y, m } = parts(`${month}-01`)
  const days = Array.from({ length: n }, (_, i) => iso(y, m, i + 1))

  const cell = useMemo(() => {
    const map = new Map<string, number>()
    if (!lot) return map
    for (const r of ws.runs)
      if (r.lotId === lot.id && r.level === level && !r.rejected && r.date.startsWith(month)) map.set(`${r.analyteId}|${r.date}`, r.value)
    return map
  }, [ws.runs, lot, level, month])
  const ex = new Map(ws.exclusions.map((e) => [e.date, e.reason]))
  if (!lot) return null

  const move = (r: number, c: number) => {
    const el = table.current?.querySelector<HTMLInputElement>(`input[data-r="${r}"][data-c="${c}"]`)
    el?.focus()
    el?.select()
  }

  const commit = (analyteId: string, date: string, raw: string) => {
    const t = raw.trim()
    const prev = cell.get(`${analyteId}|${date}`)
    if (t === '') {
      if (prev != null) upsert({ lotId: lot.id, analyteId, level, date }, null)
      return
    }
    const v = Number(t)
    if (isFinite(v) && v !== prev) upsert({ lotId: lot.id, analyteId, level, date }, v)
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 border-b border-line p-4">
        <Segmented value={String(level)} onChange={(v) => setLevel(Number(v))} options={lot.chartLevels.map((l) => ({ value: String(l), label: `Level ${l}` }))} />
        <p className="text-[12.5px] text-muted">Type and press Enter or arrow keys. Saved on blur. Clear a cell to delete. Click a date to mark it excluded (holiday / no run).</p>
      </div>
      <div className="scroll-thin max-h-[640px] overflow-auto">
        <table ref={table} className="w-full border-separate border-spacing-0 text-[13px]">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <th className="sticky left-0 z-20 border-b border-line bg-surface px-4 py-2 text-left text-[11.5px] font-medium text-muted">Date</th>
              {ws.analytes.map((a) => {
                const t = getTarget(ws, lot.id, a.id, level)
                return (
                  <th key={a.id} className="border-b border-line px-2 py-2 text-right font-medium">
                    <div className="text-[12.5px] text-ink">{a.name}</div>
                    <div className="num text-[10.5px] font-normal text-faint">{t ? `${t.mean.toFixed(a.decimals)} ± ${(2 * t.sd).toFixed(a.decimals)}` : 'no target'}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {days.map((d, r) => {
              const reason = ex.get(d)
              return (
                <tr key={d} className={reason ? 'bg-paper' : ''}>
                  <td className="sticky left-0 z-[1] border-b border-line bg-inherit px-4 py-1">
                    <button
                      onClick={() => (reason ? removeExclusion(d) : setExclusion({ date: d, reason: 'Holiday' }))}
                      className="num flex items-center gap-2 text-left whitespace-nowrap"
                      title={reason ? 'Click to include this day' : 'Click to exclude this day'}
                    >
                      <span className={cx('font-medium', reason && 'text-faint line-through')}>{ddmmyyyy(d)}</span>
                      <span className="text-[11px] text-faint">{new Date(d).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                      {reason && <Pill className="h-5">{reason}</Pill>}
                    </button>
                  </td>
                  {ws.analytes.map((a, c) => {
                    const v = cell.get(`${a.id}|${d}`)
                    const t = getTarget(ws, lot.id, a.id, level)
                    const z = v != null && t ? (v - t.mean) / t.sd : NaN
                    return (
                      <td key={a.id} className="border-b border-line p-0.5">
                        <input
                          key={`${d}${a.id}${v}`}
                          data-r={r}
                          data-c={c}
                          defaultValue={v ?? ''}
                          inputMode="decimal"
                          onFocus={(e) => e.target.select()}
                          onBlur={(e) => commit(a.id, d, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); move(r + 1, c) }
                            if (e.key === 'ArrowUp') { e.preventDefault(); move(r - 1, c) }
                            if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionStart === (e.target as HTMLInputElement).value.length) move(r, c + 1)
                            if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0) move(r, c - 1)
                          }}
                          className={cx('num h-8 w-full min-w-[78px] rounded-md bg-transparent px-2 text-right outline-none focus:bg-accent-soft focus:ring-1 focus:ring-accent', zTone(z))}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-line px-4 py-2.5 text-[12px] text-faint">
        Lot {lot.levels.find((l) => l.level === level)?.lotNo} · Level {level} · {cell.size} values this month
      </div>
    </Card>
  )
}
