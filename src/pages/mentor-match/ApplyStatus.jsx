import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/formatPhone'
import { calcMentorMatchStatus, getStatusBadgeClass } from '../../lib/constants'
import { ArrowLeft, Upload } from 'lucide-react'
import PublicHeader from '../../components/common/PublicHeader'

export default function ApplyStatus() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [result, setResult] = useState(null)
  const [planFile, setPlanFile] = useState(null)
  const [uploadingPlan, setUploadingPlan] = useState(false)
  const [planMsg, setPlanMsg] = useState('')

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

      const status = calcMentorMatchStatus({ reviewStage: data.business?.review_stage, isMatched: !!data.matching })
      setResult({ biz: data.business, prefs: data.prefs || [], status, match: data.matching })
      setPlanMsg('')
    } catch (e) {
      console.error('신청 상태 조회 실패:', e)
      setSearchError('조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSearching(false)
    }
  }

  async function uploadPlan() {
    if (!planFile || !result) return
    setUploadingPlan(true); setPlanMsg('')
    try {
      const ext = planFile.name.split('.').pop()
      const fileName = `${result.biz.id}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('mentor-business-plans').upload(fileName, planFile)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('mentor-business-plans').getPublicUrl(fileName)

      // small_businesses는 anon에게 update 권한이 없으므로, 이름+연락처 일치를 다시
      // 검증하는 RPC로만 business_plan_url을 갱신한다.
      const { data: ok, error: rpcError } = await supabase.rpc('submit_business_plan', {
        p_name: name.trim(), p_phone: phone.trim(), p_url: publicUrl,
      })
      if (rpcError) throw rpcError
      if (!ok) throw new Error('본인 확인 정보가 일치하지 않습니다.')

      setResult(prev => ({ ...prev, biz: { ...prev.biz, business_plan_url: publicUrl } }))
      setPlanFile(null)
      setPlanMsg('사업계획서가 등록되었습니다. 지금 심사 중인 멘토기업에게 바로 반영됩니다.')
    } catch (e) {
      console.error('사업계획서 업로드 실패:', e)
      setPlanMsg('업로드 실패: ' + (e.message || '잠시 후 다시 시도해주세요.'))
    } finally {
      setUploadingPlan(false)
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
                    <span className={`ml-auto px-1.5 py-0.5 rounded text-[11px] font-medium ${getStatusBadgeClass(p.review_status)}`}>
                      {p.review_status}
                    </span>
                  </div>
                ))}
              </div>
              {result.status === '심사중' && (
                <p className="text-[11px] text-gray-400 mt-2">현재 순서대로 멘토기업이 검토 중입니다. 거절되면 자동으로 다음 순위로 넘어갑니다.</p>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="text-xs font-semibold text-gray-500 mb-2">사업계획서</div>
              {result.biz.business_plan_url ? (
                <a href={result.biz.business_plan_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline">등록된 사업계획서 보기</a>
              ) : (
                <p className="text-xs text-gray-400 mb-2">아직 등록된 사업계획서가 없습니다.</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <label className="flex-1 flex items-center gap-1.5 px-3 py-2 text-xs border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-gray-500">
                  <Upload size={13} className="flex-shrink-0" />
                  <span className="truncate">{planFile ? planFile.name : (result.biz.business_plan_url ? '파일 교체하기' : '파일 선택 (PDF·HWP·DOC)')}</span>
                  <input type="file" accept=".pdf,.hwp,.hwpx,.doc,.docx" className="hidden"
                    onChange={e => setPlanFile(e.target.files?.[0] || null)} />
                </label>
                <button onClick={uploadPlan} disabled={!planFile || uploadingPlan}
                  className="px-3 py-2 text-xs font-bold text-white rounded-lg disabled:opacity-40 flex-shrink-0"
                  style={{ background: '#2E75B6' }}>
                  {uploadingPlan ? '업로드 중...' : '등록'}
                </button>
              </div>
              {planMsg && <p className="text-[11px] text-gray-500 mt-1.5">{planMsg}</p>}
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
