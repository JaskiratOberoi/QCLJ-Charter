import { useGSAP } from '@gsap/react'
import { CaretUpDown, Check, Database, Plus } from '@phosphor-icons/react'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { activeLabId, addLab, DEFAULT_LAB, listLabs, switchLab } from '../lib/labs'
import { useStore } from '../lib/store'
import { cx } from './ui'

export function LabSwitcher() {
  const lab = useStore((s) => s.lab)
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const labs = listLabs()
  const current = activeLabId()

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  useGSAP(
    () => {
      if (!open || !panel.current) return
      gsap.fromTo(panel.current, { opacity: 0, y: 10, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'expo.out', transformOrigin: 'bottom center' })
      gsap.from(panel.current.querySelectorAll('[data-lab]'), { opacity: 0, x: -8, duration: 0.4, stagger: 0.04, ease: 'expo.out', delay: 0.05 })
    },
    { dependencies: [open] },
  )

  const submit = () => {
    if (name.trim()) addLab(name)
  }

  return (
    <div ref={root} className="relative">
      {open && (
        <div ref={panel} className="absolute right-0 bottom-full left-0 mb-2 rounded-2xl bg-[#161a24] p-1.5 shadow-2xl ring-1 ring-white/10">
          <div className="px-2.5 pt-1.5 pb-1 text-[10.5px] font-medium tracking-[0.08em] text-white/35 uppercase">Labs</div>
          {labs.map((l) => (
            <button
              key={l.id}
              data-lab
              onClick={() => (l.id === current ? setOpen(false) : switchLab(l.id))}
              className={cx('flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors', l.id === current ? 'bg-white/[0.07] text-white' : 'text-white/65 hover:bg-white/[0.05] hover:text-white')}
            >
              <span className="min-w-0 flex-1 truncate">{l.name}</span>
              {l.id === DEFAULT_LAB.id && <span className="text-[10.5px] text-white/35">Default</span>}
              {l.id === current && <Check size={14} weight="bold" className="text-accent" />}
            </button>
          ))}
          <div className="my-1 h-px bg-white/10" />
          {adding ? (
            <form data-lab className="flex gap-1.5 p-1" onSubmit={(e) => { e.preventDefault(); submit() }}>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lab name"
                className="h-9 min-w-0 flex-1 rounded-lg bg-white/[0.06] px-2.5 text-[13px] text-white ring-1 ring-white/10 outline-none placeholder:text-white/30 focus:ring-accent"
              />
              <button type="submit" disabled={!name.trim()} className="h-9 rounded-lg bg-accent px-3 text-[12.5px] font-medium text-white disabled:opacity-40">Add</button>
            </form>
          ) : (
            <button data-lab onClick={() => setAdding(true)} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] text-white/65 hover:bg-white/[0.05] hover:text-white">
              <Plus size={14} /> Onboard another lab
            </button>
          )}
        </div>
      )}
      <button
        onClick={() => { setOpen((o) => !o); setAdding(false); setName('') }}
        className="w-full rounded-2xl bg-white/[0.05] p-4 text-left ring-1 ring-white/10 transition-colors hover:bg-white/[0.08]"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 text-[11px] text-white/45">
          <Database size={13} /> Stored locally in this browser
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">{lab.organization || 'No lab profile yet'}</div>
            <div className="truncate text-[12px] text-white/45">{lab.branch || (labs.length > 1 ? `${labs.length} labs` : '')}</div>
          </div>
          <CaretUpDown size={15} className="shrink-0 text-white/45" />
        </div>
      </button>
    </div>
  )
}
