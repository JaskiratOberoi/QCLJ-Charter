import { useGSAP } from '@gsap/react'
import {
  CaretLeft, CaretRight, ChartLineUp, ListBullets, SignOut, PencilSimpleLine, ShieldWarning, SlidersHorizontal, SquaresFour, Table,
} from '@phosphor-icons/react'
import gsap from 'gsap'
import { useEffect, useMemo, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { signOut, useAuth } from '../lib/auth'
import { addMonths, monthLongLabel } from '../lib/dates'
import { lotMonths } from '../lib/stats'
import { useActiveLot, useStore, useWorkspace } from '../lib/store'
import { useUi } from '../lib/ui'
import { LabSwitcher } from './LabSwitcher'
import { cx } from './ui'

const NAV = [
  { to: '/', label: 'Overview', icon: SquaresFour },
  { to: '/charts', label: 'LJ Charts', icon: ChartLineUp },
  { to: '/reports', label: 'CV & Cumulative', icon: Table },
  { to: '/entry', label: 'Enter results', icon: PencilSimpleLine },
  { to: '/runs', label: 'Run log', icon: ListBullets },
  { to: '/qc', label: 'Westgard & CAPA', icon: ShieldWarning },
  { to: '/setup', label: 'Setup', icon: SlidersHorizontal },
]

export function Shell() {
  const loc = useLocation()
  const main = useRef<HTMLElement>(null)
  const nav = useRef<HTMLElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)
  const lots = useStore((s) => s.lots)
  const setActiveLot = useStore((s) => s.setActiveLot)
  const lot = useActiveLot()
  const ws = useWorkspace()
  const { month, setMonth, bleed } = useUi()
  const labId = useAuth((s) => s.labId)
  const months = useMemo(() => (lot ? lotMonths(ws, lot.id) : []), [ws, lot])

  // Jump to the latest month with data when the lot changes or data first arrives.
  useEffect(() => {
    if (months.length && !months.includes(month)) setMonth(months[months.length - 1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lot?.id, months.length])

  useGSAP(
    () => {
      const items = main.current?.querySelectorAll('[data-reveal]')
      if (items?.length)
        gsap.fromTo(items, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out', clearProps: 'transform' })
    },
    { dependencies: [loc.pathname], scope: main },
  )

  useGSAP(
    () => {
      const active = nav.current?.querySelector<HTMLElement>('a[aria-current="page"]')
      if (!active || !indicator.current) return
      gsap.to(indicator.current, { y: active.offsetTop, height: active.offsetHeight, opacity: 1, duration: 0.6, ease: 'expo.out' })
    },
    { dependencies: [loc.pathname] },
  )

  return (
    <div className="flex h-full">
      <aside className="grain relative hidden w-[248px] shrink-0 flex-col overflow-hidden bg-night text-white lg:flex">
        <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-accent/30 blur-[90px]" />
        <div className="relative px-6 pt-7 pb-8">
          <div className="flex items-center gap-2.5">
            <Mark />
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-[-0.02em]">Stellar Meridian</div>
              <div className="text-[11px] text-white/45">Internal quality control</div>
            </div>
          </div>
        </div>
        <nav ref={nav} className="relative flex flex-col gap-0.5 px-3">
          <span ref={indicator} className="absolute right-3 left-3 rounded-xl bg-white/[0.08] opacity-0 ring-1 ring-white/10" />
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx('relative z-10 flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] transition-colors duration-300', isActive ? 'text-white' : 'text-white/55 hover:text-white')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="relative mt-auto p-4">
          <LabSwitcher />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-paper/80 px-5 backdrop-blur-xl lg:px-10">
          <div className="flex gap-1 overflow-x-auto lg:hidden">
            {NAV.map(({ to, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cx('grid h-9 w-9 place-items-center rounded-lg', isActive ? 'bg-ink text-white' : 'text-muted')}>
                <Icon size={18} />
              </NavLink>
            ))}
          </div>
          {lots.length > 0 && (
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-[12px] text-muted">Control lot</span>
              <select
                value={lot?.id}
                onChange={(e) => setActiveLot(e.target.value)}
                className="h-9 rounded-full border border-line-2 bg-surface px-3.5 text-[13px] font-medium outline-none"
              >
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.manufacturer} · {l.levels.filter((x) => l.chartLevels.includes(x.level)).map((x) => x.lotNo).join(' / ')}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1 rounded-full border border-line-2 bg-surface p-1">
            <button className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
              <CaretLeft size={14} weight="bold" />
            </button>
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="sr-only"
              id="month-picker"
            />
            <label htmlFor="month-picker" className="num min-w-[128px] cursor-pointer text-center text-[13px] font-semibold" onClick={() => (document.getElementById('month-picker') as HTMLInputElement)?.showPicker?.()}>
              {monthLongLabel(month)}
            </label>
            <button className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
              <CaretRight size={14} weight="bold" />
            </button>
          </div>
          <button
            onClick={() => { if (confirm('Sign out of Stellar Meridian on this browser? Results you entered stay saved here.')) signOut() }}
            className="grid h-9 w-9 place-items-center rounded-full border border-line-2 bg-surface text-muted transition-colors hover:border-ink/40 hover:text-ink"
            aria-label={labId ? `Sign out (${labId})` : 'Sign out'}
            title={labId ? `Signed in as ${labId} · Sign out` : 'Sign out'}
          >
            <SignOut size={16} />
          </button>
        </header>
        <main ref={main} className="scroll-thin min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {bleed ? (
            <Outlet />
          ) : (
            <div className="mx-auto w-full max-w-[1400px] px-5 py-10 lg:px-10">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export function Mark({ size = 30 }: { size?: number }) {
  // Meridian: a star plotted on the mean line, inside its ±2 SD limits.
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none">
      <rect width="30" height="30" rx="9" fill="#0f766e" />
      <path d="M6 9.6h18M6 20.4h18" stroke="#fff" strokeOpacity={0.38} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 15h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 8.6l1.75 4.65L21.4 15l-4.65 1.75L15 21.4l-1.75-4.65L8.6 15l4.65-1.75z" fill="#fff" />
    </svg>
  )
}
