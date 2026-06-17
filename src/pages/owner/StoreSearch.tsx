import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, MapPin } from 'lucide-react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import { useStoreStore } from '@/store/useStoreStore'
import type { Store } from '@/types'

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const SHANGHAI: [number, number] = [31.2304, 121.4737]

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface StoreWithDistance extends Store {
  distance: number
}

export default function StoreSearch() {
  const navigate = useNavigate()
  const { stores, searchNearby } = useStoreStore()
  const [keyword, setKeyword] = useState('')
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance')
  const [serviceFilter, setServiceFilter] = useState('')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    searchNearby(SHANGHAI[0], SHANGHAI[1])
  }, [searchNearby])

  useEffect(() => {
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current)
    }
  }, [])

  const storesWithDistance: StoreWithDistance[] = useMemo(
    () => stores.map((s) => ({ ...s, distance: haversine(SHANGHAI[0], SHANGHAI[1], s.lat, s.lng) })),
    [stores]
  )

  const allServices = useMemo(() => {
    const set = new Set(stores.flatMap((s) => s.services))
    return Array.from(set)
  }, [stores])

  const filteredStores = useMemo(() => {
    let list = storesWithDistance
    if (keyword) {
      const kw = keyword.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(kw) || s.address.toLowerCase().includes(kw))
    }
    if (serviceFilter) {
      list = list.filter((s) => s.services.includes(serviceFilter))
    }
    return [...list].sort((a, b) =>
      sortBy === 'distance' ? a.distance - b.distance : b.rating - a.rating
    )
  }, [storesWithDistance, keyword, serviceFilter, sortBy])

  const handleMarkerClick = (store: Store) => {
    setHighlightedId(store.id)
    const el = cardRefs.current[store.id]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 3000)
  }

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={14} className={i < Math.round(rating) ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-gray-300'} />
    ))

  const createMarkerIcon = (rating: number) =>
    L.divIcon({
      className: '',
      html: `<div style="background:#F59E0B;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid #fff;cursor:pointer">${rating.toFixed(1)}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl overflow-hidden shadow-sm border border-gray-100">
      <div className="w-[60%]">
        <MapContainer center={SHANGHAI} zoom={12} className="h-full w-full z-0" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredStores.map((s) => (
            <Marker
              key={s.id}
              position={[s.lat, s.lng]}
              icon={createMarkerIcon(s.rating)}
              eventHandlers={{ click: () => handleMarkerClick(s) }}
            />
          ))}
        </MapContainer>
      </div>

      <div className="w-[40%] bg-white flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索门店名称或地址"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'distance' | 'rating')}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            >
              <option value="distance">按距离排序</option>
              <option value="rating">按评分排序</option>
            </select>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none"
            >
              <option value="">全部服务</option>
              {allServices.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
          {filteredStores.length === 0 ? (
            <div className="text-center text-gray-400 py-12">附近没有找到门店</div>
          ) : (
            filteredStores.map((s) => (
              <div
                key={s.id}
                ref={(el) => { cardRefs.current[s.id] = el }}
                onClick={() => navigate(`/owner/stores/${s.id}`)}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                  highlightedId === s.id
                    ? 'border-accent bg-amber-50 shadow-md ring-1 ring-accent/30'
                    : 'border-gray-100 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-primary">{s.name}</h3>
                  <span className="text-xs text-gray-400 flex items-center gap-1 shrink-0 ml-2">
                    <MapPin size={12} />{s.distance.toFixed(1)}km
                  </span>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {renderStars(s.rating)}
                  <span className="text-xs text-gray-500 ml-1">{s.rating.toFixed(1)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {s.services.slice(0, 4).map((svc) => (
                    <span key={svc} className="text-xs px-2 py-0.5 rounded-full bg-primary/5 text-primary/70">{svc}</span>
                  ))}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/owner/appointments?storeId=${s.id}`) }}
                  className="w-full py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent-600 transition-colors font-medium"
                >
                  预约
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
