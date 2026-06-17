import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, Car, ClipboardList, Bell, MapPin, Calendar, LogOut, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useReminderStore } from '@/store/useReminderStore'
import { useAppointmentStore } from '@/store/useAppointmentStore'
import type { ReminderType, ReminderPriority } from '@/types'

const navItems = [
  { to: '/owner', icon: Home, label: '首页', end: true },
  { to: '/owner/vehicles', icon: Car, label: '我的车辆', end: false },
  { to: '/owner/records', icon: ClipboardList, label: '服务记录', end: false },
  { to: '/owner/reminders', icon: Bell, label: '提醒中心', end: false },
  { to: '/owner/stores', icon: MapPin, label: '搜索门店', end: false },
  { to: '/owner/appointments', icon: Calendar, label: '我的预约', end: false },
]

const PRIORITY_BAR: Record<ReminderPriority, string> = {
  high: 'bg-red-500',
  medium: 'bg-orange-400',
  low: 'bg-emerald-500',
}

const TYPE_LABEL: Record<ReminderType, string> = {
  maintenance: '保养',
  insurance: '保险',
  inspection: '年检',
  appointment: '预约',
}

export default function OwnerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { currentUser, logout } = useAuthStore()
  const { reminders, loadReminders, markAsRead } = useReminderStore()
  const { loadAppointments } = useAppointmentStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser?.id) {
      loadAppointments(currentUser.id)
      loadReminders(currentUser.id)
    }
  }, [currentUser?.id, loadAppointments, loadReminders])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = reminders.filter((r) => !r.isRead).length
  const recentReminders = [...reminders]
    .sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
      const po: Record<string, number> = { high: 0, medium: 1, low: 2 }
      return po[a.priority] - po[b.priority]
    })
    .slice(0, 5)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNotifClick = (r: typeof reminders[0]) => {
    if (!r.isRead) markAsRead(r.id)
    setNotifOpen(false)
    if (r.type === 'appointment' && r.appointmentId) {
      navigate(`/owner/appointments/${r.appointmentId}`)
    } else if (r.type === 'maintenance') {
      navigate('/owner/appointments?vehicleId=' + r.vehicleId)
    } else {
      navigate('/owner/reminders')
    }
  }

  const sidebar = (
    <aside className="w-64 min-h-screen bg-primary text-white flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <span className="text-xl font-bold font-display tracking-wide">AutoCare</span>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-accent text-primary font-semibold border-l-4 border-accent'
                  : 'text-white/80 hover:bg-white/10 hover:text-white border-l-4 border-transparent'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )

  return (
    <div className="flex min-h-screen bg-[#F3F4F6]">
      <div className="hidden md:flex md:shrink-0">{sidebar}</div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 animate-slide-in">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-primary"
              onClick={() => setSidebarOpen(true)}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="text-sm text-gray-500">
              你好，<span className="font-medium text-primary">{currentUser?.name || '车主'}</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-slide-in">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-semibold text-primary text-sm">通知</span>
                    {unreadCount > 0 && (
                      <span className="text-xs text-accent">{unreadCount}条未读</span>
                    )}
                  </div>
                  {recentReminders.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">暂无通知</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto scrollbar-thin">
                      {recentReminders.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => handleNotifClick(r)}
                          className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                            !r.isRead ? 'bg-accent-50/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_BAR[r.priority]}`} />
                            <span className={`text-sm font-medium truncate ${!r.isRead ? 'text-primary' : 'text-gray-600'}`}>
                              {r.title}
                            </span>
                            {!r.isRead && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 ml-auto" />}
                          </div>
                          {r.message && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2 ml-3.5">{r.message}</p>
                          )}
                          <div className="text-xs text-gray-300 mt-1 ml-3.5">{TYPE_LABEL[r.type]}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                    <button
                      onClick={() => { setNotifOpen(false); navigate('/owner/reminders') }}
                      className="text-xs text-accent hover:text-accent-600 font-medium w-full text-center"
                    >
                      查看全部提醒
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">退出</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
