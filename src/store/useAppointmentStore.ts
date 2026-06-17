import { create } from 'zustand'
import type { Appointment, AppointmentStatus, TimelineEntry, AppointmentMessage, CostItem, ServiceRecord } from '@/types'

interface AppointmentState {
  appointments: Appointment[]
  loadAppointments: (userId?: string, storeId?: string) => void
  addAppointment: (apt: Appointment) => void
  updateStatus: (id: string, status: AppointmentStatus) => void
  uploadReport: (id: string, reportText: string, reportImages: string[], invoiceImages: string[], append?: boolean) => void
  deleteImage: (id: string, type: 'report' | 'invoice', index: number) => void
  replaceImage: (id: string, type: 'report' | 'invoice', index: number, newData: string) => void
  addMessage: (id: string, message: AppointmentMessage) => void
  markReviewed: (id: string, reviewId: string) => void
  addCostItem: (id: string, item: CostItem) => void
  updateCostItem: (id: string, itemId: string, changes: Partial<CostItem>) => void
  deleteCostItem: (id: string, itemId: string) => void
}

const STORAGE_KEY = 'autoCare_appointments'
const REMINDERS_KEY = 'autoCare_reminders'
const STORES_KEY = 'autoCare_stores'
const VEHICLES_KEY = 'autoCare_vehicles'
const RECORDS_KEY = 'autoCare_serviceRecords'

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

function readRecords(): ServiceRecord[] {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]')
  } catch { return [] }
}

function writeRecords(records: ServiceRecord[]) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
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

const STATUS_ORDER: Record<string, number> = {
  pending: 0, confirmed: 1, in_progress: 2, report_uploaded: 3, completed: 4, reviewed: 5,
}

function backfillTimeline(apt: Appointment): TimelineEntry[] {
  if (apt.timeline && apt.timeline.length > 0) {
    let tl = apt.timeline
    const hasReport = tl.some((t) => t.status === 'report_uploaded')
    const hasReview = tl.some((t) => t.status === 'reviewed')
    const needsReport = (apt.reportText && apt.reportText.trim()) || (apt.reportImages && apt.reportImages.length > 0) || (apt.invoiceImages && apt.invoiceImages.length > 0)

    if (needsReport && !hasReport) {
      const completedEntry = tl.find((t) => t.status === 'completed')
      const insertAt = completedEntry ? tl.indexOf(completedEntry) : tl.length
      const timestamp = completedEntry ? new Date(new Date(completedEntry.timestamp).getTime() - 3600000).toISOString() : new Date().toISOString()
      tl = [...tl.slice(0, insertAt), { status: 'report_uploaded', timestamp }, ...tl.slice(insertAt)]
    }
    if (apt.reviewedAt && !hasReview) {
      tl = [...tl, { status: 'reviewed', timestamp: apt.reviewedAt, detail: apt.reviewId }]
    }
    return tl
  }

  const now = new Date().toISOString()
  const created = apt.createdAt || now
  const createdDate = new Date(created)
  const entries: TimelineEntry[] = [{ status: 'pending', timestamp: created }]

  const addHours = (date: Date, h: number) => new Date(date.getTime() + h * 3600000).toISOString()

  const hasReportContent = (apt.reportText && apt.reportText.trim()) || (apt.reportImages && apt.reportImages.length > 0) || (apt.invoiceImages && apt.invoiceImages.length > 0)

  if (apt.status === 'confirmed' || apt.status === 'in_progress' || apt.status === 'completed') {
    entries.push({ status: 'confirmed', timestamp: addHours(createdDate, 2) })
  }
  if (apt.status === 'in_progress' || apt.status === 'completed') {
    entries.push({ status: 'in_progress', timestamp: addHours(createdDate, 24) })
  }
  if (hasReportContent) {
    entries.push({ status: 'report_uploaded', timestamp: addHours(createdDate, 30) })
  }
  if (apt.status === 'completed') {
    entries.push({ status: 'completed', timestamp: addHours(createdDate, 36) })
  }
  if (apt.reviewedAt) {
    entries.push({ status: 'reviewed', timestamp: apt.reviewedAt, detail: apt.reviewId })
  }
  if (!apt.reviewedAt) {
    const existingReviews = JSON.parse(localStorage.getItem('autoCare_reviews') || '[]')
    const review = existingReviews.find((r: any) => r.appointmentId === apt.id)
    if (review) {
      entries.push({ status: 'reviewed', timestamp: review.createdAt, detail: review.id })
      apt.reviewedAt = review.createdAt
      apt.reviewId = review.id
    }
  }

  return entries
}

function createServiceRecordFromAppointment(apt: Appointment): boolean {
  const existing = readRecords()
  if (existing.some((r) => r.sourceAppointmentId === apt.id)) return false

  const stores = JSON.parse(localStorage.getItem(STORES_KEY) || '[]')
  const vehicles = JSON.parse(localStorage.getItem(VEHICLES_KEY) || '[]')
  const store = stores.find((s: any) => s.id === apt.storeId)
  const vehicle = vehicles.find((v: any) => v.id === apt.vehicleId)
  const totalCost = (apt.costItems || []).reduce((sum, item) => sum + item.amount, 0)

  const record: ServiceRecord = {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    vehicleId: apt.vehicleId,
    storeId: apt.storeId,
    type: apt.serviceType === '维修' ? 'repair' : 'maintenance',
    items: apt.items,
    cost: totalCost || 0,
    mileage: vehicle?.currentMileage || 0,
    serviceDate: apt.appointmentDate,
    storeName: store?.name,
    sourceAppointmentId: apt.id,
    reportImages: apt.reportImages,
    invoiceImages: apt.invoiceImages,
    reportText: apt.reportText,
  }

  existing.push(record)
  writeRecords(existing)
  return true
}

function ensureTimeline(apt: Appointment): Appointment {
  const timeline = backfillTimeline(apt)
  if (timeline !== apt.timeline) return { ...apt, timeline }
  return apt
}

function updateInList(list: Appointment[], id: string, updater: (a: Appointment) => Appointment): Appointment[] {
  return list.map((a) => a.id === id ? updater(ensureTimeline(a)) : a)
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],

  loadAppointments: (userId?: string, storeId?: string) => {
    let all = readFromStorage().map(ensureTimeline)
    if (userId) all = all.filter((a) => a.userId === userId)
    if (storeId) all = all.filter((a) => a.storeId === storeId)
    writeToStorage(readFromStorage().map(ensureTimeline))
    set({ appointments: all })
    generateTodayAppointmentReminders()
  },

  addAppointment: (apt: Appointment) => {
    const withTimeline: Appointment = {
      ...apt,
      timeline: [{ status: 'pending', timestamp: apt.createdAt || new Date().toISOString() }],
      messages: apt.messages || [],
      costItems: apt.costItems || [],
    }
    const all = readFromStorage()
    all.push(withTimeline)
    writeToStorage(all)
    set((state) => ({ appointments: [...state.appointments, withTimeline] }))
  },

  updateStatus: (id: string, status: AppointmentStatus) => {
    const all = readFromStorage()
    const entry: TimelineEntry = { status, timestamp: new Date().toISOString() }
    const updated = updateInList(all, id, (a) => {
      addAppointmentReminder(a, status)
      if (status === 'completed') {
        setTimeout(() => createServiceRecordFromAppointment({ ...a, status, timeline: [...(a.timeline || []), entry] }), 0)
      }
      return { ...a, status, timeline: [...(a.timeline || []), entry] }
    })
    writeToStorage(updated)
    set((state) => ({
      appointments: updateInList(state.appointments, id, (a) => ({ ...a, status, timeline: [...(a.timeline || []), entry] })),
    }))
  },

  uploadReport: (id: string, reportText: string, reportImages: string[], invoiceImages: string[], append?: boolean) => {
    const all = readFromStorage()
    const current = all.find((a) => a.id === id)
    const hasReportEntry = current?.timeline?.some((t) => t.status === 'report_uploaded')
    const timelineEntry: TimelineEntry | null = hasReportEntry ? null : { status: 'report_uploaded', timestamp: new Date().toISOString() }

    const updated = updateInList(all, id, (a) => {
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
      appointments: updateInList(state.appointments, id, (a) => {
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

  deleteImage: (id: string, type: 'report' | 'invoice', index: number) => {
    const key = type === 'report' ? 'reportImages' : 'invoiceImages'
    const all = readFromStorage()
    const updated = updateInList(all, id, (a) => {
      const images = [...(a[key] || [])]
      images.splice(index, 1)
      return { ...a, [key]: images }
    })
    writeToStorage(updated)
    set((state) => ({
      appointments: updateInList(state.appointments, id, (a) => {
        const images = [...(a[key] || [])]
        images.splice(index, 1)
        return { ...a, [key]: images }
      }),
    }))
  },

  replaceImage: (id: string, type: 'report' | 'invoice', index: number, newData: string) => {
    const key = type === 'report' ? 'reportImages' : 'invoiceImages'
    const all = readFromStorage()
    const updated = updateInList(all, id, (a) => {
      const images = [...(a[key] || [])]
      images[index] = newData
      return { ...a, [key]: images }
    })
    writeToStorage(updated)
    set((state) => ({
      appointments: updateInList(state.appointments, id, (a) => {
        const images = [...(a[key] || [])]
        images[index] = newData
        return { ...a, [key]: images }
      }),
    }))
  },

  addMessage: (id: string, message: AppointmentMessage) => {
    const all = readFromStorage()
    const updated = updateInList(all, id, (a) => ({
      ...a,
      messages: [...(a.messages || []), message],
    }))
    writeToStorage(updated)
    set((state) => ({
      appointments: updateInList(state.appointments, id, (a) => ({
        ...a,
        messages: [...(a.messages || []), message],
      })),
    }))
  },

  markReviewed: (id: string, reviewId: string) => {
    const now = new Date().toISOString()
    const all = readFromStorage()
    const updated = updateInList(all, id, (a) => ({
      ...a,
      reviewedAt: now,
      reviewId,
      timeline: [...(a.timeline || []), { status: 'reviewed' as const, timestamp: now, detail: reviewId }],
    }))
    writeToStorage(updated)
    set((state) => ({
      appointments: updateInList(state.appointments, id, (a) => ({
        ...a,
        reviewedAt: now,
        reviewId,
        timeline: [...(a.timeline || []), { status: 'reviewed' as const, timestamp: now, detail: reviewId }],
      })),
    }))
  },

  addCostItem: (id: string, item: CostItem) => {
    const all = readFromStorage()
    const updated = updateInList(all, id, (a) => ({
      ...a,
      costItems: [...(a.costItems || []), item],
    }))
    writeToStorage(updated)
    set((state) => ({
      appointments: updateInList(state.appointments, id, (a) => ({
        ...a,
        costItems: [...(a.costItems || []), item],
      })),
    }))
  },

  updateCostItem: (id: string, itemId: string, changes: Partial<CostItem>) => {
    const all = readFromStorage()
    const updated = updateInList(all, id, (a) => ({
      ...a,
      costItems: (a.costItems || []).map((item) => item.id === itemId ? { ...item, ...changes } : item),
    }))
    writeToStorage(updated)
    set((state) => ({
      appointments: updateInList(state.appointments, id, (a) => ({
        ...a,
        costItems: (a.costItems || []).map((item) => item.id === itemId ? { ...item, ...changes } : item),
      })),
    }))
  },

  deleteCostItem: (id: string, itemId: string) => {
    const all = readFromStorage()
    const updated = updateInList(all, id, (a) => ({
      ...a,
      costItems: (a.costItems || []).filter((item) => item.id !== itemId),
    }))
    writeToStorage(updated)
    set((state) => ({
      appointments: updateInList(state.appointments, id, (a) => ({
        ...a,
        costItems: (a.costItems || []).filter((item) => item.id !== itemId),
      })),
    }))
  },
}))
