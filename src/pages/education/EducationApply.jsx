import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/formatPhone'
import { MapPin, User, Calendar, Users, X, Clock, Award, ChevronDown, Loader2, ZoomIn } from 'lucide-react'

const CATEGORY_GRADIENT = {
  '창업기초': 'from-blue-500 to-cyan-400',
  '마케팅':   'from-pink-500 to-rose-400',
  '재무':     'from-green-500 to-emerald-400',
  '기술':     'from-purple-500 to-violet-400',
  '네트워킹': 'from-orange-500 to-amber-400',
  '기타':     'from-gray-500 to-slate-400',
}

const CATEGORY_ICON = {
  '창업기초': '🚀', '마케팅': '📣', '재무': '💰',
  '기술': '💻', '네트워킹': '🤝', '기타': '📖',
}

export default function EducationApply() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', company_name: '', motivation: '', password: '', agree: false })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState({})
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [overviewOpen, setOverviewOpen] = useState(null) // prog.id or null
  const [posterModal, setPosterModal] = useState(null) // poster_url string

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('education_programs')
        .select('*, education_applications(count)')
        .eq('status', '모집중')
        .order('start_date', { ascending: true })
      setPrograms(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = '이름을 입력해주세요'
    if (!form.phone.trim()) e.phone = '연락처를 입력해주세요'
    if (!form.email.trim()) e.email = '이메일을 입력해주세요'
    if (!form.password.trim()) e.password = '접속 비밀번호를 입력해주세요'
    else if (!/^\d{4}$/.test(form.password)) e.password = '숫자 4자리를 입력해주세요'
    if (!form.agree) e.agree = '개인정보 수집·이용에 동의해주세요'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)
    const { error } = await supabase.from('education_applications').insert({
      program_id: selectedProgram.id,
      applicant_name: form.name,
      phone: form.phone,
      email: form.email,
      company_name: form.company_name || null,
      memo: form.motivation || null,
      status: '신청',
      access_password: form.password,
    })
    if (error) { alert('신청 실패: ' + error.message); setSubmitting(false); return }

    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: form.email,
          subject: `[울산경제일자리진흥원] ${selectedProgram.title} 신청이 완료되었습니다`,
          html: `<p>안녕하세요, ${form.name}님!</p>
<p><strong>${selectedProgram.title}</strong> 교육 신청이 정상적으로 접수되었습니다.</p>
<p>담당자 검토 후 개별 연락드릴 예정입니다.</p>
<br>
<p>교육 기간: ${selectedProgram.start_date || '-'} ~ ${selectedProgram.end_date || '-'}</p>
<p>교육 장소: ${selectedProgram.location || '-'}</p>
<br>
<p>감사합니다.<br>울산경제일자리진흥원</p>`
        }
      })
    } catch (_) {}

    setSubmitting(false)
    setDone(true)
  }

  function openApply(prog) {
    setSelectedProgram(prog)
    setForm({ name: '', phone: '', email: '', company_name: '', motivation: '', password: '', agree: false })
    setErrors({})
    setDone(false)
    setPrivacyOpen(false)
  }

  const enrolledCount = (prog) => {
    if (!prog.education_applications) return 0
    const arr = prog.education_applications
    if (Array.isArray(arr)) {
      if (arr.length > 0 && typeof arr[0] === 'object' && 'count' in arr[0]) return arr[0].count
      return arr.length
    }
    return 0
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── 헤더 ── */}
      <header className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 overflow-hidden">
        {/* 배경 장식 원 */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative max-w-5xl mx-auto px-6 pt-12 pb-20">
          <div className="flex items-center gap-3 mb-5">
            <img
              src="/logo.gif"
              alt="울산경제일자리진흥원"
              style={{ height: '42px', width: 'auto', opacity: 0.95, filter: 'brightness(0) invert(1)' }}
            />
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)' }}>
              🚀 울산경제일자리진흥원
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 leading-tight">
            창업 교육 프로그램
          </h1>
          <p className="text-base text-white/70">당신의 창업 꿈을 현실로 만들어드립니다</p>
        </div>

        {/* 물결 SVG */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 48L60 42C120 36 240 24 360 18C480 12 600 12 720 16.5C840 21 960 30 1080 33C1200 36 1320 33 1380 31.5L1440 30V48H0Z" fill="#f9fafb" />
        </svg>
      </header>

      {/* ── 메인 ── */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 size={36} className="text-blue-400 animate-spin" />
            <p className="text-gray-400 text-sm">프로그램을 불러오는 중...</p>
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-32 space-y-3">
            <div className="text-6xl">📚</div>
            <p className="text-xl font-bold text-gray-700">현재 모집중인 교육이 없습니다</p>
            <p className="text-gray-400">곧 새로운 프로그램이 열립니다 👀</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {programs.map(prog => {
              const count = enrolledCount(prog)
              const max = prog.max_participants
              const isFull = max && count >= max
              const fillRatio = max ? Math.min((count / max) * 100, 100) : 0
              const barColor = fillRatio >= 90 ? 'bg-red-400' : fillRatio >= 60 ? 'bg-yellow-400' : 'bg-green-400'
              const gradient = CATEGORY_GRADIENT[prog.category] || CATEGORY_GRADIENT['기타']
              const icon = CATEGORY_ICON[prog.category] || '📖'

              return (
                <div
                  key={prog.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 min-h-[480px]"
                >
                  {/* 카드 상단 - 포스터 이미지 또는 그라디언트 배너 (높이 200px 통일) */}
                  {prog.poster_url ? (
                    <div className="relative overflow-hidden shrink-0" style={{ height: 200 }}>
                      <img
                        src={prog.poster_url}
                        alt={prog.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                      />
                      <button
                        onClick={() => setPosterModal(prog.poster_url)}
                        className="absolute top-2 right-2 p-1.5 bg-black/40 rounded-full hover:bg-black/60 transition"
                        title="원본 이미지 보기"
                      >
                        <ZoomIn size={14} className="text-white" />
                      </button>
                      {/* 카테고리·유형·마감 오버레이 */}
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 flex items-center justify-between" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{icon}</span>
                          <span className="text-white text-xs font-semibold drop-shadow">{prog.category}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full backdrop-blur-sm border border-white/20">{prog.program_type}</span>
                          {isFull && <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">마감</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`relative bg-gradient-to-br ${gradient} shrink-0 flex flex-col items-start justify-end px-5 py-4`} style={{ height: 200 }}>
                      {/* 배경 장식 */}
                      <div className="absolute top-4 right-4 text-6xl opacity-20 select-none">{icon}</div>
                      {/* 카테고리·유형·마감 오버레이 */}
                      <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{icon}</span>
                          <span className="text-white font-bold text-sm drop-shadow">{prog.category}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full border border-white/20">{prog.program_type}</span>
                          {isFull && <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">마감</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 카드 본문 */}
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    {/* 교육명 + 설명 */}
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 leading-snug mb-1">{prog.title}</h2>
                      {prog.description && (
                        <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">{prog.description}</p>
                      )}
                    </div>

                    {/* 정보 아이콘 목록 */}
                    <div className="space-y-2 text-xs text-gray-500">
                      {(prog.start_date || prog.end_date) && (
                        <InfoRow icon={<Calendar size={13} className="text-gray-400" />} text={`${prog.start_date || ''} ~ ${prog.end_date || ''}`} />
                      )}
                      {prog.location && <InfoRow icon={<MapPin size={13} className="text-gray-400" />} text={prog.location} />}
                      {prog.instructor && <InfoRow icon={<User size={13} className="text-gray-400" />} text={`${prog.instructor} 강사`} />}
                      {prog.total_hours && <InfoRow icon={<Clock size={13} className="text-gray-400" />} text={`총 교육시간 ${prog.total_hours}시간`} />}
                      <InfoRow icon={<Award size={13} className="text-gray-400" />} text={`수료 기준 출석률 ${prog.completion_rate ?? 80}% 이상`} />
                    </div>

                    {/* 신청 현황 프로그레스 바 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 flex items-center gap-1"><Users size={12} className="text-gray-400" /> 신청 현황</span>
                        <span className="font-semibold text-gray-700">
                          {count}명 {max ? `/ ${max}명` : ''}
                        </span>
                      </div>
                      {max && (
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${fillRatio}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 교육 개요 아코디언 */}
                    {prog.overview && (
                      <div className="rounded-xl border border-gray-100 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOverviewOpen(o => (o === prog.id ? null : prog.id))}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                        >
                          <span>교육 개요 보기</span>
                          <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${overviewOpen === prog.id ? 'rotate-180' : ''}`} />
                        </button>
                        {overviewOpen === prog.id && (
                          <div className="px-3 py-3 text-xs text-gray-600 bg-white whitespace-pre-line leading-relaxed">
                            {prog.overview}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 신청 버튼 — 항상 하단 고정 */}
                    <div className="mt-auto pt-1">
                      <button
                        onClick={() => openApply(prog)}
                        disabled={isFull}
                        className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                          isFull
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : `bg-gradient-to-r ${gradient} text-white hover:opacity-90 hover:shadow-md active:scale-95`
                        }`}
                      >
                        {isFull ? '마감되었습니다' : '신청하기 →'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── 수강생 포털 안내 배너 ── */}
        <div className="mt-4 rounded-2xl overflow-hidden border border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-start gap-3">
              <span className="text-3xl leading-none select-none">🎓</span>
              <div>
                <p className="text-sm font-bold text-gray-800">수료증 발급 안내</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  교육 수료 후 <strong className="text-indigo-600">수강생 포털</strong>에서 만족도 조사를 완료하시면 수료증을 발급받으실 수 있습니다.
                </p>
              </div>
            </div>
            <a
              href="/student-portal"
              className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 hover:shadow-md active:scale-95 transition-all duration-200"
            >
              수강생 포털 바로가기 →
            </a>
          </div>
        </div>
      </main>

      {/* ── 포스터 원본 이미지 모달 ── */}
      {posterModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPosterModal(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPosterModal(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition"
            >
              <X size={18} className="text-white" />
            </button>
            <img
              src={posterModal}
              alt="교육 포스터"
              className="w-full rounded-2xl shadow-2xl"
              style={{ maxHeight: '85vh', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}

      {/* ── 신청 모달 ── */}
      {selectedProgram && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:rounded-2xl sm:max-w-md max-h-[95vh] overflow-y-auto shadow-2xl">
            {done ? (
              /* 완료 화면 */
              <div className="p-8 text-center space-y-5">
                <div className="text-6xl animate-bounce">✅</div>
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-800">신청이 완료되었습니다!</h2>
                  <p className="text-sm text-gray-400 mt-1">담당자 검토 후 연락드리겠습니다</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl px-5 py-4 text-left space-y-2.5 text-sm border border-blue-100">
                  <SummaryRow label="신청 교육" value={selectedProgram.title} />
                  <SummaryRow label="신청자" value={form.name} />
                  {selectedProgram.start_date && (
                    <SummaryRow label="교육 기간" value={`${selectedProgram.start_date} ~ ${selectedProgram.end_date || ''}`} />
                  )}
                </div>
                <p className="text-xs text-gray-400">추가 문의: 울산경제일자리진흥원 창업지원팀</p>
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 transition"
                >
                  홈으로 돌아가기
                </button>
              </div>
            ) : (
              <>
                {/* 모달 헤더 */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 pt-6 pb-5 rounded-t-2xl relative">
                  <button
                    onClick={() => setSelectedProgram(null)}
                    className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition"
                  >
                    <X size={16} className="text-white" />
                  </button>
                  <p className="text-xs font-medium text-white/60 mb-0.5">교육 신청</p>
                  <h2 className="text-base font-bold text-white pr-8 leading-snug">{selectedProgram.title}</h2>
                </div>

                {/* 신청 폼 */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                  <MinimalField label="이름" required error={errors.name}>
                    <input
                      className="w-full border-0 border-b border-gray-200 pb-2 text-sm focus:outline-none focus:border-blue-500 bg-transparent placeholder-gray-300 transition-colors"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="홍길동"
                    />
                  </MinimalField>
                  <MinimalField label="연락처" required error={errors.phone}>
                    <input
                      className="w-full border-0 border-b border-gray-200 pb-2 text-sm focus:outline-none focus:border-blue-500 bg-transparent placeholder-gray-300 transition-colors"
                      value={form.phone} onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                      placeholder="010-1234-5678" maxLength={13}
                    />
                  </MinimalField>
                  <MinimalField label="이메일" required error={errors.email}>
                    <input
                      type="email"
                      className="w-full border-0 border-b border-gray-200 pb-2 text-sm focus:outline-none focus:border-blue-500 bg-transparent placeholder-gray-300 transition-colors"
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="example@email.com"
                    />
                  </MinimalField>
                  <MinimalField label="접속 비밀번호 설정" required error={errors.password}>
                    <p className="text-xs text-gray-400 mb-2">수료증 발급 및 만족도 조사 시 사용할 비밀번호를 설정해주세요 (숫자 4자리)</p>
                    <input
                      type="password"
                      className="w-full border-0 border-b border-gray-200 pb-2 text-sm focus:outline-none focus:border-blue-500 bg-transparent placeholder-gray-300 transition-colors"
                      value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                      placeholder="숫자 4자리" maxLength={4}
                    />
                  </MinimalField>
                  <MinimalField label="기업명">
                    <input
                      className="w-full border-0 border-b border-gray-200 pb-2 text-sm focus:outline-none focus:border-blue-500 bg-transparent placeholder-gray-300 transition-colors"
                      value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                      placeholder="(선택) (주)울산스타트업"
                    />
                  </MinimalField>
                  <MinimalField label="신청 동기">
                    <textarea
                      className="w-full border-0 border-b border-gray-200 pb-2 text-sm focus:outline-none focus:border-blue-500 bg-transparent placeholder-gray-300 transition-colors resize-none h-16"
                      value={form.motivation} onChange={e => setForm(f => ({ ...f, motivation: e.target.value }))}
                      placeholder="(선택) 이 교육을 신청한 동기를 간략히 적어주세요"
                    />
                  </MinimalField>

                  {/* 개인정보 아코디언 */}
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setPrivacyOpen(o => !o)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                    >
                      <span>개인정보 수집·이용 안내</span>
                      <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${privacyOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {privacyOpen && (
                      <div className="px-4 py-3 text-xs text-gray-500 space-y-1 bg-white">
                        <p>· 수집 항목: 이름, 연락처, 이메일, 기업명</p>
                        <p>· 수집 목적: 교육 프로그램 운영 및 수료증 발급</p>
                        <p>· 보유 기간: 교육 완료 후 3년</p>
                        <p>· 기관명: 울산경제일자리진흥원</p>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.agree ? 'bg-blue-500 border-blue-500' : 'border-gray-300 group-hover:border-blue-400'}`}>
                      {form.agree && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={form.agree}
                      onChange={e => setForm(f => ({ ...f, agree: e.target.checked }))}
                    />
                    <span className="text-xs text-gray-600 font-medium">개인정보 수집·이용에 동의합니다 <span className="text-red-400">(필수)</span></span>
                  </label>
                  {errors.agree && <p className="text-xs text-red-500 -mt-3">{errors.agree}</p>}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedProgram(null)}
                      className="flex-1 py-3 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition font-medium"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <><Loader2 size={15} className="animate-spin" /> 신청 중...</>
                      ) : '신청 완료'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, text }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-500">
      <span className="text-gray-300 shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-400 w-20 shrink-0 text-xs">{label}</span>
      <span className="font-semibold text-gray-800 text-xs leading-relaxed">{value}</span>
    </div>
  )
}

function MinimalField({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
        {label} {required && <span className="text-red-400 normal-case">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}
