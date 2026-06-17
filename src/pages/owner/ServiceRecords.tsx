import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Car, Filter, FileText, Receipt, ExternalLink } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useVehicleStore } from '@/store/useVehicleStore'
import { useServiceStore } from '@/store/useServiceStore'
import type { ServiceRecord, ServiceType } from '@/types'

const SERVICE_ITEMS = [
  '换机油', '换机油滤芯', '换空调滤芯', '换空气滤芯', '换刹车片',
  '换刹车油', '换火花塞', '换正时皮带', '轮胎更换', '轮胎换位',
  '换防冻液', '换变速箱油', '四轮定位', '空调清洗', '其他',
]

const TYPE_OPTIONS: { value: '' | ServiceType; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'maintenance', label: '保养' },
  { value: 'repair', label: '维修' },
]

const TYPE_BADGE: Record<ServiceType, { label: string; cls: string }> = {
  maintenance: { label: '保养', cls: 'bg-emerald-50 text-emerald-700' },
  repair: { label: '维修', cls: 'bg-red-50 text-red-600' },
}

const emptyForm = {
  vehicleId: '',
  type: 'maintenance' as ServiceType,
  items: [] as string[],
  cost: '',
  mileage: '',
  serviceDate: '',
  storeName: '',
}

export default function ServiceRecords() {
  const navigate = useNavigate()
  const { currentUser } = useAuthStore()
  const { vehicles, loadVehicles } = useVehicleStore()
  const { records, loadRecords, addRecord } = useServiceStore()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterType, setFilterType] = useState<'' | ServiceType>('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser?.id) {
      loadVehicles(currentUser.id)
      loadRecords()
    }
  }, [currentUser?.id, loadVehicles, loadRecords])

  const getVehicleName = (vid: string) => {
    const v = vehicles.find((x) => x.id === vid)
    return v ? `${v.brand} ${v.model}` : '未知车辆'
  }

  const filtered = records.filter((r) => {
    if (filterVehicle && r.vehicleId !== filterVehicle) return false
    if (filterType && r.type !== filterType) return false
    return true
  })

  const totalCost = filtered.reduce((s, r) => s + r.cost, 0)
  const avgCost = filtered.length ? totalCost / filtered.length : 0

  const toggleItem = (item: string) => {
    setForm((f) => ({
      ...f,
      items: f.items.includes(item) ? f.items.filter((i) => i !== item) : [...f.items, item],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser?.id || !form.vehicleId || !form.serviceDate || form.items.length === 0) return
    const record: ServiceRecord = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      vehicleId: form.vehicleId,
      type: form.type,
      items: form.items,
      cost: Number(form.cost) || 0,
      mileage: Number(form.mileage) || 0,
      serviceDate: form.serviceDate,
      storeName: form.storeName || undefined,
    }
    addRecord(record)
    setForm(emptyForm)
    setShowModal(false)
    loadRecords()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">服务记录</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          新增记录
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Car size={16} className="text-gray-400" />
          <select
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          >
            <option value="">全部车辆</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.brand} {v.model}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Filter size={16} className="text-gray-400" />
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterType(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filterType === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">支持按日期范围筛选</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '记录总数', value: filtered.length, unit: '条' },
          { label: '总费用', value: `¥${totalCost.toLocaleString()}`, unit: '' },
          { label: '平均费用', value: `¥${avgCost.toFixed(0)}`, unit: '' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-primary mt-1">
              {s.value}<span className="text-sm font-normal text-gray-400 ml-1">{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">
          <p className="text-lg">暂无服务记录</p>
          <p className="text-sm mt-1">点击"新增记录"添加您的第一条服务记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const badge = TYPE_BADGE[r.type]
            return (
              <div key={r.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-gray-500">{r.serviceDate}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {r.sourceAppointmentId && (
                      <button
                        onClick={() => navigate(`/owner/appointments/${r.sourceAppointmentId}`)}
                        className="flex items-center gap-1 text-xs text-accent hover:text-accent-600 font-medium"
                      >
                        <ExternalLink size={12} />
                        来源工单
                      </button>
                    )}
                  </div>
                  <span className="text-lg font-bold text-primary">¥{r.cost.toLocaleString()}</span>
                </div>
                <p className="font-medium text-primary mb-2">{getVehicleName(r.vehicleId)}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {r.items.map((item) => (
                    <span key={item} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                  <span>里程：{r.mileage.toLocaleString()} km</span>
                  {r.storeName && <span>门店：{r.storeName}</span>}
                </div>
                {(r.reportText || (r.reportImages && r.reportImages.length > 0) || (r.invoiceImages && r.invoiceImages.length > 0)) && (
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    {r.reportText && (
                      <div className="flex gap-2">
                        <FileText size={14} className="text-accent shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-600 line-clamp-2">{r.reportText}</p>
                      </div>
                    )}
                    {r.reportImages && r.reportImages.length > 0 && (
                      <div className="flex items-start gap-2">
                        <FileText size={14} className="text-accent shrink-0 mt-1" />
                        <div className="flex gap-2 flex-wrap">
                          {r.reportImages.map((img, i) => (
                            <img
                              key={`r-${i}`}
                              src={img}
                              alt={`检测照片${i + 1}`}
                              onClick={(e) => { e.stopPropagation(); setPreviewImage(img) }}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {r.invoiceImages && r.invoiceImages.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Receipt size={14} className="text-accent shrink-0 mt-1" />
                        <div className="flex gap-2 flex-wrap">
                          {r.invoiceImages.map((img, i) => (
                            <img
                              key={`i-${i}`}
                              src={img}
                              alt={`发票${i + 1}`}
                              onClick={(e) => { e.stopPropagation(); setPreviewImage(img) }}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl max-h-[90vh] p-2">
            <img src={previewImage} alt="预览" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            <button onClick={() => setPreviewImage(null)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white shadow-xl h-full overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-bold text-primary">新增服务记录</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择车辆</label>
                <select
                  value={form.vehicleId}
                  onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                >
                  <option value="">请选择车辆</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.brand} {v.model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务类型</label>
                <div className="flex gap-2">
                  {(['maintenance', 'repair'] as ServiceType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, type: t })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        form.type === t
                          ? t === 'maintenance'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {TYPE_BADGE[t].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务项目</label>
                <div className="grid grid-cols-3 gap-2">
                  {SERVICE_ITEMS.map((item) => (
                    <label
                      key={item}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                        form.items.includes(item)
                          ? 'bg-accent-50 border border-accent text-accent-700'
                          : 'bg-gray-50 border border-gray-200 text-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.items.includes(item)}
                        onChange={() => toggleItem(item)}
                        className="sr-only"
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">费用 (元)</label>
                  <input
                    type="number"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    placeholder="0"
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">里程 (km)</label>
                  <input
                    type="number"
                    value={form.mileage}
                    onChange={(e) => setForm({ ...form, mileage: e.target.value })}
                    placeholder="0"
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务日期</label>
                <input
                  type="date"
                  value={form.serviceDate}
                  onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">门店名称</label>
                <input
                  type="text"
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  placeholder="例如：某某4S店"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors font-medium"
              >
                提交记录
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
