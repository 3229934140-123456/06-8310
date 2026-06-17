export type UserRole = 'owner' | 'store'

export interface User {
  id: string
  phone: string
  name: string
  role: UserRole
  avatar?: string
}

export interface Vehicle {
  id: string
  userId: string
  brand: string
  model: string
  plateNumber?: string
  purchaseDate?: string
  currentMileage: number
  insuranceExpiry?: string
  inspectionExpiry?: string
}

export type ServiceType = 'maintenance' | 'repair'

export interface ServiceRecord {
  id: string
  vehicleId: string
  storeId?: string
  type: ServiceType
  items: string[]
  cost: number
  mileage: number
  serviceDate: string
  storeName?: string
  sourceAppointmentId?: string
  reportImages?: string[]
  invoiceImages?: string[]
  reportText?: string
}

export type ReminderType = 'maintenance' | 'insurance' | 'inspection' | 'appointment'
export type ReminderPriority = 'high' | 'medium' | 'low'

export interface Reminder {
  id: string
  vehicleId: string
  type: ReminderType
  title: string
  message?: string
  dueDate?: string
  dueMileage?: number
  isRead: boolean
  priority: ReminderPriority
  appointmentId?: string
}

export interface Store {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  phone?: string
  services: string[]
  hours: string[]
  rating: number
  reviewCount: number
  image?: string
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'

export interface TimelineEntry {
  status: AppointmentStatus | 'report_uploaded' | 'reviewed'
  timestamp: string
  detail?: string
}

export interface AppointmentMessage {
  id: string
  senderRole: 'owner' | 'store'
  senderName: string
  content: string
  createdAt: string
}

export interface CostItem {
  id: string
  name: string
  type: 'material' | 'labor'
  amount: number
}

export interface Appointment {
  id: string
  vehicleId: string
  storeId: string
  userId: string
  serviceType: string
  items: string[]
  appointmentDate: string
  timeSlot: string
  status: AppointmentStatus
  notes?: string
  createdAt: string
  timeline?: TimelineEntry[]
  messages?: AppointmentMessage[]
  costItems?: CostItem[]
  reportText?: string
  reportImages?: string[]
  invoiceImages?: string[]
  reviewedAt?: string
  reviewId?: string
}

export interface Review {
  id: string
  appointmentId: string
  storeId: string
  userId: string
  rating: number
  comment?: string
  tags?: string[]
  createdAt: string
}
