import { create } from 'zustand'
import { monthKey, todayISO } from './dates'

interface Ui {
  month: string
  setMonth: (m: string) => void
  /** When true the page content spans the full main area without the centred container. */
  bleed: boolean
  setBleed: (b: boolean) => void
}

export const useUi = create<Ui>((set) => ({
  month: monthKey(todayISO()),
  setMonth: (month) => set({ month }),
  bleed: false,
  setBleed: (bleed) => set({ bleed }),
}))
