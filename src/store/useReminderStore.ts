import { create } from 'zustand'
import type { Reminder, ReminderPriority } from '@/types'

interface ReminderState {
  reminders: Reminder[]
  loadReminders: (userId: string) => void
  markAsRead: (id: string) => void
  addReminder: (reminder: Reminder) => void
  generateReminders: (userId: string) => void
}

const STORAGE_KEY = 'autoCare_reminders'
const VEHICLES_KEY = 'autoCare_vehicles'
const RECORDS_KEY = 'autoCare_serviceRecords'

function readFromStorage<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeToStorage(reminders: Reminder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders))
}

interface MaintenanceInterval {
  keyword: string
  intervalKm: number
  label: string
}

const MAINTENANCE_INTERVALS: MaintenanceInterval[] = [
  { keyword: '机油', intervalKm: 5000, label: '机油更换' },
  { keyword: '刹车片', intervalKm: 20000, label: '刹车片更换' },
]

function isWithinDays(dateStr: string, days: number): boolean {
  const target = new Date(dateStr)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= days
}

function isOverdue(dateStr: string): boolean {
  return new Date(dateStr) < new Date()
}

export const useReminderStore = create<ReminderState>((set) => ({
  reminders: [],

  loadReminders: (userId: string) => {
    const vehicles = readFromStorage<{ userId: string; id: string }>(VEHICLES_KEY)
    const vehicleIds = vehicles.filter((v) => v.userId === userId).map((v) => v.id)
    const all = readFromStorage<Reminder>(STORAGE_KEY)
    set({ reminders: all.filter((r) => vehicleIds.includes(r.vehicleId)) })
  },

  markAsRead: (id: string) => {
    const all = readFromStorage<Reminder>(STORAGE_KEY)
    const updated = all.map((r) => (r.id === id ? { ...r, isRead: true } : r))
    writeToStorage(updated)
    set((state) => ({
      reminders: state.reminders.map((r) => (r.id === id ? { ...r, isRead: true } : r)),
    }))
  },

  addReminder: (reminder: Reminder) => {
    const all = readFromStorage<Reminder>(STORAGE_KEY)
    all.push(reminder)
    writeToStorage(all)
    set((state) => ({ reminders: [...state.reminders, reminder] }))
  },

  generateReminders: (userId: string) => {
    const vehicles = readFromStorage<{
      userId: string
      id: string
      brand: string
      model: string
      currentMileage: number
      insuranceExpiry?: string
      inspectionExpiry?: string
    }>(VEHICLES_KEY)

    const userVehicles = vehicles.filter((v) => v.userId === userId)
    const records = readFromStorage<{
      vehicleId: string
      items: string[]
      mileage: number
      type: string
    }>(RECORDS_KEY)

    const newReminders: Reminder[] = []
    const allReminders = readFromStorage<Reminder>(STORAGE_KEY)

    const existingKeys = new Set(
      allReminders.map((r) => `${r.vehicleId}_${r.type}_${r.title}`)
    )

    for (const vehicle of userVehicles) {
      const vehicleLabel = `${vehicle.brand} ${vehicle.model}`

      if (vehicle.insuranceExpiry) {
        const key = `${vehicle.id}_insurance_${vehicleLabel}保险到期`
        if (!existingKeys.has(key)) {
          let priority: ReminderPriority = 'low'
          if (isOverdue(vehicle.insuranceExpiry)) {
            priority = 'high'
          } else if (isWithinDays(vehicle.insuranceExpiry, 30)) {
            priority = 'medium'
          }
          if (priority !== 'low') {
            newReminders.push({
              id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
              vehicleId: vehicle.id,
              type: 'insurance',
              title: `${vehicleLabel}保险即将到期`,
              message: `您的${vehicleLabel}保险将于${vehicle.insuranceExpiry}到期`,
              dueDate: vehicle.insuranceExpiry,
              isRead: false,
              priority,
            })
          }
        }
      }

      if (vehicle.inspectionExpiry) {
        const key = `${vehicle.id}_inspection_${vehicleLabel}年检到期`
        if (!existingKeys.has(key)) {
          let priority: ReminderPriority = 'low'
          if (isOverdue(vehicle.inspectionExpiry)) {
            priority = 'high'
          } else if (isWithinDays(vehicle.inspectionExpiry, 30)) {
            priority = 'medium'
          }
          if (priority !== 'low') {
            newReminders.push({
              id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
              vehicleId: vehicle.id,
              type: 'inspection',
              title: `${vehicleLabel}年检即将到期`,
              message: `您的${vehicleLabel}年检将于${vehicle.inspectionExpiry}到期`,
              dueDate: vehicle.inspectionExpiry,
              isRead: false,
              priority,
            })
          }
        }
      }

      const vehicleRecords = records.filter((r) => r.vehicleId === vehicle.id)

      for (const interval of MAINTENANCE_INTERVALS) {
        const key = `${vehicle.id}_maintenance_${interval.label}`
        if (existingKeys.has(key)) continue

        const lastRecord = vehicleRecords
          .filter((r) => r.items.some((item) => item.includes(interval.keyword)))
          .sort((a, b) => b.mileage - a.mileage)[0]

        const lastMileage = lastRecord ? lastRecord.mileage : 0
        const nextDueMileage = lastMileage + interval.intervalKm
        const remainingKm = nextDueMileage - vehicle.currentMileage

        let priority: ReminderPriority = 'low'
        if (remainingKm <= 0) {
          priority = 'high'
        } else if (remainingKm <= 1000) {
          priority = 'medium'
        }

        if (priority !== 'low') {
          newReminders.push({
            id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
            vehicleId: vehicle.id,
            type: 'maintenance',
            title: `${vehicleLabel}${interval.label}提醒`,
            message: `您的${vehicleLabel}已行驶${vehicle.currentMileage}km，${interval.label}里程为${nextDueMileage}km`,
            dueMileage: nextDueMileage,
            isRead: false,
            priority,
          })
        }
      }
    }

    if (newReminders.length > 0) {
      const merged = [...allReminders, ...newReminders]
      writeToStorage(merged)
      set((state) => ({ reminders: [...state.reminders, ...newReminders] }))
    }
  },
}))
