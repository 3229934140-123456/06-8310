import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, LogOut, Menu, X, Bell } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

const navItems = [
  { to: '/store', icon: LayoutDashboard, label: '首页', end: true },
  { to: '/store/orders', icon: ClipboardList, label: '工单管理', end: false },
]

export default function StoreLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { currentUser, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
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
              <span className="font-medium text-primary">{currentUser?.name || '门店'}</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Bell size={20} />
            </button>
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
