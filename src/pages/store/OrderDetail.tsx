import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Check, Upload, FileText, Receipt, Clock } from 'lucide-react'
import { useStoreStore } from '@/store/useStoreStore'
import { useAppointmentStore } from '@/store/useAppointmentStore'
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
  report_uploaded: '报告已上传',
}

const TIMELINE_STEP_LABELS: Record<string, string> = {
  pending: '提交预约',
  confirmed: '门店确认',
  in_progress: '开始维修',
  report_uploaded: '上传报告',
  completed: '完工',
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { stores, loadStores } = useStoreStore()
  const { appointments, loadAppointments, updateStatus, uploadReport } = useAppointmentStore()
  const { vehicles, loadVehicles } = useVehicleStore()

  const [reportText, setReportText] = useState('')
  const [reportImageData, setReportImageData] = useState<string[]>([])
  const [invoiceImageData, setInvoiceImageData] = useState<string[]>([])
  const reportInputRef = useRef<HTMLInputElement>(null)
  const invoiceInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadStores() }, [loadStores])
  const storeId = stores[0]?.id

  useEffect(() => {
    if (storeId) loadAppointments(undefined, storeId)
  }, [storeId, loadAppointments])

  useEffect(() => {
    const uids = [...new Set(appointments.map((a) => a.userId))]
    uids.forEach((uid) => loadVehicles(uid))
  }, [appointments])

  const apt = appointments.find((a) => a.id === id)
  const vehicle = apt ? vehicles.find((v) => v.id === apt.vehicleId) : null

  useEffect(() => {
    if (apt) {
      setReportText(apt.reportText || '')
    }
  }, [apt?.id])

  const handleConfirm = () => { if (apt) updateStatus(apt.id, 'confirmed') }
  const handleReject = () => { if (apt) updateStatus(apt.id, 'rejected') }
  const handleStart = () => { if (apt) updateStatus(apt.id, 'in_progress') }
  const handleComplete = () => { if (apt) updateStatus(apt.id, 'completed') }

  const handleUploadReport = () => {
    if (!apt) return
    const hasExisting = (apt.reportImages && apt.reportImages.length > 0) || (apt.invoiceImages && apt.invoiceImages.length > 0) || apt.reportText
    if (hasExisting) {
      uploadReport(apt.id, reportText, reportImageData, invoiceImageData, true)
    } else {
      uploadReport(apt.id, reportText, reportImageData, invoiceImageData, false)
    }
    setReportText(''); setReportImageData([]); setInvoiceImageData([])
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
    const setter = type === 'report' ? setReportImageData : setInvoiceImageData
    const current = type === 'report' ? reportImageData : invoiceImageData
    const newImages: string[] = [...current]
    for (let i = 0; i < files.length; i++) {
      const base64 = await readFileAsBase64(files[i])
      newImages.push(base64)
    }
    setter(newImages)
    e.target.value = ''
  }

  const removeNewImage = (type: 'report' | 'invoice', idx: number) => {
    const setter = type === 'report' ? setReportImageData : setInvoiceImageData
    setter((prev) => prev.filter((_, i) => i !== idx))
  }

  const renderExistingImages = (images: string[], label: string) => (
    <div className="flex gap-3 flex-wrap">
      {images.map((src, i) => (
        <div key={`existing-${i}`} className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
          <img src={src} alt={`${label}${i + 1}`} className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] text-center py-0.5">已存档</div>
        </div>
      ))}
    </div>
  )

  const renderUploadArea = (type: 'report' | 'invoice', images: string[]) => (
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
  const showReportUpload = apt.status === 'in_progress' || apt.status === 'completed'
  const hasExistingReport = !!apt.reportText || (apt.reportImages && apt.reportImages.length > 0) || (apt.invoiceImages && apt.invoiceImages.length > 0)

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
                      isLast ? 'bg-accent ring-4 ring-accent/20' : 'bg-accent'
                    }`} />
                    {!isLast && <div className="w-0.5 flex-1 bg-accent/30 my-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isLast ? 'text-primary' : 'text-gray-700'}`}>{label}</span>
                      {isLast && <Check size={14} className="text-accent" />}
                    </div>
                    <span className="text-xs text-gray-400">{formatTime(entry.timestamp)}</span>
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

      {apt.reportText && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-accent" />
            <h3 className="font-semibold text-primary">检测报告</h3>
          </div>
          <p className="text-gray-700 text-sm whitespace-pre-wrap">{apt.reportText}</p>
          {apt.reportImages && apt.reportImages.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-2">检测照片 ({apt.reportImages.length}张)</p>
              {renderExistingImages(apt.reportImages, '检测照片')}
            </div>
          )}
        </div>
      )}

      {apt.invoiceImages && apt.invoiceImages.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Receipt size={18} className="text-accent" />
            <h3 className="font-semibold text-primary">发票照片</h3>
          </div>
          <p className="text-xs text-gray-400 mb-2">{apt.invoiceImages.length}张</p>
          {renderExistingImages(apt.invoiceImages, '发票')}
        </div>
      )}

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
            {renderUploadArea('report', reportImageData)}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">发票图片 {apt.invoiceImages && apt.invoiceImages.length > 0 ? `(已有${apt.invoiceImages.length}张)` : ''}</p>
            {renderUploadArea('invoice', invoiceImageData)}
          </div>
          <button onClick={handleUploadReport}
            disabled={!reportText.trim() && reportImageData.length === 0 && invoiceImageData.length === 0}
            className="px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            {hasExistingReport ? '补充上传' : '上传报告'}
          </button>
        </div>
      )}
    </div>
  )
}
