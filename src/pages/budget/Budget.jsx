import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import StatCard from '../../components/common/StatCard'
import PageHeader from '../../components/common/PageHeader'
import { Plus, X, Search, ChevronDown, ChevronUp, Wallet, TrendingDown, PiggyBank, BarChart2 } from 'lucide-react'

const CATEGORIES = ['예비창업패키지', '초기창업패키지', '창업도약패키지', '로컬크리에이터', '창업자금융자', 'R&D지원', '기타']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - 2 + i))

function fmtMoney(val) {
  const n = Number(val) || 0
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`
  return n.toLocaleString()
}

function fmtFull(val) {
  return (Number(val) || 0).toLocaleString() + '원'
}

function execRate(total, exec) {
  if (!total || total === 0) return 0
  return Math.min(100, Math.round((exec / total) * 100))
}

function RateBar({ rate }) {
  const color = rate >= 90 ? '#ef4444' : rate >= 70 ? '#f59e0b' : '#2E75B6'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold w-9 text-right" style={{ color }}>{rate}%</span>
    </div>
  )
}

function defaultProgramForm() {
  return { name: '', total_budget: '', year: String(CURRENT_YEAR), category: '기타', manager: '', memo: '' }
}

function defaultExecForm() {
  return { exec_date: new Date().toISOString().slice(0, 10), item_name: '', amount: '', note: '' }
}

export default function Budget() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')

  const [programs, setPrograms] = useState([])
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)

  // 필터
  const [search, setSearch] = useState('')
  const [filterYear, setFilterYear] = useState(String(CURRENT_YEAR))

  // 프로그램 모달
  const [showProgramModal, setShowProgramModal] = useState(false)
  const [editProgram, setEditProgram] = useState(null)
  const [programForm, setProgramForm] = useState(defaultProgramForm())

  // 상세 패널 (프로그램 선택)
  const [selectedProgram, setSelectedProgram] = useState(null)

  // 집행 모달
  const [showExecModal, setShowExecModal] = useState(false)
  const [editExec, setEditExec] = useState(null)
  const [execForm, setExecForm] = useState(defaultExecForm())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const pRes = await supabase.from('budget_programs').select('*').order('created_at', { ascending: false })
    const programList = pRes.data || []
    if (!pRes.error) setPrograms(programList)

    if (programList.length > 0) {
      const ids = programList.map(p => p.id)
      const eRes = await supabase
        .from('budget_executions')
        .select('*')
        .in('program_id', ids)
        .order('exec_date', { ascending: false })
      if (!eRes.error) setExecutions(eRes.data || [])
    } else {
      setExecutions([])
    }
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // ── 프로그램 저장 ──────────────────────────────────────────
  function openAddProgram() {
    setEditProgram(null)
    setProgramForm(defaultProgramForm())
    setShowProgramModal(true)
  }

  function openEditProgram(p, e) {
    e.stopPropagation()
    setEditProgram(p)
    setProgramForm({
      name: p.name || '',
      total_budget: p.total_budget || '',
      year: p.year || String(CURRENT_YEAR),
      category: p.category || '기타',
      manager: p.manager || '',
      memo: p.memo || '',
    })
    setShowProgramModal(true)
  }

  async function saveProgram() {
    if (!programForm.name.trim()) { alert('사업명을 입력해주세요'); return }
    if (!programForm.total_budget) { alert('총 예산을 입력해주세요'); return }
    setSaving(true)
    const payload = {
      name: programForm.name.trim(),
      total_budget: Number(programForm.total_budget),
      year: programForm.year,
      category: programForm.category,
      manager: programForm.manager.trim() || null,
      memo: programForm.memo.trim() || null,
    }
    let error
    if (editProgram) {
      ;({ error } = await supabase.from('budget_programs').update(payload).eq('id', editProgram.id))
    } else {
      ;({ error } = await supabase.from('budget_programs').insert(payload))
    }
    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setShowProgramModal(false)
    showToast(editProgram ? '사업이 수정되었습니다.' : '사업이 등록되었습니다.')
    loadAll()
  }

  async function deleteProgram(p, e) {
    e.stopPropagation()
    await supabase.from('budget_executions').delete().eq('program_id', p.id)
    const { error } = await supabase.from('budget_programs').delete().eq('id', p.id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    if (selectedProgram?.id === p.id) setSelectedProgram(null)
    showToast('삭제되었습니다.')
    loadAll()
  }

  // ── 집행 내역 저장 ─────────────────────────────────────────
  function openAddExec() {
    setEditExec(null)
    setExecForm(defaultExecForm())
    setShowExecModal(true)
  }

  function openEditExec(ex) {
    setEditExec(ex)
    setExecForm({
      exec_date: ex.exec_date || '',
      item_name: ex.item_name || '',
      amount: ex.amount || '',
      note: ex.note || '',
    })
    setShowExecModal(true)
  }

  async function saveExec() {
    if (!execForm.item_name.trim()) { alert('항목명을 입력해주세요'); return }
    if (!execForm.amount) { alert('금액을 입력해주세요'); return }
    if (!selectedProgram) return
    setSaving(true)
    const payload = {
      program_id: selectedProgram.id,
      exec_date: execForm.exec_date,
      item_name: execForm.item_name.trim(),
      amount: Number(execForm.amount),
      note: execForm.note.trim() || null,
    }
    let error
    if (editExec) {
      ;({ error } = await supabase.from('budget_executions').update(payload).eq('id', editExec.id))
    } else {
      ;({ error } = await supabase.from('budget_executions').insert(payload))
    }
    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setShowExecModal(false)
    showToast(editExec ? '집행 내역이 수정되었습니다.' : '집행 내역이 등록되었습니다.')
    loadAll()
  }

  async function deleteExec(ex) {
    const { error } = await supabase.from('budget_executions').delete().eq('id', ex.id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    showToast('삭제되었습니다.')
    loadAll()
  }

  // ── 계산 ──────────────────────────────────────────────────
  const execByProgram = (pid) => executions.filter(e => e.program_id === pid)

  const filteredPrograms = programs.filter(p => {
    const matchYear = !filterYear || p.year === filterYear
    const matchSearch = !search || p.name?.includes(search) || p.category?.includes(search) || p.manager?.includes(search)
    return matchYear && matchSearch
  })

  const totalBudget = filteredPrograms.reduce((s, p) => s + (Number(p.total_budget) || 0), 0)
  const totalExec = filteredPrograms.reduce((s, p) => {
    return s + execByProgram(p.id).reduce((es, e) => es + (Number(e.amount) || 0), 0)
  }, 0)
  const totalRemain = totalBudget - totalExec
  const totalRate = execRate(totalBudget, totalExec)

  const selectedExecs = selectedProgram ? execByProgram(selectedProgram.id) : []
  const selectedExecTotal = selectedExecs.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const selectedRemain = (Number(selectedProgram?.total_budget) || 0) - selectedExecTotal
  const selectedRate = execRate(Number(selectedProgram?.total_budget), selectedExecTotal)

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <PageHeader title="사업비 관리" />

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="총 예산" value={fmtMoney(totalBudget)} sub={fmtFull(totalBudget)} color="blue" icon={Wallet} />
        <StatCard label="총 집행액" value={fmtMoney(totalExec)} sub={fmtFull(totalExec)} color="orange" icon={TrendingDown} />
        <StatCard label="잔액" value={fmtMoney(totalRemain)} sub={fmtFull(totalRemain)} color="green" icon={PiggyBank} />
        <StatCard label="집행률" value={`${totalRate}%`} sub={`${filteredPrograms.length}개 사업`} color="teal" icon={BarChart2} />
      </div>

      {/* 필터 + 등록 버튼 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <select
            className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
          >
            <option value="">전체 연도</option>
            {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-52"
              placeholder="사업명·카테고리·담당자 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        {canWrite && (
          <button
            onClick={openAddProgram}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90"
            style={{ background: '#2E75B6' }}
          >
            <Plus size={15} /> 사업 등록
          </button>
        )}
      </div>

      {/* 사업 목록 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['사업명', '연도', '카테고리', '총 예산', '집행액', '잔액', '집행률', '담당자', '관리'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">로딩 중...</td></tr>
            ) : filteredPrograms.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">등록된 사업이 없습니다</td></tr>
            ) : filteredPrograms.map(p => {
              const execs = execByProgram(p.id)
              const execTotal = execs.reduce((s, e) => s + (Number(e.amount) || 0), 0)
              const remain = (Number(p.total_budget) || 0) - execTotal
              const rate = execRate(Number(p.total_budget), execTotal)
              const isSelected = selectedProgram?.id === p.id
              return (
                <tr
                  key={p.id}
                  onClick={() => setSelectedProgram(isSelected ? null : p)}
                  className={`border-b border-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {isSelected ? <ChevronUp size={13} className="text-blue-500" /> : <ChevronDown size={13} className="text-gray-400" />}
                      <span className={`font-medium text-xs ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{p.year}년</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">{p.category}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{fmtMoney(p.total_budget)}</td>
                  <td className="px-4 py-2.5 text-xs text-orange-600 font-medium">{fmtMoney(execTotal)}</td>
                  <td className="px-4 py-2.5 text-xs font-medium" style={{ color: remain < 0 ? '#ef4444' : '#059669' }}>
                    {remain < 0 ? '-' : ''}{fmtMoney(Math.abs(remain))}
                  </td>
                  <td className="px-4 py-2.5 w-32"><RateBar rate={rate} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{p.manager || '-'}</td>
                  <td className="px-4 py-2.5">
                    {canWrite && (
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => openEditProgram(p, e)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                        >수정</button>
                        <button
                          onClick={(e) => deleteProgram(p, e)}
                          className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50"
                        >삭제</button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 집행 내역 상세 패널 */}
      {selectedProgram && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm">
          {/* 패널 헤더 */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-blue-100 bg-blue-50/60 rounded-t-xl">
            <div>
              <h3 className="text-sm font-bold text-blue-800">{selectedProgram.name} — 집행 내역</h3>
              <p className="text-xs text-blue-600 mt-0.5">
                예산 {fmtFull(selectedProgram.total_budget)} &nbsp;·&nbsp;
                집행 {fmtFull(selectedExecTotal)} &nbsp;·&nbsp;
                잔액 <span style={{ color: selectedRemain < 0 ? '#ef4444' : '#059669' }}>{fmtFull(selectedRemain)}</span> &nbsp;·&nbsp;
                집행률 {selectedRate}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canWrite && (
                <button
                  onClick={openAddExec}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 text-white rounded-lg font-medium"
                  style={{ background: '#2E75B6' }}
                >
                  <Plus size={13} /> 집행 추가
                </button>
              )}
              <button onClick={() => setSelectedProgram(null)} className="p-1 rounded hover:bg-blue-100">
                <X size={16} className="text-blue-400" />
              </button>
            </div>
          </div>

          {/* 집행 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['집행일', '항목명', '금액', '비고', canWrite ? '관리' : ''].filter(h => h !== '').map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedExecs.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 5 : 4} className="text-center py-8 text-gray-400 text-xs">
                      집행 내역이 없습니다.{canWrite && ' 위 버튼으로 추가해주세요.'}
                    </td>
                  </tr>
                ) : [...selectedExecs]
                    .sort((a, b) => (b.exec_date || '').localeCompare(a.exec_date || ''))
                    .map(ex => (
                  <tr key={ex.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500">{ex.exec_date}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{ex.item_name}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-orange-600">{fmtFull(ex.amount)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{ex.note || '-'}</td>
                    {canWrite && (
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEditExec(ex)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                          >수정</button>
                          <button
                            onClick={() => deleteExec(ex)}
                            className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50"
                          >삭제</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              {selectedExecs.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-4 py-2.5 text-xs font-bold text-gray-600" colSpan={2}>합계</td>
                    <td className="px-4 py-2.5 text-xs font-bold text-orange-700">{fmtFull(selectedExecTotal)}</td>
                    <td colSpan={canWrite ? 2 : 1} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── 사업 등록/수정 모달 ── */}
      {showProgramModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">{editProgram ? '사업 수정' : '사업 등록'}</h2>
              <button onClick={() => setShowProgramModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <Field label="사업명 *">
                <input
                  className="input-base"
                  placeholder="예: 예비창업패키지 2025"
                  value={programForm.name}
                  onChange={e => setProgramForm(f => ({ ...f, name: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="연도">
                  <select className="input-base" value={programForm.year} onChange={e => setProgramForm(f => ({ ...f, year: e.target.value }))}>
                    {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                </Field>
                <Field label="카테고리">
                  <select className="input-base" value={programForm.category} onChange={e => setProgramForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="총 예산 (원) *">
                <input
                  type="number"
                  className="input-base"
                  placeholder="예: 50000000"
                  value={programForm.total_budget}
                  onChange={e => setProgramForm(f => ({ ...f, total_budget: e.target.value }))}
                />
                {programForm.total_budget && (
                  <p className="text-xs text-blue-600 mt-1">{fmtFull(programForm.total_budget)}</p>
                )}
              </Field>
              <Field label="담당자">
                <input
                  className="input-base"
                  placeholder="담당자명"
                  value={programForm.manager}
                  onChange={e => setProgramForm(f => ({ ...f, manager: e.target.value }))}
                />
              </Field>
              <Field label="메모">
                <textarea
                  className="input-base h-16 resize-none"
                  placeholder="비고 또는 메모"
                  value={programForm.memo}
                  onChange={e => setProgramForm(f => ({ ...f, memo: e.target.value }))}
                />
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowProgramModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button
                onClick={saveProgram}
                disabled={saving}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-40"
                style={{ background: '#2E75B6' }}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 집행 추가/수정 모달 ── */}
      {showExecModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-800">{editExec ? '집행 내역 수정' : '집행 내역 추가'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedProgram?.name}</p>
              </div>
              <button onClick={() => setShowExecModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <Field label="집행일">
                <input
                  type="date"
                  className="input-base"
                  value={execForm.exec_date}
                  onChange={e => setExecForm(f => ({ ...f, exec_date: e.target.value }))}
                />
              </Field>
              <Field label="항목명 *">
                <input
                  className="input-base"
                  placeholder="예: 강사비, 장소 임차료"
                  value={execForm.item_name}
                  onChange={e => setExecForm(f => ({ ...f, item_name: e.target.value }))}
                />
              </Field>
              <Field label="금액 (원) *">
                <input
                  type="number"
                  className="input-base"
                  placeholder="예: 500000"
                  value={execForm.amount}
                  onChange={e => setExecForm(f => ({ ...f, amount: e.target.value }))}
                />
                {execForm.amount && (
                  <p className="text-xs text-orange-600 mt-1">{fmtFull(execForm.amount)}</p>
                )}
              </Field>
              <Field label="비고">
                <input
                  className="input-base"
                  placeholder="계산서 번호, 메모 등"
                  value={execForm.note}
                  onChange={e => setExecForm(f => ({ ...f, note: e.target.value }))}
                />
              </Field>
              {selectedProgram && (
                <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                  현재 잔액: <span className="font-bold">{fmtFull(selectedRemain)}</span>
                  {execForm.amount && (
                    <span className="ml-2">→ 추가 후: <span className="font-bold">{fmtFull(selectedRemain - Number(execForm.amount))}</span></span>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowExecModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button
                onClick={saveExec}
                disabled={saving}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-40"
                style={{ background: '#2E75B6' }}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input-base {
          width: 100%;
          border: 1px solid #D1D5DB;
          border-radius: 0.5rem;
          padding: 0.375rem 0.625rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input-base:focus {
          box-shadow: 0 0 0 1px #3B82F6;
          border-color: #3B82F6;
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
