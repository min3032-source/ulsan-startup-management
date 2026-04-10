import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ULSAN_REGIONS } from '../../lib/constants'
import { VerdictBadge } from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Search, UserCheck, UserMinus, ChevronDown, BookOpen, X } from 'lucide-react'
import ConsultProgress from '../../components/common/ConsultProgress'

const CONSULT_STATUS_COLORS = {
  '대기중': 'bg-amber-100 text-amber-700',
  '상담중': 'bg-blue-100 text-blue-700',
  '완료':   'bg-green-100 text-green-700',
  '보류':   'bg-gray-100 text-gray-500',
}

export default function Founders() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')

  const [founders, setFounders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterVerdict, setFilterVerdict] = useState('')
  const [toast, setToast] = useState('')

  // 최종 판정 팝업
  const [verdictPopup, setVerdictPopup] = useState(null) // founder id
  const [verdictChoice, setVerdictChoice] = useState('')
  const [verdictSaving, setVerdictSaving] = useState(false)
  const popupRef = useRef(null)

  // 교육 연계 모달
  const [eduModal, setEduModal] = useState(null) // founder
  const [eduPrograms, setEduPrograms] = useState([])
  const [enrolledProgramIds, setEnrolledProgramIds] = useState([])

  useEffect(() => { loadData() }, [])

  // 팝업 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setVerdictPopup(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('founders')
      .select('*, consults(*)')
      .order('created_at', { ascending: false })
    if (!error) setFounders(data || [])
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  async function handleFinalVerdict(founder) {
    if (!verdictChoice) { alert('창업유형을 선택해주세요'); return }
    setVerdictSaving(true)
    const { error } = await supabase
      .from('founders')
      .update({ verdict: verdictChoice })
      .eq('id', founder.id)
    setVerdictSaving(false)
    if (error) { alert('판정 실패: ' + error.message); return }
    setFounders(prev => prev.map(f => f.id === founder.id ? { ...f, verdict: verdictChoice } : f))
    setVerdictPopup(null)
    setVerdictChoice('')
    showToast(`${founder.name}님의 창업유형이 ${verdictChoice}으로 판정되었습니다.`)
  }

  async function handleRegisterFounder(id) {
    if (!confirm('이 상담자를 창업자로 등록하시겠습니까?')) return
    const { error } = await supabase.from('founders').update({ is_founder: true }).eq('id', id)
    if (error) { alert('창업자 등록 실패: ' + error.message); return }
    setFounders(prev => prev.map(f => f.id === id ? { ...f, is_founder: true } : f))
    showToast('창업자로 등록되었습니다.')
  }

  async function handleCancelFounder(id) {
    if (!confirm('창업자 등록을 취소하시겠습니까?')) return
    const { error } = await supabase.from('founders').update({ is_founder: false }).eq('id', id)
    if (error) { alert('등록 취소 실패: ' + error.message); return }
    setFounders(prev => prev.map(f => f.id === id ? { ...f, is_founder: false } : f))
  }

  async function openEduModal(founder) {
    const [progRes, appRes] = await Promise.all([
      supabase.from('education_programs').select('id, title, status, start_date, end_date').eq('status', '모집중'),
      supabase.from('education_applications').select('program_id').eq('founder_id', founder.id),
    ])
    setEduPrograms(progRes.data || [])
    setEnrolledProgramIds((appRes.data || []).map(a => a.program_id))
    setEduModal(founder)
  }

  async function handleEduEnroll(program) {
    if (enrolledProgramIds.includes(program.id)) return
    const { error } = await supabase.from('education_applications').insert({
      program_id: program.id,
      applicant_name: eduModal.name,
      phone: eduModal.phone || null,
      founder_id: eduModal.id,
      status: '신청',
    })
    if (error) { alert('교육 등록 실패: ' + error.message); return }
    setEnrolledProgramIds(prev => [...prev, program.id])
    showToast(`${eduModal.name}님을 "${program.title}"에 등록했습니다.`)
  }

  const filtered = founders.filter(f => {
    const matchSearch = !search ||
      f.name?.includes(search) ||
      f.phone?.includes(search) ||
      f.biz?.includes(search)
    const matchRegion = !filterRegion || f.region === filterRegion
    const matchVerdict = !filterVerdict || f.verdict === filterVerdict
    return matchSearch && matchRegion && matchVerdict
  })

  const techCount    = founders.filter(f => f.verdict === '테크 창업').length
  const localCount   = founders.filter(f => f.verdict === '로컬 창업').length
  const pendingCount = founders.filter(f => f.verdict === '상담 후 결정' || !f.verdict).length

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">상담 관리</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 상담자"  value={`${founders.length}명`} color="blue" />
        <StatCard label="테크 창업"    value={`${techCount}명`}       color="teal" />
        <StatCard label="로컬 창업"    value={`${localCount}명`}      color="green" />
        <StatCard label="판정 대기"    value={`${pendingCount}명`}    color="orange" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-48"
            placeholder="이름·연락처·기업명 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
          value={filterVerdict}
          onChange={e => setFilterVerdict(e.target.value)}
        >
          <option value="">전체 창업유형</option>
          <option>테크 창업</option>
          <option>로컬 창업</option>
          <option>상담 후 결정</option>
        </select>
        <select
          className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
          value={filterRegion}
          onChange={e => setFilterRegion(e.target.value)}
        >
          <option value="">전체 지역</option>
          {ULSAN_REGIONS.map(r => (
            <option key={r} value={r}>{r === '기타(타지역)' ? '타지역' : r}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['이름', '연락처', '창업유형', '지역', '창업단계', '담당자', '진행상태', '상담상태', '상담횟수', '창업자등록', '교육연계'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400 text-sm">등록된 상담자가 없습니다</td></tr>
            ) : filtered.map(f => {
              const count = f.consults?.length || 0
              const needsVerdict = f.verdict === '상담 후 결정' || !f.verdict
              const isPopupOpen = verdictPopup === f.id
              return (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">

                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={f.name} />
                      <span className="font-medium text-gray-800 text-xs">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{f.phone}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {needsVerdict ? (
                        <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded font-medium">판정 필요</span>
                      ) : (
                        <VerdictBadge verdict={f.verdict} />
                      )}
                      {canWrite && needsVerdict && (
                        <div className="relative" ref={isPopupOpen ? popupRef : null}>
                          <button
                            onClick={() => {
                              setVerdictPopup(isPopupOpen ? null : f.id)
                              setVerdictChoice('')
                            }}
                            className="flex items-center gap-0.5 text-xs px-2 py-0.5 border border-orange-300 text-orange-600 rounded hover:bg-orange-50 transition-colors"
                          >
                            최종 판정 <ChevronDown size={10} />
                          </button>
                          {isPopupOpen && (
                            <div className="absolute left-0 top-7 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-44 space-y-2">
                              <p className="text-xs font-semibold text-gray-600 mb-1">창업유형 선택</p>
                              {['테크 창업', '로컬 창업'].map(v => (
                                <label key={v} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`verdict-${f.id}`}
                                    value={v}
                                    checked={verdictChoice === v}
                                    onChange={() => setVerdictChoice(v)}
                                    className="w-3.5 h-3.5"
                                  />
                                  <span className="text-xs text-gray-700">{v}</span>
                                </label>
                              ))}
                              <button
                                onClick={() => handleFinalVerdict(f)}
                                disabled={!verdictChoice || verdictSaving}
                                className="w-full mt-1 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-40 transition-colors"
                                style={{ background: '#2E75B6' }}
                              >
                                {verdictSaving ? '저장 중...' : '판정 완료'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {f.region === '기타(타지역)'
                      ? `타지역${f.region_detail ? ` (${f.region_detail})` : ''}`
                      : f.region || '-'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{f.stage || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{f.assignee || '-'}</td>
                  <td className="px-4 py-2.5">
                    <ConsultProgress
                      assignee={f.assignee}
                      consultCount={f.consults?.length || 0}
                      consultStatus={f.consult_status}
                      small
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    {f.consult_status
                      ? <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CONSULT_STATUS_COLORS[f.consult_status] || 'bg-gray-100 text-gray-500'}`}>
                          {f.consult_status}
                        </span>
                      : <span className="text-xs text-gray-400">-</span>
                    }
                  </td>
                  <td className="px-4 py-2.5">
                    {count === 0
                      ? <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-medium">미상담</span>
                      : <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">{count}회</span>
                    }
                  </td>
                  <td className="px-4 py-2.5">
                    {f.is_founder ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-green-600 font-medium">창업자 ✓</span>
                        {canWrite && (
                          <button
                            onClick={() => handleCancelFounder(f.id)}
                            className="flex items-center gap-1 text-xs px-2 py-0.5 border border-red-200 text-red-500 rounded hover:bg-red-50 transition-colors"
                          >
                            <UserMinus size={11} /> 취소
                          </button>
                        )}
                      </div>
                    ) : canWrite ? (
                      <button
                        onClick={() => handleRegisterFounder(f.id)}
                        className="flex items-center gap-1 text-xs px-2 py-0.5 text-white rounded transition-colors"
                        style={{ background: '#1E5631' }}
                      >
                        <UserCheck size={11} /> 창업자 등록
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {canWrite && (
                      <button
                        onClick={() => openEduModal(f)}
                        className="flex items-center gap-1 text-xs px-2 py-0.5 border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors"
                      >
                        <BookOpen size={11} /> 교육 연계
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ─── 교육 연계 모달 ─── */}
      {eduModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-800">교육 연계</h2>
                <p className="text-xs text-gray-500 mt-0.5">{eduModal.name}님을 교육에 등록합니다</p>
              </div>
              <button onClick={() => setEduModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {eduPrograms.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">현재 모집 중인 교육 프로그램이 없습니다.</p>
              ) : eduPrograms.map(prog => {
                const enrolled = enrolledProgramIds.includes(prog.id)
                return (
                  <div key={prog.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{prog.title}</p>
                      {prog.start_date && (
                        <p className="text-xs text-gray-400 mt-0.5">{prog.start_date} ~ {prog.end_date}</p>
                      )}
                    </div>
                    {enrolled ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-lg">
                        교육 신청됨 ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEduEnroll(prog)}
                        className="text-xs px-3 py-1.5 text-white rounded-lg font-medium"
                        style={{ background: '#2E75B6' }}
                      >
                        등록
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setEduModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
