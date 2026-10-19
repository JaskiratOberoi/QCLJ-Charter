import { useState } from 'react'
import { Button, Card } from '../../components/ui'
import { parseTabular } from '../../lib/parsers/csv'
import { StagedImport, type StagedRow } from './StagedImport'

const EXAMPLE = `date,level,FSH,LH,TSH
01/11/2025,1,7.42,1.80,0.51
01/11/2025,2,25.10,24.70,5.71`

export function PasteImport({ onDone }: { onDone: (msg: string) => void }) {
  const [text, setText] = useState('')
  const [rows, setRows] = useState<StagedRow[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const parse = (t: string) => {
    const res = parseTabular(t)
    setErrors(res.errors)
    setRows(res.rows.map((r) => ({ ...r, file: 'pasted' })))
  }

  if (rows.length) return <StagedImport rows={rows} source="csv" onDone={(m) => { setRows([]); setText(''); onDone(m) }} />

  return (
    <Card className="p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE}
            spellCheck={false}
            className="h-72 w-full resize-y rounded-xl border border-line-2 bg-paper/50 p-4 font-mono text-[12.5px] outline-none focus:border-accent focus:shadow-[0_0_0_4px_var(--color-accent-soft)]"
          />
          {errors.length > 0 && <p className="mt-2 text-[12.5px] text-bad">{errors.slice(0, 5).join(' · ')}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" disabled={!text.trim()} onClick={() => parse(text)}>Review rows</Button>
            <label className="inline-flex h-10 cursor-pointer items-center rounded-full border border-line-2 bg-surface px-5 text-sm font-medium hover:border-ink/40">
              Open CSV / TSV
              <input type="file" accept=".csv,.tsv,.txt" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const t = await f.text(); setText(t); parse(t) } }} />
            </label>
          </div>
        </div>
        <div className="text-[13px] leading-relaxed text-muted">
          <p className="font-semibold text-ink">Paste straight from Excel or LIS exports</p>
          <p className="mt-2"><b className="text-ink-2">Wide:</b> <code>date, level</code>, then one column per assay code.</p>
          <p className="mt-2"><b className="text-ink-2">Long:</b> <code>date, level, test, value</code> and optional <code>time</code>.</p>
          <p className="mt-2">Dates accept <code>DD/MM/YYYY</code> or <code>YYYY-MM-DD</code>. Level can be <code>1</code>, <code>L1</code> or <code>Level 1</code>.</p>
          <button className="mt-4 text-accent" onClick={() => setText(EXAMPLE)}>Insert example</button>
        </div>
      </div>
    </Card>
  )
}
