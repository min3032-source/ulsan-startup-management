import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { EXPERT_FIELDS } from '../../lib/constants'
import { CheckCircle, Plus, X } from 'lucide-react'
import PublicHeader from '../../components/common/PublicHeader'

const TECH_FIELDS = [
  '제조(기계, 에너지)',
  '제조(패션, 주얼리)',
  'IT(헬스케어)',
  'IT(e-커머스)',
  'IT(제조)',
  'IT(서비스)',
  '교육 서비스',
  '서비스(일반)',
]

const TABS = ['기본정보', '전문분야', '근무경력', '컨설팅실적', '동의']

function emptyForm() {
  return {
    name: '', birth_date: '', phone: '', email: '',
    org: '', role: '', education: '', major: '', address: '', bank_account: '',
    fields: [], tech_fields: [],
    licenses: [],
    work_history: [],
    consulting_history: [],
    privacy_agreed: false,
    integrity_agreed: false,
  }
}

export default function ExpertApply() {
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  // ── 자격증
  const addLicense = () => set('licenses', [...form.licenses, { name: '', date: '', org: '' }])
  const updateLicense = (i, k, v) => set('licenses', form.licenses.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  const removeLicense = i => set('licenses', form.licenses.filter((_, idx) => idx !== i))

  // ── 근무경력
  const addWork = () => set('work_history', [...form.work_history, { org: '', period: '', dept: '', role: '', duties: '' }])
  const updateWork = (i, k, v) => set('work_history', form.work_history.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  const removeWork = i => set('work_history', form.work_history.filter((_, idx) => idx !== i))

  // ── 컨설팅실적
  const addConsult = () => set('consulting_history', [...form.consulting_history, { org: '', period: '', project: '', content: '' }])
  const updateConsult = (i, k, v) => set('consulting_history', form.consulting_history.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  const removeConsult = i => set('consulting_history', form.consulting_history.filter((_, idx) => idx !== i))

  const canSubmit = form.privacy_agreed && form.integrity_agreed

  async function handleSubmit() {
    if (!form.name.trim()) { alert('성명을 입력해주세요.'); setTab(0); return }
    if (!form.phone.trim()) { alert('연락처를 입력해주세요.'); setTab(0); return }
    if (!form.email.trim()) { alert('이메일을 입력해주세요.'); setTab(0); return }
    setSubmitting(true); setError('')
    const { error } = await supabase.from('expert_applications').insert({
      applicant_name: form.name,
      email: form.email,
      phone: form.phone,
      current_organization: form.org,
      position: form.role,
      expertise_field: form.fields.join(', '),
      introduction: JSON.stringify({
        birth_date: form.birth_date,
        education: form.education,
        major: form.major,
        address: form.address,
        bank_account: form.bank_account,
        tech_fields: form.tech_fields,
        licenses: form.licenses,
        work_history: form.work_history,
        consulting_history: form.consulting_history,
      }),
    })
    setSubmitting(false)
    if (error) {
      setError('제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
        <PublicHeader title="전문가 등록 신청" />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#EBF3FB' }}>
            <CheckCircle size={40} style={{ color: '#2E75B6' }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">신청이 접수되었습니다!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            담당자 검토 후 등록 여부를 안내해드리겠습니다.<br />
            <strong>{form.email}</strong>으로 결과를 안내드립니다.
          </p>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-left shadow-sm">
            <div className="text-sm font-bold text-gray-700 mb-3">접수 내용 요약</div>
            <div className="space-y-2 text-sm">
              <Row label="성명" value={form.name} />
              <Row label="연락처" value={form.phone} />
              <Row label="이메일" value={form.email} />
              {form.org && <Row label="소속" value={`${form.org}${form.role ? ' · ' + form.role : ''}`} />}
              {form.fields.length > 0 && <Row label="전문분야" value={<span className="font-semibold text-blue-700">{form.fields.join(', ')}</span>} />}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <PublicHeader title="전문가 등록 신청" />

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* 탭 진행 표시 */}
        <div className="flex items-center mb-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {TABS.map((label, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors border-b-2 ${
                tab === i
                  ? 'border-blue-500 text-blue-600 bg-blue-50/60'
                  : i < tab
                  ? 'border-green-400 text-green-600 bg-green-50/40'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mb-1 ${
                i < tab ? 'bg-green-500 text-white' :
                tab === i ? 'text-white' : 'bg-gray-200 text-gray-400'
              }`} style={tab === i ? { background: '#2E75B6' } : {}}>
                {i < tab ? '✓' : i + 1}
              </span>
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">

          {/* ── Tab 0: 기본정보 ── */}
          {tab === 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-800 mb-4">기본 정보</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="성명 *">
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="홍길동" className={inp()} />
                </Field>
                <Field label="생년월일">
                  <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className={inp()} />
                </Field>
                <Field label="연락처 *">
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="010-0000-0000" className={inp()} />
                </Field>
              </div>
              <Field label="이메일 *">
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="example@email.com" className={inp()} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="소속기관">
                  <input value={form.org} onChange={e => set('org', e.target.value)} placeholder="예: 울산대학교, 법무법인 OO" className={inp()} />
                </Field>
                <Field label="직위·직책">
                  <input value={form.role} onChange={e => set('role', e.target.value)} placeholder="예: 교수, 변호사, 대표" className={inp()} />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="최종학력">
                  <input value={form.education} onChange={e => set('education', e.target.value)} placeholder="예: 석사 졸업" className={inp()} />
                </Field>
                <Field label="전공">
                  <input value={form.major} onChange={e => set('major', e.target.value)} className={inp()} />
                </Field>
              </div>
              <Field label="주소">
                <input value={form.address} onChange={e => set('address', e.target.value)} className={inp()} />
              </Field>
              <Field label="계좌번호">
                <input value={form.bank_account} onChange={e => set('bank_account', e.target.value)} placeholder="은행명 포함 계좌번호" className={inp()} />
              </Field>
            </div>
          )}

          {/* ── Tab 1: 전문분야 ── */}
          {tab === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-1">전문 분야</h2>
                <p className="text-xs text-gray-400 mb-4">복수 선택 가능합니다</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EXPERT_FIELDS.map(f => (
                    <label key={f} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                      form.fields.includes(f)
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                    }`}>
                      <input
                        type="checkbox"
                        checked={form.fields.includes(f)}
                        onChange={e => set('fields', e.target.checked ? [...form.fields, f] : form.fields.filter(x => x !== f))}
                        className="accent-blue-600 w-3.5 h-3.5"
                      />
                      {f}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-gray-800">기술 분야</h2>
                  <span className="text-xs text-gray-400">복수 선택 가능</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {TECH_FIELDS.map(f => (
                    <label key={f} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium ${
                      form.tech_fields.includes(f)
                        ? 'border-teal-400 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                    }`}>
                      <input
                        type="checkbox"
                        checked={form.tech_fields.includes(f)}
                        onChange={e => set('tech_fields', e.target.checked ? [...form.tech_fields, f] : form.tech_fields.filter(x => x !== f))}
                        className="accent-teal-600 w-3.5 h-3.5"
                      />
                      {f}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-800">자격증 · 면허</h2>
                  <button type="button" onClick={addLicense} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                    <Plus size={13} /> 추가
                  </button>
                </div>
                {form.licenses.length === 0 ? (
                  <p className="text-xs text-gray-400 py-5 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    등록된 자격증·면허가 없습니다
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.licenses.map((lic, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input className={inp() + ' flex-1'} placeholder="자격증·면허명" value={lic.name} onChange={e => updateLicense(i, 'name', e.target.value)} />
                        <input className={inp() + ' w-36'} placeholder="발급기관" value={lic.org} onChange={e => updateLicense(i, 'org', e.target.value)} />
                        <input className={inp() + ' w-36'} type="date" value={lic.date} onChange={e => updateLicense(i, 'date', e.target.value)} />
                        <button type="button" onClick={() => removeLicense(i)} className="p-1.5 text-gray-300 hover:text-red-400"><X size={15} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab 2: 근무경력 ── */}
          {tab === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800">근무 경력</h2>
                <button type="button" onClick={addWork} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                  <Plus size={13} /> 행 추가
                </button>
              </div>
              {form.work_history.length === 0 ? (
                <p className="text-xs text-gray-400 py-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  근무 경력을 추가해주세요
                </p>
              ) : (
                <div className="space-y-3">
                  {form.work_history.map((row, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative bg-gray-50/40">
                      <button type="button" onClick={() => removeWork(i)} className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-400"><X size={14} /></button>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="소속기관">
                          <input className={inp()} value={row.org} onChange={e => updateWork(i, 'org', e.target.value)} />
                        </Field>
                        <Field label="기간">
                          <input className={inp()} value={row.period} onChange={e => updateWork(i, 'period', e.target.value)} placeholder="예: 2020.03 ~ 2023.02" />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="부서">
                          <input className={inp()} value={row.dept} onChange={e => updateWork(i, 'dept', e.target.value)} />
                        </Field>
                        <Field label="직위">
                          <input className={inp()} value={row.role} onChange={e => updateWork(i, 'role', e.target.value)} />
                        </Field>
                      </div>
                      <Field label="담당업무">
                        <input className={inp()} value={row.duties} onChange={e => updateWork(i, 'duties', e.target.value)} />
                      </Field>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 3: 컨설팅실적 ── */}
          {tab === 3 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800">컨설팅 실적</h2>
                <button type="button" onClick={addConsult} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                  <Plus size={13} /> 행 추가
                </button>
              </div>
              {form.consulting_history.length === 0 ? (
                <p className="text-xs text-gray-400 py-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  컨설팅 실적을 추가해주세요
                </p>
              ) : (
                <div className="space-y-3">
                  {form.consulting_history.map((row, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative bg-gray-50/40">
                      <button type="button" onClick={() => removeConsult(i)} className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-400"><X size={14} /></button>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="수행기관">
                          <input className={inp()} value={row.org} onChange={e => updateConsult(i, 'org', e.target.value)} />
                        </Field>
                        <Field label="기간">
                          <input className={inp()} value={row.period} onChange={e => updateConsult(i, 'period', e.target.value)} placeholder="예: 2023.04 ~ 2023.06" />
                        </Field>
                      </div>
                      <Field label="사업명">
                        <input className={inp()} value={row.project} onChange={e => updateConsult(i, 'project', e.target.value)} />
                      </Field>
                      <Field label="주요 내용">
                        <input className={inp()} value={row.content} onChange={e => updateConsult(i, 'content', e.target.value)} />
                      </Field>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Tab 4: 동의 ── */}
          {tab === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-800 mb-4">동의 사항</h2>
              <AgreeBox
                title="개인정보 수집·이용 동의 (필수)"
                body={`수집 항목: 성명, 생년월일, 연락처, 이메일, 소속, 경력, 계좌번호 등\n수집 목적: 전문가 DB 구축 및 창업 지원 사업 운영\n보유 기간: 활동 종료 후 3년\n※ 동의를 거부하실 수 있으나, 거부 시 전문가 등록이 불가합니다.`}
                checked={form.privacy_agreed}
                onChange={v => set('privacy_agreed', v)}
              />
              <AgreeBox
                title="청렴 서약 동의 (필수)"
                body={`본인은 울산경제일자리진흥원 전문가로서 창업 지원 사업에 공정하고 투명하게 참여하며,\n금품·향응 수수, 부당한 청탁 등 일체의 부정행위를 하지 않겠습니다.\n또한 직무와 관련된 비밀을 외부에 누설하지 않겠습니다.`}
                checked={form.integrity_agreed}
                onChange={v => set('integrity_agreed', v)}
              />

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">{error}</div>
              )}

              <button
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                style={{ background: canSubmit ? '#2E75B6' : '#9CA3AF' }}
              >
                {submitting ? '제출 중...' : '전문가 등록 신청 완료'}
              </button>
              {!canSubmit && (
                <p className="text-xs text-center text-gray-400">두 항목 모두 동의해야 제출할 수 있습니다</p>
              )}
            </div>
          )}
        </div>

        {/* 탭 이동 버튼 */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setTab(t => Math.max(0, t - 1))}
            disabled={tab === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-30"
          >
            ← 이전
          </button>
          {tab < TABS.length - 1 && (
            <button
              onClick={() => setTab(t => Math.min(TABS.length - 1, t + 1))}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: '#2E75B6' }}
            >
              다음 →
            </button>
          )}
        </div>
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

function AgreeBox({ title, body, checked, onChange }) {
  return (
    <div className={`rounded-xl border-2 p-4 transition-colors ${checked ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200'}`}>
      <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>
      <pre className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed mb-4 font-sans bg-white rounded-lg p-3 border border-gray-100">{body}</pre>
      <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => onChange(!checked)}>
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
          {checked && <span className="text-white text-xs font-bold">✓</span>}
        </div>
        <span className="text-sm font-medium text-gray-700">위 내용에 동의합니다</span>
      </label>
    </div>
  )
}

function inp() {
  return 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white'
}
