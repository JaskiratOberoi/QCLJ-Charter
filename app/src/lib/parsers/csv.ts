import { parseLooseDate } from '../dates'

export interface TabularResult {
  date: string
  time?: string
  level: number
  assay: string
  value: number
}

export function splitRows(text: string): string[][] {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim())
  if (!lines.length) return []
  const delim = lines[0].includes('\t') ? '\t' : lines[0].split(';').length > lines[0].split(',').length ? ';' : ','
  return lines.map((l) => splitLine(l, delim))
}

function splitLine(line: string, d: string) {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"'
        i++
      } else q = !q
    } else if (c === d && !q) {
      out.push(cur.trim())
      cur = ''
    } else cur += c
  }
  out.push(cur.trim())
  return out
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Long format: columns date, level, test/assay/analyte, value[, time].
 * Wide format: columns date, level, then one column per assay code.
 */
export function parseTabular(text: string): { rows: TabularResult[]; errors: string[]; format: 'long' | 'wide' | 'unknown' } {
  const rows = splitRows(text)
  const errors: string[] = []
  if (rows.length < 2) return { rows: [], errors: ['Need a header row and at least one data row.'], format: 'unknown' }
  const head = rows[0].map(norm)
  const idx = (...names: string[]) => head.findIndex((h) => names.includes(h))
  const iDate = idx('date', 'rundate', 'day')
  const iLevel = idx('level', 'lvl', 'controllevel')
  const iTime = idx('time', 'finishtime')
  const iAssay = idx('test', 'assay', 'analyte', 'parameter', 'code')
  const iValue = idx('value', 'result', 'conc', 'concentration')
  if (iDate < 0 || iLevel < 0) return { rows: [], errors: ['Header must include "date" and "level" columns.'], format: 'unknown' }

  const out: TabularResult[] = []
  const long = iAssay >= 0 && iValue >= 0
  rows.slice(1).forEach((r, n) => {
    const date = parseLooseDate(r[iDate] ?? '')
    const level = Number(String(r[iLevel] ?? '').replace(/\D/g, ''))
    if (!date || !level) {
      errors.push(`Row ${n + 2}: bad date or level`)
      return
    }
    const time = iTime >= 0 ? r[iTime] || undefined : undefined
    if (long) {
      const v = Number(String(r[iValue]).replace(/[^\d.-]/g, ''))
      if (!isFinite(v) || r[iValue] === '') return
      out.push({ date, time, level, assay: r[iAssay], value: v })
    } else {
      rows[0].forEach((h, c) => {
        if ([iDate, iLevel, iTime].includes(c) || r[c] == null || r[c] === '') return
        const v = Number(String(r[c]).replace(/[^\d.-]/g, ''))
        if (isFinite(v)) out.push({ date, time, level, assay: h.trim(), value: v })
      })
    }
  })
  return { rows: out, errors, format: long ? 'long' : 'wide' }
}
