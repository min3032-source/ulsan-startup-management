import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BarChart2, CheckCircle, AlertTriangle, FileText, X, RefreshCw } from 'lucide-react'

const ROLE_LABEL = { master: '원장', admin: '부장', manager: '팀장', viewer: '팀원' }
const STATUS_STEPS = ['배분전','배분안작성중','직원검토중','이의신청중','확정']

function EvalReviewModal({ eval: ev, employees, onClose, onSaved }) {
  const { profile } = useAuth()
  const [adjustedScore, setAdjustedScore] = useState(ev.total_score || 80)
  const [comment, setComment] = useState(ev.comment || '')
  const [saving, setSaving] = useState(false)

  const emp = employees.find(e => e.id === ev.employee_id)
  const evaluator = employees.find(e => e.id === ev.evaluator_id)

  async function handleConfirm() {
    setSaving(true)
    await supabase.from('performance_evaluations').update({
      status: '확정', total_score: adjustedScore, comment
    }).eq('id', ev.id)
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">평가 검토 및 확정</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{emp?.name || '—'}</span>
            <span className="text-xs text-gray-500">{ev.eval_type}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white rounded-lg p-2">
              <div className="font-bold text-blue-600">{ev.work_score}</div>
              <div className="text-gray-500">업무수행</div>
            </div>
            <div className="bg-white rounded-lg p-2">
              <div className="font-bold text-blue-600">{ev.attitude_score}</div>
              <div className="text-gray-500">업무태도</div>
            </div>
            <div className="bg-white rounded-lg p-2">
              <div className="font-bold text-blue-600">{ev.cooperation_score}</div>
              <div className="text-gray-500">협업소통</div>
            </div>
          </div>
          {ev.comment && <p className="text-xs text-gray-600 mt-2">"{ev.comment}"</p>}
          <p className="text-xs text-gray-500 mt-1">평가자: {evaluator?.name || '—'}</p>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-gray-700">조정 종합 점수</label>
              <span className="text-sm font-bold text-blue-600">{adjustedScore}점</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={adjustedScore}
              onChange={e => setAdjustedScore(Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <label className="text-sm text-gray-700 block mb-1">추가 코멘트</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
              placeholder="부장 검토 의견" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
          <button onClick={handleConfirm} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? '확정 중...' : '평가 확정'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DirectorPage() {
  const { profile, hasRole } = useAuth()
  const [tab, setTab] = useState('대시보드')
  const [employees, setEmployees] = useState([])
  const [workItems, setWorkItems] = useState([])
  const [assignments, setAssignments] = useState([])
  const [objections, setObjections] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [evalModal, setEvalModal] = useState(null)
  const currentPeriod = `${new Date().getFullYear()}년`

  async function load() {
    setLoading(true)
    const [{ data: emps }, { data: items }, { data: asgns }, { data: objs }, { data: evals }, { data: progs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_active', true),
      supabase.from('work_items').select('*'),
      supabase.from('work_assignments').select('*'),
      supabase.from('work_objections').select('*').order('created_at', { ascending: false }),
      supabase.from('performance_evaluations').select('*').eq('period', currentPeriod).order('created_at', { ascending: false }),
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

  if (!hasRole('admin')) return (
    <div className="p-8 text-center text-gray-500">접근 권한이 없습니다 (부장 이상)</div>
  )
  if (loading) return <div className="p-8 text-center text-gray-400">로딩 중...</div>

  // 통계 계산
  const totalItems = workItems.length
  const confirmedItems = workItems.filter(i => i.assignment_status === '확정').length
  const assignedItems = workItems.filter(i => assignments.find(a => a.work_item_id === i.id)).length
  const pendingObjections = objections.filter(o => o.status === '검토중').length
  const confirmedEvals = evaluations.filter(e => e.status === '확정').length
  const submittedEvals = evaluations.filter(e => e.status === '제출').length
  const totalAsgns = assignments.length
  const completedAsgns = assignments.filter(a => (progressMap[a.id]?.progress || 0) >= 100).length
  const overallProgress = totalAsgns ? Math.round((completedAsgns / totalAsgns) * 100) : 0

  // 팀원별 그룹
  const teamMembers = employees.filter(e => e.role === 'viewer' || e.role === 'manager')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {profile?.role === 'master' ? '원장' : '부장'} 대시보드
          </h1>
          <p className="text-xs text-gray-500">{currentPeriod} 업무분장 현황</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          <RefreshCw size={13} /> 새로고침
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5 border-b">
        {['대시보드','배분현황','이의신청','성과평가'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === '이의신청' && pendingObjections > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingObjections}</span>
            )}
            {t === '성과평가' && submittedEvals > 0 && (
              <span className="ml-1.5 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">{submittedEvals}</span>
            )}
          </button>
        ))}
      </div>

      {tab === '대시보드' && (
        <div className="space-y-5">
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '📋', label: '총 업무', value: `${totalItems}건`, sub: `배정 ${assignedItems}건` },
              { icon: '✅', label: '최종 확정', value: `${confirmedItems}건`, sub: `${totalItems ? Math.round((confirmedItems/totalItems)*100) : 0}%` },
              { icon: '⚠️', label: '이의신청', value: `${pendingObjections}건`, sub: '처리 대기' },
              { icon: '📊', label: '전체 진행률', value: `${overallProgress}%`, sub: `${completedAsgns}/${totalAsgns}` },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-xl font-bold text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-400">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* 직원별 진행률 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-blue-600" /> 전체 업무 진행 현황
            </h2>
            <div className="space-y-3">
              {teamMembers.map(emp => {
                const empAsgns = assignments.filter(a => a.employee_id === emp.id)
                const completed = empAsgns.filter(a => (progressMap[a.id]?.progress || 0) >= 100).length
                const pct = empAsgns.length ? Math.round((completed / empAsgns.length) * 100) : 0
                const totalScore = empAsgns.reduce((sum, a) => {
                  const item = workItems.find(w => w.id === a.work_item_id)
                  return sum + (item?.max_score || 10)
                }, 0)
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
                          <span className="text-xs text-gray-400">{totalScore}점</span>
                        </div>
                        <span className="text-xs text-gray-500">{completed}/{empAsgns.length} ({pct}%)</span>
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

      {tab === '배분현황' && (
        <div className="space-y-4">
          {/* 배분 상태별 그룹 */}
          {STATUS_STEPS.map(status => {
            const statusItems = workItems.filter(i => (i.assignment_status || '배분전') === status)
            if (statusItems.length === 0) return null
            return (
              <div key={status} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">{status} ({statusItems.length}건)</h3>
                </div>
                <div className="space-y-2">
                  {statusItems.map(item => {
                    const itemAsgns = assignments.filter(a => a.work_item_id === item.id)
                    const assigneeNames = itemAsgns.map(a => employees.find(e => e.id === a.employee_id)?.name).filter(Boolean)
                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-700 truncate flex-1">{item.title}</span>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          {assigneeNames.map((n, i) => (
                            <span key={i} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{n}</span>
                          ))}
                          {assigneeNames.length === 0 && <span className="text-xs text-gray-400">미배정</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* 최종 확정 버튼 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-2">업무분장 최종 확정</h3>
            <p className="text-sm text-gray-500 mb-4">
              이의신청이 모두 처리된 후 최종 확정을 진행하세요.
              {pendingObjections > 0 && <span className="text-orange-500 ml-1">({pendingObjections}건 이의신청 처리 대기)</span>}
            </p>
            <button onClick={handleFinalConfirm} disabled={confirming || pendingObjections > 0}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
              <CheckCircle size={16} />
              {confirming ? '확정 중...' : `전체 업무분장 최종 확정 ${pendingObjections > 0 ? '(이의신청 처리 후 가능)' : ''}`}
            </button>
          </div>
        </div>
      )}

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
            const statusColor = { '검토중': 'bg-yellow-100 text-yellow-700', '수용': 'bg-green-100 text-green-700', '기각': 'bg-red-100 text-red-700' }
            return (
              <div key={obj.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${obj.status === '검토중' ? 'border-orange-100' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[obj.status]}`}>{obj.status}</span>
                      <span className="text-xs text-gray-500">{emp?.name || '—'}</span>
                    </div>
                    <p className="font-medium text-gray-800 text-sm">{item?.title || '—'}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{new Date(obj.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{obj.reason}</p>
                {obj.alternative && <p className="text-xs text-gray-500 mt-2">💡 대안: {obj.alternative}</p>}
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

      {tab === '성과평가' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: '제출된 평가', value: evaluations.length, color: 'text-blue-600' },
              { label: '확정 완료', value: confirmedEvals, color: 'text-green-600' },
              { label: '검토 대기', value: submittedEvals, color: 'text-orange-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {evaluations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p>제출된 평가가 없습니다</p>
            </div>
          ) : evaluations.map(ev => {
            const emp = employees.find(e => e.id === ev.employee_id)
            const evaluator = employees.find(e => e.id === ev.evaluator_id)
            const statusColor = { '작성중': 'bg-gray-100 text-gray-600', '제출': 'bg-blue-100 text-blue-700', '확정': 'bg-green-100 text-green-700' }
            return (
              <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[ev.status]}`}>{ev.status}</span>
                      <span className="text-xs text-gray-500">{ev.eval_type}</span>
                    </div>
                    <p className="font-semibold text-gray-800">{emp?.name || '—'}</p>
                    <p className="text-xs text-gray-500">평가자: {evaluator?.name || '—'}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{ev.total_score}점</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[['업무수행', ev.work_score], ['업무태도', ev.attitude_score], ['협업소통', ev.cooperation_score]].map(([l, v]) => (
                    <div key={l} className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-sm font-bold text-gray-700">{v}</div>
                      <div className="text-xs text-gray-500">{l}</div>
                    </div>
                  ))}
                </div>
                {ev.comment && <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3">"{ev.comment}"</p>}
                {ev.status === '제출' && (
                  <button onClick={() => setEvalModal(ev)}
                    className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                    검토 및 확정
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {evalModal && (
        <EvalReviewModal eval={evalModal} employees={employees}
          onClose={() => setEvalModal(null)} onSaved={load} />
      )}
    </div>
  )
}
