import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, X, Check, FileText, Receipt, Clock, MessageCircle, Send, User, Coins } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppointmentStore } from '@/store/useAppointmentStore'
import { useVehicleStore } from '@/store/useVehicleStore'
import { useStoreStore } from '@/store/useStoreStore'
import { useReviewStore } from '@/store/useReviewStore'
import type { Review, AppointmentMessage } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  pending: '待确认', confirmed: '已确认', in_progress: '维修中',
  completed: '已完成', cancelled: '已取消', rejected: '已拒绝',
  report_uploaded: '报告已上传', reviewed: '已评价',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-700',
}

const TIMELINE_STEP_LABELS: Record<string, string> = {
  pending: '提交预约',
  confirmed: '门店确认',
  in_progress: '开始维修',
  report_uploaded: '上传报告',
  completed: '已完工',
  reviewed: '已评价',
}

const REVIEW_TAGS = ['服务专业', '价格透明', '环境整洁', '效率高', '等位久', '态度一般']

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuthStore()
  const { appointments, loadAppointments, updateStatus, addMessage, markReviewed } = useAppointmentStore()
  const { vehicles, loadVehicles } = useVehicleStore()
  const { stores, loadStores } = useStoreStore()
  const { addReview, hasReviewForAppointment, getReviewForAppointment, loadReviews } = useReviewStore()

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [hoverStar, setHoverStar] = useState(0)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [msgText, setMsgText] = useState('')

  useEffect(() => {
    if (currentUser?.id) {
      loadAppointments(currentUser.id)
      loadVehicles(currentUser.id)
      loadReviews()
    }
    loadStores()
  }, [currentUser?.id, loadAppointments, loadVehicles, loadStores, loadReviews])

  const apt = appointments.find((a) => a.id === id)
  const vehicle = apt ? vehicles.find((v) => v.id === apt.vehicleId) : null
  const store = apt ? stores.find((s) => s.id === apt.storeId) : null
  const existingReview = apt ? getReviewForAppointment(apt.id) : undefined
  const alreadyReviewed = apt ? hasReviewForAppointment(apt.id) : false

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  const handleCancel = () => {
    if (apt && confirm('确定取消此预约？')) updateStatus(apt.id, 'cancelled')
  }

  const handleSubmitReview = () => {
    if (!apt || !currentUser?.id || rating === 0 || alreadyReviewed) return
    const reviewId = Date.now().toString() + Math.random().toString(36).slice(2, 6)
    const review: Review = {
      id: reviewId, appointmentId: apt.id, storeId: apt.storeId, userId: currentUser.id,
      rating, comment: comment || undefined, tags: selectedTags.length > 0 ? selectedTags : undefined,
      createdAt: new Date().toISOString(),
    }
    addReview(review)
    markReviewed(apt.id, reviewId)
    setRating(0); setComment(''); setSelectedTags([])
  }

  const handleSendMessage = () => {
    if (!apt || !currentUser?.id || !msgText.trim()) return
    const msg: AppointmentMessage = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      senderRole: 'owner',
      senderName: currentUser.name || '车主',
      content: msgText.trim(),
      createdAt: new Date().toISOString(),
    }
    addMessage(apt.id, msg)
    setMsgText('')
  }

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (!apt) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>预约不存在</p>
        <button onClick={() => navigate('/owner/appointments')} className="mt-4 text-accent hover:underline">返回列表</button>
      </div>
    )
  }

  const timeline = apt.timeline || []
  const messages = apt.messages || []
  const costItems = apt.costItems || []
  const totalCost = costItems.reduce((sum, item) => sum + item.amount, 0)
  const materialCost = costItems.filter(i => i.type === 'material').reduce((sum, item) => sum + item.amount, 0)
  const laborCost = costItems.filter(i => i.type === 'labor').reduce((sum, item) => sum + item.amount, 0)

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

      {timeline.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
            <Clock size={18} className="text-accent" />
            进度动态
          </h3>
          <div className="space-y-0">
            {timeline.map((entry, i) => {
              const isLast = i === timeline.length - 1
              const label = TIMELINE_STEP_LABELS[entry.status] || STATUS_LABEL[entry.status] || entry.status
              return (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${
                      isLast ? 'bg-accent ring-4 ring-accent/20' : entry.status === 'reviewed' ? 'bg-emerald-500' : 'bg-accent'
                    }`} />
                    {!isLast && <div className="w-0.5 flex-1 bg-accent/30 my-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isLast ? 'text-primary' : 'text-gray-700'}`}>{label}</span>
                      {entry.status === 'reviewed' && existingReview && (
                        <span className="text-xs text-amber-500">
                          {existingReview.rating}星
                          {existingReview.tags && existingReview.tags.length > 0 && ` · ${existingReview.tags.join('、')}`}
                        </span>
                      )}
                      {isLast && entry.status !== 'reviewed' && <Check size={14} className="text-accent" />}
                      {entry.status === 'reviewed' && <Star size={14} className="fill-amber-400 text-amber-400" />}
                    </div>
                    <span className="text-xs text-gray-400">{formatTime(entry.timestamp)}</span>
                    {entry.status === 'reviewed' && existingReview?.comment && (
                      <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">{existingReview.comment}</p>
                    )}
                  </div>
                </div>
              )
            })}
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
          <div><p className="text-sm text-gray-400 mb-1">备注</p><p className="text-gray-700">{apt.notes}</p></div>
        )}
      </div>

      {(apt.reportText || (apt.reportImages && apt.reportImages.length > 0)) && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-accent" />
            <h3 className="font-semibold text-primary">检测报告</h3>
          </div>
          {apt.reportText && (
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{apt.reportText}</p>
          )}
          {apt.reportImages && apt.reportImages.length > 0 && (
            <div className={apt.reportText ? 'mt-3' : ''}>
              <p className="text-xs text-gray-400 mb-2">检测照片 ({apt.reportImages.length}张)</p>
              <div className="flex gap-3 flex-wrap">
                {apt.reportImages.map((img, i) => (
                  <img key={i} src={img} alt={`检测照片${i + 1}`} onClick={() => setPreviewImage(img)}
                    className="w-24 h-24 object-cover rounded-lg border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {costItems.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <Coins size={18} className="text-accent" />
              费用明细
            </h3>
            <div className="text-right">
              <div className="text-xs text-gray-400">合计</div>
              <div className="text-xl font-bold text-accent">¥{totalCost.toLocaleString()}</div>
            </div>
          </div>
          <div className="space-y-1">
            {costItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    item.type === 'material' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {item.type === 'material' ? '材料' : '工时'}
                  </span>
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="font-medium text-primary">¥{item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-4 text-xs text-gray-500 border-t border-gray-100 pt-2">
            <span>材料费：¥{materialCost.toLocaleString()}</span>
            <span>工时费：¥{laborCost.toLocaleString()}</span>
          </div>
        </div>
      )}

      {apt.invoiceImages && apt.invoiceImages.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Receipt size={18} className="text-accent" />
            <h3 className="font-semibold text-primary">发票照片</h3>
          </div>
          <p className="text-xs text-gray-400 mb-2">{apt.invoiceImages.length}张</p>
          <div className="flex gap-3 flex-wrap">
            {apt.invoiceImages.map((img, i) => (
              <img key={i} src={img} alt={`发票${i + 1}`} onClick={() => setPreviewImage(img)}
                className="w-24 h-24 object-cover rounded-lg border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity" />
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
          <MessageCircle size={18} className="text-accent" />
          沟通消息
        </h3>
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无消息</p>
        ) : (
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto scrollbar-thin">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.senderRole === 'owner' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 ${
                  msg.senderRole === 'owner'
                    ? 'bg-accent text-white'
                    : 'bg-primary/5 text-gray-700'
                }`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <User size={10} />
                    <span className="text-[10px] font-medium">{msg.senderName}</span>
                    <span className={`text-[10px] ${msg.senderRole === 'owner' ? 'text-white/60' : 'text-gray-400'}`}>
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="输入消息..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
          />
          <button onClick={handleSendMessage} disabled={!msgText.trim()}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Send size={16} />
          </button>
        </div>
      </div>

      {apt.status === 'completed' && !alreadyReviewed && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary">评价服务</h3>
            {totalCost > 0 && (
              <div className="text-right">
                <div className="text-xs text-gray-400">本次服务</div>
                <div className="text-lg font-bold text-accent">¥{totalCost.toLocaleString()}</div>
              </div>
            )}
          </div>
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

      {alreadyReviewed && existingReview && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
            <Star size={18} className="fill-amber-400 text-amber-400" />
            我的评价
          </h3>
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={18} className={i < existingReview.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
            ))}
            <span className="text-sm text-gray-500 ml-2">{existingReview.rating}分</span>
            <span className="text-xs text-gray-400 ml-2">{new Date(existingReview.createdAt).toLocaleString('zh-CN')}</span>
          </div>
          {existingReview.tags && existingReview.tags.length > 0 && (
            <div className="flex gap-1.5 mb-2">
              {existingReview.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">{tag}</span>
              ))}
            </div>
          )}
          {existingReview.comment && <p className="text-sm text-gray-600">{existingReview.comment}</p>}
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
