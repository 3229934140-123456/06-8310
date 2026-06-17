import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, Wrench, ThumbsUp, ClipboardList } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useStoreStore } from '@/store/useStoreStore'
import { useAppointmentStore } from '@/store/useAppointmentStore'
import { useReviewStore } from '@/store/useReviewStore'
import { useVehicleStore } from '@/store/useVehicleStore'

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

export default function StoreHome() {
  const { currentUser } = useAuthStore()
  const { stores, loadStores } = useStoreStore()
  const { appointments, loadAppointments, updateStatus } = useAppointmentStore()
  const { reviews, loadReviews } = useReviewStore()
  const { vehicles, loadVehicles } = useVehicleStore()

  useEffect(() => {
    loadStores()
  }, [loadStores])

  const myStore = stores[0]
  const storeId = myStore?.id

  useEffect(() => {
    if (storeId) {
      loadAppointments(undefined, storeId)
      loadReviews(storeId)
    }
  }, [storeId, loadAppointments, loadReviews])

  useEffect(() => {
    const userIds = [...new Set(appointments.map((a) => a.userId))]
    userIds.forEach((uid) => loadVehicles(uid))
  }, [appointments])

  const today = new Date().toISOString().slice(0, 10)
  const todayApts = appointments.filter(
    (a) => a.appointmentDate === today && a.status !== 'cancelled' && a.status !== 'rejected'
  )
  const todayPendingConfirmed = todayApts.filter(
    (a) => a.status === 'pending' || a.status === 'confirmed'
  )

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const completedThisMonth = appointments.filter(
    (a) => a.status === 'completed' && a.appointmentDate >= monthStart
  )

  const totalReviews = reviews.length
  const goodReviews = reviews.filter((r) => r.rating >= 4).length
  const goodRate = totalReviews > 0 ? Math.round((goodReviews / totalReviews) * 100) : 0

  const getVehicleInfo = (vid: string) => {
    const v = vehicles.find((x) => x.id === vid)
    return v ? `${v.brand} ${v.model}` : vid
  }

  const handleConfirm = (id: string) => updateStatus(id, 'confirmed')
  const handleReject = (id: string) => updateStatus(id, 'rejected')
  const handleStart = (id: string) => updateStatus(id, 'in_progress')
  const handleComplete = (id: string) => updateStatus(id, 'completed')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">门店管理</h1>
        <p className="text-gray-500 mt-1">{myStore?.name || '加载中...'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
              <CalendarCheck size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">今日预约数</p>
              <p className="text-2xl font-bold text-primary">{todayPendingConfirmed.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
              <Wrench size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">本月完工数</p>
              <p className="text-2xl font-bold text-primary">{completedThisMonth.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <ThumbsUp size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">好评率</p>
              <p className="text-2xl font-bold text-primary">{goodRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-primary">今日预约</h2>
          <Link to="/store/orders" className="text-sm text-accent hover:underline flex items-center gap-1">
            <ClipboardList size={14} />
            查看全部工单
          </Link>
        </div>
        {todayApts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            <CalendarCheck size={48} className="mx-auto mb-3 opacity-30" />
            <p>今日暂无预约</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayApts.map((a) => (
              <div key={a.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-primary">{getVehicleInfo(a.vehicleId)}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{a.timeSlot}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[a.status]}`}>
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {a.items.map((item) => (
                    <span key={item} className="text-xs px-2 py-0.5 rounded-full bg-primary/5 text-primary/70">{item}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {a.status === 'pending' && (
                    <>
                      <button onClick={() => handleConfirm(a.id)}
                        className="px-4 py-1.5 text-sm font-medium rounded-lg bg-[#10B981] text-white hover:bg-emerald-600 transition-colors">
                        确认
                      </button>
                      <button onClick={() => handleReject(a.id)}
                        className="px-4 py-1.5 text-sm font-medium rounded-lg bg-[#EF4444] text-white hover:bg-red-600 transition-colors">
                        拒绝
                      </button>
                    </>
                  )}
                  {a.status === 'confirmed' && (
                    <button onClick={() => handleStart(a.id)}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg bg-[#F59E0B] text-white hover:bg-amber-600 transition-colors">
                      开始维修
                    </button>
                  )}
                  {a.status === 'in_progress' && (
                    <button onClick={() => handleComplete(a.id)}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                      完工
                    </button>
                  )}
                  {a.status === 'completed' && (
                    <Link to={`/store/orders/${a.id}`}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                      查看详情
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
