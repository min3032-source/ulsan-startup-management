import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { DEFAULT_SETTINGS, SUPPORT_STAGES, supportDuration, today } from '../../lib/constants'
import { VerdictBadge, StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'

const emptyForm = () => ({
  founder_id: '', program: '', sub_program: '', start_date: today(), end_date: '',
  stage: '신청완료', result: '-', amount: '', staff: '', memo: '',
})

const emptyFirmForm = () => ({
  company_name: '', ceo: '', program: '', staff: '',
  start_date: today(), end_date: '', amount: '',
  status: '지원중', memo: '',
})

export default function Support() {
  const { hasRole } = useAuth()
  const canWrite = hasRole("manager")
  const canDelete = hasRole("admin")

  const [supports, setSupports] = useState([])
  const [founders, setFounders] = useState([])
  const [selectedFirms, setSelectedFirms] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('byFounder')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [preFounderId, setPreFounderId] = useState('')
  // 사업별 탭 상태
  const [firmModalOpen, setFirmModalOpen] = useState(false)
  const [firmEditId, setFirmEditId] = useState(null)
  const [firmForm, setFirmForm] = useState(emptyFirmForm())
  const [expandedProgram, setExpandedProgram] = useState(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: s }, { data: f }, { data: st }, { data: sf }, { data: u }] = await Promise.all([
        supabase.from('support_items').select('*').order('start_date', { ascending: false }),
        supabase.from('founders').select('*'),
        supabase.from('team_settings').select('*').limit(1).single(),
        supabase.from('selected_firms').select('*').order('start_date', { ascending: false }),
        supabase.from('profiles').select('id, name').order('name'),
      ])
      setSupports(s || [])
      setFounders(f || [])
      setSelectedFirms(sf || [])
      if (st) setSettings({ ...DEFAULT_SETTINGS, ...st })
      setUsers(u || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const founderMap = Object.fromEntries(founders.map(f => [f.id, f]))

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function openAdd(pfId = '') {
    setEditingId(null)
    const f = emptyForm()
    if (pfId) f.founder_id = pfId
    setPreFounderId(pfId)
    setForm(f)
    setModalOpen(true)
  }

  function openEdit(s) {
    setEditingId(s.id)
    setForm({
      founder_id: s.founder_id || '', program: s.program || '',
      sub_program: s.sub_program || '', start_date: s.start_date || today(),
      end_date: s.end_date || '', stage: s.stage || '신청완료',
      result: s.result || '-', amount: s.amount || '',
      staff: s.staff || '', memo: s.memo || '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.founder_id) { alert('창업자를 선택해주세요'); return }
    if (!form.program) { alert('지원사업을 선택해주세요'); return }
    if (!form.start_date) { alert('시작일을 입력해주세요'); return }
    const payload = { ...form }
    try {
      if (editingId) {
        const { error } = await supabase.from('support_items').update(payload).eq('id', editingId)
        if (error) throw error
        setSupports(prev => prev.map(s => s.id === editingId ? { ...s, ...payload } : s))
      } else {
        const { data, error } = await supabase.from('support_items').insert([payload]).select().single()
        if (error) throw error
        setSupports(prev => [data, ...prev])
      }
      setModalOpen(false)
    } catch (e) { alert('저장 실패: ' + e.message) }
  }

  async function handleDelete(id) {
    if (!confirm('이 지원사업을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('support_items').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setSupports(prev => prev.filter(s => s.id !== id))
  }

  function openFirmAdd(program = '') {
    setFirmEditId(null)
    setFirmForm({ ...emptyFirmForm(), program })
    setFirmModalOpen(true)
  }

  function openFirmEdit(firm) {
    setFirmEditId(firm.id)
    setFirmForm({
      company_name: firm.company_name || '', ceo: firm.ceo || '',
      program: firm.program || '', staff: firm.staff || '',
      start_date: firm.start_date || today(), end_date: firm.end_date || '',
      amount: firm.amount || '', status: firm.status || '지원중', memo: firm.memo || '',
    })
    setFirmModalOpen(true)
  }

  async function handleFirmSave() {
    if (!firmForm.company_name.trim()) { alert('기업명을 입력해주세요'); return }
    if (!firmForm.program) { alert('지원사업을 선택해주세요'); return }
    try {
      if (firmEditId) {
        const { error } = await supabase.from('selected_firms').update(firmForm).eq('id', firmEditId)
        if (error) throw error
        setSelectedFirms(prev => prev.map(f => f.id === firmEditId ? { ...f, ...firmForm } : f))
      } else {
        const { data, error } = await supabase.from('selected_firms').insert([firmForm]).select().single()
        if (error) throw error
        setSelectedFirms(prev => [data, ...prev])
      }
      setFirmModalOpen(false)
    } catch (e) { alert('저장 실패: ' + e.message) }
  }

  async function handleFirmDelete(id) {
    if (!confirm('이 선정기업을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('selected_firms').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setSelectedFirms(prev => prev.filter(f => f.id !== id))
  }

  const byFounder = {}
  supports.forEach(s => {
    if (!byFounder[s.founder_id]) byFounder[s.founder_id] = []
    byFounder[s.founder_id].push(s)
  })

  const totalAmt = supports.filter(s => s.result === '선정').reduce((a, s) => a + (Number(s.amount) || 0), 0)

  const tabs = [
    { key: 'byFounder', label: '창업자별' },
    { key: 'byProgram', label: '사업별' },
    { key: 'all', label: '전체 이력' },
    { key: 'timeline', label: '타임라인' },
  ]

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-800">지원사업 연계</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 연계" value={`${supports.length}건`} color="blue" />
        <StatCard label="선정 완료" value={`${supports.filter(s => s.result === '선정').length}건`} color="green" />
        <StatCard label="진행중" value={`${supports.filter(s => !s.end_date).length}건`} color="orange" />
        <StatCard label="총 지원금액" value={`${totalAmt >= 10000 ? (totalAmt / 10000).toFixed(1) + '억' : totalAmt.toLocaleString() + '만'}`} color="teal" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeTab === t.key ? 'bg-white text-gray-800 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => openAdd()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: '#2E75B6' }}>
          <Plus size={15} /> 지원사업 등록
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">로딩 중...</div>
      ) : activeTab === 'byFounder' ? (
        <ByFounderTab founders={founders} byFounder={byFounder} founderMap={founderMap}
          onAdd={openAdd} onEdit={openEdit} onDelete={handleDelete} />
      ) : activeTab === 'byProgram' ? (
        <ByProgramTab
          programs={settings.programs} selectedFirms={selectedFirms}
          expandedProgram={expandedProgram} setExpandedProgram={setExpandedProgram}
          onAdd={openFirmAdd} onEdit={openFirmEdit} onDelete={handleFirmDelete}
          canWrite={canWrite} canDelete={canDelete}
        />
      ) : activeTab === 'all' ? (
        <AllTab supports={supports} founderMap={founderMap} onEdit={openEdit} onDelete={handleDelete} />
      ) : (
        <TimelineTab founders={founders} byFounder={byFounder} founderMap={founderMap} />
      )}

      {/* 선정기업 Modal */}
      <Modal isOpen={firmModalOpen} onClose={() => setFirmModalOpen(false)} title={firmEditId ? '선정기업 수정' : '선정기업 등록'} wide
        footer={
          <>
            <button onClick={() => setFirmModalOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={handleFirmSave} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>저장</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">기업명 *</label>
              <input className="form-input" value={firmForm.company_name} onChange={e => setFirmForm(p => ({ ...p, company_name: e.target.value }))} placeholder="(주)예시기업" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">대표자</label>
              <input className="form-input" value={firmForm.ceo} onChange={e => setFirmForm(p => ({ ...p, ceo: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">지원사업 *</label>
            <select className="form-input" value={firmForm.program} onChange={e => setFirmForm(p => ({ ...p, program: e.target.value }))}>
              <option value="">선택</option>
              {settings.programs.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">시작일</label>
              <input type="date" className="form-input" value={firmForm.start_date} onChange={e => setFirmForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">종료일</label>
              <input type="date" className="form-input" value={firmForm.end_date} onChange={e => setFirmForm(p => ({ ...p, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">지원 금액 (만원)</label>
              <input type="number" className="form-input" value={firmForm.amount} onChange={e => setFirmForm(p => ({ ...p, amount: e.target.value }))} placeholder="예: 5000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">상태</label>
              <select className="form-input" value={firmForm.status} onChange={e => setFirmForm(p => ({ ...p, status: e.target.value }))}>
                {['지원중', '선정', '미선정', '완료'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">담당자</label>
            <input className="form-input" value={firmForm.staff} onChange={e => setFirmForm(p => ({ ...p, staff: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
            <textarea className="form-input" rows={2} value={firmForm.memo} onChange={e => setFirmForm(p => ({ ...p, memo: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* 지원사업 연계 Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? '지원사업 수정' : '지원사업 등록'} wide
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={handleSave} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>저장</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">창업자 *</label>
              <select className="form-input" value={form.founder_id} onChange={e => setField('founder_id', e.target.value)}>
                <option value="">선택</option>
                {founders.map(f => <option key={f.id} value={f.id}>{f.name} ({f.biz || ''})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">담당자</label>
              <select className="form-input" value={form.staff} onChange={e => setField('staff', e.target.value)}>
                <option value="">선택</option>
                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">지원사업명 *</label>
            <select className="form-input" value={form.program} onChange={e => setField('program', e.target.value)}>
              <option value="">선택</option>
              {settings.programs.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">세부 프로그램</label>
            <input className="form-input" value={form.sub_program} onChange={e => setField('sub_program', e.target.value)} placeholder="예: 비즈니스 모델 혁신 트랙" />
          </div>
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-600">지원 기간</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">시작일 *</label><input type="date" className="form-input" value={form.start_date} onChange={e => setField('start_date', e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">종료일 (진행중이면 비워두세요)</label><input type="date" className="form-input" value={form.end_date} onChange={e => setField('end_date', e.target.value)} /></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">진행 단계</label>
              <select className="form-input" value={form.stage} onChange={e => setField('stage', e.target.value)}>
                {SUPPORT_STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">결과</label>
              <select className="form-input" value={form.result} onChange={e => setField('result', e.target.value)}>
                <option value="-">미정</option><option>선정</option><option>미선정</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">지원 금액 (만원)</label>
            <input type="number" className="form-input" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="예: 1000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
            <textarea className="form-input" value={form.memo} onChange={e => setField('memo', e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ByProgramTab({ programs, selectedFirms, expandedProgram, setExpandedProgram, onAdd, onEdit, onDelete, canWrite, canDelete }) {
  if (!programs || programs.length === 0) return (
    <div className="text-center py-16 text-gray-400">환경설정에서 지원사업을 먼저 등록해주세요</div>
  )
  return (
    <div className="space-y-3">
      {programs.map(prog => {
        const firms = selectedFirms.filter(f => f.program === prog)
        const isOpen = expandedProgram === prog
        const totalAmt = firms.reduce((a, f) => a + (Number(f.amount) || 0), 0)
        return (
          <div key={prog} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedProgram(isOpen ? null : prog)}
            >
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRightIcon size={16} className="text-gray-400" />}
                <span className="font-semibold text-gray-800 text-sm">{prog}</span>
                <span className="text-xs text-gray-400">선정기업 {firms.length}개사</span>
                {totalAmt > 0 && <span className="text-xs font-bold text-green-700">총 {totalAmt.toLocaleString()}만원</span>}
              </div>
              {canWrite && (
                <span
                  className="text-xs px-2.5 py-1 text-white rounded-lg"
                  style={{ background: '#2E75B6' }}
                  onClick={e => { e.stopPropagation(); onAdd(prog) }}
                >
                  + 기업 추가
                </span>
              )}
            </button>
            {isOpen && (
              <div className="border-t border-gray-100">
                {firms.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">등록된 선정기업이 없습니다</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {['기업명', '대표자', '시작일', '종료일', '지원금(만원)', '상태', '담당자', '관리'].map(h => (
                            <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {firms.map(firm => (
                          <tr key={firm.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-xs text-gray-800">{firm.company_name}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{firm.ceo || '-'}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{firm.start_date || '-'}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{firm.end_date || <span className="text-orange-500">진행중</span>}</td>
                            <td className="px-4 py-2.5 text-xs font-bold text-green-700">{firm.amount ? Number(firm.amount).toLocaleString() : '-'}</td>
                            <td className="px-4 py-2.5"><StatusBadge status={firm.status} /></td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{firm.staff || '-'}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1">
                                {canWrite && <button onClick={() => onEdit(firm)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil size={12} /></button>}
                                {canDelete && <button onClick={() => onDelete(firm.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ByFounderTab({ founders, byFounder, founderMap, onAdd, onEdit, onDelete }) {
  const targetFounders = founders.filter(f => byFounder[f.id])
  if (targetFounders.length === 0) return (
    <div className="text-center py-16 text-gray-400">등록된 지원사업이 없습니다</div>
  )
  return (
    <div className="space-y-4">
      {targetFounders.map(f => {
        const fSups = byFounder[f.id].sort((a, b) => a.start_date.localeCompare(b.start_date))
        const total = fSups.reduce((a, s) => a + (Number(s.amount) || 0), 0)
        return (
          <div key={f.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Avatar name={f.name} />
                <span className="font-semibold text-gray-800">{f.name}</span>
                <VerdictBadge verdict={f.verdict} />
                <span className="text-xs text-gray-400">{f.biz}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-green-700">총 {total.toLocaleString()}만원</span>
                <span className="text-xs text-gray-400">{fSups.length}건</span>
                <button onClick={() => onAdd(f.id)} className="text-xs px-2 py-1 text-white rounded" style={{ background: '#2E75B6' }}>+ 추가</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['지원사업명', '세부프로그램', '시작일', '종료일', '기간', '단계', '결과', '금액(만원)', '담당자', '관리'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fSups.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-xs text-gray-800">{s.program}</td>
                      <td className="px-3 py-2 text-xs">{s.sub_program ? <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded text-xs">{s.sub_program}</span> : <span className="text-gray-300">-</span>}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{s.start_date}</td>
                      <td className="px-3 py-2 text-xs">
                        {s.end_date || <span className="text-orange-500 font-medium">진행중</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{supportDuration(s.start_date, s.end_date)}</td>
                      <td className="px-3 py-2"><StatusBadge status={s.stage} /></td>
                      <td className="px-3 py-2">{s.result && s.result !== '-' ? <StatusBadge status={s.result} /> : <span className="text-gray-300 text-xs">-</span>}</td>
                      <td className="px-3 py-2 text-xs font-bold text-green-700">{s.amount ? Number(s.amount).toLocaleString() : '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{s.staff}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => onEdit(s)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil size={12} /></button>
                          <button onClick={() => onDelete(s.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AllTab({ supports, founderMap, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {['창업자', '지원사업명', '시작일', '종료일', '단계', '금액(만원)', '담당자', '관리'].map(h => (
              <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {supports.length === 0 ? (
            <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">데이터 없음</td></tr>
          ) : supports.map(s => {
            const f = founderMap[s.founder_id]
            return (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={f?.name} />
                    <span className="font-medium text-xs">{f?.name || '-'}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-semibold text-xs text-gray-800">{s.program}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{s.start_date}</td>
                <td className="px-4 py-2.5 text-xs">{s.end_date || <span className="text-orange-500">진행중</span>}</td>
                <td className="px-4 py-2.5"><StatusBadge status={s.stage} /></td>
                <td className="px-4 py-2.5 text-xs font-bold text-green-700">{s.amount ? Number(s.amount).toLocaleString() : '-'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{s.staff}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(s)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil size={12} /></button>
                    <button onClick={() => onDelete(s.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TimelineTab({ founders, byFounder, founderMap }) {
  const targetFounders = founders.filter(f => byFounder[f.id])
  const colors = ['#2E75B6', '#1E5631', '#8B6914', '#17627A', '#C55A11', '#C00000']

  if (targetFounders.length === 0) return (
    <div className="text-center py-16 text-gray-400">지원사업 데이터가 없습니다</div>
  )

  return (
    <div className="space-y-4">
      {targetFounders.map(f => {
        const fSups = byFounder[f.id].sort((a, b) => a.start_date.localeCompare(b.start_date))
        return (
          <div key={f.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
              <Avatar name={f.name} />
              <span className="font-semibold text-gray-800">{f.name}</span>
              <VerdictBadge verdict={f.verdict} />
            </div>
            <div className="p-4">
              <div className="relative pl-4">
                <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-200" />
                {fSups.map((s, i) => (
                  <div key={s.id} className="relative mb-4 pl-5">
                    <div
                      className="absolute left-[-6px] top-1 w-3 h-3 rounded-full border-2 border-white"
                      style={{ background: colors[i % colors.length], boxShadow: `0 0 0 2px ${colors[i % colors.length]}` }}
                    />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-bold text-gray-800">{s.program}</span>
                        <span className="text-xs text-gray-400 ml-2">{s.start_date} ~ {s.end_date || '진행중'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={s.stage} />
                        {s.amount && <span className="text-xs font-bold text-green-700">{Number(s.amount).toLocaleString()}만원</span>}
                      </div>
                    </div>
                    {s.memo && <div className="text-xs text-gray-500 mt-1">{s.memo}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
