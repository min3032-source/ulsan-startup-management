import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import {
  Plus, Search, Pencil, Trash2, X, Upload, Download, Shuffle,
  FileCheck, ClipboardList, CheckCircle, Circle,
} from 'lucide-react'

const TABS = [
  { id: 'companies',  label: '멘토기업 DB' },
  { id: 'businesses', label: '소상공인 신청 현황' },
  { id: 'matching',   label: '매칭 현황' },
  { id: 'agreement',  label: '협약 · 멘토링 관리' },
]

const MATCH_STATUSES = ['매칭완료', '협약완료', '멘토링중', '멘토링완료']
const MATCH_STATUS_COLOR = {
  '매칭완료': 'bg-blue-100 text-blue-700',
  '협약완료': 'bg-teal-100 text-teal-700',
  '멘토링중': 'bg-amber-100 text-amber-700',
  '멘토링완료': 'bg-green-100 text-green-700',
}

const emptyCompanyForm = () => ({
  company_name: '', ceo_name: '', phone: '', email: '', field: '', address: '', intro: '', status: '활동중',
})

export default function MentorMatchAdmin() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')
  const canDelete = hasRole('admin')

  const [activeTab, setActiveTab] = useState('companies')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const [companies, setCompanies] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [preferences, setPreferences] = useState([])
  const [matchings, setMatchings] = useState([])
  const [recordMap, setRecordMap] = useState({})

  const [search, setSearch] = useState('')

  // 멘토기업 등록/수정 모달
  const [companyModal, setCompanyModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm())
  const [saving, setSaving] = useState(false)

  // 엑셀 일괄 등록
  const [bulkPreview, setBulkPreview] = useState([])
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const excelInputRef = useRef(null)

  // 소상공인 상세
  const [bizDetail, setBizDetail] = useState(null)

  // 매칭 실행
  const [matchingRunning, setMatchingRunning] = useState(false)

  // 협약 모달
  const [agreementModal, setAgreementModal] = useState(null)
  const [agreementForm, setAgreementForm] = useState({ agreement_signed: false, agreement_date: '', agreement_file_url: '' })

  // 멘토링 기록 모달
  const [recordModal, setRecordModal] = useState(null)
  const [recordForm, setRecordForm] = useState({ plan_content: '', logs: [], report_content: '' })
  const [recordSaving, setRecordSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function loadAll() {
    setLoading(true)
    try {
      const [
        { data: c, error: eC },
        { data: b, error: eB },
        { data: p, error: eP },
        { data: m, error: eM },
      ] = await Promise.all([
        supabase.from('mentor_companies').select('*').order('company_name'),
        supabase.from('small_businesses').select('*').order('created_at', { ascending: false }),
        supabase.from('mentor_preferences').select('*, mentor_companies(id, company_name)').order('priority'),
        supabase.from('matchings').select('*, small_businesses(id, name, company_name, phone, item), mentor_companies(id, company_name)').order('created_at', { ascending: false }),
      ])
      if (eC) throw eC
      if (eB) throw eB
      if (eP) throw eP
      if (eM) throw eM

      setCompanies(c || [])
      setBusinesses(b || [])
      setPreferences(p || [])
      setMatchings(m || [])

      if (m?.length) {
        const { data: recs, error: eR } = await supabase.from('mentoring_records').select('id, matching_id, plan_content, logs, report_content').in('matching_id', m.map(x => x.id))
        if (eR) throw eR
        const map = {}
        ;(recs || []).forEach(r => { map[r.matching_id] = r })
        setRecordMap(map)
      } else {
        setRecordMap({})
      }
    } catch (e) {
      console.error('멘토매칭 데이터 조회 실패:', e)
      showToast('데이터를 불러오지 못했습니다. 잠시 후 새로고침 해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // ── 멘토기업 CRUD ──────────────────────────────────────
  function setCF(k, v) { setCompanyForm(p => ({ ...p, [k]: v })) }

  function openAddCompany() { setEditingCompany(null); setCompanyForm(emptyCompanyForm()); setCompanyModal(true) }
  function openEditCompany(c) {
    setEditingCompany(c)
    setCompanyForm({
      company_name: c.company_name || '', ceo_name: c.ceo_name || '', phone: c.phone || '',
      email: c.email || '', field: c.field || '', address: c.address || '', intro: c.intro || '', status: c.status || '활동중',
    })
    setCompanyModal(true)
  }

  async function saveCompany() {
    if (!companyForm.company_name.trim()) { alert('기업명을 입력해주세요'); return }
    setSaving(true)
    try {
      let error
      if (editingCompany) {
        ({ error } = await supabase.from('mentor_companies').update(companyForm).eq('id', editingCompany.id))
      } else {
        ({ error } = await supabase.from('mentor_companies').insert(companyForm))
      }
      if (error) throw error
      setCompanyModal(false)
      showToast(editingCompany ? '멘토기업 정보가 수정되었습니다.' : '멘토기업이 등록되었습니다.')
      loadAll()
    } catch (e) {
      console.error('멘토기업 저장 실패:', e)
      alert('저장 실패: ' + (e.message || '잠시 후 다시 시도해주세요.'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteCompany(id) {
    if (!confirm('이 멘토기업을 삭제하시겠습니까? 관련 선택·매칭 데이터도 함께 삭제됩니다.')) return
    try {
      const { error } = await supabase.from('mentor_companies').delete().eq('id', id)
      if (error) throw error
      showToast('삭제되었습니다.')
      loadAll()
    } catch (e) {
      console.error('멘토기업 삭제 실패:', e)
      alert('삭제 실패: ' + (e.message || '잠시 후 다시 시도해주세요.'))
    }
  }

  // ── 엑셀 일괄 등록 (114개 기존 데이터 import) ──────────
  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['기업명', '대표자명', '연락처', '이메일', '업종·분야', '주소', '소개·멘토링 가능분야'],
    ])
    ws['!cols'] = [20, 14, 16, 24, 16, 30, 30].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '멘토기업_일괄등록')
    XLSX.writeFile(wb, '멘토기업_등록_템플릿.xlsx')
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
        company_name: String(r[0] || '').trim(),
        ceo_name: String(r[1] || '').trim(),
        phone: String(r[2] || '').trim(),
        email: String(r[3] || '').trim(),
        field: String(r[4] || '').trim(),
        address: String(r[5] || '').trim(),
        intro: String(r[6] || '').trim(),
      })))
      setBulkModalOpen(true)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  async function saveBulk() {
    if (!bulkPreview.length) return
    setBulkSaving(true)
    try {
      const payload = bulkPreview.map(r => ({
        company_name: r.company_name,
        ceo_name: r.ceo_name || null, phone: r.phone || null, email: r.email || null,
        field: r.field || null, address: r.address || null, intro: r.intro || null,
        status: '활동중',
      }))
      const { error } = await supabase.from('mentor_companies').insert(payload)
      if (error) throw error
      setBulkModalOpen(false)
      setBulkPreview([])
      showToast(`${payload.length}개 멘토기업이 등록되었습니다.`)
      loadAll()
    } catch (e) {
      console.error('멘토기업 일괄 등록 실패:', e)
      alert('일괄 등록 실패: ' + (e.message || '잠시 후 다시 시도해주세요.'))
    } finally {
      setBulkSaving(false)
    }
  }

  // ── 소상공인 신청 ──────────────────────────────────────
  async function deleteBusiness(id) {
    if (!confirm('이 신청 건을 삭제하시겠습니까? 선택·매칭 데이터도 함께 삭제됩니다.')) return
    try {
      const { error } = await supabase.from('small_businesses').delete().eq('id', id)
      if (error) throw error
      showToast('삭제되었습니다.')
      loadAll()
    } catch (e) {
      console.error('소상공인 신청 삭제 실패:', e)
      alert('삭제 실패: ' + (e.message || '잠시 후 다시 시도해주세요.'))
    }
  }

  function prefsFor(bizId) {
    return preferences.filter(p => p.small_business_id === bizId).sort((a, b) => a.priority - b.priority)
  }

  // ── 자동 매칭 실행 ──────────────────────────────────────
  async function runAutoMatch() {
    setMatchingRunning(true)
    try {
      const matchedIds = new Set(matchings.map(m => m.small_businesses?.id))
      const unmatched = businesses.filter(b => !matchedIds.has(b.id))

      const { data: allCPrefs, error: eCPrefs } = await supabase.from('company_preferences').select('mentor_company_id, small_business_id')
      if (eCPrefs) throw eCPrefs
      const interestSet = new Set((allCPrefs || []).map(c => `${c.mentor_company_id}_${c.small_business_id}`))

      const sortedUnmatched = [...unmatched].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      const newMatches = []
      for (const biz of sortedUnmatched) {
        const prefs = prefsFor(biz.id)
        for (const p of prefs) {
          if (interestSet.has(`${p.mentor_company_id}_${biz.id}`)) {
            newMatches.push({ small_business_id: biz.id, mentor_company_id: p.mentor_company_id, matched_priority: p.priority })
            break
          }
        }
      }

      if (newMatches.length === 0) {
        alert('상호 선택된 신규 매칭 건이 없습니다. 멘토기업의 관심 등록 여부를 확인해주세요.')
        return
      }
      const { error } = await supabase.from('matchings').insert(newMatches)
      if (error) throw error
      const { error: eUpd } = await supabase.from('small_businesses').update({ status: '매칭완료' }).in('id', newMatches.map(m => m.small_business_id))
      if (eUpd) throw eUpd
      showToast(`${newMatches.length}건이 새로 매칭되었습니다.`)
      loadAll()
    } catch (e) {
      console.error('자동 매칭 실행 실패:', e)
      alert('매칭 실행 실패: ' + (e.message || '잠시 후 다시 시도해주세요.'))
    } finally {
      setMatchingRunning(false)
    }
  }

  async function updateMatchStatus(id, status) {
    try {
      const { error } = await supabase.from('matchings').update({ status }).eq('id', id)
      if (error) throw error
      setMatchings(prev => prev.map(m => m.id === id ? { ...m, status } : m))
    } catch (e) {
      console.error('매칭 상태 변경 실패:', e)
      alert('상태 변경 실패: ' + (e.message || '잠시 후 다시 시도해주세요.'))
    }
  }

  async function deleteMatch(m) {
    if (!confirm(`${m.small_businesses?.company_name} ↔ ${m.mentor_companies?.company_name} 매칭을 취소하시겠습니까?`)) return
    try {
      const { error: eRec } = await supabase.from('mentoring_records').delete().eq('matching_id', m.id)
      if (eRec) throw eRec
      const { error } = await supabase.from('matchings').delete().eq('id', m.id)
      if (error) throw error
      const { error: eBiz } = await supabase.from('small_businesses').update({ status: '신청완료' }).eq('id', m.small_businesses.id)
      if (eBiz) throw eBiz
      showToast('매칭이 취소되었습니다.')
      loadAll()
    } catch (e) {
      console.error('매칭 취소 실패:', e)
      alert('삭제 실패: ' + (e.message || '잠시 후 다시 시도해주세요.'))
    }
  }

  // ── 협약 관리 ──────────────────────────────────────────
  function openAgreement(m) {
    setAgreementModal(m)
    setAgreementForm({
      agreement_signed: m.agreement_signed || false,
      agreement_date: m.agreement_date || '',
      agreement_file_url: m.agreement_file_url || '',
    })
  }

  async function saveAgreement() {
    try {
      const payload = {
        agreement_signed: agreementForm.agreement_signed,
        agreement_date: agreementForm.agreement_date || null,
        agreement_file_url: agreementForm.agreement_file_url || null,
        status: agreementForm.agreement_signed ? '협약완료' : agreementModal.status,
      }
      const { error } = await supabase.from('matchings').update(payload).eq('id', agreementModal.id)
      if (error) throw error
      setAgreementModal(null)
      showToast('협약 정보가 저장되었습니다.')
      loadAll()
    } catch (e) {
      console.error('협약 정보 저장 실패:', e)
      alert('저장 실패: ' + (e.message || '잠시 후 다시 시도해주세요.'))
    }
  }

  // ── 멘토링 수행 기록 ────────────────────────────────────
  function openRecord(m) {
    const rec = recordMap[m.id]
    setRecordModal(m)
    setRecordForm({
      plan_content: rec?.plan_content || '',
      logs: rec?.logs || [],
      report_content: rec?.report_content || '',
    })
  }

  function addLog() { setRecordForm(p => ({ ...p, logs: [...p.logs, { session_num: p.logs.length + 1, date: '', content: '' }] })) }
  function updateLog(i, k, v) { setRecordForm(p => ({ ...p, logs: p.logs.map((l, idx) => idx === i ? { ...l, [k]: v } : l) })) }
  function removeLog(i) { setRecordForm(p => ({ ...p, logs: p.logs.filter((_, idx) => idx !== i) })) }

  async function saveRecord() {
    setRecordSaving(true)
    try {
      const now = new Date().toISOString()
      const existing = recordMap[recordModal.id]
      const payload = {
        matching_id: recordModal.id,
        plan_content: recordForm.plan_content || null,
        plan_submitted_at: recordForm.plan_content ? now : null,
        logs: recordForm.logs,
        report_content: recordForm.report_content || null,
        report_submitted_at: recordForm.report_content ? now : null,
      }
      let error
      if (existing) {
        ({ error } = await supabase.from('mentoring_records').update(payload).eq('matching_id', recordModal.id))
      } else {
        ({ error } = await supabase.from('mentoring_records').insert(payload))
      }
      if (error) throw error
      setRecordModal(null)
      showToast('멘토링 수행 기록이 저장되었습니다.')
      loadAll()
    } catch (e) {
      console.error('멘토링 수행 기록 저장 실패:', e)
      alert('저장 실패: ' + (e.message || '잠시 후 다시 시도해주세요.'))
    } finally {
      setRecordSaving(false)
    }
  }

  // ── 필터 ──────────────────────────────────────────────
  const filteredCompanies = companies.filter(c => !search || c.company_name?.includes(search) || c.field?.includes(search))
  const filteredBusinesses = businesses.filter(b => !search || b.name?.includes(search) || b.company_name?.includes(search))

  const stats = {
    companies: companies.length,
    businesses: businesses.length,
    matched: matchings.length,
    unmatched: businesses.length - matchings.length,
  }

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>
      )}

      <PageHeader title="멘토매칭 관리" subtitle="혁신 소상공인 AI활용지원사업 — 멘토기업 · 소상공인 상호 매칭" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="멘토기업" value={`${stats.companies}개`} color="blue" />
        <StatCard label="소상공인 신청" value={`${stats.businesses}건`} color="teal" />
        <StatCard label="매칭완료" value={`${stats.matched}건`} color="green" />
        <StatCard label="매칭대기" value={`${stats.unmatched}건`} color="orange" />
      </div>

      {/* 페이지 탭 */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setSearch('') }}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 탭: 멘토기업 DB ── */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-52"
                placeholder="기업명·분야 검색" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {canWrite && (
              <div className="flex gap-2">
                <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  <Download size={14} /> 양식 다운로드
                </button>
                <button onClick={() => excelInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition">
                  <Upload size={14} /> 일괄 등록 (Excel)
                </button>
                <input ref={excelInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
                <button onClick={openAddCompany} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: '#2E75B6' }}>
                  <Plus size={15} /> 멘토기업 등록
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['기업명', '대표자', '연락처', '업종·분야', '상태', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
                ) : filteredCompanies.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">등록된 멘토기업이 없습니다</td></tr>
                ) : filteredCompanies.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800 text-xs">{c.company_name}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{c.ceo_name || '-'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{c.phone || '-'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{c.field || '-'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        c.status === '활동중' ? 'bg-green-100 text-green-700' : c.status === '휴식중' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {canWrite && (
                        <div className="flex gap-1">
                          <button onClick={() => openEditCompany(c)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil size={13} /></button>
                          {canDelete && <button onClick={() => deleteCompany(c.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 탭: 소상공인 신청 현황 ── */}
      {activeTab === 'businesses' && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-52"
              placeholder="이름·기업명 검색" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['이름', '기업명', '연락처', '1순위', '2순위', '3순위', '상태', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
                ) : filteredBusinesses.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">신청된 소상공인이 없습니다</td></tr>
                ) : filteredBusinesses.map(b => {
                  const prefs = prefsFor(b.id)
                  const byPriority = n => prefs.find(p => p.priority === n)?.mentor_companies?.company_name || '-'
                  return (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <button onClick={() => setBizDetail(b)} className="text-xs font-semibold text-blue-600 hover:underline">{b.name}</button>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-700">{b.company_name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{b.phone}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{byPriority(1)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{byPriority(2)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{byPriority(3)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          b.status === '매칭완료' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>{b.status}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {canDelete && (
                          <button onClick={() => deleteBusiness(b.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 탭: 매칭 현황 ── */}
      {activeTab === 'matching' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && (
              <button onClick={runAutoMatch} disabled={matchingRunning}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white rounded-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #2E75B6, #1E5A94)' }}>
                <Shuffle size={15} /> {matchingRunning ? '매칭 실행 중...' : '상호 선택 기반 자동 매칭 실행'}
              </button>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['소상공인', '멘토기업', '매칭 순위', '상태', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
                ) : matchings.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">매칭된 건이 없습니다. 자동 매칭을 실행해주세요.</td></tr>
                ) : matchings.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs">
                      <div className="font-medium text-gray-800">{m.small_businesses?.company_name}</div>
                      <div className="text-gray-400">{m.small_businesses?.name}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{m.mentor_companies?.company_name}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{m.matched_priority ? `${m.matched_priority}순위` : '-'}</td>
                    <td className="px-4 py-2.5">
                      {canWrite ? (
                        <select value={m.status} onChange={e => updateMatchStatus(m.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded border font-medium ${MATCH_STATUS_COLOR[m.status]}`}>
                          {MATCH_STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${MATCH_STATUS_COLOR[m.status]}`}>{m.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {canDelete && (
                        <button onClick={() => deleteMatch(m)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 탭: 협약 · 멘토링 관리 ── */}
      {activeTab === 'agreement' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['소상공인', '멘토기업', '진행 상태', '협약', '멘토링 기록', '관리'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
              ) : matchings.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">매칭된 건이 없습니다</td></tr>
              ) : matchings.map(m => {
                const rec = recordMap[m.id]
                return (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{m.small_businesses?.company_name}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{m.mentor_companies?.company_name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 text-xs rounded font-medium ${MATCH_STATUS_COLOR[m.status]}`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => openAgreement(m)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">
                        {m.agreement_signed ? <CheckCircle size={12} className="text-green-600" /> : <Circle size={12} className="text-gray-300" />}
                        {m.agreement_signed ? '협약완료' : '협약 등록'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => openRecord(m)} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50">
                        <ClipboardList size={12} className={rec ? 'text-blue-600' : 'text-gray-300'} />
                        {rec ? '기록 보기·수정' : '기록 작성'}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      {m.agreement_file_url && (
                        <a href={m.agreement_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                          <FileCheck size={12} /> 협약서
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── 멘토기업 등록/수정 모달 ─── */}
      {companyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">{editingCompany ? '멘토기업 정보 수정' : '멘토기업 등록'}</h2>
              <button onClick={() => setCompanyModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FI label="기업명 *"><input className="form-input" value={companyForm.company_name} onChange={e => setCF('company_name', e.target.value)} /></FI>
                <FI label="대표자명"><input className="form-input" value={companyForm.ceo_name} onChange={e => setCF('ceo_name', e.target.value)} /></FI>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FI label="연락처"><input className="form-input" value={companyForm.phone} onChange={e => setCF('phone', e.target.value)} placeholder="010-0000-0000" /></FI>
                <FI label="이메일"><input className="form-input" type="email" value={companyForm.email} onChange={e => setCF('email', e.target.value)} /></FI>
              </div>
              <FI label="업종·분야"><input className="form-input" value={companyForm.field} onChange={e => setCF('field', e.target.value)} /></FI>
              <FI label="주소"><input className="form-input" value={companyForm.address} onChange={e => setCF('address', e.target.value)} /></FI>
              <FI label="기업소개 · 멘토링 가능분야"><textarea className="form-input h-20 resize-none" value={companyForm.intro} onChange={e => setCF('intro', e.target.value)} /></FI>
              <FI label="상태">
                <select className="form-input" value={companyForm.status} onChange={e => setCF('status', e.target.value)}>
                  <option>활동중</option><option>휴식중</option><option>종료</option>
                </select>
              </FI>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setCompanyModal(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={saveCompany} disabled={saving} className="px-4 py-1.5 text-sm text-white rounded-lg disabled:opacity-50" style={{ background: '#2E75B6' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 엑셀 일괄 등록 미리보기 ─── */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-800">멘토기업 일괄 등록 미리보기</h2>
                <p className="text-xs text-gray-400 mt-0.5">총 {bulkPreview.length}개 · 내용을 확인 후 저장해주세요</p>
              </div>
              <button onClick={() => setBulkModalOpen(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {['#', '기업명', '대표자', '연락처', '이메일', '업종·분야', '주소', '소개'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600 border border-gray-200 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.map((r, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-1.5 border border-gray-200 font-medium text-gray-800">{r.company_name || <span className="text-red-400">필수</span>}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.ceo_name || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.phone || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.email || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.field || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600">{r.address || '-'}</td>
                      <td className="px-3 py-1.5 border border-gray-200 text-gray-600 max-w-[160px] truncate">{r.intro || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
              <button onClick={() => setBulkModalOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={saveBulk} disabled={bulkSaving} className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ background: '#2E75B6' }}>
                {bulkSaving ? '등록 중...' : `${bulkPreview.length}개 일괄 저장`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 소상공인 상세 모달 ─── */}
      {bizDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">{bizDetail.name} · 신청 상세</h2>
              <button onClick={() => setBizDetail(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[['기업명', bizDetail.company_name], ['연락처', bizDetail.phone], ['이메일', bizDetail.email], ['업종·아이템', bizDetail.item]].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-400">{l}</div>
                    <div className="text-sm font-medium text-gray-700">{v || '-'}</div>
                  </div>
                ))}
              </div>
              {bizDetail.memo && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs text-blue-500 mb-1">비고</div>
                  <div className="text-sm text-blue-800 whitespace-pre-wrap">{bizDetail.memo}</div>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">희망 멘토기업 선택</div>
                <div className="space-y-1.5">
                  {prefsFor(bizDetail.id).map(p => (
                    <div key={p.priority} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                      <span className="font-bold text-blue-600">{p.priority}순위</span>
                      <span className="text-gray-700">{p.mentor_companies?.company_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 협약 관리 모달 ─── */}
      {agreementModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">협약 관리</h2>
              <button onClick={() => setAgreementModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-xs text-gray-500">{agreementModal.small_businesses?.company_name} ↔ {agreementModal.mentor_companies?.company_name}</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={agreementForm.agreement_signed}
                  onChange={e => setAgreementForm(p => ({ ...p, agreement_signed: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600" />
                <span className="text-sm font-medium text-gray-700">협약 체결 완료</span>
              </label>
              <FI label="협약일자">
                <input type="date" className="form-input" value={agreementForm.agreement_date || ''}
                  onChange={e => setAgreementForm(p => ({ ...p, agreement_date: e.target.value }))} />
              </FI>
              <FI label="협약서 파일 링크 (Supabase Storage 등)">
                <input className="form-input" value={agreementForm.agreement_file_url}
                  onChange={e => setAgreementForm(p => ({ ...p, agreement_file_url: e.target.value }))} placeholder="https://..." />
              </FI>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setAgreementModal(null)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={saveAgreement} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 멘토링 수행 기록 모달 ─── */}
      {recordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-800">멘토링 수행 기록</h2>
              <button onClick={() => setRecordModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              <p className="text-xs text-gray-500">{recordModal.small_businesses?.company_name} ↔ {recordModal.mentor_companies?.company_name}</p>

              <FI label="수행계획서">
                <textarea className="form-input h-24 resize-none" value={recordForm.plan_content}
                  onChange={e => setRecordForm(p => ({ ...p, plan_content: e.target.value }))}
                  placeholder="멘토링 목표, 추진 계획, 일정 등을 작성해주세요." />
              </FI>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600">수행일지</p>
                  <button type="button" onClick={addLog} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                    <Plus size={12} /> 회차 추가
                  </button>
                </div>
                {recordForm.logs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center bg-gray-50 rounded-lg">등록된 수행일지가 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {recordForm.logs.map((log, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 relative">
                        <button type="button" onClick={() => removeLog(i)} className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-400"><X size={13} /></button>
                        <div className="grid grid-cols-2 gap-2">
                          <input className="form-input" type="number" min="1" placeholder="회차" value={log.session_num}
                            onChange={e => updateLog(i, 'session_num', Number(e.target.value))} />
                          <input className="form-input" type="date" value={log.date} onChange={e => updateLog(i, 'date', e.target.value)} />
                        </div>
                        <textarea className="form-input h-16 resize-none" placeholder="회차 수행 내용" value={log.content}
                          onChange={e => updateLog(i, 'content', e.target.value)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <FI label="결과보고서">
                <textarea className="form-input h-24 resize-none" value={recordForm.report_content}
                  onChange={e => setRecordForm(p => ({ ...p, report_content: e.target.value }))}
                  placeholder="멘토링 성과, 향후 계획 등을 작성해주세요." />
              </FI>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
              <button onClick={() => setRecordModal(null)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={saveRecord} disabled={recordSaving} className="px-4 py-1.5 text-sm text-white rounded-lg disabled:opacity-50" style={{ background: '#2E75B6' }}>
                {recordSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FI({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
