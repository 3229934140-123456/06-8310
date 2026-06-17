import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bell, Car, Plus, Search, ClipboardList, Shield, FileCheck, AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useVehicleStore } from '@/store/useVehicleStore'
import { useReminderStore } from '@/store/useReminderStore'
import type { ReminderPriority } from '@/types'

const priorityConfig: Record<ReminderPriority, { border: string; bg: string; icon: string }> = {
  high: { border: 'border-l-[#EF4444]', bg: 'bg-red-50', icon: 'text-[#EF4444]' },
  medium: { border: 'border-l-[#F59E0B]', bg: 'bg-amber-50', icon: 'text-[#F59E0B]' },
  low: { border: 'border-l-[#10B981]', bg: 'bg-emerald-50', icon: 'text-[#10B981]' },
}

function getExpiryStatus(dateStr?: string): { label: string; color: string } {
  if (!dateStr) return { label: '未设置', color: 'text-gray-400' }
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return { label: '已过期', color: 'text-[#EF4444]' }
  if (diff <= 30) return { label: '即将到期', color: 'text-[#F59E0B]' }
  return { label: '正常', color: 'text-[#10B981]' }
}

export default function OwnerHome() {
  const navigate = useNavigate()
  const { currentUser } = useAuthStore()
  const { vehicles, loadVehicles } = useVehicleStore()
  const { reminders, loadReminders } = useReminderStore()

  useEffect(() => {
    if (currentUser?.id) {
      loadVehicles(currentUser.id)
      loadReminders(currentUser.id)
    }
  }, [currentUser?.id, loadVehicles, loadReminders])

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  const urgentReminders = [...reminders]
    .sort((a, b) => {
      const order: Record<ReminderPriority, number> = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
    .slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">你好, {currentUser?.name || '车主'}</h1>
          <p className="text-gray-500 mt-1">{today}</p>
        </div>
      </div>

      {urgentReminders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
              <Bell size={20} className="text-[#F59E0B]" />
              提醒事项
            </h2>
            <Link to="/owner/reminders" className="text-sm text-accent hover:underline">查看全部</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {urgentReminders.map((r) => {
              const cfg = priorityConfig[r.priority]
              return (
                <div
                  key={r.id}
                  className={`border-l-4 ${cfg.border} ${cfg.bg} rounded-r-lg p-4 shadow-sm`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className={cfg.icon + ' mt-0.5 shrink-0'} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{r.title}</p>
                      {r.message && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
          <Car size={20} />
          我的车辆
        </h2>
        {vehicles.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            <Car size={48} className="mx-auto mb-3 opacity-30" />
            <p>暂无车辆，请添加您的爱车</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => {
              const maxMileage = 200000
              const mileagePercent = Math.min((v.currentMileage / maxMileage) * 100, 100)
              const insuranceStatus = getExpiryStatus(v.insuranceExpiry)
              const inspectionStatus = getExpiryStatus(v.inspectionExpiry)
              return (
                <div
                  key={v.id}
                  onClick={() => navigate(`/owner/vehicles/${v.id}`)}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {v.brand[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">{v.brand} {v.model}</h3>
                      <p className="text-xs text-gray-400">{v.plateNumber || '未上牌'}</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>当前里程</span>
                      <span>{v.currentMileage.toLocaleString()} km</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-accent rounded-full h-2 transition-all"
                        style={{ width: `${mileagePercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-50 ${insuranceStatus.color}`}>
                      <Shield size={12} />
                      保险 {insuranceStatus.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-50 ${inspectionStatus.color}`}>
                      <FileCheck size={12} />
                      年检 {inspectionStatus.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-primary mb-3">快捷操作</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/owner/vehicles', { state: { showAddModal: true } })}
            className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="w-10 h-10 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
              <Plus size={20} />
            </div>
            <span className="text-sm text-gray-700">添加车辆</span>
          </button>
          <button
            onClick={() => navigate('/owner/stores')}
            className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
              <Search size={20} />
            </div>
            <span className="text-sm text-gray-700">搜索门店</span>
          </button>
          <button
            onClick={() => navigate('/owner/records')}
            className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <ClipboardList size={20} />
            </div>
            <span className="text-sm text-gray-700">新增记录</span>
          </button>
        </div>
      </div>
    </div>
  )
}
