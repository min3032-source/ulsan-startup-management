import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/formatPhone'
import { CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import PublicHeader from '../../components/common/PublicHeader'

const STAGES = ['예비창업자', '초기창업자', '성장기창업자']

const CONSULT_FIELDS = [
  '아이템 발굴/검증',
  '사업계획서 작성',
  '마케팅/홍보',
  '자금/투자',
  '법인설립/인허가',
  '정부지원사업',
  '기타',
]

const HOLIDAYS_2026 = [
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18',
  '2026-03-01', '2026-05-01', '2026-05-05', '2026-05-24',
  '2026-06-06', '2026-08-15', '2026-09-30', '2026-10-01',
  '2026-10-02', '2026-10-03', '2026-10-09', '2026-12-25',
]

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function isValidDate(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  if (day === 0 || day === 6) return false
  if (HOLIDAYS_2026.includes(dateStr)) return false
  return true
}

function emptyForm() {
  return {
    name: '', phone: '', email: '',
    stage: '', consult_field: '',
    preferred_date: '', preferred_time: '', inquiry: '',
  }
}

export default function ConsultApply() {
  const [form, setForm] = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  useEffect(() => {
    document.title = '창업지원 상담 신청 | 울산경제일자리진흥원'
    const setMeta = (prop, val) => {
      let el = document.querySelector(`meta[property="${prop}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el) }
      el.setAttribute('content', val)
    }
    setMeta('og:title', '창업지원 상담 신청')
    setMeta('og:description', '울산경제일자리진흥원 창업지원 상담을 신청하세요.')
    setMeta('og:url', window.location.href)
  }, [])

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const canSubmit = form.name && form.phone

  async function handleSubmit() {
    if (!privacyAgreed) { setError('개인정보 수집·이용에 동의해주세요.'); return }
    setSubmitting(true); setError('')
    const { error } = await supabase.from('founders').insert({
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      stage: form.stage || null,
      consult_status: 'pending',
      source: '온라인상담신청',
      notes: JSON.stringify({
        consult_field: form.consult_field,
        preferred_date: form.preferred_date || null,
        preferred_time: form.preferred_time || null,
        inquiry: form.inquiry,
      }),
    })
    setSubmitting(false)
    if (error) { setError(`제출 오류: ${error.message}`); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
        <PublicHeader title="창업지원 상담 신청" />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: '#EBF3FB' }}>
            <CheckCircle size={40} style={{ color: '#2E75B6' }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">신청이 완료되었습니다!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            담당자가 신청 내용을 검토 후<br />
            <strong>{form.phone}</strong>으로 연락드리겠습니다.<br />
            {form.preferred_date && `(희망 상담일: ${form.preferred_date} ${form.preferred_time})`}
          </p>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-left mb-8 shadow-sm">
            <div className="text-sm font-bold text-gray-700 mb-3">접수 내용 요약</div>
            <div className="space-y-2 text-sm">
              <Row label="이름" value={form.name} />
              <Row label="연락처" value={form.phone} />
              {form.stage && <Row label="창업단계" value={form.stage} />}
              {form.consult_field && <Row label="희망상담분야" value={form.consult_field} />}
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 text-left border border-blue-100">
            <div className="font-semibold mb-1">📞 담당 부서</div>
            <div className="text-xs text-blue-600">울산경제일자리진흥원 창업지원부</div>
            <div className="text-xs text-blue-500 mt-1">업무시간: 평일 09:00 ~ 18:00</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <PublicHeader title="창업지원 상담 신청" />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">상담 신청서 작성</h1>
          <p className="text-sm text-gray-500">담당자가 확인 후 연락드립니다</p>
        </div>

        {/* 신청자 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">신청자 정보</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="이름 *">
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="홍길동" className={inp()} />
            </Field>
            <Field label="연락처 *">
              <input value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))}
                placeholder="010-1234-5678" maxLength={13} className={inp()} />
            </Field>
          </div>
          <Field label="이메일">
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="example@email.com" className={inp()} />
          </Field>
        </div>

        {/* 창업 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">창업 정보</h2>
          <Field label="창업단계">
            <div className="flex gap-2 flex-wrap">
              {STAGES.map(s => (
                <button key={s} type="button" onClick={() => set('stage', s)}
                  className={`flex-1 py-2 rounded-lg text-sm border-2 font-medium transition-all ${
                    form.stage === s
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <Field label="희망 상담 분야">
            <select value={form.consult_field} onChange={e => set('consult_field', e.target.value)} className={inp()}>
              <option value="">분야 선택</option>
              {CONSULT_FIELDS.map(f => <option key={f}>{f}</option>)}
            </select>
          </Field>
        </div>

        {/* 상담 신청 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">상담 신청</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="희망 상담일">
              <input type="date" value={form.preferred_date} min={today()}
                onChange={e => { set('preferred_date', e.target.value); set('preferred_time', '') }}
                className={inp()} />
              {form.preferred_date && !isValidDate(form.preferred_date) && (
                <p className="text-red-500 text-xs mt-1">주말 및 공휴일은 선택할 수 없습니다.</p>
              )}
            </Field>
            <Field label="희망 시간">
              <select value={form.preferred_time}
                onChange={e => set('preferred_time', e.target.value)}
                disabled={!form.preferred_date || !isValidDate(form.preferred_date)}
                className={inp()}>
                <option value="">선택 (09:00~17:30, 점심 제외)</option>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="문의 내용">
            <textarea value={form.inquiry} onChange={e => set('inquiry', e.target.value)}
              rows={4} placeholder="궁금하신 점이나 상담 받고 싶은 내용을 자유롭게 작성해주세요."
              className={inp() + ' resize-none'} />
          </Field>
        </div>

        {/* 개인정보 동의 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <label className="flex items-start gap-2.5 cursor-pointer flex-1">
              <input type="checkbox" checked={privacyAgreed}
                onChange={e => setPrivacyAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0 cursor-pointer" />
              <span className="text-sm font-medium text-gray-800">
                개인정보 수집·이용에 동의합니다.
                <span className="text-red-500 ml-1">(필수)</span>
              </span>
            </label>
            <button type="button" onClick={() => setPrivacyOpen(p => !p)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 flex-shrink-0 font-medium">
              전문 보기
              {privacyOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
          {privacyOpen && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 space-y-2 leading-relaxed">
              <p className="font-bold text-gray-700 text-sm">개인정보 수집·이용 동의서</p>
              <div className="space-y-1.5">
                <p><span className="font-semibold text-gray-700">수집 항목:</span> 이름, 연락처, 이메일, 창업단계, 희망상담분야, 상담 신청 내용</p>
                <p><span className="font-semibold text-gray-700">수집 목적:</span> 창업 상담 서비스 제공 및 창업 지원사업 안내</p>
                <p><span className="font-semibold text-gray-700">보유 기간:</span> 상담 완료 후 3년</p>
              </div>
              <p className="text-gray-500 pt-1 border-t border-gray-200">
                귀하는 동의를 거부할 권리가 있으며, 거부 시 상담 신청 서비스 이용이 제한될 수 있습니다.
              </p>
              <p className="text-gray-500"><span className="font-semibold text-gray-700">기관명:</span> 울산경제일자리진흥원</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <button
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
          className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{ background: canSubmit ? '#2E75B6' : '#9CA3AF' }}>
          {submitting ? '제출 중...' : '상담 신청 완료'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-400 min-w-[80px]">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}

function inp() {
  return 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white'
}
