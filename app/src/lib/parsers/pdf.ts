import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerSrc from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

export interface ParsedResult {
  file: string
  page: number
  model?: string
  printed?: string
  sampleId: string
  assay: string
  rlu?: number
  value: number
  qualifier?: string
  unit: string
  flag: string
  date: string
  time?: string
}

export interface ParseReport {
  file: string
  pages: number
  results: ParsedResult[]
  warnings: string[]
}

interface Item {
  s: string
  x: number
  y: number
}

const DT = /(20\d{2}-?\d{2}-?\d{2})[ T](\d{2}:\d{2}:\d{2})/
const isoDate = (s: string) => s.replace(/^(\d{4})-?(\d{2})-?(\d{2})$/, '$1-$2-$3')
const COLS = ['Sample ID', 'Assay', 'RLU', 'RLU CV', 'Conc.', 'Flag', 'Finish Time'] as const

/** Parses instrument "Sample Result Report" PDFs (Snibe Maglumi layout, and similar column reports). */
export async function parseResultPdf(file: File): Promise<ParseReport> {
  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const results: ParsedResult[] = []
  const warnings: string[] = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const tc = await page.getTextContent()
    const items: Item[] = []
    for (const it of tc.items) {
      if (!('str' in it)) continue
      const s = it.str.replace(/\u00a0/g, ' ').replace(/[\u00ad\u2010-\u2015\u2212]/g, '-').trim()
      if (!s) continue
      items.push({ s, x: it.transform[4], y: it.transform[5] })
    }
    const lines = groupLines(items)
    const text = lines.map((l) => l.map((i) => i.s).join(' ')).join('\n')
    const model = text.match(/Model:\s*([^\n]+?)\s{0,}(?:20\d{2}-|\n|$)/)?.[1]?.trim()
    const printed = text.match(DT)
    const colX = headerColumns(lines)
    let found = 0

    for (const line of lines) {
      const joined = line.map((i) => i.s).join(' ')
      const fin = joined.match(new RegExp(DT.source + '\\s*$'))
      if (!fin || /^Model:/i.test(joined)) continue
      const row = colX ? byColumns(line, colX) : byRegex(joined)
      if (!row) continue
      const conc = parseConc(row.conc)
      if (!conc || !row.assay) {
        warnings.push(`${file.name} p${p}: could not read "${joined}"`)
        continue
      }
      results.push({
        file: file.name,
        page: p,
        model,
        printed: printed ? `${isoDate(printed[1])} ${printed[2]}` : undefined,
        sampleId: row.sampleId,
        assay: row.assay,
        rlu: row.rlu ? Number(row.rlu) : undefined,
        value: conc.value,
        qualifier: conc.qualifier,
        unit: conc.unit,
        flag: row.flag,
        date: isoDate(fin[1]),
        time: fin[2],
      })
      found++
    }
    if (!found && colX) warnings.push(`${file.name} p${p}: no result rows recognised`)
  }
  return { file: file.name, pages: doc.numPages, results, warnings }
}

function groupLines(items: Item[]) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: Item[][] = []
  for (const it of sorted) {
    const last = lines[lines.length - 1]
    if (last && Math.abs(last[0].y - it.y) < 3) last.push(it)
    else lines.push([it])
  }
  return lines.map((l) => l.sort((a, b) => a.x - b.x))
}

function headerColumns(lines: Item[][]) {
  for (const line of lines) {
    const find = (label: string) => line.find((i) => i.s === label || i.s.startsWith(label + ' '))?.x
    const sid = find('Sample ID')
    const assay = find('Assay')
    const conc = find('Conc.')
    if (sid == null || assay == null || conc == null) continue
    const rluCv = line.find((i) => i.s.startsWith('RLU CV'))?.x
    const rlu = line.find((i) => i.s === 'RLU')?.x
    return {
      'Sample ID': sid,
      Assay: assay,
      RLU: rlu ?? -1,
      'RLU CV': rluCv ?? -1,
      'Conc.': conc,
      Flag: find('Flag') ?? -1,
      'Finish Time': find('Finish Time') ?? find('Finish') ?? -1,
    } as Record<(typeof COLS)[number], number>
  }
  return null
}

function byColumns(line: Item[], colX: Record<(typeof COLS)[number], number>) {
  const cols = COLS.filter((c) => colX[c] >= 0).sort((a, b) => colX[a] - colX[b])
  const cell: Record<string, string[]> = {}
  for (const it of line) {
    let col: string = cols[0]
    for (const c of cols) if (it.x >= colX[c] - 4) col = c
    ;(cell[col] ??= []).push(it.s)
  }
  const get = (c: string) => (cell[c] ?? []).join(' ').trim()
  let sampleId = get('Sample ID')
  let assay = get('Assay')
  // Long sample IDs can spill into the Assay column.
  if (!assay && sampleId.includes(' ')) {
    const parts = sampleId.split(/\s+/)
    assay = parts.pop() ?? ''
    sampleId = parts.join(' ')
  }
  const flag = get('Flag').replace(DT, '').trim()
  return { sampleId, assay, rlu: get('RLU').replace(/\D/g, ''), conc: get('Conc.'), flag }
}

function byRegex(s: string) {
  const m = s.match(/^(.+?)\s+([A-Za-z0-9/\-+.]+)\s+(\d+)\s+([\d.]+)\s+([<>]?[\d.]+\s*\S*)\s*(.*?)\s*20\d{2}-?\d{2}-?\d{2}/)
  if (!m) return null
  return { sampleId: m[1], assay: m[2], rlu: m[3], conc: m[5], flag: m[6] }
}

function parseConc(s: string) {
  const m = s.match(/([<>]=?)?\s*(-?\d+(?:\.\d+)?)\s*(.*)$/)
  if (!m) return null
  return { qualifier: m[1], value: Number(m[2]), unit: m[3].replace(DT, '').trim() }
}
