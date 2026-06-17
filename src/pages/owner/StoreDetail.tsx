import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Clock, Star } from 'lucide-react'
import { useStoreStore } from '@/store/useStoreStore'
import { useReviewStore } from '@/store/useReviewStore'

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedStore, selectStore } = useStoreStore()
  const { reviews, loadReviews } = useReviewStore()

  useEffect(() => {
    if (id) {
      selectStore(id)
      loadReviews(id)
    }
  }, [id, selectStore, loadReviews])

  const store = selectedStore

  const renderStars = (rating: number, size = 16) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={size} className={i < Math.round(rating) ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-gray-300'} />
    ))

  if (!store) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">门店不存在</p>
        <button onClick={() => navigate('/owner/stores')} className="mt-4 text-accent hover:underline text-sm">
          返回门店搜索
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/owner/stores')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold text-primary">门店详情</h1>
      </div>

      <div className="bg-gradient-to-br from-[#1B2A4A] to-[#2D4A7A] rounded-xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-white/20" />
          <div className="absolute bottom-2 left-4 w-20 h-20 rounded-full bg-white/10" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">{store.name}</h2>
          <div className="flex items-center gap-2">
            {renderStars(store.rating, 20)}
            <span className="text-amber-300 font-semibold">{store.rating.toFixed(1)}</span>
            <span className="text-white/60 text-sm">({store.reviewCount}条评价)</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-start gap-3">
          <MapPin size={18} className="text-accent mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-gray-400">地址</p>
            <p className="text-primary font-medium">{store.address}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Phone size={18} className="text-accent mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-gray-400">电话</p>
            <p className="text-primary font-medium">{store.phone || '暂无'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock size={18} className="text-accent mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-gray-400">营业时间</p>
            <p className="text-primary font-medium">{store.hours.join(' / ')}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-primary mb-3">服务项目</h3>
        <div className="flex flex-wrap gap-2">
          {store.services.map((s) => (
            <span key={s} className="px-3 py-1.5 bg-primary/5 text-primary/80 rounded-full text-sm font-medium">{s}</span>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-primary mb-3">用户评价</h3>
        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">暂无评价</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                      {r.userId.slice(-2)}
                    </div>
                    <span className="text-sm font-medium text-primary">用户{r.userId.slice(-4)}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="flex items-center gap-1 mb-2">{renderStars(r.rating, 14)}</div>
                {r.comment && <p className="text-sm text-gray-600 mb-2">{r.comment}</p>}
                {r.tags && r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981]">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(`/owner/appointments?storeId=${id}`)}
        className="w-full py-3 bg-accent text-white rounded-xl text-lg font-semibold hover:bg-accent-600 transition-colors"
      >
        立即预约
      </button>
    </div>
  )
}
