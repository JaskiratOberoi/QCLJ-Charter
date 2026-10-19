/**
 * Report geometry in PDF points (1/72 in), on A4 as printed from Chrome (594.96 × 841.92 pt). Text positions are baselines:
 * Arial ascent is 0.905 em, so baseline = top-of-glyph-box + 0.905 × size.
 */
export const A4 = { w: 594.96, h: 841.92 }
export const A4L = { w: 841.92, h: 594.96 }

export const ARIAL = 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif'
export const INK = '#212121'
export const MUTED = '#616161'
export const FOOT = '#757575'

export const baseline = (top: number, size: number) => top + 0.905 * size

export const PAGE = {
  marginL: 31.5,
  marginR: 564.4,
  titleTop: 30,
  titleSize: 11.62,
  logo: { x: 515.25, y: 28.5, w: 49.5, h: 13.5 },
  pageLabelTop: 50.3,
  pageLabelSize: 8.25,
  info: { labelX: 31.5, valueX: 144, size: 7.5, tops: [50.2, 60.7, 71.2, 82.5, 93.0, 103.5, 114.0] },
  footerTop: 762.8,
  footerSize: 8.25,
  reviewedX: 225.2,
  copyrightTop: 794.5,
  copyrightSize: 7.12,
}

export const CHART = {
  headerTop: 135.4,
  headerSize: 8.62,
  blockStep: 121.5,
  plotTop: 151.44,
  plotH: 78.46,
  plotX0: 68.51,
  plotX1: 521.48,
  sdSpan: 3.5,
  border: { color: '#d6d6d6', width: 0.74 },
  yLabel: { right: 64.8, size: 7.03, dy: 2.21 },
  xLabel: { size: 7.03, dy: 12.56, count: 6 },
  tick: { len: 2.6, color: '#9e9e9e', width: 0.74 },
  limit: { width: 0.85, dash: '1.63 1.63' },
  meanLine: { color: '#212121', width: 1.07 },
  badge: { x: 525.18, w: 28.13, h: 9.62, r: 1.85, size: 5.92, dy: 2.61 },
  colors: { 3: '#e53935', 2: '#fbc02d', 1: '#66bb6a', 0: '#212121' } as Record<number, string>,
  series: { color: '#1e88e5', width: 1.26 },
  marker: { r: 2.44, stroke: 0.63, fill: '#81c784', edge: '#43a047', outFill: '#ef9a9a', outEdge: '#c62828' },
  menu: { x0: 511.9, x1: 519.3, dys: [3.66, 6.16, 8.66], color: '#9e9e9e', width: 0.93 },
}

export const TABLE = {
  marginL: 28.5,
  right: 813.0,
  titleTop: 30,
  logo: { x: 764.25, y: 28.5, w: 49.5, h: 13.5 },
  info: { labelX: 28.5, valueX: 156, size: 7.5, tops: [48.7, 59.2, 69.7, 81.0, 91.5] },
  fontSize: 6.9,
  rowH: 10.85,
  colTest: 116.3,
  colLevel: 46.4,
  colFixed: 72,
  rule: '#bdbdbd',
  groupRule: '#757575',
  headBg: '#eeeeee',
  nBg: '#fafafa',
}
