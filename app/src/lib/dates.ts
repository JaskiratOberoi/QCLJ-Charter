import type { ISODate } from './types'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const pad2 = (n: number) => String(n).padStart(2, '0')

export function iso(y: number, m: number, d: number): ISODate {
  return `${y}-${pad2(m)}-${pad2(d)}`
}

export function parts(date: ISODate) {
  const [y, m, d] = date.split('-').map(Number)
  return { y, m, d }
}

/** "YYYY-MM" key for a date. */
export const monthKey = (date: ISODate) => date.slice(0, 7)

export function daysInMonth(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export const monthStart = (key: string): ISODate => `${key}-01`
export const monthEnd = (key: string): ISODate => `${key}-${pad2(daysInMonth(key))}`

export function addMonths(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number)
  const t = new Date(y, m - 1 + delta, 1)
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}`
}

export function monthsBetween(fromKey: string, toKey: string) {
  const out: string[] = []
  let k = fromKey
  while (k <= toKey && out.length < 600) {
    out.push(k)
    k = addMonths(k, 1)
  }
  return out
}

/** "Oct 25" */
export function monthShortLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`
}

/** "October 2025" */
export function monthLongLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS_LONG[m - 1]} ${y}`
}

/** "01/05" */
export function ddmm(date: ISODate) {
  const { m, d } = parts(date)
  return `${pad2(d)}/${pad2(m)}`
}

/** "01/05/2026" */
export function ddmmyyyy(date: ISODate) {
  const { y, m, d } = parts(date)
  return `${pad2(d)}/${pad2(m)}/${y}`
}

export function todayISO(): ISODate {
  const t = new Date()
  return iso(t.getFullYear(), t.getMonth() + 1, t.getDate())
}

export function addDays(date: ISODate, delta: number): ISODate {
  const { y, m, d } = parts(date)
  const t = new Date(y, m - 1, d + delta)
  return iso(t.getFullYear(), t.getMonth() + 1, t.getDate())
}

export function daysBetween(a: ISODate, b: ISODate) {
  const pa = parts(a)
  const pb = parts(b)
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000)
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY. */
export function parseLooseDate(s: string): ISODate | null {
  const t = s.trim()
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return iso(+m[1], +m[2], +m[3])
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]
    return iso(y, +m[2], +m[1])
  }
  return null
}
