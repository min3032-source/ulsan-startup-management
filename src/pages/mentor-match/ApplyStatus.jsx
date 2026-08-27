import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/formatPhone'
import { calcMentorMatchStatus, getStatusBadgeClass } from '../../lib/constants'
import { ArrowLeft } from 'lucide-react'
import PublicHeader from '../../components/common/PublicHeader'

export default function ApplyStatus() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    document.title = '신청 상태 조회 | 울산경제일자리진흥원'
  }, [])

  async function handleSearch() {
    if (!name.trim() || !phone.trim()) { setSearchError('이름과 연락처를 모두 입력해주세요.'); return }
    setSearching(true); setSearchError(''); setResult(null)
    try {
      const { data, error } = await supabase.rpc('business_application_status', {
        p_name: name.trim(),
        p_phone: phone.trim(),
      })
      if (error) throw error
      if (!data) { setSearchError('일치하는 신청 내역을 찾을 수 없습니다.'); return }

      const status = calcMentorMatchStatus({ hasInterest: data.has_interest, isMatched: !!data.matching })
      setResult({ biz: data.business, prefs: data.prefs || [], status, match: data.matching })
    } catch (e) {
      console.error('신청 상태 조회 실패:', e)
      setSearchError('조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <PublicHeader title="신청 상태 조회" />
      <div className="max-w-md mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={13} /> 신청 페이지로 돌아가기
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">신청 상태 조회</h1>
          <p className="text-sm text-gray-500">신청 시 입력하신 이름과 연락처로 조회해주세요</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">이름</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" className={inp()} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">연락처</label>
            <input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="010-1234-5678" maxLength={13} className={inp()} />
          </div>
          {searchError && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-200">{searchError}</div>
          )}
          <button disabled={searching} onClick={handleSearch}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: '#2E75B6' }}>
            {searching ? '조회 중...' : '조회하기'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">{result.biz.company_name}</div>
                <div className="text-base font-bold text-gray-900">{result.biz.name}</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(result.status)}`}>
                {result.status}
              </span>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-500 mb-2">희망 멘토기업 선택</div>
              <div className="space-y-1.5">
                {result.prefs.length === 0 ? (
                  <p className="text-xs text-gray-400">선택 내역이 없습니다.</p>
                ) : result.prefs.map(p => (
                  <div key={p.priority} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-bold text-blue-600">{p.priority}순위</span>
                    <span className="text-gray-700">{p.mentor_companies?.company_name}</span>
                    {p.mentor_companies?.field && <span className="text-gray-400">· {p.mentor_companies.field}</span>}
                  </div>
                ))}
              </div>
            </div>

            {result.match && (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <div className="text-xs font-semibold text-green-700 mb-1">최종 매칭 결과</div>
                <div className="text-sm text-green-800 font-bold">{result.match.mentor_companies?.company_name}</div>
                <div className="text-xs text-green-600 mt-1">
                  {result.match.agreement_signed ? '협약 체결 완료' : '협약 체결 대기 중'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function inp() {
  return 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white'
}
