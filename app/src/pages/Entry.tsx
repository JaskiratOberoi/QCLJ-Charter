import { useGSAP } from '@gsap/react'
import { CheckCircle } from '@phosphor-icons/react'
import gsap from 'gsap'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, PageHeader, Segmented } from '../components/ui'
import { useActiveLot, useStore } from '../lib/store'
import { ManualEntry } from './entry/ManualEntry'
import { PasteImport } from './entry/PasteImport'
import { PdfImport } from './entry/PdfImport'

type Tab = 'pdf' | 'paste' | 'manual'

export function EntryPage() {
  const lot = useActiveLot()
  const analytes = useStore((s) => s.analytes)
  const [tab, setTab] = useState<Tab>('pdf')
  const [toast, setToast] = useState('')
  const toastRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!toast || !toastRef.current) return
    gsap.timeline()
      .fromTo(toastRef.current, { y: 30, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' })
      .to(toastRef.current, { y: 20, opacity: 0, duration: 0.4, delay: 3.2, onComplete: () => setToast('') })
  }, { dependencies: [toast] })

  if (!lot)
    return <Empty title="Set up a control lot first" action={<Link to="/setup"><Button variant="primary">Open setup</Button></Link>}>Results are filed against a control lot and level.</Empty>

  return (
    <>
      <PageHeader
        title="Enter results"
        sub="Import the instrument's printed result PDFs, paste a table, or type values in. Every value is checked against its fixed target as you go."
      />
      <div data-reveal className="mb-6">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pdf', label: 'Instrument PDF' },
            { value: 'paste', label: 'Paste / CSV' },
            { value: 'manual', label: 'Manual entry' },
          ]}
        />
      </div>
      <div data-reveal key={tab}>
        {tab === 'pdf' && <PdfImport onDone={(m) => m && setToast(m)} />}
        {tab === 'paste' && <PasteImport onDone={(m) => m && setToast(m)} />}
        {tab === 'manual' && (analytes.length ? <ManualEntry onDone={(m) => m && setToast(m)} /> : <Empty title="No tests yet">Import a PDF to create tests automatically, or add them in Setup.</Empty>)}
      </div>
      {toast && (
        <div ref={toastRef} className="fixed right-8 bottom-8 z-50 flex items-center gap-3 rounded-2xl bg-night px-5 py-4 text-sm text-white shadow-2xl">
          <CheckCircle size={20} weight="fill" className="text-[#5ee39b]" /> {toast}
          <Link to="/charts" className="ml-2 text-[#9fb4ff]">View charts</Link>
        </div>
      )}
    </>
  )
}
