import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, X, Shield, FileCheck } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useVehicleStore } from '@/store/useVehicleStore'
import type { Vehicle } from '@/types'

const BRANDS = ['宝马', '奔驰', '奥迪', '丰田', '本田', '大众', '特斯拉', '蔚来', '比亚迪', '其他']

const BRAND_COLORS: Record<string, string> = {
  '宝马': 'bg-blue-100 text-blue-700',
  '奔驰': 'bg-gray-200 text-gray-700',
  '奥迪': 'bg-red-100 text-red-700',
  '丰田': 'bg-emerald-100 text-emerald-700',
  '本田': 'bg-indigo-100 text-indigo-700',
  '大众': 'bg-sky-100 text-sky-700',
  '特斯拉': 'bg-violet-100 text-violet-700',
  '蔚来': 'bg-cyan-100 text-cyan-700',
  '比亚迪': 'bg-amber-100 text-amber-700',
  '其他': 'bg-gray-100 text-gray-600',
}

function getExpiryStatus(dateStr?: string): { label: string; color: string } {
  if (!dateStr) return { label: '未设置', color: 'text-gray-400' }
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return { label: '已过期', color: 'text-[#EF4444]' }
  if (diff <= 30) return { label: '即将到期', color: 'text-[#F59E0B]' }
  return { label: '正常', color: 'text-[#10B981]' }
}

const emptyForm = {
  brand: '宝马',
  model: '',
  plateNumber: '',
  purchaseDate: '',
  currentMileage: '',
  insuranceExpiry: '',
  inspectionExpiry: '',
}

export default function Vehicles() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser } = useAuthStore()
  const { vehicles, loadVehicles, addVehicle } = useVehicleStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (currentUser?.id) loadVehicles(currentUser.id)
  }, [currentUser?.id, loadVehicles])

  useEffect(() => {
    if (location.state?.showAddModal) {
      setShowModal(true)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser?.id || !form.model) return
    const vehicle: Vehicle = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      userId: currentUser.id,
      brand: form.brand,
      model: form.model,
      plateNumber: form.plateNumber || undefined,
      purchaseDate: form.purchaseDate || undefined,
      currentMileage: Number(form.currentMileage) || 0,
      insuranceExpiry: form.insuranceExpiry || undefined,
      inspectionExpiry: form.inspectionExpiry || undefined,
    }
    addVehicle(vehicle)
    setForm(emptyForm)
    setShowModal(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">我的车辆</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          添加车辆
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          <p className="text-lg">暂无车辆</p>
          <p className="text-sm mt-1">点击"添加车辆"开始管理您的爱车</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicles.map((v) => {
            const colorClass = BRAND_COLORS[v.brand] || BRAND_COLORS['其他']
            const insuranceStatus = getExpiryStatus(v.insuranceExpiry)
            const inspectionStatus = getExpiryStatus(v.inspectionExpiry)
            return (
              <div
                key={v.id}
                onClick={() => navigate(`/owner/vehicles/${v.id}`)}
                className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${colorClass}`}>
                    {v.brand[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-primary text-lg">{v.brand} {v.model}</h3>
                    <p className="text-sm text-gray-400">{v.plateNumber || '未上牌'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="text-gray-500">
                    <span className="text-gray-400">里程：</span>
                    {v.currentMileage.toLocaleString()} km
                  </div>
                  <div className="text-gray-500">
                    <span className="text-gray-400">购入：</span>
                    {v.purchaseDate || '未记录'}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white shadow-xl h-full overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-primary">添加车辆</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
                <select
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                >
                  {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">车型</label>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="例如：325Li"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">车牌号</label>
                <input
                  type="text"
                  value={form.plateNumber}
                  onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                  placeholder="例如：沪A·M8866"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">购买日期</label>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">当前里程 (km)</label>
                <input
                  type="number"
                  value={form.currentMileage}
                  onChange={(e) => setForm({ ...form, currentMileage: e.target.value })}
                  placeholder="例如：32500"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">保险到期日</label>
                <input
                  type="date"
                  value={form.insuranceExpiry}
                  onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年检到期日</label>
                <input
                  type="date"
                  value={form.inspectionExpiry}
                  onChange={(e) => setForm({ ...form, inspectionExpiry: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors font-medium"
              >
                确认添加
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
