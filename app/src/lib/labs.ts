import { del } from 'idb-keyval'

export interface LabEntry {
  id: string
  name: string
}

export const DEFAULT_LAB: LabEntry = { id: 'noble', name: 'Noble Diagnostic Centre' }

const REGISTRY = 'qclj-labs'
const ACTIVE = 'qclj-active-lab'

/** IndexedDB key holding a lab's workspace. The default lab keeps the original key. */
export const workspaceKey = (id: string) => (id === DEFAULT_LAB.id ? 'qclj-workspace' : `qclj-workspace:${id}`)

export function listLabs(): LabEntry[] {
  try {
    const labs = JSON.parse(localStorage.getItem(REGISTRY) ?? '[]') as LabEntry[]
    return labs.some((l) => l.id === DEFAULT_LAB.id) ? labs : [DEFAULT_LAB, ...labs]
  } catch {
    return [DEFAULT_LAB]
  }
}

const saveLabs = (labs: LabEntry[]) => localStorage.setItem(REGISTRY, JSON.stringify(labs))

export function activeLabId(): string {
  const id = localStorage.getItem(ACTIVE)
  return id && listLabs().some((l) => l.id === id) ? id : DEFAULT_LAB.id
}

export const activeLab = () => listLabs().find((l) => l.id === activeLabId()) ?? DEFAULT_LAB

export function renameLab(id: string, name: string) {
  if (!name.trim()) return
  saveLabs(listLabs().map((l) => (l.id === id ? { ...l, name: name.trim() } : l)))
}

/** Each lab is a separate workspace, so switching reloads the app onto that lab's data. */
export function switchLab(id: string, path = '/') {
  localStorage.setItem(ACTIVE, id)
  window.location.assign(path)
}

export function addLab(name: string) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) + '-' + Date.now().toString(36).slice(-4)
  saveLabs([...listLabs(), { id, name: name.trim() }])
  switchLab(id, '/setup')
}

export async function removeLab(id: string) {
  if (id === DEFAULT_LAB.id) return
  const wasActive = activeLabId() === id
  await del(workspaceKey(id))
  saveLabs(listLabs().filter((l) => l.id !== id))
  if (wasActive) switchLab(DEFAULT_LAB.id)
}
