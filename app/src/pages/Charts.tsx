import { useGSAP } from '@gsap/react'
import { Printer, FilePdf } from '@phosphor-icons/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LJReportPage, type LJPageOptions } from '../components/report/LJReportPage'
import { usePrint } from '../components/print'
import { Button, Card, Empty, PageHeader, Pill, Segmented, Toggle, cx } from '../components/ui'
import { ddmmyyyy, monthLongLabel } from '../lib/dates'
import { buildLJPage, type LJPoint } from '../lib/report'
import { cv, fmt } from '../lib/stats'
import { useActiveLot, useStore, useWorkspace } from '../lib/store'
import { useUi } from '../lib/ui'
import { RULES, evaluateAnalyte } from '../lib/westgard'

gsap.registerPlugin(ScrollTrigger)

export function ChartsPage() {
  const ws = useWorkspace()
  const lot = useActiveLot()
  const month = useUi((s) => s.month)
  const print = usePrint()
  const loc = useLocation()
  const [sel, setSel] = useState<string>(() => (loc.state as { analyte?: string } | null)?.analyte ?? 'all')
  const [opts, setOpts] = useState<LJPageOptions>({ showMenuGlyph: false, markRejects: true })
  const [tip, setTip] = useState<{ p: LJPoint; level: number; x: number; y: number } | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const capas = useStore((s) => s.capas)

  const pages = useMemo(() => {
    if (!lot) return []
    return ws.analytes.map((a, i) => ({
      analyte: a,
      pageNo: i + 1,
      model: buildLJPage(ws, lot, a, month, evaluateAnalyte(ws, lot.id, a.id)),
    }))
  }, [ws, lot, month])

  useGSAP(
    () => {
      if (sel !== 'all' || !grid.current) return
      const cards = grid.current.querySelectorAll('[data-card]')
      gsap.set(cards, { opacity: 0, y: 40, scale: 0.97 })
      ScrollTrigger.batch(cards, {
        scroller: grid.current.closest('main') ?? undefined,
        start: 'top 92%',
        onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.08, ease: 'expo.out' }),
      })
    },
    { dependencies: [sel, month, pages.length], scope: grid, revertOnUpdate: true },
  )

  if (!lot) return <Empty title="No control lot yet" action={<Link to="/setup"><Button variant="primary">Set up a control lot</Button></Link>}>Add your lab, instrument, tests and control lot first.</Empty>
  if (!ws.analytes.length) return <Empty title="No tests configured" action={<Link to="/setup"><Button variant="primary">Add tests</Button></Link>} />

  const current = pages.find((p) => p.analyte.id === sel)
  const printAll = (only?: string) =>
    print(
      pages
        .filter((p) => !only || p.analyte.id === only)
        .map((p) => ({ key: p.analyte.id, node: <LJReportPage model={p.model} lab={ws.lab} pageNo={p.pageNo} options={{ showMenuGlyph: opts.showMenuGlyph }} /> })),
      `LJ Chart Report - ${monthLongLabel(month).toUpperCase()}`,
    )

  const onHover = (p: LJPoint | null, level: number, e?: React.MouseEvent) => {
    if (!p || !e || !stage.current) return setTip(null)
    const r = stage.current.getBoundingClientRect()
    setTip({ p, level, x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <>
      <PageHeader
        title={<>Levey-Jennings · {monthLongLabel(month)}</>}
        sub={<>Report pages are drawn at A4 point geometry, so what you see is exactly what prints. Plotted on the fixed mean ± SD; points beyond ±2 SD are red.</>}
        actions={
          <>
            {current && <Button onClick={() => printAll(current.analyte.id)}><Printer size={16} /> Print page</Button>}
            <Button variant="dark" onClick={() => printAll()}><FilePdf size={16} /> Print / save month PDF</Button>
          </>
        }
      />

      <div data-reveal className="mb-6 flex flex-wrap items-center gap-4">
        <Segmented
          value={sel}
          onChange={setSel}
          options={[{ value: 'all', label: 'All tests' }, ...ws.analytes.map((a) => ({ value: a.id, label: a.name }))]}
          className="max-w-full overflow-x-auto"
        />
        <div className="ml-auto flex flex-wrap items-center gap-5">
          <Toggle checked={!!opts.markRejects} onChange={(v) => setOpts((o) => ({ ...o, markRejects: v }))} label="Ring Westgard rejects (screen only)" />
          <Toggle checked={!!opts.showMenuGlyph} onChange={(v) => setOpts((o) => ({ ...o, showMenuGlyph: v }))} label="Chart menu glyph" />
        </div>
      </div>

      {sel === 'all' ? (
        <div ref={grid} className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {pages.map((p) => {
            const issues = p.model.levels.flatMap((l) => l.points.flatMap((x) => x.violations))
            const rejects = issues.filter((v) => v.severity === 'reject').length
            return (
              <button key={p.analyte.id} data-card onClick={() => setSel(p.analyte.id)} className="group text-left">
                <div className="paper overflow-hidden rounded-lg bg-white transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-1.5">
                  <div className="aspect-[595/400] overflow-hidden">
                    <LJReportPage model={p.model} lab={ws.lab} pageNo={p.pageNo} options={opts} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{p.analyte.name}</span>
                  {rejects ? <Pill tone="bad">{rejects} reject</Pill> : issues.length ? <Pill tone="warn">{issues.length} warning</Pill> : <Pill tone="ok">In control</Pill>}
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        current && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div data-reveal ref={stage} className="relative">
              <div className="paper mx-auto max-w-[920px] overflow-hidden rounded-md bg-white">
                <LJReportPage key={current.analyte.id + month} model={current.model} lab={ws.lab} pageNo={current.pageNo} animate options={opts} onPointHover={onHover} />
              </div>
              {tip && (
                <div className="pointer-events-none absolute z-20 w-56 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl bg-night px-3.5 py-3 text-white shadow-2xl" style={{ left: tip.x, top: tip.y }}>
                  <div className="flex items-center justify-between text-[11px] text-white/50">
                    <span>Level {tip.level}</span>
                    <span>{ddmmyyyy(tip.p.date)}</span>
                  </div>
                  <div className="num mt-1 text-xl font-semibold">{tip.p.value.toFixed(current.analyte.decimals)} <span className="text-xs font-normal text-white/50">{current.analyte.unit}</span></div>
                  <div className={cx('num text-[12px]', Math.abs(tip.p.z) > 2 ? 'text-[#ff8a80]' : 'text-white/60')}>z = {tip.p.z >= 0 ? '+' : ''}{tip.p.z.toFixed(2)} SD</div>
                  {tip.p.violations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tip.p.violations.map((v) => (
                        <span key={v.rule} className={cx('rounded-full px-2 py-0.5 text-[10.5px] font-semibold', v.severity === 'reject' ? 'bg-bad' : 'bg-warn')}>{v.rule}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <SidePanel page={current} capaCount={capas.filter((c) => c.analyteId === current.analyte.id && c.date.startsWith(month)).length} />
          </div>
        )
      )}
    </>
  )
}

function SidePanel({ page, capaCount }: { page: { analyte: { id: string; name: string; unit: string; decimals: number; cvLimit: number }; model: ReturnType<typeof buildLJPage> }; capaCount: number }) {
  const ws = useWorkspace()
  const lot = useActiveLot()!
  const d = page.analyte.decimals
  const violations = page.model.levels.flatMap((l) => l.points.flatMap((p) => p.violations))
  return (
    <div className="flex flex-col gap-4">
      {page.model.levels.map((l) => {
        const t = l.target
        const ins = ws.inserts.find((x) => x.lotId === lot.id && x.analyteId === page.analyte.id && x.level === l.level)
        const bias = t ? ((l.monthMean - t.mean) / t.mean) * 100 : NaN
        const over = isFinite(l.monthCv) && l.monthCv > page.analyte.cvLimit
        return (
          <Card key={l.level} data-reveal className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">Level {l.level}</span>
              <span className="text-[11.5px] text-muted">Lot {lot.levels.find((x) => x.level === l.level)?.lotNo}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-y-4">
              <Mini label="N" v={String(l.n)} />
              <Mini label="Month mean" v={fmt(l.monthMean, d)} />
              <Mini label="Month SD" v={fmt(l.monthSd, d)} />
              <Mini label="Month CV" v={`${fmt(l.monthCv, 2)}%`} tone={over ? 'bad' : undefined} />
              <Mini label="Fixed CV" v={t ? `${fmt(cv(t.sd, t.mean), 2)}%` : '—'} />
              <Mini label="Bias" v={`${fmt(bias, 2)}%`} />
            </div>
            <div className="mt-4 border-t border-line pt-3 text-[12px] text-muted">
              Target {fmt(t?.mean, d)} ± {fmt(t?.sd, d)} {page.analyte.unit}
              {t?.source === 'baseline' && t.from && <> · baseline {ddmmyyyy(t.from)}–{ddmmyyyy(t.to!)}</>}
              {ins?.low != null && <div>Insert range {fmt(ins.low, d)} – {fmt(ins.high, d)}</div>}
            </div>
          </Card>
        )
      })}
      <Card data-reveal className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold">Westgard findings</span>
          <Link to="/qc" className="text-[12px] text-accent">Open CAPA ({capaCount})</Link>
        </div>
        {violations.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">No rule violations this month.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {violations.map((v) => (
              <li key={v.runId + v.rule} className="flex items-center justify-between text-[13px]">
                <span className="num text-ink-2">{ddmmyyyy(v.date)} · L{v.level} · {v.value.toFixed(d)}</span>
                <Pill tone={v.severity === 'reject' ? 'bad' : 'warn'}>{RULES[v.rule].label}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Mini({ label, v, tone }: { label: string; v: string; tone?: 'bad' }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className={cx('num text-[17px] font-semibold tracking-[-0.02em]', tone === 'bad' && 'text-bad')}>{v}</div>
    </div>
  )
}
