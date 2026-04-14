import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { EXPERT_FIELDS, getExpertFieldBadgeClass } from '../../lib/constants'
import { StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Plus, Search, Pencil, Trash2, Eye, ClipboardList, CheckCircle, XCircle, Upload, Download, X, Sparkles } from 'lucide-react'

const TECH_FIELDS = [
  '제조(기계, 에너지)',
  '제조(패션, 주얼리)',
  'IT(헬스케어)',
  'IT(e-커머스)',
  'IT(제조)',
  'IT(서비스)',
  '교육 서비스',
  '서비스(일반)',
]

const MODAL_TABS = ['기본정보', '전문분야', '근무경력', '컨설팅실적', '동의']

const emptyForm = () => ({
  name: '', org: '', role: '', fields: [],
  sub_field: '', phone: '', email: '', career: '',
  avail: '', cost: '', status: '활동중', memo: '',
  birth_date: '', address: '',
  bank_account: '', education: '', major: '',
  tech_fields: [],
  licenses: [],
  work_history: [],
  consulting_history: [],
  privacy_agreed: false,
  integrity_agreed: false,
})

export default function Experts() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')
  const canDelete = hasRole('admin')
  const canApprove = hasRole('admin')

  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('experts')
  const [experts, setExperts] = useState([])
  const [mentorings, setMentorings] = useState([])
  const [applications, setApplications] = useState([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterField, setFilterField] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // 등록/수정 모달
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailExpert, setDetailExpert] = useState(null)

  // 일괄 등록 모달
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkPreview, setBulkPreview] = useState([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const excelInputRef = useRef(null)
  const pdfRef = useRef(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (activeTab === 'applications' && canApprove) loadApplications() }, [activeTab])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: e }, { data: m }] = await Promise.all([
        supabase.from('experts').select('*').order('name'),
        supabase.from('mentorings').select('id, expert_id, status'),
      ])
      setExperts(e || [])
      setMentorings(m || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function loadApplications() {
    setAppsLoading(true)
    const { data } = await supabase
      .from('expert_applications')
      .select('*')
      .order('created_at', { ascending: false })
    setApplications(data || [])
    setAppsLoading(false)
  }

  async function approveApplication(app) {
    const { error } = await supabase.from('experts').insert([{
      name: app.applicant_name, phone: app.phone, email: app.email,
      org: app.current_organization, role: app.position,
      affiliation: app.current_organization, position: app.position,
      field: app.expertise_field,
      career: String(app.career_years ?? ''), avail: app.introduction,
      status: '활동중',
    }])
    if (error) { alert('승인 실패: ' + error.message); return }
    await supabase.from('expert_applications').update({ status: 'approved' }).eq('id', app.id)
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a))
    loadData()
    alert(`${app.applicant_name} 전문가가 승인되어 등록되었습니다.`)
  }

  async function rejectApplication(app) {
    if (!confirm(`${app.applicant_name} 신청을 거절하시겠습니까?`)) return
    await supabase.from('expert_applications').update({ status: 'rejected' }).eq('id', app.id)
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a))
  }

  async function deleteApplication(app) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase.from('expert_applications').delete().eq('id', app.id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setApplications(prev => prev.filter(a => a.id !== app.id))
  }

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setModalTab(0)
    setModalOpen(true)
  }

  function openEdit(e) {
    setEditingId(e.id)
    setModalTab(0)
    setForm({
      name: e.name || '', org: e.org || e.affiliation || '', role: e.role || e.position || '',
      fields: (e.field || '').split(',').filter(Boolean),
      sub_field: e.sub_field || '',
      phone: e.phone || '', email: e.email || '', career: e.career || '',
      avail: e.avail || '', cost: e.cost || '',
      status: e.status || '활동중', memo: e.memo || '',
      birth_date: e.birth_date || '', address: e.address || '',
      bank_account: e.bank_account || '', education: e.education || '', major: e.major || '',
      tech_fields: e.tech_fields || [],
      licenses: e.licenses || [],
      work_history: e.work_history || [],
      consulting_history: e.consulting_history || [],
      privacy_agreed: e.privacy_agreed || false,
      integrity_agreed: e.integrity_agreed || false,
    })
    setModalOpen(true)
  }

  function openDetail(e) { setDetailExpert(e); setDetailOpen(true) }

  async function handleSave() {
    if (!form.name.trim()) { alert('이름을 입력해주세요'); return }
    if (form.fields.length === 0) { alert('전문 분야를 하나 이상 선택해주세요'); return }
    setSaving(true)
    const { fields, ...rest } = form
    const payload = { ...rest, field: fields.join(','), affiliation: form.org, position: form.role }
    try {
      if (editingId) {
        const { error } = await supabase.from('experts').update(payload).eq('id', editingId)
        if (error) throw error
        setExperts(prev => prev.map(e => e.id === editingId ? { ...e, ...payload } : e))
      } else {
        const { data, error } = await supabase.from('experts').insert([payload]).select().single()
        if (error) throw error
        setExperts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setModalOpen(false)
    } catch (e) { alert('저장 실패: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('이 전문가를 삭제하시겠습니까?')) return
    const { error } = await supabase.from('experts').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setExperts(prev => prev.filter(e => e.id !== id))
  }

  // ── Excel 일괄 등록 ──────────────────────────────────────
  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['성명', '생년월일', '연락처', '이메일', '소속기관', '직위', '전문분야', '최종학력', '전공', '주소'],
    ])
    ws['!cols'] = [16, 14, 16, 24, 20, 16, 20, 16, 16, 30].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '전문가_일괄등록')
    XLSX.writeFile(wb, '전문가_등록_템플릿.xlsx')
  }

  function handleExcelUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      const wb = XLSX.read(evt.target.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
      const data = rows.slice(1).filter(r => r[0])
      if (data.length === 0) { alert('데이터가 없습니다. 양식을 확인해주세요.'); return }
      setBulkPreview(data.map(r => ({
        name: String(r[0] || '').trim(),
        birth_date: String(r[1] || '').trim(),
        phone: String(r[2] || '').trim(),
        email: String(r[3] || '').trim(),
        org: String(r[4] || '').trim(),
        role: String(r[5] || '').trim(),
        field: String(r[6] || '').trim(),
        education: String(r[7] || '').trim(),
        major: String(r[8] || '').trim(),
        address: String(r[9] || '').trim(),
      })))
      setBulkModalOpen(true)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  async function saveBulk() {
    if (!bulkPreview.length) return
    setBulkSaving(true)
    const payload = bulkPreview.map(r => ({
      name: r.name,
      birth_date: r.birth_date || null, phone: r.phone || null, email: r.email || null,
      org: r.org || null, role: r.role || null,
      affiliation: r.org || null, position: r.role || null,
      field: r.field || null,
      education: r.education || null, major: r.major || null,
      address: r.address || null,
      status: '활동중',
    }))
    const { error } = await supabase.from('experts').insert(payload)
    setBulkSaving(false)
    if (error) { alert('일괄 등록 실패: ' + error.message); return }
    setBulkModalOpen(false)
    setBulkPreview([])
    loadData()
    alert(`${payload.length}명의 전문가가 등록되었습니다.`)
  }

  // ── PDF AI 자동 파싱 ──────────────────────────────────────
  function handlePdfUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const dataUrl = evt.target.result
      // dataUrl format: "data:application/pdf;base64,<base64data>"
      const base64 = dataUrl.split(',')[1]
      setPdfLoading(true)
      try {
        const { data, error } = await supabase.functions.invoke('parse-expert-pdf', {
          body: { pdf_base64: base64 },
        })
        if (error || !data?.result) throw new Error(error?.message || '파싱 실패')
        const r = data.result
        setForm({
          ...emptyForm(),
          name: r.name || '',
          birth_date: r.birth_date || '',
          phone: r.phone || '',
          email: r.email || '',
          org: r.affiliation || '',
          role: r.position || '',
          bank_account: r.bank_account || '',
          education: r.education || '',
          major: r.major || '',
          address: r.address || '',
          sub_field: r.specialty || '',
          tech_fields: Array.isArray(r.tech_fields) ? r.tech_fields : [],
          fields: EXPERT_FIELDS.filter(f => (r.specialty || '').includes(f)),
          licenses: Array.isArray(r.licenses)
            ? r.licenses.map(l => ({ name: l.name || '', date: l.date || '', org: l.org || '' }))
            : [],
          work_history: Array.isArray(r.work_history)
            ? r.work_history.map(w => ({
                org: w.org || '', period: w.period || '',
                dept: w.dept || '', role: w.role || '',
                duties: w.task || '',
              }))
            : [],
          consulting_history: Array.isArray(r.consulting_history)
            ? r.consulting_history.map(c => ({
                org: c.org || '', period: c.period || '',
                project: c.project || '', content: c.content || '',
              }))
            : [],
        })
        setEditingId(null)
        setModalTab(0)
        setModalOpen(true)
      } catch {
        alert('PDF에서 정보를 읽지 못했습니다. 직접 입력해주세요.')
        openAdd()
      } finally {
        setPdfLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  // ── form 헬퍼 ────────────────────────────────────────────
  const addWorkRow = () => setField('work_history', [...form.work_history, { org: '', period: '', dept: '', role: '', duties: '' }])
  const updateWorkRow = (i, k, v) => setField('work_history', form.work_history.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  const removeWorkRow = i => setField('work_history', form.work_history.filter((_, idx) => idx !== i))

  const addConsultRow = () => setField('consulting_history', [...form.consulting_history, { org: '', period: '', project: '', content: '' }])
  const updateConsultRow = (i, k, v) => setField('consulting_history', form.consulting_history.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  const removeConsultRow = i => setField('consulting_history', form.consulting_history.filter((_, idx) => idx !== i))

  const addLicense = () => setField('licenses', [...form.licenses, { name: '', date: '' }])
  const updateLicense = (i, k, v) => setField('licenses', form.licenses.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  const removeLicense = i => setField('licenses', form.licenses.filter((_, idx) => idx !== i))

  const filtered = experts.filter(e =>
    (!search || e.name?.includes(search) || e.field?.includes(search) || e.sub_field?.includes(search)) &&
    (!filterField || e.field === filterField) &&
    (!filterStatus || e.status === filterStatus)
  )

  const activeCount = experts.filter(e => e.status === '활동중').length
  const fieldCount = new Set(experts.map(e => e.field)).size
  const pendingCount = applications.filter(a => a.status === 'pending').length

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-800">전문가 DB</h1>

      {/* ── 페이지 탭 ── */}
      <div className="flex border-b border-gray-200 gap-1">
        <button
          onClick={() => setActiveTab('experts')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'experts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Eye size={14} /> 전문가 목록
        </button>
        {canApprove && (
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'applications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList size={14} /> 신청 관리
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full leading-none">{pendingCount}</span>
            )}
          </button>
        )}
      </div>

      {/* ── 신청 관리 탭 ── */}
      {activeTab === 'applications' && canApprove && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">전문가 등록 신청 목록</span>
            <span className="text-xs text-gray-400">대기 {applications.filter(a => a.status === 'pending').length}건</span>
          </div>
          {appsLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">로딩 중...</div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">대기 중인 신청이 없습니다</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {applications.map(app => (
                <div key={app.id} className="px-5 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800 text-sm">{app.applicant_name}</span>
                        {app.current_organization && <span className="text-xs text-gray-400">{app.current_organization} · {app.position}</span>}
                        <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
                          app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          app.status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-500'
                        }`}>
                          {app.status === 'pending' ? '대기중' : app.status === 'approved' ? '승인됨' : '거절됨'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                        <span>📞 {app.phone}</span>
                        <span>✉️ {app.email}</span>
                        <span>🗂 {app.expertise_field}</span>
                        <span className="text-gray-400">신청일: {app.created_at?.slice(0, 10)}</span>
                      </div>
                      {app.career_years && (
                        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2.5 line-clamp-2">경력 {app.career_years}년</p>
                      )}
                      {app.introduction && (
                        <p className="text-xs text-blue-600 mt-1.5 bg-blue-50 rounded-lg p-2 line-clamp-2">💬 {app.introduction}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {app.status === 'pending' && (
                        <>
                          <button onClick={() => approveApplication(app)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                            <CheckCircle size={12} /> 승인
                          </button>
                          <button onClick={() => rejectApplication(app)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-300 hover:bg-red-50 rounded-lg transition-colors">
                            <XCircle size={12} /> 거절
                          </button>
                        </>
                      )}
                      <button onClick={() => deleteApplication(app)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors">
                        <Trash2 size={12} /> 삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 전문가 목록 탭 ── */}
      {activeTab === 'experts' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="전체 전문가" value={`${experts.length}명`} color="blue" />
            <StatCard label="활동중" value={`${activeCount}명`} color="green" />
            <StatCard label="누적 상담·멘토링" value={`${mentorings.length}건`} color="teal" />
            <StatCard label="분야 수" value={`${fieldCount}개`} color="orange" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
                  placeholder="이름·분야 검색"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterField} onChange={e => setFilterField(e.target.value)}>
                <option value="">전체 분야</option>
                {EXPERT_FIELDS.map(f => <option key={f}>{f}</option>)}
              </select>
              <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">전체 상태</option>
                <option>활동중</option><option>휴식중</option><option>종료</option>
              </select>
            </div>
            <div className="flex gap-2">
              {/* 엑셀 템플릿 다운로드 */}
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <Download size={14} /> 양식 다운로드
              </button>
              {/* 엑셀 일괄 등록 */}
              <button
                onClick={() => excelInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition"
              >
                <Upload size={14} /> 일괄 등록 (Excel)
              </button>
              <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
              {/* PDF AI 자동입력 */}
              <button
                onClick={() => pdfRef.current?.click()}
                disabled={pdfLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 transition disabled:opacity-60"
              >
                <Sparkles size={14} />
                {pdfLoading ? 'AI 분석 중...' : 'PDF로 등록 (AI 자동입력)'}
              </button>
              <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
              {/* 개별 등록 */}
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg"
                style={{ background: '#2E75B6' }}
              >
                <Plus size={15} /> 전문가 등록
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['이름', '분야', '세부전문', '소속·직위', '누적상담', '상태', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">등록된 전문가가 없습니다</td></tr>
                ) : filtered.map(e => {
                  const cnt = mentorings.filter(m => m.expert_id === e.id).length
                  return (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <button onClick={() => openDetail(e)} className="flex items-center gap-2">
                          <Avatar name={e.name} />
                          <span className="font-semibold text-blue-600 underline text-xs">{e.name}</span>
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(e.field || '').split(',').filter(Boolean).map(f => (
                            <span key={f} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getExpertFieldBadgeClass(f)}`}>{f}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{e.sub_field || '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{e.org} <span className="text-gray-400">{e.role}</span></td>
                      <td className="px-4 py-2.5">
                        <button className="text-xs font-bold text-blue-600 underline" onClick={() => navigate('/mentoring')}>{cnt}건</button>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          e.status === '활동중' ? 'bg-green-100 text-green-700' :
                          e.status === '휴식중' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                        }`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => openDetail(e)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Eye size={13} /></button>
                          <button onClick={() => openEdit(e)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(e.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── 전문가 등록/수정 모달 (탭 5개) ─── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-800">{editingId ? '전문가 정보 수정' : '전문가 등록'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
            </div>

            {/* 탭 바 */}
            <div className="flex border-b border-gray-100 shrink-0 overflow-x-auto">
              {MODAL_TABS.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setModalTab(i)}
                  className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    modalTab === i ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold mr-1.5 ${
                    modalTab === i ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>{i + 1}</span>
                  {t}
                </button>
              ))}
            </div>

            {/* 탭 컨텐츠 */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* ── Tab 0: 기본정보 ── */}
              {modalTab === 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <FI label="성명 *"><input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} /></FI>
                    <FI label="생년월일"><input className="form-input" type="date" value={form.birth_date} onChange={e => setField('birth_date', e.target.value)} /></FI>
                    <FI label="연락처"><input className="form-input" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="010-0000-0000" /></FI>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FI label="이메일"><input className="form-input" type="email" value={form.email} onChange={e => setField('email', e.target.value)} /></FI>
                    <FI label="계좌번호"><input className="form-input" value={form.bank_account} onChange={e => setField('bank_account', e.target.value)} placeholder="은행 계좌번호" /></FI>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FI label="소속기관"><input className="form-input" value={form.org} onChange={e => setField('org', e.target.value)} /></FI>
                    <FI label="직위·직책"><input className="form-input" value={form.role} onChange={e => setField('role', e.target.value)} /></FI>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FI label="최종학력"><input className="form-input" value={form.education} onChange={e => setField('education', e.target.value)} placeholder="예: 석사 졸업" /></FI>
                    <FI label="전공"><input className="form-input" value={form.major} onChange={e => setField('major', e.target.value)} /></FI>
                  </div>
                  <FI label="주소"><input className="form-input" value={form.address} onChange={e => setField('address', e.target.value)} /></FI>
                  <div className="grid grid-cols-2 gap-3">
                    <FI label="활동 상태">
                      <select className="form-input" value={form.status} onChange={e => setField('status', e.target.value)}>
                        <option>활동중</option><option>휴식중</option><option>종료</option>
                      </select>
                    </FI>
                    <FI label="메모"><input className="form-input" value={form.memo} onChange={e => setField('memo', e.target.value)} /></FI>
                  </div>
                </div>
              )}

              {/* ── Tab 1: 전문분야 ── */}
              {modalTab === 1 && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">전문 분야 * <span className="text-gray-400 font-normal">(복수 선택 가능)</span></p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {EXPERT_FIELDS.map(f => (
                        <label key={f} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium ${
                          form.fields.includes(f) ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}>
                          <input
                            type="checkbox"
                            checked={form.fields.includes(f)}
                            onChange={e => setField('fields', e.target.checked ? [...form.fields, f] : form.fields.filter(x => x !== f))}
                            className="accent-blue-600 w-3 h-3"
                          />
                          {f}
                        </label>
                      ))}
                    </div>
                  </div>
                  <FI label="세부 전문 분야"><input className="form-input" value={form.sub_field} onChange={e => setField('sub_field', e.target.value)} placeholder="예: AI·빅데이터, 스마트팩토리" /></FI>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">기술 분야 <span className="text-gray-400 font-normal">(복수 선택 가능)</span></p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TECH_FIELDS.map(f => (
                        <label key={f} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium ${
                          (form.tech_fields || []).includes(f) ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}>
                          <input
                            type="checkbox"
                            checked={(form.tech_fields || []).includes(f)}
                            onChange={e => setField('tech_fields', e.target.checked ? [...(form.tech_fields || []), f] : (form.tech_fields || []).filter(x => x !== f))}
                            className="accent-teal-600 w-3 h-3"
                          />
                          {f}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-600">자격증 · 면허</p>
                      <button type="button" onClick={addLicense} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                        <Plus size={12} /> 추가
                      </button>
                    </div>
                    {form.licenses.length === 0 ? (
                      <p className="text-xs text-gray-400 py-3 text-center bg-gray-50 rounded-lg">등록된 자격증·면허가 없습니다</p>
                    ) : (
                      <div className="space-y-2">
                        {form.licenses.map((lic, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input className="form-input flex-1" placeholder="자격증·면허명" value={lic.name} onChange={e => updateLicense(i, 'name', e.target.value)} />
                            <input className="form-input w-32" placeholder="취득일" type="date" value={lic.date} onChange={e => updateLicense(i, 'date', e.target.value)} />
                            <button type="button" onClick={() => removeLicense(i)} className="p-1 text-gray-300 hover:text-red-400"><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab 2: 근무경력 ── */}
              {modalTab === 2 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-600">근무 경력</p>
                    <button type="button" onClick={addWorkRow} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                      <Plus size={12} /> 행 추가
                    </button>
                  </div>
                  {form.work_history.length === 0 ? (
                    <p className="text-xs text-gray-400 py-8 text-center bg-gray-50 rounded-lg">근무 경력을 추가해주세요</p>
                  ) : (
                    <div className="space-y-3">
                      {form.work_history.map((row, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 relative">
                          <button type="button" onClick={() => removeWorkRow(i)} className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-400"><X size={13} /></button>
                          <div className="grid grid-cols-2 gap-2">
                            <FI label="소속기관"><input className="form-input" value={row.org} onChange={e => updateWorkRow(i, 'org', e.target.value)} /></FI>
                            <FI label="기간 (예: 2020.03 ~ 2023.02)"><input className="form-input" value={row.period} onChange={e => updateWorkRow(i, 'period', e.target.value)} /></FI>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <FI label="부서"><input className="form-input" value={row.dept} onChange={e => updateWorkRow(i, 'dept', e.target.value)} /></FI>
                            <FI label="직위"><input className="form-input" value={row.role} onChange={e => updateWorkRow(i, 'role', e.target.value)} /></FI>
                          </div>
                          <FI label="담당업무"><input className="form-input" value={row.duties} onChange={e => updateWorkRow(i, 'duties', e.target.value)} /></FI>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab 3: 컨설팅 실적 ── */}
              {modalTab === 3 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-600">컨설팅 실적</p>
                    <button type="button" onClick={addConsultRow} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                      <Plus size={12} /> 행 추가
                    </button>
                  </div>
                  {form.consulting_history.length === 0 ? (
                    <p className="text-xs text-gray-400 py-8 text-center bg-gray-50 rounded-lg">컨설팅 실적을 추가해주세요</p>
                  ) : (
                    <div className="space-y-3">
                      {form.consulting_history.map((row, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 relative">
                          <button type="button" onClick={() => removeConsultRow(i)} className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-400"><X size={13} /></button>
                          <div className="grid grid-cols-2 gap-2">
                            <FI label="수행기관"><input className="form-input" value={row.org} onChange={e => updateConsultRow(i, 'org', e.target.value)} /></FI>
                            <FI label="기간"><input className="form-input" value={row.period} onChange={e => updateConsultRow(i, 'period', e.target.value)} placeholder="예: 2023.04 ~ 2023.06" /></FI>
                          </div>
                          <FI label="사업명"><input className="form-input" value={row.project} onChange={e => updateConsultRow(i, 'project', e.target.value)} /></FI>
                          <FI label="주요 내용"><input className="form-input" value={row.content} onChange={e => updateConsultRow(i, 'content', e.target.value)} /></FI>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab 4: 동의 ── */}
              {modalTab === 4 && (
                <div className="space-y-4">
                  <AgreeBox
                    title="개인정보 수집·이용 동의"
                    body={`수집 항목: 성명, 연락처, 이메일, 소속, 경력 등\n수집 목적: 전문가 DB 구축 및 창업 지원 사업 운영\n보유 기간: 활동 종료 후 3년`}
                    checked={form.privacy_agreed}
                    onChange={v => setField('privacy_agreed', v)}
                  />
                  <AgreeBox
                    title="청렴 서약 동의"
                    body={`본인은 울산경제일자리진흥원 전문가로서 공정하고 투명하게 활동하며, 금품·향응 수수 등 부정행위를 하지 않겠습니다.`}
                    checked={form.integrity_agreed}
                    onChange={v => setField('integrity_agreed', v)}
                  />
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex gap-2">
                {modalTab > 0 && (
                  <button onClick={() => setModalTab(t => t - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">← 이전</button>
                )}
                {modalTab < MODAL_TABS.length - 1 && (
                  <button onClick={() => setModalTab(t => t + 1)} className="px-3 py-1.5 text-sm border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50">다음 →</button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 text-sm text-white rounded-lg disabled:opacity-50" style={{ background: '#2E75B6' }}>
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 엑셀 일괄 등록 미리보기 모달 ─── */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-800">일괄 등록 미리보기</h2>
                <p className="text-xs text-gray-400 mt-0.5">총 {bulkPreview.length}명 · 내용을 확인 후 저장해주세요</p>
              </div>
              <button onClick={() => setBulkModalOpen(false)} className="p-1 rounded hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {['#', '성명', '생년월일', '연락처', '이메일', '소속기관', '직위', '전문분야', '최종학력', '전공', '주소'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-200 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1.5 border border-gray-200 font-medium text-gray-800">{r.name || <span className="text-red-400">필수</span>}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.birth_date || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.phone || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.email || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.org || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.role || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.field || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.education || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.major || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
              <button onClick={() => setBulkModalOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button
                onClick={saveBulk}
                disabled={bulkSaving}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                style={{ background: '#2E75B6' }}
              >
                {bulkSaving ? '등록 중...' : `${bulkPreview.length}명 일괄 저장`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 상세 보기 모달 ─── */}
      {detailExpert && (
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`${detailExpert.name} 전문가 상세`} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[['소속', detailExpert.org], ['직위', detailExpert.role], ['상태', detailExpert.status],
                ['연락처', detailExpert.phone], ['이메일', detailExpert.email], ['비용', detailExpert.cost],
                ['생년월일', detailExpert.birth_date], ['최종학력', detailExpert.education], ['전공', detailExpert.major]].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-400">{l}</div>
                  <div className="text-sm font-medium text-gray-700">{v || '-'}</div>
                </div>
              ))}
            </div>
            {detailExpert.address && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400">주소</div>
                <div className="text-sm font-medium text-gray-700">{detailExpert.address}</div>
              </div>
            )}
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <div className="text-xs font-semibold text-blue-700 mb-2">전문 분야</div>
              <div className="flex flex-wrap gap-1.5">
                {(detailExpert.field || '').split(',').filter(Boolean).map(f => (
                  <span key={f} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getExpertFieldBadgeClass(f)}`}>{f}</span>
                ))}
                {detailExpert.sub_field && <span className="text-xs text-gray-500 self-center">· {detailExpert.sub_field}</span>}
              </div>
              {detailExpert.tech_fields?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {detailExpert.tech_fields.map(f => (
                    <span key={f} className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">{f}</span>
                  ))}
                </div>
              )}
            </div>
            {detailExpert.work_history?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">근무 경력</div>
                <div className="space-y-1.5">
                  {detailExpert.work_history.map((w, i) => (
                    <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="font-medium">{w.org}</span>{w.period && ` · ${w.period}`}{w.role && ` · ${w.role}`}
                      {w.duties && <span className="text-gray-400 ml-1">— {w.duties}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detailExpert.consulting_history?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">컨설팅 실적</div>
                <div className="space-y-1.5">
                  {detailExpert.consulting_history.map((c, i) => (
                    <div key={i} className="text-xs text-gray-600 bg-blue-50 rounded-lg px-3 py-2">
                      <span className="font-medium">{c.project}</span>{c.org && ` · ${c.org}`}{c.period && ` (${c.period})`}
                      {c.content && <p className="text-gray-400 mt-0.5">{c.content}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-2">상담·멘토링 이력 ({mentorings.filter(m => m.expert_id === detailExpert.id).length}건)</div>
              {mentorings.filter(m => m.expert_id === detailExpert.id).slice(0, 5).map(m => (
                <div key={m.id} className="py-2 border-b border-gray-100 flex items-center gap-2 text-xs">
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDetailOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>
            <button onClick={() => { setDetailOpen(false); openEdit(detailExpert) }} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>편집</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── 공통 소형 컴포넌트 ────────────────────────────────────────
function FI({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function AgreeBox({ title, body, checked, onChange }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${checked ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200'}`}>
      <div className="text-sm font-semibold text-gray-700 mb-2">{title}</div>
      <pre className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed mb-3 font-sans">{body}</pre>
      <label className="flex items-center gap-2 cursor-pointer">
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}
          onClick={() => onChange(!checked)}>
          {checked && <span className="text-white text-xs font-bold">✓</span>}
        </div>
        <span className="text-xs font-medium text-gray-700">위 내용에 동의합니다</span>
      </label>
    </div>
  )
}
