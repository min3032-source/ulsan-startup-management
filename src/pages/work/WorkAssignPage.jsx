import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ChevronDown, ChevronUp, Check, AlertCircle, Users, X } from 'lucide-react'

const ROLE_LABEL = { master: '원장', admin: '부장', manager: '팀장', viewer: '팀원' }
const WORK_TYPE_COLORS = {
  '사업업무': 'bg-blue-100 text-blue-700',
  '정기업무': 'bg-green-100 text-green-700',
  '행정업무': 'bg-yellow-100 text-yellow-700',
  '돌발업무': 'bg-red-100 text-red-700',
}
const STATUS_STEPS = ['배분전','배분안작성중','직원검토중','이의신청중','확정']

function StatusStepper({ status }) {
  const cur = STATUS_STEPS.indexOf(status || '배분전')
  return (
    <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-1">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${i === cur ? 'bg-blue-600 text-white' : i < cur ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
            {i < cur && <Check size={11} />}
            {s}
          </div>
          {i < STATUS_STEPS.length - 1 && <div className={`w-6 h-0.5 ${i < cur ? 'bg-blue-300' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  )
}

function AssignDropdown({ workItem, employees, assignments, employeeSkills, onAssign, onRemove }) {
  const [open, setOpen] = useState(false)
  const assignedIds = new Set(assignments.map(a => a.employee_id))

  const totalScore = (empId) => {
    return assignments.filter(a => a.employee_id !== empId).length * 5
  }

  const skillMatch = (emp) => {
    const mySkills = (employeeSkills[emp.id] || []).map(s => s.skill)
    const needed = workItem.required_skills || []
    return needed.length === 0 || needed.some(s => mySkills.includes(s))
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(p => !p)}
        className="w-full text-xs py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1">
        <Users size={11} /> 배정
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-30 bg-white rounded-xl shadow-xl border border-gray-100 w-56 max-h-60 overflow-y-auto">
          {employees.map(emp => {
            const isAssigned = assignedIds.has(emp.id)
            const matched = skillMatch(emp)
            return (
              <button key={emp.id} onClick={() => { isAssigned ? onRemove(emp.id) : onAssign(emp.id); setOpen(false) }}
                className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 ${isAssigned ? 'bg-blue-50' : ''}`}>
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {emp.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate">{emp.name}</div>
                  <div className="text-[10px] text-gray-500">{ROLE_LABEL[emp.role]}</div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end">
                  {isAssigned && <Check size={12} className="text-blue-600" />}
                  {matched ? <span className="text-[10px] text-green-600">✅ 강점매칭</span> : <span className="text-[10px] text-orange-500">⚠️ 미매칭</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function UnassignedCard({ item, employees, allAssignments, employeeSkills, opinions, onAssign, onRemove, onRefresh }) {
  const [wishOpen, setWishOpen] = useState(false)
  const myAssignments = allAssignments.filter(a => a.work_item_id === item.id)
  const wishes = (opinions[item.id] || []).filter(o => o.op_type === '희망신청')
  const diffOps = (opinions[item.id] || []).filter(o => o.op_type === '난이도의견')
  const avgDiff = diffOps.length ? (diffOps.reduce((a, b) => a + b.difficulty, 0) / diffOps.length).toFixed(1) : null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 mb-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${WORK_TYPE_COLORS[item.work_type] || 'bg-gray-100 text-gray-600'}`}>
              {item.work_type}
            </span>
            {item.is_team_work && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">👥</span>}
          </div>
          <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
        </div>
        <div className="text-right ml-2 flex-shrink-0">
          <div className="text-xs font-bold text-gray-700">{item.max_score || 10}점</div>
          {avgDiff && <div className="text-xs text-yellow-500">{'★'.repeat(Math.round(avgDiff))}{avgDiff}</div>}
        </div>
      </div>

      {item.required_skills?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.required_skills.map(sk => (
            <span key={sk} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{sk}</span>
          ))}
        </div>
      )}

      {/* 현재 배정자 */}
      {myAssignments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {myAssignments.map(a => {
            const emp = employees.find(e => e.id === a.employee_id)
            return (
              <span key={a.id} className="inline-flex items-center gap-1 text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                {emp?.name || '—'}
                <button onClick={() => onRemove(a.id, item.id)} className="hover:text-red-500"><X size={10} /></button>
              </span>
            )
          })}
        </div>
      )}

      {wishes.length > 0 && (
        <button onClick={() => setWishOpen(p => !p)} className="text-xs text-blue-600 mb-2 flex items-center gap-1">
          ✋ 희망 {wishes.length}명 {wishOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      )}
      {wishOpen && wishes.length > 0 && (
        <div className="mb-2 bg-blue-50 rounded-lg px-2 py-1.5 space-y-0.5">
          {wishes.map(w => {
            const emp = employees.find(e => e.id === w.employee_id)
            return <div key={w.id} className="text-xs text-blue-700">✋ {emp?.name || '—'}</div>
          })}
        </div>
      )}

      <AssignDropdown workItem={item} employees={employees} assignments={myAssignments}
        employeeSkills={employeeSkills} onAssign={empId => onAssign(item.id, empId)} onRemove={(empId) => {
          const a = myAssignments.find(x => x.employee_id === empId)
          if (a) onRemove(a.id, item.id)
        }} />
    </div>
  )
}

function EmployeeCard({ employee, assignments, workItems, empSkills }) {
  const [expanded, setExpanded] = useState(false)
  const myAssigns = assignments.filter(a => a.employee_id === employee.id)
  const totalScore = myAssigns.reduce((sum, a) => {
    const item = workItems.find(w => w.id === a.work_item_id)
    return sum + (item?.max_score || 10)
  }, 0)
  const maxScore = 100
  const pct = Math.min((totalScore / maxScore) * 100, 100)
  const over = totalScore > maxScore

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-3 mb-3 ${over ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            {employee.name?.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-800">{employee.name}</div>
            <div className="text-xs text-gray-500">{ROLE_LABEL[employee.role]}</div>
          </div>
        </div>
        <div className={`text-xs font-bold ${over ? 'text-red-600' : 'text-gray-700'}`}>
          {totalScore} / {maxScore}점
          {over && <AlertCircle size={12} className="inline ml-1" />}
        </div>
      </div>

      {/* 강점 태그 */}
      {empSkills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {empSkills.slice(0, 3).map(s => (
            <span key={s.id} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{s.skill}</span>
          ))}
          {empSkills.length > 3 && <span className="text-xs text-gray-400">+{empSkills.length - 3}</span>}
        </div>
      )}

      {/* 프로그레스 바 */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-yellow-400' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }} />
      </div>

      {/* 배정 업무 목록 */}
      {myAssigns.length > 0 && (
        <button onClick={() => setExpanded(p => !p)} className="text-xs text-gray-500 flex items-center gap-1">
          배정업무 {myAssigns.length}건 {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      )}
      {expanded && (
        <div className="mt-2 space-y-1">
          {myAssigns.map(a => {
            const item = workItems.find(w => w.id === a.work_item_id)
            return item ? (
              <div key={a.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2 py-1">
                <span className="text-gray-700 truncate">{item.title}</span>
                <span className="text-gray-500 ml-2 flex-shrink-0">{item.max_score || 10}점</span>
              </div>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}

export default function WorkAssignPage() {
  const { profile, hasRole } = useAuth()
  const [workItems, setWorkItems] = useState([])
  const [assignments, setAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [employeeSkills, setEmployeeSkills] = useState({})
  const [opinions, setOpinions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [globalStatus, setGlobalStatus] = useState('배분전')

  async function load() {
    setLoading(true)
    const [{ data: items }, { data: asgns }, { data: emps }, { data: skills }, { data: ops }] = await Promise.all([
      supabase.from('work_items').select('*').order('work_type').order('created_at'),
      supabase.from('work_assignments').select('*'),
      supabase.from('profiles').select('*').eq('is_active', true).in('role', ['viewer','manager']),
      supabase.from('work_skills').select('*'),
      supabase.from('work_opinions').select('*'),
    ])
    setWorkItems(items || [])
    setAssignments(asgns || [])
    setEmployees(emps || [])

    const skillMap = {}
    ;(skills || []).forEach(s => {
      if (!skillMap[s.employee_id]) skillMap[s.employee_id] = []
      skillMap[s.employee_id].push(s)
    })
    setEmployeeSkills(skillMap)

    const opMap = {}
    ;(ops || []).forEach(o => {
      if (!opMap[o.work_item_id]) opMap[o.work_item_id] = []
      opMap[o.work_item_id].push(o)
    })
    setOpinions(opMap)

    // 대표 status 계산 (배분된 항목들의 status 확인)
    const statuses = (items || []).map(i => i.assignment_status || '배분전').filter(Boolean)
    const latest = STATUS_STEPS.reduce((best, s) => {
      return statuses.includes(s) && STATUS_STEPS.indexOf(s) > STATUS_STEPS.indexOf(best) ? s : best
    }, '배분전')
    setGlobalStatus(latest)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAssign(workItemId, empId) {
    await supabase.from('work_assignments').insert({ work_item_id: workItemId, employee_id: empId, assigned_by: profile.id })
    load()
  }

  async function handleRemove(assignId, workItemId) {
    await supabase.from('work_assignments').delete().eq('id', assignId)
    load()
  }

  async function saveDraft() {
    setSaving(true)
    const assignedIds = [...new Set(assignments.map(a => a.work_item_id))]
    if (assignedIds.length > 0) {
      await supabase.from('work_items').update({ assignment_status: '배분안작성중' }).in('id', assignedIds)
    }
    await load()
    setSaving(false)
    alert('배분안이 저장되었습니다.')
  }

  async function sendForReview() {
    setSaving(true)
    await supabase.from('work_items').update({ assignment_status: '직원검토중' }).not('id', 'is', null)
    await load()
    setSaving(false)
    alert('직원 검토 요청이 발송되었습니다. 직원들이 배분안을 확인하고 이의신청할 수 있습니다.')
  }

  if (!hasRole('manager')) return (
    <div className="p-8 text-center text-gray-500">접근 권한이 없습니다 (팀장 이상)</div>
  )

  const unassigned = workItems.filter(i => !assignments.find(a => a.work_item_id === i.id))
  const assigned = workItems.filter(i => assignments.find(a => a.work_item_id === i.id))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">업무 배분</h1>
          <p className="text-xs text-gray-500">업무 배정 및 검토 요청</p>
        </div>
      </div>

      <StatusStepper status={globalStatus} />

      <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
        {/* 왼쪽: 업무 목록 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-700">미배정 업무 ({unassigned.length})</h2>
          </div>
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {unassigned.map(item => (
              <UnassignedCard key={item.id} item={item} employees={employees}
                allAssignments={assignments} employeeSkills={employeeSkills} opinions={opinions}
                onAssign={handleAssign} onRemove={handleRemove} onRefresh={load} />
            ))}
            {unassigned.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">모든 업무가 배정되었습니다 ✓</div>
            )}
          </div>

          {assigned.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">배정 완료 ({assigned.length})</h2>
              {assigned.map(item => (
                <UnassignedCard key={item.id} item={item} employees={employees}
                  allAssignments={assignments} employeeSkills={employeeSkills} opinions={opinions}
                  onAssign={handleAssign} onRemove={handleRemove} onRefresh={load} />
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 직원별 현황 */}
        <div className="w-72 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">직원별 현황</h2>
          <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {employees.map(emp => (
              <EmployeeCard key={emp.id} employee={emp} assignments={assignments}
                workItems={workItems} empSkills={employeeSkills[emp.id] || []} />
            ))}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex gap-3 justify-end" style={{ zIndex: 20 }}>
        <button onClick={saveDraft} disabled={saving}
          className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50">
          배분안 저장
        </button>
        <button onClick={sendForReview} disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          직원 검토 요청
        </button>
      </div>
    </div>
  )
}
