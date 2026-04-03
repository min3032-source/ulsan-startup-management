import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { EXPERT_FIELDS } from '../../lib/constants'
import { CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import PublicHeader from '../../components/common/PublicHeader'

const FIELD_ICONS = {
  '창업':        { icon: '🚀', color: '#0D6EFD', bg: '#E7F1FF' },
  '기술·R&D':   { icon: '⚙️', color: '#2E75B6', bg: '#EBF3FB' },
  '경영·마케팅': { icon: '📊', color: '#17627A', bg: '#E8F4F7' },
  '법무·특허':   { icon: '⚖️', color: '#6B3FA0', bg: '#F3EDF9' },
  '재무·투자':   { icon: '💰', color: '#1E5631', bg: '#EBF5EE' },
  '인사·노무':   { icon: '👥', color: '#8B6914', bg: '#FBF5E6' },
  '세무·회계':   { icon: '🧾', color: '#8B6914', bg: '#FBF5E6' },
  '수출·글로벌': { icon: '🌐', color: '#17627A', bg: '#E8F4F7' },
  '디자인·UX':   { icon: '🎨', color: '#C55A11', bg: '#FCF0E8' },
  '기타':        { icon: '💡', color: '#6B7280', bg: '#F3F4F6' },
}

const STEPS = ['기본 정보 & 전문 분야', '경력 & 상담 내용', '신청 완료']

function emptyForm() {
  return {
    name: '', phone: '', email: '',
    org: '', role: '',
    fields: [], sub_field: '',
    career: '', avail_content: '',
  }
}

export default function ExpertApply() {
  const [step, setStep]       = useState(0)
  const [form, setForm]       = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState('')

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const step0Done = form.name && form.phone && form.email && form.fields.length > 0
  const step1Done = form.career.trim().length >= 10

  function toggleField(f) {
    set('fields', form.fields.includes(f) ? form.fields.filter(x => x !== f) : [...form.fields, f])
  }

  async function handleSubmit() {
    setSubmitting(true); setError('')
    const expertiseField = [form.fields.join(','), form.sub_field].filter(Boolean).join(' · ')
    const { error } = await supabase.from('expert_applications').insert({
      applicant_name: form.name, email: form.email, phone: form.phone,
      current_organization: form.org, position: form.role,
      expertise_field: expertiseField,
      career_years: form.career.trim() ? parseInt(form.career, 10) : null,
      introduction: form.avail_content,
    })
    setSubmitting(false)
    if (error) {
      setError('제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } else {
      setStep(2)
    }
  }

  const firstFieldInfo = FIELD_ICONS[form.fields[0]] || null

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <PublicHeader title="전문가 등록 신청" />

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* 진행 단계 */}
        {step < 2 && (
          <div className="flex items-center mb-8">
            {STEPS.slice(0, 2).map((label, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step ? 'bg-green-500 text-white' :
                    i === step ? 'text-white' : 'bg-gray-200 text-gray-400'
                  }`} style={i === step ? { background: '#2E75B6' } : {}}>
                    {i < step ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-gray-800' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {i < 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 0: 기본 정보 & 전문 분야 ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-1">기본 정보 & 전문 분야</h1>
              <p className="text-sm text-gray-500">창업자 멘토링·자문을 제공할 전문가를 모집합니다</p>
            </div>

            {/* 기본 정보 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">기본 정보</h2>

              <Field label="이름 *">
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="홍길동" className={inp()} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="연락처 *">
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    placeholder="010-0000-0000" className={inp()} />
                </Field>
                <Field label="이메일 *">
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="example@email.com" className={inp()} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="소속기관">
                  <input value={form.org} onChange={e => set('org', e.target.value)}
                    placeholder="예: 울산대학교, 법무법인 OO" className={inp()} />
                </Field>
                <Field label="직위">
                  <input value={form.role} onChange={e => set('role', e.target.value)}
                    placeholder="예: 교수, 변호사, 대표" className={inp()} />
                </Field>
              </div>
            </div>

            {/* 전문 분야 선택 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-700 pb-3 border-b border-gray-100 mb-4">
                전문 분야 선택 * <span className="text-xs text-gray-400 font-normal">(복수 선택 가능)</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {EXPERT_FIELDS.map(f => {
                  const fi = FIELD_ICONS[f]
                  const selected = form.fields.includes(f)
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleField(f)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                        selected ? 'border-2' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      style={selected ? { borderColor: fi?.color, background: fi?.bg } : {}}
                    >
                      <span className="text-lg leading-none">{fi?.icon}</span>
                      <span className={`text-xs font-semibold leading-tight ${selected ? '' : 'text-gray-600'}`}
                        style={selected ? { color: fi?.color } : {}}>
                        {f}
                      </span>
                      {selected && (
                        <span className="ml-auto w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: fi?.color }}>✓</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* 세부 분야 */}
              {form.fields.length > 0 && (
                <div className="mt-4">
                  <Field label="세부 전문 분야">
                    <input value={form.sub_field} onChange={e => set('sub_field', e.target.value)}
                      placeholder="예: AI·빅데이터, 창업법률·특허, VC투자·IR"
                      className={inp()} />
                  </Field>
                </div>
              )}
            </div>

            <button
              disabled={!step0Done}
              onClick={() => setStep(1)}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: step0Done ? '#2E75B6' : '#9CA3AF' }}
            >
              다음 단계 — 경력 & 상담 내용 <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 1: 경력 & 상담 내용 ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-1">경력 & 상담 내용</h1>
              <p className="text-sm text-gray-500">경력과 제공 가능한 자문 내용을 작성해주세요</p>
            </div>

            {/* 선택된 분야 요약 */}
            {form.fields.length > 0 && (
              <div className="rounded-xl p-4 border bg-blue-50 border-blue-100">
                <div className="text-xs text-gray-500 mb-2">선택 분야</div>
                <div className="flex flex-wrap gap-2">
                  {form.fields.map(f => {
                    const fi = FIELD_ICONS[f]
                    return (
                      <span key={f} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: fi?.bg, color: fi?.color, border: `1px solid ${fi?.color}40` }}>
                        <span>{fi?.icon}</span>{f}
                      </span>
                    )
                  })}
                  {form.sub_field && <span className="text-xs text-gray-500 self-center">· {form.sub_field}</span>}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <Field label="주요 경력 * (10자 이상)">
                <textarea
                  value={form.career}
                  onChange={e => set('career', e.target.value)}
                  rows={5}
                  placeholder={`예:\n- 삼성전자 AI연구소 10년 근무\n- KAIST 컴퓨터공학 교수 5년\n- 스타트업 기술 자문 경험 다수`}
                  className={inp() + ' resize-none'}
                />
                <div className={`text-xs mt-1 text-right ${form.career.length >= 10 ? 'text-green-500' : 'text-gray-400'}`}>
                  {form.career.length}자 {form.career.length < 10 && '(최소 10자)'}
                </div>
              </Field>

              <Field label="상담 가능 내용">
                <textarea
                  value={form.avail_content}
                  onChange={e => set('avail_content', e.target.value)}
                  rows={4}
                  placeholder={`예:\n- 초기 창업자 기술 로드맵 수립\n- AI·머신러닝 기술 자문\n- 정부 R&D 과제 기획 지원`}
                  className={inp() + ' resize-none'}
                />
              </Field>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(0)}
                className="flex items-center gap-1 px-5 py-3 rounded-xl text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors">
                <ChevronLeft size={15} /> 이전
              </button>
              <button
                disabled={!step1Done || submitting}
                onClick={handleSubmit}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: step1Done ? '#2E75B6' : '#9CA3AF' }}
              >
                {submitting ? '제출 중...' : '전문가 등록 신청'}
                {!submitting && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: 완료 ── */}
        {step === 2 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: '#EBF3FB' }}>
              <CheckCircle size={40} style={{ color: '#2E75B6' }} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">신청이 접수되었습니다!</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              담당자 검토 후 등록 여부를 안내해드리겠습니다.<br />
              <strong>{form.email}</strong>으로 결과를 안내드립니다.
            </p>

            <div className="bg-white rounded-xl border border-gray-200 p-5 text-left mb-6 shadow-sm">
              <div className="text-sm font-bold text-gray-700 mb-3">접수 내용 요약</div>
              <div className="space-y-2 text-sm">
                <Row label="이름"   value={form.name} />
                <Row label="연락처" value={form.phone} />
                <Row label="이메일" value={form.email} />
                {form.org  && <Row label="소속" value={`${form.org}${form.role ? ' · ' + form.role : ''}`} />}
                {form.fields.length > 0 && (
                  <Row label="전문 분야"
                    value={
                      <span className="font-semibold text-blue-700">
                        {form.fields.join(', ')}{form.sub_field ? ` · ${form.sub_field}` : ''}
                      </span>
                    }
                  />
                )}
              </div>
            </div>
          </div>
        )}
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
      <span className="text-gray-400 min-w-[72px]">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
    </div>
  )
}

function inp() {
  return 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white'
}
