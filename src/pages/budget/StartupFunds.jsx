import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Download, X, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'

const fmt = n => (Number(n) || 0).toLocaleString('ko-KR')
const num = s => Number((s || '').toString().replace(/,/g, '')) || 0

const MONTH_LABELS = {
  1: '1월', 2: '2월', 3: '3월', 4: '4월', 5: '5월', 6: '6월',
  7: '7월', 8: '8월', 9: '9월', 10: '10월', 11: '11월', 12: '12월',
}
const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const ACHIEVEMENT_TYPES = ['고용', '매출', '지식재산권', '기타']

let _uid = 0
const uid = () => `id_${++_uid}`

const DEFAULT_FORM = {
  project_name: '',
  company_name: '',
  representative: '',
  total_budget: '',
  incentive: '',
  monthly_payments: [],
  business_type: '',
  business_no: '',
  business_start_date: '',
  business_category: '',
  achievements: [],
  note: '',
}

function calcRow(f) {
  const payments = Array.isArray(f.monthly_payments) ? f.monthly_payments : []
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const budget = Number(f.total_budget) || 0
  return {
    total_paid: paid,
    balance: budget - paid,
    exec_rate: budget > 0 ? Math.round(paid / budget * 100) : 0,
  }
}

function TextInput({ label, name, form, setForm, type = 'text', className = '', placeholder = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={form[name] || ''}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-400 focus:outline-none"
      />
    </div>
  )
}

function NumInput({ label, name, form, setForm, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={form[name] === '' ? '' : fmt(form[name])}
        onChange={e => setForm(p => ({ ...p, [name]: num(e.target.value) || '' }))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right focus:ring-1 focus:ring-blue-400 focus:outline-none"
        placeholder="0"
      />
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="col-span-full border-b border-gray-200 pb-1 mb-1">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{children}</span>
    </div>
  )
}

function FundModal({ form, setForm, onClose, onSave, saving, isEdit, budgetProgramNames }) {
  const paid = (form.monthly_payments || []).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const budget = Number(form.total_budget) || 0
  const balance = budget - paid
  const execRate = budget > 0 ? Math.round(paid / budget * 100) : 0

  const [useNew, setUseNew] = useState(
    () => !!form.project_name && !budgetProgramNames.includes(form.project_name)
  )
  const selectValue = useNew ? '__new__' : (form.project_name || '')

  function handleProjectSelect(val) {
    if (val === '__new__') {
      setUseNew(true)
      setForm(p => ({ ...p, project_name: '' }))
    } else {
      setUseNew(false)
      setForm(p => ({ ...p, project_name: val }))
    }
  }

  // 월별 지원금
  function addMonth() {
    const usedMonths = (form.monthly_payments || []).map(p => p.month)
    const next = ALL_MONTHS.find(m => !usedMonths.includes(m)) || 1
    setForm(p => ({
      ...p,
      monthly_payments: [...(p.monthly_payments || []), { _id: uid(), month: next, amount: '' }],
    }))
  }

  function updatePayment(idx, field, value) {
    setForm(p => {
      const updated = [...(p.monthly_payments || [])]
      updated[idx] = { ...updated[idx], [field]: field === 'month' ? Number(value) : value }
      return { ...p, monthly_payments: updated }
    })
  }

  function removePayment(idx) {
    setForm(p => {
      const updated = [...(p.monthly_payments || [])]
      updated.splice(idx, 1)
      return { ...p, monthly_payments: updated }
    })
  }

  // 성과/매출
  function addAchievement() {
    setForm(p => ({
      ...p,
      achievements: [...(p.achievements || []), { _id: uid(), type: '고용', content: '', value: '' }],
    }))
  }

  function updateAchievement(idx, field, value) {
    setForm(p => {
      const updated = [...(p.achievements || [])]
      updated[idx] = { ...updated[idx], [field]: value }
      return { ...p, achievements: updated }
    })
  }

  function removeAchievement(idx) {
    setForm(p => {
      const updated = [...(p.achievements || [])]
      updated.splice(idx, 1)
      return { ...p, achievements: updated }
    })
  }

  const usedMonths = (form.monthly_payments || []).map(p => p.month)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">{isEdit ? '창업자 수정' : '창업자 추가'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[76vh] overflow-y-auto">

          {/* 기본 정보 */}
          <div className="grid grid-cols-3 gap-3">
            <SectionTitle>기본 정보</SectionTitle>

            {/* 사업명 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">사업명 *</label>
              <select
                value={selectValue}
                onChange={e => handleProjectSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-400 focus:outline-none"
              >
                <option value="">사업 선택</option>
                {budgetProgramNames.map(n => <option key={n} value={n}>{n}</option>)}
                <option value="__new__">＋ 새 사업명 직접 입력</option>
              </select>
              {useNew && (
                <input
                  type="text"
                  value={form.project_name || ''}
                  onChange={e => setForm(p => ({ ...p, project_name: e.target.value }))}
                  placeholder="새 사업명 입력"
                  autoFocus
                  className="mt-1.5 w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-400 focus:outline-none"
                />
              )}
            </div>

            <TextInput label="기업명 (창업 시 입력)" name="company_name" form={form} setForm={setForm} placeholder="없으면 빈칸" />
            <TextInput label="대표자" name="representative" form={form} setForm={setForm} />
          </div>

          {/* 사업비 */}
          <div className="grid grid-cols-2 gap-3">
            <SectionTitle>사업비</SectionTitle>
            <NumInput label="총배정액" name="total_budget" form={form} setForm={setForm} />
            <NumInput label="인센티브" name="incentive" form={form} setForm={setForm} />
            <div className="col-span-2 grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg text-xs">
              <div><span className="text-gray-500">총지급액</span><br /><span className="font-semibold">{fmt(paid)}원</span></div>
              <div><span className="text-gray-500">잔액</span><br /><span className={`font-semibold ${balance < 0 ? 'text-red-600' : 'text-green-700'}`}>{fmt(balance)}원</span></div>
              <div><span className="text-gray-500">집행률</span><br /><span className="font-semibold">{execRate}%</span></div>
            </div>
          </div>

          {/* 월별 지원금 */}
          <div>
            <div className="border-b border-gray-200 pb-1 mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">월별 지원금</span>
              <button
                type="button"
                onClick={addMonth}
                disabled={usedMonths.length >= 12}
                className="flex items-center gap-1 text-xs px-2.5 py-1 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-40 transition"
              >
                <Plus size={12} /> 월 추가
              </button>
            </div>
            {(form.monthly_payments || []).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">추가된 월이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {(form.monthly_payments || []).map((p, idx) => (
                  <div key={p._id || idx} className="flex items-center gap-2">
                    <select
                      value={p.month}
                      onChange={e => updatePayment(idx, 'month', e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-2 text-sm w-24"
                    >
                      {ALL_MONTHS.map(m => (
                        <option key={m} value={m} disabled={usedMonths.includes(m) && p.month !== m}>
                          {MONTH_LABELS[m]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={p.amount === '' ? '' : fmt(p.amount)}
                      onChange={e => updatePayment(idx, 'amount', num(e.target.value) || '')}
                      placeholder="금액"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right"
                    />
                    <span className="text-xs text-gray-400">원</span>
                    <button
                      type="button"
                      onClick={() => removePayment(idx)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 사업자정보 */}
          <div className="grid grid-cols-4 gap-3">
            <SectionTitle>사업자정보</SectionTitle>
            <div>
              <label className="block text-xs text-gray-500 mb-1">기준/신규</label>
              <select
                value={form.business_type || ''}
                onChange={e => setForm(p => ({ ...p, business_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-400 focus:outline-none"
              >
                <option value="">선택</option>
                <option value="기준">기준</option>
                <option value="신규">신규</option>
              </select>
            </div>
            <TextInput label="사업자등록번호" name="business_no" form={form} setForm={setForm} />
            <TextInput label="사업개시일" name="business_start_date" form={form} setForm={setForm} type="date" />
            <TextInput label="업태" name="business_category" form={form} setForm={setForm} />
          </div>

          {/* 성과/매출 */}
          <div>
            <div className="border-b border-gray-200 pb-1 mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">성과 / 매출</span>
              <button
                type="button"
                onClick={addAchievement}
                className="flex items-center gap-1 text-xs px-2.5 py-1 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition"
              >
                <Plus size={12} /> 성과 추가
              </button>
            </div>
            {(form.achievements || []).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">추가된 성과가 없습니다</p>
            ) : (
              <div className="space-y-2">
                {(form.achievements || []).map((a, idx) => (
                  <div key={a._id || idx} className="flex items-center gap-2">
                    <select
                      value={a.type}
                      onChange={e => updateAchievement(idx, 'type', e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-2 text-sm w-28"
                    >
                      {ACHIEVEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      type="text"
                      value={a.content || ''}
                      onChange={e => updateAchievement(idx, 'content', e.target.value)}
                      placeholder="내용"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={a.value === '' ? '' : a.value}
                      onChange={e => updateAchievement(idx, 'value', e.target.value)}
                      placeholder="수치"
                      className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right"
                    />
                    <button
                      type="button"
                      onClick={() => removeAchievement(idx)}
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 비고 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">비고</label>
            <textarea
              rows={2}
              value={form.note || ''}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: '#2E75B6' }}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StartupFunds() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')

  const [funds, setFunds] = useState([])
  const [budgetPrograms, setBudgetPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('전체')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: fundsData }, { data: progsData }] = await Promise.all([
      supabase.from('startup_support_funds').select('*').order('created_at', { ascending: true }),
      supabase.from('budget_programs').select('id, name, year').order('year', { ascending: false }),
    ])
    setFunds(fundsData || [])
    setBudgetPrograms(progsData || [])
    setLoading(false)
  }

  function openAdd() {
    setEditTarget(null)
    setForm({
      ...DEFAULT_FORM,
      project_name: filterProject !== '전체' ? filterProject : '',
      monthly_payments: [],
      achievements: [],
    })
    setShowModal(true)
  }

  function openEdit(f) {
    setEditTarget(f)
    setForm({
      ...DEFAULT_FORM,
      project_name: f.project_name || '',
      company_name: f.company_name || '',
      representative: f.representative || '',
      total_budget: f.total_budget || '',
      incentive: f.incentive || '',
      monthly_payments: (Array.isArray(f.monthly_payments) ? f.monthly_payments : [])
        .map(p => ({ ...p, _id: uid() })),
      business_type: f.business_type || '',
      business_no: f.business_no || '',
      business_start_date: f.business_start_date || '',
      business_category: f.business_category || '',
      achievements: (Array.isArray(f.achievements) ? f.achievements : [])
        .map(a => ({ ...a, _id: uid() })),
      note: f.note || '',
    })
    setShowModal(true)
  }

  async function save() {
    if (!form.project_name?.trim()) { alert('사업명을 입력해주세요'); return }
    setSaving(true)

    const cleanPayments = (form.monthly_payments || [])
      .filter(p => p.month && p.amount !== '')
      .map(({ month, amount }) => ({ month: Number(month), amount: Number(amount) || 0 }))
      .sort((a, b) => a.month - b.month)

    const cleanAchievements = (form.achievements || [])
      .filter(a => a.type)
      .map(({ type, content, value }) => ({ type, content: content || '', value: Number(value) || 0 }))

    const payload = {
      project_name: form.project_name.trim(),
      company_name: form.company_name?.trim() || null,
      representative: form.representative?.trim() || null,
      total_budget: num(form.total_budget) || null,
      incentive: num(form.incentive) || null,
      monthly_payments: cleanPayments.length > 0 ? cleanPayments : null,
      business_type: form.business_type || null,
      business_no: form.business_no?.trim() || null,
      business_start_date: form.business_start_date || null,
      business_category: form.business_category?.trim() || null,
      achievements: cleanAchievements.length > 0 ? cleanAchievements : null,
      note: form.note?.trim() || null,
    }

    const { error } = editTarget
      ? await supabase.from('startup_support_funds').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editTarget.id)
      : await supabase.from('startup_support_funds').insert(payload)

    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setShowModal(false)
    loadAll()
  }

  async function deleteFund(id) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('startup_support_funds').delete().eq('id', id)
    loadAll()
  }

  function downloadExcel() {
    const rows = filtered.map((f, i) => {
      const { total_paid, balance, exec_rate } = calcRow(f)
      const payments = Array.isArray(f.monthly_payments) ? f.monthly_payments : []
      const payObj = Object.fromEntries(payments.map(p => [MONTH_LABELS[p.month] + '지원금', p.amount || 0]))
      const achTexts = (Array.isArray(f.achievements) ? f.achievements : [])
        .map(a => `${a.type}: ${a.content}(${a.value})`)
        .join(' / ')
      return {
        연번: i + 1,
        사업명: f.project_name,
        기업명: f.company_name,
        대표자: f.representative,
        총배정액: Number(f.total_budget) || 0,
        인센티브: Number(f.incentive) || 0,
        총지급액: total_paid,
        잔액: balance,
        '집행률(%)': exec_rate,
        ...payObj,
        '기준/신규': f.business_type,
        사업자등록번호: f.business_no,
        사업개시일: f.business_start_date,
        업태: f.business_category,
        '성과/매출': achTexts,
        비고: f.note,
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '창업자지원금')
    XLSX.writeFile(wb, `창업자지원금_${filterProject}_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.xlsx`)
  }

  // 사업명 목록: budget_programs 우선, 없으면 funds에서 수집
  const budgetProgramNames = budgetPrograms.length > 0
    ? [...new Set(budgetPrograms.map(p => p.name).filter(Boolean))]
    : [...new Set(funds.map(f => f.project_name).filter(Boolean))]

  const projectNames = ['전체', ...[...new Set(funds.map(f => f.project_name).filter(Boolean))]]
  const filtered = funds.filter(f => filterProject === '전체' || f.project_name === filterProject)

  // 테이블에 표시할 동적 월 목록 (데이터에 있는 월만)
  const allMonths = [...new Set(
    filtered.flatMap(f => (Array.isArray(f.monthly_payments) ? f.monthly_payments : []).map(p => p.month))
  )].sort((a, b) => a - b)

  // 합계
  const sumCol = key => filtered.reduce((s, f) => s + (Number(f[key]) || 0), 0)
  const totalPaidSum = filtered.reduce((s, f) => s + calcRow(f).total_paid, 0)
  const balanceSum = filtered.reduce((s, f) => s + calcRow(f).balance, 0)
  const avgExecRate = filtered.length > 0
    ? Math.round(filtered.reduce((s, f) => s + calcRow(f).exec_rate, 0) / filtered.length)
    : 0
  const monthSum = m => filtered.reduce((s, f) => {
    const p = (Array.isArray(f.monthly_payments) ? f.monthly_payments : []).find(p => p.month === m)
    return s + (Number(p?.amount) || 0)
  }, 0)

  // 스타일 상수
  const thBase = 'text-center px-2 py-2 text-[11px] font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200'
  const groupTh = 'text-center px-2 py-1.5 text-[11px] font-bold text-gray-700 whitespace-nowrap'
  const tdBase = 'text-center px-2 py-2 text-xs text-gray-700 whitespace-nowrap border-b border-gray-100'
  const tdNum = 'text-right px-2 py-2 text-xs text-gray-700 whitespace-nowrap border-b border-gray-100 tabular-nums'
  const tdFoot = 'text-right px-2 py-2 text-xs font-semibold text-gray-800 whitespace-nowrap tabular-nums bg-gray-50'
  const stickyTh = 'sticky z-20 bg-gray-50 border-b border-gray-200 text-center px-2 py-2 text-[11px] font-semibold text-gray-600 whitespace-nowrap'
  const stickyTd = 'sticky z-10 bg-white border-b border-gray-100 text-xs whitespace-nowrap px-2 py-2'
  const stickyFoot = 'sticky z-10 bg-gray-50 text-xs font-semibold text-gray-800 whitespace-nowrap px-2 py-2'

  // 열 수 계산
  const totalCols = 3 + 5 + allMonths.length + 4 + 1 + 1 + (canWrite ? 1 : 0)

  return (
    <div className="p-6 space-y-4">
      {/* 컨트롤 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select
          value={filterProject}
          onChange={e => setFilterProject(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
        >
          {projectNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <div className="flex gap-2">
          <button
            onClick={downloadExcel}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
          >
            <Download size={15} /> 엑셀 다운로드
          </button>
          {canWrite && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg font-medium transition"
              style={{ background: '#2E75B6' }}
            >
              <Plus size={15} /> 창업자 추가
            </button>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="text-sm border-separate border-spacing-0" style={{ minWidth: 'max-content' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className={`${stickyTh} left-0 w-10`} rowSpan={2}>연번</th>
              <th className={stickyTh} style={{ left: 40, minWidth: 140 }} rowSpan={2}>기업명</th>
              <th className={stickyTh} style={{ left: 180, minWidth: 90 }} rowSpan={2}>대표자</th>
              <th className={`${groupTh} bg-green-50`} colSpan={5}>사업비</th>
              {allMonths.length > 0 && (
                <th className={`${groupTh} bg-amber-50`} colSpan={allMonths.length}>월별지원금</th>
              )}
              <th className={`${groupTh} bg-purple-50`} colSpan={4}>사업자정보</th>
              <th className={`${groupTh} bg-teal-50`} rowSpan={2}>성과/매출</th>
              <th className={thBase} rowSpan={2}>비고</th>
              {canWrite && <th className={thBase} rowSpan={2}>관리</th>}
            </tr>
            <tr>
              {['총배정액', '인센티브', '총지급액', '잔액', '집행률'].map(h => (
                <th key={h} className={`${thBase} bg-green-50`}>{h}</th>
              ))}
              {allMonths.map(m => (
                <th key={m} className={`${thBase} bg-amber-50`}>{MONTH_LABELS[m]}</th>
              ))}
              {['기준/신규', '사업자번호', '사업개시일', '업태'].map(h => (
                <th key={h} className={`${thBase} bg-purple-50`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={totalCols} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={totalCols} className="text-center py-10 text-gray-400">등록된 창업자가 없습니다</td></tr>
            ) : filtered.map((f, i) => {
              const { total_paid, balance, exec_rate } = calcRow(f)
              const payments = Array.isArray(f.monthly_payments) ? f.monthly_payments : []
              const achievements = Array.isArray(f.achievements) ? f.achievements : []
              return (
                <tr key={f.id} className="hover:bg-slate-50/60">
                  <td className={`${stickyTd} left-0 w-10 text-center text-gray-400 font-medium`}>{i + 1}</td>
                  <td className={`${stickyTd} font-medium text-gray-800`} style={{ left: 40, minWidth: 140 }}>{f.company_name || '-'}</td>
                  <td className={`${stickyTd} text-gray-600`} style={{ left: 180, minWidth: 90 }}>{f.representative || '-'}</td>
                  {/* 사업비 */}
                  <td className={tdNum}>{fmt(f.total_budget)}</td>
                  <td className={tdNum}>{fmt(f.incentive)}</td>
                  <td className={tdNum}>{fmt(total_paid)}</td>
                  <td className={`${tdNum} ${balance < 0 ? 'text-red-600 font-medium' : ''}`}>{fmt(balance)}</td>
                  <td className={tdBase}>
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${exec_rate >= 80 ? 'bg-green-100 text-green-700' : exec_rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                      {exec_rate}%
                    </span>
                  </td>
                  {/* 동적 월별 지원금 */}
                  {allMonths.map(m => {
                    const p = payments.find(p => p.month === m)
                    return <td key={m} className={tdNum}>{p ? fmt(p.amount) : '-'}</td>
                  })}
                  {/* 사업자정보 */}
                  <td className={tdBase}>{f.business_type || '-'}</td>
                  <td className={tdBase}>{f.business_no || '-'}</td>
                  <td className={tdBase}>{f.business_start_date || '-'}</td>
                  <td className={tdBase}>{f.business_category || '-'}</td>
                  {/* 성과/매출 */}
                  <td className={`${tdBase} max-w-[180px]`}>
                    {achievements.length === 0 ? (
                      <span className="text-gray-300">-</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {achievements.map((a, ai) => (
                          <span key={ai} className="px-1.5 py-0.5 rounded text-[10px] bg-teal-50 text-teal-700 whitespace-nowrap">
                            {a.type} {a.value}{a.content ? ` (${a.content})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  {/* 비고 */}
                  <td className={`${tdBase} max-w-[120px]`}>
                    <span className="block truncate" title={f.note}>{f.note || '-'}</span>
                  </td>
                  {/* 관리 */}
                  {canWrite && (
                    <td className={tdBase}>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(f)} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 transition">수정</button>
                        <button onClick={() => deleteFund(f.id)} className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50 transition">삭제</button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          {/* 합계 행 */}
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td className={`${stickyFoot} left-0 text-center`} colSpan={3}>합계 ({filtered.length}건)</td>
                <td className={tdFoot}>{fmt(sumCol('total_budget'))}</td>
                <td className={tdFoot}>{fmt(sumCol('incentive'))}</td>
                <td className={tdFoot}>{fmt(totalPaidSum)}</td>
                <td className={`${tdFoot} ${balanceSum < 0 ? 'text-red-600' : ''}`}>{fmt(balanceSum)}</td>
                <td className="text-center px-2 py-2 text-xs font-semibold bg-gray-50">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${avgExecRate >= 80 ? 'bg-green-100 text-green-700' : avgExecRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                    평균 {avgExecRate}%
                  </span>
                </td>
                {allMonths.map(m => <td key={m} className={tdFoot}>{fmt(monthSum(m))}</td>)}
                <td className={`${tdFoot} text-center`} colSpan={4} />
                <td className={`${tdFoot} text-center`} />
                <td className={`${tdFoot} text-center`} />
                {canWrite && <td className={`${tdFoot} text-center`} />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showModal && (
        <FundModal
          form={form}
          setForm={setForm}
          onClose={() => setShowModal(false)}
          onSave={save}
          saving={saving}
          isEdit={!!editTarget}
          budgetProgramNames={budgetProgramNames}
        />
      )}
    </div>
  )
}
