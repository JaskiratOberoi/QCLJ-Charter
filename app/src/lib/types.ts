export type ISODate = string // YYYY-MM-DD

export interface LabProfile {
  organization: string
  branch: string
  address: string
  contact: string
  /** Lab logo, printed in the corrective action form footer. */
  logoDataUrl?: string
  /** Logo in the top-right slot of LJ, CV and cumulative reports; falls back to the lab logo. */
  reportLogoDataUrl?: string
  reportBrand: string
  copyright: string
  capaDocNo: string
}

export interface Instrument {
  id: string
  manufacturer: string
  model: string
  serial: string
  method: string
}

export interface Analyte {
  id: string
  /** Assay code exactly as printed by the instrument, e.g. "HCG/B-HCG". */
  code: string
  name: string
  unit: string
  decimals: number
  order: number
  /** Allowable total error (%), used for sigma metrics. */
  tea?: number
  /** Monthly CV acceptance limit (%). */
  cvLimit: number
}

export interface LotLevel {
  level: number
  lotNo: string
  expiry: ISODate
}

export interface ControlLot {
  id: string
  manufacturer: string
  product: string
  levels: LotLevel[]
  /** Levels that are actually run and charted. */
  chartLevels: number[]
  instrumentId: string
  startDate: ISODate
  /** Regex with one capture group that yields the level number from the instrument Sample ID. */
  sampleIdPattern: string
}

export interface InsertRange {
  lotId: string
  analyteId: string
  level: number
  mean?: number
  low?: number
  high?: number
}

export type TargetSource = 'baseline' | 'manual' | 'insert'

export interface Target {
  lotId: string
  analyteId: string
  level: number
  mean: number
  sd: number
  source: TargetSource
  n?: number
  from?: ISODate
  to?: ISODate
}

export type RunSource = 'pdf' | 'manual' | 'csv' | 'demo'

export interface Run {
  id: string
  lotId: string
  analyteId: string
  level: number
  date: ISODate
  time?: string
  value: number
  rlu?: number
  source: RunSource
  fileName?: string
  /** Rejected runs (e.g. a failed QC that was repeated) stay in the audit trail but are not charted. */
  rejected?: boolean
  note?: string
  createdAt: number
}

export interface Exclusion {
  date: ISODate
  reason: string
}

export interface Capa {
  id: string
  runId?: string
  lotId: string
  analyteId: string
  level: number
  date: ISODate
  rule: string
  outlierType: string
  rootCauses: number[]
  corrective: string
  preventive: string
  takenBy: string
  verifiedBy: string
  createdAt: number
}

export interface WestgardConfig {
  warn12s: boolean
  r13s: boolean
  r22s: boolean
  rR4s: boolean
  r41s: boolean
  r10x: boolean
}

export interface Workspace {
  version: number
  lab: LabProfile
  instruments: Instrument[]
  analytes: Analyte[]
  lots: ControlLot[]
  inserts: InsertRange[]
  targets: Target[]
  runs: Run[]
  exclusions: Exclusion[]
  capas: Capa[]
  westgard: WestgardConfig
  activeLotId?: string
}
