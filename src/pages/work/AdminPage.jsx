import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Users, Tag, Plus, X, Star, Edit2, Save } from 'lucide-react'

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

function SkillModal({ employee, onClose, onSaved }) {
  const [skills, setSkills] = useState([])
  const [saving, setSaving] = useState(false)
  const [addSkill, setAddSkill] = useState('')
  const [addLevel, setAddLevel] = useState(3)

  useEffect(() => {
    supabase.from('work_skills').select('*').eq('employee_id', employee.id).then(({ data }) => {
      setSkills(data || [])
    })
  }, [employee.id])

  async function handleAdd() {
    if (!addSkill) return
    if (skills.find(s => s.skill === addSkill)) return
    const { data } = await supabase.from('work_skills').insert({ employee_id: employee.id, skill: addSkill, level: addLevel }).select().single()
    if (data) setSkills(prev => [...prev, data])
    setAddSkill('')
    setAddLevel(3)
  }

  async function handleRemove(id) {
    await supabase.from('work_skills').delete().eq('id', id)
    setSkills(prev => prev.filter(s => s.id !== id))
  }

  async function handleLevelChange(id, level) {
    await supabase.from('work_skills').update({ level }).eq('id', id)
    setSkills(prev => prev.map(s => s.id === id ? { ...s, level } : s))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-lg">{employee.name} 강점 태그 관리</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* 현재 태그 목록 */}
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {skills.length === 0 && <p className="text-sm text-gray-400 text-center py-4">등록된 강점 태그가 없습니다</p>}
          {skills.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-gray-700 w-24">{s.skill}</span>
              <StarRating value={s.level} onChange={lv => handleLevelChange(s.id, lv)} />
              <button onClick={() => handleRemove(s.id)} className="text-red-400 hover:text-red-600 ml-2"><X size={14} /></button>
            </div>
          ))}
        </div>

        {/* 태그 추가 */}
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
              <button onClick={handleAdd} className="ml-auto px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">추가</button>
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

function EditProfileModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({ name: employee.name, role: employee.role, department: employee.department || '', position: employee.position || '' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabase.from('profiles').update(form).eq('id', employee.id)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800 text-lg">직원 정보 수정</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">이름</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>
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
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">부서</label>
            <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="예: 창업지원팀" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">직책</label>
            <input value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="예: 선임연구원" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { hasRole } = useAuth()
  const [employees, setEmployees] = useState([])
  const [skillMap, setSkillMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [skillModal, setSkillModal] = useState(null)
  const [editModal, setEditModal] = useState(null)

  async function load() {
    setLoading(true)
    const { data: emps } = await supabase.from('profiles').select('*').eq('is_active', true).order('role')
    const { data: skills } = await supabase.from('work_skills').select('*')
    const map = {}
    ;(skills || []).forEach(s => {
      if (!map[s.employee_id]) map[s.employee_id] = []
      map[s.employee_id].push(s)
    })
    setEmployees(emps || [])
    setSkillMap(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  if (!hasRole('admin')) return (
    <div className="p-8 text-center text-gray-500">접근 권한이 없습니다 (부장 이상)</div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
          <Users size={18} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">직원 관리</h1>
          <p className="text-xs text-gray-500">강점 태그 및 직급 관리</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">로딩 중...</div>
      ) : (
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

                {/* 강점 태그 */}
                <div className="mb-3">
                  {empSkills.length === 0 ? (
                    <p className="text-xs text-gray-400">강점 태그 없음</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {empSkills.map(s => (
                        <span key={s.id} className="inline-flex items-center gap-0.5 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {s.skill}
                          <span className="text-yellow-500 ml-0.5">{'★'.repeat(s.level)}</span>
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

      {skillModal && (
        <SkillModal employee={skillModal} onClose={() => setSkillModal(null)} onSaved={() => { load(); setSkillModal(null) }} />
      )}
      {editModal && (
        <EditProfileModal employee={editModal} onClose={() => setEditModal(null)} onSaved={load} />
      )}
    </div>
  )
}
