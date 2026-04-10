import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BarChart3, UserPlus, MessageSquare, Database,
  Users, UserCheck, Link2, Building, TrendingUp, LineChart,
  FileText, Settings, LogOut, ChevronRight, X, Award, BookOpen
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const navGroups = [
  {
    label: '상담 관리',
    items: [
      { to: '/',          icon: LayoutDashboard, label: '대시보드',         end: true },
      { to: '/stats',     icon: BarChart3,        label: '통계 현황' },
      { to: '/intake',    icon: UserPlus,         label: '상담 접수' },
      { to: '/founders',  icon: Award,            label: '상담 관리' },
      { to: '/consult',   icon: MessageSquare,    label: '상담일지' },
      { to: '/founderdb', icon: Database,         label: '창업자 DB' },
    ]
  },
  {
    label: '전문가 관리',
    items: [
      { to: '/experts',   icon: Users,     label: '전문가 DB' },
      { to: '/mentoring', icon: UserCheck, label: '전문가 상담·멘토링' },
    ]
  },
  {
    label: '지원사업',
    items: [
      { to: '/support',  icon: Link2,    label: '지원사업 연계' },
      { to: '/selected', icon: Building, label: '선정기업 관리' },
    ]
  },
  {
    label: '성장 추적',
    items: [
      { to: '/startup', icon: TrendingUp, label: '창업 현황' },
      { to: '/growth',  icon: LineChart,  label: '기업 성장 지표' },
    ]
  },
  {
    label: '교육 관리',
    items: [
      { to: '/education', icon: BookOpen, label: '교육 프로그램' },
    ]
  },
  {
    label: '보고·설정',
    items: [
      { to: '/report',   icon: FileText, label: '성과 보고' },
      { to: '/settings', icon: Settings, label: '환경 설정' },
    ]
  },
]

const ROLE_STYLE = {
  master:  { bg: 'rgba(168,85,247,0.25)',  text: '#D8B4FE' },
  admin:   { bg: 'rgba(59,130,246,0.25)',  text: '#93C5FD' },
  manager: { bg: 'rgba(20,184,166,0.25)',  text: '#5EEAD4' },
  viewer:  { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.45)' },
}

export default function Sidebar({ onClose }) {
  const { profile, signOut, ROLES, hasRole } = useAuth()
  const roleStyle = ROLE_STYLE[profile?.role] ?? ROLE_STYLE.viewer

  return (
    <aside
      className="w-60 h-full min-h-screen flex flex-col text-white overflow-y-auto"
      style={{ background: '#0D1B2A' }}
    >
      {/* 로고 헤더 */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <OrgLogo />
          <div>
            <div className="text-[10px] font-medium leading-none mb-0.5" style={{ color: '#7EC8E3' }}>
              울산경제일자리진흥원
            </div>
            <div className="text-[13px] font-bold leading-tight text-white">
              창업지원 통합관리
            </div>
          </div>
        </div>
        {/* 모바일 닫기 버튼 */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 프로필 */}
      {profile && (
        <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: '#2E75B6' }}
            >
              {profile.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{profile.name}</div>
              <div className="text-[10px] text-white/40 truncate">{profile.email}</div>
            </div>
          </div>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
            style={{ background: roleStyle.bg, color: roleStyle.text }}
          >
            {ROLES?.[profile.role]?.label ?? profile.role}
          </span>
        </div>
      )}

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map(group => {
          const items = group.items.filter(item => {
            if (item.to === '/settings') return hasRole('admin')
            return true
          })
          if (items.length === 0) return null
          return (
            <div key={group.label} className="mb-1">
              <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.25)' }}>
                {group.label}
              </div>
              {items.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-[13px] transition-all ${
                      isActive
                        ? 'text-white font-semibold'
                        : 'text-white/55 hover:text-white hover:bg-white/6'
                    }`
                  }
                  style={({ isActive }) => isActive
                    ? { background: 'rgba(46,117,182,0.85)', boxShadow: '0 1px 4px rgba(46,117,182,0.3)' }
                    : {}
                  }
                >
                  <Icon size={14} className="flex-shrink-0" />
                  <span className="flex-1 leading-none">{label}</span>
                  <ChevronRight size={11} className="opacity-25 flex-shrink-0" />
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* 하단 분리선 + 로그아웃 */}
      <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
        <button
          onClick={signOut}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[13px] text-white/45 hover:bg-white/8 hover:text-white/80 transition-colors"
        >
          <LogOut size={14} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  )
}

// 조직 로고 아이콘
function OrgLogo() {
  return (
    <img src="/logo.png" alt="울산경제일자리진흥원 로고" style={{ height: 32, mixBlendMode: 'multiply' }} className="w-auto flex-shrink-0" />
  )
}
