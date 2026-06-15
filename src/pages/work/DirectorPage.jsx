import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BarChart2, CheckCircle, AlertTriangle, FileText, X, RefreshCw, Trophy, Clock } from 'lucide-react'

const ROLE_LABEL = { master: '원장', admin: '부장', manager: '팀장', viewer: '팀원' }
const STATUS_STEPS = ['배분전','배분안작성중','직원검토중','이의신청중','확정']

/* ── 공통 평가 모달 ── */
function EvalWriteModal({ employee, period, existingEval, evalType, evalWeight, scoreLabels, onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    work_score:        existingEval?.work_score        ?? 80,
    attitude_score:    existingEval?.attitude_score    ?? 80,
    cooperation_score: existingEval?.cooperation_score ?? 80,
    comment:           existingEval?.comment           ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const totalScore = Math.round((form.work_score + form.attitude_score + form.cooperation_score) / 3)
  const weightedScore = +(totalScore * evalWeight).toFixed(1)
  const isSubmitted = existingEval?.status === '제출' || existingEval?.status === '확정'

  async function handleSubmit() {
    if (isSubmitted) return
    setSaving(true)
    const payload = {
      employee_id:       employee.id,
      evaluator_id:      profile.id,
      period,
      eval_type:         evalType,
      eval_weight:       evalWeight,
      work_score:        form.work_score,
      attitude_score:    form.attitude_score,
      cooperation_score: form.cooperation_score,
      total_score:       totalScore,
      comment:           form.comment,
      status:            '제출',
    }
    if (existingEval) {
      await supabase.from('performance_evaluations').update(payload).eq('id', existingEval.id)
    } else {
      await supabase.from('performance_evaluations').insert(payload)
    }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-800">{employee.name} 평가</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
            {evalType} · 가중치 {evalWeight * 100}%
          </span>
          <span className="text-xs text-gray-500">{period}</span>
          {isSubmitted && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">제출완료</span>}
        </div>

        {[
          { key: 'work_score',        label: scoreLabels[0] },
          { key: 'attitude_score',    label: scoreLabels[1] },
          { key: 'cooperation_score', label: scoreLabels[2] },
        ].map(({ key, label }) => (
          <div key={key} className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <span className="text-sm font-bold text-blue-600">{form[key]}점</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={form[key]}
              onChange={e => set(key, Number(e.target.value))}
              disabled={isSubmitted} className="w-full accent-blue-600" />
          </div>
        ))}

        <div className="bg-purple-50 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">종합 점수</div>
              <div className="text-2xl font-bold text-purple-700">{totalScore}점</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">가중 점수 (×{evalWeight})</div>
              <div className="text-xl font-bold text-indigo-600">{weightedScore}점</div>
            </div>
          </div>
        </div>

        <textarea value={form.comment} onChange={e => set('comment', e.target.value)}
          disabled={isSubmitted} rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none mb-4"
          placeholder="종합 의견을 작성해주세요" />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">닫기</button>
          {!isSubmitted && (
            <button onClick={handleSubmit} disabled={saving}
              className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? '제출 중...' : '평가 제출'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── 원장 확인 모달 ── */
function DirectorConfirmModal({ employee, period, existingEval, onClose, onSaved }) {
  const { profile } = useAuth()
  const [comment, setComment] = useState(existingEval?.comment ?? '')
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    setSaving(true)
    const payload = {
      employee_id: employee.id, evaluator_id: profile.id,
      period, eval_type: '원장확인', eval_weight: 0,
      comment, status: '확정',
    }
    if (existingEval) {
      await supabase.from('performance_evaluations').update({ comment, status: '확정' }).eq('id', existingEval.id)
    } else {
      await supabase.from('performance_evaluations').insert(payload)
    }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">원장 확인</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          <b>{employee.name}</b>의 최종 평가를 확인하고 코멘트를 남깁니다.
        </p>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none mb-4"
          placeholder="원장 코멘트 (선택사항)" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
          <button onClick={handleConfirm} disabled={saving}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? '확인 중...' : '최종 확인'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── DirectorPage 메인 ── */
export default function DirectorPage() {
  const { profile, hasRole } = useAuth()
  const [tab, setTab]         = useState('대시보드')
  const [evalSubTab, setEvalSubTab] = useState('팀원평가')
  const [employees, setEmployees]   = useState([])
  const [workItems, setWorkItems]   = useState([])
  const [assignments, setAssignments] = useState([])
  const [objections, setObjections] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [loading, setLoading]       = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [evalModal, setEvalModal]   = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)
  const currentPeriod = `${new Date().getFullYear()}년`
  const isMaster = profile?.role === 'master'

  async function load() {
    setLoading(true)
    const [{ data: emps }, { data: items }, { data: asgns }, { data: objs }, { data: evals }, { data: progs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_active', true),
      supabase.from('work_items').select('*'),
      supabase.from('work_assignments').select('*'),
      supabase.from('work_objections').select('*').order('created_at', { ascending: false }),
      supabase.from('performance_evaluations').select('*').eq('period', currentPeriod),
      supabase.from('work_progress').select('*'),
    ])
    setEmployees(emps || [])
    setWorkItems(items || [])
    setAssignments(asgns || [])
    setObjections(objs || [])
    setEvaluations(evals || [])
    const pMap = {}
    ;(progs || []).forEach(p => { pMap[p.work_assignment_id] = p })
    setProgressMap(pMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleFinalConfirm() {
    setConfirming(true)
    await supabase.from('work_items').update({ assignment_status: '확정' }).not('id', 'is', null)
    alert('업무분장이 최종 확정되었습니다.')
    await load()
    setConfirming(false)
  }

  async function handleConfirmAllEvals() {
    setConfirming(true)
    const ids = evaluations.filter(e => e.status === '제출').map(e => e.id)
    if (ids.length) await supabase.from('performance_evaluations').update({ status: '확정' }).in('id', ids)
    alert('전체 평가가 확정되었습니다.')
    await load()
    setConfirming(false)
  }

  if (!hasRole('admin')) return <div className="p-8 text-center text-gray-500">접근 권한이 없습니다 (부장 이상)</div>
  if (loading) return <div className="p-8 text-center text-gray-400">로딩 중...</div>

  /* 파생 데이터 */
  const totalItems      = workItems.length
  const confirmedItems  = workItems.filter(i => i.assignment_status === '확정').length
  const assignedItems   = workItems.filter(i => assignments.find(a => a.work_item_id === i.id)).length
  const pendingObjs     = objections.filter(o => o.status === '검토중').length
  const totalAsgns      = assignments.length
  const completedAsgns  = assignments.filter(a => (progressMap[a.id]?.progress || 0) >= 100).length
  const overallPct      = totalAsgns ? Math.round((completedAsgns / totalAsgns) * 100) : 0

  const teamMembers  = employees.filter(e => e.role === 'viewer')
  const teamManagers = employees.filter(e => e.role === 'manager')

  /* 특정 평가 찾기 */
  const getEval = (empId, evalType) =>
    evaluations.find(e => e.employee_id === empId && e.eval_type === evalType)

  /* 팀원 최종 점수 미리보기 */
  const getFinalScore = (empId) => {
    const mgr = getEval(empId, '팀장평가')
    const dir = getEval(empId, '부장평가')
    if (!mgr && !dir) return null
    return +((mgr?.total_score || 0) * 0.7 + (dir?.total_score || 0) * 0.3).toFixed(1)
  }

  /* 팀장 최종 점수 */
  const getManagerFinalScore = (empId) => {
    const ev = getEval(empId, '부장평가')
    if (!ev) return null
    return +(ev.total_score * 1.0).toFixed(1)
  }

  /* 랭킹 계산 */
  const memberRanking = [...teamMembers]
    .map(e => ({ ...e, final: getFinalScore(e.id) }))
    .filter(e => e.final !== null)
    .sort((a, b) => b.final - a.final)

  const managerRanking = [...teamManagers]
    .map(e => ({ ...e, final: getManagerFinalScore(e.id) }))
    .filter(e => e.final !== null)
    .sort((a, b) => b.final - a.final)

  /* 평가 완료 현황 */
  const mgrEvalCount = teamMembers.filter(e => getEval(e.id, '팀장평가')?.status === '제출').length
  const dirEvalCount = teamMembers.filter(e => getEval(e.id, '부장평가')?.status === '제출').length
  const mgrMgrCount  = teamManagers.filter(e => getEval(e.id, '부장평가')?.status === '제출').length

  const tabs = ['대시보드','배분현황','이의신청','성과평가']

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{isMaster ? '원장' : '부장'} 대시보드</h1>
          <p className="text-xs text-gray-500">{currentPeriod} 업무분장 현황</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          <RefreshCw size={13} /> 새로고침
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5 border-b overflow-x-auto pb-0">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === '이의신청' && pendingObjs > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingObjs}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── 대시보드 ── */}
      {tab === '대시보드' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '📋', label: '총 업무', value: `${totalItems}건`, sub: `배정 ${assignedItems}건` },
              { icon: '✅', label: '최종 확정', value: `${confirmedItems}건`, sub: `${totalItems ? Math.round((confirmedItems/totalItems)*100) : 0}%` },
              { icon: '⚠️', label: '이의신청', value: `${pendingObjs}건`, sub: '처리 대기' },
              { icon: '📊', label: '전체 진행률', value: `${overallPct}%`, sub: `${completedAsgns}/${totalAsgns}` },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-blue-600" /> 전체 업무 진행 현황
            </h2>
            <div className="space-y-3">
              {employees.filter(e => e.role === 'viewer' || e.role === 'manager').map(emp => {
                const empAsgns = assignments.filter(a => a.employee_id === emp.id)
                const done = empAsgns.filter(a => (progressMap[a.id]?.progress || 0) >= 100).length
                const pct = empAsgns.length ? Math.round((done / empAsgns.length) * 100) : 0
                const score = empAsgns.reduce((s, a) => s + (workItems.find(w => w.id === a.work_item_id)?.max_score || 10), 0)
                return (
                  <div key={emp.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {emp.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{emp.name}</span>
                          <span className="text-xs text-gray-400">{ROLE_LABEL[emp.role]}</span>
                          <span className="text-xs text-gray-400">{score}점</span>
                        </div>
                        <span className="text-xs text-gray-500">{done}/{empAsgns.length} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-yellow-400'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── 배분현황 ── */}
      {tab === '배분현황' && (
        <div className="space-y-4">
          {STATUS_STEPS.map(status => {
            const statusItems = workItems.filter(i => (i.assignment_status || '배분전') === status)
            if (!statusItems.length) return null
            return (
              <div key={status} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 mb-3">{status} ({statusItems.length}건)</h3>
                <div className="space-y-2">
                  {statusItems.map(item => {
                    const names = assignments.filter(a => a.work_item_id === item.id)
                      .map(a => employees.find(e => e.id === a.employee_id)?.name).filter(Boolean)
                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-700 truncate flex-1">{item.title}</span>
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          {names.map((n, i) => <span key={i} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{n}</span>)}
                          {!names.length && <span className="text-xs text-gray-400">미배정</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-2">업무분장 최종 확정</h3>
            <p className="text-sm text-gray-500 mb-4">
              이의신청 처리 완료 후 확정하세요.
              {pendingObjs > 0 && <span className="text-orange-500 ml-1">({pendingObjs}건 대기)</span>}
            </p>
            <button onClick={handleFinalConfirm} disabled={confirming || pendingObjs > 0}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
              <CheckCircle size={16} />
              {confirming ? '확정 중...' : '전체 업무분장 최종 확정'}
            </button>
          </div>
        </div>
      )}

      {/* ── 이의신청 ── */}
      {tab === '이의신청' && (
        <div className="space-y-3">
          {objections.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
              <p>이의신청 내역이 없습니다</p>
            </div>
          ) : objections.map(obj => {
            const emp = employees.find(e => e.id === obj.employee_id)
            const item = workItems.find(w => w.id === obj.work_item_id)
            const reviewer = employees.find(e => e.id === obj.reviewed_by)
            const sc = { '검토중': 'bg-yellow-100 text-yellow-700', '수용': 'bg-green-100 text-green-700', '기각': 'bg-red-100 text-red-700' }
            return (
              <div key={obj.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${obj.status === '검토중' ? 'border-orange-100' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc[obj.status]}`}>{obj.status}</span>
                      <span className="text-xs text-gray-500">{emp?.name}</span>
                    </div>
                    <p className="font-medium text-gray-800 text-sm">{item?.title}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(obj.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{obj.reason}</p>
                {obj.review_comment && (
                  <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-700">✓ {reviewer?.name}: {obj.review_comment}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── 성과평가 ── */}
      {tab === '성과평가' && (
        <div className="space-y-5">
          {/* 서브 탭 */}
          <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
            {['팀원평가','팀장평가','순위현황'].map(t => (
              <button key={t} onClick={() => setEvalSubTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${evalSubTab === t ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* ── 팀원 평가 ── */}
          {evalSubTab === '팀원평가' && (
            <div className="space-y-4">
              {/* 완료 현황 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                  <div className="text-lg font-bold text-blue-600">{mgrEvalCount}/{teamMembers.length}</div>
                  <div className="text-xs text-gray-500">팀장평가 완료</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                  <div className="text-lg font-bold text-purple-600">{dirEvalCount}/{teamMembers.length}</div>
                  <div className="text-xs text-gray-500">부장평가 완료</div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-blue-800">부장 평가 (가중치 30%) + 팀장 평가 (70%) = 최종 점수</p>
              </div>

              {teamMembers.map(emp => {
                const mgrEval = getEval(emp.id, '팀장평가')
                const dirEval = getEval(emp.id, '부장평가')
                const finalScore = getFinalScore(emp.id)
                const myDirEval = dirEval?.evaluator_id === profile.id ? dirEval : null

                return (
                  <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                          {emp.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{emp.name}</div>
                          {finalScore !== null && (
                            <div className="text-xs text-gray-500">예상 최종점수: <b className="text-blue-600">{finalScore}점</b></div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setEvalModal({ emp, existingEval: myDirEval, type: 'member' })}
                        className={`px-3 py-1.5 rounded-xl text-sm font-medium ${myDirEval?.status === '제출'
                          ? 'bg-green-100 text-green-700' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                        {myDirEval?.status === '제출' ? '결과 보기' : '부장 평가'}
                      </button>
                    </div>

                    {/* 팀장 평가 (읽기전용) */}
                    {mgrEval && (
                      <div className="bg-blue-50 rounded-xl px-3 py-2 mb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-blue-700">팀장평가 (×0.7)</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-blue-700">{mgrEval.total_score}점</span>
                            <span className="text-xs text-blue-500">→ 가중 {+(mgrEval.total_score * 0.7).toFixed(1)}점</span>
                          </div>
                        </div>
                        {mgrEval.comment && <p className="text-xs text-blue-600 mt-1 truncate">"{mgrEval.comment}"</p>}
                      </div>
                    )}

                    {/* 부장 평가 */}
                    {myDirEval && (
                      <div className="bg-purple-50 rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-purple-700">부장평가 (×0.3)</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-purple-700">{myDirEval.total_score}점</span>
                            <span className="text-xs text-purple-500">→ 가중 {+(myDirEval.total_score * 0.3).toFixed(1)}점</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 최종 점수 미리보기 */}
                    {finalScore !== null && (
                      <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">최종 점수</span>
                        <span className="text-sm font-bold text-gray-800">{finalScore}점</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── 팀장 평가 (부장 100%) ── */}
          {evalSubTab === '팀장평가' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 mb-2">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                  <div className="text-lg font-bold text-purple-600">{mgrMgrCount}/{teamManagers.length}</div>
                  <div className="text-xs text-gray-500">팀장 평가 완료 (부장 100%)</div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-purple-800">팀장 평가는 부장이 단독 100% 평가합니다.</p>
              </div>

              {teamManagers.map(emp => {
                const myEval = getEval(emp.id, '부장평가')
                const finalScore = getManagerFinalScore(emp.id)
                return (
                  <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
                          {emp.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{emp.name}</div>
                          <div className="text-xs text-gray-400">팀장</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {finalScore !== null && (
                          <div className="text-right">
                            <div className="text-lg font-bold text-purple-600">{finalScore}점</div>
                            <div className="text-xs text-gray-400">최종</div>
                          </div>
                        )}
                        <button onClick={() => setEvalModal({ emp, existingEval: myEval, type: 'manager' })}
                          className={`px-3 py-1.5 rounded-xl text-sm font-medium ${myEval?.status === '제출'
                            ? 'bg-green-100 text-green-700' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                          {myEval?.status === '제출' ? '결과 보기' : '평가 작성'}
                        </button>
                      </div>
                    </div>
                    {myEval?.comment && (
                      <div className="bg-purple-50 rounded-lg px-3 py-2 text-xs text-purple-700">
                        "{myEval.comment}"
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── 순위 현황 ── */}
          {evalSubTab === '순위현황' && (
            <div className="space-y-5">
              {/* 팀원 순위 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-500" /> 팀원 최종점수 순위
                </h3>
                {memberRanking.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">아직 평가가 완료되지 않았습니다</p>
                ) : memberRanking.map((emp, i) => (
                  <div key={emp.id} className={`flex items-center gap-3 py-2 ${i < memberRanking.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-500'}`}>
                      {i + 1}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {emp.name?.charAt(0)}
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-700">{emp.name}</span>
                    <span className="font-bold text-blue-700">{emp.final}점</span>
                  </div>
                ))}
              </div>

              {/* 팀장 순위 */}
              {managerRanking.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Trophy size={16} className="text-purple-500" /> 팀장 최종점수
                  </h3>
                  {managerRanking.map((emp, i) => (
                    <div key={emp.id} className="flex items-center gap-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-xs">{emp.name?.charAt(0)}</div>
                      <span className="flex-1 text-sm font-medium text-gray-700">{emp.name}</span>
                      <span className="font-bold text-purple-700">{emp.final}점</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 원장 보고용 확정 버튼 */}
              {isMaster && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">원장 보고용 전체 확정</h3>
                  <p className="text-sm text-gray-500 mb-4">제출된 모든 평가를 확정 상태로 변경합니다.</p>
                  <button onClick={handleConfirmAllEvals} disabled={confirming}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    <CheckCircle size={16} />
                    {confirming ? '확정 중...' : '전체 평가 확정'}
                  </button>
                </div>
              )}

              {/* 원장 확인 (부장 평가 확인) */}
              {isMaster && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-3">원장 확인</h3>
                  <div className="space-y-2">
                    {employees.filter(e => e.role === 'admin').map(emp => {
                      const existConf = getEval(emp.id, '원장확인')
                      return (
                        <div key={emp.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs">{emp.name?.charAt(0)}</div>
                            <span className="text-sm font-medium text-gray-700">{emp.name}</span>
                            <span className="text-xs text-gray-400">부장</span>
                          </div>
                          <button onClick={() => setConfirmModal({ emp, existingEval: existConf })}
                            className={`px-3 py-1 rounded-lg text-xs font-medium ${existConf ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                            {existConf ? '확인완료' : '원장 확인'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 원장 보고용 확정 버튼 (부장용 - 순위현황 탭 외) */}
          {evalSubTab !== '순위현황' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-800">평가 확정</div>
                  <div className="text-xs text-gray-500">제출된 평가: {evaluations.filter(e => e.status === '제출').length}건</div>
                </div>
                <button onClick={handleConfirmAllEvals} disabled={confirming}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {confirming ? '확정 중...' : '원장 보고용 확정'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 모달들 */}
      {evalModal && evalModal.type === 'member' && (
        <EvalWriteModal
          employee={evalModal.emp}
          period={currentPeriod}
          existingEval={evalModal.existingEval}
          evalType="부장평가"
          evalWeight={0.3}
          scoreLabels={['업무 수행도', '업무 태도', '협업 기여도']}
          onClose={() => setEvalModal(null)}
          onSaved={load}
        />
      )}
      {evalModal && evalModal.type === 'manager' && (
        <EvalWriteModal
          employee={evalModal.emp}
          period={currentPeriod}
          existingEval={evalModal.existingEval}
          evalType="부장평가"
          evalWeight={1.0}
          scoreLabels={['업무 수행도', '팀 관리 역량', '협업 리더십']}
          onClose={() => setEvalModal(null)}
          onSaved={load}
        />
      )}
      {confirmModal && (
        <DirectorConfirmModal
          employee={confirmModal.emp}
          period={currentPeriod}
          existingEval={confirmModal.existingEval}
          onClose={() => setConfirmModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
