import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

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

// 항목 추가/수정 모달 (수정 시 현재예산 변경 → 추경 이력 자동 저장)
function EntryModal({ mode, entry, entries, programId, onClose, onSaved }) {
  const divisions = [...new Set(entries.map(e => e.division))]
  const [form, setForm] = useState({
    division: entry?.division || '',
    sub_item: entry?.sub_item || '',
    calculation: entry?.calculation || '',
    original_amount: entry ? formatAmount(entry.original_amount) : '',
    budgeted_amount: entry ? formatAmount(entry.budgeted_amount) : '',
    sort_order: entry?.sort_order ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.division || !form.sub_item) return
    setSaving(true)
    const origAmt = parseAmount(form.original_amount)
    const bdgAmt = mode === 'edit' ? parseAmount(form.budgeted_amount || form.original_amount) : origAmt

    if (mode === 'add') {
      const { data: newEntry } = await supabase.from('budget_entries').insert({
        program_id: programId, division: form.division, sub_item: form.sub_item,
        calculation: form.calculation, original_amount: origAmt, budgeted_amount: origAmt,
        sort_order: Number(form.sort_order) || 0,
      }).select().single()
      if (newEntry) {
        await supabase.from('budget_entry_histories').insert({
          budget_entry_id: newEntry.id, revision_type: '당초', revision_number: 0,
          previous_amount: null, new_amount: origAmt, reason: null,
        })
      }
    } else {
      const prevBdg = Number(entry.budgeted_amount) || 0
      const updates = {
        division: form.division, sub_item: form.sub_item, calculation: form.calculation,
        original_amount: origAmt, sort_order: Number(form.sort_order) || 0,
      }
      if (bdgAmt !== prevBdg) {
        const revCount = (Number(entry.revision_count) || 0) + 1
        updates.budgeted_amount = bdgAmt
        updates.revision_count = revCount
        await supabase.from('budget_entry_histories').insert({
          budget_entry_id: entry.id,
          revision_type: `추경${revCount}`,
          revision_number: revCount,
          previous_amount: prevBdg,
          new_amount: bdgAmt,
          reason: null,
          changed_at: new Date().toISOString(),
        })
      }
      await supabase.from('budget_entries').update(updates).eq('id', entry.id)
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
        {mode === 'edit' && (
          <div className={F}>
            <label className={L}>현재예산 <span className="text-blue-500 font-normal">(변경 시 추경 이력 자동 저장)</span></label>
            <AmountInput value={form.budgeted_amount} onChange={v => setForm({ ...form, budgeted_amount: v })} />
          </div>
        )}
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

// 집행 추가 모달 (잔액 초과 방지)
function ExecAddModal({ entries, programId, defaultEntryId, execMap, onClose, onSaved }) {
  const [form, setForm] = useState({
    entry_id: String(defaultEntryId || entries[0]?.id || ''),
    execution_date: new Date().toISOString().slice(0, 10),
    amount: '',
    note: '',
  })
  const [saving, setSaving] = useState(false)

  const selectedEntry = entries.find(e => String(e.id) === form.entry_id)
  const currentExec = selectedEntry ? (execMap[selectedEntry.id] || 0) : 0
  const remaining = selectedEntry ? (Number(selectedEntry.budgeted_amount) || 0) - currentExec : 0
  const inputAmt = parseAmount(form.amount)
  const isOverBudget = inputAmt > 0 && inputAmt > remaining

  async function handleSave() {
    if (!form.amount || !form.entry_id) return
    if (isOverBudget) return
    setSaving(true)
    // 서버에서 한번 더 잔액 체크
    const { data: serverExecs } = await supabase.from('budget_entry_executions')
      .select('amount').eq('entry_id', form.entry_id)
    const serverTotal = (serverExecs || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const entryBdg = Number(selectedEntry?.budgeted_amount || 0)
    if (serverTotal + inputAmt > entryBdg) {
      alert('잔액을 초과합니다')
      setSaving(false)
      return
    }
    const { data, error } = await supabase.from('budget_entry_executions').insert({
      entry_id: form.entry_id,
      program_id: programId,
      execution_date: form.execution_date,
      amount: inputAmt,
      note: form.note,
    })
    console.log('exec insert result:', data, error)
    setSaving(false)
    onClose()
    await onSaved()
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
            <select value={form.entry_id} onChange={e => setForm({ ...form, entry_id: e.target.value, amount: '' })} className={I}>
              {entries.map(e => (
                <option key={e.id} value={String(e.id)}>{e.division} — {e.sub_item} ({e.calculation?.slice(0, 22)}...)</option>
              ))}
            </select>
          </div>
          {selectedEntry && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              잔액: <span className="font-semibold text-gray-700">{formatKorean(remaining)}</span>
              <span className="text-gray-400 ml-2">({formatAmount(remaining)}원)</span>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">금액</label>
            <AmountInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} />
            {isOverBudget && (
              <p className="text-xs text-red-500 mt-1 pl-1">잔액({formatAmount(remaining)}원)을 초과할 수 없습니다</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">적요</label>
            <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className={I} placeholder="집행 내용" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving || isOverBudget}
            className="flex-1 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ background: '#1e3a5f' }}>{saving ? '저장 중...' : '저장'}</button>
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">취소</button>
        </div>
      </div>
    </Overlay>
  )
}

// 사업 등록/수정 모달
function ProgramModal({ program, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: program?.name || '',
    year: program?.year || new Date().getFullYear(),
    manager: program?.manager || '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    if (program) {
      await supabase.from('budget_programs').update({ name: form.name, year: Number(form.year), manager: form.manager }).eq('id', program.id)
    } else {
      await supabase.from('budget_programs').insert({ name: form.name, year: Number(form.year), manager: form.manager })
    }
    setSaving(false)
    onSaved(); onClose()
  }

  const I = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400'
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-base font-bold text-gray-800 mb-4">{program ? '사업 수정' : '사업 등록'}</h2>
        <div className="flex flex-col gap-3">
          <div><label className="text-xs font-medium text-gray-600 block mb-1">사업명</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={I} placeholder="사업명" /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">연도</label>
            <select value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} className={I}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}년</option>)}
            </select></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">담당자</label><input value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })} className={I} placeholder="홍길동" /></div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: '#1e3a5f' }}>{saving ? '저장 중...' : program ? '수정' : '등록'}</button>
          <button onClick={onClose} className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">취소</button>
        </div>
      </div>
    </Overlay>
  )
}

function ExcelUploadModal({ programId, onClose, onSaved }) {
  const [step, setStep] = useState('guide')
  const [rows, setRows] = useState([])
  const [parseErrors, setParseErrors] = useState([])
  const [replaceMode, setReplaceMode] = useState(false)
  const [uploading, setUploading] = useState(false)

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['구분', '세목', '산출내역', '예산액(원)'],
      ['인건비', '인건비', '전담인력 인건비(6명)', 405700000],
      ['일반운영비', '사무관리비', '소모품비 및 인쇄비 7,000×1식', 7000000],
      ['일반운영비', '사무관리비', '임차료 및 관리비 50,000×12월', 600000000],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '사업비')
    XLSX.writeFile(wb, '사업비_업로드_서식.xlsx')
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const wb = XLSX.read(ev.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws)
      const parsed = []
      const errs = []
      data.forEach((row, i) => {
        const division = String(row['구분'] || '').trim()
        const sub_item = String(row['세목'] || '').trim()
        const calculation = String(row['산출내역'] || '').trim()
        const amt = Number(row['예산액(원)'])
        if (!division) { errs.push(`${i + 2}행: 구분 누락`); return }
        if (!sub_item) { errs.push(`${i + 2}행: 세목 누락`); return }
        if (isNaN(amt) || amt <= 0) { errs.push(`${i + 2}행: 예산액 오류`); return }
        parsed.push({ division, sub_item, calculation, original_amount: amt, budgeted_amount: amt })
      })
      setParseErrors(errs)
      setRows(parsed)
      if (errs.length === 0 && parsed.length > 0) setStep('preview')
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  async function handleUpload() {
    setUploading(true)
    if (replaceMode) {
      await supabase.from('budget_entries').delete().eq('program_id', programId)
    }
    let sortBase = 1
    if (!replaceMode) {
      const { data: existing } = await supabase.from('budget_entries')
        .select('sort_order').eq('program_id', programId).order('sort_order', { ascending: false }).limit(1)
      sortBase = (existing?.[0]?.sort_order || 0) + 1
    }
    for (const [i, row] of rows.entries()) {
      const { data: entry } = await supabase.from('budget_entries').insert({
        program_id: programId, division: row.division, sub_item: row.sub_item,
        calculation: row.calculation, original_amount: row.original_amount,
        budgeted_amount: row.budgeted_amount, sort_order: sortBase + i,
      }).select().single()
      if (entry) {
        await supabase.from('budget_entry_histories').insert({
          budget_entry_id: entry.id, revision_type: '당초', revision_number: 0,
          previous_amount: null, new_amount: row.original_amount, reason: null,
        })
      }
    }
    setUploading(false)
    alert(`${rows.length}개 항목이 업로드되었습니다`)
    onSaved(); onClose()
  }

  const GTH = 'text-xs font-semibold text-gray-600 px-3 py-2 text-left bg-gray-50 border-b border-gray-200'
  const GTD = 'text-xs px-3 py-2 border-b border-gray-100'

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 mx-4" style={{ width: '680px', maxWidth: '96vw', maxHeight: '85vh', overflowY: 'auto' }}>
        {step === 'guide' ? (
          <>
            <h2 className="text-base font-bold text-gray-800 mb-1">엑셀 업로드</h2>
            <p className="text-xs text-gray-500 mb-4">아래 서식에 맞게 작성 후 업로드해주세요</p>
            <div className="overflow-x-auto mb-4 border border-gray-200 rounded-lg">
              <table className="w-full border-collapse">
                <thead>
                  <tr>{['구분', '세목', '산출내역', '예산액(원)'].map(h => <th key={h} className={GTH}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {[
                    ['인건비', '인건비', '전담인력 인건비(6명)', '405,700,000'],
                    ['일반운영비', '사무관리비', '소모품비 및 인쇄비 7,000×1식', '7,000,000'],
                  ].map((r, i) => (
                    <tr key={i}>{r.map((c, j) => <td key={j} className={GTD + (j === 3 ? ' text-right' : '')}>{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parseErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                {parseErrors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={downloadTemplate}
                className="flex-1 py-2.5 text-sm font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                📥 서식 다운로드
              </button>
              <label className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg text-center cursor-pointer"
                style={{ background: '#1e3a5f' }}>
                📤 파일 선택하여 업로드
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              </label>
            </div>
            <button onClick={onClose} className="mt-3 w-full py-2 text-sm border border-gray-300 rounded-lg text-gray-600">닫기</button>
          </>
        ) : (
          <>
            <h2 className="text-base font-bold text-gray-800 mb-1">업로드 미리보기</h2>
            <p className="text-xs text-gray-500 mb-4">{rows.length}개 항목이 확인되었습니다</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden mb-4" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table className="w-full border-collapse">
                <thead className="sticky top-0">
                  <tr>{['구분', '세목', '산출내역', '예산액(원)'].map(h => <th key={h} className={GTH}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className={GTD}>{r.division}</td>
                      <td className={GTD}>{r.sub_item}</td>
                      <td className={GTD}>{r.calculation}</td>
                      <td className={GTD + ' text-right'}>{formatAmount(r.original_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg flex gap-6">
              {[
                { value: false, label: '기존 항목 유지하고 추가' },
                { value: true, label: '기존 항목 삭제 후 교체' },
              ].map(({ value, label }) => (
                <label key={label} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" checked={replaceMode === value} onChange={() => setReplaceMode(value)} />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleUpload} disabled={uploading}
                className="flex-1 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                style={{ background: '#1e3a5f' }}>{uploading ? '업로드 중...' : '업로드 확정'}</button>
              <button onClick={() => { setStep('guide'); setParseErrors([]) }}
                className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">다시 선택</button>
            </div>
          </>
        )}
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
  const [execModal, setExecModal] = useState(null)
  const [progModal, setProgModal] = useState(false)
  const [progEditModal, setProgEditModal] = useState(null)
  const [excelModal, setExcelModal] = useState(false)

  useEffect(() => { loadPrograms() }, [])
  useEffect(() => {
    if (selectedProgramId) {
      setSelectedEntryId(null)
      fetchEntries(selectedProgramId)
      fetchExecutions(selectedProgramId)
    }
  }, [selectedProgramId])

  async function fetchEntries(pid) {
    setLoadingDetail(true)
    const { data } = await supabase.from('budget_entries').select('*').eq('program_id', pid).order('sort_order')
    setEntries(data || [])
    setLoadingDetail(false)
  }

  async function fetchExecutions(programId) {
    const { data, error } = await supabase
      .from('budget_entry_executions')
      .select('*')
      .eq('program_id', programId)
      .order('execution_date', { ascending: false })
    if (!error) setExecutions(data || [])
  }

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
    if ((progs || []).length > 0 && !selectedProgramId) setSelectedProgramId(String(progs[0].id))
    setLoading(false)
  }

  async function deleteEntry(id) {
    if (!window.confirm('이 항목을 삭제하시겠습니까?')) return
    await supabase.from('budget_entries').delete().eq('id', id)
    await fetchEntries(selectedProgramId)
    await fetchExecutions(selectedProgramId)
    await loadPrograms()
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
    await fetchEntries(selectedProgramId)
    await fetchExecutions(selectedProgramId)
    await loadPrograms()
  }


  // Derived
  const execMap = {}
  executions.forEach(e => {
    if (e.entry_id) {
      execMap[e.entry_id] = (execMap[e.entry_id] || 0) + (Number(e.amount) || 0)
    }
  })

  const totalBudget = entries.reduce((s, e) => s + (Number(e.budgeted_amount) || 0), 0)
  const totalExecAmt = executions.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const totalRemain = totalBudget - totalExecAmt
  const totalRate = totalBudget > 0 ? totalExecAmt / totalBudget * 100 : 0

  const selectedProgram = programs.find(p => String(p.id) === selectedProgramId)
  const selectedEntry = entries.find(e => e.id === selectedEntryId)
  const selectedEntryExecs = executions.filter(ex => ex.entry_id === selectedEntry?.id)

  // 구분별 그룹 (순서 유지)
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
          <td style={SSR}>{dRate.toFixed(2)}%</td>
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
                <span style={{ fontSize: '11px', color: rateColor(rate), fontWeight: '600', minWidth: '36px', textAlign: 'right' }}>{rate.toFixed(2)}%</span>
              </div>
            </td>
            {!isViewer && (
              <td style={{ ...CS, textAlign: 'center', minWidth: '110px' }}>
                <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {[
                    { label: '수정', bg: '#e0e7ff', color: '#3730a3', fn: e => { e.stopPropagation(); setEntryModal({ mode: 'edit', entry }) } },
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
        <td style={TSR}>{totRate.toFixed(2)}%</td>
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
                  <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '2px' }}>
                    <button
                      onClick={e => { e.stopPropagation(); setProgEditModal(prog) }}
                      title="사업 수정"
                      style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#2563eb'}
                      onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
                      ✏
                    </button>
                    <button
                      onClick={e => deleteProgram(prog.id, e)}
                      title="사업 삭제"
                      style={{ width: '22px', height: '22px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}>
                      🗑
                    </button>
                  </div>
                )}
                <div style={{ fontWeight: '600', fontSize: '13px', color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: isViewer ? '0' : '50px' }}>{prog.name}</div>
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
              { label: '집행률', value: totalRate.toFixed(2) + '%', sub: `${entries.length}개 항목`, color: rateColor(totalRate) },
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
            {/* 왼쪽: 예산 현황 테이블 */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">{selectedProgram?.name} 예산 현황</h2>
                  {!isViewer && (
                    <div className="flex gap-2">
                      <button onClick={() => setExcelModal(true)}
                        className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                        📥 엑셀 업로드
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
                  <div className="p-8 text-center text-gray-400 text-sm">항목이 없습니다. 항목을 추가하거나 엑셀로 업로드하세요.</div>
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

            {/* 오른쪽: 집행 내역 패널 */}
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
                    항목을 클릭하면 집행 내역을 볼 수 있습니다
                  </div>
                ) : selectedEntryExecs.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">집행 내역이 없습니다</div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    {selectedEntryExecs.map(e => (
                      <div key={e.id} className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-800 truncate">{e.note || '(적요 없음)'}</div>
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

      {excelModal && (
        <ExcelUploadModal programId={selectedProgramId}
          onClose={() => setExcelModal(false)}
          onSaved={async () => { await fetchEntries(selectedProgramId); await fetchExecutions(selectedProgramId); await loadPrograms() }} />
      )}

      {entryModal && (
        <EntryModal mode={entryModal.mode} entry={entryModal.entry} entries={entries}
          programId={selectedProgramId}
          onClose={() => setEntryModal(null)}
          onSaved={async () => { await fetchEntries(selectedProgramId); await fetchExecutions(selectedProgramId); await loadPrograms() }} />
      )}
      {execModal && (
        <ExecAddModal entries={entries} programId={selectedProgramId}
          defaultEntryId={execModal.entryId}
          execMap={execMap}
          onClose={() => setExecModal(null)}
          onSaved={async () => { await fetchEntries(selectedProgramId); await fetchExecutions(selectedProgramId); await loadPrograms() }} />
      )}
      {progModal && (
        <ProgramModal onClose={() => setProgModal(false)} onSaved={loadPrograms} />
      )}
      {progEditModal && (
        <ProgramModal program={progEditModal}
          onClose={() => setProgEditModal(null)}
          onSaved={loadPrograms} />
      )}
    </div>
  )
}
