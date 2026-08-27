import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/formatPhone'
import { ULSAN_REGIONS } from '../../lib/constants'
import { CheckCircle, ChevronDown, ChevronUp, Search, ClipboardList } from 'lucide-react'
import PublicHeader from '../../components/common/PublicHeader'

function emptyForm() {
  return {
    name: '', company_name: '', phone: '', email: '', item: '', region: '', memo: '',
    pick1: '', pick2: '', pick3: '',
  }
}

export default function BusinessApply() {
  const [companies, setCompanies] = useState([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [companySearch, setCompanySearch] = useState('')
  const [companyFieldFilter, setCompanyFieldFilter] = useState('')
  const [form, setForm] = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  useEffect(() => {
    document.title = '멘토기업 매칭 신청 | 울산경제일자리진흥원'
    loadCompanies()
  }, [])

  async function loadCompanies() {
    setLoadingCompanies(true)
    try {
      const { data, error } = await supabase
        .from('mentor_companies')
        .select('id, company_name, field, intro')
        .eq('status', '활동중')
        .order('company_name')
      if (error) throw error
      setCompanies(data || [])
    } catch (e) {
      console.error('멘토기업 목록 조회 실패:', e)
      setError('멘토기업 목록을 불러오지 못했습니다. 잠시 후 새로고침 해주세요.')
      setCompanies([])
    } finally {
      setLoadingCompanies(false)
    }
  }

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const companyFields = [...new Set(companies.map(c => c.field).filter(Boolean))]
  const filteredCompanies = companies.filter(c =>
    (!companySearch || c.company_name?.includes(companySearch) || c.intro?.includes(companySearch)) &&
    (!companyFieldFilter || c.field === companyFieldFilter)
  )

  const picks = [form.pick1, form.pick2, form.pick3].filter(Boolean)
  const picksValid = picks.length === 3 && new Set(picks).size === 3
  const canSubmit = form.name.trim() && form.company_name.trim() && form.phone.trim() && picksValid && privacyAgreed

  async function handleSubmit() {
    if (!picksValid) { setError('멘토기업 1, 2, 3순위를 서로 다르게 선택해주세요.'); return }
    if (!privacyAgreed) { setError('개인정보 수집·이용에 동의해주세요.'); return }
    setSubmitting(true); setError('')

    try {
      const bizId = crypto.randomUUID()
      const { error: bizErr } = await supabase.from('small_businesses').insert({
        id: bizId,
        name: form.name.trim(),
        company_name: form.company_name.trim(),
        phone: form.phone.trim(),
        email: form.email || null,
        item: form.item || null,
        region: form.region || null,
        memo: form.memo || null,
        privacy_agreed: true,
      })

      if (bizErr) throw bizErr

      const prefRows = [
        { small_business_id: bizId, mentor_company_id: form.pick1, priority: 1 },
        { small_business_id: bizId, mentor_company_id: form.pick2, priority: 2 },
        { small_business_id: bizId, mentor_company_id: form.pick3, priority: 3 },
      ]
      const { error: prefErr } = await supabase.from('mentor_preferences').insert(prefRows)
      if (prefErr) throw prefErr
      setDone(true)
    } catch (e) {
      console.error('멘토매칭 신청 제출 실패:', e)
      setError(`제출 오류: ${e.message || '잠시 후 다시 시도해주세요.'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const companyName = id => companies.find(c => c.id === id)?.company_name || ''

  if (done) {
    return (
      <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
        <PublicHeader title="멘토기업 매칭 신청" />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#EBF3FB' }}>
            <CheckCircle size={40} style={{ color: '#2E75B6' }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">신청이 접수되었습니다!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            선택하신 멘토기업과의 상호 매칭 결과는 담당자가 확인 후 안내드립니다.<br />
            <Link to="/status" className="text-blue-600 font-medium hover:underline">신청 상태 조회 페이지</Link>에서 언제든 진행 상황을 확인하실 수 있습니다.
          </p>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-left shadow-sm">
            <div className="text-sm font-bold text-gray-700 mb-3">접수 내용 요약</div>
            <div className="space-y-2 text-sm">
              <Row label="이름" value={form.name} />
              <Row label="기업명" value={form.company_name} />
              <Row label="연락처" value={form.phone} />
              <Row label="1순위" value={companyName(form.pick1)} />
              <Row label="2순위" value={companyName(form.pick2)} />
              <Row label="3순위" value={companyName(form.pick3)} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <PublicHeader title="멘토기업 매칭 신청" />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">혁신 소상공인 AI활용지원사업</h1>
          <p className="text-sm text-gray-500">희망하는 멘토기업을 1, 2, 3순위로 선택해주세요</p>
          <Link to="/status" className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-600 hover:text-blue-800">
            <ClipboardList size={13} /> 이미 신청하셨나요? 신청 상태 조회
          </Link>
        </div>

        {/* 신청자 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">신청자 정보</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="이름 *">
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="홍길동" className={inp()} />
            </Field>
            <Field label="기업명 *">
              <input value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="(주)울산상회" className={inp()} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="연락처 *">
              <input value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))} placeholder="010-1234-5678" maxLength={13} className={inp()} />
            </Field>
            <Field label="이메일">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="example@email.com" className={inp()} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="업종 · 아이템">
              <input value={form.item} onChange={e => set('item', e.target.value)} placeholder="예: 요식업, 소매업 등" className={inp()} />
            </Field>
            <Field label="지역">
              <select value={form.region} onChange={e => set('region', e.target.value)} className={inp()}>
                <option value="">선택해주세요</option>
                {ULSAN_REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* 멘토기업 목록 조회 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">멘토기업 목록 살펴보기 ({companies.length}개)</h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={companySearch} onChange={e => setCompanySearch(e.target.value)}
                placeholder="기업명·소개 검색" className={inp() + ' pl-8'} />
            </div>
            <select value={companyFieldFilter} onChange={e => setCompanyFieldFilter(e.target.value)} className={inp() + ' w-auto'}>
              <option value="">전체 분야</option>
              {companyFields.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          {loadingCompanies ? (
            <p className="text-sm text-gray-400 py-4 text-center">불러오는 중...</p>
          ) : filteredCompanies.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">검색 조건에 맞는 멘토기업이 없습니다.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {filteredCompanies.map(c => (
                <div key={c.id} className="border border-gray-100 rounded-lg px-3 py-2 bg-gray-50/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-800">{c.company_name}</span>
                    {c.field && <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{c.field}</span>}
                  </div>
                  {c.intro && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{c.intro}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 멘토기업 선택 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-gray-700 pb-2 border-b border-gray-100">희망 멘토기업 선택 (1~3순위)</h2>
          {loadingCompanies ? (
            <p className="text-sm text-gray-400 py-4 text-center">멘토기업 목록을 불러오는 중...</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">등록된 멘토기업이 없습니다.</p>
          ) : (
            <>
              {[1, 2, 3].map(n => (
                <Field key={n} label={`${n}순위 멘토기업 *`}>
                  <select value={form[`pick${n}`]} onChange={e => set(`pick${n}`, e.target.value)} className={inp()}>
                    <option value="">선택해주세요</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id} disabled={picks.includes(c.id) && form[`pick${n}`] !== c.id}>
                        {c.company_name}{c.field ? ` (${c.field})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
              {picks.length > 0 && !picksValid && picks.length === 3 && (
                <p className="text-red-500 text-xs">1, 2, 3순위는 서로 다른 멘토기업을 선택해주세요.</p>
              )}
            </>
          )}
          <Field label="비고 (선택)">
            <textarea value={form.memo} onChange={e => set('memo', e.target.value)} rows={3}
              placeholder="멘토링을 통해 기대하는 점을 자유롭게 작성해주세요." className={inp() + ' resize-none'} />
          </Field>
        </div>

        {/* 개인정보 동의 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <label className="flex items-start gap-2.5 cursor-pointer flex-1">
              <input type="checkbox" checked={privacyAgreed} onChange={e => setPrivacyAgreed(e.target.checked)}
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
                <p><span className="font-semibold text-gray-700">수집 항목:</span> 이름, 기업명, 연락처, 이메일, 업종, 희망 멘토기업 선택 정보</p>
                <p><span className="font-semibold text-gray-700">수집 목적:</span> 혁신 소상공인 AI활용지원사업 멘토매칭 및 운영</p>
                <p><span className="font-semibold text-gray-700">보유 기간:</span> 사업 종료 후 3년</p>
              </div>
              <p className="text-gray-500 pt-1 border-t border-gray-200">
                귀하는 동의를 거부할 권리가 있으며, 거부 시 멘토매칭 신청이 제한될 수 있습니다.
              </p>
              <p className="text-gray-500"><span className="font-semibold text-gray-700">기관명:</span> 울산경제일자리진흥원</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">{error}</div>
        )}

        <button disabled={!canSubmit || submitting} onClick={handleSubmit}
          className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{ background: canSubmit ? '#2E75B6' : '#9CA3AF' }}>
          {submitting ? '제출 중...' : '멘토매칭 신청 완료'}
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
