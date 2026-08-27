import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/formatPhone'
import { ULSAN_REGIONS } from '../../lib/constants'
import { CheckCircle, Heart, HeartOff, LogOut, Search } from 'lucide-react'
import PublicHeader from '../../components/common/PublicHeader'

const MAX_INTEREST = 20

const TABS = [
  { id: 'applicants', label: '신청 소상공인 목록' },
  { id: 'interested', label: '내 선택 목록' },
  { id: 'matched',    label: '매칭 결과' },
]

export default function CompanySelect() {
  const [companies, setCompanies] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [phone, setPhone] = useState('')
  const [authError, setAuthError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [company, setCompany] = useState(null)

  const [applicants, setApplicants] = useState([])
  const [interested, setInterested] = useState(new Set())
  const [matchings, setMatchings] = useState([])
  const [loading, setLoading] = useState(false)

  const [tab, setTab] = useState('applicants')
  const [regionFilter, setRegionFilter] = useState('')
  const [itemSearch, setItemSearch] = useState('')

  useEffect(() => {
    document.title = '멘토기업 조회 | 울산경제일자리진흥원'
    loadCompanies()
  }, [])

  async function loadCompanies() {
    try {
      const { data, error } = await supabase.from('mentor_companies').select('id, company_name').order('company_name')
      if (error) throw error
      setCompanies(data || [])
    } catch (e) {
      console.error('멘토기업 목록 조회 실패:', e)
      setAuthError('멘토기업 목록을 불러오지 못했습니다. 잠시 후 새로고침 해주세요.')
      setCompanies([])
    }
  }

  async function handleVerify() {
    if (!selectedId || !phone.trim()) { setAuthError('기업명과 연락처를 모두 입력해주세요.'); return }
    setVerifying(true); setAuthError('')
    try {
      const { data, error } = await supabase.rpc('verify_mentor_company', { p_company_id: selectedId, p_phone: phone })
      if (error) throw error
      if (!data) { setAuthError('기업명 또는 연락처가 일치하지 않습니다.'); return }
      setCompany(data)
      await loadApplicants(data.id, phone)
    } catch (e) {
      console.error('멘토기업 본인확인 실패:', e)
      setAuthError('기업 정보를 확인할 수 없습니다.')
    } finally {
      setVerifying(false)
    }
  }

  async function loadApplicants(companyId, phoneValue) {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('mentor_company_applicants', { p_company_id: companyId, p_phone: phoneValue })
      if (error) throw error
      if (!data || data.error) { setApplicants([]); setInterested(new Set()); setMatchings([]); return }
      setApplicants((data.applicants || []).filter(p => p.small_businesses))
      setInterested(new Set(data.interested || []))
      setMatchings(data.matched || [])
    } catch (e) {
      console.error('신청 목록 조회 실패:', e)
      setApplicants([]); setInterested(new Set()); setMatchings([])
    } finally {
      setLoading(false)
    }
  }

  async function toggleInterest(businessId) {
    if (!company) return
    if (!interested.has(businessId) && interested.size >= MAX_INTEREST) {
      alert(`관심 소상공인은 최대 ${MAX_INTEREST}개까지 선택할 수 있습니다.`)
      return
    }
    try {
      if (interested.has(businessId)) {
        const { error } = await supabase.from('company_preferences').delete().eq('mentor_company_id', company.id).eq('small_business_id', businessId)
        if (error) throw error
        setInterested(prev => { const n = new Set(prev); n.delete(businessId); return n })
      } else {
        const { error } = await supabase.from('company_preferences').insert({ mentor_company_id: company.id, small_business_id: businessId })
        if (error) throw error
        setInterested(prev => new Set(prev).add(businessId))
      }
    } catch (e) {
      console.error('관심 등록/취소 실패:', e)
      alert('처리 실패: ' + (e.message || '잠시 후 다시 시도해주세요.'))
    }
  }

  function logout() {
    setCompany(null); setApplicants([]); setInterested(new Set()); setMatchings([])
    setSelectedId(''); setPhone('')
    setTab('applicants'); setRegionFilter(''); setItemSearch('')
  }

  if (!company) {
    return (
      <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
        <PublicHeader title="멘토기업 조회" />
        <div className="max-w-md mx-auto px-4 py-16">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">멘토기업 본인 확인</h1>
            <p className="text-sm text-gray-500">등록된 기업명과 연락처로 확인해주세요</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">기업명 *</label>
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className={inp()}>
                <option value="">선택해주세요</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">연락처 *</label>
              <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="등록된 연락처를 입력해주세요"
                maxLength={13} className={inp()} />
            </div>
            {authError && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-200">{authError}</div>
            )}
            <button disabled={verifying} onClick={handleVerify}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: '#2E75B6' }}>
              {verifying ? '확인 중...' : '확인'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const tabFiltered = applicants.filter(a => {
    if (tab === 'interested' && !interested.has(a.small_business_id)) return false
    if (tab === 'matched' && !matchings.includes(a.small_business_id)) return false
    return true
  })
  const visible = tabFiltered.filter(a => {
    const biz = a.small_businesses
    return (!regionFilter || biz.region === regionFilter) &&
      (!itemSearch || biz.item?.includes(itemSearch) || biz.company_name?.includes(itemSearch))
  })

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <PublicHeader title="멘토기업 조회" />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div>
            <div className="text-xs text-gray-400">멘토기업</div>
            <div className="text-lg font-bold text-gray-900">{company.company_name}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">관심 등록 <strong className="text-blue-600">{interested.size}</strong> / {MAX_INTEREST}</span>
            <button onClick={logout} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">
              <LogOut size={13} /> 나가기
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-200 gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={itemSearch} onChange={e => setItemSearch(e.target.value)}
              placeholder="기업명·업종 검색" className={inp() + ' pl-8'} />
          </div>
          <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} className={inp() + ' w-auto'}>
            <option value="">전체 지역</option>
            {ULSAN_REGIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{TABS.find(t => t.id === tab)?.label}</span>
            <span className="text-xs text-gray-400">{visible.length}건</span>
          </div>
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">로딩 중...</div>
          ) : visible.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              {tab === 'interested' ? '관심 등록한 소상공인이 없습니다.' :
               tab === 'matched' ? '매칭된 소상공인이 없습니다.' :
               '아직 본 기업을 선택한 소상공인이 없습니다.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visible.map(a => {
                const biz = a.small_businesses
                const isMatched = matchings.includes(biz.id)
                const isInterested = interested.has(biz.id)
                return (
                  <div key={biz.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800 text-sm">{biz.company_name}</span>
                        <span className="text-xs text-gray-400">{biz.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                          a.priority === 1 ? 'bg-blue-100 text-blue-700' : a.priority === 2 ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'
                        }`}>{a.priority}순위</span>
                        {isMatched && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-700">
                            <CheckCircle size={10} /> 매칭완료
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        <span>📞 {biz.phone}</span>
                        {biz.item && <span>🗂 {biz.item}</span>}
                        {biz.region && <span>📍 {biz.region}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleInterest(biz.id)}
                      disabled={isMatched || (!isInterested && interested.size >= MAX_INTEREST)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 ${
                        isInterested ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100' : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isInterested ? <><HeartOff size={13} /> 관심 취소</> : <><Heart size={13} /> 관심 등록</>}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function inp() {
  return 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white'
}
