import { useGSAP } from '@gsap/react'
import { ArrowRight, ChartLineUp, FilePdf, ShieldCheck } from '@phosphor-icons/react'
import gsap from 'gsap'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CountUp, Pill, cx } from '../components/ui'
import { daysBetween, daysInMonth, ddmmyyyy, iso, monthLongLabel, parts, todayISO } from '../lib/dates'
import { excludedSet, getTarget, monthSummary, seriesRuns } from '../lib/stats'
import { activeLabId, DEFAULT_LAB } from '../lib/labs'
import { loadLabData, useActiveLot, useStore, useWorkspace } from '../lib/store'
import { useUi } from '../lib/ui'
import { evaluateLot, type Violation } from '../lib/westgard'

export function OverviewPage() {
  const ws = useWorkspace()
  const lot = useActiveLot()
  if (!lot || !ws.runs.length) return <Welcome />
  return <Dashboard />
}

function Welcome() {
  const ref = useRef<HTMLDivElement>(null)
  const lab = useStore((s) => s.lab)
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const setBleed = useUi((s) => s.setBleed)
  useEffect(() => {
    setBleed(true)
    return () => setBleed(false)
  }, [setBleed])
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('[data-w="line"]', { yPercent: 110, duration: 1.2, stagger: 0.1 })
        .from('[data-w="fade"]', { opacity: 0, y: 20, duration: 1, stagger: 0.08 }, 0.4)
      const path = ref.current!.querySelector<SVGPathElement>('[data-w="trace"]')!
      const len = path.getTotalLength()
      gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 3.2, ease: 'power2.inOut', delay: 0.3 })
      gsap.from('[data-w="dot"]', { scale: 0, transformOrigin: 'center', duration: 0.5, stagger: 0.06, ease: 'back.out(3)', delay: 1 })
      gsap.from('[data-w="band"]', { scaleX: 0, transformOrigin: 'left', duration: 1.6, stagger: 0.08, ease: 'expo.inOut' })
    },
    { scope: ref },
  )
  const pts = useMemo(() => {
    let seed = 7
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
    return Array.from({ length: 31 }, (_, i) => {
      const z = i === 18 ? 2.45 : (rnd() - 0.5) * 2.6
      return { x: 40 + i * 37.4, y: 200 - z * 46, out: Math.abs(z) > 2 }
    })
  }, [])

  return (
    <div ref={ref}>
      <section className="grain relative overflow-hidden bg-night px-6 pt-28 pb-16 text-white lg:px-16">
        <div className="pointer-events-none absolute -top-40 left-1/3 h-[520px] w-[720px] rounded-full bg-accent/25 blur-[140px]" />
        <svg viewBox="0 0 1200 400" className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] w-full opacity-80" preserveAspectRatio="xMidYMid slice">
          {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
            <line key={k} data-w="band" x1={0} x2={1200} y1={200 - k * 46} y2={200 - k * 46} stroke={k === 0 ? '#ffffff55' : Math.abs(k) === 3 ? '#e5393566' : Math.abs(k) === 2 ? '#fbc02d55' : '#66bb6a44'} strokeWidth={k === 0 ? 1.2 : 1} strokeDasharray={k === 0 ? undefined : '4 5'} />
          ))}
          <path data-w="trace" d={`M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`} fill="none" stroke="#5b8cff" strokeWidth={2.2} strokeLinejoin="round" />
          {pts.map((p, i) => <circle key={i} data-w="dot" cx={p.x} cy={p.y} r={p.out ? 6 : 4} fill={p.out ? '#ef9a9a' : '#81c784'} stroke={p.out ? '#c62828' : '#43a047'} strokeWidth={1.4} />)}
        </svg>
        <div className="relative mx-auto max-w-7xl">
          <h1 className="text-[clamp(2.4rem,4.6vw,5rem)] leading-[0.98] font-semibold tracking-[-0.045em]">
            <span className="block overflow-hidden"><span data-w="line" className="block">Levey-Jennings charts,</span></span>
            <span className="block overflow-hidden"><span data-w="line" className="block text-white/45">straight from the analyser printout.</span></span>
          </h1>
          <p data-w="fade" className="mt-7 max-w-2xl text-[17px] leading-relaxed text-white/60">
            Drop your instrument's result PDFs or type results in. QCLJ Studio files them by control lot and level, applies Westgard multirules and prints signed-ready LJ, CV and cumulative reports on A4.
          </p>
          <div data-w="fade" className="mt-10 flex flex-wrap gap-3">
            {activeLabId() === DEFAULT_LAB.id ? (
              <>
                <Button variant="primary" className="h-12 px-7 text-[15px]" disabled={busy} onClick={async () => { setBusy(true); await loadLabData(); setBusy(false) }}>
                  {busy ? 'Loading…' : 'Load Noble Diagnostic Centre record'} <ArrowRight size={16} weight="bold" />
                </Button>
                <Button className="h-12 border-white/20 bg-white/5 px-7 text-[15px] text-white hover:border-white/50" onClick={() => nav('/setup')}>
                  Set up from scratch
                </Button>
              </>
            ) : (
              <Button variant="primary" className="h-12 px-7 text-[15px]" onClick={() => nav('/setup')}>
                Set up {lab.organization || 'this lab'} <ArrowRight size={16} weight="bold" />
              </Button>
            )}
          </div>
          <div className="h-56" />
        </div>
      </section>
      <section className="grid gap-px bg-line md:grid-cols-3">
        {[
          { icon: FilePdf, t: 'Reads the printout', d: 'Maglumi Sample Result Reports parse column by column. Sample IDs map to levels, assay codes to tests, repeats supersede failed runs.' },
          { icon: ShieldCheck, t: 'Westgard, every run', d: '1-2s, 1-3s, 2-2s, R-4s, 4-1s and 10x across runs and levels, with a corrective-action record printed for each.' },
          { icon: ChartLineUp, t: 'Print-ready A4 reports', d: 'Every LJ page is laid out in A4 points, with ±1, 2 and 3 SD limits, colour-coded badges and the full lab, lot and instrument header.' },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} data-w="fade" className="bg-paper px-8 py-12 lg:px-14">
            <Icon size={26} className="text-accent" />
            <div className="mt-5 text-lg font-semibold tracking-[-0.02em]">{t}</div>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

function Dashboard() {
  const ws = useWorkspace()
  const lot = useActiveLot()!
  const month = useUi((s) => s.month)
  const nav = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  const violations = useMemo(() => evaluateLot(ws, lot.id), [ws, lot.id])
  const monthV = violations.filter((v) => v.date.startsWith(month))
  const ex = useMemo(() => excludedSet(ws), [ws])
  const monthRuns = ws.runs.filter((r) => r.lotId === lot.id && r.date.startsWith(month) && !r.rejected && !ex.has(r.date))
  const rejectRuns = new Set(monthV.filter((v) => v.severity === 'reject').map((v) => v.runId))
  const warnRuns = new Set(monthV.filter((v) => v.severity === 'warning').map((v) => v.runId))
  const inControl = monthRuns.length ? ((monthRuns.length - rejectRuns.size) / monthRuns.length) * 100 : NaN
  const cvOver = ws.analytes.reduce((n, a) => n + lot.chartLevels.filter((l) => monthSummary(ws, lot.id, a.id, l, month).cv > a.cvLimit).length, 0)
  const expiry = lot.levels.filter((l) => lot.chartLevels.includes(l.level)).map((l) => l.expiry).sort()[0]
  const daysLeft = expiry ? daysBetween(todayISO(), expiry) : NaN

  useGSAP(
    () => {
      // fromTo with explicit end values: this effect re-runs when the lot hydrates, and a second gsap.from would
      // capture the half-faded tiles as its destination and leave them stuck at low opacity.
      gsap.fromTo('[data-tile]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out', delay: 0.15, overwrite: 'auto', clearProps: 'opacity,transform' })
      ref.current!.querySelectorAll<SVGPolylineElement>('[data-spark]').forEach((pl, i) => {
        const len = pl.getTotalLength()
        gsap.fromTo(pl, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, delay: 0.3 + i * 0.04, ease: 'power2.out' })
      })
      gsap.fromTo('[data-cal]', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, stagger: { each: 0.012, from: 'start' }, ease: 'back.out(2)', delay: 0.2, overwrite: 'auto', clearProps: 'opacity,transform' })
    },
    { scope: ref, dependencies: [month, lot.id] },
  )

  return (
    <div ref={ref}>
      <div data-reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[13px] text-muted">{ws.lab.organization}{ws.lab.branch ? ` · ${ws.lab.branch}` : ''}</div>
          <h1 className="mt-1 text-[clamp(1.9rem,3vw,2.8rem)] leading-[1.02] font-semibold tracking-[-0.04em]">
            {monthLongLabel(month)} <span className="text-faint">at a glance</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to="/entry"><Button>Enter results</Button></Link>
          <Link to="/charts"><Button variant="dark">Open LJ charts <ArrowRight size={15} /></Button></Link>
        </div>
      </div>

      <div data-reveal className="grain relative mb-6 overflow-hidden rounded-3xl bg-night p-7 text-white lg:p-9">
        <div className="pointer-events-none absolute -right-20 -bottom-32 h-80 w-[500px] rounded-full bg-accent/30 blur-[100px]" />
        <div className="relative grid grid-cols-2 gap-8 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Results charted" value={<CountUp to={monthRuns.length} />} />
          <Kpi label="Runs in control" value={<><CountUp to={inControl} decimals={1} />%</>} tone={inControl < 95 ? 'warn' : 'ok'} />
          <Kpi label="Rejection findings" value={<CountUp to={rejectRuns.size} />} tone={rejectRuns.size ? 'bad' : 'ok'} />
          <Kpi label="1-2s warnings" value={<CountUp to={warnRuns.size} />} tone={warnRuns.size ? 'warn' : undefined} />
          <Kpi label="CV above limit" value={<CountUp to={cvOver} />} tone={cvOver ? 'bad' : 'ok'} />
          <Kpi label="Lot expires in" value={<><CountUp to={daysLeft} /> <span className="text-base font-normal text-white/50">days</span></>} tone={daysLeft < 60 ? 'warn' : undefined} sub={expiry && ddmmyyyy(expiry)} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {ws.analytes.map((a) => {
            const vs = monthV.filter((v) => v.analyteId === a.id)
            const hasRuns = lot.chartLevels.some((l) => monthSummary(ws, lot.id, a.id, l, month).n > 0)
            const tone = vs.some((v) => v.severity === 'reject') ? 'bad' : vs.length ? 'warn' : hasRuns ? 'ok' : 'neutral'
            return (
              <Card key={a.id} data-tile className="group cursor-pointer p-5 transition-[transform,box-shadow] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.25)]" onClick={() => nav('/charts', { state: { analyte: a.id } })}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[15px] font-semibold tracking-[-0.01em]">{a.name}</div>
                    <div className="text-[12px] text-faint">{a.unit}</div>
                  </div>
                  <Pill tone={tone}>{tone === 'ok' ? 'In control' : tone === 'bad' ? 'Reject' : tone === 'warn' ? 'Warning' : 'No results'}</Pill>
                </div>
                <Spark ws={ws} lotId={lot.id} analyteId={a.id} levels={lot.chartLevels} month={month} />
                <div className="mt-3 flex gap-5 text-[12px]">
                  {lot.chartLevels.map((l) => {
                    const s = monthSummary(ws, lot.id, a.id, l, month)
                    return (
                      <span key={l} className="num text-muted">
                        L{l} CV <b className={cx('font-semibold', s.cv > a.cvLimit ? 'text-bad' : 'text-ink')}>{isFinite(s.cv) ? s.cv.toFixed(2) : '—'}%</b>
                      </span>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>

        <div className="flex flex-col gap-6">
          <Card data-reveal className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">Run calendar</span>
              <span className="text-[11.5px] text-muted">results per day</span>
            </div>
            <Calendar month={month} lotId={lot.id} violations={monthV} />
          </Card>
          <Card data-reveal className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Latest findings</span>
              <Link to="/qc" className="text-[12px] text-accent">All findings</Link>
            </div>
            {monthV.length === 0 ? (
              <p className="text-[13px] text-muted">No Westgard findings this month.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {[...monthV].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 7).map((v) => (
                  <li key={v.runId + v.rule} className="flex items-center gap-3 text-[13px]">
                    <span className={cx('h-2 w-2 shrink-0 rounded-full', v.severity === 'reject' ? 'bg-bad' : 'bg-warn')} />
                    <span className="num w-20 text-muted">{ddmmyyyy(v.date).slice(0, 5)}</span>
                    <span className="flex-1 truncate font-medium">{ws.analytes.find((a) => a.id === v.analyteId)?.name} L{v.level}</span>
                    <span className="num text-muted">{v.z >= 0 ? '+' : ''}{v.z.toFixed(2)}</span>
                    <Pill tone={v.severity === 'reject' ? 'bad' : 'warn'} className="h-5">{v.rule}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, tone, sub }: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'bad'; sub?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] text-white/50">{label}</div>
      <div className={cx('num mt-2 text-[34px] leading-none font-semibold tracking-[-0.04em]', tone === 'ok' && 'text-[#7ee2a8]', tone === 'warn' && 'text-[#ffd166]', tone === 'bad' && 'text-[#ff8a80]')}>{value}</div>
      {sub && <div className="mt-1.5 text-[11.5px] text-white/40">{sub}</div>}
    </div>
  )
}

const LEVEL_COLORS = ['#1e88e5', '#8e24aa', '#00897b', '#f4511e']

function Spark({ ws, lotId, analyteId, levels, month }: { ws: ReturnType<typeof useWorkspace>; lotId: string; analyteId: string; levels: number[]; month: string }) {
  const W = 300
  const H = 74
  const z2y = (z: number) => H / 2 - (Math.max(-3.5, Math.min(3.5, z)) * H) / 7
  const n = daysInMonth(month)
  const ex = excludedSet(ws)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-[74px] w-full overflow-visible">
      {[2, -2].map((k) => <line key={k} x1={0} x2={W} y1={z2y(k)} y2={z2y(k)} stroke="#fbc02d" strokeWidth={0.8} strokeDasharray="2 3" />)}
      {[3, -3].map((k) => <line key={k} x1={0} x2={W} y1={z2y(k)} y2={z2y(k)} stroke="#e53935" strokeWidth={0.8} strokeDasharray="2 3" opacity={0.6} />)}
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="#121417" strokeWidth={0.8} opacity={0.5} />
      {levels.map((l, li) => {
        const t = getTarget(ws, lotId, analyteId, l)
        if (!t) return null
        const pts = seriesRuns(ws, lotId, analyteId, l).filter((r) => r.date.startsWith(month) && !ex.has(r.date))
        const xy = pts.map((r) => [((parts(r.date).d - 1) / (n - 1)) * W, z2y((r.value - t.mean) / t.sd), (r.value - t.mean) / t.sd] as const)
        return (
          <g key={l}>
            {xy.length > 1 && <polyline data-spark points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={LEVEL_COLORS[li % 4]} strokeWidth={1.4} strokeLinejoin="round" opacity={0.85} />}
            {xy.filter(([, , z]) => Math.abs(z) > 2).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill="#ef9a9a" stroke="#c62828" strokeWidth={1} />)}
          </g>
        )
      })}
    </svg>
  )
}

function Calendar({ month, lotId, violations }: { month: string; lotId: string; violations: Violation[] }) {
  const ws = useWorkspace()
  const n = daysInMonth(month)
  const { y, m } = parts(`${month}-01`)
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const counts = new Map<string, number>()
  for (const r of ws.runs) if (r.lotId === lotId && r.date.startsWith(month) && !r.rejected) counts.set(r.date, (counts.get(r.date) ?? 0) + 1)
  const ex = new Map(ws.exclusions.map((e) => [e.date, e.reason]))
  const bad = new Set(violations.filter((v) => v.severity === 'reject').map((v) => v.date))
  const warn = new Set(violations.map((v) => v.date))
  const max = Math.max(1, ...counts.values())
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[10.5px] text-faint">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
        {Array.from({ length: n }, (_, i) => {
          const d = iso(y, m, i + 1)
          const c = counts.get(d) ?? 0
          const reason = ex.get(d)
          return (
            <div
              key={d}
              data-cal
              title={`${ddmmyyyy(d)} · ${c} results${reason ? ` · excluded (${reason})` : ''}`}
              className={cx('relative grid aspect-square place-items-center rounded-lg text-[11px] font-medium', reason ? 'bg-paper text-faint line-through' : c ? 'text-white' : 'bg-paper text-faint')}
              style={!reason && c ? { background: `rgba(47,91,255,${0.25 + 0.75 * (c / max)})` } : undefined}
            >
              {i + 1}
              {!reason && (bad.has(d) || warn.has(d)) && <span className={cx('absolute top-1 right-1 h-1.5 w-1.5 rounded-full ring-2 ring-white', bad.has(d) ? 'bg-bad' : 'bg-warn')} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
