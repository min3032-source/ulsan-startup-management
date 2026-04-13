export default function PublicHeader({ title }) {
  return (
    <header style={{ background: '#0D1B2A' }} className="sticky top-0 z-10 shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 로고 이미지 */}
          <img src="/logo.gif" alt="울산경제일자리진흥원 로고" style={{ height: 48, width: 'auto' }} className="flex-shrink-0" />
          <div>
            <div className="text-[10px] font-semibold tracking-wide" style={{ color: '#7EC8E3' }}>
              울산경제일자리진흥원
            </div>
            <div className="text-sm font-bold text-white leading-tight">{title}</div>
          </div>
        </div>
        <a
          href="/login"
          className="text-[11px] px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.12)' }}
          onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.8)'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
        >
          직원 로그인 →
        </a>
      </div>
    </header>
  )
}
