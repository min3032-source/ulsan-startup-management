import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ULSAN_REGIONS, DEFAULT_SETTINGS, NOTE_TYPES, today } from '../../lib/constants'
import { VerdictBadge, StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Plus, Search, Pencil, Trash2, Eye, Upload, Download, X } from 'lucide-react'
import * as XLSX from 'xlsx'

// ─────────────────────────────────────────────
// 빈 폼 생성 함수
// ─────────────────────────────────────────────
const emptySpItem = () => ({
  program: '', sub_program: '', staff: '',
  start_date: today(), end_date: '', amount: '', status: '지원중',
})

const emptyFirmForm = () => ({
  company_name: '', ceo: '', biz_no: '', found_year: '', employees: '',
  biz_type: '', biz_item: '', sector: '', type: '테크', region: '',
  gender: '', phone: '', email: '', item: '',
  support_programs: [emptySpItem()],
  post_mgmt: '후속관리중', memo: '',
})

const emptyNoteForm = () => ({
  firm_id: '', staff: '', date: today(), type: '방문점검', content: '', next_date: '',
})

const emptyConsultForm = () => ({
  date: today(), method: '방문상담', assignee: '', content: '', result: '', status: '상담완료',
})

export default function Selected() {
  const { hasRole } = useAuth()
  const canWrite = hasRole("manager")
  const canDelete = hasRole("admin")

  const [firms, setFirms] = useState([])
  const [notes, setNotes] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('list')
  const [search, setSearch] = useState('')
  const [filterProgram, setFilterProgram] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [firmModal, setFirmModal] = useState(false)
  const [firmEditId, setFirmEditId] = useState(null)
  const [firmForm, setFirmForm] = useState(emptyFirmForm())
  const [noteModal, setNoteModal] = useState(false)
  const [noteEditId, setNoteEditId] = useState(null)
  const [noteForm, setNoteForm] = useState(emptyNoteForm())
  const [detailFirm, setDetailFirm] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTab, setDetailTab] = useState('info')
  const [detailConsults, setDetailConsults] = useState([])
  const [consultsLoading, setConsultsLoading] = useState(false)
  const [consultForm, setConsultForm] = useState(null) // null=숨김, {}=표시

  // 엑셀 일괄 등록
  const [xlsxModal, setXlsxModal] = useState(false)
  const [xlsxPreview, setXlsxPreview] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: f }, { data: n }, { data: s }, { data: p }] = await Promise.all([
        supabase.from('selected_firms').select('*').order('start_date', { ascending: false }),
        supabase.from('selected_notes').select('*').order('date', { ascending: false }),
        supabase.from('team_settings').select('*').limit(1).single(),
        supabase.from('profiles').select('id, name, email').order('name'),
      ])
      setFirms(f || [])
      setNotes(n || [])
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s })
      setProfiles(p || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function setFF(k, v) { setFirmForm(p => ({ ...p, [k]: v })) }
  function setNF(k, v) { setNoteForm(p => ({ ...p, [k]: v })) }
  function setCF(k, v) { setConsultForm(p => ({ ...p, [k]: v })) }

  // 지원사업 행 추가/변경/삭제
  function setSP(idx, field, value) {
    setFirmForm(prev => {
      const sp = [...prev.support_programs]
      sp[idx] = { ...sp[idx], [field]: value }
      return { ...prev, support_programs: sp }
    })
  }
  function addSP() {
    setFirmForm(prev => ({ ...prev, support_programs: [...prev.support_programs, emptySpItem()] }))
  }
  function removeSP(idx) {
    setFirmForm(prev => {
      const sp = prev.support_programs.filter((_, i) => i !== idx)
      return { ...prev, support_programs: sp.length ? sp : [emptySpItem()] }
    })
  }

  function openAddFirm() { setFirmEditId(null); setFirmForm(emptyFirmForm()); setFirmModal(true) }
  function openEditFirm(f) {
    setFirmEditId(f.id)
    let sp = [emptySpItem()]
    if (Array.isArray(f.support_programs) && f.support_programs.length > 0) {
      // 기존 데이터 마이그레이션: 첫 번째 항목에 top-level 필드 폴백
      sp = f.support_programs.map((item, i) => ({
        ...emptySpItem(),
        ...item,
        staff:      item.staff      || (i === 0 ? f.staff      || '' : ''),
        start_date: item.start_date || (i === 0 ? f.start_date || today() : today()),
        end_date:   item.end_date   !== undefined ? item.end_date : (i === 0 ? f.end_date || '' : ''),
        amount:     item.amount     !== undefined ? String(item.amount) : (i === 0 ? String(f.amount || '') : ''),
        status:     item.status     || (i === 0 ? f.status     || '지원중' : '지원중'),
      }))
    } else if (f.program) {
      sp = [{ ...emptySpItem(), program: f.program || '', sub_program: f.sub_program || '',
        staff: f.staff || '', start_date: f.start_date || today(),
        end_date: f.end_date || '', amount: String(f.amount || ''), status: f.status || '지원중',
      }]
    }
    setFirmForm({
      company_name: f.company_name || '', ceo: f.ceo || '', biz_no: f.biz_no || '',
      found_year: f.found_year || '', employees: f.employees || '',
      biz_type: f.biz_type || '', biz_item: f.biz_item || '', sector: f.sector || '',
      type: f.type || '테크', region: f.region || '', gender: f.gender || '',
      phone: f.phone || '', email: f.email || '', item: f.item || '',
      support_programs: sp,
      post_mgmt: f.post_mgmt || '후속관리중', memo: f.memo || '',
    })
    setFirmModal(true)
  }

  async function saveFirm() {
    if (!firmForm.company_name.trim()) { alert('기업명을 입력해주세요'); return }
    if (!firmForm.ceo.trim()) { alert('대표자를 입력해주세요'); return }

    const validSP = firmForm.support_programs
      .filter(sp => sp.program && sp.program !== '__custom__' ? sp.program.trim() : sp.program?.trim())
      .map(sp => ({ ...sp, amount: sp.amount ? Number(sp.amount) : null }))

    const firstSP = validSP[0] || emptySpItem()
    const globalStatus = validSP.length > 0 && validSP.every(sp => sp.status === '완료') ? '완료' : '지원중'

    const payload = {
      company_name: firmForm.company_name,
      ceo: firmForm.ceo,
      biz_no: firmForm.biz_no || null,
      found_year: firmForm.found_year || null,
      employees: firmForm.employees ? Number(firmForm.employees) : null,
      biz_type: firmForm.biz_type || null,
      biz_item: firmForm.biz_item || null,
      sector: (firmForm.biz_type || '') + (firmForm.biz_item ? ' / ' + firmForm.biz_item : '') || null,
      type: firmForm.type,
      region: firmForm.region || null,
      gender: firmForm.gender || null,
      phone: firmForm.phone || null,
      email: firmForm.email || null,
      item: firmForm.item || null,
      support_programs: validSP,
      program: firstSP.program || null,
      staff: firstSP.staff || null,
      start_date: firstSP.start_date || null,
      end_date: firstSP.end_date || null,
      amount: firstSP.amount ? Number(firstSP.amount) : null,
      status: globalStatus,
      post_mgmt: globalStatus === '완료' ? firmForm.post_mgmt : null,
      memo: firmForm.memo || null,
    }

    try {
      if (firmEditId) {
        const { error } = await supabase.from('selected_firms').update(payload).eq('id', firmEditId)
        if (error) { console.error('저장 오류:', error); throw error }
        setFirms(prev => prev.map(f => f.id === firmEditId ? { ...f, ...payload } : f))
      } else {
        const { data, error } = await supabase.from('selected_firms').insert([payload]).select().single()
        if (error) { console.error('저장 오류:', error); throw error }
        setFirms(prev => [data, ...prev])
      }
      setFirmModal(false)
    } catch (e) { alert('저장 실패: ' + e.message) }
  }

  async function deleteFirm(id) {
    if (!confirm('이 선정기업을 삭제하시겠습니까?')) return
    await supabase.from('selected_firms').delete().eq('id', id)
    await supabase.from('selected_notes').delete().eq('firm_id', id)
    setFirms(prev => prev.filter(f => f.id !== id))
    setNotes(prev => prev.filter(n => n.firm_id !== id))
  }

  async function openDetail(f) {
    setDetailFirm(f)
    setDetailTab('info')
    setDetailConsults([])
    setConsultForm(null)
    setDetailOpen(true)
    loadDetailConsults(f.id)
  }

  // firm_id로 직접 조회
  async function loadDetailConsults(firmId) {
    setConsultsLoading(true)
    try {
      const { data: cList, error } = await supabase
        .from('consults')
        .select('*')
        .eq('firm_id', firmId)
        .order('date', { ascending: false })
      if (error) console.error('상담일지 조회 오류:', error)
      setDetailConsults(cList || [])
    } catch (e) { console.error('상담일지 로드 오류:', e) }
    finally { setConsultsLoading(false) }
  }

  async function saveConsult() {
    if (!consultForm?.content?.trim()) { alert('내용을 입력해주세요'); return }
    const payload = {
      firm_id: detailFirm.id,
      date: consultForm.date || today(),
      method: consultForm.method || null,
      assignee: consultForm.assignee || null,
      content: consultForm.content,
      result: consultForm.result || null,
      status: consultForm.status || '상담완료',
    }
    try {
      const { data, error } = await supabase.from('consults').insert([payload]).select().single()
      if (error) { console.error('저장 오류:', error); throw error }
      setDetailConsults(prev => [data, ...prev])
      setConsultForm(null)
    } catch (e) { alert('저장 실패: ' + e.message) }
  }

  function openAddNote(preFirmId = '') {
    setNoteEditId(null)
    const f = emptyNoteForm()
    if (preFirmId) f.firm_id = preFirmId
    setNoteForm(f)
    setNoteModal(true)
  }

  async function saveNote() {
    if (!noteForm.firm_id) { alert('기업을 선택해주세요'); return }
    if (!noteForm.content.trim()) { alert('내용을 입력해주세요'); return }
    const payload = {
      firm_id: noteForm.firm_id,
      staff: noteForm.staff || null,
      date: noteForm.date,
      type: noteForm.type,
      content: noteForm.content,
      next_date: noteForm.next_date || null,
    }
    try {
      if (noteEditId) {
        const { error } = await supabase.from('selected_notes').update(payload).eq('id', noteEditId)
        if (error) { console.error('저장 오류:', error); throw error }
        setNotes(prev => prev.map(n => n.id === noteEditId ? { ...n, ...payload } : n))
      } else {
        const { data, error } = await supabase.from('selected_notes').insert([payload]).select().single()
        if (error) { console.error('저장 오류:', error); throw error }
        setNotes(prev => [data, ...prev])
      }
      setNoteModal(false)
    } catch (e) { alert('저장 실패: ' + e.message) }
  }

  async function deleteNote(id) {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return
    await supabase.from('selected_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  // ── 엑셀 템플릿 다운로드 ──
  function downloadTemplate() {
    const HEADERS = [
      '기업명*', '대표자*', '사업자번호', '설립연도', '임직원수',
      '대표업태', '대표업종', '아이템',
      '기업유형(테크/로컬/혼합형)', '지역', '성별(남/여)',
      '연락처', '이메일',
      '지원사업명', '세부프로그램',
      '지원시작일(YYYY-MM-DD)', '지원종료일(YYYY-MM-DD)',
      '지원금액(만원)', '지원상태(지원중/완료)', '담당자',
    ]
    const EXAMPLE = [
      '네오투', '강동훈', '393-33-01777', '2020', '5',
      '제조업', '스마트제조', '액화산소 대체 스마트산소발생기',
      '테크', '울산 남구', '남',
      '010-1234-5678', 'neo@example.com',
      '울산창업 U-시리즈', '기술보호',
      '2026-01-01', '2026-12-31',
      '500', '지원중', '장영민',
    ]
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, EXAMPLE])
    ws['!cols'] = [
      { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 8 }, { wch: 8 },
      { wch: 10 }, { wch: 12 }, { wch: 26 },
      { wch: 18 }, { wch: 12 }, { wch: 10 },
      { wch: 14 }, { wch: 20 },
      { wch: 20 }, { wch: 22 },
      { wch: 20 }, { wch: 20 },
      { wch: 12 }, { wch: 16 }, { wch: 10 },
    ]
    HEADERS.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c: ci })
      if (!ws[ref]) return
      ws[ref].s = { fill: { patternType: 'solid', fgColor: { rgb: '2E75B6' } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' } }
    })
    EXAMPLE.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 1, c: ci })
      if (!ws[ref]) return
      ws[ref].s = { fill: { patternType: 'solid', fgColor: { rgb: 'F3F4F6' } }, font: { sz: 10, color: { rgb: '374151' } } }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '선정기업_등록')
    XLSX.writeFile(wb, '선정기업_일괄등록_템플릿.xlsx')
  }

  function handleXlsxFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
      if (rows.length < 2) { alert('데이터가 없습니다.'); return }
      const s = (v) => String(v ?? '').trim()

      // DB에서 최신 기업 목록 조회 (메모리 상태 대신 직접 조회)
      const { data: existingFirms } = await supabase
        .from('selected_firms')
        .select('id, company_name, support_programs')

      const parsed = rows.slice(1).filter(r => r[0]).map(r => {
        const company_name = s(r[0])
        const existing = (existingFirms || []).find(f =>
          f.company_name?.trim() === company_name.trim()
        )
        return {
          company_name, ceo: s(r[1]), biz_no: s(r[2]), found_year: s(r[3]), employees: s(r[4]),
          biz_type: s(r[5]), biz_item: s(r[6]), item: s(r[7]),
          type: s(r[8]) || '테크', region: s(r[9]), gender: s(r[10]),
          phone: s(r[11]), email: s(r[12]),
          program: s(r[13]), sub_program: s(r[14]),
          start_date: s(r[15]), end_date: s(r[16]),
          amount: s(r[17]), status: s(r[18]) || '지원중', staff: s(r[19]),
          isDuplicate: !!existing,
          existingId: existing?.id ?? null,
          existingSP: existing?.support_programs ?? [],
        }
      })
      setXlsxPreview(parsed)
      setXlsxModal(true)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  async function saveBulkXlsx() {
    if (xlsxPreview.length === 0) return

    // 저장 직전 DB 재조회 (미리보기 이후 변경 반영)
    const { data: latestFirms, error: fetchErr } = await supabase
      .from('selected_firms')
      .select('id, company_name, support_programs')
    if (fetchErr) { alert('기업 목록 조회 실패: ' + fetchErr.message); return }

    const resolvedRows = xlsxPreview.map(r => {
      const existing = (latestFirms || []).find(f =>
        f.company_name?.trim() === r.company_name.trim()
      )
      return {
        ...r,
        isDuplicate: !!existing,
        existingId: existing?.id ?? null,
        existingSP: existing?.support_programs ?? [],
      }
    })

    const newRows    = resolvedRows.filter(r => !r.isDuplicate)
    const updateRows = resolvedRows.filter(r => r.isDuplicate)

    // 신규 항목 빌더
    const buildInsertRow = r => ({
      company_name: r.company_name, ceo: r.ceo || null,
      biz_no: r.biz_no || null, found_year: r.found_year || null,
      employees: r.employees ? Number(r.employees) : null,
      biz_type: r.biz_type || null, biz_item: r.biz_item || null,
      sector: (r.biz_type || '') + (r.biz_item ? ' / ' + r.biz_item : '') || null,
      item: r.item || null, type: r.type || '테크',
      region: r.region || null, gender: r.gender || null,
      phone: r.phone || null, email: r.email || null,
      program: r.program || null,
      support_programs: r.program ? [{ program: r.program, sub_program: r.sub_program,
        staff: r.staff, start_date: r.start_date, end_date: r.end_date,
        amount: r.amount ? Number(r.amount) : null, status: r.status || '지원중' }] : [],
      staff: r.staff || null,
      start_date: r.start_date || today(), end_date: r.end_date || null,
      amount: r.amount ? Number(r.amount) : null, status: r.status || '지원중',
    })

    try {
      let insertedCount = 0
      let updatedCount  = 0

      // ── 신규 insert ──
      if (newRows.length > 0) {
        const { data, error } = await supabase
          .from('selected_firms').insert(newRows.map(buildInsertRow)).select()
        if (error) { console.error('신규 등록 오류:', error); throw error }
        setFirms(prev => [...(data || []), ...prev])
        insertedCount = (data || []).length
      }

      // ── 중복 update ──
      for (const r of updateRows) {
        // support_programs: 기존 배열에 새 항목 추가 (program+sub_program 동일하면 스킵)
        const newSP = r.program ? {
          program: r.program, sub_program: r.sub_program,
          staff: r.staff, start_date: r.start_date, end_date: r.end_date,
          amount: r.amount ? Number(r.amount) : null, status: r.status || '지원중',
        } : null
        const existingSP = Array.isArray(r.existingSP) ? r.existingSP : []
        const alreadyHasSP = newSP && existingSP.some(sp =>
          sp.program === newSP.program && sp.sub_program === newSP.sub_program
        )
        const mergedSP = newSP && !alreadyHasSP ? [...existingSP, newSP] : existingSP
        const firstSP = mergedSP[0]

        const updatePayload = {
          // 업데이트 항목 (최신 엑셀 데이터로 덮어씀)
          ceo:      r.ceo      || null,
          phone:    r.phone    || null,
          email:    r.email    || null,
          biz_type: r.biz_type || null,
          biz_item: r.biz_item || null,
          sector:   (r.biz_type || '') + (r.biz_item ? ' / ' + r.biz_item : '') || null,
          item:     r.item     || null,
          staff:    r.staff    || null,
          // support_programs 병합
          support_programs: mergedSP,
          program:    firstSP?.program    || null,
          start_date: firstSP?.start_date || null,
          end_date:   firstSP?.end_date   || null,
          amount:     firstSP?.amount     ?? null,
          status:     mergedSP.every(sp => sp.status === '완료') ? '완료' : '지원중',
        }

        const { error } = await supabase
          .from('selected_firms').update(updatePayload).eq('id', r.existingId)
        if (error) { console.error('업데이트 오류:', error); throw error }
        setFirms(prev => prev.map(f =>
          f.id === r.existingId ? { ...f, ...updatePayload } : f
        ))
        updatedCount++
      }

      setXlsxModal(false)
      setXlsxPreview([])
      alert(`신규 등록 ${insertedCount}개, 업데이트 ${updatedCount}개 완료`)
    } catch (e) { alert('일괄 저장 실패: ' + e.message) }
  }

  const filteredFirms = firms.filter(f =>
    (!search || f.company_name?.includes(search) || f.ceo?.includes(search)) &&
    (!filterProgram || f.program === filterProgram) &&
    (!filterStatus || f.status === filterStatus)
  )

  const inProg = firms.filter(f => f.status === '지원중').length
  const done = firms.filter(f => f.status === '완료').length
  const totalAmt = firms.reduce((a, f) => a + (Number(f.amount) || 0), 0)
  const postCount = firms.filter(f => f.post_mgmt === '후속관리중').length
  const programs = [...new Set(firms.map(f => f.program).filter(Boolean))]
  const staffOptions = profiles.length > 0 ? profiles.map(p => p.name || p.email) : settings.staff

  // 현재 폼의 전역 상태 (지원사업 중 하나라도 '지원중'이면 '지원중')
  const formGlobalStatus = firmForm.support_programs.every(sp => sp.status === '완료') ? '완료' : '지원중'

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-800">선정기업 관리</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 선정기업" value={`${firms.length}개사`} color="blue" />
        <StatCard label="지원 진행중" value={`${inProg}개사`} color="orange" />
        <StatCard label="지원 완료" value={`${done}개사`} color="green" />
        <StatCard label="총 지원금액" value={`${totalAmt >= 10000 ? (totalAmt / 10000).toFixed(1) + '억' : totalAmt.toLocaleString() + '만'}`} sub={`후속관리 ${postCount}개사`} color="teal" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[['list', '기업 목록'], ['program', '사업별 현황'], ['post', '사후관리']].map(([k, l]) => (
            <button key={k} onClick={() => setActiveTab(k)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === k ? 'bg-white text-gray-800 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXlsxFile} />
          <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download size={14} /> 템플릿
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Upload size={14} /> 일괄 등록 (Excel)
          </button>
          <button onClick={openAddFirm} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: '#2E75B6' }}>
            <Plus size={15} /> 선정기업 등록
          </button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg w-44" placeholder="기업명·대표자 검색" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterProgram} onChange={e => setFilterProgram(e.target.value)}>
            <option value="">전체 사업</option>
            {programs.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">전체 상태</option>
            <option>지원중</option><option>완료</option>
          </select>
        </div>
      )}

      {loading ? <div className="text-center py-16 text-gray-400">로딩 중...</div> :
        activeTab === 'list' ? <FirmListTab firms={filteredFirms} notes={notes} onEdit={openEditFirm} onDelete={deleteFirm} onDetail={openDetail} /> :
        activeTab === 'program' ? <ProgramTab firms={firms} /> :
        <PostTab firms={firms} notes={notes} onAddNote={openAddNote} onDeleteNote={deleteNote} />
      }

      {/* ── 선정기업 등록/수정 모달 ── */}
      <Modal isOpen={firmModal} onClose={() => setFirmModal(false)} title={firmEditId ? '선정기업 수정' : '선정기업 등록'} wide
        footer={
          <>
            <button onClick={() => setFirmModal(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={saveFirm} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>저장</button>
          </>
        }
      >
        <div className="space-y-3">
          {/* 기업 기본 정보 */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-3">
            <div className="text-xs font-semibold text-gray-600">기업 기본 정보</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">기업명 *</label><input className="form-input" value={firmForm.company_name} onChange={e => setFF('company_name', e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">대표자 *</label><input className="form-input" value={firmForm.ceo} onChange={e => setFF('ceo', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">사업자번호</label><input className="form-input" value={firmForm.biz_no} onChange={e => setFF('biz_no', e.target.value)} placeholder="000-00-00000" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">설립연도</label><input className="form-input" value={firmForm.found_year} onChange={e => setFF('found_year', e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">임직원수</label><input type="number" className="form-input" value={firmForm.employees} onChange={e => setFF('employees', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">대표 업태</label><input className="form-input" value={firmForm.biz_type} onChange={e => setFF('biz_type', e.target.value)} placeholder="제조업, 서비스업" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">대표 종목</label><input className="form-input" value={firmForm.biz_item} onChange={e => setFF('biz_item', e.target.value)} placeholder="소프트웨어 개발" /></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">아이템</label><input className="form-input" value={firmForm.item} onChange={e => setFF('item', e.target.value)} placeholder="주요 제품/서비스 아이템" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">기업 유형</label>
                <select className="form-input" value={firmForm.type} onChange={e => setFF('type', e.target.value)}>
                  <option>테크</option><option>로컬</option><option>혼합형</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">지역</label>
                <select className="form-input" value={firmForm.region} onChange={e => setFF('region', e.target.value)}>
                  <option value="">선택</option>
                  {ULSAN_REGIONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">성별(대표자)</label>
                <select className="form-input" value={firmForm.gender} onChange={e => setFF('gender', e.target.value)}>
                  <option value="">선택</option><option>남</option><option>여</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">연락처</label><input className="form-input" value={firmForm.phone} onChange={e => setFF('phone', e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">이메일</label><input className="form-input" value={firmForm.email} onChange={e => setFF('email', e.target.value)} /></div>
            </div>
          </div>

          {/* 지원사업 정보 - 다중 */}
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-blue-800">지원사업 정보</div>
              <button type="button" onClick={addSP} className="text-xs text-white px-2 py-1 rounded flex items-center gap-1" style={{ background: '#2E75B6' }}>
                <Plus size={12} /> 지원사업 추가
              </button>
            </div>

            {firmForm.support_programs.map((sp, idx) => {
              const isCustom = sp.program && !settings.programs.includes(sp.program)
              const year = sp.start_date?.slice(0, 4) || ''
              return (
                <div key={idx} className="bg-white rounded-lg p-3 border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-blue-700">지원사업 {idx + 1}{year ? ` (${year}년)` : ''}</span>
                    {firmForm.support_programs.length > 1 && (
                      <button type="button" onClick={() => removeSP(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* 지원사업명 (드롭다운 + 직접입력) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">지원사업명{idx === 0 && ' *'}</label>
                      {isCustom ? (
                        <div className="flex gap-1">
                          <input className="form-input flex-1" value={sp.program} onChange={e => setSP(idx, 'program', e.target.value)} placeholder="직접 입력" />
                          <button type="button" onClick={() => setSP(idx, 'program', '')} className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-300 rounded"><X size={12} /></button>
                        </div>
                      ) : (
                        <select className="form-input" value={sp.program} onChange={e => setSP(idx, 'program', e.target.value)}>
                          <option value="">선택</option>
                          {settings.programs.map(p => <option key={p}>{p}</option>)}
                          <option value="__custom__">✏️ 직접입력</option>
                        </select>
                      )}
                      {sp.program === '__custom__' && (
                        <input className="form-input mt-1" autoFocus placeholder="사업명 입력"
                          onChange={e => setSP(idx, 'program', e.target.value || '__custom__')} />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">세부 프로그램</label>
                      <input className="form-input" value={sp.sub_program} onChange={e => setSP(idx, 'sub_program', e.target.value)} placeholder="예: 비즈니스 모델 혁신 트랙" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">담당자</label>
                      <select className="form-input" value={sp.staff} onChange={e => setSP(idx, 'staff', e.target.value)}>
                        <option value="">선택</option>
                        {staffOptions.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">지원 시작일</label>
                      <input type="date" className="form-input" value={sp.start_date} onChange={e => setSP(idx, 'start_date', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">지원 종료일</label>
                      <input type="date" className="form-input" value={sp.end_date} onChange={e => setSP(idx, 'end_date', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">지원금액(만원)</label>
                      <input type="number" className="form-input" value={sp.amount} onChange={e => setSP(idx, 'amount', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">지원 상태</label>
                      <select className="form-input" value={sp.status} onChange={e => setSP(idx, 'status', e.target.value)}>
                        <option>지원중</option><option>완료</option>
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}

            {formGlobalStatus === '완료' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">사후관리 상태</label>
                <select className="form-input" value={firmForm.post_mgmt} onChange={e => setFF('post_mgmt', e.target.value)}>
                  <option>후속관리중</option><option>성장추적중</option><option>완료</option>
                </select>
              </div>
            )}
          </div>

          <div><label className="block text-xs font-medium text-gray-600 mb-1">메모</label><textarea className="form-input" value={firmForm.memo} onChange={e => setFF('memo', e.target.value)} /></div>
        </div>
      </Modal>

      {/* ── 사후관리 기록 모달 ── */}
      <Modal isOpen={noteModal} onClose={() => setNoteModal(false)} title="사후관리 기록 추가"
        footer={
          <>
            <button onClick={() => setNoteModal(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={saveNote} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>저장</button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">기업 *</label>
              <select className="form-input" value={noteForm.firm_id} onChange={e => setNF('firm_id', e.target.value)}>
                <option value="">선택</option>
                {firms.map(f => <option key={f.id} value={f.id}>{f.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">담당자</label>
              <select className="form-input" value={noteForm.staff} onChange={e => setNF('staff', e.target.value)}>
                <option value="">선택</option>
                {staffOptions.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">방문/연락일 *</label><input type="date" className="form-input" value={noteForm.date} onChange={e => setNF('date', e.target.value)} /></div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">관리 유형</label>
              <select className="form-input" value={noteForm.type} onChange={e => setNF('type', e.target.value)}>
                {NOTE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">내용 *</label><textarea className="form-input" rows={3} value={noteForm.content} onChange={e => setNF('content', e.target.value)} /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">다음 관리 예정일</label><input type="date" className="form-input" value={noteForm.next_date} onChange={e => setNF('next_date', e.target.value)} /></div>
        </div>
      </Modal>

      {/* ── 엑셀 일괄 등록 미리보기 모달 ── */}
      <Modal isOpen={xlsxModal} onClose={() => { setXlsxModal(false); setXlsxPreview([]) }}
        title={`엑셀 일괄 등록 미리보기 — 신규 ${xlsxPreview.filter(r=>!r.isDuplicate).length}개 / 업데이트 ${xlsxPreview.filter(r=>r.isDuplicate).length}개`} wide
        footer={
          <>
            <button onClick={() => { setXlsxModal(false); setXlsxPreview([]) }} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={saveBulkXlsx} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>일괄 저장</button>
          </>
        }
      >
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200" style={{ background: '#2E75B6' }}>
                {['구분','기업명','대표자','사업자번호','설립연도','임직원','업태','업종','아이템','유형','지역','성별','연락처','이메일','지원사업명','세부프로그램','시작일','종료일','지원금(만)','상태','담당자'].map(h => (
                  <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap" style={{ color: '#fff' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {xlsxPreview.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-blue-50">
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {r.isDuplicate
                      ? <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs font-medium">업데이트</span>
                      : <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">신규</span>
                    }
                  </td>
                  <td className="px-2 py-1.5 font-semibold text-blue-700 whitespace-nowrap">{r.company_name}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.ceo}</td>
                  <td className="px-2 py-1.5 text-gray-500">{r.biz_no}</td>
                  <td className="px-2 py-1.5 text-gray-500">{r.found_year}</td>
                  <td className="px-2 py-1.5 text-gray-500">{r.employees}</td>
                  <td className="px-2 py-1.5 text-gray-500">{r.biz_type}</td>
                  <td className="px-2 py-1.5 text-gray-500">{r.biz_item}</td>
                  <td className="px-2 py-1.5 max-w-[120px] truncate">{r.item}</td>
                  <td className="px-2 py-1.5">{r.type}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.region}</td>
                  <td className="px-2 py-1.5">{r.gender}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.phone}</td>
                  <td className="px-2 py-1.5 text-gray-500">{r.email}</td>
                  <td className="px-2 py-1.5 text-blue-600 whitespace-nowrap">{r.program}</td>
                  <td className="px-2 py-1.5 text-gray-500">{r.sub_program}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.start_date}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.end_date}</td>
                  <td className="px-2 py-1.5 font-bold text-green-700">{r.amount}</td>
                  <td className="px-2 py-1.5"><span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded">{r.status}</span></td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{r.staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* ── 상세 모달 ── */}
      {detailFirm && (
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`${detailFirm.company_name} 상세`} wide>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
            {[['info', '기업정보'], ['consult', `상담일지 (${detailConsults.length})`], ['post', `사후관리 (${notes.filter(n => n.firm_id === detailFirm.id).length})`]].map(([k, l]) => (
              <button key={k} onClick={() => setDetailTab(k)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex-1 ${detailTab === k ? 'bg-white text-gray-800 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* 기업정보 탭 */}
          {detailTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[['대표자', detailFirm.ceo], ['사업자번호', detailFirm.biz_no], ['설립연도', detailFirm.found_year],
                  ['업종', detailFirm.sector], ['아이템', detailFirm.item], ['지역', detailFirm.region],
                  ['임직원수', detailFirm.employees ? detailFirm.employees + '명' : '-'],
                  ['연락처', detailFirm.phone], ['기업유형', detailFirm.type]].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-gray-400">{l}</div>
                    <div className="text-sm font-medium text-gray-700">{v || '-'}</div>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <div className="text-xs font-semibold text-blue-700 mb-2">지원사업 정보</div>
                {(Array.isArray(detailFirm.support_programs) && detailFirm.support_programs.length > 0
                  ? detailFirm.support_programs
                  : detailFirm.program ? [{ program: detailFirm.program, sub_program: detailFirm.sub_program,
                      staff: detailFirm.staff, start_date: detailFirm.start_date, end_date: detailFirm.end_date,
                      amount: detailFirm.amount, status: detailFirm.status }] : []
                ).map((sp, i) => (
                  <div key={i} className="mb-2 pb-2 border-b border-blue-100 last:border-0 last:mb-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">{sp.program}</span>
                      {sp.sub_program && <span className="text-xs text-gray-500">{sp.sub_program}</span>}
                      {sp.status && <StatusBadge status={sp.status} />}
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-xs text-gray-500">
                      {sp.start_date && <span>시작: {sp.start_date}</span>}
                      {sp.end_date && <span>종료: {sp.end_date}</span>}
                      {sp.amount && <span className="font-semibold text-green-700">{Number(sp.amount).toLocaleString()}만원</span>}
                      {sp.staff && <span>담당: {sp.staff}</span>}
                    </div>
                  </div>
                ))}
                {detailFirm.post_mgmt && (
                  <div className="mt-2 text-xs text-gray-500">사후관리: <span className="font-medium text-orange-600">{detailFirm.post_mgmt}</span></div>
                )}
              </div>
              {detailFirm.memo && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                  <div className="font-semibold text-gray-500 mb-1">메모</div>
                  {detailFirm.memo}
                </div>
              )}
            </div>
          )}

          {/* 상담일지 탭 */}
          {detailTab === 'consult' && (
            <div className="min-h-[200px]">
              {/* 새 상담 추가 폼 */}
              {consultForm ? (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 mb-3 space-y-2">
                  <div className="text-xs font-semibold text-blue-700 mb-1">새 상담 등록</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="block text-xs text-gray-600 mb-1">상담일</label><input type="date" className="form-input" value={consultForm.date} onChange={e => setCF('date', e.target.value)} /></div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">방법</label>
                      <select className="form-input" value={consultForm.method} onChange={e => setCF('method', e.target.value)}>
                        {['방문상담', '화상상담', '전화상담', '이메일', '기타'].map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">담당자</label>
                      <select className="form-input" value={consultForm.assignee} onChange={e => setCF('assignee', e.target.value)}>
                        <option value="">선택</option>
                        {staffOptions.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label className="block text-xs text-gray-600 mb-1">내용 *</label><textarea className="form-input" rows={2} value={consultForm.content} onChange={e => setCF('content', e.target.value)} /></div>
                  <div><label className="block text-xs text-gray-600 mb-1">결과</label><input className="form-input" value={consultForm.result} onChange={e => setCF('result', e.target.value)} placeholder="상담 결과 요약" /></div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">상태</label>
                    <select className="form-input" value={consultForm.status} onChange={e => setCF('status', e.target.value)}>
                      <option>상담완료</option><option>후속필요</option>
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end mt-1">
                    <button onClick={() => setConsultForm(null)} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">취소</button>
                    <button onClick={saveConsult} className="px-3 py-1 text-xs text-white rounded" style={{ background: '#2E75B6' }}>저장</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end mb-3">
                  <button onClick={() => setConsultForm(emptyConsultForm())} className="text-xs text-white px-2.5 py-1.5 rounded flex items-center gap-1" style={{ background: '#2E75B6' }}>
                    <Plus size={12} /> 상담 등록
                  </button>
                </div>
              )}

              {consultsLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">로딩 중...</div>
              ) : detailConsults.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">등록된 상담일지가 없습니다</div>
              ) : detailConsults.map(c => (
                <div key={c.id} className="flex gap-3 py-3 border-b border-gray-100">
                  <div className="min-w-[80px] text-xs text-gray-400">{c.date}</div>
                  <div className="flex-1">
                    <div className="flex gap-2 mb-1 flex-wrap items-center">
                      {c.method && <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">{c.method}</span>}
                      {c.assignee && <span className="text-xs text-gray-500">{c.assignee}</span>}
                      {c.status && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ml-auto ${c.status === '상담완료' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{c.status}</span>
                      )}
                    </div>
                    {c.content && <div className="text-sm text-gray-700 mb-1">{c.content}</div>}
                    {c.result && <div className="text-xs text-teal-700 bg-teal-50 rounded px-2 py-1">결과: {c.result}</div>}
                    {c.next_date && <div className="text-xs text-orange-600 mt-1">다음 상담 예정: {c.next_date}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 사후관리 탭 */}
          {detailTab === 'post' && (
            <div className="min-h-[200px]">
              <div className="flex justify-end mb-3">
                <button onClick={() => { setDetailOpen(false); openAddNote(detailFirm.id) }} className="text-xs text-white px-2.5 py-1.5 rounded flex items-center gap-1" style={{ background: '#2E75B6' }}>
                  <Plus size={12} /> 기록 추가
                </button>
              </div>
              {notes.filter(n => n.firm_id === detailFirm.id).length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">사후관리 기록이 없습니다</div>
              ) : notes.filter(n => n.firm_id === detailFirm.id).map(n => (
                <div key={n.id} className="flex gap-3 py-2.5 border-b border-gray-100">
                  <span className="text-xs text-gray-400 min-w-[80px]">{n.date}</span>
                  <div className="flex-1">
                    <div className="flex gap-2 mb-1">
                      <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">{n.type}</span>
                      <span className="text-xs text-gray-500">{n.staff}</span>
                      {n.next_date && <span className="text-xs text-teal-600 ml-auto">다음: {n.next_date}</span>}
                    </div>
                    <div className="text-sm text-gray-700">{n.content}</div>
                  </div>
                  <button onClick={() => deleteNote(n.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDetailOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg">닫기</button>
            <button onClick={() => { setDetailOpen(false); openEditFirm(detailFirm) }} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>편집</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FirmListTab({ firms, notes, onEdit, onDelete, onDetail }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {['기업명', '대표자', '업종/아이템', '유형', '지원사업', '지원기간', '지원금(만원)', '담당', '상태', '사후관리', '관리'].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {firms.length === 0 ? (
            <tr><td colSpan={11} className="text-center py-10 text-gray-400 text-sm">등록된 선정기업이 없습니다</td></tr>
          ) : firms.map(f => {
            const lastNote = notes.filter(n => n.firm_id === f.id).sort((a, b) => b.date.localeCompare(a.date))[0]
            const spList = Array.isArray(f.support_programs) && f.support_programs.length > 0
              ? f.support_programs : f.program ? [{ program: f.program, sub_program: f.sub_program }] : []
            return (
              <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2.5">
                  <button onClick={() => onDetail(f)} className="font-bold text-blue-600 underline text-xs">{f.company_name}</button>
                </td>
                <td className="px-3 py-2.5 text-xs">{f.ceo}</td>
                <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[100px]">
                  <div className="truncate">{f.sector}</div>
                  {f.item && <div className="text-gray-400 truncate">{f.item}</div>}
                </td>
                <td className="px-3 py-2.5"><VerdictBadge verdict={f.type} /></td>
                <td className="px-3 py-2.5 text-xs font-medium max-w-[120px]">
                  {spList.map((sp, i) => (
                    <div key={i} className="truncate">{sp.program}{sp.sub_program && <span className="text-gray-400"> · {sp.sub_program}</span>}</div>
                  ))}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{f.start_date}<br />{f.end_date || <span className="text-orange-500">진행중</span>}</td>
                <td className="px-3 py-2.5 text-xs font-bold text-green-700">{f.amount ? Number(f.amount).toLocaleString() : '-'}</td>
                <td className="px-3 py-2.5 text-xs">{f.staff}</td>
                <td className="px-3 py-2.5"><StatusBadge status={f.status} /></td>
                <td className="px-3 py-2.5">
                  {f.post_mgmt ? (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${f.post_mgmt === '후속관리중' ? 'bg-orange-100 text-orange-700' : f.post_mgmt === '성장추적중' ? 'bg-teal-100 text-teal-700' : 'bg-green-100 text-green-700'}`}>{f.post_mgmt}</span>
                  ) : <span className="text-xs text-gray-300">-</span>}
                  {lastNote && <div className="text-xs text-gray-400 mt-0.5">{lastNote.date}</div>}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => onDetail(f)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Eye size={12} /></button>
                    <button onClick={() => onEdit(f)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil size={12} /></button>
                    <button onClick={() => onDelete(f.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
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

function ProgramTab({ firms }) {
  const byProg = {}
  firms.forEach(f => { if (!byProg[f.program]) byProg[f.program] = []; byProg[f.program].push(f) })
  return (
    <div className="space-y-4">
      {Object.entries(byProg).map(([prog, list]) => {
        const total = list.reduce((a, f) => a + (Number(f.amount) || 0), 0)
        const inProg = list.filter(f => f.status === '지원중').length
        return (
          <div key={prog} className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div><span className="font-semibold text-gray-800">{prog}</span><span className="text-xs text-gray-400 ml-2">총 {list.length}개사</span></div>
              <div className="flex gap-4"><span className="text-xs text-orange-600">진행중 {inProg}개사</span><span className="text-sm font-bold text-green-700">{total.toLocaleString()}만원</span></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['기업명', '대표자', '아이템', '유형', '지원기간', '지원금', '담당', '상태'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {list.map(f => (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs font-semibold">{f.company_name}</td>
                      <td className="px-4 py-2 text-xs">{f.ceo}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 max-w-[100px] truncate">{f.item || '-'}</td>
                      <td className="px-4 py-2"><VerdictBadge verdict={f.type} /></td>
                      <td className="px-4 py-2 text-xs text-gray-500">{f.start_date} ~ {f.end_date || '진행중'}</td>
                      <td className="px-4 py-2 text-xs font-bold text-green-700">{f.amount ? Number(f.amount).toLocaleString() + ' 만' : '-'}</td>
                      <td className="px-4 py-2 text-xs">{f.staff}</td>
                      <td className="px-4 py-2"><StatusBadge status={f.status} /></td>
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

function PostTab({ firms, notes, onAddNote, onDeleteNote }) {
  const targets = firms.filter(f => f.post_mgmt !== '완료')
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => onAddNote()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: '#2E75B6' }}>
          <Plus size={15} /> 사후관리 기록 추가
        </button>
      </div>
      {targets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">사후관리 대상 기업이 없습니다</div>
      ) : targets.map(f => {
        const fNotes = notes.filter(n => n.firm_id === f.id).sort((a, b) => b.date.localeCompare(a.date))
        const lastNote = fNotes[0]
        const overdue = lastNote?.next_date && lastNote.next_date < today()
        return (
          <div key={f.id} className={`bg-white rounded-xl border shadow-sm ${overdue ? 'border-red-300' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Avatar name={f.company_name} />
                <div>
                  <div className="font-bold text-sm text-gray-800">{f.company_name}</div>
                  <div className="text-xs text-gray-400">{f.program} · 담당: {f.staff}</div>
                </div>
                {f.post_mgmt && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ml-1 ${f.post_mgmt === '후속관리중' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>{f.post_mgmt}</span>
                )}
                {overdue && <span className="bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded font-medium">다음관리 기한 초과!</span>}
              </div>
              <button onClick={() => onAddNote(f.id)} className="text-xs text-white px-2 py-1 rounded" style={{ background: '#2E75B6' }}>+ 기록 추가</button>
            </div>
            <div className="p-4">
              {fNotes.length === 0 ? (
                <div className="text-xs text-gray-400">관리 기록이 없습니다</div>
              ) : fNotes.slice(0, 3).map(n => (
                <div key={n.id} className="flex gap-3 py-2.5 border-b border-gray-100">
                  <span className="text-xs text-gray-400 min-w-[80px]">{n.date}</span>
                  <div className="flex-1">
                    <div className="flex gap-2 mb-1 flex-wrap">
                      <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">{n.type}</span>
                      <span className="text-xs text-gray-500">{n.staff}</span>
                      {n.next_date && <span className={`text-xs ml-auto ${n.next_date < today() ? 'text-red-500' : 'text-teal-600'}`}>다음: {n.next_date}</span>}
                    </div>
                    <div className="text-sm text-gray-700">{n.content}</div>
                  </div>
                  <button onClick={() => onDeleteNote(n.id)} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
