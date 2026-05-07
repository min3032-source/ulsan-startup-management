import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const DEFAULT_ENTRIES = [
  {division:"인건비",sub_item:"인건비",calculation:"전담인력 인건비(6명)",original_amount:405700000,sort_order:1},
  {division:"일반운영비",sub_item:"사무관리비",calculation:"소모품비 및 인쇄비 7,000×1식",original_amount:7000000,sort_order:2},
  {division:"일반운영비",sub_item:"사무관리비",calculation:"임차료 및 관리비(사무기기 임차 포함) 50,000×12월",original_amount:600000000,sort_order:3},
  {division:"일반운영비",sub_item:"사무관리비",calculation:"지급수수료(무인경비, 회계감사비) 19,000×1식",original_amount:19000000,sort_order:4},
  {division:"일반운영비",sub_item:"사무관리비",calculation:"회의비 300×10회",original_amount:3000000,sort_order:5},
  {division:"일반운영비",sub_item:"사무관리비",calculation:"광고선전비 20,000×1식",original_amount:20000000,sort_order:6},
  {division:"일반운영비",sub_item:"사무관리비",calculation:"교육강사수당 400×50회",original_amount:20000000,sort_order:7},
  {division:"일반운영비",sub_item:"사무관리비",calculation:"멘토 수당 400×50개사×5회",original_amount:100000000,sort_order:8},
  {division:"일반운영비",sub_item:"사무관리비",calculation:"심사참석 수당 200×5명×10회",original_amount:10000000,sort_order:9},
  {division:"일반운영비",sub_item:"공공운영비",calculation:"공공요금 및 제세공과금 7,500×1식",original_amount:7500000,sort_order:10},
  {division:"일반운영비",sub_item:"행사운영비",calculation:"울산스타트업 페스타 10,000×1식",original_amount:10000000,sort_order:11},
  {division:"여비",sub_item:"국내여비",calculation:"국내여비 20×5명×4일×12월",original_amount:4800000,sort_order:12},
  {division:"수선유지교체비",sub_item:"수선유지비",calculation:"수선유지비 80,000×1식",original_amount:80000000,sort_order:13},
  {division:"업무추진비",sub_item:"사업업무추진비",calculation:"업무추진비 4,000×1식",original_amount:4000000,sort_order:14},
  {division:"교육훈련비",sub_item:"교육훈련비",calculation:"교육훈련 및 여비 5,000×1식",original_amount:5000000,sort_order:15},
  {division:"민간사업지원금",sub_item:"민간사업지원금",calculation:"기술제품 실증 및 개발지원 10,000×25개사",original_amount:250000000,sort_order:16},
  {division:"민간사업지원금",sub_item:"민간사업지원금",calculation:"기술보호 및 경영 전문서비스 지원 5,000×10개사",original_amount:50000000,sort_order:17},
  {division:"민간사업지원금",sub_item:"민간사업지원금",calculation:"마케팅 지원 7,500×20개사",original_amount:150000000,sort_order:18},
  {division:"민간사업지원금",sub_item:"민간사업지원금",calculation:"창업자 역량강화 교육비 지원 2,000×40개사",original_amount:80000000,sort_order:19},
  {division:"민간사업지원금",sub_item:"민간사업지원금",calculation:"AI 솔루션 융합 지원 20,000×5개사",original_amount:100000000,sort_order:20},
  {division:"위탁운영비",sub_item:"위탁운영비",calculation:"위탁운영비(총사업비의 10%)",original_amount:214000000,sort_order:21},
]

const formatAmount = n => (Number(n) || 0).toLocaleString('ko-KR')
const parseAmount = s => parseInt((s || '').replace(/,/g, '') || '0') || 0

function formatKorean(num) {
  const n = Number(num) || 0
  if (n === 0) return '0원'
  const eok = Math.floor(n / 100000000)
  const man = Math.floor((n % 100000000) / 10000)
  let r = ''
  if (eok > 0) r += `${eok.toLocaleString('ko-KR')}억 `
  if (man > 0) r += `${man.toLocaleString('ko-KR')}만`
  if (!eok && !man) r += (n % 10000).toLocaleString('ko-KR')
  return r.trim() + '원'
}

function rateColor(rate) {
  if (rate > 100) return '#ef4444'
  if (rate >= 81) return '#22c55e'
  if (rate >= 51) return '#f59e0b'
  return '#3b82f6'
}

function barColor(rate) {
  if (rate > 100) return '#ef4444'
  if (rate > 80) return '#10b981'
  if (rate > 50) return '#f59e0b'
  return '#3b82f6'
}

function AmountInput({ value, onChange, placeholder = '0', autoFocus = false }) {
  return (
    <div>
      <input type="text" value={value} autoFocus={autoFocus} placeholder={placeholder}
        onChange={e => {
          const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '')
          const n = parseInt(raw || '0')
          onChange(n ? formatAmount(n) : '')
        }}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
      {value && parseAmount(value) > 0 && (
        <p className="text-xs text-blue-600 mt-1 pl-1">{formatKorean(parseAmount(value))}</p>
      )}
    </div>
  )
}

function Overlay({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}

function EntryModal({ mode, entry, entries, programId, onClose, onSaved }) {
  const divisions = [...new Set(entries.map(e => e.division))]
  const [form, setForm] = useState({
    division: entry?.division || '',
    sub_item: entry?.sub_item || '',
    calculation: entry?.calculation || '',
    original_amount: entry ? formatAmount(entry.original_amount) : '',
    sort_order: entry?.sort_order ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.division || !form.sub_item) return
    setSaving(true)
    const amt = parseAmount(form.original_amount)
    if (mode === 'add') {
      const { data: newEntry } = await supabase.from('budget_entries').insert({
        program_id: programId, division: form.division, sub_item: form.sub_item,
        calculation: form.calculation, original_amount: amt, budgeted_amount: amt,
        sort_order: Number(form.sort_order) || 0,
      }).select().single()
      if (newEntry) {
        await supabase.from('budget_entry_histories').insert({
          budget_entry_id: newEntry.id, revision_type: '당초', revision_number: 0,
          previous_amount: null, new_amount: amt, reason: null,
        })
      }
    } else {
      await supabase.from('budget_entries').update({
        division: form.division, sub_item: form.sub_item, calculation: form.calculation,
        original_amount: amt, sort_order: Number(form.sort_order) || 0,
      }).eq('id', entry.id)
    }
    setSaving(false)
    onSaved(); onClose()
  }

  const F = 'flex flex-col gap-1 mb-3'
  const L = 'text-xs font-medium text-gray-600'
  const I = 'border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400'

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-base font-bold text-gray-800 mb-4">{mode === 'add' ? '항목 추가' : '항목 수정'}</h2>
        <div className={F}>
          <label className={L}>구분</label>
          <input list="div-list" value={form.division} onChange={e => setForm({ ...form, division: e.target.value })} className={I} placeholder="예) 인건비" />
          <datalist id="div-list">{divisions.map(d => <option key={d} value={d} />)}</datalist>
        </div>
        <div className={F}>
          <label className={L}>세목</label>
          <input value={form.sub_item} onChange={e => setForm({ ...form, sub_item: e.target.value })} className={I} placeholder="예) 인건비" />
        </div>
        <div className={F}>
          <label className={L}>산출내역</label>
          <input value={form.calculation} onChange={e => setForm({ ...form, calculation: e.target.value })} className={I} placeholder="예) 전담인력 인건비(6명) = 405,700" />
        </div>
        <div className={F}>
          <label className={L}>당초예산</label>
          <AmountInput value={form.original_amount} onChange={v => setForm({ ...form, original_amount: v })} />
        </div>
        <div className={F}>
          <label className={L}>정렬순서</label>
          <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} className={I} placeholder="0" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ background: '#1e3a5f' }}>{saving ? '저장 중...' : '저장'}</button>
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">취소</button>
        </div>
      </div>
    </Overlay>
  )
}

function RevisionModal({ entry, onClose, onSaved }) {
  const [histories, setHistories] = useState([])
  const [newAmount, setNewAmount] = useState('')
  const [reason, setReason] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editReason, setEditReason] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('budget_entry_histories')
      .select('*').eq('budget_entry_id', entry.id).order('revision_number')
    setHistories(data || [])
  }

  async function handleAdd() {
    const amt = parseAmount(newAmount)
    if (!amt) return
    const maxRev = Math.max(...histories.map(h => h.revision_number || 0), 0)
    await supabase.from('budget_entry_histories').insert({
      budget_entry_id: entry.id, revision_type: '추경',
      revision_number: maxRev + 1,
      previous_amount: Number(entry.budgeted_amount) || 0,
      new_amount: amt, reason,
      changed_at: new Date().toISOString(),
    })
    await supabase.from('budget_entries').update({ budgeted_amount: amt }).eq('id', entry.id)
    entry.budgeted_amount = amt
    setNewAmount(''); setReason('')
    onSaved(); load()
  }

  async function handleDelete(h) {
    await supabase.from('budget_entry_histories').delete().eq('id', h.id)
    const remaining = histories.filter(x => x.id !== h.id)
    const latest = remaining.sort((a, b) => (b.revision_number || 0) - (a.revision_number || 0))[0]
    if (latest) {
      await supabase.from('budget_entries').update({ budgeted_amount: latest.new_amount }).eq('id', entry.id)
      entry.budgeted_amount = latest.new_amount
    }
    onSaved(); load()
  }

  async function handleEditSave(h) {
    await supabase.from('budget_entry_histories').update({ reason: editReason }).eq('id', h.id)
    setEditingId(null); load()
  }

  const TH = 'text-xs font-semibold text-gray-600 px-2 py-2 text-left border-b border-gray-200'
  const TD = 'text-xs px-2 py-2 border-b border-gray-100'

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 mx-4" style={{ width: '660px', maxWidth: '96vw', maxHeight: '85vh', overflowY: 'auto' }}>
        <h2 className="text-base font-bold text-gray-800 mb-1">추경 이력</h2>
        <p className="text-xs text-gray-500 mb-4">{entry.division} / {entry.sub_item} — {entry.calculation?.slice(0, 30)}</p>

        <table className="w-full mb-4">
          <thead>
            <tr className="bg-gray-50">
              {['구분','예산액','증감','변경일','사유','관리'].map(h => <th key={h} className={TH}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {histories.map(h => (
              <tr key={h.id}>
                <td className={TD}><span className={`px-1.5 py-0.5 rounded text-xs ${h.revision_type === '당초' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{h.revision_type}</span></td>
                <td className={TD + ' text-right'}>{formatAmount(h.new_amount)}</td>
                <td className={TD + ' text-right'} style={{ color: h.previous_amount !== null ? (h.new_amount - h.previous_amount >= 0 ? '#16a34a' : '#dc2626') : '#6b7280' }}>
                  {h.previous_amount !== null ? (h.new_amount - h.previous_amount >= 0 ? '+' : '') + formatAmount(h.new_amount - h.previous_amount) : '-'}
                </td>
                <td className={TD}>{h.changed_at ? h.changed_at.slice(0, 10) : '-'}</td>
                <td className={TD}>
                  {editingId === h.id
                    ? <input value={editReason} onChange={e => setEditReason(e.target.value)} className="border border-gray-300 rounded px-2 py-0.5 text-xs w-full outline-none" />
                    : (h.reason || '-')}
                </td>
                <td className={TD}>
                  <div className="flex gap-1">
                    {editingId === h.id
                      ? <>
                        <button onClick={() => handleEditSave(h)} className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">저장</button>
                        <button onClick={() => setEditingId(null)} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">취소</button>
                      </>
                      : <>
                        <button onClick={() => { setEditingId(h.id); setEditReason(h.reason || '') }} className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded">수정</button>
                        <button onClick={() => handleDelete(h)} className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded">삭제</button>
                      </>
                    }
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-gray-700 mb-2">새 추경 입력</p>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <AmountInput value={newAmount} onChange={setNewAmount} placeholder="변경 후 예산액" />
            </div>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="사유"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <button onClick={handleAdd} className="px-4 py-2 text-sm font-semibold text-white rounded-lg whitespace-nowrap" style={{ background: '#1e3a5f' }}>추경 저장</button>
          </div>
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 text-sm border border-gray-300 rounded-lg text-gray-600">닫기</button>
      </div>
    </Overlay>
  )
}

function ExecAddModal({ entries, programId, defaultEntryId, onClose, onSaved }) {
  const [form, setForm] = useState({
    budget_entry_id: defaultEntryId || (entries[0]?.id || ''),
    execution_date: new Date().toISOString().slice(0, 10),
    amount: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.amount || !form.budget_entry_id) return
    setSaving(true)
    await supabase.from('budget_entry_executions').insert({
      budget_entry_id: form.budget_entry_id,
      program_id: programId,
      execution_date: form.execution_date,
      amount: parseAmount(form.amount),
      description: form.description,
    })
    setSaving(false)
    onSaved(); onClose()
  }

  const I = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400'

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-base font-bold text-gray-800 mb-4">집행 추가</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">집행일</label>
            <input type="date" value={form.execution_date} onChange={e => setForm({ ...form, execution_date: e.target.value })} className={I} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">항목 선택</label>
            <select value={form.budget_entry_id} onChange={e => setForm({ ...form, budget_entry_id: e.target.value })} className={I}>
              {entries.map(e => (
                <option key={e.id} value={e.id}>{e.division} — {e.sub_item} ({e.calculation?.slice(0, 22)}...)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">금액</label>
            <AmountInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">적요</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={I} placeholder="집행 내용" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ background: '#1e3a5f' }}>{saving ? '저장 중...' : '저장'}</button>
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">취소</button>
        </div>
      </div>
    </Overlay>
  )
}

function ProgramModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear(), manager: '' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    await supabase.from('budget_programs').insert({ name: form.name, year: Number(form.year), manager: form.manager })
    setSaving(false)
    onSaved(); onClose()
  }

  const I = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400'
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-base font-bold text-gray-800 mb-4">사업 등록</h2>
        <div className="flex flex-col gap-3">
          <div><label className="text-xs font-medium text-gray-600 block mb-1">사업명</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={I} placeholder="사업명" /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">연도</label>
            <select value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className={I}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}년</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">담당자</label><input value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })} className={I} placeholder="홍길동" /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: '#1e3a5f' }}>{saving ? '저장 중...' : '등록'}</button>
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">취소</button>
        </div>
      </div>
    </Overlay>
  )
}

export default function Budget() {
  const { hasRole } = useAuth()
  const isViewer = !hasRole('manager')

  const [programs, setPrograms] = useState([])
  const [programSummary, setProgramSummary] = useState({})
  const [selectedProgramId, setSelectedProgramId] = useState(null)
  const [entries, setEntries] = useState([])
  const [executions, setExecutions] = useState([])
  const [selectedEntryId, setSelectedEntryId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [entryModal, setEntryModal] = useState(null)
  const [revModal, setRevModal] = useState(null)
  const [execModal, setExecModal] = useState(null)
  const [progModal, setProgModal] = useState(false)
  const [stdConfirm, setStdConfirm] = useState(false)
  const [stdLoading, setStdLoading] = useState(false)

  useEffect(() => { loadPrograms() }, [])
  useEffect(() => { if (selectedProgramId) loadDetail(selectedProgramId) }, [selectedProgramId])

  async function loadPrograms() {
    setLoading(true)
    const [{ data: progs }, { data: ents }, { data: execs }] = await Promise.all([
      supabase.from('budget_programs').select('*').order('year', { ascending: false }),
      supabase.from('budget_entries').select('id, program_id, budgeted_amount'),
      supabase.from('budget_entry_executions').select('program_id, amount'),
    ])
    const summary = {}
    ;(ents || []).forEach(e => {
      const k = String(e.program_id)
      if (!summary[k]) summary[k] = { budget: 0, exec: 0 }
      summary[k].budget += Number(e.budgeted_amount) || 0
    })
    ;(execs || []).forEach(e => {
      const k = String(e.program_id)
      if (!summary[k]) summary[k] = { budget: 0, exec: 0 }
      summary[k].exec += Number(e.amount) || 0
    })
    setPrograms(progs || [])
    setProgramSummary(summary)
    if ((progs || []).length > 0) setSelectedProgramId(String(progs[0].id))
    setLoading(false)
  }

  async function loadDetail(pid) {
    setLoadingDetail(true)
    const [{ data: ents }, { data: execs }] = await Promise.all([
      supabase.from('budget_entries').select('*').eq('program_id', pid).order('sort_order'),
      supabase.from('budget_entry_executions').select('*').eq('program_id', pid).order('execution_date', { ascending: false }),
    ])
    setEntries(ents || [])
    setExecutions(execs || [])
    setSelectedEntryId(null)
    setLoadingDetail(false)
  }

  async function deleteEntry(id) {
    if (!window.confirm('이 항목을 삭제하시겠습니까?')) return
    await supabase.from('budget_entries').delete().eq('id', id)
    await loadDetail(selectedProgramId)
  }

  async function deleteProgram(pid, e) {
    e.stopPropagation()
    if (!window.confirm('이 사업을 삭제하시겠습니까? 모든 예산 항목과 집행내역이 함께 삭제됩니다.')) return
    await supabase.from('budget_programs').delete().eq('id', pid)
    setSelectedProgramId(null)
    await loadPrograms()
  }

  async function deleteExec(id) {
    await supabase.from('budget_entry_executions').delete().eq('id', id)
    await loadDetail(selectedProgramId)
  }

  async function loadStandardItems() {
    setStdLoading(true)
    for (const item of DEFAULT_ENTRIES) {
      const { data: entry } = await supabase.from('budget_entries').insert({
        program_id: selectedProgramId,
        division: item.division, sub_item: item.sub_item,
        calculation: item.calculation, original_amount: item.original_amount,
        budgeted_amount: item.original_amount, sort_order: item.sort_order,
      }).select().single()
      if (entry) {
        await supabase.from('budget_entry_histories').insert({
          budget_entry_id: entry.id, revision_type: '당초', revision_number: 0,
          previous_amount: null, new_amount: item.original_amount, reason: null,
        })
      }
    }
    setStdLoading(false)
    setStdConfirm(false)
    await loadDetail(selectedProgramId)
    await loadPrograms()
  }

  // Derived
  const execMap = {}
  executions.forEach(e => {
    execMap[e.budget_entry_id] = (execMap[e.budget_entry_id] || 0) + (Number(e.amount) || 0)
  })

  const totalBudget = entries.reduce((s, e) => s + (Number(e.budgeted_amount) || 0), 0)
  const totalOriginal = entries.reduce((s, e) => s + (Number(e.original_amount) || 0), 0)
  const totalExecAmt = Object.values(execMap).reduce((s, v) => s + v, 0)
  const totalRemain = totalBudget - totalExecAmt
  const totalRate = totalBudget > 0 ? totalExecAmt / totalBudget * 100 : 0

  const selectedProgram = programs.find(p => String(p.id) === selectedProgramId)
  const selectedEntryExecs = executions.filter(e => e.budget_entry_id === selectedEntryId)
  const selectedEntry = entries.find(e => e.id === selectedEntryId)

  // Group entries by division (preserving sort order)
  const groups = []
  const divMap = new Map()
  entries.forEach(entry => {
    if (!divMap.has(entry.division)) {
      const g = { division: entry.division, items: [] }
      divMap.set(entry.division, g)
      groups.push(g)
    }
    divMap.get(entry.division).items.push(entry)
  })

  const CS = { padding: '5px 8px', border: '1px solid #e5e7eb', fontSize: '12px', verticalAlign: 'middle' }
  const CSR = { ...CS, textAlign: 'right' }
  const TH = { padding: '7px 8px', border: '1px solid #d1d5db', fontSize: '11px', fontWeight: '600', textAlign: 'center', background: '#f9fafb', color: '#374151', whiteSpace: 'nowrap' }

  function buildRows() {
    const rows = []
    const totOrig = entries.reduce((s, e) => s + (Number(e.original_amount) || 0), 0)
    const totBdg = entries.reduce((s, e) => s + (Number(e.budgeted_amount) || 0), 0)
    const totExec = entries.reduce((s, e) => s + (execMap[e.id] || 0), 0)
    const totRemain = totBdg - totExec
    const totRate = totBdg > 0 ? totExec / totBdg * 100 : 0

    groups.forEach(({ division, items }) => {
      const dOrig = items.reduce((s, e) => s + (Number(e.original_amount) || 0), 0)
      const dBdg = items.reduce((s, e) => s + (Number(e.budgeted_amount) || 0), 0)
      const dExec = items.reduce((s, e) => s + (execMap[e.id] || 0), 0)
      const dRemain = dBdg - dExec
      const dRate = dBdg > 0 ? dExec / dBdg * 100 : 0
      const SS = { ...CS, background: '#1e3a5f', color: 'white', fontWeight: '600' }
      const SSR = { ...SS, textAlign: 'right' }
      rows.push(
        <tr key={`sub-${division}`}>
          <td colSpan={3} style={SS}>{division} 소계</td>
          <td style={SSR}>{formatAmount(dOrig)}</td>
          <td style={SSR}>{formatAmount(dBdg)}</td>
          <td style={SSR}>{formatAmount(dExec)}</td>
          <td style={SSR}>{formatAmount(dRemain)}</td>
          <td style={SSR}>{dRate.toFixed(1)}%</td>
          {!isViewer && <td style={SS} />}
        </tr>
      )
      items.forEach((entry, idx) => {
        const exec = execMap[entry.id] || 0
        const bdg = Number(entry.budgeted_amount) || 0
        const orig = Number(entry.original_amount) || 0
        const remain = bdg - exec
        const rate = bdg > 0 ? exec / bdg * 100 : 0
        const isSel = selectedEntryId === entry.id
        const bg = isSel ? '#eff6ff' : 'white'
        rows.push(
          <tr key={entry.id} onClick={() => setSelectedEntryId(entry.id)}
            style={{ cursor: 'pointer', background: bg }}
            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f9fafb' }}
            onMouseLeave={e => { e.currentTarget.style.background = isSel ? '#eff6ff' : 'white' }}>
            {idx === 0 && (
              <td rowSpan={items.length} style={{ ...CS, background: '#f8fafc', fontWeight: '600', color: '#374151', textAlign: 'center' }}>
                {entry.division}
              </td>
            )}
            <td style={CS}>{entry.sub_item}</td>
            <td style={{ ...CS, color: '#4b5563', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.calculation}</td>
            <td style={CSR}>{formatAmount(orig)}</td>
            <td style={{ ...CSR, fontWeight: '500' }}>{formatAmount(bdg)}</td>
            <td style={CSR}>{formatAmount(exec)}</td>
            <td style={CSR}>{formatAmount(remain)}</td>
            <td style={{ ...CS, minWidth: '90px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ flex: 1, background: '#e5e7eb', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(rate, 100)}%`, background: rateColor(rate), height: '8px' }} />
                </div>
                <span style={{ fontSize: '11px', color: rateColor(rate), fontWeight: '600', minWidth: '30px', textAlign: 'right' }}>{rate.toFixed(0)}%</span>
              </div>
            </td>
            {!isViewer && (
              <td style={{ ...CS, textAlign: 'center', minWidth: '130px' }}>
                <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {[
                    { label: '수정', bg: '#e0e7ff', color: '#3730a3', fn: e => { e.stopPropagation(); setEntryModal({ mode: 'edit', entry }) } },
                    { label: '추경', bg: '#fef3c7', color: '#92400e', fn: e => { e.stopPropagation(); setRevModal(entry) } },
                    { label: '집행', bg: '#dcfce7', color: '#166534', fn: e => { e.stopPropagation(); setExecModal({ entryId: entry.id }) } },
                    { label: '삭제', bg: '#fee2e2', color: '#991b1b', fn: e => { e.stopPropagation(); deleteEntry(entry.id) } },
                  ].map(({ label, bg, color, fn }) => (
                    <button key={label} onClick={fn} style={{ padding: '2px 6px', fontSize: '11px', background: bg, color, border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{label}</button>
                  ))}
                </div>
              </td>
            )}
          </tr>
        )
      })
    })

    const TS = { ...CS, background: '#374151', color: 'white', fontWeight: '600' }
    const TSR = { ...TS, textAlign: 'right' }
    rows.push(
      <tr key="total">
        <td colSpan={3} style={TS}>합 계</td>
        <td style={TSR}>{formatAmount(totOrig)}</td>
        <td style={TSR}>{formatAmount(totBdg)}</td>
        <td style={TSR}>{formatAmount(totExec)}</td>
        <td style={TSR}>{formatAmount(totRemain)}</td>
        <td style={TSR}>{totRate.toFixed(1)}%</td>
        {!isViewer && <td style={TS} />}
      </tr>
    )
    return rows
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 사업 카드 가로 스크롤 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {loading ? (
            <div className="text-sm text-gray-400 py-4">로딩 중...</div>
          ) : programs.map((prog) => {
            const pid = String(prog.id)
            const sm = programSummary[pid] || { budget: 0, exec: 0 }
            const rate = sm.budget > 0 ? sm.exec / sm.budget * 100 : 0
            const isSel = selectedProgramId === pid
            return (
              <div key={prog.id} onClick={() => setSelectedProgramId(pid)}
                style={{ minWidth: '190px', border: isSel ? '2px solid #2563eb' : '2px solid #e5e7eb', background: isSel ? '#eff6ff' : 'white', borderRadius: '12px', padding: '14px', cursor: 'pointer', flexShrink: 0, position: 'relative' }}>
                {!isViewer && (
                  <button onClick={e => deleteProgram(prog.id, e)}
                    title="사업 삭제"
                    style={{ position: 'absolute', top: '8px', right: '8px', width: '22px', height: '22px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
                    🗑
                  </button>
                )}
                <div style={{ fontWeight: '600', fontSize: '13px', color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: isViewer ? '0' : '20px' }}>{prog.name}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>{prog.year}년{prog.manager ? ` · ${prog.manager}` : ''}</div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1d4ed8', marginBottom: '8px' }}>{formatKorean(sm.budget)}</div>
                <div style={{ background: '#e5e7eb', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
                  <div style={{ height: '5px', borderRadius: '999px', background: barColor(rate), width: `${Math.min(rate, 100)}%` }} />
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '3px', textAlign: 'right' }}>{rate.toFixed(1)}%</div>
              </div>
            )
          })}
          {!isViewer && (
            <div onClick={() => setProgModal(true)}
              style={{ minWidth: '140px', border: '2px dashed #d1d5db', borderRadius: '12px', padding: '14px', cursor: 'pointer', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#9ca3af' }}>
              <span style={{ fontSize: '22px' }}>+</span>
              <span style={{ fontSize: '12px' }}>사업 등록</span>
            </div>
          )}
        </div>
      </div>

      {!selectedProgramId ? (
        <div className="flex items-center justify-center h-64 text-gray-400">사업을 선택하세요</div>
      ) : (
        <div className="p-5">
          {/* KPI 카드 */}
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: '총예산', value: formatKorean(totalBudget), sub: formatAmount(totalBudget) + '원', color: '#1e3a5f' },
              { label: '집행액', value: formatKorean(totalExecAmt), sub: formatAmount(totalExecAmt) + '원', color: '#059669' },
              { label: '잔액', value: formatKorean(totalRemain), sub: formatAmount(totalRemain) + '원', color: '#1d4ed8' },
              { label: '집행률', value: totalRate.toFixed(1) + '%', sub: `${entries.length}개 항목`, color: rateColor(totalRate) },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="text-xs text-gray-400 mb-1">{label}</div>
                <div className="text-lg font-bold mb-0.5" style={{ color }}>{value}</div>
                <div className="text-xs text-gray-400">{sub}</div>
              </div>
            ))}
          </div>

          {/* 메인 2컬럼 */}
          <div className="flex gap-4">
            {/* 왼쪽: 예산 현황 테이블 (60%) */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">{selectedProgram?.name} 예산 현황</h2>
                  {!isViewer && (
                    <div className="flex gap-2">
                      <button onClick={() => setStdConfirm(true)}
                        className="px-3 py-1.5 text-xs border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50">
                        표준과목 불러오기
                      </button>
                      <button onClick={() => setEntryModal({ mode: 'add' })}
                        className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                        style={{ background: '#1e3a5f' }}>
                        + 항목 추가
                      </button>
                    </div>
                  )}
                </div>
                {loadingDetail ? (
                  <div className="p-8 text-center text-gray-400 text-sm">로딩 중...</div>
                ) : entries.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">항목이 없습니다. 항목을 추가하거나 표준과목을 불러오세요.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          {['구분', '세목', '산출내역', '당초예산', '현재예산', '집행액', '잔액', '집행률'].map(h => (
                            <th key={h} style={TH}>{h}</th>
                          ))}
                          {!isViewer && <th style={TH}>관리</th>}
                        </tr>
                      </thead>
                      <tbody>{buildRows()}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 오른쪽: 집행 내역 패널 (40%) */}
            <div style={{ width: '340px', flexShrink: 0 }}>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">
                    {selectedEntry ? `${selectedEntry.division} / ${selectedEntry.sub_item}` : '집행 내역'}
                  </h2>
                  {!isViewer && selectedEntryId && (
                    <button onClick={() => setExecModal({ entryId: selectedEntryId })}
                      className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                      style={{ background: '#059669' }}>
                      + 집행 추가
                    </button>
                  )}
                </div>
                {!selectedEntryId ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8 text-center">
                    왼쪽 표에서 항목을 클릭하면 집행 내역이 표시됩니다
                  </div>
                ) : selectedEntryExecs.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">집행 내역 없음</div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    {selectedEntryExecs.map(e => (
                      <div key={e.id} className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate">{e.description || '(적요 없음)'}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{e.execution_date}</div>
                        </div>
                        <div className="text-xs font-semibold text-emerald-600 whitespace-nowrap">{formatKorean(e.amount)}</div>
                        {!isViewer && (
                          <button onClick={() => deleteExec(e.id)} className="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {selectedEntryId && selectedEntryExecs.length > 0 && (
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">집행 합계</span>
                      <span className="font-bold text-gray-800">{formatKorean(selectedEntryExecs.reduce((s, e) => s + (Number(e.amount) || 0), 0))}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 표준과목 확인 모달 */}
      {stdConfirm && (
        <Overlay onClose={() => setStdConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 text-center">
            <div className="text-2xl mb-3">📋</div>
            <h2 className="text-base font-bold text-gray-800 mb-2">표준과목 불러오기</h2>
            <p className="text-sm text-gray-500 mb-6">울산 창업 U-시리즈 기본 과목 21개를 현재 사업에 추가합니다.</p>
            <div className="flex gap-2">
              <button onClick={loadStandardItems} disabled={stdLoading}
                className="flex-1 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                style={{ background: '#1e3a5f' }}>{stdLoading ? '추가 중...' : '확인'}</button>
              <button onClick={() => setStdConfirm(false)} className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">취소</button>
            </div>
          </div>
        </Overlay>
      )}

      {entryModal && (
        <EntryModal mode={entryModal.mode} entry={entryModal.entry} entries={entries}
          programId={selectedProgramId}
          onClose={() => setEntryModal(null)}
          onSaved={async () => { await loadDetail(selectedProgramId); await loadPrograms() }} />
      )}
      {revModal && (
        <RevisionModal entry={revModal}
          onClose={() => setRevModal(null)}
          onSaved={() => loadDetail(selectedProgramId)} />
      )}
      {execModal && (
        <ExecAddModal entries={entries} programId={selectedProgramId}
          defaultEntryId={execModal.entryId}
          onClose={() => setExecModal(null)}
          onSaved={async () => { await loadDetail(selectedProgramId); await loadPrograms() }} />
      )}
      {progModal && (
        <ProgramModal onClose={() => setProgModal(false)} onSaved={loadPrograms} />
      )}
    </div>
  )
}
