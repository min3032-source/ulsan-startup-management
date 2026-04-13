import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile, ROLES } = useAuth()

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바: 모바일=오버레이, 데스크탑=고정 */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out
        md:relative md:translate-x-0 md:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 메인 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 모바일 상단 바 */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Menu size={20} />
          </button>
          {/* 로고 */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src="/logo.gif" alt="울산경제일자리진흥원 로고" style={{ height: 28 }} className="w-auto flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-gray-400 leading-none truncate">울산경제일자리진흥원</div>
              <div className="text-sm font-bold text-gray-800 leading-tight truncate">창업지원 통합관리</div>
            </div>
          </div>
          {/* 사용자 아바타 */}
          {profile && (
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: '#2E75B6' }}>
              {profile.name?.charAt(0) || '?'}
            </div>
          )}
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// 울산 아이콘 (간단한 SVG 로고)
function UljinLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#0D1B2A"/>
      <path d="M8 22L12 10L16 18L20 12L24 22" stroke="#2E75B6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="16" cy="10" r="2" fill="#7EC8E3"/>
    </svg>
  )
}
