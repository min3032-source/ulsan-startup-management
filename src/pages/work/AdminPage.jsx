import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Users, Tag, X, Edit2, Calendar, BarChart2, ChevronDown, ChevronUp } from 'lucide-react'

const SKILLS = ['기획력','문서작성','홍보마케팅','데이터분석','행정처리','예산정산','강의진행','네트워킹','IT활용','외국어']
const ROLE_LABEL = { master: '원장', admin: '부장', manager: '팀장', viewer: '팀원' }
const ROLE_COLOR = { master: 'bg-purple-100 text-purple-700', admin: 'bg-blue-100 text-blue-700', manager: 'bg-teal-100 text-teal-700', viewer: 'bg-gray-100 text-gray-600' }

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange && onChange(n)} type="button"
          className={`text-lg ${n <= value ? 'text-yellow-400' : 'text-gray-300'} ${onChange ? 'hover:text-yellow-300 cursor-pointer' : 'cursor-default'}`}>
          ★
        </button>
      ))}
    </div>
  )
}

/* ── 강점 태그 모달 ── */
function SkillModal({ employee, onClose }) {
  const [skills, setSkills] = useState([])
  const [addSkill, setAddSkill] = useState('')
  const [addLevel, setAddLevel] = useState(3)

  useEffect(() => {
    supabase.from('work_skills').select('*').eq('employee_id', employee.id).then(({ data }) => setSkills(data || []))
  }, [employee.id])

  async function handleAdd() {
    if (!addSkill || skills.find(s => s.skill === addSkill)) return
    const { data } = await supabase.from('work_skills').insert({ employee_id: employee.id, skill: addSkill, level: addLevel }).select().single()
    if (data) setSkills(p => [...p, data])
    setAddSkill(''); setAddLevel(3)
  }

  async function handleRemove(id) {
    await supabase.from('work_skills').delete().eq('id', id)
    setSkills(p => p.filter(s => s.id !== id))
  }

  async function handleLevelChange(id, level) {
    await supabase.from('work_skills').update({ level }).eq('id', id)
    setSkills(p => p.map(s => s.id === id ? { ...s, level } : s))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">{employee.name} 강점 태그</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {skills.length === 0 && <p className="text-sm text-gray-400 text-center py-4">등록된 강점 태그 없음</p>}
          {skills.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-gray-700 w-24">{s.skill}</span>
              <StarRating value={s.level} onChange={lv => handleLevelChange(s.id, lv)} />
              <button onClick={() => handleRemove(s.id)} className="text-red-400 hover:text-red-600 ml-2"><X size={14} /></button>
            </div>
          ))}
        </div>
        <div className="border-t pt-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">태그 추가</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SKILLS.filter(sk => !skills.find(s => s.skill === sk)).map(sk => (
              <button key={sk} onClick={() => setAddSkill(sk)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${addSkill === sk ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                {sk}
              </button>
            ))}
          </div>
          {addSkill && (
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium text-blue-600">{addSkill}</span>
              <StarRating value={addLevel} onChange={setAddLevel} />
              <button onClick={handleAdd} className="ml-auto px-3 py-1 bg-blue-600 text-white text-xs rounded-lg">추가</button>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">완료</button>
        </div>
      </div>
    </div>
  )
}

/* ── 직원 정보 수정 모달 ── */
function EditProfileModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({ name: employee.name, role: employee.role, department: employee.department || '', position: employee.position || '' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabase.from('profiles').update(form).eq('id', employee.id)
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800">직원 정보 수정</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          {[
            { key: 'name', label: '이름', type: 'text', placeholder: '' },
            { key: 'department', label: '부서', type: 'text', placeholder: '예: 창업지원팀' },
            { key: 'position', label: '직책', type: 'text', placeholder: '예: 선임연구원' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
              <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder={placeholder} />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">직급</label>
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400">
              <option value="viewer">팀원</option>
              <option value="manager">팀장</option>
              <option value="admin">부장</option>
              <option value="master">원장</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 평가 시즌 설정 모달 ── */
function SeasonModal({ existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    period:     existing?.period     || `${new Date().getFullYear()}년`,
    start_date: existing?.start_date || '',
    end_date:   existing?.end_date   || '',
    is_active:  existing?.is_active  || false,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    if (existing) {
      await supabase.from('eval_season_settings').update(form).eq('id', existing.id)
    } else {
      if (form.is_active) {
        await supabase.from('eval_season_settings').update({ is_active: false }).eq('is_active', true)
      }
      await supabase.from('eval_season_settings').insert(form)
    }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800">평가 시즌 설정</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">기간명 *</label>
            <input value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="예: 2026년 상반기" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">시작일</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">종료일</label>
              <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
            현재 활성 시즌으로 설정
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">취소</button>
          <button onClick={handleSave} disabled={saving || !form.period}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── AdminPage 메인 ── */
export default function AdminPage() {
  const { hasRole } = useAuth()
  const [tab, setTab]               = useState('직원관리')
  const [employees, setEmployees]   = useState([])
  const [skillMap, setSkillMap]     = useState({})
  const [seasons, setSeasons]       = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [loading, setLoading]       = useState(true)
  const [skillModal, setSkillModal] = useState(null)
  const [editModal, setEditModal]   = useState(null)
  const [seasonModal, setSeasonModal] = useState(null)
  const [expandedEmp, setExpandedEmp] = useState(null)

  async function load() {
    setLoading(true)
    const [{ data: emps }, { data: skills }, { data: seas }, { data: evals }] = await Promise.all([
      supabase.from('profiles').select('*').eq('is_active', true).order('role'),
      supabase.from('work_skills').select('*'),
      supabase.from('eval_season_settings').select('*').order('created_at', { ascending: false }),
      supabase.from('performance_evaluations').select('*').order('created_at', { ascending: false }),
    ])
    setEmployees(emps || [])
    const map = {}
    ;(skills || []).forEach(s => {
      if (!map[s.employee_id]) map[s.employee_id] = []
      map[s.employee_id].push(s)
    })
    setSkillMap(map)
    setSeasons(seas || [])
    setEvaluations(evals || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (!hasRole('admin')) return <div className="p-8 text-center text-gray-500">접근 권한이 없습니다 (부장 이상)</div>

  /* 파생 데이터 */
  const activeSeason = seasons.find(s => s.is_active)
  const periodList = [...new Set(evaluations.map(e => e.period))].sort().reverse()

  /* 직원별 기간별 평가 이력 */
  const getEmpEvals = (empId, period) =>
    evaluations.filter(e => e.employee_id === empId && e.period === period)

  const getFinalScore = (empId, period) => {
    const evals = getEmpEvals(empId, period).filter(e => e.status !== '작성중')
    const total = evals.reduce((sum, e) => sum + (e.total_score || 0) * (e.eval_weight || 0), 0)
    return evals.length ? +total.toFixed(1) : null
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
          <Users size={18} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">관리자 페이지</h1>
          <p className="text-xs text-gray-500">직원 관리 · 성과평가 설정</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5 border-b">
        {['직원관리','성과평가설정','평가현황'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">로딩 중...</div> : (
        <>
          {/* ── 직원 관리 ── */}
          {tab === '직원관리' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map(emp => {
                const empSkills = skillMap[emp.id] || []
                return (
                  <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {emp.name?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{emp.name}</div>
                          <div className="text-xs text-gray-500">{emp.department || '—'} · {emp.position || '—'}</div>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOR[emp.role] || 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABEL[emp.role] || emp.role}
                      </span>
                    </div>
                    <div className="mb-3">
                      {empSkills.length === 0 ? (
                        <p className="text-xs text-gray-400">강점 태그 없음</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {empSkills.map(s => (
                            <span key={s.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {s.skill} {'★'.repeat(s.level)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditModal(emp)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                        <Edit2 size={12} /> 정보 수정
                      </button>
                      <button onClick={() => setSkillModal(emp)}
                        className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 text-blue-600">
                        <Tag size={12} /> 강점 태그
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── 성과평가 설정 ── */}
          {tab === '성과평가설정' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">평가 시즌 목록</h2>
                <button onClick={() => setSeasonModal({})}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 flex items-center gap-1">
                  <Calendar size={12} /> 시즌 추가
                </button>
              </div>

              {seasons.length === 0 ? (
                <div className="text-center py-8 text-gray-400">등록된 평가 시즌이 없습니다</div>
              ) : seasons.map(s => (
                <div key={s.id} className={`bg-white rounded-2xl border shadow-sm p-4 ${s.is_active ? 'border-blue-200' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{s.period}</span>
                        {s.is_active && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">활성</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {s.start_date} ~ {s.end_date}
                      </div>
                    </div>
                    <button onClick={() => setSeasonModal(s)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
                      수정
                    </button>
                  </div>
                </div>
              ))}

              {activeSeason && (
                <div className="bg-blue-50 rounded-xl px-4 py-3">
                  <p className="text-sm font-medium text-blue-800">현재 활성 시즌: {activeSeason.period}</p>
                  <p className="text-xs text-blue-600">{activeSeason.start_date} ~ {activeSeason.end_date}</p>
                </div>
              )}

              {/* 평가 구조 안내 */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 mb-3">평가 구조</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-3 py-2">
                    <span className="text-blue-700 font-medium">팀원 평가</span>
                    <span className="text-gray-600">팀장 70% + 부장 30% = 최종 100%</span>
                  </div>
                  <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-3 py-2">
                    <span className="text-purple-700 font-medium">팀장 평가</span>
                    <span className="text-gray-600">부장 100%</span>
                  </div>
                  <div className="flex items-center gap-3 bg-green-50 rounded-xl px-3 py-2">
                    <span className="text-green-700 font-medium">부장 확인</span>
                    <span className="text-gray-600">원장 최종 확인</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 평가 현황 ── */}
          {tab === '평가현황' && (
            <div className="space-y-4">
              {/* 기간 선택 */}
              {periodList.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
                  <p>평가 데이터가 없습니다</p>
                </div>
              ) : periodList.map(period => {
                const periodEvals = evaluations.filter(e => e.period === period)
                const confirmedCount = periodEvals.filter(e => e.status === '확정').length
                return (
                  <div key={period} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">{period}</h3>
                      <span className="text-xs text-gray-500">확정 {confirmedCount}/{periodEvals.length}건</span>
                    </div>

                    {/* 직원별 평가 이력 */}
                    <div className="space-y-2">
                      {employees.filter(e => e.role === 'viewer' || e.role === 'manager').map(emp => {
                        const empPeriodEvals = getEmpEvals(emp.id, period)
                        const finalScore = getFinalScore(emp.id, period)
                        const isExpanded = expandedEmp === `${emp.id}-${period}`

                        if (empPeriodEvals.length === 0) return null

                        return (
                          <div key={emp.id} className="border border-gray-100 rounded-xl overflow-hidden">
                            <button onClick={() => setExpandedEmp(isExpanded ? null : `${emp.id}-${period}`)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                  {emp.name?.charAt(0)}
                                </div>
                                <span className="text-sm font-medium text-gray-700">{emp.name}</span>
                                <span className="text-xs text-gray-400">{ROLE_LABEL[emp.role]}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {finalScore !== null && (
                                  <span className="text-sm font-bold text-blue-600">{finalScore}점</span>
                                )}
                                {isExpanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-3 pb-3 border-t border-gray-50">
                                <div className="space-y-2 mt-2">
                                  {empPeriodEvals.map(ev => {
                                    const evaluator = employees.find(e => e.id === ev.evaluator_id)
                                    const sc = { '작성중': 'bg-gray-100 text-gray-600', '제출': 'bg-blue-100 text-blue-700', '확정': 'bg-green-100 text-green-700' }
                                    return (
                                      <div key={ev.id} className="bg-gray-50 rounded-lg px-3 py-2">
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="flex items-center gap-2">
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sc[ev.status]}`}>{ev.status}</span>
                                            <span className="text-xs text-gray-600">{ev.eval_type}</span>
                                            <span className="text-xs text-gray-400">by {evaluator?.name}</span>
                                            <span className="text-xs text-gray-400">(×{ev.eval_weight})</span>
                                          </div>
                                          <span className="text-sm font-bold text-gray-700">{ev.total_score}점</span>
                                        </div>
                                        <div className="flex gap-2 text-xs text-gray-500">
                                          <span>업무 {ev.work_score}</span>
                                          <span>태도 {ev.attitude_score}</span>
                                          <span>협업 {ev.cooperation_score}</span>
                                          <span className="text-gray-400">→ 가중 {+(ev.total_score * ev.eval_weight).toFixed(1)}</span>
                                        </div>
                                        {ev.comment && <p className="text-xs text-gray-500 mt-1 truncate">"{ev.comment}"</p>}
                                      </div>
                                    )
                                  })}
                                  {finalScore !== null && (
                                    <div className="bg-blue-50 rounded-lg px-3 py-2 flex items-center justify-between">
                                      <span className="text-xs font-medium text-blue-700">최종 점수</span>
                                      <span className="text-base font-bold text-blue-700">{finalScore}점</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {skillModal && <SkillModal employee={skillModal} onClose={() => { setSkillModal(null); load() }} />}
      {editModal && <EditProfileModal employee={editModal} onClose={() => setEditModal(null)} onSaved={load} />}
      {seasonModal !== null && <SeasonModal existing={Object.keys(seasonModal).length ? seasonModal : null} onClose={() => setSeasonModal(null)} onSaved={load} />}
    </div>
  )
}
