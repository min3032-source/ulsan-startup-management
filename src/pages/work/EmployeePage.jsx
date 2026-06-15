import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Tag, X, AlertTriangle, ChevronDown, ChevronUp, MessageSquare, Star, Hand, Award } from 'lucide-react'

const SKILLS = ['기획력','문서작성','홍보마케팅','데이터분석','행정처리','예산정산','강의진행','네트워킹','IT활용','외국어']
const WORK_TYPE_COLORS = {
  '사업업무': 'bg-blue-100 text-blue-700',
  '정기업무': 'bg-green-100 text-green-700',
  '행정업무': 'bg-yellow-100 text-yellow-700',
  '돌발업무': 'bg-red-100 text-red-700',
}

/* ── 강점 태그 추가 패널 ── */
function SkillAddPanel({ employeeId, existingSkills, onSaved }) {
  const [addSkill, setAddSkill] = useState('')
  const [addLevel, setAddLevel] = useState(3)

  async function handleAdd() {
    if (!addSkill) return
    await supabase.from('work_skills').insert({ employee_id: employeeId, skill: addSkill, level: addLevel })
    setAddSkill(''); setAddLevel(3)
    onSaved()
  }

  const remaining = SKILLS.filter(sk => !existingSkills.find(s => s.skill === sk))
  if (!remaining.length) return null

  return (
    <div className="mt-3 border-t pt-3">
      <p className="text-xs text-gray-500 font-medium mb-2">태그 추가</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {remaining.map(sk => (
          <button key={sk} onClick={() => setAddSkill(sk)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${addSkill === sk ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
            {sk}
          </button>
        ))}
      </div>
      {addSkill && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-blue-600">{addSkill}</span>
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setAddLevel(n)}
                className={`text-lg ${n <= addLevel ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
            ))}
          </div>
          <button onClick={handleAdd} className="ml-auto px-3 py-1 bg-blue-600 text-white text-xs rounded-lg">추가</button>
        </div>
      )}
    </div>
  )
}

/* ── 업무 이의신청 모달 ── */
function ObjectionModal({ assignment, workItem, onClose, onSaved }) {
  const { profile } = useAuth()
  const [reason, setReason] = useState('')
  const [alternative, setAlternative] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!reason) return
    setSaving(true)
    await supabase.from('work_objections').insert({
      work_item_id: workItem.id, employee_id: profile.id, reason,
      alternative: alternative || null,
    })
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">업무 이의신청</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <p className="text-sm font-medium text-gray-700 mb-4 bg-orange-50 px-3 py-2 rounded-lg">{workItem.title}</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">이의신청 사유 *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
              placeholder="이의신청 사유를 구체적으로 작성해주세요" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">대안 제안 (선택)</label>
            <textarea value={alternative} onChange={e => setAlternative(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
              placeholder="대안을 제안해주세요" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
          <button onClick={handleSave} disabled={saving || !reason}
            className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? '제출 중...' : '이의신청 제출'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 평가 이의신청 모달 ── */
function EvalObjectionModal({ period, onClose, onSaved }) {
  const { profile } = useAuth()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!reason) return
    setSaving(true)
    await supabase.from('eval_objections').insert({ employee_id: profile.id, period, reason })
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">평가 결과 이의신청</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4 bg-orange-50 px-3 py-2 rounded-lg">{period} 평가 결과에 대한 이의신청</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none mb-4"
          placeholder="이의신청 사유를 구체적으로 작성해주세요" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
          <button onClick={handleSave} disabled={saving || !reason}
            className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? '제출 중...' : '이의신청 제출'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 의견 모달 ── */
function OpinionModal({ workItem, type, onClose, onSaved }) {
  const { profile } = useAuth()
  const [content, setContent] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const [saving, setSaving] = useState(false)
  const titleMap = { '댓글': '의견 달기', '난이도의견': '난이도 의견', '희망신청': '희망 신청' }

  async function handleSave() {
    setSaving(true)
    await supabase.from('work_opinions').insert({
      work_item_id: workItem.id, employee_id: profile.id, op_type: type,
      content, difficulty: type === '난이도의견' ? difficulty : null,
    })
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">{titleMap[type]}</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-600 mb-4 bg-gray-50 px-3 py-2 rounded-lg">{workItem.title}</p>
        {type === '난이도의견' && (
          <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setDifficulty(n)} className={`text-2xl ${n <= difficulty ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
            ))}
          </div>
        )}
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
          placeholder="내용을 입력하세요" />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? '저장 중...' : '제출'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 업무 진행 카드 ── */
function ProgressCard({ item, assignId, initProgress, initNote, canObjection, onObjection, onSave }) {
  const [progress, setProgress] = useState(initProgress)
  const [note, setNote] = useState(initNote)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(progress, note)
    setDirty(false)
    setSaving(false)
  }

  return (
    <div className="border border-gray-100 rounded-xl p-3">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mr-2 ${WORK_TYPE_COLORS[item.work_type] || 'bg-gray-100 text-gray-600'}`}>
            {item.work_type}
          </span>
          <span className="text-sm font-medium text-gray-800">{item.title}</span>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">{item.max_score || 10}점</span>
      </div>
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">진행률</span>
          <span className="text-xs font-bold text-blue-600">{progress}%</span>
        </div>
        <input type="range" min="0" max="100" step="5" value={progress}
          onChange={e => { setProgress(Number(e.target.value)); setDirty(true) }}
          className="w-full accent-blue-600" />
      </div>
      <textarea value={note} onChange={e => { setNote(e.target.value); setDirty(true) }} rows={1}
        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-400 resize-none mb-2"
        placeholder="메모 입력" />
      <div className="flex gap-2">
        {dirty && (
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-xs py-1.5 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        )}
        {canObjection && (
          <button onClick={onObjection}
            className="flex items-center gap-1 text-xs py-1.5 px-3 border border-orange-200 rounded-lg hover:bg-orange-50 text-orange-600">
            <AlertTriangle size={11} /> 이의신청
          </button>
        )}
      </div>
    </div>
  )
}

/* ── EmployeePage 메인 ── */
export default function EmployeePage() {
  const { profile } = useAuth()
  const [mySkills, setMySkills]         = useState([])
  const [myAssignments, setMyAssignments] = useState([])
  const [workItems, setWorkItems]       = useState([])
  const [allEmployees, setAllEmployees] = useState([])
  const [allAssignments, setAllAssignments] = useState([])
  const [progressMap, setProgressMap]   = useState({})
  const [myEvaluations, setMyEvaluations] = useState([])
  const [evalObjections, setEvalObjections] = useState([])
  const [activeSeason, setActiveSeason] = useState(null)
  const [objectionModal, setObjectionModal] = useState(null)
  const [opinionModal, setOpinionModal] = useState(null)
  const [evalObjModal, setEvalObjModal] = useState(null)
  const [tab, setTab] = useState('내업무')
  const [loading, setLoading] = useState(true)
  const currentPeriod = `${new Date().getFullYear()}년`

  async function load() {
    if (!profile) return
    setLoading(true)
    const [{ data: skills }, { data: items }, { data: emps }, { data: asgns }, { data: progs }, { data: evals }, { data: season }, { data: evalObjs }] = await Promise.all([
      supabase.from('work_skills').select('*').eq('employee_id', profile.id),
      supabase.from('work_items').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('is_active', true),
      supabase.from('work_assignments').select('*'),
      supabase.from('work_progress').select('*'),
      supabase.from('performance_evaluations').select('*').eq('employee_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('eval_season_settings').select('*').eq('is_active', true).maybeSingle(),
      supabase.from('eval_objections').select('*').eq('employee_id', profile.id),
    ])
    setMySkills(skills || [])
    setWorkItems(items || [])
    setAllEmployees(emps || [])
    setAllAssignments(asgns || [])
    setMyEvaluations(evals || [])
    setActiveSeason(season || null)
    setEvalObjections(evalObjs || [])

    const myAsgns = (asgns || []).filter(a => a.employee_id === profile.id)
    setMyAssignments(myAsgns)

    const pMap = {}
    ;(progs || []).forEach(p => { pMap[p.work_assignment_id] = p })
    setProgressMap(pMap)
    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.id])

  async function handleRemoveSkill(id) {
    await supabase.from('work_skills').delete().eq('id', id)
    setMySkills(p => p.filter(s => s.id !== id))
  }

  async function handleProgressSave(assignId, progress, note) {
    const existing = progressMap[assignId]
    if (existing) {
      await supabase.from('work_progress').update({ progress, note, updated_by: profile.id, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('work_progress').insert({ work_assignment_id: assignId, progress, note, updated_by: profile.id })
    }
    load()
  }

  const canObjection = workItems.some(i => i.assignment_status === '직원검토중')

  const teamCompletionRate = () => {
    if (!allAssignments.length) return 0
    const done = allAssignments.filter(a => (progressMap[a.id]?.progress || 0) >= 100).length
    return Math.round((done / allAssignments.length) * 100)
  }

  /* 평가 결과 계산 */
  const periodEvals = myEvaluations.filter(e => e.period === currentPeriod && e.status !== '작성중')
  const mgrEval = periodEvals.find(e => e.eval_type === '팀장평가')
  const dirEval = periodEvals.find(e => e.eval_type === '부장평가')
  const finalScore = (mgrEval || dirEval)
    ? +((mgrEval?.total_score || 0) * 0.7 + (dirEval?.total_score || 0) * 0.3).toFixed(1)
    : null
  const isConfirmed = periodEvals.some(e => e.status === '확정')
  const hasEvalObjection = evalObjections.some(e => e.period === currentPeriod)

  /* 평가 시즌 기간 내 이의신청 가능 여부 */
  const canEvalObjection = () => {
    if (!activeSeason) return false
    const today = new Date()
    const end = activeSeason.end_date ? new Date(activeSeason.end_date) : null
    return end ? today <= end : true
  }

  if (loading) return <div className="p-8 text-center text-gray-400">로딩 중...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">내 업무 현황</h1>
        <p className="text-xs text-gray-500">반갑습니다, {profile?.name}님</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5 border-b">
        {['내업무','팀현황','내평가결과','업무풀'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── 내 업무 ── */}
      {tab === '내업무' && (
        <div className="space-y-6">
          {/* 강점 태그 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} className="text-blue-600" />
              <h2 className="font-semibold text-gray-800">내 강점 태그</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {mySkills.map(s => (
                <div key={s.id} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                  <span>{s.skill}</span>
                  <span className="text-yellow-400">{'★'.repeat(s.level)}</span>
                  <button onClick={() => handleRemoveSkill(s.id)} className="text-blue-300 hover:text-red-500"><X size={12} /></button>
                </div>
              ))}
              {mySkills.length === 0 && <p className="text-sm text-gray-400">등록된 강점 태그가 없습니다</p>}
            </div>
            <SkillAddPanel employeeId={profile.id} existingSkills={mySkills} onSaved={load} />
          </div>

          {/* 배정 업무 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 mb-3">배정된 업무 ({myAssignments.length}건)</h2>
            {myAssignments.length === 0 ? (
              <p className="text-sm text-gray-400">배정된 업무가 없습니다</p>
            ) : (
              <div className="space-y-3">
                {myAssignments.map(a => {
                  const item = workItems.find(w => w.id === a.work_item_id)
                  if (!item) return null
                  const prog = progressMap[a.id]
                  return (
                    <ProgressCard key={a.id} item={item} assignId={a.id}
                      initProgress={prog?.progress || 0} initNote={prog?.note || ''}
                      canObjection={canObjection && item.assignment_status === '직원검토중'}
                      onObjection={() => setObjectionModal({ a, item })}
                      onSave={(p, n) => handleProgressSave(a.id, p, n)} />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 팀 현황 ── */}
      {tab === '팀현황' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">팀 업무 현황</h2>
            <div className="text-sm font-bold text-blue-600">팀 완료율 {teamCompletionRate()}%</div>
          </div>
          <div className="space-y-3">
            {allEmployees.filter(e => e.role === 'viewer' || e.role === 'manager').map(emp => {
              const empAsgns = allAssignments.filter(a => a.employee_id === emp.id)
              const done = empAsgns.filter(a => (progressMap[a.id]?.progress || 0) >= 100).length
              const pct = empAsgns.length ? Math.round((done / empAsgns.length) * 100) : 0
              return (
                <div key={emp.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {emp.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{emp.name}</span>
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
      )}

      {/* ── 내 평가 결과 ── */}
      {tab === '내평가결과' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <Award size={18} className="text-blue-600" />
              <h2 className="font-semibold text-gray-800">{currentPeriod} 평가 결과</h2>
              {isConfirmed && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">확정</span>}
            </div>

            {periodEvals.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Award size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">아직 평가 결과가 없습니다</p>
                <p className="text-xs mt-1">평가 시즌이 시작되면 결과가 표시됩니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 팀장 평가 */}
                {mgrEval && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-semibold text-blue-800">팀장평가</span>
                        <span className="text-xs text-blue-600 ml-2">가중치 70%</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-blue-700">{mgrEval.total_score}점</div>
                        <div className="text-xs text-blue-500">가중 {+(mgrEval.total_score * 0.7).toFixed(1)}점</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {[['업무수행', mgrEval.work_score], ['업무태도', mgrEval.attitude_score], ['협업기여', mgrEval.cooperation_score]].map(([l, v]) => (
                        <div key={l} className="bg-white rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-gray-700">{v}</div>
                          <div className="text-xs text-gray-500">{l}</div>
                        </div>
                      ))}
                    </div>
                    {mgrEval.comment && (
                      <div className="bg-white rounded-lg px-3 py-2 text-xs text-gray-600">
                        💬 "{mgrEval.comment}"
                      </div>
                    )}
                  </div>
                )}

                {/* 부장 평가 */}
                {dirEval && (
                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-semibold text-purple-800">부장평가</span>
                        <span className="text-xs text-purple-600 ml-2">가중치 30%</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-purple-700">{dirEval.total_score}점</div>
                        <div className="text-xs text-purple-500">가중 {+(dirEval.total_score * 0.3).toFixed(1)}점</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {[['업무수행', dirEval.work_score], ['업무태도', dirEval.attitude_score], ['협업기여', dirEval.cooperation_score]].map(([l, v]) => (
                        <div key={l} className="bg-white rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-gray-700">{v}</div>
                          <div className="text-xs text-gray-500">{l}</div>
                        </div>
                      ))}
                    </div>
                    {dirEval.comment && (
                      <div className="bg-white rounded-lg px-3 py-2 text-xs text-gray-600">
                        💬 "{dirEval.comment}"
                      </div>
                    )}
                  </div>
                )}

                {/* 최종 점수 */}
                {finalScore !== null && (
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs opacity-80">최종 점수</div>
                        <div className="text-3xl font-bold mt-0.5">{finalScore}점</div>
                      </div>
                      <div className="text-right text-xs opacity-80 space-y-1">
                        {mgrEval && <div>팀장 {+(mgrEval.total_score * 0.7).toFixed(1)} + </div>}
                        {dirEval && <div>부장 {+(dirEval.total_score * 0.3).toFixed(1)}</div>}
                      </div>
                    </div>
                  </div>
                )}

                {/* 이의신청 */}
                {isConfirmed && (
                  <div className="mt-2">
                    {hasEvalObjection ? (
                      <div className="bg-orange-50 rounded-xl px-4 py-3 text-sm text-orange-700">
                        ✓ 평가 이의신청이 제출되었습니다
                      </div>
                    ) : canEvalObjection() ? (
                      <button onClick={() => setEvalObjModal(true)}
                        className="w-full py-2.5 border border-orange-200 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-50 flex items-center justify-center gap-2">
                        <AlertTriangle size={14} /> 평가 결과 이의신청
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 이전 기간 평가 이력 */}
          {myEvaluations.filter(e => e.period !== currentPeriod && e.status !== '작성중').length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">이전 평가 이력</h3>
              {[...new Set(myEvaluations.filter(e => e.period !== currentPeriod).map(e => e.period))].map(period => {
                const pEvals = myEvaluations.filter(e => e.period === period && e.status !== '작성중')
                const pMgr = pEvals.find(e => e.eval_type === '팀장평가')
                const pDir = pEvals.find(e => e.eval_type === '부장평가')
                const pFinal = (pMgr || pDir)
                  ? +((pMgr?.total_score || 0) * 0.7 + (pDir?.total_score || 0) * 0.3).toFixed(1)
                  : null
                return pFinal !== null ? (
                  <div key={period} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{period}</span>
                    <span className="font-bold text-gray-700">{pFinal}점</span>
                  </div>
                ) : null
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 업무 풀 ── */}
      {tab === '업무풀' && (
        <div className="space-y-3">
          {workItems.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mr-2 ${WORK_TYPE_COLORS[item.work_type] || 'bg-gray-100 text-gray-600'}`}>{item.work_type}</span>
                  <span className="text-sm font-medium text-gray-800">{item.title}</span>
                </div>
              </div>
              {item.required_skills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.required_skills.map(sk => (
                    <span key={sk} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{sk}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setOpinionModal({ item, type: '댓글' })}
                  className="flex-1 text-xs py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">💬 의견</button>
                <button onClick={() => setOpinionModal({ item, type: '난이도의견' })}
                  className="flex-1 text-xs py-1 border border-yellow-200 rounded-lg hover:bg-yellow-50 text-yellow-700">⭐ 난이도</button>
                <button onClick={() => setOpinionModal({ item, type: '희망신청' })}
                  className="flex-1 text-xs py-1 border border-blue-200 rounded-lg hover:bg-blue-50 text-blue-700">✋ 희망</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {objectionModal && (
        <ObjectionModal assignment={objectionModal.a} workItem={objectionModal.item}
          onClose={() => setObjectionModal(null)} onSaved={load} />
      )}
      {opinionModal && (
        <OpinionModal workItem={opinionModal.item} type={opinionModal.type}
          onClose={() => setOpinionModal(null)} onSaved={load} />
      )}
      {evalObjModal && (
        <EvalObjectionModal period={currentPeriod}
          onClose={() => setEvalObjModal(false)} onSaved={load} />
      )}
    </div>
  )
}
