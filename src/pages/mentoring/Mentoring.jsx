import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EXPERT_FIELDS, MENTORING_PROGRAMS, DEFAULT_SETTINGS, getExpertFieldBadgeClass, today } from '../../lib/constants'
import { StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'

const emptyForm = () => ({
  expert_id: '', target_type: 'founder', target_id: '', target_name: '',
  program: MENTORING_PROGRAMS[0], staff: '', date: today(), time: '',
  duration: '1', method: '방문', status: '예정', cost: '0',
  content: '', outcome: '', next_date: '', memo: '',
})

export default function Mentoring() {
  const { hasRole } = useAuth()
  const canWrite = hasRole("manager")
  const canDelete = hasRole("admin")

  const [mentorings, setMentorings] = useState([])
  const [experts, setExperts] = useState([])
  const [founders, setFounders] = useState([])
  const [selectedFirms, setSelectedFirms] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterExpert, setFilterExpert] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterField, setFilterField] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: m }, { data: e }, { data: f }, { data: sf }, { data: s }] = await Promise.all([
        supabase.from('mentorings').select('*').order('date', { ascending: false }),
        supabase.from('experts').select('*').order('name'),
        supabase.from('founders').select('id, name, biz'),
        supabase.from('selected_firms').select('id, company_name'),
        supabase.from('team_settings').select('*').limit(1).single(),
      ])
      setMentorings(m || [])
      setExperts(e || [])
      setFounders(f || [])
      setSelectedFirms(sf || [])
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const expertMap = Object.fromEntries(experts.map(e => [e.id, e]))

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function openAdd(preExpertId = '') {
    setEditingId(null)
    const f = emptyForm()
    if (preExpertId) f.expert_id = preExpertId
    setForm(f)
    setModalOpen(true)
  }

  function openEdit(m) {
    setEditingId(m.id)
    setForm({
      expert_id: m.expert_id || '', target_type: m.target_type || 'founder',
      target_id: m.target_id || '', target_name: m.target_name || '',
      program: m.program || MENTORING_PROGRAMS[0],
      staff: m.staff || '', date: m.date || today(), time: m.time || '',
      duration: m.duration || '1', method: m.method || '방문',
      status: m.status || '예정', cost: m.cost || '0',
      content: m.content || '', outcome: m.outcome || '',
      next_date: m.next_date || '', memo: m.memo || '',
    })
    setModalOpen(true)
  }

  function handleTargetChange(val) {
    if (!val) { setField('target_id', ''); setField('target_name', ''); return }
    const [type, id, name] = val.split('|')
    setForm(p => ({ ...p, target_type: type, target_id: id, target_name: name }))
  }

  async function handleSave() {
    if (!form.expert_id) { alert('전문가를 선택해주세요'); return }
    if (!form.target_id) { alert('대상을 선택해주세요'); return }
    const payload = { ...form }
    try {
      if (editingId) {
        const { error } = await supabase.from('mentorings').update(payload).eq('id', editingId)
        if (error) throw error
        setMentorings(prev => prev.map(m => m.id === editingId ? { ...m, ...payload } : m))
      } else {
        const { data, error } = await supabase.from('mentorings').insert([payload]).select().single()
        if (error) throw error
        setMentorings(prev => [data, ...prev])
      }
      setModalOpen(false)
    } catch (e) { alert('저장 실패: ' + e.message) }
  }

  async function handleDelete(id) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('mentorings').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setMentorings(prev => prev.filter(m => m.id !== id))
  }

  const filtered = mentorings.filter(m => {
    const ex = expertMap[m.expert_id]
    return (
      (!search || m.target_name?.includes(search) || ex?.name?.includes(search)) &&
      (!filterExpert || m.expert_id === filterExpert) &&
      (!filterStatus || m.status === filterStatus) &&
      (!filterField || ex?.field === filterField)
    )
  })

  const doneCount = mentorings.filter(m => m.status === '완료').length
  const schedCount = mentorings.filter(m => m.status === '예정').length
  const totalCost = mentorings.reduce((a, m) => a + (Number(m.cost) || 0), 0)

  // Field stats
  const fieldStats = EXPERT_FIELDS.map(f => ({
    field: f,
    count: mentorings.filter(m => expertMap[m.expert_id]?.field === f).length
  })).filter(x => x.count > 0)

  // Expert stats
  const expertStats = experts
    .map(e => ({ expert: e, count: mentorings.filter(m => m.expert_id === e.id).length }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)

  const currentTargetVal = form.target_id
    ? `${form.target_type}|${form.target_id}|${form.target_name}`
    : ''

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-800">전문가 상담·멘토링</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 상담·멘토링" value={`${mentorings.length}건`} color="blue" />
        <StatCard label="완료" value={`${doneCount}건`} color="green" />
        <StatCard label="예정" value={`${schedCount}건`} color="orange" />
        <StatCard label="총 지원 비용" value={totalCost > 0 ? `${totalCost.toLocaleString()}원` : '전액 무료'} color="teal" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
              placeholder="기업·창업자 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterExpert} onChange={e => setFilterExpert(e.target.value)}>
            <option value="">전체 전문가</option>
            {experts.map(e => <option key={e.id} value={e.id}>{e.name} ({e.field})</option>)}
          </select>
          <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">전체 상태</option>
            <option>예정</option><option>완료</option><option>취소</option>
          </select>
          <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterField} onChange={e => setFilterField(e.target.value)}>
            <option value="">전체 분야</option>
            {EXPERT_FIELDS.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <button onClick={() => openAdd()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: '#2E75B6' }}>
          <Plus size={15} /> 상담·멘토링 등록
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['대상', '전문가', '분야', '프로그램', '일시', '시간', '방식', '비용', '상태', '성과', '담당', '관리'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={12} className="text-center py-10 text-gray-400 text-sm">등록된 상담·멘토링이 없습니다</td></tr>
            ) : filtered.map(m => {
              const ex = expertMap[m.expert_id]
              return (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-xs text-gray-800">{m.target_name}</div>
                    <div className="text-xs text-gray-400">{m.target_type === 'founder' ? '창업자' : '선정기업'}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Avatar name={ex?.name} />
                      <span className="text-xs">{ex?.name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {ex?.field && <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getExpertFieldBadgeClass(ex.field)}`}>{ex.field}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">{m.program}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{m.date} {m.time}</td>
                  <td className="px-3 py-2.5 text-xs text-center">{m.duration}시간</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{m.method}</td>
                  <td className="px-3 py-2.5 text-xs">
                    <span className={Number(m.cost) > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                      {Number(m.cost) > 0 ? `${Number(m.cost).toLocaleString()}원` : '무료'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={m.status} /></td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[100px] truncate">{m.outcome || '-'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{m.staff}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(m)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(m.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="font-semibold text-gray-700 text-sm mb-3">분야별 상담 현황</div>
          {fieldStats.length === 0 ? <div className="text-center text-gray-400 text-xs py-4">데이터 없음</div> :
            fieldStats.map(({ field, count }) => (
              <div key={field} className="flex items-center gap-2 mb-2">
                <div className="text-xs text-gray-600 min-w-[90px]">{field}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.round(count / mentorings.length * 100)}%` }} />
                </div>
                <div className="text-xs font-bold text-blue-700">{count}</div>
              </div>
            ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="font-semibold text-gray-700 text-sm mb-3">전문가별 상담 건수</div>
          {expertStats.length === 0 ? <div className="text-center text-gray-400 text-xs py-4">데이터 없음</div> :
            expertStats.map(({ expert: e, count }) => (
              <div key={e.id} className="flex items-center gap-2 mb-2.5">
                <Avatar name={e.name} />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-gray-700">{e.name}</span>
                    <span className="text-xs font-bold text-blue-700">{count}건</span>
                  </div>
                  <div className="text-xs text-gray-400">{e.field}</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? '상담·멘토링 수정' : '상담·멘토링 등록'} wide
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={handleSave} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>저장</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 space-y-3">
            <div className="text-xs font-semibold text-blue-800">매칭 정보</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">전문가 *</label>
                <select className="form-input" value={form.expert_id} onChange={e => setField('expert_id', e.target.value)}>
                  <option value="">선택</option>
                  {experts.map(e => <option key={e.id} value={e.id}>{e.name} — {e.field}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">대상 *</label>
                <select className="form-input" value={currentTargetVal} onChange={e => handleTargetChange(e.target.value)}>
                  <option value="">선택</option>
                  <optgroup label="── 창업자 ──">
                    {founders.map(f => <option key={f.id} value={`founder|${f.id}|${f.name}`}>창업자 · {f.name} ({f.biz || ''})</option>)}
                  </optgroup>
                  <optgroup label="── 선정기업 ──">
                    {selectedFirms.map(f => <option key={f.id} value={`selected|${f.id}|${f.company_name}`}>선정기업 · {f.company_name}</option>)}
                  </optgroup>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">프로그램 유형</label>
                <select className="form-input" value={form.program} onChange={e => setField('program', e.target.value)}>
                  {MENTORING_PROGRAMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">담당 직원</label>
                <select className="form-input" value={form.staff} onChange={e => setField('staff', e.target.value)}>
                  <option value="">선택</option>
                  {settings.staff.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">날짜 *</label><input type="date" className="form-input" value={form.date} onChange={e => setField('date', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">시작 시간</label><input type="time" className="form-input" value={form.time} onChange={e => setField('time', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">소요 시간(시간)</label><input type="number" step="0.5" className="form-input" value={form.duration} onChange={e => setField('duration', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">방식</label>
              <select className="form-input" value={form.method} onChange={e => setField('method', e.target.value)}>
                {settings.methods.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">상태</label>
              <select className="form-input" value={form.status} onChange={e => setField('status', e.target.value)}>
                <option>예정</option><option>완료</option><option>취소</option>
              </select>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">비용(원, 0=무료)</label><input type="number" className="form-input" value={form.cost} onChange={e => setField('cost', e.target.value)} /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">상담 내용</label><textarea className="form-input" value={form.content} onChange={e => setField('content', e.target.value)} /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">성과·결과</label><textarea className="form-input" value={form.outcome} onChange={e => setField('outcome', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">다음 상담 예정일</label><input type="date" className="form-input" value={form.next_date} onChange={e => setField('next_date', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">메모</label><input className="form-input" value={form.memo} onChange={e => setField('memo', e.target.value)} /></div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
