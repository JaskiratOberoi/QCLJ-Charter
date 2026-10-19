import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface PrintPage {
  key: string
  landscape?: boolean
  node: ReactNode
}

const Ctx = createContext<(pages: PrintPage[], title?: string) => void>(() => {})

/** Renders pages into #print-root (outside the app shell) and opens the browser print dialog. */
export function PrintProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<{ pages: PrintPage[]; title?: string } | null>(null)
  const root = typeof document !== 'undefined' ? ensureRoot() : null

  useEffect(() => {
    if (!job) return
    const prev = document.title
    if (job.title) document.title = job.title
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        window.print()
        document.title = prev
        setJob(null)
      }),
    )
    return () => cancelAnimationFrame(id)
  }, [job])

  const print = useCallback((pages: PrintPage[], title?: string) => setJob({ pages, title }), [])

  return (
    <Ctx.Provider value={print}>
      {children}
      {root &&
        job &&
        createPortal(
          job.pages.map((p) => (
            <div key={p.key} className={p.landscape ? 'print-page landscape' : 'print-page'}>
              {p.node}
            </div>
          )),
          root,
        )}
    </Ctx.Provider>
  )
}

function ensureRoot() {
  let el = document.getElementById('print-root')
  if (!el) {
    el = document.createElement('div')
    el.id = 'print-root'
    document.body.appendChild(el)
  }
  return el
}

export const usePrint = () => useContext(Ctx)
