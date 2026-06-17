import { create } from 'zustand'
import type { Appointment, AppointmentStatus } from '@/types'

interface AppointmentState {
  appointments: Appointment[]
  loadAppointments: (userId?: string, storeId?: string) => void
  addAppointment: (apt: Appointment) => void
  updateStatus: (id: string, status: AppointmentStatus) => void
  uploadReport: (id: string, reportText: string, reportImages: string[], invoiceImages: string[]) => void
}

const STORAGE_KEY = 'autoCare_appointments'

function readFromStorage(): Appointment[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeToStorage(appointments: Appointment[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments))
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],

  loadAppointments: (userId?: string, storeId?: string) => {
    let all = readFromStorage()
    if (userId) all = all.filter((a) => a.userId === userId)
    if (storeId) all = all.filter((a) => a.storeId === storeId)
    set({ appointments: all })
  },

  addAppointment: (apt: Appointment) => {
    const all = readFromStorage()
    all.push(apt)
    writeToStorage(all)
    set((state) => ({ appointments: [...state.appointments, apt] }))
  },

  updateStatus: (id: string, status: AppointmentStatus) => {
    const all = readFromStorage()
    const updated = all.map((a) => (a.id === id ? { ...a, status } : a))
    writeToStorage(updated)
    set((state) => ({
      appointments: state.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
    }))
  },

  uploadReport: (id: string, reportText: string, reportImages: string[], invoiceImages: string[]) => {
    const all = readFromStorage()
    const updated = all.map((a) =>
      a.id === id ? { ...a, reportText, reportImages, invoiceImages } : a
    )
    writeToStorage(updated)
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === id ? { ...a, reportText, reportImages, invoiceImages } : a
      ),
    }))
  },
}))
