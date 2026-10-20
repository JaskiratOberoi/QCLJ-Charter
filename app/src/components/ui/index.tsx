import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { forwardRef, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type Variant = 'primary' | 'ghost' | 'outline' | 'danger' | 'dark'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }>(
  function Button({ variant = 'outline', size = 'md', className, ...p }, ref) {
    return (
      <button
        ref={ref}
        {...p}
        className={cx(
          'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-[background,color,box-shadow,transform] duration-300 ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
          size === 'sm' ? 'h-8 px-3.5 text-[13px]' : 'h-10 px-5 text-sm',
          variant === 'primary' && 'bg-accent text-white shadow-[0_8px_20px_-8px_rgba(109,79,214,0.7)] hover:bg-[#5b3fc4]',
          variant === 'dark' && 'bg-ink text-white hover:bg-ink-2',
          variant === 'outline' && 'border border-line-2 bg-surface text-ink hover:border-ink/40',
          variant === 'ghost' && 'text-ink-2 hover:bg-ink/5',
          variant === 'danger' && 'border border-bad/30 bg-bad-soft text-bad hover:bg-bad hover:text-white',
          className,
        )}
      />
    )
  },
)

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...p} className={cx('rounded-2xl border border-line bg-surface', className)}>
      {children}
    </div>
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex flex-col gap-1.5', className)}>
      <span className="text-[12px] font-medium tracking-wide text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11.5px] text-faint">{hint}</span>}
    </label>
  )
}

const widthOf = (c?: string) => (c && /(^|\s)w-/.test(c) ? '' : 'w-full')

const inputCls =
  'h-10 rounded-xl border border-line-2 bg-surface px-3 text-sm text-ink outline-none transition-[border,box-shadow] duration-200 placeholder:text-faint focus:border-accent focus:shadow-[0_0_0_4px_var(--color-accent-soft)]'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} {...p} className={cx(inputCls, widthOf(className), className)} />
})

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cx(inputCls, widthOf(className), 'appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27><path d=%27M3 4.5l3 3 3-3%27 fill=%27none%27 stroke=%27%236b6f76%27 stroke-width=%271.4%27/></svg>")] bg-[right_12px_center] bg-no-repeat pr-8', className)}>
      {children}
    </select>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={cx('group inline-flex items-center gap-2.5 text-left text-sm text-ink-2', label ? 'min-w-0' : 'shrink-0')}>
      <span className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-accent' : 'bg-line-2')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ease-[var(--ease-out-expo)]', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
      </span>
      {label && <span className="min-w-0 leading-snug">{label}</span>}
    </button>
  )
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const pill = useRef<HTMLSpanElement>(null)
  useGSAP(
    () => {
      const el = ref.current?.querySelector<HTMLElement>(`[data-v="${CSS.escape(value)}"]`)
      if (!el || !pill.current) return
      gsap.to(pill.current, { x: el.offsetLeft, width: el.offsetWidth, duration: 0.5, ease: 'expo.out' })
    },
    { dependencies: [value, options.length], scope: ref },
  )
  return (
    <div ref={ref} className={cx('relative inline-flex rounded-full border border-line bg-paper p-1', className)}>
      <span ref={pill} className="absolute top-1 bottom-1 left-0 rounded-full bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_-4px_rgba(0,0,0,0.12)]" />
      {options.map((o) => (
        <button
          key={o.value}
          data-v={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx('relative z-10 h-8 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors', value === o.value ? 'text-ink' : 'text-muted hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Pill({ tone = 'neutral', children, className }: { tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'accent'; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium',
        tone === 'neutral' && 'bg-ink/5 text-ink-2',
        tone === 'ok' && 'bg-ok-soft text-ok',
        tone === 'warn' && 'bg-warn-soft text-warn',
        tone === 'bad' && 'bg-bad-soft text-bad',
        tone === 'accent' && 'bg-accent-soft text-accent',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div data-reveal className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.75rem,2.6vw,2.4rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-ink">{title}</h1>
        {sub && <p className="mt-2 max-w-3xl text-[15px] text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div data-reveal className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-2 bg-surface/60 px-6 py-16 text-center">
      <div className="mb-4 h-10 w-10 rounded-full border-2 border-dashed border-line-2" />
      <p className="text-base font-semibold text-ink">{title}</p>
      {children && <p className="mt-1.5 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Stat({ label, value, tone, sub }: { label: string; value: ReactNode; tone?: 'ok' | 'warn' | 'bad'; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <span className={cx('num text-[28px] leading-none font-semibold tracking-[-0.03em]', tone === 'ok' && 'text-ok', tone === 'warn' && 'text-warn', tone === 'bad' && 'text-bad')}>{value}</span>
      {sub && <span className="text-[12px] text-faint">{sub}</span>}
    </div>
  )
}

export function CountUp({ to, decimals = 0 }: { to: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  useGSAP(
    () => {
      if (!ref.current || !isFinite(to)) return
      const o = { v: 0 }
      gsap.to(o, {
        v: to,
        duration: 1.4,
        ease: 'expo.out',
        onUpdate: () => {
          if (ref.current) ref.current.textContent = o.v.toFixed(decimals)
        },
      })
    },
    { dependencies: [to] },
  )
  return <span ref={ref}>{isFinite(to) ? (0).toFixed(decimals) : '—'}</span>
}
