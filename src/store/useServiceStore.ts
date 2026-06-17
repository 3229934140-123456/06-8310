import { create } from 'zustand'
import type { ServiceRecord } from '@/types'

interface ServiceState {
  records: ServiceRecord[]
  loadRecords: (vehicleId?: string) => void
  addRecord: (record: ServiceRecord) => void
  getRecordsByVehicle: (vehicleId: string) => ServiceRecord[]
}

const STORAGE_KEY = 'autoCare_serviceRecords'

function readFromStorage(): ServiceRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeToStorage(records: ServiceRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export const useServiceStore = create<ServiceState>((set, get) => ({
  records: [],

  loadRecords: (vehicleId?: string) => {
    const all = readFromStorage()
    if (vehicleId) {
      set({ records: all.filter((r) => r.vehicleId === vehicleId) })
    } else {
      set({ records: all })
    }
  },

  addRecord: (record: ServiceRecord) => {
    const all = readFromStorage()
    all.push(record)
    writeToStorage(all)
    set((state) => ({ records: [...state.records, record] }))
  },

  getRecordsByVehicle: (vehicleId: string) => {
    return get().records.filter((r) => r.vehicleId === vehicleId)
  },
}))
