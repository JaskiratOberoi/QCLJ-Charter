import { useGSAP } from '@gsap/react'
import { FilePdf, UploadSimple } from '@phosphor-icons/react'
import gsap from 'gsap'
import { useRef, useState } from 'react'
import { Card, cx } from '../../components/ui'
import type { ParseReport } from '../../lib/parsers/pdf'
import { StagedImport, type StagedRow } from './StagedImport'

export function PdfImport({ onDone }: { onDone: (msg: string) => void }) {
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState<{ done: number; total: number; name: string } | null>(null)
  const [reports, setReports] = useState<ParseReport[]>([])
  const bar = useRef<HTMLDivElement>(null)
  const zone = useRef<HTMLLabelElement>(null)

  useGSAP(() => {
    if (busy && bar.current) gsap.to(bar.current, { scaleX: busy.done / busy.total, duration: 0.5, ease: 'power3.out' })
  }, { dependencies: [busy?.done] })

  useGSAP(() => {
    if (!zone.current) return
    gsap.to(zone.current.querySelector('[data-float]'), { y: -6, duration: 1.6, repeat: -1, yoyo: true, ease: 'sine.inOut' })
  }, { scope: zone })

  const handle = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (!list.length) return
    const { parseResultPdf } = await import('../../lib/parsers/pdf')
    const out: ParseReport[] = []
    for (let i = 0; i < list.length; i++) {
      setBusy({ done: i, total: list.length, name: list[i].name })
      try {
        out.push(await parseResultPdf(list[i]))
      } catch (e) {
        out.push({ file: list[i].name, pages: 0, results: [], warnings: [`Could not open: ${(e as Error).message}`] })
      }
    }
    setBusy({ done: list.length, total: list.length, name: '' })
    setTimeout(() => setBusy(null), 400)
    setReports(out)
  }

  const rows: StagedRow[] = reports.flatMap((r) =>
    r.results.map((x) => ({
      assay: x.assay, sampleId: x.sampleId, date: x.date, time: x.time, value: x.value, rlu: x.rlu, unit: x.unit, file: x.file, flag: [x.qualifier, x.flag].filter(Boolean).join(' '),
    })),
  )
  const warnings = reports.flatMap((r) => r.warnings)

  if (rows.length)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 text-[13px] text-muted">
          {reports.map((r) => (
            <span key={r.file} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 ring-1 ring-line">
              <FilePdf size={14} className="text-bad" /> {r.file} · {r.pages} pages · {r.results.length} results
            </span>
          ))}
        </div>
        {warnings.length > 0 && <div className="rounded-xl bg-warn-soft px-4 py-3 text-[12.5px] text-warn">{warnings.slice(0, 6).join(' · ')}{warnings.length > 6 && ` · +${warnings.length - 6} more`}</div>}
        <StagedImport rows={rows} source="pdf" onDone={(m) => { setReports([]); onDone(m) }} />
      </div>
    )

  return (
    <Card className="p-2">
      <label
        ref={zone}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files) }}
        className={cx(
          'relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-6 py-20 text-center transition-colors duration-300',
          drag ? 'border-accent bg-accent-soft' : 'border-line-2 hover:border-ink/30',
        )}
      >
        <input type="file" accept="application/pdf" multiple className="sr-only" onChange={(e) => e.target.files && handle(e.target.files)} />
        <div data-float className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-ink text-white shadow-[0_18px_30px_-12px_rgba(0,0,0,0.5)]">
          <UploadSimple size={24} weight="bold" />
        </div>
        <div className="text-lg font-semibold tracking-[-0.02em]">Drop instrument result PDFs</div>
        <p className="mt-1.5 max-w-md text-sm text-muted">
          Sample Result Reports (Snibe Maglumi and similar column layouts). Drop a whole month, both levels at once. Nothing leaves your browser.
        </p>
        {busy && (
          <div className="absolute inset-x-10 bottom-8">
            <div className="mb-2 truncate text-[12px] text-muted">Reading {busy.name || 'done'} ({busy.done}/{busy.total})</div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div ref={bar} className="h-full origin-left scale-x-0 rounded-full bg-accent" />
            </div>
          </div>
        )}
      </label>
    </Card>
  )
}
