import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Users, AlertTriangle, ClipboardList, X, Check, RefreshCw } from 'lucide-react'

const ROLE_LABEL = { master: '원장', admin: '부장', manager: '팀장', viewer: '팀원' }
const WORK_TYPE_COLORS = {
  '사업업무': 'bg-blue-100 text-blue-700',
  '정기업무': 'bg-green-100 text-green-700',
  '행정업무': 'bg-yellow-100 text-yellow-700',
  '돌발업무': 'bg-red-100 text-red-700',
}

function ObjectionReviewModal({ objection, employees, workItems, allAssignments, onClose, onSaved }) {
  const { profile } = useAuth()
  const [status, setStatus] = useState('')
  const [comment, setComment] = useState('')
  const [reassignTo, setReassignTo] = useState('')
  const [saving, setSaving] = useState(false)

  const emp = employees.find(e => e.id === objection.employee_id)
  const workItem = workItems.find(w => w.id === objection.work_item_id)
  const currentAssignment = allAssignments.find(a => a.work_item_id === objection.work_item_id && a.employee_id === objection.employee_id)

  async function handleSubmit() {
    if (!status || !comment) return
    setSaving(true)
    await supabase.from('work_objections').update({
      status, review_comment: comment, reviewed_by: profile.id
    }).eq('id', objection.id)

    if (status === '수용' && reassignTo && reassignTo !== objection.employee_id) {
      if (currentAssignment) {
        await supabase.from('work_assignments').delete().eq('id', currentAssignment.id)
      }
      await supabase.from('work_assignments').insert({
        work_item_id: objection.work_item_id, employee_id: reassignTo, assigned_by: profile.id
      })
    }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">이의신청 검토</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="bg-orange-50 rounded-xl px-4 py-3 mb-4">
          <div className="text-xs text-orange-600 font-medium mb-1">이의신청자: {emp?.name || '—'}</div>
          <div className="text-sm font-semibold text-gray-800">{workItem?.title || '—'}</div>
          <p className="text-xs text-gray-600 mt-2"><span className="font-medium">사유:</span> {objection.reason}</p>
          {objection.alternative && <p className="text-xs text-gray-600 mt-1"><span className="font-medium">대안:</span> {objection.alternative}</p>}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-2">처리 결과</label>
            <div className="grid grid-cols-2 gap-2">
              {['수용','기각'].map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-colors ${status === s
                    ? s === '수용' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {s === '수용' ? '✅ 수용' : '❌ 기각'}
                </button>
              ))}
            </div>
          </div>

          {status === '수용' && (
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">재배정 대상 (선택)</label>
              <select value={reassignTo} onChange={e => setReassignTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                <option value="">재배정 없음 (업무 회수)</option>
                {employees.filter(e => e.id !== objection.employee_id).map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({ROLE_LABEL[e.role]})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">검토 코멘트 *</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
              placeholder="검토 의견을 작성해주세요" />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSubmit} disabled={saving || !status || !comment}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? '저장 중...' : '처리 완료'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EvalModal({ employee, period, onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ work_score: 80, attitude_score: 80, cooperation_score: 80, comment: '' })
  const [saving, setSaving] = useState(false)
  const total = Math.round((form.work_score + form.attitude_score + form.cooperation_score) / 3)

  async function handleSave() {
    setSaving(true)
    await supabase.from('performance_evaluations').upsert({
      employee_id: employee.id, evaluator_id: profile.id, period,
      eval_type: '팀장평가', work_score: form.work_score,
      attitude_score: form.attitude_score, cooperation_score: form.cooperation_score,
      total_score: total, comment: form.comment, status: '제출',
    }, { onConflict: 'employee_id,evaluator_id,period,eval_type' })
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">{employee.name} 평가</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">기간: {period} · 팀장평가</p>
        <div className="space-y-4">
          {[
            { key: 'work_score', label: '업무 수행' },
            { key: 'attitude_score', label: '업무 태도' },
            { key: 'cooperation_score', label: '협업·소통' },
          ].map(({ key, label }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-700">{label}</label>
                <span className="text-sm font-bold text-blue-600">{form[key]}점</span>
              </div>
              <input type="range" min="0" max="100" step="5" value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))}
                className="w-full" />
            </div>
          ))}
          <div className="bg-blue-50 rounded-xl px-4 py-2 text-center">
            <div className="text-xs text-gray-500">종합 점수</div>
            <div className="text-2xl font-bold text-blue-600">{total}점</div>
          </div>
          <div>
            <label className="text-sm text-gray-700 block mb-1">종합 코멘트</label>
            <textarea value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
              placeholder="평가 코멘트를 작성해주세요" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? '저장 중...' : '평가 제출'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ManagerPage() {
  const { profile, hasRole } = useAuth()
  const [tab, setTab] = useState('대시보드')
  const [employees, setEmployees] = useState([])
  const [workItems, setWorkItems] = useState([])
  const [assignments, setAssignments] = useState([])
  const [objections, setObjections] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [reviewModal, setReviewModal] = useState(null)
  const [evalModal, setEvalModal] = useState(null)
  const currentPeriod = `${new Date().getFullYear()}년`

  async function load() {
    setLoading(true)
    const [{ data: emps }, { data: items }, { data: asgns }, { data: objs }, { data: progs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_active', true).in('role', ['viewer','manager']),
      supabase.from('work_items').select('*'),
      supabase.from('work_assignments').select('*'),
      supabase.from('work_objections').select('*').eq('status', '검토중').order('created_at', { ascending: false }),
      supabase.from('work_progress').select('*'),
    ])
    setEmployees(emps || [])
    setWorkItems(items || [])
    setAssignments(asgns || [])
    setObjections(objs || [])
    const pMap = {}
    ;(progs || []).forEach(p => { pMap[p.work_assignment_id] = p })
    setProgressMap(pMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (!hasRole('manager')) return (
    <div className="p-8 text-center text-gray-500">접근 권한이 없습니다 (팀장 이상)</div>
  )
  if (loading) return <div className="p-8 text-center text-gray-400">로딩 중...</div>

  const getEmpProgress = (empId) => {
    const empAsgns = assignments.filter(a => a.employee_id === empId)
    const completed = empAsgns.filter(a => (progressMap[a.id]?.progress || 0) >= 100).length
    const pct = empAsgns.length ? Math.round((completed / empAsgns.length) * 100) : 0
    return { total: empAsgns.length, completed, pct }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">팀장 대시보드</h1>
          <p className="text-xs text-gray-500">{currentPeriod} 업무 관리</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
          <RefreshCw size={13} /> 새로고침
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5 border-b">
        {['대시보드','이의신청','성과평가'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === '이의신청' && objections.length > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{objections.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === '대시보드' && (
        <div className="space-y-4">
          {/* 팀원별 진행률 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={16} className="text-blue-600" /> 팀원별 업무 진행률
            </h2>
            <div className="space-y-4">
              {employees.map(emp => {
                const { total, completed, pct } = getEmpProgress(emp.id)
                const empAsgns = assignments.filter(a => a.employee_id === emp.id)
                return (
                  <div key={emp.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                          {emp.name?.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{emp.name}</span>
                        <span className="text-xs text-gray-400">{ROLE_LABEL[emp.role]}</span>
                      </div>
                      <span className="text-xs text-gray-500">{completed}/{total} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-yellow-400'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    {/* 미완료 업무 */}
                    {empAsgns.filter(a => (progressMap[a.id]?.progress || 0) < 100).map(a => {
                      const item = workItems.find(w => w.id === a.work_item_id)
                      if (!item) return null
                      const p = progressMap[a.id]?.progress || 0
                      return (
                        <div key={a.id} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1 mb-1">
                          <span className={`px-1.5 py-0.5 rounded ${WORK_TYPE_COLORS[item.work_type] || 'bg-gray-100'} text-xs`}>{item.work_type}</span>
                          <span className="flex-1 truncate">{item.title}</span>
                          <span className="text-blue-600 font-medium">{p}%</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === '이의신청' && (
        <div className="space-y-3">
          {objections.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
              <p>처리 대기 중인 이의신청이 없습니다</p>
            </div>
          ) : objections.map(obj => {
            const emp = employees.find(e => e.id === obj.employee_id)
            const item = workItems.find(w => w.id === obj.work_item_id)
            return (
              <div key={obj.id} className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">이의신청</span>
                      <span className="text-xs text-gray-500">{emp?.name || '—'}</span>
                    </div>
                    <p className="font-medium text-gray-800 text-sm">{item?.title || '—'}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{new Date(obj.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <p className="text-sm text-gray-600 bg-orange-50 rounded-lg px-3 py-2 mb-3">{obj.reason}</p>
                {obj.alternative && (
                  <p className="text-xs text-gray-500 mb-3">💡 대안: {obj.alternative}</p>
                )}
                <button onClick={() => setReviewModal(obj)}
                  className="w-full py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600">
                  검토하기
                </button>
              </div>
            )
          })}
        </div>
      )}

      {tab === '성과평가' && (
        <div className="space-y-3">
          <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700 mb-4">
            📋 {currentPeriod} 팀장 평가 — 팀원별 업무 수행, 태도, 협업 점수를 입력하세요
          </div>
          {employees.map(emp => (
            <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {emp.name?.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{emp.name}</div>
                  <div className="text-xs text-gray-500">{ROLE_LABEL[emp.role]}</div>
                </div>
              </div>
              <button onClick={() => setEvalModal(emp)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                평가 작성
              </button>
            </div>
          ))}
        </div>
      )}

      {reviewModal && (
        <ObjectionReviewModal objection={reviewModal} employees={employees} workItems={workItems}
          allAssignments={assignments} onClose={() => setReviewModal(null)} onSaved={load} />
      )}
      {evalModal && (
        <EvalModal employee={evalModal} period={currentPeriod}
          onClose={() => setEvalModal(null)} onSaved={load} />
      )}
    </div>
  )
}
