import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, X, Check, FileText, Receipt } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppointmentStore } from '@/store/useAppointmentStore'
import { useVehicleStore } from '@/store/useVehicleStore'
import { useStoreStore } from '@/store/useStoreStore'
import { useReviewStore } from '@/store/useReviewStore'
import type { Review } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  pending: '待确认', confirmed: '已确认', in_progress: '进行中',
  completed: '已完成', cancelled: '已取消', rejected: '已拒绝',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-700',
}

const TIMELINE_STEPS = ['pending', 'confirmed', 'in_progress', 'completed']

const REVIEW_TAGS = ['服务专业', '价格透明', '环境整洁', '效率高', '等位久', '态度一般']

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuthStore()
  const { appointments, loadAppointments, updateStatus } = useAppointmentStore()
  const { vehicles, loadVehicles } = useVehicleStore()
  const { stores, loadStores } = useStoreStore()
  const { addReview } = useReviewStore()

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [hoverStar, setHoverStar] = useState(0)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser?.id) {
      loadAppointments(currentUser.id)
      loadVehicles(currentUser.id)
    }
    loadStores()
  }, [currentUser?.id, loadAppointments, loadVehicles, loadStores])

  const apt = appointments.find((a) => a.id === id)
  const vehicle = apt ? vehicles.find((v) => v.id === apt.vehicleId) : null
  const store = apt ? stores.find((s) => s.id === apt.storeId) : null

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  const handleCancel = () => {
    if (apt && confirm('确定取消此预约？')) updateStatus(apt.id, 'cancelled')
  }

  const handleSubmitReview = () => {
    if (!apt || !currentUser?.id || rating === 0) return
    const review: Review = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      appointmentId: apt.id, storeId: apt.storeId, userId: currentUser.id,
      rating, comment: comment || undefined, tags: selectedTags.length > 0 ? selectedTags : undefined,
      createdAt: new Date().toISOString(),
    }
    addReview(review)
    setRating(0); setComment(''); setSelectedTags([])
  }

  const getTimelineIndex = (status: string) => TIMELINE_STEPS.indexOf(status)

  if (!apt) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>预约不存在</p>
        <button onClick={() => navigate('/owner/appointments')} className="mt-4 text-accent hover:underline">返回列表</button>
      </div>
    )
  }

  const tIdx = getTimelineIndex(apt.status)
  const isTimelineActive = tIdx >= 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/owner/appointments')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-primary">预约详情</h1>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[apt.status]}`}>
          {STATUS_LABEL[apt.status]}
        </span>
      </div>

      {isTimelineActive && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {TIMELINE_STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i <= tIdx ? 'bg-accent text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {i < tIdx ? <Check size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1.5 ${i <= tIdx ? 'text-accent font-medium' : 'text-gray-400'}`}>
                    {STATUS_LABEL[s]}
                  </span>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${i < tIdx ? 'bg-accent' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">门店</p>
            <p className="font-medium text-primary">{store?.name || apt.storeId}</p>
            {store && <p className="text-xs text-gray-400 mt-0.5">{store.address}</p>}
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">车辆</p>
            <p className="font-medium text-primary">{vehicle ? `${vehicle.brand} ${vehicle.model}` : apt.vehicleId}</p>
            {vehicle?.plateNumber && <p className="text-xs text-gray-400 mt-0.5">{vehicle.plateNumber}</p>}
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">日期时间</p>
            <p className="font-medium text-primary">{apt.appointmentDate} {apt.timeSlot}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">提交时间</p>
            <p className="font-medium text-primary text-sm">{new Date(apt.createdAt).toLocaleString('zh-CN')}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-2">服务项目</p>
          <div className="flex flex-wrap gap-2">
            {apt.items.map((item) => (
              <span key={item} className="text-xs px-3 py-1 rounded-full bg-primary/5 text-primary/70">{item}</span>
            ))}
          </div>
        </div>
        {apt.notes && (
          <div>
            <p className="text-sm text-gray-400 mb-1">备注</p>
            <p className="text-gray-700">{apt.notes}</p>
          </div>
        )}
      </div>

      {apt.reportText && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-accent" />
            <h3 className="font-semibold text-primary">检测报告</h3>
          </div>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{apt.reportText}</p>
          {apt.reportImages && apt.reportImages.length > 0 && (
            <div className="flex gap-3 mt-3 flex-wrap">
              {apt.reportImages.map((img, i) => (
                <img key={i} src={img} alt={`报告图片${i + 1}`} onClick={() => setPreviewImage(img)}
                  className="w-24 h-24 object-cover rounded-lg border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity" />
              ))}
            </div>
          )}
        </div>
      )}

      {apt.invoiceImages && apt.invoiceImages.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Receipt size={18} className="text-accent" />
            <h3 className="font-semibold text-primary">发票</h3>
          </div>
          <div className="flex gap-3 flex-wrap">
            {apt.invoiceImages.map((img, i) => (
              <img key={i} src={img} alt={`发票${i + 1}`} onClick={() => setPreviewImage(img)}
                className="w-24 h-24 object-cover rounded-lg border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity" />
            ))}
          </div>
        </div>
      )}

      {apt.status === 'completed' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-semibold text-primary">评价服务</h3>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={28}
                className={`cursor-pointer transition-colors ${
                  i < (hoverStar || rating) ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-gray-300'}`}
                onMouseEnter={() => setHoverStar(i + 1)}
                onMouseLeave={() => setHoverStar(0)}
                onClick={() => setRating(i + 1)} />
            ))}
            <span className="text-sm text-gray-500 ml-2">{rating > 0 ? `${rating}分` : '请评分'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {REVIEW_TAGS.map((tag) => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag) ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {tag}
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
            placeholder="写下您的评价（可选）"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none" />
          <button onClick={handleSubmitReview} disabled={rating === 0}
            className="px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            提交评价
          </button>
        </div>
      )}

      {apt.status === 'pending' && (
        <button onClick={handleCancel}
          className="w-full py-2.5 border border-[#EF4444] text-[#EF4444] rounded-lg hover:bg-red-50 transition-colors font-medium text-sm">
          取消预约
        </button>
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
    </div>
  )
}
