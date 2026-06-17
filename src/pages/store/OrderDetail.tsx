import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Check, Upload, FileText, Receipt, Clock, MessageCircle, Send, User, Star, X, RefreshCw, Plus, Trash2, Coins } from 'lucide-react'
import { useStoreStore } from '@/store/useStoreStore'
import { useAppointmentStore } from '@/store/useAppointmentStore'
import { useVehicleStore } from '@/store/useVehicleStore'
import { useReviewStore } from '@/store/useReviewStore'
import type { AppointmentMessage, CostItem } from '@/types'

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
  report_uploaded: '报告已上传', reviewed: '已评价',
}

const TIMELINE_STEP_LABELS: Record<string, string> = {
  pending: '提交预约',
  confirmed: '门店确认',
  in_progress: '开始维修',
  report_uploaded: '上传报告',
  completed: '完工',
  reviewed: '已评价',
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { stores, loadStores } = useStoreStore()
  const { appointments, loadAppointments, updateStatus, uploadReport, deleteImage, replaceImage, addMessage, addCostItem, updateCostItem, deleteCostItem } = useAppointmentStore()
  const { vehicles, loadVehicles } = useVehicleStore()
  const { getReviewForAppointment, loadReviews } = useReviewStore()

  const [reportText, setReportText] = useState('')
  const [newReportImages, setNewReportImages] = useState<string[]>([])
  const [newInvoiceImages, setNewInvoiceImages] = useState<string[]>([])
  const [msgText, setMsgText] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [newItemType, setNewItemType] = useState<'material' | 'labor'>('material')
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const reportInputRef = useRef<HTMLInputElement>(null)
  const invoiceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadStores() }, [loadStores])
  const storeId = stores[0]?.id

  useEffect(() => {
    if (storeId) loadAppointments(undefined, storeId)
    loadReviews()
  }, [storeId, loadAppointments, loadReviews])

  useEffect(() => {
    const uids = [...new Set(appointments.map((a) => a.userId))]
    uids.forEach((uid) => loadVehicles(uid))
  }, [appointments])

  const apt = appointments.find((a) => a.id === id)
  const vehicle = apt ? vehicles.find((v) => v.id === apt.vehicleId) : null
  const existingReview = apt ? getReviewForAppointment(apt.id) : undefined

  useEffect(() => {
    if (apt) setReportText('')
  }, [apt?.id])

  const handleConfirm = () => { if (apt) updateStatus(apt.id, 'confirmed') }
  const handleReject = () => { if (apt) updateStatus(apt.id, 'rejected') }
  const handleStart = () => { if (apt) updateStatus(apt.id, 'in_progress') }
  const handleComplete = () => { if (apt) updateStatus(apt.id, 'completed') }

  const handleAddCostItem = () => {
    if (!apt || !newItemName.trim() || !newItemAmount || Number(newItemAmount) <= 0) return
    const item: CostItem = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      name: newItemName.trim(),
      type: newItemType,
      amount: Number(newItemAmount),
    }
    addCostItem(apt.id, item)
    setNewItemName(''); setNewItemAmount('')
  }

  const handleUpdateCostItem = (itemId: string, field: keyof CostItem, value: string | number) => {
    if (!apt) return
    updateCostItem(apt.id, itemId, { [field]: value })
  }

  const handleDeleteCostItem = (itemId: string) => {
    if (!apt) return
    if (confirm('确定删除此费用项目？')) deleteCostItem(apt.id, itemId)
  }

  const totalCost = (apt?.costItems || []).reduce((sum, item) => sum + item.amount, 0)
  const materialCost = (apt?.costItems || []).filter(i => i.type === 'material').reduce((sum, item) => sum + item.amount, 0)
  const laborCost = (apt?.costItems || []).filter(i => i.type === 'labor').reduce((sum, item) => sum + item.amount, 0)

  const handleUploadReport = () => {
    if (!apt) return
    const hasExisting = !!(apt.reportText || (apt.reportImages && apt.reportImages.length > 0) || (apt.invoiceImages && apt.invoiceImages.length > 0))
    uploadReport(apt.id, reportText, newReportImages, newInvoiceImages, hasExisting)
    setReportText(''); setNewReportImages([]); setNewInvoiceImages([])
  }

  const handleDeleteImage = (type: 'report' | 'invoice', index: number) => {
    if (!apt) return
    if (confirm('确定删除此图片？')) deleteImage(apt.id, type, index)
  }

  const handleReplaceImage = async (type: 'report' | 'invoice', index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !apt) return
    const base64 = await readFileAsBase64(file)
    replaceImage(apt.id, type, index, base64)
    e.target.value = ''
  }

  const handleSendMessage = () => {
    if (!apt || !msgText.trim()) return
    const storeName = stores[0]?.name || '门店'
    const msg: AppointmentMessage = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      senderRole: 'store',
      senderName: storeName,
      content: msgText.trim(),
      createdAt: new Date().toISOString(),
    }
    addMessage(apt.id, msg)
    setMsgText('')
  }

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (type: 'report' | 'invoice', e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const setter = type === 'report' ? setNewReportImages : setNewInvoiceImages
    const current = type === 'report' ? newReportImages : newInvoiceImages
    const imgs: string[] = [...current]
    for (let i = 0; i < files.length; i++) {
      imgs.push(await readFileAsBase64(files[i]))
    }
    setter(imgs)
    e.target.value = ''
  }

  const removeNewImage = (type: 'report' | 'invoice', idx: number) => {
    const setter = type === 'report' ? setNewReportImages : setNewInvoiceImages
    setter((prev) => prev.filter((_, i) => i !== idx))
  }

  const renderManagedImages = (images: string[], type: 'report' | 'invoice', label: string) => (
    <div className="flex gap-3 flex-wrap">
      {images.map((src, i) => (
        <div key={`saved-${i}`} className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 group">
          <img src={src} alt={`${label}${i + 1}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
            <label className="cursor-pointer w-6 h-6 bg-white/90 rounded flex items-center justify-center" title="替换">
              <RefreshCw size={11} className="text-blue-600" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReplaceImage(type, i, e)} />
            </label>
            <button onClick={() => handleDeleteImage(type, i)} className="w-6 h-6 bg-white/90 rounded flex items-center justify-center" title="删除">
              <X size={11} className="text-red-500" />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] text-center py-0.5">{i + 1}</div>
        </div>
      ))}
    </div>
  )

  const renderNewUploadArea = (type: 'report' | 'invoice', images: string[]) => (
    <div className="flex gap-3 flex-wrap">
      {images.map((src, i) => (
        <div key={`new-${i}`} className="relative w-20 h-20 rounded-lg border border-accent/30 overflow-hidden bg-gray-50">
          <img src={src} alt="" className="w-full h-full object-cover" />
          <button onClick={() => removeNewImage(type, i)}
            className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-none flex items-center justify-center">×</button>
        </div>
      ))}
      <input ref={type === 'report' ? reportInputRef : invoiceInputRef} type="file" accept="image/*" multiple
        onChange={(e) => handleFileSelect(type, e)} className="hidden" />
      <button onClick={() => (type === 'report' ? reportInputRef : invoiceInputRef).current?.click()}
        className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-accent hover:text-accent transition-colors">
        <Upload size={16} />
        <span className="text-[10px] mt-1">上传</span>
      </button>
    </div>
  )

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (!apt) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>工单不存在</p>
        <Link to="/store/orders" className="mt-4 inline-block text-accent hover:underline">返回列表</Link>
      </div>
    )
  }

  const timeline = apt.timeline || []
  const messages = apt.messages || []
  const showReportUpload = apt.status === 'in_progress' || apt.status === 'completed'
  const hasExistingReport = !!(apt.reportText || (apt.reportImages && apt.reportImages.length > 0) || (apt.invoiceImages && apt.invoiceImages.length > 0))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/store/orders')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-primary">工单详情</h1>
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
                        <span className="text-xs text-amber-500">{existingReview.rating}星</span>
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

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
        <div>
          <h3 className="font-semibold text-primary mb-3">客户信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-400">姓名</p><p className="font-medium text-primary">车主{apt.userId.slice(-4)}</p></div>
            <div><p className="text-sm text-gray-400">电话</p><p className="font-medium text-primary">138****{apt.userId.slice(-4)}</p></div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-primary mb-3">车辆信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><p className="text-sm text-gray-400">品牌车型</p><p className="font-medium text-primary">{vehicle ? `${vehicle.brand} ${vehicle.model}` : apt.vehicleId}</p></div>
            <div><p className="text-sm text-gray-400">车牌号</p><p className="font-medium text-primary">{vehicle?.plateNumber || '未上牌'}</p></div>
            <div><p className="text-sm text-gray-400">当前里程</p><p className="font-medium text-primary">{vehicle ? `${vehicle.currentMileage.toLocaleString()} km` : '-'}</p></div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-primary mb-3">预约信息</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-400">预约日期</p><p className="font-medium text-primary">{apt.appointmentDate}</p></div>
            <div><p className="text-sm text-gray-400">时段</p><p className="font-medium text-primary">{apt.timeSlot}</p></div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-primary mb-3">服务项目</h3>
          <div className="flex flex-wrap gap-2">
            {apt.items.map((item) => (
              <span key={item} className="text-xs px-3 py-1 rounded-full bg-primary/5 text-primary/70">{item}</span>
            ))}
          </div>
        </div>
        {apt.notes && <div><p className="text-sm text-gray-400 mb-1">备注</p><p className="text-gray-700">{apt.notes}</p></div>}
      </div>

      {(apt.reportText || (apt.reportImages && apt.reportImages.length > 0) || (apt.invoiceImages && apt.invoiceImages.length > 0)) && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            <h3 className="font-semibold text-primary">已上传资料</h3>
          </div>
          {apt.reportText && (
            <div>
              <p className="text-sm text-gray-500 mb-1">检测报告描述</p>
              <p className="text-gray-700 text-sm whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{apt.reportText}</p>
            </div>
          )}
          {apt.reportImages && apt.reportImages.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">检测照片 ({apt.reportImages.length}张) <span className="text-xs text-gray-400">悬浮操作</span></p>
              {renderManagedImages(apt.reportImages, 'report', '检测照片')}
            </div>
          )}
          {apt.invoiceImages && apt.invoiceImages.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">发票照片 ({apt.invoiceImages.length}张) <span className="text-xs text-gray-400">悬浮操作</span></p>
              {renderManagedImages(apt.invoiceImages, 'invoice', '发票')}
            </div>
          )}
        </div>
      )}

      {(apt.status !== 'cancelled' && apt.status !== 'rejected') && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <Coins size={18} className="text-accent" />
              费用明细
            </h3>
            {totalCost > 0 && (
              <div className="text-right">
                <div className="text-xs text-gray-400">合计</div>
                <div className="text-xl font-bold text-accent">¥{totalCost.toLocaleString()}</div>
              </div>
            )}
          </div>

          {apt.costItems && apt.costItems.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 grid grid-cols-[1fr_auto_auto_24px] gap-3 px-2">
                <span>项目</span>
                <span>类型</span>
                <span>金额</span>
                <span></span>
              </div>
              {apt.costItems.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto_auto_24px] gap-3 items-center px-2 py-1.5 rounded-lg hover:bg-gray-50">
                  <input
                    value={item.name}
                    onChange={(e) => handleUpdateCostItem(item.id, 'name', e.target.value)}
                    disabled={apt.status === 'completed'}
                    className="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-accent focus:outline-none disabled:cursor-default"
                  />
                  <select
                    value={item.type}
                    onChange={(e) => handleUpdateCostItem(item.id, 'type', e.target.value as 'material' | 'labor')}
                    disabled={apt.status === 'completed'}
                    className="text-xs px-2 py-0.5 border border-gray-200 rounded bg-white focus:ring-1 focus:ring-accent focus:border-accent outline-none disabled:cursor-default"
                  >
                    <option value="material">材料</option>
                    <option value="labor">工时</option>
                  </select>
                  <input
                    type="number"
                    value={item.amount}
                    onChange={(e) => handleUpdateCostItem(item.id, 'amount', Number(e.target.value))}
                    disabled={apt.status === 'completed'}
                    className="text-sm w-20 text-right bg-transparent border-b border-transparent hover:border-gray-300 focus:border-accent focus:outline-none disabled:cursor-default"
                  />
                  {apt.status !== 'completed' && (
                    <button onClick={() => handleDeleteCostItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-end gap-4 text-xs text-gray-500 border-t border-gray-100 pt-2 mt-2">
                <span>材料费：¥{materialCost.toLocaleString()}</span>
                <span>工时费：¥{laborCost.toLocaleString()}</span>
              </div>
            </div>
          )}

          {apt.status !== 'completed' && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-500 mb-2">添加费用项目</p>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value as 'material' | 'labor')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none bg-white"
                >
                  <option value="material">材料费</option>
                  <option value="labor">工时费</option>
                </select>
                <input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="项目名称"
                  className="flex-1 min-w-[150px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
                <input
                  type="number"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  placeholder="金额"
                  className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
                <button onClick={handleAddCostItem}
                  disabled={!newItemName.trim() || !newItemAmount || Number(newItemAmount) <= 0}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  <Plus size={16} />
                  添加
                </button>
              </div>
            </div>
          )}
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
              <div key={msg.id} className={`flex gap-2 ${msg.senderRole === 'store' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-3 py-2 ${
                  msg.senderRole === 'store'
                    ? 'bg-accent text-white'
                    : 'bg-primary/5 text-gray-700'
                }`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <User size={10} />
                    <span className="text-[10px] font-medium">{msg.senderName}</span>
                    <span className={`text-[10px] ${msg.senderRole === 'store' ? 'text-white/60' : 'text-gray-400'}`}>
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

      <div className="flex items-center gap-2 flex-wrap">
        {apt.status === 'pending' && (
          <>
            <button onClick={handleConfirm} className="px-6 py-2.5 text-sm font-medium rounded-lg bg-[#10B981] text-white hover:bg-emerald-600 transition-colors">确认</button>
            <button onClick={handleReject} className="px-6 py-2.5 text-sm font-medium rounded-lg bg-[#EF4444] text-white hover:bg-red-600 transition-colors">拒绝</button>
          </>
        )}
        {apt.status === 'confirmed' && (
          <button onClick={handleStart} className="px-6 py-2.5 text-sm font-medium rounded-lg bg-[#F59E0B] text-white hover:bg-amber-600 transition-colors">开始维修</button>
        )}
        {apt.status === 'in_progress' && (
          <button onClick={handleComplete} className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">完工</button>
        )}
      </div>

      {showReportUpload && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
          <h3 className="font-semibold text-primary">{hasExistingReport ? '补充上传' : '上传报告'}</h3>
          <div>
            <p className="text-sm text-gray-500 mb-2">维修报告描述</p>
            <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} rows={4}
              placeholder={apt.reportText ? '留空保留原有内容，输入新内容则替换' : '请输入维修报告内容...'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none" />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">报告图片 {apt.reportImages && apt.reportImages.length > 0 ? `(已有${apt.reportImages.length}张)` : ''}</p>
            {renderNewUploadArea('report', newReportImages)}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">发票图片 {apt.invoiceImages && apt.invoiceImages.length > 0 ? `(已有${apt.invoiceImages.length}张)` : ''}</p>
            {renderNewUploadArea('invoice', newInvoiceImages)}
          </div>
          <button onClick={handleUploadReport}
            disabled={!reportText.trim() && newReportImages.length === 0 && newInvoiceImages.length === 0}
            className="px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            {hasExistingReport ? '补充上传' : '上传报告'}
          </button>
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
    </div>
  )
}
