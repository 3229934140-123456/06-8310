import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { initMockData } from '@/data/mockData'
import { useAuthStore } from '@/store/useAuthStore'
import OwnerLayout from '@/components/layouts/OwnerLayout'
import StoreLayout from '@/components/layouts/StoreLayout'
import Login from '@/pages/Login'
import OwnerHome from '@/pages/owner/OwnerHome'
import Vehicles from '@/pages/owner/Vehicles'
import VehicleDetail from '@/pages/owner/VehicleDetail'
import ServiceRecords from '@/pages/owner/ServiceRecords'
import Reminders from '@/pages/owner/Reminders'
import StoreSearch from '@/pages/owner/StoreSearch'
import StoreDetail from '@/pages/owner/StoreDetail'
import Appointments from '@/pages/owner/Appointments'
import AppointmentDetail from '@/pages/owner/AppointmentDetail'
import StoreHome from '@/pages/store/StoreHome'
import Orders from '@/pages/store/Orders'
import OrderDetail from '@/pages/store/OrderDetail'

function ProtectedRoute({ children, role }: { children: React.ReactNode; role: 'owner' | 'store' }) {
  const { currentUser, isAuthenticated } = useAuthStore()
  if (!isAuthenticated || !currentUser) return <Navigate to="/login" replace />
  if (currentUser.role !== role) return <Navigate to={role === 'owner' ? '/store' : '/owner'} replace />
  return <>{children}</>
}

export default function App() {
  useEffect(() => {
    initMockData()
  }, [])

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/owner" element={<ProtectedRoute role="owner"><OwnerLayout /></ProtectedRoute>}>
          <Route index element={<OwnerHome />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="vehicles/:id" element={<VehicleDetail />} />
          <Route path="records" element={<ServiceRecords />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="stores" element={<StoreSearch />} />
          <Route path="stores/:id" element={<StoreDetail />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="appointments/:id" element={<AppointmentDetail />} />
        </Route>
        <Route path="/store" element={<ProtectedRoute role="store"><StoreLayout /></ProtectedRoute>}>
          <Route index element={<StoreHome />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}
