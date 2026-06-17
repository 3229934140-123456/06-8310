import { create } from 'zustand'
import type { Appointment, AppointmentStatus, TimelineEntry } from '@/types'

interface AppointmentState {
  appointments: Appointment[]
  loadAppointments: (userId?: string, storeId?: string) => void
  addAppointment: (apt: Appointment) => void
  updateStatus: (id: string, status: AppointmentStatus) => void
  uploadReport: (id: string, reportText: string, reportImages: string[], invoiceImages: string[], append?: boolean) => void
}

const STORAGE_KEY = 'autoCare_appointments'
const REMINDERS_KEY = 'autoCare_reminders'
const STORES_KEY = 'autoCare_stores'
const VEHICLES_KEY = 'autoCare_vehicles'

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

function addAppointmentReminder(apt: Appointment, status: AppointmentStatus) {
  try {
    const stored = localStorage.getItem(REMINDERS_KEY)
    const reminders = stored ? JSON.parse(stored) : []
    const stores = JSON.parse(localStorage.getItem(STORES_KEY) || '[]')
    const vehicles = JSON.parse(localStorage.getItem(VEHICLES_KEY) || '[]')
    const storeName = stores.find((s: any) => s.id === apt.storeId)?.name || '门店'
    const vehicle = vehicles.find((v: any) => v.id === apt.vehicleId)
    const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : '车辆'

    const dedupKey = `${apt.id}_status_${status}`
    const exists = reminders.find((r: any) => r._dedupKey === dedupKey)
    if (exists) return

    let title = ''
    let message = ''
    let priority: string = 'medium'

    if (status === 'confirmed') {
      title = '预约已确认'
      message = `您在${storeName}的预约已确认，${vehicleName} ${apt.appointmentDate} ${apt.timeSlot}，请准时到店。`
      priority = 'medium'
    } else if (status === 'rejected') {
      title = '预约被拒绝'
      message = `${storeName}拒绝了您的预约请求，请重新选择门店或时间。`
      priority = 'high'
    } else if (status === 'completed') {
      title = '服务已完成'
      message = `${vehicleName}在${storeName}的服务已完成，请查看报告并对服务进行评价。`
      priority = 'medium'
    } else {
      return
    }

    reminders.push({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      vehicleId: apt.vehicleId,
      type: 'appointment',
      title,
      message,
      dueDate: apt.appointmentDate,
      isRead: false,
      priority,
      appointmentId: apt.id,
      _dedupKey: dedupKey,
    })
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders))
  } catch {}
}

function generateTodayAppointmentReminders() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const appointments = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const stores = JSON.parse(localStorage.getItem(STORES_KEY) || '[]')
    const vehicles = JSON.parse(localStorage.getItem(VEHICLES_KEY) || '[]')
    const reminders = JSON.parse(localStorage.getItem(REMINDERS_KEY) || '[]')

    const todayApts = appointments.filter((a: any) =>
      a.appointmentDate === today && (a.status === 'confirmed' || a.status === 'pending')
    )

    for (const apt of todayApts) {
      const dedupKey = `${apt.id}_today_reminder`
      if (reminders.find((r: any) => r._dedupKey === dedupKey)) continue

      const storeName = stores.find((s: any) => s.id === apt.storeId)?.name || '门店'
      const vehicle = vehicles.find((v: any) => v.id === apt.vehicleId)
      const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : '车辆'

      reminders.push({
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        vehicleId: apt.vehicleId,
        type: 'appointment',
        title: '今日预约提醒',
        message: `您今天${apt.timeSlot}在${storeName}有${vehicleName}的预约，请准时到店。`,
        dueDate: today,
        isRead: false,
        priority: 'high',
        appointmentId: apt.id,
        _dedupKey: dedupKey,
      })
    }
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders))
  } catch {}
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],

  loadAppointments: (userId?: string, storeId?: string) => {
    let all = readFromStorage()
    if (userId) all = all.filter((a) => a.userId === userId)
    if (storeId) all = all.filter((a) => a.storeId === storeId)
    set({ appointments: all })
    generateTodayAppointmentReminders()
  },

  addAppointment: (apt: Appointment) => {
    const withTimeline: Appointment = {
      ...apt,
      timeline: [{ status: 'pending', timestamp: apt.createdAt || new Date().toISOString() }],
    }
    const all = readFromStorage()
    all.push(withTimeline)
    writeToStorage(all)
    set((state) => ({ appointments: [...state.appointments, withTimeline] }))
  },

  updateStatus: (id: string, status: AppointmentStatus) => {
    const all = readFromStorage()
    const entry: TimelineEntry = { status, timestamp: new Date().toISOString() }
    const updated = all.map((a) => {
      if (a.id !== id) return a
      addAppointmentReminder(a, status)
      return { ...a, status, timeline: [...(a.timeline || []), entry] }
    })
    writeToStorage(updated)
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === id ? { ...a, status, timeline: [...(a.timeline || []), entry] } : a
      ),
    }))
  },

  uploadReport: (id: string, reportText: string, reportImages: string[], invoiceImages: string[], append?: boolean) => {
    const all = readFromStorage()
    const hasReportEntry = all.find((a) => a.id === id)?.timeline?.some((t) => t.status === 'report_uploaded')
    const timelineEntry: TimelineEntry | null = hasReportEntry ? null : { status: 'report_uploaded', timestamp: new Date().toISOString() }
    const updated = all.map((a) => {
      if (a.id !== id) return a
      const newTimeline = timelineEntry ? [...(a.timeline || []), timelineEntry] : a.timeline
      if (append) {
        return {
          ...a,
          reportText: reportText || a.reportText,
          reportImages: [...(a.reportImages || []), ...reportImages],
          invoiceImages: [...(a.invoiceImages || []), ...invoiceImages],
          timeline: newTimeline,
        }
      }
      return { ...a, reportText, reportImages, invoiceImages, timeline: newTimeline }
    })
    writeToStorage(updated)
    set((state) => ({
      appointments: state.appointments.map((a) => {
        if (a.id !== id) return a
        const newTimeline = timelineEntry ? [...(a.timeline || []), timelineEntry] : a.timeline
        if (append) {
          return {
            ...a,
            reportText: reportText || a.reportText,
            reportImages: [...(a.reportImages || []), ...reportImages],
            invoiceImages: [...(a.invoiceImages || []), ...invoiceImages],
            timeline: newTimeline,
          }
        }
        return { ...a, reportText, reportImages, invoiceImages, timeline: newTimeline }
      }),
    }))
  },
}))
