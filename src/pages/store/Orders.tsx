import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useStoreStore } from '@/store/useStoreStore'
import { useAppointmentStore } from '@/store/useAppointmentStore'
import { useVehicleStore } from '@/store/useVehicleStore'
import type { AppointmentStatus } from '@/types'

const TABS: { key: AppointmentStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'in_progress', label: '维修中' },
  { key: 'completed', label: '已完成' },
  { key: 'rejected', label: '已拒绝' },
  { key: 'cancelled', label: '已取消' },
]

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待确认', confirmed: '已确认', in_progress: '维修中',
  completed: '已完成', cancelled: '已取消', rejected: '已拒绝',
}

export default function Orders() {
  const navigate = useNavigate()
  const { stores, loadStores } = useStoreStore()
  const { appointments, loadAppointments } = useAppointmentStore()
  const { vehicles, loadVehicles } = useVehicleStore()

  const [tab, setTab] = useState<AppointmentStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadStores()
  }, [loadStores])

  const storeId = stores[0]?.id

  useEffect(() => {
    if (storeId) {
      loadAppointments(undefined, storeId)
    }
  }, [storeId, loadAppointments])

  useEffect(() => {
    const userIds = [...new Set(appointments.map((a) => a.userId))]
    userIds.forEach((uid) => loadVehicles(uid))
  }, [appointments])

  const getVehicleInfo = (vid: string) => {
    const v = vehicles.find((x) => x.id === vid)
    return v ? `${v.brand} ${v.model}` : vid
  }

  const getPlateNumber = (vid: string) => {
    const v = vehicles.find((x) => x.id === vid)
    return v?.plateNumber || ''
  }

  const getCustomerName = (uid: string) => {
    const v = vehicles.find((x) => x.userId === uid)
    return v ? `车主${uid.slice(-4)}` : uid
  }

  let filtered = tab === 'all' ? appointments : appointments.filter((a) => a.status === tab)

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    filtered = filtered.filter((a) => {
      const vInfo = getVehicleInfo(a.vehicleId).toLowerCase()
      const plate = getPlateNumber(a.vehicleId).toLowerCase()
      const items = a.items.join(' ').toLowerCase()
      const customer = getCustomerName(a.userId).toLowerCase()
      return vInfo.includes(q) || plate.includes(q) || items.includes(q) || customer.includes(q)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-primary">工单管理</h1>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索客户/车辆/服务..."
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none w-56"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              tab === t.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          <p className="text-lg">暂无工单</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id}
              onClick={() => navigate(`/store/orders/${a.id}`)}
              className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm text-gray-500">{a.appointmentDate}</span>
                    <span className="text-sm text-gray-400">{a.timeSlot}</span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_BADGE[a.status]}`}>
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-400">客户</p>
                  <p className="text-sm font-medium text-primary truncate">{getCustomerName(a.userId)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">车辆</p>
                  <p className="text-sm font-medium text-primary truncate">{getVehicleInfo(a.vehicleId)}</p>
                  <p className="text-xs text-gray-400">{getPlateNumber(a.vehicleId)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">服务项目</p>
                  <p className="text-sm text-primary truncate">{a.items.join('、')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">时段</p>
                  <p className="text-sm text-primary">{a.timeSlot}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
