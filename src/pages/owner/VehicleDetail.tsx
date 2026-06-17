import { useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit3, Trash2, Wrench, AlertTriangle, Shield, FileCheck } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useVehicleStore } from '@/store/useVehicleStore'
import { useServiceStore } from '@/store/useServiceStore'
import { useReminderStore } from '@/store/useReminderStore'

function getExpiryStatus(dateStr?: string): { label: string; color: string; bg: string } {
  if (!dateStr) return { label: '未设置', color: 'text-gray-400', bg: 'bg-gray-50' }
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return { label: '已过期', color: 'text-[#EF4444]', bg: 'bg-red-50' }
  if (diff <= 30) return { label: '即将到期', color: 'text-[#F59E0B]', bg: 'bg-amber-50' }
  return { label: '正常', color: 'text-[#10B981]', bg: 'bg-emerald-50' }
}

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuthStore()
  const { vehicles, loadVehicles, deleteVehicle } = useVehicleStore()
  const { records, loadRecords } = useServiceStore()
  const { reminders, loadReminders } = useReminderStore()

  useEffect(() => {
    if (currentUser?.id) {
      loadVehicles(currentUser.id)
      loadReminders(currentUser.id)
    }
    if (id) loadRecords(id)
  }, [currentUser?.id, id, loadVehicles, loadReminders, loadRecords])

  const vehicle = vehicles.find((v) => v.id === id)
  const vehicleRecords = useMemo(
    () => [...records].sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()),
    [records]
  )
  const vehicleReminders = reminders.filter((r) => r.vehicleId === id)

  const costSummary = useMemo(() => {
    const total = vehicleRecords.reduce((sum, r) => sum + r.cost, 0)
    const maintenance = vehicleRecords.filter((r) => r.type === 'maintenance').reduce((sum, r) => sum + r.cost, 0)
    const repair = vehicleRecords.filter((r) => r.type === 'repair').reduce((sum, r) => sum + r.cost, 0)
    return { total, maintenance, repair }
  }, [vehicleRecords])

  if (!vehicle) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">车辆不存在</p>
        <button onClick={() => navigate('/owner/vehicles')} className="mt-4 text-accent hover:underline text-sm">
          返回车辆列表
        </button>
      </div>
    )
  }

  const insuranceStatus = getExpiryStatus(vehicle.insuranceExpiry)
  const inspectionStatus = getExpiryStatus(vehicle.inspectionExpiry)

  const handleDelete = () => {
    if (confirm('确定要删除这辆车吗？相关服务记录将保留。')) {
      deleteVehicle(vehicle.id)
      navigate('/owner/vehicles')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/owner/vehicles')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold text-primary">{vehicle.brand} {vehicle.model}</h1>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl">
            {vehicle.brand[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary">{vehicle.brand} {vehicle.model}</h2>
            <p className="text-gray-400">{vehicle.plateNumber || '未上牌'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-400 block">当前里程</span><span className="font-medium text-primary">{vehicle.currentMileage.toLocaleString()} km</span></div>
          <div><span className="text-gray-400 block">购买日期</span><span className="font-medium text-primary">{vehicle.purchaseDate || '未记录'}</span></div>
          <div>
            <span className="text-gray-400 block flex items-center gap-1"><Shield size={12} /> 保险到期</span>
            <span className={`font-medium ${insuranceStatus.color}`}>{vehicle.insuranceExpiry || '未设置'} ({insuranceStatus.label})</span>
          </div>
          <div>
            <span className="text-gray-400 block flex items-center gap-1"><FileCheck size={12} /> 年检到期</span>
            <span className={`font-medium ${inspectionStatus.color}`}>{vehicle.inspectionExpiry || '未设置'} ({inspectionStatus.label})</span>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors">
            <Edit3 size={16} /> 编辑
          </button>
          <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-sm border border-[#EF4444] text-[#EF4444] rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 size={16} /> 删除
          </button>
        </div>
      </div>

      {vehicleReminders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
            <AlertTriangle size={20} className="text-[#F59E0B]" /> 提醒事项
          </h2>
          <div className="space-y-2">
            {vehicleReminders.map((r) => {
              const isHigh = r.priority === 'high'
              return (
                <div key={r.id} className={`flex items-start gap-3 p-3 rounded-lg ${isHigh ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <AlertTriangle size={16} className={isHigh ? 'text-[#EF4444] mt-0.5' : 'text-[#F59E0B] mt-0.5'} />
                  <div>
                    <p className="font-medium text-sm">{r.title}</p>
                    {r.message && <p className="text-xs text-gray-500 mt-0.5">{r.message}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
          <Wrench size={20} /> 维修保养记录
        </h2>
        {vehicleRecords.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">暂无服务记录</div>
        ) : (
          <div className="relative pl-6 border-l-2 border-gray-200 space-y-6">
            {vehicleRecords.map((r) => (
              <div key={r.id} className="relative">
                <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 ${
                  r.type === 'maintenance' ? 'bg-[#10B981] border-[#10B981]' : 'bg-[#EF4444] border-[#EF4444]'
                }`} />
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">{r.serviceDate}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.type === 'maintenance'
                        ? 'bg-emerald-100 text-[#10B981]'
                        : 'bg-red-100 text-[#EF4444]'
                    }`}>
                      {r.type === 'maintenance' ? '保养' : '维修'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {r.items.map((item, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">里程: {r.mileage.toLocaleString()} km</span>
                    <span className="font-semibold text-primary">¥{r.cost.toLocaleString()}</span>
                  </div>
                  {r.storeName && <p className="text-xs text-gray-400 mt-1">{r.storeName}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {vehicleRecords.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-primary mb-3">费用统计</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-1">总费用</p>
              <p className="text-xl font-bold text-primary">¥{costSummary.total.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-1">保养费用</p>
              <p className="text-xl font-bold text-[#10B981]">¥{costSummary.maintenance.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-1">维修费用</p>
              <p className="text-xl font-bold text-[#EF4444]">¥{costSummary.repair.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
