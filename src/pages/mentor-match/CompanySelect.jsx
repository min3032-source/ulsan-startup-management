import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/formatPhone'
import { CheckCircle, Heart, HeartOff, LogOut } from 'lucide-react'
import PublicHeader from '../../components/common/PublicHeader'

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
      const { data, error } = await supabase.from('mentor_companies').select('*').eq('id', selectedId).maybeSingle()
      if (error) throw error
      if (!data) { setAuthError('기업 정보를 확인할 수 없습니다.'); return }
      if ((data.phone || '').replace(/-/g, '') !== phone.replace(/-/g, '')) {
        setAuthError('등록된 연락처와 일치하지 않습니다.')
        return
      }
      setCompany(data)
      await loadApplicants(data.id)
    } catch (e) {
      console.error('멘토기업 본인확인 실패:', e)
      setAuthError('기업 정보를 확인할 수 없습니다.')
    } finally {
      setVerifying(false)
    }
  }

  async function loadApplicants(companyId) {
    setLoading(true)
    try {
      const [{ data: prefs, error: e1 }, { data: cprefs, error: e2 }, { data: mtch, error: e3 }] = await Promise.all([
        supabase.from('mentor_preferences').select('priority, small_business_id, small_businesses(id, name, company_name, phone, item)').eq('mentor_company_id', companyId).order('priority'),
        supabase.from('company_preferences').select('small_business_id').eq('mentor_company_id', companyId),
        supabase.from('matchings').select('small_business_id').eq('mentor_company_id', companyId),
      ])
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      setApplicants((prefs || []).filter(p => p.small_businesses))
      setInterested(new Set((cprefs || []).map(c => c.small_business_id)))
      setMatchings((mtch || []).map(m => m.small_business_id))
    } catch (e) {
      console.error('신청 목록 조회 실패:', e)
      setApplicants([]); setInterested(new Set()); setMatchings([])
    } finally {
      setLoading(false)
    }
  }

  async function toggleInterest(businessId) {
    if (!company) return
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

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <PublicHeader title="멘토기업 조회" />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div>
            <div className="text-xs text-gray-400">멘토기업</div>
            <div className="text-lg font-bold text-gray-900">{company.company_name}</div>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">
            <LogOut size={13} /> 나가기
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">본 기업을 희망 멘토기업으로 선택한 소상공인</span>
            <span className="text-xs text-gray-400">{applicants.length}건</span>
          </div>
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">로딩 중...</div>
          ) : applicants.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">아직 본 기업을 선택한 소상공인이 없습니다.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {applicants.map(a => {
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
                      </div>
                    </div>
                    <button
                      onClick={() => toggleInterest(biz.id)}
                      disabled={isMatched}
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
