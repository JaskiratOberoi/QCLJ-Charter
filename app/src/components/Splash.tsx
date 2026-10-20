import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRef } from 'react'

const SPLASH_KEY = 'zq-splash-seen'

/** True once per browser tab session, so the splash plays on open and not on every reload. */
export const shouldShowSplash = () => {
  try {
    return !sessionStorage.getItem(SPLASH_KEY)
  } catch {
    return true
  }
}

const markSeen = () => {
  try {
    sessionStorage.setItem(SPLASH_KEY, '1')
  } catch {
    /* storage unavailable */
  }
}

// Arc geometry shared by the splash and the login hero: a horizon with a star rising to its zenith.
const CX = 160
const CY = 150
const R = 92
const ARC_LEN = Math.PI * R

/**
 * Opening screen: the star climbs its arc to the zenith while the name settles beneath it.
 * Honours reduced motion with a short fade only.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const finish = () => {
        markSeen()
        onDone()
      }
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: finish })
      if (reduce) {
        tl.to(root.current, { opacity: 0, duration: 0.4, delay: 0.9 })
        return
      }
      const star = root.current!.querySelector<SVGGElement>('[data-s="star"]')!
      const pos = { a: Math.PI } // angle on the arc: π = left horizon, π/2 = zenith
      const place = () => {
        const x = CX + R * Math.cos(pos.a)
        const y = CY - R * Math.sin(pos.a)
        star.setAttribute('transform', `translate(${x} ${y}) rotate(${(Math.PI - pos.a) * 40}) scale(${0.55 + (Math.PI - pos.a) * 0.3})`)
      }
      place()
      tl.from('[data-s="glow"]', { scale: 0.5, opacity: 0, duration: 1.6, stagger: 0.12 }, 0)
        .from('[data-s="horizon"]', { scaleX: 0, transformOrigin: 'center', duration: 1 }, 0.1)
        .fromTo('[data-s="arc"]', { strokeDashoffset: ARC_LEN }, { strokeDashoffset: ARC_LEN / 2, duration: 1.3, ease: 'power2.inOut' }, 0.35)
        .to(pos, { a: Math.PI / 2, duration: 1.3, ease: 'power2.inOut', onUpdate: place }, 0.35)
        .from('[data-s="star"]', { opacity: 0, duration: 0.4 }, 0.35)
        .from('[data-s="flare"]', { scale: 0, opacity: 0, transformOrigin: 'center', duration: 0.9, ease: 'back.out(2)' }, 1.5)
        .to('[data-s="flare"]', { opacity: 0, scale: 1.6, duration: 0.8, ease: 'power2.out' }, 1.9)
        .from('[data-s="letter"]', { yPercent: 120, opacity: 0, duration: 0.9, stagger: 0.045 }, 1.25)
        .from('[data-s="tag"]', { opacity: 0, y: 10, duration: 0.8 }, 1.75)
        .from('[data-s="by"]', { opacity: 0, duration: 0.6 }, 2.0)
        .to(root.current, { opacity: 0, scale: 1.02, duration: 0.7, ease: 'power2.inOut' }, 3.1)
    },
    { scope: root },
  )

  return (
    <div ref={root} className="grain fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-night text-white" aria-label="Zenith-Q is opening" role="status">
      <div data-s="glow" className="pointer-events-none absolute top-1/2 left-1/2 h-[56vmin] w-[56vmin] -translate-x-1/2 -translate-y-[62%] rounded-full bg-accent/35 blur-[90px]" />
      <div data-s="glow" className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#8f6bff]/20 blur-[110px]" />
      <div data-s="glow" className="pointer-events-none absolute -top-24 -right-32 h-80 w-80 rounded-full bg-[#8f6bff]/15 blur-[100px]" />
      <ZenithArc className="relative w-[min(72vw,340px)]" animated />
      <div className="relative mt-2 flex items-baseline overflow-hidden text-[clamp(40px,8vw,64px)] leading-[1.05] font-semibold tracking-[-0.035em]">
        {'Zenith-Q'.split('').map((ch, i) => (
          <span key={i} data-s="letter" className={ch === 'Q' ? 'inline-block text-[#8f6bff]' : 'inline-block'}>
            {ch}
          </span>
        ))}
      </div>
      <div data-s="tag" className="relative mt-3 text-[13px] font-medium tracking-[0.22em] text-white/60 uppercase">
        Elevating laboratory quality
      </div>
      <div data-s="by" className="absolute bottom-8 text-[11px] tracking-[0.08em] text-white/35 uppercase">
        Stellar Infomatica
      </div>
    </div>
  )
}

/** The zenith figure: horizon, arc and star. `animated` leaves the star for the splash timeline to place. */
export function ZenithArc({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 320 190" className={className} fill="none" aria-hidden="true">
      <line data-s="horizon" x1={40} y1={CY} x2={280} y2={CY} stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
      <path
        data-s="arc"
        d={`M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY}`}
        stroke="#fff"
        strokeOpacity={0.35}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeDasharray={ARC_LEN}
        strokeDashoffset={animated ? ARC_LEN : ARC_LEN / 2}
      />
      <circle data-s="flare" cx={CX} cy={CY - R} r={26} fill="#8f6bff" fillOpacity={0.35} style={animated ? undefined : { display: 'none' }} />
      <g data-s="star" transform={animated ? undefined : `translate(${CX} ${CY - R}) scale(1.02)`}>
        <path d="M0-19l5 13.8L18.8 0 5 5 0 19-5 5-18.8 0-5-5z" fill="#fff" />
        <circle r={3.2} fill="#8f6bff" />
      </g>
    </svg>
  )
}
