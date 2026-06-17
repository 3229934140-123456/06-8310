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

    let allReminders = readFromStorage<Reminder>(STORAGE_KEY)

    const mergeKey = (r: Reminder): string => {
      if (r.type === 'appointment') return `apt_${r.id}`
      if (r.type === 'maintenance') {
        const keyword = MAINTENANCE_INTERVALS.find((m) => r.title.includes(m.label))?.keyword || ''
        return `${r.vehicleId}_maintenance_${keyword}`
      }
      return `${r.vehicleId}_${r.type}`
    }

    const grouped = new Map<string, Reminder[]>()
    for (const r of allReminders) {
      const key = mergeKey(r)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(r)
    }

    for (const [key, dupes] of grouped) {
      if (dupes.length > 1 && key.startsWith('apt_')) continue
      if (dupes.length > 1) {
        dupes.sort((a, b) => {
          const po: Record<string, number> = { high: 0, medium: 1, low: 2 }
          return po[a.priority] - po[b.priority] || (b.dueDate || '').localeCompare(a.dueDate || '')
        })
        const keep = dupes[0]
        const removeIds = new Set(dupes.slice(1).map((d) => d.id))
        allReminders = allReminders.filter((r) => !removeIds.has(r.id) || r.id === keep.id)
      }
    }

    const desiredKeys = new Set<string>()
    const pendingNew: { key: string; reminder: Omit<Reminder, 'id'> }[] = []

    for (const vehicle of userVehicles) {
      const vehicleLabel = `${vehicle.brand} ${vehicle.model}`

      if (vehicle.insuranceExpiry) {
        const key = `${vehicle.id}_insurance`
        desiredKeys.add(key)
        let priority: ReminderPriority = 'low'
        if (isOverdue(vehicle.insuranceExpiry)) priority = 'high'
        else if (isWithinDays(vehicle.insuranceExpiry, 30)) priority = 'medium'
        if (priority !== 'low') {
          const existing = allReminders.find((r) => mergeKey(r) === key)
          if (existing) {
            const idx = allReminders.indexOf(existing)
            allReminders[idx] = { ...existing, priority, isRead: false, dueDate: vehicle.insuranceExpiry, message: `您的${vehicleLabel}保险将于${vehicle.insuranceExpiry}到期`, title: `${vehicleLabel}保险即将到期` }
          } else {
            pendingNew.push({ key, reminder: { vehicleId: vehicle.id, type: 'insurance', title: `${vehicleLabel}保险即将到期`, message: `您的${vehicleLabel}保险将于${vehicle.insuranceExpiry}到期`, dueDate: vehicle.insuranceExpiry, isRead: false, priority } })
          }
        }
      }

      if (vehicle.inspectionExpiry) {
        const key = `${vehicle.id}_inspection`
        desiredKeys.add(key)
        let priority: ReminderPriority = 'low'
        if (isOverdue(vehicle.inspectionExpiry)) priority = 'high'
        else if (isWithinDays(vehicle.inspectionExpiry, 30)) priority = 'medium'
        if (priority !== 'low') {
          const existing = allReminders.find((r) => mergeKey(r) === key)
          if (existing) {
            const idx = allReminders.indexOf(existing)
            allReminders[idx] = { ...existing, priority, isRead: false, dueDate: vehicle.inspectionExpiry, message: `您的${vehicleLabel}年检将于${vehicle.inspectionExpiry}到期`, title: `${vehicleLabel}年检即将到期` }
          } else {
            pendingNew.push({ key, reminder: { vehicleId: vehicle.id, type: 'inspection', title: `${vehicleLabel}年检即将到期`, message: `您的${vehicleLabel}年检将于${vehicle.inspectionExpiry}到期`, dueDate: vehicle.inspectionExpiry, isRead: false, priority } })
          }
        }
      }

      const vehicleRecords = records.filter((r) => r.vehicleId === vehicle.id)

      for (const interval of MAINTENANCE_INTERVALS) {
        const key = `${vehicle.id}_maintenance_${interval.keyword}`
        desiredKeys.add(key)

        const lastRecord = vehicleRecords
          .filter((r) => r.items.some((item) => item.includes(interval.keyword)))
          .sort((a, b) => b.mileage - a.mileage)[0]

        const lastMileage = lastRecord ? lastRecord.mileage : 0
        const nextDueMileage = lastMileage + interval.intervalKm
        const remainingKm = nextDueMileage - vehicle.currentMileage

        let priority: ReminderPriority = 'low'
        if (remainingKm <= 0) priority = 'high'
        else if (remainingKm <= 1000) priority = 'medium'

        if (priority !== 'low') {
          const existing = allReminders.find((r) => mergeKey(r) === key)
          if (existing) {
            const idx = allReminders.indexOf(existing)
            allReminders[idx] = { ...existing, priority, isRead: false, dueMileage: nextDueMileage, message: `您的${vehicleLabel}已行驶${vehicle.currentMileage}km，${interval.label}里程为${nextDueMileage}km`, title: `${vehicleLabel}${interval.label}提醒` }
          } else {
            pendingNew.push({ key, reminder: { vehicleId: vehicle.id, type: 'maintenance', title: `${vehicleLabel}${interval.label}提醒`, message: `您的${vehicleLabel}已行驶${vehicle.currentMileage}km，${interval.label}里程为${nextDueMileage}km`, dueMileage: nextDueMileage, isRead: false, priority } })
          }
        }
      }
    }

    const staleIds = new Set<string>()
    for (const r of allReminders) {
      if (r.type === 'appointment') continue
      const userVehicleIds = new Set(userVehicles.map((v) => v.id))
      if (!userVehicleIds.has(r.vehicleId)) continue
      const rKey = mergeKey(r)
      if (r.priority === 'low' || !desiredKeys.has(rKey)) staleIds.add(r.id)
    }

    const kept = allReminders.filter((r) => !staleIds.has(r.id))
    const newReminders: Reminder[] = pendingNew.map((p) => ({
      ...p.reminder,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    }))

    const merged = [...kept, ...newReminders]
    writeToStorage(merged)
    set({ reminders: merged.filter((r) => userVehicles.some((v) => v.id === r.vehicleId)) })
  },
}))
