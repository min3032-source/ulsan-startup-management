import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, ChevronDown, ChevronUp, MessageSquare, Star, Hand, AlertTriangle } from 'lucide-react'

const WORK_TYPES = ['전체','사업업무','정기업무','행정업무','돌발업무']
const SKILLS = ['기획력','문서작성','홍보마케팅','데이터분석','행정처리','예산정산','강의진행','네트워킹','IT활용','외국어']
const ASSIGNMENT_STATUS_COLORS = {
  '배분전': 'bg-gray-100 text-gray-600',
  '배분안작성중': 'bg-blue-100 text-blue-700',
  '직원검토중': 'bg-yellow-100 text-yellow-700',
  '이의신청중': 'bg-orange-100 text-orange-700',
  '확정': 'bg-green-100 text-green-700',
}
const WORK_TYPE_COLORS = {
  '사업업무': 'bg-blue-100 text-blue-700',
  '정기업무': 'bg-green-100 text-green-700',
  '행정업무': 'bg-yellow-100 text-yellow-700',
  '돌발업무': 'bg-red-100 text-red-700',
}

function AddWorkModal({ onClose, onSaved }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({ title: '', work_type: '사업업무', description: '', difficulty: 3, program_name: '', required_skills: [], is_team_work: false, is_recurring: false, recurring_cycle: '', max_score: 10 })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function toggleSkill(sk) {
    setForm(p => ({
      ...p,
      required_skills: p.required_skills.includes(sk)
        ? p.required_skills.filter(s => s !== sk)
        : [...p.required_skills, sk]
    }))
  }

  async function handleSave() {
    if (!form.title) return
    setSaving(true)
    await supabase.from('work_items').insert({
      title: form.title,
      work_type: form.work_type,
      description: form.description,
      difficulty: form.difficulty,
      program_name: form.program_name,
      required_skills: form.required_skills,
      is_team_work: form.is_team_work,
      is_recurring: form.is_recurring,
      recurring_cycle: form.is_recurring ? form.recurring_cycle : null,
      max_score: form.max_score,
      created_by: profile.id,
      assignment_status: '배분전',
    })
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800 text-lg">업무 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">업무명 *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="업무명을 입력하세요" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">업무 유형</label>
              <select value={form.work_type} onChange={e => set('work_type', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                {['사업업무','정기업무','행정업무','돌발업무'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">업무 점수</label>
              <input type="number" min="1" max="30" value={form.max_score} onChange={e => set('max_score', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">사업명 (사업업무인 경우)</label>
            <input value={form.program_name} onChange={e => set('program_name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="연결 사업명" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">난이도 ({form.difficulty}점)</label>
            <input type="range" min="1" max="5" value={form.difficulty} onChange={e => set('difficulty', Number(e.target.value))}
              className="w-full" />
            <div className="flex justify-between text-xs text-gray-400"><span>쉬움</span><span>보통</span><span>어려움</span></div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">상세 설명</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
              placeholder="업무 상세 내용" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-2">필요 강점 태그</label>
            <div className="flex flex-wrap gap-1.5">
              {SKILLS.map(sk => (
                <button key={sk} type="button" onClick={() => toggleSkill(sk)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.required_skills.includes(sk) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  {sk}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.is_team_work} onChange={e => set('is_team_work', e.target.checked)} className="rounded" />
              팀 공동 업무
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)} className="rounded" />
              반복 업무
            </label>
          </div>
          {form.is_recurring && (
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">반복 주기</label>
              <select value={form.recurring_cycle} onChange={e => set('recurring_cycle', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
                <option value="">선택</option>
                <option value="매주">매주</option>
                <option value="매월">매월</option>
                <option value="매년">매년</option>
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSave} disabled={saving || !form.title} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? '저장 중...' : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}

function OpinionModal({ workItem, type, onClose, onSaved }) {
  const { profile } = useAuth()
  const [content, setContent] = useState('')
  const [difficulty, setDifficulty] = useState(3)
  const [saving, setSaving] = useState(false)

  const titleMap = { '댓글': '의견 달기', '난이도의견': '난이도 의견', '희망신청': '업무 희망 신청' }

  async function handleSave() {
    setSaving(true)
    await supabase.from('work_opinions').insert({
      work_item_id: workItem.id,
      employee_id: profile.id,
      op_type: type,
      content,
      difficulty: type === '난이도의견' ? difficulty : null,
    })
    onSaved()
    onClose()
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
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2">난이도 선택</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setDifficulty(n)}
                  className={`text-2xl ${n <= difficulty ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
              ))}
            </div>
          </div>
        )}
        {type !== '희망신청' && (
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"
            placeholder={type === '댓글' ? '의견을 작성해주세요' : '추가 의견 (선택사항)'} />
        )}
        {type === '희망신청' && (
          <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
            이 업무를 희망 신청합니다.
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={2} className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none" placeholder="신청 사유 (선택사항)" />
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? '저장 중...' : '제출'}
          </button>
        </div>
      </div>
    </div>
  )
}

function WorkCard({ item, opinions, assignments, employees, canEdit, onRefresh }) {
  const { profile } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [opModal, setOpModal] = useState(null)

  const comments = (opinions[item.id] || []).filter(o => o.op_type === '댓글')
  const diffOps = (opinions[item.id] || []).filter(o => o.op_type === '난이도의견')
  const wishes = (opinions[item.id] || []).filter(o => o.op_type === '희망신청')
  const avgDiff = diffOps.length ? (diffOps.reduce((a, b) => a + b.difficulty, 0) / diffOps.length).toFixed(1) : null
  const myAssignment = (assignments[item.id] || []).find(a => a.employee_id === profile.id)
  const assignees = (assignments[item.id] || []).map(a => employees.find(e => e.id === a.employee_id)?.name).filter(Boolean)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WORK_TYPE_COLORS[item.work_type] || 'bg-gray-100 text-gray-600'}`}>
              {item.work_type}
            </span>
            {item.is_team_work && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">👥 공동</span>}
            {item.is_recurring && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">🔄 {item.recurring_cycle}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full ${ASSIGNMENT_STATUS_COLORS[item.assignment_status] || 'bg-gray-100 text-gray-600'}`}>
              {item.assignment_status || '배분전'}
            </span>
          </div>
          <h3 className="font-semibold text-gray-800 text-sm">{item.title}</h3>
          {item.program_name && <p className="text-xs text-gray-500 mt-0.5">📋 {item.program_name}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-gray-500">{item.max_score || 10}점</div>
          {avgDiff && <div className="text-xs text-yellow-500">{'★'.repeat(Math.round(avgDiff))} {avgDiff}</div>}
        </div>
      </div>

      {/* 필요 강점 */}
      {item.required_skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.required_skills.map(sk => (
            <span key={sk} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{sk}</span>
          ))}
        </div>
      )}

      {/* 배정된 담당자 */}
      {assignees.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {assignees.map((n, i) => (
            <span key={i} className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">✓ {n}</span>
          ))}
        </div>
      )}

      {/* 통계 */}
      <div className="flex gap-3 text-xs text-gray-500 mb-3">
        <span>💬 {comments.length}</span>
        <span>⭐ {diffOps.length}</span>
        <span>✋ {wishes.length}</span>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2">
        <button onClick={() => setOpModal('댓글')}
          className="flex-1 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 flex items-center justify-center gap-1">
          <MessageSquare size={11} /> 의견
        </button>
        <button onClick={() => setOpModal('난이도의견')}
          className="flex-1 text-xs py-1.5 border border-yellow-200 rounded-lg hover:bg-yellow-50 text-yellow-700 flex items-center justify-center gap-1">
          <Star size={11} /> 난이도
        </button>
        <button onClick={() => setOpModal('희망신청')}
          className="flex-1 text-xs py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 text-blue-700 flex items-center justify-center gap-1">
          <Hand size={11} /> 희망신청
        </button>
      </div>

      {/* 펼침: 댓글 목록 */}
      {comments.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setExpanded(p => !p)} className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-700">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            의견 {comments.length}개 보기
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {comments.map(c => (
                <div key={c.id} className="text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-700">{employees.find(e => e.id === c.employee_id)?.name || '—'}</span>
                  <span className="text-gray-500 ml-2">{c.content}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {opModal && (
        <OpinionModal workItem={item} type={opModal} onClose={() => setOpModal(null)} onSaved={onRefresh} />
      )}
    </div>
  )
}

export default function WorkPoolPage() {
  const { hasRole } = useAuth()
  const [filter, setFilter] = useState('전체')
  const [items, setItems] = useState([])
  const [opinions, setOpinions] = useState({})
  const [assignments, setAssignments] = useState({})
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [summary, setSummary] = useState({ comments: 0, diffs: 0, wishes: 0, objections: 0 })

  async function load() {
    setLoading(true)
    const [{ data: workItems }, { data: ops }, { data: asgns }, { data: emps }, { data: objs }] = await Promise.all([
      supabase.from('work_items').select('*').order('created_at', { ascending: false }),
      supabase.from('work_opinions').select('*'),
      supabase.from('work_assignments').select('*'),
      supabase.from('profiles').select('*').eq('is_active', true),
      supabase.from('work_objections').select('*'),
    ])

    setItems(workItems || [])
    setEmployees(emps || [])

    const opMap = {}
    ;(ops || []).forEach(o => {
      if (!opMap[o.work_item_id]) opMap[o.work_item_id] = []
      opMap[o.work_item_id].push(o)
    })
    setOpinions(opMap)

    const asgMap = {}
    ;(asgns || []).forEach(a => {
      if (!asgMap[a.work_item_id]) asgMap[a.work_item_id] = []
      asgMap[a.work_item_id].push(a)
    })
    setAssignments(asgMap)

    setSummary({
      comments: (ops || []).filter(o => o.op_type === '댓글').length,
      diffs: (ops || []).filter(o => o.op_type === '난이도의견').length,
      wishes: (ops || []).filter(o => o.op_type === '희망신청').length,
      objections: (objs || []).filter(o => o.status === '검토중').length,
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = items.filter(i => filter === '전체' || i.work_type === filter)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">업무 풀</h1>
          <p className="text-xs text-gray-500">전체 업무 목록 및 의견 제출</p>
        </div>
        {hasRole('manager') && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            <Plus size={15} /> 업무 직접 추가
          </button>
        )}
      </div>

      {/* 요약 패널 (관리자/팀장 이상) */}
      {hasRole('manager') && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { icon: '💬', label: '댓글', value: summary.comments },
            { icon: '⭐', label: '난이도 의견', value: summary.diffs },
            { icon: '✋', label: '희망 신청', value: summary.wishes },
            { icon: '⚠️', label: '이의신청', value: summary.objections },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
              <div className="text-lg">{s.icon}</div>
              <div className="text-xl font-bold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {WORK_TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">업무가 없습니다</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => (
            <WorkCard key={item.id} item={item} opinions={opinions} assignments={assignments}
              employees={employees} canEdit={hasRole('manager')} onRefresh={load} />
          ))}
        </div>
      )}

      {showAdd && <AddWorkModal onClose={() => setShowAdd(false)} onSaved={load} />}
    </div>
  )
}
