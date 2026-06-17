import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppointmentStore } from '@/store/useAppointmentStore'
import { useVehicleStore } from '@/store/useVehicleStore'
import { useStoreStore } from '@/store/useStoreStore'
import type { Appointment, AppointmentStatus } from '@/types'

const TABS: { key: AppointmentStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'in_progress', label: '进行中' },
  { key: 'completed', label: '已完成' },
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
  pending: '待确认', confirmed: '已确认', in_progress: '进行中',
  completed: '已完成', cancelled: '已取消', rejected: '已拒绝',
}

const SERVICE_OPTIONS = ['换机油', '换刹车片', '换空调滤芯', '换轮胎', '常规保养', '更换电瓶', '四轮定位', '更换火花塞']

const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']

export default function Appointments() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preStoreId = searchParams.get('storeId')
  const { currentUser } = useAuthStore()
  const { appointments, loadAppointments, addAppointment } = useAppointmentStore()
  const { vehicles, loadVehicles } = useVehicleStore()
  const { stores, loadStores } = useStoreStore()

  const [tab, setTab] = useState<AppointmentStatus | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedVehicle, setSelectedVehicle] = useState('')
  const [selectedStore, setSelectedStore] = useState(preStoreId || '')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [date, setDate] = useState('')
  const [timeSlot, setTimeSlot] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (currentUser?.id) {
      loadAppointments(currentUser.id)
      loadVehicles(currentUser.id)
    }
    loadStores()
  }, [currentUser?.id, loadAppointments, loadVehicles, loadStores])

  const filtered = tab === 'all' ? appointments : appointments.filter((a) => a.status === tab)

  const getVehicleName = (vid: string) => {
    const v = vehicles.find((x) => x.id === vid)
    return v ? `${v.brand} ${v.model} ${v.plateNumber || ''}`.trim() : vid
  }
  const getStoreName = (sid: string) => stores.find((s) => s.id === sid)?.name || sid

  const toggleItem = (item: string) =>
    setSelectedItems((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item])

  const canNext = () => {
    if (step === 1) return !!selectedVehicle
    if (step === 2) return !!selectedStore && selectedItems.length > 0
    if (step === 3) return !!date && !!timeSlot
    return false
  }

  const handleSubmit = () => {
    if (!currentUser?.id || !canNext()) return
    const apt: Appointment = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      vehicleId: selectedVehicle, storeId: selectedStore, userId: currentUser.id,
      serviceType: selectedItems[0], items: selectedItems,
      appointmentDate: date, timeSlot, status: 'pending', notes: notes || undefined,
      createdAt: new Date().toISOString(),
    }
    addAppointment(apt)
    setShowModal(false)
    setStep(1); setSelectedVehicle(''); setSelectedStore(preStoreId || '')
    setSelectedItems([]); setDate(''); setTimeSlot(''); setNotes('')
  }

  const resetModal = () => {
    setShowModal(false); setStep(1); setSelectedVehicle('')
    setSelectedStore(preStoreId || ''); setSelectedItems([])
    setDate(''); setTimeSlot(''); setNotes('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">我的预约</h1>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium">
          <Plus size={18} /> 新建预约
        </button>
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
          <p className="text-lg">暂无预约</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} onClick={() => navigate(`/owner/appointments/${a.id}`)}
              className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-primary">{getStoreName(a.storeId)}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{getVehicleName(a.vehicleId)}</p>
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
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{a.appointmentDate} {a.timeSlot}</span>
                {a.notes && <span className="text-gray-400 truncate ml-2 max-w-[160px]">{a.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={resetModal} />
          <div className="relative w-full max-w-md bg-white shadow-xl h-full overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-primary">新建预约</h2>
              <button onClick={resetModal} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-0 p-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    s < step ? 'bg-[#10B981] text-white' : s === step ? 'bg-accent text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {s < step ? <Check size={16} /> : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-[#10B981]' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>

            <div className="px-5 pb-6">
              {step === 1 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-700 mb-2">选择车辆</h3>
                  {vehicles.length === 0 ? (
                    <p className="text-gray-400 text-sm">暂无车辆，请先添加</p>
                  ) : vehicles.map((v) => (
                    <div key={v.id} onClick={() => setSelectedVehicle(v.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedVehicle === v.id ? 'border-accent bg-accent-50 ring-1 ring-accent/30' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className="font-medium text-primary">{v.brand} {v.model}</span>
                      <span className="text-sm text-gray-500 ml-2">{v.plateNumber || '未上牌'}</span>
                    </div>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">选择门店</h3>
                    <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none">
                      <option value="">请选择门店</option>
                      {stores.map((s) => <option key={s.id} value={s.id}>{s.name} - {s.address}</option>)}
                    </select>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">选择服务项目</h3>
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_OPTIONS.map((item) => (
                        <button key={item} onClick={() => toggleItem(item)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            selectedItems.includes(item) ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">选择日期</h3>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">选择时段</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {TIME_SLOTS.map((t) => (
                        <button key={t} onClick={() => setTimeSlot(t)}
                          className={`py-2 rounded-lg text-sm transition-colors ${
                            timeSlot === t ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">备注</h3>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                      placeholder="请输入备注信息（可选）"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 pb-6">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium text-sm">
                  <ChevronLeft size={16} /> 上一步
                </button>
              )}
              {step < 3 ? (
                <button onClick={() => canNext() && setStep(step + 1)} disabled={!canNext()}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  下一步 <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={!canNext()}
                  className="flex-1 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  提交预约
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
