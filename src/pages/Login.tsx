import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Shield, Car, Store } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import type { UserRole } from '@/types'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [role, setRole] = useState<UserRole>('owner')
  const [countdown, setCountdown] = useState(0)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleGetCode = () => {
    if (!phone || phone.length < 11 || countdown > 0) return
    setCode('123456')
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleLogin = () => {
    if (!phone || !code) return
    login(phone, role)
    navigate(role === 'owner' ? '/owner' : '/store')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 rounded-xl mb-4">
              <Shield className="text-accent" size={28} />
            </div>
            <h1 className="text-2xl font-bold font-display text-primary">AutoCare</h1>
            <p className="text-sm text-gray-500 mt-1">汽车保养维修记录与预约系统</p>
          </div>

          <div className="mb-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setRole('owner')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  role === 'owner'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Car size={16} />
                车主
              </button>
              <button
                onClick={() => setRole('store')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  role === 'store'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Store size={16} />
                门店
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">手机号</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  maxLength={11}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="请输入手机号"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">验证码</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="请输入验证码"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                />
                <button
                  onClick={handleGetCode}
                  disabled={!phone || phone.length < 11 || countdown > 0}
                  className="px-4 py-3 bg-primary text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={!phone || !code}
              className="w-full py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-2"
            >
              登录
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            登录即表示同意《用户协议》和《隐私政策》
          </p>
        </div>
      </div>
    </div>
  )
}
