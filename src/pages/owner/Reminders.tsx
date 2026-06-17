import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, Shield, FileCheck, CheckCheck, Sparkles, Bell, Calendar } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useVehicleStore } from '@/store/useVehicleStore'
import { useReminderStore } from '@/store/useReminderStore'
import { useAppointmentStore } from '@/store/useAppointmentStore'
import type { ReminderType, ReminderPriority } from '@/types'

type TabFilter = '' | ReminderType
type SortMode = 'time' | 'unread'

const TAB_OPTIONS: { value: TabFilter; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'maintenance', label: '保养' },
  { value: 'insurance', label: '保险' },
  { value: 'inspection', label: '年检' },
  { value: 'appointment', label: '预约' },
]

const TYPE_ICON: Record<ReminderType, typeof Wrench> = {
  maintenance: Wrench,
  insurance: Shield,
  inspection: FileCheck,
  appointment: Calendar,
}

const TYPE_LABEL: Record<ReminderType, string> = {
  maintenance: '保养',
  insurance: '保险',
  inspection: '年检',
  appointment: '预约',
}

const PRIORITY_BAR: Record<ReminderPriority, string> = {
  high: 'bg-red-500',
  medium: 'bg-orange-400',
  low: 'bg-emerald-500',
}

const PRIORITY_LABEL: Record<ReminderPriority, string> = {
  high: '紧急',
  medium: '中等',
  low: '一般',
}

const PRIORITY_ORDER: Record<ReminderPriority, number> = { high: 0, medium: 1, low: 2 }

export default function Reminders() {
  const navigate = useNavigate()
  const { currentUser } = useAuthStore()
  const { vehicles, loadVehicles } = useVehicleStore()
  const { reminders, loadReminders, markAsRead, generateReminders } = useReminderStore()
  const { loadAppointments } = useAppointmentStore()
  const [tab, setTab] = useState<TabFilter>('')
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('unread')

  useEffect(() => {
    if (currentUser?.id) {
      loadVehicles(currentUser.id)
      loadAppointments(currentUser.id)
      loadReminders(currentUser.id)
      generateReminders(currentUser.id)
    }
  }, [currentUser?.id, loadVehicles, loadReminders, generateReminders, loadAppointments])

  const getVehicleName = (vid: string) => {
    const v = vehicles.find((x) => x.id === vid)
    return v ? `${v.brand} ${v.model}` : '未知车辆'
  }

  const filtered = reminders
    .filter((r) => {
      if (tab && r.type !== tab) return false
      if (vehicleFilter && r.vehicleId !== vehicleFilter) return false
      return true
    })
    .sort((a, b) => {
      if (sortMode === 'unread') {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      }
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    })

  const unreadCount = reminders.filter((r) => !r.isRead).length

  const handleMarkAllRead = () => {
    reminders.filter((r) => !r.isRead).forEach((r) => markAsRead(r.id))
  }

  const handleGenerate = () => {
    if (currentUser?.id) generateReminders(currentUser.id)
  }

  const handleReminderClick = (r: typeof reminders[0]) => {
    if (!r.isRead) markAsRead(r.id)
    if (r.type === 'appointment' && r.appointmentId) {
      navigate(`/owner/appointments/${r.appointmentId}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-primary">提醒中心</h1>
          {unreadCount > 0 && (
            <span className="flex items-center gap-1 bg-red-50 text-red-600 text-sm px-2.5 py-0.5 rounded-full font-medium">
              <Bell size={14} />
              {unreadCount}条未读
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <CheckCheck size={16} />
            标记全部已读
          </button>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium"
          >
            <Sparkles size={16} />
            生成提醒
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {TAB_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTab(opt.value)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                tab === opt.value
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-accent focus:border-accent outline-none"
        >
          <option value="">全部车辆</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.brand} {v.model} {v.plateNumber || ''}</option>
          ))}
        </select>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setSortMode('unread')}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
              sortMode === 'unread' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            未读优先
          </button>
          <button
            onClick={() => setSortMode('time')}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
              sortMode === 'time' ? 'bg-white text-primary shadow-sm' : 'text-gray-500'
            }`}
          >
            按优先级
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">暂无提醒</p>
          <p className="text-sm mt-1">点击"生成提醒"检查是否有需要关注的项</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const Icon = TYPE_ICON[r.type]
            const clickable = r.type === 'appointment' && r.appointmentId
            return (
              <div
                key={r.id}
                onClick={() => handleReminderClick(r)}
                className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${
                  !r.isRead ? 'ring-1 ring-accent-200' : ''
                } ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
              >
                <div className="flex">
                  <div className={`w-1.5 shrink-0 ${PRIORITY_BAR[r.priority]}`} />
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          r.type === 'maintenance'
                            ? 'bg-emerald-50 text-emerald-600'
                            : r.type === 'insurance'
                            ? 'bg-blue-50 text-blue-600'
                            : r.type === 'appointment'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-purple-50 text-purple-600'
                        }`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`font-medium ${r.isRead ? 'text-gray-700' : 'text-primary'}`}>
                              {r.title}
                            </h3>
                            {!r.isRead && (
                              <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                            )}
                            {clickable && (
                              <span className="text-xs text-accent">点击查看 →</span>
                            )}
                          </div>
                          {r.message && (
                            <p className="text-sm text-gray-500 mt-0.5">{r.message}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
                              r.priority === 'high'
                                ? 'bg-red-50 text-red-500'
                                : r.priority === 'medium'
                                ? 'bg-orange-50 text-orange-500'
                                : 'bg-emerald-50 text-emerald-500'
                            }`}>
                              {PRIORITY_LABEL[r.priority]}
                            </span>
                            <span>{TYPE_LABEL[r.type]}</span>
                            <span>{getVehicleName(r.vehicleId)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {r.dueDate && (
                          <span className="text-xs text-gray-400">到期：{r.dueDate}</span>
                        )}
                        {r.dueMileage && (
                          <span className="text-xs text-gray-400">里程：{r.dueMileage.toLocaleString()} km</span>
                        )}
                        <div className="flex gap-2">
                          {r.type === 'maintenance' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/owner/appointments?vehicleId=${r.vehicleId}`) }}
                              className="text-xs text-accent hover:text-accent-600 font-medium"
                            >
                              去预约
                            </button>
                          )}
                          {!r.isRead && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markAsRead(r.id) }}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              标记已读
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
