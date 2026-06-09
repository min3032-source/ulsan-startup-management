import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Download, X } from 'lucide-react'
import * as XLSX from 'xlsx'

const fmt = n => (Number(n) || 0).toLocaleString('ko-KR')
const num = s => Number((s || '').toString().replace(/,/g, '')) || 0

const PAY_MONTHS = [
  { key: 'pay_apr', label: '4월' },
  { key: 'pay_may', label: '5월' },
  { key: 'pay_jun', label: '6월' },
  { key: 'pay_jul', label: '7월' },
  { key: 'pay_aug', label: '8월' },
  { key: 'pay_sep', label: '9월' },
  { key: 'pay_oct', label: '10월' },
  { key: 'pay_nov', label: '11월' },
  { key: 'pay_dec', label: '12월' },
]
const REV_MONTHS = [
  { key: 'rev_may', label: '5월' },
  { key: 'rev_jun', label: '6월' },
  { key: 'rev_jul', label: '7월' },
  { key: 'rev_aug', label: '8월' },
  { key: 'rev_sep', label: '9월' },
  { key: 'rev_oct', label: '10월' },
  { key: 'rev_nov', label: '11월' },
]

const NUM_FIELDS = [
  'total_budget', 'incentive',
  ...PAY_MONTHS.map(m => m.key), 'extra_support',
  'total_revenue', ...REV_MONTHS.map(m => m.key),
  'long_term_employment', 'short_term_employment', 'ip_rights',
]

const DEFAULT_FORM = {
  project_name: '', company_name: '', representative: '',
  employment_doc: '', field: '', mentor: '', grade: '',
  total_budget: '', incentive: '',
  pay_apr: '', pay_may: '', pay_jun: '', pay_jul: '', pay_aug: '',
  pay_sep: '', pay_oct: '', pay_nov: '', pay_dec: '',
  extra_support: '',
  business_type: '', business_no: '', business_start_date: '', business_category: '',
  long_term_employment: '', short_term_employment: '', ip_rights: '',
  total_revenue: '',
  rev_may: '', rev_jun: '', rev_jul: '', rev_aug: '', rev_sep: '', rev_oct: '', rev_nov: '',
  note: '',
}

function calcRow(f) {
  const paid = PAY_MONTHS.reduce((s, m) => s + (Number(f[m.key]) || 0), 0) + (Number(f.extra_support) || 0)
  const budget = Number(f.total_budget) || 0
  return {
    total_paid: paid,
    balance: budget - paid,
    exec_rate: budget > 0 ? Math.round(paid / budget * 100) : 0,
  }
}

// 숫자 입력 필드 공통 컴포넌트
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

function TextInput({ label, name, form, setForm, type = 'text', className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={form[name] || ''}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-400 focus:outline-none"
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

function FundModal({ form, setForm, onClose, onSave, saving, isEdit }) {
  const paid = PAY_MONTHS.reduce((s, m) => s + (Number(form[m.key]) || 0), 0) + (Number(form.extra_support) || 0)
  const budget = Number(form.total_budget) || 0
  const balance = budget - paid
  const execRate = budget > 0 ? Math.round(paid / budget * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">{isEdit ? '창업자 수정' : '창업자 추가'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-6 max-h-[75vh] overflow-y-auto">

          {/* 기본 */}
          <div className="grid grid-cols-3 gap-3">
            <SectionTitle>기본 정보</SectionTitle>
            <TextInput label="사업명 *" name="project_name" form={form} setForm={setForm} />
            <TextInput label="기업명 *" name="company_name" form={form} setForm={setForm} />
            <TextInput label="대표자" name="representative" form={form} setForm={setForm} />
            <TextInput label="고용서류" name="employment_doc" form={form} setForm={setForm} />
            <TextInput label="분야" name="field" form={form} setForm={setForm} />
            <TextInput label="멘토" name="mentor" form={form} setForm={setForm} />
            <TextInput label="등급" name="grade" form={form} setForm={setForm} />
          </div>

          {/* 사업비 */}
          <div className="grid grid-cols-3 gap-3">
            <SectionTitle>사업비</SectionTitle>
            <NumInput label="총배정액" name="total_budget" form={form} setForm={setForm} />
            <NumInput label="인센티브" name="incentive" form={form} setForm={setForm} />
            <div className="col-span-3 grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg text-xs">
              <div><span className="text-gray-500">총지급액</span><br /><span className="font-semibold">{fmt(paid)}원</span></div>
              <div><span className="text-gray-500">잔액</span><br /><span className={`font-semibold ${balance < 0 ? 'text-red-600' : 'text-green-700'}`}>{fmt(balance)}원</span></div>
              <div><span className="text-gray-500">집행률</span><br /><span className="font-semibold">{execRate}%</span></div>
            </div>
          </div>

          {/* 월별지원금 */}
          <div className="grid grid-cols-5 gap-3">
            <SectionTitle>월별지원금</SectionTitle>
            {PAY_MONTHS.map(m => (
              <NumInput key={m.key} label={m.label} name={m.key} form={form} setForm={setForm} />
            ))}
            <NumInput label="추가지원" name="extra_support" form={form} setForm={setForm} />
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

          {/* 성과 */}
          <div className="grid grid-cols-3 gap-3">
            <SectionTitle>성과</SectionTitle>
            <NumInput label="장기고용 (명)" name="long_term_employment" form={form} setForm={setForm} />
            <NumInput label="단기고용 (명)" name="short_term_employment" form={form} setForm={setForm} />
            <NumInput label="지식재산권 (건)" name="ip_rights" form={form} setForm={setForm} />
          </div>

          {/* 매출 */}
          <div className="grid grid-cols-4 gap-3">
            <SectionTitle>매출</SectionTitle>
            <NumInput label="총매출액" name="total_revenue" form={form} setForm={setForm} className="col-span-2" />
            {REV_MONTHS.map(m => (
              <NumInput key={m.key} label={m.label + ' 매출'} name={m.key} form={form} setForm={setForm} />
            ))}
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
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState('전체')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadFunds() }, [])

  async function loadFunds() {
    setLoading(true)
    const { data } = await supabase
      .from('startup_support_funds')
      .select('*')
      .order('created_at', { ascending: true })
    setFunds(data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditTarget(null)
    setForm({ ...DEFAULT_FORM, project_name: filterProject !== '전체' ? filterProject : '' })
    setShowModal(true)
  }

  function openEdit(f) {
    setEditTarget(f)
    const filled = { ...DEFAULT_FORM }
    Object.keys(DEFAULT_FORM).forEach(k => { filled[k] = f[k] ?? '' })
    setForm(filled)
    setShowModal(true)
  }

  async function save() {
    if (!form.project_name.trim()) { alert('사업명을 입력해주세요'); return }
    if (!form.company_name.trim()) { alert('기업명을 입력해주세요'); return }
    setSaving(true)
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [
        k,
        NUM_FIELDS.includes(k) ? (num(v) || null) : (v?.toString().trim() || null),
      ])
    )
    const { error } = editTarget
      ? await supabase.from('startup_support_funds').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editTarget.id)
      : await supabase.from('startup_support_funds').insert(payload)
    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setShowModal(false)
    loadFunds()
  }

  async function deleteFund(id) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('startup_support_funds').delete().eq('id', id)
    loadFunds()
  }

  function downloadExcel() {
    const rows = filtered.map((f, i) => {
      const { total_paid, balance, exec_rate } = calcRow(f)
      return {
        연번: i + 1,
        사업명: f.project_name,
        기업명: f.company_name,
        대표자: f.representative,
        고용서류: f.employment_doc,
        분야: f.field,
        멘토: f.mentor,
        등급: f.grade,
        총배정액: Number(f.total_budget) || 0,
        인센티브: Number(f.incentive) || 0,
        총지급액: total_paid,
        잔액: balance,
        '집행률(%)': exec_rate,
        ...Object.fromEntries(PAY_MONTHS.map(m => [m.label + '지원금', Number(f[m.key]) || 0])),
        추가지원: Number(f.extra_support) || 0,
        '기준/신규': f.business_type,
        사업자등록번호: f.business_no,
        사업개시일: f.business_start_date,
        업태: f.business_category,
        장기고용: Number(f.long_term_employment) || 0,
        단기고용: Number(f.short_term_employment) || 0,
        지식재산권: Number(f.ip_rights) || 0,
        총매출액: Number(f.total_revenue) || 0,
        ...Object.fromEntries(REV_MONTHS.map(m => [m.label + '매출', Number(f[m.key]) || 0])),
        비고: f.note,
      }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '창업자지원금')
    XLSX.writeFile(wb, `창업자지원금_${filterProject}_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.xlsx`)
  }

  const projectNames = ['전체', ...[...new Set(funds.map(f => f.project_name).filter(Boolean))]]
  const filtered = funds.filter(f => filterProject === '전체' || f.project_name === filterProject)

  // 합계
  const sumCol = key => filtered.reduce((s, f) => s + (Number(f[key]) || 0), 0)
  const totalPaidSum = filtered.reduce((s, f) => s + calcRow(f).total_paid, 0)
  const balanceSum = filtered.reduce((s, f) => s + calcRow(f).balance, 0)
  const avgExecRate = filtered.length > 0
    ? Math.round(filtered.reduce((s, f) => s + calcRow(f).exec_rate, 0) / filtered.length)
    : 0

  // 스타일 상수
  const thBase = 'text-center px-2 py-2 text-[11px] font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200'
  const groupTh = 'text-center px-2 py-1.5 text-[11px] font-bold text-gray-700 whitespace-nowrap'
  const tdBase = 'text-center px-2 py-2 text-xs text-gray-700 whitespace-nowrap border-b border-gray-100'
  const tdNum = 'text-right px-2 py-2 text-xs text-gray-700 whitespace-nowrap border-b border-gray-100 tabular-nums'
  const tdFoot = 'text-right px-2 py-2 text-xs font-semibold text-gray-800 whitespace-nowrap tabular-nums bg-gray-50'
  const stickyTh = `sticky z-20 bg-gray-50 border-b border-gray-200 text-center px-2 py-2 text-[11px] font-semibold text-gray-600 whitespace-nowrap`
  const stickyTd = `sticky z-10 bg-white border-b border-gray-100 text-xs whitespace-nowrap px-2 py-2`
  const stickyTdFoot = `sticky z-10 bg-gray-50 text-xs font-semibold text-gray-800 whitespace-nowrap px-2 py-2`

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
            {/* 그룹 헤더 */}
            <tr>
              <th className={`${stickyTh} left-0 w-10`} rowSpan={2}>연번</th>
              <th className={`${stickyTh}`} style={{ left: 40, minWidth: 140 }} rowSpan={2}>기업명</th>
              <th className={`${stickyTh}`} style={{ left: 180, minWidth: 90 }} rowSpan={2}>대표자</th>
              <th className={`${groupTh} bg-blue-50`} colSpan={4}>기본정보</th>
              <th className={`${groupTh} bg-green-50`} colSpan={5}>사업비</th>
              <th className={`${groupTh} bg-amber-50`} colSpan={10}>월별지원금</th>
              <th className={`${groupTh} bg-purple-50`} colSpan={4}>사업자정보</th>
              <th className={`${groupTh} bg-teal-50`} colSpan={3}>성과</th>
              <th className={`${groupTh} bg-rose-50`} colSpan={8}>매출</th>
              <th className={thBase} rowSpan={2}>비고</th>
              {canWrite && <th className={thBase} rowSpan={2}>관리</th>}
            </tr>
            {/* 컬럼 헤더 */}
            <tr>
              {[
                ['bg-blue-50', ['고용서류', '분야', '멘토', '등급']],
                ['bg-green-50', ['총배정액', '인센티브', '총지급액', '잔액', '집행률']],
                ['bg-amber-50', [...PAY_MONTHS.map(m => m.label), '추가지원']],
                ['bg-purple-50', ['기준/신규', '사업자번호', '사업개시일', '업태']],
                ['bg-teal-50', ['장기고용', '단기고용', '지식재산권']],
                ['bg-rose-50', ['총매출액', ...REV_MONTHS.map(m => m.label)]],
              ].flatMap(([bg, labels]) =>
                labels.map(label => (
                  <th key={label} className={`${thBase} ${bg}`}>{label}</th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={99} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={99} className="text-center py-10 text-gray-400">등록된 창업자가 없습니다</td></tr>
            ) : filtered.map((f, i) => {
              const { total_paid, balance, exec_rate } = calcRow(f)
              return (
                <tr key={f.id} className="hover:bg-slate-50/60">
                  {/* 고정 컬럼 */}
                  <td className={`${stickyTd} left-0 w-10 text-center text-gray-400 font-medium`}>{i + 1}</td>
                  <td className={`${stickyTd} font-medium text-gray-800`} style={{ left: 40, minWidth: 140 }}>
                    {f.company_name || '-'}
                  </td>
                  <td className={`${stickyTd} text-gray-600`} style={{ left: 180, minWidth: 90 }}>
                    {f.representative || '-'}
                  </td>
                  {/* 기본정보 */}
                  <td className={tdBase}>{f.employment_doc || '-'}</td>
                  <td className={tdBase}>{f.field || '-'}</td>
                  <td className={tdBase}>{f.mentor || '-'}</td>
                  <td className={tdBase}>{f.grade || '-'}</td>
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
                  {/* 월별지원금 */}
                  {PAY_MONTHS.map(m => (
                    <td key={m.key} className={tdNum}>{f[m.key] ? fmt(f[m.key]) : '-'}</td>
                  ))}
                  <td className={tdNum}>{f.extra_support ? fmt(f.extra_support) : '-'}</td>
                  {/* 사업자정보 */}
                  <td className={tdBase}>{f.business_type || '-'}</td>
                  <td className={tdBase}>{f.business_no || '-'}</td>
                  <td className={tdBase}>{f.business_start_date || '-'}</td>
                  <td className={tdBase}>{f.business_category || '-'}</td>
                  {/* 성과 */}
                  <td className={tdBase}>{f.long_term_employment ?? '-'}</td>
                  <td className={tdBase}>{f.short_term_employment ?? '-'}</td>
                  <td className={tdBase}>{f.ip_rights ?? '-'}</td>
                  {/* 매출 */}
                  <td className={tdNum}>{f.total_revenue ? fmt(f.total_revenue) : '-'}</td>
                  {REV_MONTHS.map(m => (
                    <td key={m.key} className={tdNum}>{f[m.key] ? fmt(f[m.key]) : '-'}</td>
                  ))}
                  {/* 비고 */}
                  <td className={`${tdBase} max-w-[120px]`}>
                    <span className="block truncate" title={f.note}>{f.note || '-'}</span>
                  </td>
                  {/* 관리 */}
                  {canWrite && (
                    <td className={tdBase}>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(f)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 transition"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => deleteFund(f.id)}
                          className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50 transition"
                        >
                          삭제
                        </button>
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
                <td className={`${stickyTdFoot} left-0 text-center`} colSpan={3}>합계 ({filtered.length}건)</td>
                {/* 기본정보 — 빈 셀 */}
                <td className={`${tdFoot} text-center`} colSpan={4} />
                {/* 사업비 합계 */}
                <td className={tdFoot}>{fmt(sumCol('total_budget'))}</td>
                <td className={tdFoot}>{fmt(sumCol('incentive'))}</td>
                <td className={tdFoot}>{fmt(totalPaidSum)}</td>
                <td className={`${tdFoot} ${balanceSum < 0 ? 'text-red-600' : ''}`}>{fmt(balanceSum)}</td>
                <td className="text-center px-2 py-2 text-xs font-semibold text-gray-800 whitespace-nowrap bg-gray-50">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${avgExecRate >= 80 ? 'bg-green-100 text-green-700' : avgExecRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                    평균 {avgExecRate}%
                  </span>
                </td>
                {/* 월별지원금 합계 */}
                {PAY_MONTHS.map(m => <td key={m.key} className={tdFoot}>{fmt(sumCol(m.key))}</td>)}
                <td className={tdFoot}>{fmt(sumCol('extra_support'))}</td>
                {/* 사업자정보 — 빈 셀 */}
                <td className={`${tdFoot} text-center`} colSpan={4} />
                {/* 성과 — 빈 셀 */}
                <td className={`${tdFoot} text-center`} colSpan={3} />
                {/* 매출 합계 */}
                <td className={tdFoot}>{fmt(sumCol('total_revenue'))}</td>
                {REV_MONTHS.map(m => <td key={m.key} className={tdFoot}>{fmt(sumCol(m.key))}</td>)}
                {/* 비고 + 관리 — 빈 셀 */}
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
        />
      )}
    </div>
  )
}
