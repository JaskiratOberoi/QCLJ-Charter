import { ddmmyyyy } from '../../lib/dates'
import type { Analyte, Capa, Instrument, LabProfile } from '../../lib/types'
import { A4L, ARIAL, INK } from './geometry'

export const ROOT_CAUSES = [
  'Reagent expiry, deterioration',
  'QC expiry, deterioration',
  'Equipment flag, functioning etc',
  'Environmental conditions',
  'Procedure violation',
  'Technician Fault',
]

const PEN = '#14298a'
const LINE = '#333'

/** IQC Corrective Action Form, two entries per landscape A4 page. */
export function CapaFormPage({ entries, lab, analytes, instrument }: { entries: Capa[]; lab: LabProfile; analytes: Analyte[]; instrument?: Instrument }) {
  const L = 18
  const R = A4L.w - 18
  const W = R - L
  const top = A4L.h - 16
  const outerTop = 16
  const fy = A4L.h - 14 - 64
  const inner = lab.logoDataUrl ? R - 56 : R
  const tableTop = outerTop + 34
  const tableBottom = fy - 36
  const fr = [0.08, 0.11, 0.14, 0.08, 0.22, 0.13, 0.1, 0.07, 0.07]
  const xs = fr.reduce<number[]>((a, f) => [...a, a[a.length - 1] + f * W], [L])
  xs[xs.length - 1] = R
  const headH = 30
  const rowH = (tableBottom - tableTop - headH) / 2
  const labels = ['Date', 'Test Parameter', 'OUTLIER', 'EQPT', 'Root Cause – Please tick the reason', 'Corrective Action Taken', 'Preventive Action Taken', 'Taken By (Sign of Tech)', 'Verified By']
  const mid = (i: number) => (xs[i] + xs[i + 1]) / 2

  return (
    <svg viewBox={`0 0 ${A4L.w} ${A4L.h}`} width="100%" fontFamily={ARIAL} style={{ background: '#fff', display: 'block' }}>
      <rect x={L} y={outerTop} width={W} height={A4L.h - 14 - outerTop} fill="none" stroke={LINE} strokeWidth={0.8} />
      <text x={A4L.w / 2} y={outerTop + 14} fontSize={12} fontWeight={700} fill={INK} textAnchor="middle">IQC CORRECTIVE ACTION FORM</text>
      <text x={A4L.w / 2} y={outerTop + 26} fontSize={8.5} fill={INK} textAnchor="middle">(Recording schedule – Whenever there is IQC outlier OR Westgard Rules violation)</text>

      <g stroke={LINE} strokeWidth={0.7}>
        <line x1={L} x2={R} y1={tableTop} y2={tableTop} />
        <line x1={L} x2={R} y1={tableTop + headH} y2={tableTop + headH} />
        <line x1={L} x2={R} y1={tableTop + headH + rowH} y2={tableTop + headH + rowH} />
        <line x1={L} x2={R} y1={tableBottom} y2={tableBottom} />
        {xs.slice(1, -1).map((x) => <line key={x} x1={x} x2={x} y1={tableTop} y2={tableBottom} />)}
      </g>
      {labels.map((lab, i) => {
        const words = lab.split(' ')
        if (i === 2)
          return (
            <g key={i} textAnchor="middle" fill={INK}>
              <text x={mid(i)} y={tableTop + 11} fontSize={7.5}>OUTLIER</text>
              <text x={mid(i)} y={tableTop + 20} fontSize={6}>Daily QC Out / Monthly % CV</text>
              <text x={mid(i)} y={tableTop + 27} fontSize={6}>high Or Westgard Rule</text>
            </g>
          )
        if (words.length > 3 && i !== 4)
          return (
            <g key={i} textAnchor="middle" fill={INK} fontSize={7}>
              <text x={mid(i)} y={tableTop + 13}>{words.slice(0, 2).join(' ')}</text>
              <text x={mid(i)} y={tableTop + 23}>{words.slice(2).join(' ')}</text>
            </g>
          )
        return <text key={i} x={mid(i)} y={tableTop + 18} fontSize={i === 4 ? 7 : 8} fill={INK} textAnchor="middle">{lab}</text>
      })}

      {[0, 1].map((k) => {
        const e = entries[k]
        const y0 = tableTop + headH + k * rowH
        const cy = y0 + rowH * 0.42
        const a = e && analytes.find((x) => x.id === e.analyteId)
        return (
          <g key={k}>
            {ROOT_CAUSES.map((c, j) => (
              <g key={c}>
                <text x={xs[4] + 4} y={y0 + 11 + j * 10} fontSize={6.8} fill={INK}>{j + 1}) {c}</text>
                {e?.rootCauses.includes(j + 1) && <path d={`M${xs[5] - 16} ${y0 + 8 + j * 10} l3 3 l6 -7`} stroke={PEN} strokeWidth={1.4} fill="none" strokeLinecap="round" />}
              </g>
            ))}
            {e && (
              <g fill={PEN} fontFamily='"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive' fontWeight={700}>
                <text x={mid(0)} y={cy} fontSize={13} textAnchor="middle">{ddmmyyyy(e.date)}</text>
                <text x={mid(1)} y={cy} fontSize={12} textAnchor="middle">{a?.name}</text>
                <text x={mid(1)} y={cy + 14} fontSize={9} textAnchor="middle">Level {e.level}</text>
                <Multi x={mid(2)} y={cy - 6} lines={wrapText(e.outlierType, 16)} size={11} anchor="middle" />
                <Multi x={mid(3)} y={cy - 6} lines={wrapText(instrument?.model ?? '', 9)} size={11} anchor="middle" />
                <Multi x={xs[5] + 6} y={y0 + 20} lines={wrapText(e.corrective, 20)} size={11} />
                <Multi x={xs[6] + 6} y={y0 + 20} lines={wrapText(e.preventive, 15)} size={10} />
                <Multi x={mid(7)} y={cy} lines={wrapText(e.takenBy, 10)} size={12} anchor="middle" />
                <Multi x={mid(8)} y={cy} lines={wrapText(e.verifiedBy, 10)} size={12} anchor="middle" />
              </g>
            )}
          </g>
        )
      })}

      <text x={L + 6} y={tableBottom + 12} fontSize={8} fill={INK}>Acceptance Criteria: Daily QC value within range specified by manufacturer for that control OR Westgard rule violation.</text>
      <text x={L + 6} y={tableBottom + 24} fontSize={8} fill={INK}>Monthly % CV: &lt; MU OR 5 % for Hematology and &lt; 10 % for Biochemistry whichever is higher.</text>

      <g stroke={LINE} strokeWidth={0.7}>
        <line x1={L} x2={R} y1={fy} y2={fy} />
        <line x1={L} x2={inner} y1={fy + 20} y2={fy + 20} />
        <line x1={L} x2={inner} y1={fy + 40} y2={fy + 40} />
        <line x1={L + W * 0.58} x2={L + W * 0.58} y1={fy} y2={top} />
        {lab.logoDataUrl && <line x1={inner} x2={inner} y1={fy} y2={top} />}
      </g>
      {lab.logoDataUrl && <image href={lab.logoDataUrl} x={inner + 4} y={fy + 8} width={R - inner - 8} height={48} preserveAspectRatio="xMidYMid meet" />}
      <text x={L + 8} y={fy + 14} fontSize={10} fontWeight={700} fill={INK}>{(lab.organization || 'Laboratory').toUpperCase()}</text>
      <text x={L + W * 0.58 + 6} y={fy + 14} fontSize={8} fill={INK}>Doc No. {lab.capaDocNo || '—'}</text>
      <text x={L + 8} y={fy + 33} fontSize={8} fill={INK}>Documented Information – Ensuring validity of examination results</text>
      <text x={L + W * 0.58 + 6} y={fy + 33} fontSize={8} fill={INK}>IQC corrective action record</text>
      <text x={L + 8} y={fy + 56} fontSize={7} fill={INK}>Prepared By Quality Manager</text>
      <text x={L + 180} y={fy + 56} fontSize={7} fill={INK}>Approved By Lab Director</text>
      <text x={(L + W * 0.58 + inner) / 2} y={fy + 56} fontSize={8} fontWeight={700} fill={INK} textAnchor="middle">CONTROLLED COPY</text>
    </svg>
  )
}

function Multi({ x, y, lines, size, anchor }: { x: number; y: number; lines: string[]; size: number; anchor?: 'middle' }) {
  return (
    <>
      {lines.map((l, i) => <text key={i} x={x} y={y + i * (size + 3)} fontSize={size} textAnchor={anchor}>{l}</text>)}
    </>
  )
}

function wrapText(s: string, max: number) {
  const out: string[] = []
  let cur = ''
  for (const w of (s || '').split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      out.push(cur)
      cur = w
    } else cur = (cur + ' ' + w).trim()
  }
  if (cur) out.push(cur)
  return out.slice(0, 6)
}
