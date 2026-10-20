import { useGSAP } from '@gsap/react'
import { ArrowRight } from '@phosphor-icons/react'
import gsap from 'gsap'
import { useRef, useState, type FormEvent } from 'react'
import { Mark } from '../components/Shell'
import { ZenithArc } from '../components/Splash'
import { Button, Field, Input } from '../components/ui'
import { signIn } from '../lib/auth'
import { ensureSeeded } from '../lib/store'

export function LoginPage() {
  const root = useRef<HTMLDivElement>(null)
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useGSAP(
    () => {
      gsap.fromTo('[data-in]', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, ease: 'expo.out', clearProps: 'opacity,transform' })
    },
    { scope: root },
  )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const err = await signIn(id, password)
    if (err) {
      setError(err)
      setBusy(false)
      gsap.fromTo('[data-shake]', { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' })
      return
    }
    await ensureSeeded().catch(() => undefined)
    setBusy(false)
  }

  return (
    <div ref={root} className="flex h-full">
      <aside className="grain relative hidden w-[46%] flex-col justify-between overflow-hidden bg-night p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-accent/35 blur-[110px]" />
        <div className="pointer-events-none absolute -right-24 -bottom-32 h-80 w-80 rounded-full bg-[#8f6bff]/20 blur-[100px]" />
        <div data-in className="relative flex items-center gap-2.5">
          <Mark />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-[-0.02em]">Zenith-Q</div>
            <div className="text-[11px] text-white/45">Elevating laboratory quality</div>
          </div>
        </div>
        <div className="relative">
          <div data-in>
            <ZenithArc className="mb-6 w-[220px] opacity-90" />
          </div>
          <h1 data-in className="text-[44px] leading-[1.02] font-semibold tracking-[-0.03em]">
            Elevating
            <br />
            <span className="text-white/45">laboratory quality.</span>
          </h1>
          <p data-in className="mt-5 max-w-sm text-[14px] leading-relaxed text-white/55">
            Daily controls, Westgard rules, monthly CV and CAPA for your analysers. Sign in with your lab ID to open the lab's record.
          </p>
        </div>
        <div data-in className="relative text-[11px] text-white/35">© Stellar Infomatica · Zenith-Q</div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-[380px]" aria-busy={busy}>
          <div data-in className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Mark size={26} />
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-[-0.02em]">Zenith-Q</div>
              <div className="text-[12px] text-muted">Elevating laboratory quality</div>
            </div>
          </div>
          <h2 data-in className="text-[28px] font-semibold tracking-[-0.025em]">Sign in</h2>
          <p data-in className="mt-1.5 text-[13.5px] text-muted">Use the lab ID and password issued for your laboratory.</p>

          <div data-shake className="mt-8 flex flex-col gap-4">
            <Field label="Lab ID">
              <Input data-in value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus required placeholder="e.g. noble" />
            </Field>
            <Field label="Password">
              <Input data-in type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </Field>
            {error && (
              <div role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-[13px] text-bad">
                {error}
              </div>
            )}
          </div>

          <Button data-in type="submit" variant="primary" className="mt-6 h-11 w-full text-[14.5px]" disabled={busy || !id.trim() || !password}>
            {busy ? 'Signing in…' : 'Open workspace'}
            {!busy && <ArrowRight size={16} weight="bold" />}
          </Button>
          <p data-in className="mt-6 text-center text-[11.5px] leading-relaxed text-faint">
            Results you enter stay in this browser. The lab record is fetched from your lab's server after sign-in.
          </p>
        </form>
      </main>
    </div>
  )
}
