import { create } from 'zustand'
import type { Vehicle } from '@/types'

interface VehicleState {
  vehicles: Vehicle[]
  loadVehicles: (userId: string) => void
  addVehicle: (vehicle: Vehicle) => void
  updateVehicle: (id: string, data: Partial<Vehicle>) => void
  deleteVehicle: (id: string) => void
}

const STORAGE_KEY = 'autoCare_vehicles'

function readFromStorage(): Vehicle[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeToStorage(vehicles: Vehicle[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles))
}

export const useVehicleStore = create<VehicleState>((set) => ({
  vehicles: [],

  loadVehicles: (userId: string) => {
    const all = readFromStorage()
    set({ vehicles: all.filter((v) => v.userId === userId) })
  },

  addVehicle: (vehicle: Vehicle) => {
    const all = readFromStorage()
    all.push(vehicle)
    writeToStorage(all)
    set((state) => ({ vehicles: [...state.vehicles, vehicle] }))
  },

  updateVehicle: (id: string, data: Partial<Vehicle>) => {
    const all = readFromStorage()
    const updated = all.map((v) => (v.id === id ? { ...v, ...data } : v))
    writeToStorage(updated)
    set((state) => ({
      vehicles: state.vehicles.map((v) => (v.id === id ? { ...v, ...data } : v)),
    }))
  },

  deleteVehicle: (id: string) => {
    const all = readFromStorage()
    const filtered = all.filter((v) => v.id !== id)
    writeToStorage(filtered)
    set((state) => ({ vehicles: state.vehicles.filter((v) => v.id !== id) }))
  },
}))
