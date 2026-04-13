import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { BookOpen, MapPin, User, Calendar, Users, X, CheckCircle, Clock, Award } from 'lucide-react'

const CATEGORY_COLOR = {
  '창업기초': 'bg-blue-100 text-blue-700',
  '마케팅':   'bg-purple-100 text-purple-700',
  '재무':     'bg-green-100 text-green-700',
  '기술':     'bg-teal-100 text-teal-700',
  '네트워킹': 'bg-amber-100 text-amber-700',
  '기타':     'bg-gray-100 text-gray-600',
}

export default function EducationApply() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', company_name: '', motivation: '', agree: false })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState({})

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
    })
    if (error) { alert('신청 실패: ' + error.message); setSubmitting(false); return }

    // 확인 이메일 발송
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
    setForm({ name: '', phone: '', email: '', company_name: '', motivation: '', agree: false })
    setErrors({})
    setDone(false)
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
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      {/* 헤더 */}
      <header style={{ background: '#0D1B2A' }} className="py-8 px-6 text-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-bold tracking-widest mb-2" style={{ color: '#7EC8E3' }}>울산경제일자리진흥원</p>
          <h1 className="text-2xl font-bold">창업 교육 신청</h1>
          <p className="text-sm text-white/60 mt-1">울산경제일자리진흥원의 창업 교육 프로그램을 신청해주세요.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        {loading ? (
          <div className="text-center py-20 text-gray-400">로딩 중...</div>
        ) : programs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BookOpen size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">현재 모집중인 교육 프로그램이 없습니다.</p>
            <p className="text-sm mt-1">교육 프로그램은 정기적으로 업데이트됩니다.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {programs.map(prog => {
              const count = enrolledCount(prog)
              const isFull = prog.max_participants && count >= prog.max_participants
              return (
                <div key={prog.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${CATEGORY_COLOR[prog.category] || 'bg-gray-100 text-gray-600'}`}>
                          {prog.category}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${prog.program_type === '온라인' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {prog.program_type}
                        </span>
                      </div>
                      {isFull && (
                        <span className="px-2 py-0.5 text-xs rounded font-bold bg-red-100 text-red-600">마감</span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-gray-800 mb-1">{prog.title}</h2>
                    {prog.description && <p className="text-xs text-gray-500 line-clamp-2">{prog.description}</p>}
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600">
                    {(prog.start_date || prog.end_date) && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" />
                        <span>{prog.start_date} ~ {prog.end_date}</span>
                      </div>
                    )}
                    {prog.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-gray-400" />
                        <span>{prog.location}</span>
                      </div>
                    )}
                    {prog.instructor && (
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-gray-400" />
                        <span>{prog.instructor} 강사</span>
                      </div>
                    )}
                    {prog.total_hours && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-400" />
                        <span>총 교육시간 {prog.total_hours}시간</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Award size={13} className="text-gray-400" />
                      <span>수료 기준 출석률 {prog.completion_rate ?? 80}% 이상</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={13} className="text-gray-400" />
                      <span>
                        {count}명 신청
                        {prog.max_participants ? ` / 정원 ${prog.max_participants}명` : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => openApply(prog)}
                    disabled={isFull}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      isFull
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'text-white hover:opacity-90'
                    }`}
                    style={!isFull ? { background: '#2E75B6' } : {}}
                  >
                    {isFull ? '마감되었습니다' : '신청하기'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 신청 모달 */}
      {selectedProgram && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {done ? (
              <div className="p-8 text-center space-y-4">
                <CheckCircle size={56} className="text-green-500 mx-auto" />
                <h2 className="text-xl font-bold text-gray-800">신청해주셔서 감사합니다!</h2>
                <div className="bg-gray-50 rounded-xl px-5 py-4 text-left space-y-2 text-sm text-gray-600">
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 shrink-0">신청 교육</span>
                    <span className="font-medium text-gray-800">{selectedProgram.title}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-20 shrink-0">신청자</span>
                    <span className="font-medium text-gray-800">{form.name}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">담당자 검토 후 이메일로 승인 안내를 드립니다.</p>
                <p className="text-xs text-gray-400">추가 문의: 울산경제일자리진흥원 창업지원팀</p>
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="mt-2 px-6 py-2.5 text-sm text-white rounded-xl"
                  style={{ background: '#2E75B6' }}
                >
                  홈으로
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-base font-bold text-gray-800">교육 신청</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedProgram.title}</p>
                  </div>
                  <button onClick={() => setSelectedProgram(null)}><X size={18} className="text-gray-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
                  <FormField label="이름 *" error={errors.name}>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="홍길동"
                    />
                  </FormField>
                  <FormField label="연락처 *" error={errors.phone}>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="010-0000-0000"
                    />
                  </FormField>
                  <FormField label="이메일 *" error={errors.email}>
                    <input
                      type="email"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="example@email.com"
                    />
                  </FormField>
                  <FormField label="기업명 (선택)">
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                      placeholder="(주)울산스타트업"
                    />
                  </FormField>
                  <FormField label="신청 동기">
                    <textarea
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 h-20 resize-none"
                      value={form.motivation} onChange={e => setForm(f => ({ ...f, motivation: e.target.value }))}
                      placeholder="이 교육을 신청한 동기를 간략히 적어주세요"
                    />
                  </FormField>
                  <div>
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1 mb-2">
                      <p className="font-medium text-gray-600">개인정보 수집·이용 안내</p>
                      <p>· 수집 항목: 이름, 연락처, 이메일, 기업명</p>
                      <p>· 수집 목적: 교육 프로그램 운영 및 수료증 발급</p>
                      <p>· 보유 기간: 교육 완료 후 3년</p>
                      <p>· 기관명: 울산경제일자리진흥원</p>
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={form.agree}
                        onChange={e => setForm(f => ({ ...f, agree: e.target.checked }))}
                      />
                      <span className="text-xs text-gray-600 font-medium">
                        개인정보 수집·이용에 동의합니다. (필수)
                      </span>
                    </label>
                    {errors.agree && <p className="text-xs text-red-500 mt-1">{errors.agree}</p>}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setSelectedProgram(null)} className="flex-1 py-2.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50">취소</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-2.5 text-sm text-white rounded-xl disabled:opacity-40" style={{ background: '#2E75B6' }}>
                      {submitting ? '신청 중...' : '신청 완료'}
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

function FormField({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
