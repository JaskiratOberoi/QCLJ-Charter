/** Level number from a Sample ID such as "BIORAD L1 CON". */
export function levelFromSampleId(sampleId: string, pattern: string) {
  try {
    const m = sampleId.match(new RegExp(pattern, 'i'))
    if (m?.[1]) return Number(m[1])
  } catch {
    /* invalid user pattern */
  }
  const f = sampleId.match(/(?:L|LEVEL|LVL|LV)\s*-?\s*(\d)/i)
  return f ? Number(f[1]) : undefined
}
