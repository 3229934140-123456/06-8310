import { create } from 'zustand'
import type { Store } from '@/types'

interface StoreState {
  stores: Store[]
  selectedStore: Store | null
  loadStores: () => void
  selectStore: (id: string) => void
  searchNearby: (lat: number, lng: number, radius?: number) => void
}

const STORAGE_KEY = 'autoCare_stores'

function readFromStorage(): Store[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const useStoreStore = create<StoreState>((set) => ({
  stores: [],
  selectedStore: null,

  loadStores: () => {
    const all = readFromStorage()
    set({ stores: all })
  },

  selectStore: (id: string) => {
    const all = readFromStorage()
    const store = all.find((s) => s.id === id) ?? null
    set({ selectedStore: store })
  },

  searchNearby: (lat: number, lng: number, radius: number = 50) => {
    const all = readFromStorage()
    const withDistance = all
      .map((store) => ({
        store,
        distance: haversineDistance(lat, lng, store.lat, store.lng),
      }))
      .filter((item) => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance)

    set({
      stores: withDistance.map((item) => item.store),
    })
  },
}))
