import { create } from 'zustand'
import type { Review } from '@/types'

interface ReviewState {
  reviews: Review[]
  loadReviews: (storeId?: string) => void
  addReview: (review: Review) => void
  getReviewsByStore: (storeId: string) => Review[]
  hasReviewForAppointment: (appointmentId: string) => boolean
  getReviewForAppointment: (appointmentId: string) => Review | undefined
}

const STORAGE_KEY = 'autoCare_reviews'

function readFromStorage(): Review[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeToStorage(reviews: Review[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],

  loadReviews: (storeId?: string) => {
    const all = readFromStorage()
    if (storeId) {
      set({ reviews: all.filter((r) => r.storeId === storeId) })
    } else {
      set({ reviews: all })
    }
  },

  addReview: (review: Review) => {
    const all = readFromStorage()
    const existing = all.find((r) => r.appointmentId === review.appointmentId)
    if (existing) return false
    all.push(review)
    writeToStorage(all)
    set((state) => ({ reviews: [...state.reviews, review] }))
  },

  getReviewsByStore: (storeId: string) => {
    return get().reviews.filter((r) => r.storeId === storeId)
  },

  hasReviewForAppointment: (appointmentId: string) => {
    const all = readFromStorage()
    return all.some((r) => r.appointmentId === appointmentId)
  },

  getReviewForAppointment: (appointmentId: string) => {
    const all = readFromStorage()
    return all.find((r) => r.appointmentId === appointmentId)
  },
}))
