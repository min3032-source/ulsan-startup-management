import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ULSAN_REGIONS, DEFAULT_SETTINGS, NOTE_TYPES, today, fmtAmt } from '../../lib/constants'
import { VerdictBadge, StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Plus, Search, Pencil, Trash2, Eye, Upload, Download, X, TrendingUp } from 'lucide-react'
import * as XLSX from 'xlsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// ─────────────────────────────────────────────
// 빈 폼 생성 함수
// ─────────────────────────────────────────────
const emptySpItem = () => ({
  program: '', sub_program: '', staff: '',
  start_date: today(), end_date: '', amount: '', status: '지원중',
})

const emptyFirmForm = () => ({
  company_name: '', ceo: '', biz_no: '', founded_date: '', employees: '',
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

  // 엑셀 일괄 등록 (선정기업)
  const [xlsxUploadModal, setXlsxUploadModal] = useState(false)
  const [xlsxModal, setXlsxModal] = useState(false)
  const [xlsxPreview, setXlsxPreview] = useState([])
  const [xlsxParsing, setXlsxParsing] = useState(false)
  const fileInputRef = useRef(null)

  // 성장지표
  const [detailMetrics, setDetailMetrics] = useState([])
  const [metricsLoading, setMetricsLoading] = useState(false)
  const emptyMetricForm = () => ({ year: new Date().getFullYear(), period_type: '연도', period_label: '', revenue: '', employees: '', investment: '', export_amount: '', patent_count: '', memo: '' })
  const [metricForm, setMetricForm] = useState(null) // null=숨김
  // 엑셀 일괄 등록 (성장지표)
  const [gmUploadModal, setGmUploadModal] = useState(false)
  const [gmPreviewModal, setGmPreviewModal] = useState(false)
  const [gmPreview, setGmPreview] = useState([])
  const [gmParsing, setGmParsing] = useState(false)
  const gmFileRef = useRef(null)

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
      founded_date: f.founded_date || '', employees: f.employees || '',
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
      founded_date: firmForm.founded_date || null,
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
    setDetailMetrics([])
    setConsultForm(null)
    setMetricForm(null)
    setDetailOpen(true)
    loadDetailConsults(f.id)
    loadDetailMetrics(f.id)
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

  async function loadDetailMetrics(firmId) {
    setMetricsLoading(true)
    try {
      const { data, error } = await supabase
        .from('growth_metrics').select('*').eq('firm_id', firmId)
        .order('year', { ascending: true }).order('period_label', { ascending: true })
      if (error) console.error('성장지표 조회 오류:', error)
      setDetailMetrics(data || [])
    } catch (e) { console.error(e) }
    finally { setMetricsLoading(false) }
  }

  async function saveMetric() {
    if (!metricForm || !metricForm.year || !metricForm.period_label) { alert('연도와 기간 라벨을 입력해주세요'); return }
    const payload = {
      firm_id: detailFirm.id,
      year: Number(metricForm.year),
      period_type: metricForm.period_type,
      period_label: metricForm.period_label,
      revenue:       metricForm.revenue       ? Number(metricForm.revenue)       : null,
      employees:     metricForm.employees     ? Number(metricForm.employees)     : null,
      investment:    metricForm.investment    ? Number(metricForm.investment)    : null,
      export_amount: metricForm.export_amount ? Number(metricForm.export_amount) : null,
      patent_count:  metricForm.patent_count  ? Number(metricForm.patent_count)  : null,
      memo: metricForm.memo || null,
    }
    try {
      const { data, error } = await supabase.from('growth_metrics').insert([payload]).select().single()
      if (error) throw error
      setDetailMetrics(prev => [...prev, data].sort((a, b) => a.period_label.localeCompare(b.period_label)))
      setMetricForm(null)
    } catch (e) { alert('저장 실패: ' + e.message) }
  }

  async function deleteMetric(id) {
    if (!confirm('이 성장지표를 삭제하시겠습니까?')) return
    const { error } = await supabase.from('growth_metrics').delete().eq('id', id)
    if (!error) setDetailMetrics(prev => prev.filter(m => m.id !== id))
  }

  // 성장지표 기간 라벨 자동 생성
  function getPeriodLabel(year, type, half, quarter) {
    if (type === '연도') return `${year}년`
    if (type === '반기') return `${year}년 ${half}`
    if (type === '분기') return `${year}년 ${quarter}`
    return ''
  }

  // 성장지표 엑셀 템플릿 다운로드
  function downloadGmTemplate() {
    const HEADERS = ['기업명*', '연도*', '기간유형(연도/반기/분기)*', '기간라벨*', '매출액(원)', '고용인원', '투자유치(원)', '수출액(원)', '특허건수', '메모']
    const EXAMPLE = ['네오투', '2025', '연도', '2025년', '5000', '10', '3000', '500', '2', '전년 대비 성장']
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, EXAMPLE])
    ws['!cols'] = HEADERS.map((h, i) => ({ wch: [14,8,18,16,12,8,12,10,8,20][i] }))
    HEADERS.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 0, c: ci })
      if (ws[ref]) ws[ref].s = { fill: { patternType: 'solid', fgColor: { rgb: '1E5631' } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, alignment: { horizontal: 'center' } }
    })
    EXAMPLE.forEach((_, ci) => {
      const ref = XLSX.utils.encode_cell({ r: 1, c: ci })
      if (ws[ref]) ws[ref].s = { fill: { patternType: 'solid', fgColor: { rgb: 'F3F4F6' } }, font: { sz: 10 } }
    })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '성장지표_등록')
    XLSX.writeFile(wb, '기업성장지표_일괄등록_템플릿.xlsx')
  }

  // 성장지표 엑셀 파싱
  async function handleGmFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setGmParsing(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const s = v => String(v ?? '').trim()
      const dataRows = rows.slice(1).filter(r => s(r[0]) && s(r[1]))
      if (dataRows.length === 0) { alert('유효한 데이터 행이 없습니다.'); return }

      // 기업 목록 및 기존 성장지표 조회
      const [{ data: firmList }, { data: existingGm }] = await Promise.all([
        supabase.from('selected_firms').select('id, company_name'),
        supabase.from('growth_metrics').select('id, firm_id, year, period_label'),
      ])
      const parsed = dataRows.map(r => {
        const company_name = s(r[0])
        const firm = (firmList || []).find(f => f.company_name?.trim() === company_name)
        const year = Number(s(r[1])) || null
        const period_label = s(r[3])
        const dup = firm && (existingGm || []).find(g => g.firm_id === firm.id && g.year === year && g.period_label === period_label)
        return {
          company_name, firm_id: firm?.id ?? null,
          year, period_type: s(r[2]) || '연도', period_label,
          revenue:       s(r[4]) ? Number(s(r[4])) : null,
          employees:     s(r[5]) ? Number(s(r[5])) : null,
          investment:    s(r[6]) ? Number(s(r[6])) : null,
          export_amount: s(r[7]) ? Number(s(r[7])) : null,
          patent_count:  s(r[8]) ? Number(s(r[8])) : null,
          memo: s(r[9]) || null,
          firmFound:   !!firm,
          isDuplicate: !!dup,
          dupId:       dup?.id ?? null,
        }
      })
      setGmPreview(parsed)
      setGmUploadModal(false)
      setGmPreviewModal(true)
    } catch (err) {
      alert('파일 분석 실패: ' + err.message)
    } finally {
      setGmParsing(false)
    }
  }

  // 성장지표 일괄 저장
  async function saveGmBulk() {
    if (gmPreview.length === 0) return
    const valid = gmPreview.filter(r => r.firmFound)
    if (valid.length === 0) { alert('매칭된 기업이 없습니다. 기업명을 확인해주세요.'); return }

    const newRows = valid.filter(r => !r.isDuplicate)
    const updateRows = valid.filter(r => r.isDuplicate)
    const buildRow = r => ({ firm_id: r.firm_id, year: r.year, period_type: r.period_type, period_label: r.period_label, revenue: r.revenue, employees: r.employees, investment: r.investment, export_amount: r.export_amount, patent_count: r.patent_count, memo: r.memo })
    try {
      let inserted = 0, updated = 0
      if (newRows.length > 0) {
        const { data, error } = await supabase.from('growth_metrics').insert(newRows.map(buildRow)).select()
        if (error) throw error
        inserted = (data || []).length
      }
      for (const r of updateRows) {
        const { error } = await supabase.from('growth_metrics').update(buildRow(r)).eq('id', r.dupId)
        if (error) throw error
        updated++
      }
      setGmPreviewModal(false)
      setGmPreview([])
      alert(`성장지표 신규 ${inserted}개, 업데이트 ${updated}개 완료`)
    } catch (err) { alert('저장 실패: ' + err.message) }
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
      '기업명*', '대표자*', '사업자번호', '설립연월일', '임직원수',
      '대표업태', '대표업종', '아이템',
      '기업유형(테크/로컬/혼합형)', '지역', '성별(남/여)',
      '연락처', '이메일',
      '지원사업명', '세부프로그램',
      '지원시작일(YYYY-MM-DD)', '지원종료일(YYYY-MM-DD)',
      '지원금액(만원)', '지원상태(지원중/완료)', '담당자',
    ]
    const EXAMPLE = [
      '네오투', '강동훈', '393-33-01777', '2020-01-01', '5',
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

  // 엑셀 날짜 직렬값(예: 46129) → 'YYYY-MM-DD' 변환
  function excelDateToString(value) {
    if (!value && value !== 0) return null
    if (typeof value === 'string' && value.includes('-')) return value  // 이미 문자열 날짜
    const num = Number(value)
    if (isNaN(num) || num < 1) return String(value) || null
    const date = new Date((num - 25569) * 86400 * 1000)
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  async function handleXlsxFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setXlsxParsing(true)
    try {
      // ArrayBuffer 방식으로 안정적으로 파싱
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      const s = (v) => String(v ?? '').trim()
      const dataRows = rows.slice(1).filter(r => s(r[0])) // 헤더 제외, 기업명 있는 행만
      if (dataRows.length === 0) { alert('유효한 데이터 행이 없습니다.'); return }

      // DB에서 최신 기업 목록 직접 조회
      const { data: existingFirms, error: dbErr } = await supabase
        .from('selected_firms')
        .select('id, company_name, ceo, support_programs')
      if (dbErr) throw dbErr

      const parsed = dataRows.map(r => {
        const company_name = s(r[0])
        const ceo = s(r[1])
        // 기업명 + 대표자 둘 다 일치해야 같은 기업으로 판단
        const existing = (existingFirms || []).find(f =>
          f.company_name?.trim() === company_name &&
          f.ceo?.trim() === ceo
        )
        const baseSP = existing?.support_programs ?? []
        const program = s(r[13])
        const sub_program = s(r[14])
        // 동일 지원사업+세부프로그램이 없을 때만 추가 대상
        const isSpAdded = !!existing && !!program &&
          !baseSP.some(sp => sp.program === program && sp.sub_program === sub_program)
        return {
          company_name, ceo, biz_no: s(r[2]),
          founded_date: excelDateToString(r[3]),
          employees: s(r[4]),
          biz_type: s(r[5]), biz_item: s(r[6]), item: s(r[7]),
          type: s(r[8]) || '테크', region: s(r[9]), gender: s(r[10]),
          phone: s(r[11]), email: s(r[12]),
          program, sub_program,
          start_date: excelDateToString(r[15]),
          end_date:   excelDateToString(r[16]),
          amount: s(r[17]), status: s(r[18]) || '지원중', staff: s(r[19]),
          isDuplicate: !!existing,
          isSpAdded,
          existingId: existing?.id ?? null,
          existingSP: baseSP,
        }
      })
      setXlsxPreview(parsed)
      setXlsxUploadModal(false)
      setXlsxModal(true)
    } catch (err) {
      alert('파일 분석 실패: ' + err.message)
    } finally {
      setXlsxParsing(false)
    }
  }

  async function saveBulkXlsx() {
    if (xlsxPreview.length === 0) return

    // ── STEP 1: 저장 직전 DB 전체 기업 목록 새로 조회 ──
    const { data: dbFirms, error: fetchErr } = await supabase
      .from('selected_firms').select('id, company_name, ceo, support_programs')
    if (fetchErr) { alert('기업 목록 조회 실패: ' + fetchErr.message); return }
    console.log('DB기업수:', dbFirms.length)

    // ── STEP 2: 각 행마다 기업명 + 대표자 둘 다 일치해야 중복 ──
    const resolved = xlsxPreview.map(r => {
      const nameA = (r.company_name || '').trim()
      const ceoA  = (r.ceo || '').trim()

      const existing = (dbFirms || []).find(f =>
        (f.company_name || '').trim() === nameA &&
        (f.ceo || '').trim() === ceoA
      )
      const match = !!existing

      console.log('엑셀행:', nameA, ceoA, '→', match ? '업데이트' : '신규')

      const baseSP = existing?.support_programs ?? []
      const isSpAdded = match && !!r.program &&
        !baseSP.some(sp => sp.program === r.program && sp.sub_program === r.sub_program)

      return { ...r, isDuplicate: match, isSpAdded, existingId: existing?.id ?? null, existingSP: baseSP }
    })

    const newRows    = resolved.filter(r => !r.isDuplicate)
    const updateRows = resolved.filter(r => r.isDuplicate)

    const buildInsertRow = r => ({
      company_name: r.company_name, ceo: r.ceo || null,
      biz_no: r.biz_no || null, founded_date: r.founded_date || null,
      employees: r.employees ? Number(r.employees) : null,
      biz_type: r.biz_type || null, biz_item: r.biz_item || null,
      sector: [r.biz_type, r.biz_item].filter(Boolean).join(' / ') || null,
      item: r.item || null, type: r.type || '테크',
      region: r.region || null, gender: r.gender || null,
      phone: r.phone || null, email: r.email || null,
      program: r.program || null,
      support_programs: r.program ? [{
        program: r.program, sub_program: r.sub_program,
        staff: r.staff, start_date: r.start_date, end_date: r.end_date,
        amount: r.amount ? Number(r.amount) : null, status: r.status || '지원중',
      }] : [],
      staff: r.staff || null,
      start_date: r.start_date || today(), end_date: r.end_date || null,
      amount: r.amount ? Number(r.amount) : null, status: r.status || '지원중',
    })

    try {
      let insertedCount = 0
      let updatedCount  = 0

      // ── 신규 INSERT ──
      if (newRows.length > 0) {
        const { data, error } = await supabase
          .from('selected_firms').insert(newRows.map(buildInsertRow)).select()
        if (error) throw error
        setFirms(prev => [...(data || []), ...prev])
        insertedCount = (data || []).length
      }

      // ── 기존 UPDATE ──
      for (const r of updateRows) {
        const newSP = r.program ? {
          program: r.program, sub_program: r.sub_program,
          staff: r.staff, start_date: r.start_date, end_date: r.end_date,
          amount: r.amount ? Number(r.amount) : null, status: r.status || '지원중',
        } : null
        const baseSP = Array.isArray(r.existingSP) ? r.existingSP : []
        // 지원사업명 + 세부프로그램 모두 같은 경우만 중복으로 보고 스킵
        const alreadyExists = newSP && baseSP.some(sp =>
          sp.program === newSP.program && sp.sub_program === newSP.sub_program
        )
        const mergedSP = newSP && !alreadyExists ? [...baseSP, newSP] : baseSP
        const firstSP  = mergedSP[0]

        const payload = {
          ceo: r.ceo || null, phone: r.phone || null, email: r.email || null,
          biz_type: r.biz_type || null, biz_item: r.biz_item || null,
          sector: [r.biz_type, r.biz_item].filter(Boolean).join(' / ') || null,
          item: r.item || null, staff: r.staff || null,
          support_programs: mergedSP,
          program:    firstSP?.program    || null,
          start_date: firstSP?.start_date || null,
          end_date:   firstSP?.end_date   || null,
          amount:     firstSP?.amount     ?? null,
          status:     mergedSP.every(sp => sp.status === '완료') ? '완료' : '지원중',
        }
        const { error } = await supabase
          .from('selected_firms').update(payload).eq('id', r.existingId)
        if (error) throw error
        setFirms(prev => prev.map(f => f.id === r.existingId ? { ...f, ...payload } : f))
        updatedCount++
      }

      setXlsxModal(false)
      setXlsxPreview([])
      alert(`신규 등록 ${insertedCount}개, 업데이트 ${updatedCount}개 완료`)
    } catch (err) {
      alert('일괄 저장 실패: ' + err.message)
      console.error(err)
    }
  }

  const filteredFirms = firms.filter(f =>
    (!search || f.company_name?.includes(search) || f.ceo?.includes(search)) &&
    (!filterProgram || f.program === filterProgram) &&
    (!filterStatus || f.status === filterStatus)
  )

  const inProg = firms.filter(f => f.status === '지원중').length
  const done = firms.filter(f => f.status === '완료').length
  const totalAmt = firms.reduce((a, f) => {
    const spArr = Array.isArray(f.support_programs) && f.support_programs.length > 0 ? f.support_programs : []
    const spSum = spArr.reduce((s, sp) => s + (Number(sp.amount) || 0), 0)
    return a + (spSum || Number(f.amount) || 0)
  }, 0)
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
        <StatCard label="총 지원금액" value={fmtAmt(totalAmt)} sub={`후속관리 ${postCount}개사`} color="teal" />
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
          <button onClick={() => setGmUploadModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <TrendingUp size={14} /> 성장지표 일괄등록
          </button>
          <button onClick={() => setXlsxUploadModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
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
              <div><label className="block text-xs font-medium text-gray-600 mb-1">설립연월일</label><input type="date" className="form-input" value={firmForm.founded_date} onChange={e => setFF('founded_date', e.target.value)} /></div>
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
                      <label className="block text-xs font-medium text-gray-600 mb-1">지원금액(원)</label>
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

      {/* ── 1단계: 엑셀 파일 선택 모달 ── */}
      <Modal isOpen={xlsxUploadModal} onClose={() => setXlsxUploadModal(false)} title="엑셀 일괄 등록"
        footer={<button onClick={() => setXlsxUploadModal(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-1">
            <div className="font-semibold">사용 방법</div>
            <div>① 아래 템플릿을 다운로드해 데이터를 입력합니다.</div>
            <div>② 작성한 파일을 선택하면 미리보기가 표시됩니다.</div>
            <div>③ 기업명이 동일한 기업은 <span className="font-semibold text-orange-600">업데이트</span>, 신규 기업은 <span className="font-semibold text-green-600">신규</span>로 표시됩니다.</div>
          </div>
          <button onClick={downloadTemplate} className="flex items-center gap-2 w-full justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download size={15} /> 템플릿 다운로드 (.xlsx)
          </button>
          <div>
            <label className={`flex flex-col items-center justify-center gap-2 w-full py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${xlsxParsing ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleXlsxFile} disabled={xlsxParsing} />
              {xlsxParsing ? (
                <>
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-blue-600 font-medium">파일 분석 중...</span>
                </>
              ) : (
                <>
                  <Upload size={24} className="text-gray-400" />
                  <span className="text-sm text-gray-600 font-medium">클릭하여 엑셀 파일 선택</span>
                  <span className="text-xs text-gray-400">.xlsx, .xls 형식 지원</span>
                </>
              )}
            </label>
          </div>
        </div>
      </Modal>

      {/* ── 2단계: 미리보기 모달 ── */}
      {(() => {
        const newCnt   = xlsxPreview.filter(r => !r.isDuplicate).length
        const updCnt   = xlsxPreview.filter(r => r.isDuplicate).length
        const spAddCnt = xlsxPreview.filter(r => r.isSpAdded).length
        const totalAmt = xlsxPreview.reduce((a, r) => a + (Number(r.amount) || 0), 0)
        return (
          <Modal isOpen={xlsxModal} onClose={() => { setXlsxModal(false); setXlsxPreview([]) }}
            title={`엑셀 일괄 등록 미리보기 — 신규 ${newCnt}개 / 업데이트 ${updCnt}개${spAddCnt > 0 ? ` / 지원사업추가 ${spAddCnt}개` : ''}`} wide
            footer={
              <>
                <button onClick={() => { setXlsxModal(false); setXlsxPreview([]) }} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
                <button onClick={saveBulkXlsx} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>
                  저장 (신규 {newCnt}개, 업데이트 {updCnt}개)
                </button>
              </>
            }
          >
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="border-b border-gray-200" style={{ background: '#2E75B6' }}>
                    {['구분','기업명','대표자','지원사업명','세부프로그램','시작일','종료일','지원금액(원)','상태','담당자','사업자번호','유형','지역'].map(h => (
                      <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap" style={{ color: '#fff' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {xlsxPreview.map((r, i) => (
                    <tr key={i} className={`border-b border-gray-100 hover:bg-blue-50 ${r.isDuplicate ? 'bg-orange-50' : ''}`}>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {r.isDuplicate
                            ? <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs font-medium">업데이트</span>
                            : <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">신규</span>
                          }
                          {r.isSpAdded && (
                            <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-medium">지원사업추가</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 font-semibold text-blue-700 whitespace-nowrap">{r.company_name}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.ceo}</td>
                      <td className="px-2 py-1.5 text-blue-600 whitespace-nowrap">{r.program}</td>
                      <td className="px-2 py-1.5 text-gray-500">{r.sub_program}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.start_date}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.end_date}</td>
                      <td className="px-2 py-1.5 font-bold text-green-700">{r.amount ? Number(r.amount).toLocaleString() : '-'}</td>
                      <td className="px-2 py-1.5"><span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded">{r.status}</span></td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.staff}</td>
                      <td className="px-2 py-1.5 text-gray-400">{r.biz_no}</td>
                      <td className="px-2 py-1.5 text-gray-500">{r.type}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-gray-500">{r.region}</td>
                    </tr>
                  ))}
                </tbody>
                {xlsxPreview.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={7} className="px-2 py-2 text-xs font-semibold text-gray-600 text-right">총 지원금액 합계</td>
                      <td className="px-2 py-2 text-xs font-bold text-green-700">{totalAmt.toLocaleString()}만원</td>
                      <td colSpan={5} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Modal>
        )
      })()}

      {/* ── 성장지표 업로드 모달 (1단계) ── */}
      <Modal isOpen={gmUploadModal} onClose={() => setGmUploadModal(false)} title="성장지표 일괄 등록"
        footer={<button onClick={() => setGmUploadModal(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>}
      >
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700 space-y-1">
            <div className="font-semibold">사용 방법</div>
            <div>① 템플릿을 다운로드해 데이터를 입력합니다.</div>
            <div>② 기업명은 선정기업과 정확히 일치해야 합니다.</div>
            <div>③ 동일 기업·연도·기간라벨이 있으면 업데이트, 없으면 신규 등록됩니다.</div>
          </div>
          <button onClick={downloadGmTemplate} className="flex items-center gap-2 w-full justify-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download size={15} /> 템플릿 다운로드 (.xlsx)
          </button>
          <label className={`flex flex-col items-center justify-center gap-2 w-full py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${gmParsing ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'}`}>
            <input ref={gmFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleGmFile} disabled={gmParsing} />
            {gmParsing ? (
              <>
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-green-600 font-medium">파일 분석 중...</span>
              </>
            ) : (
              <>
                <TrendingUp size={24} className="text-gray-400" />
                <span className="text-sm text-gray-600 font-medium">클릭하여 엑셀 파일 선택</span>
                <span className="text-xs text-gray-400">.xlsx, .xls 형식 지원</span>
              </>
            )}
          </label>
        </div>
      </Modal>

      {/* ── 성장지표 미리보기 모달 (2단계) ── */}
      <Modal isOpen={gmPreviewModal} onClose={() => { setGmPreviewModal(false); setGmPreview([]) }}
        title={`성장지표 미리보기 — 신규 ${gmPreview.filter(r=>r.firmFound&&!r.isDuplicate).length}개 / 업데이트 ${gmPreview.filter(r=>r.isDuplicate).length}개 / 미매칭 ${gmPreview.filter(r=>!r.firmFound).length}개`} wide
        footer={
          <>
            <button onClick={() => { setGmPreviewModal(false); setGmPreview([]) }} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={saveGmBulk} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#1E5631' }}>
              저장 (신규 {gmPreview.filter(r=>r.firmFound&&!r.isDuplicate).length}개, 업데이트 {gmPreview.filter(r=>r.isDuplicate).length}개)
            </button>
          </>
        }
      >
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0">
              <tr style={{ background: '#1E5631' }}>
                {['구분','기업명','연도','기간유형','기간라벨','매출액(원)','고용인원','투자유치(원)','수출액(원)','특허','메모'].map(h => (
                  <th key={h} className="text-left px-2 py-2 font-medium whitespace-nowrap text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gmPreview.map((r, i) => (
                <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 ${!r.firmFound ? 'bg-red-50' : r.isDuplicate ? 'bg-orange-50' : ''}`}>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {!r.firmFound
                      ? <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-medium">미매칭</span>
                      : r.isDuplicate
                        ? <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-xs font-medium">업데이트</span>
                        : <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-medium">신규</span>
                    }
                  </td>
                  <td className={`px-2 py-1.5 font-semibold whitespace-nowrap ${r.firmFound ? 'text-blue-700' : 'text-red-500'}`}>{r.company_name}</td>
                  <td className="px-2 py-1.5">{r.year}</td>
                  <td className="px-2 py-1.5">{r.period_type}</td>
                  <td className="px-2 py-1.5 font-medium">{r.period_label}</td>
                  <td className="px-2 py-1.5 text-green-700 font-semibold">{r.revenue?.toLocaleString()}</td>
                  <td className="px-2 py-1.5">{r.employees}</td>
                  <td className="px-2 py-1.5">{r.investment?.toLocaleString()}</td>
                  <td className="px-2 py-1.5">{r.export_amount?.toLocaleString()}</td>
                  <td className="px-2 py-1.5">{r.patent_count}</td>
                  <td className="px-2 py-1.5 text-gray-400 max-w-[120px] truncate">{r.memo}</td>
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
            {[['info', '기업정보'], ['consult', `상담일지 (${detailConsults.length})`], ['post', `사후관리 (${notes.filter(n => n.firm_id === detailFirm.id).length})`], ['growth', `성장지표 (${detailMetrics.length})`]].map(([k, l]) => (
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
                {[['대표자', detailFirm.ceo], ['사업자번호', detailFirm.biz_no], ['설립연월일', detailFirm.founded_date],
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
                      {sp.amount && <span className="font-semibold text-green-700">{Number(sp.amount).toLocaleString()}원</span>}
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

          {/* 성장지표 탭 */}
          {detailTab === 'growth' && (
            <div className="min-h-[200px] space-y-4">
              {/* 입력 폼 */}
              {metricForm ? (
                <GrowthMetricForm
                  form={metricForm} onChange={setMetricForm}
                  onSave={saveMetric} onCancel={() => setMetricForm(null)}
                  getPeriodLabel={getPeriodLabel}
                />
              ) : (
                <div className="flex justify-end">
                  <button onClick={() => setMetricForm(emptyMetricForm())} className="text-xs text-white px-2.5 py-1.5 rounded flex items-center gap-1" style={{ background: '#2E75B6' }}>
                    <Plus size={12} /> 지표 등록
                  </button>
                </div>
              )}

              {/* 차트 */}
              {detailMetrics.length >= 2 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-xs font-semibold text-gray-600 mb-3">매출액 / 고용인원 추이</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={detailMetrics} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period_label" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v, n) => [v?.toLocaleString(), n]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" name="매출액(원)" stroke="#2E75B6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line yAxisId="right" type="monotone" dataKey="employees" name="고용인원(명)" stroke="#1E5631" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* 지표 목록 */}
              {metricsLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">로딩 중...</div>
              ) : detailMetrics.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">등록된 성장지표가 없습니다</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {['기간','매출액(원)','고용인원','투자유치(원)','수출액(원)','특허','메모',''].map(h => (
                          <th key={h} className="px-2 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detailMetrics.map(m => (
                        <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-2 py-2 font-medium text-blue-700 whitespace-nowrap">{m.period_label}</td>
                          <td className="px-2 py-2 text-green-700 font-semibold">{m.revenue?.toLocaleString() ?? '-'}</td>
                          <td className="px-2 py-2">{m.employees ?? '-'}</td>
                          <td className="px-2 py-2">{m.investment?.toLocaleString() ?? '-'}</td>
                          <td className="px-2 py-2">{m.export_amount?.toLocaleString() ?? '-'}</td>
                          <td className="px-2 py-2">{m.patent_count ?? '-'}</td>
                          <td className="px-2 py-2 text-gray-400 max-w-[100px] truncate">{m.memo}</td>
                          <td className="px-2 py-2">
                            <button onClick={() => deleteMetric(m.id)} className="text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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

function GrowthMetricForm({ form, onChange, onSave, onCancel, getPeriodLabel }) {
  const [half, setHalf] = useState('상반기')
  const [quarter, setQuarter] = useState('1분기')
  const set = (k, v) => {
    const updated = { ...form, [k]: v }
    if (k === 'period_type' || k === 'year') {
      updated.period_label = getPeriodLabel(updated.year, updated.period_type, half, quarter)
    }
    onChange(updated)
  }
  const setHalfQ = (h, q) => {
    const newHalf = h ?? half
    const newQuarter = q ?? quarter
    if (h) setHalf(h)
    if (q) setQuarter(q)
    onChange({ ...form, period_label: getPeriodLabel(form.year, form.period_type, newHalf, newQuarter) })
  }
  return (
    <div className="bg-green-50 rounded-xl p-3 border border-green-200 space-y-2">
      <div className="text-xs font-semibold text-green-700 mb-1">성장지표 등록</div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">연도 *</label>
          <input type="number" className="form-input" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2025" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">기간 유형 *</label>
          <select className="form-input" value={form.period_type} onChange={e => set('period_type', e.target.value)}>
            <option>연도</option><option>반기</option><option>분기</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            {form.period_type === '반기' ? '반기 선택' : form.period_type === '분기' ? '분기 선택' : '기간 라벨'}
          </label>
          {form.period_type === '반기' ? (
            <select className="form-input" value={half} onChange={e => setHalfQ(e.target.value, null)}>
              <option>상반기</option><option>하반기</option>
            </select>
          ) : form.period_type === '분기' ? (
            <select className="form-input" value={quarter} onChange={e => setHalfQ(null, e.target.value)}>
              <option>1분기</option><option>2분기</option><option>3분기</option><option>4분기</option>
            </select>
          ) : (
            <input className="form-input bg-gray-100" value={form.period_label} readOnly />
          )}
        </div>
      </div>
      {form.period_type !== '연도' && (
        <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">기간 라벨: <span className="font-medium">{getPeriodLabel(form.year, form.period_type, half, quarter)}</span></div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <div><label className="block text-xs text-gray-600 mb-1">매출액(원)</label><input type="number" className="form-input" value={form.revenue} onChange={e => onChange({...form, revenue: e.target.value})} /></div>
        <div><label className="block text-xs text-gray-600 mb-1">고용인원</label><input type="number" className="form-input" value={form.employees} onChange={e => onChange({...form, employees: e.target.value})} /></div>
        <div><label className="block text-xs text-gray-600 mb-1">투자유치(원)</label><input type="number" className="form-input" value={form.investment} onChange={e => onChange({...form, investment: e.target.value})} /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><label className="block text-xs text-gray-600 mb-1">수출액(원)</label><input type="number" className="form-input" value={form.export_amount} onChange={e => onChange({...form, export_amount: e.target.value})} /></div>
        <div><label className="block text-xs text-gray-600 mb-1">특허건수</label><input type="number" className="form-input" value={form.patent_count} onChange={e => onChange({...form, patent_count: e.target.value})} /></div>
        <div><label className="block text-xs text-gray-600 mb-1">메모</label><input className="form-input" value={form.memo} onChange={e => onChange({...form, memo: e.target.value})} /></div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">취소</button>
        <button onClick={onSave} className="px-3 py-1 text-xs text-white rounded" style={{ background: '#1E5631' }}>저장</button>
      </div>
    </div>
  )
}

function FirmListTab({ firms, notes, onEdit, onDelete, onDetail }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {['기업명', '대표자', '업종/아이템', '유형', '지원사업', '지원기간', '지원금(원)', '담당', '상태', '사후관리', '관리'].map(h => (
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
              ? f.support_programs
              : f.program
                ? [{ program: f.program, sub_program: f.sub_program, start_date: f.start_date, end_date: f.end_date, amount: f.amount, staff: f.staff, status: f.status }]
                : [{}]

            return spList.map((sp, spIdx) => {
              const isFirst = spIdx === 0
              const rowCount = spList.length
              return (
                <tr key={`${f.id}-${spIdx}`} className={`border-b border-gray-50 hover:bg-gray-50 ${!isFirst ? 'bg-gray-50/30' : ''}`}>
                  {/* 기업명 — 첫 행만 표시, rowspan 시뮬레이션 */}
                  {isFirst ? (
                    <td className="px-3 py-2.5" rowSpan={rowCount} style={{ verticalAlign: 'top', borderRight: rowCount > 1 ? '1px solid #f3f4f6' : undefined }}>
                      <button onClick={() => onDetail(f)} className="font-bold text-blue-600 underline text-xs">{f.company_name}</button>
                    </td>
                  ) : null}
                  {isFirst ? (
                    <td className="px-3 py-2.5 text-xs" rowSpan={rowCount} style={{ verticalAlign: 'top', borderRight: rowCount > 1 ? '1px solid #f3f4f6' : undefined }}>{f.ceo}</td>
                  ) : null}
                  {isFirst ? (
                    <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[100px]" rowSpan={rowCount} style={{ verticalAlign: 'top', borderRight: rowCount > 1 ? '1px solid #f3f4f6' : undefined }}>
                      <div className="truncate">{f.sector}</div>
                      {f.item && <div className="text-gray-400 truncate">{f.item}</div>}
                    </td>
                  ) : null}
                  {isFirst ? (
                    <td className="px-3 py-2.5" rowSpan={rowCount} style={{ verticalAlign: 'top', borderRight: rowCount > 1 ? '1px solid #f3f4f6' : undefined }}>
                      <VerdictBadge verdict={f.type} />
                    </td>
                  ) : null}

                  {/* 지원사업별 컬럼 */}
                  <td className="px-3 py-2.5 text-xs font-medium max-w-[130px]">
                    {sp.program
                      ? <><div className="truncate text-gray-800">{sp.program}</div>
                          {sp.sub_program && <div className="text-gray-400 truncate">{sp.sub_program}</div>}</>
                      : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {sp.start_date || f.start_date
                      ? <><div>{sp.start_date || f.start_date}</div>
                          <div>{sp.end_date || f.end_date || <span className="text-orange-500">진행중</span>}</div></>
                      : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-bold text-green-700">
                    {sp.amount ? Number(sp.amount).toLocaleString() : '-'}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{sp.staff || f.staff || '-'}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={sp.status || f.status} />
                  </td>

                  {/* 사후관리 — 첫 행만 */}
                  {isFirst ? (
                    <td className="px-3 py-2.5" rowSpan={rowCount} style={{ verticalAlign: 'top', borderLeft: rowCount > 1 ? '1px solid #f3f4f6' : undefined }}>
                      {f.post_mgmt ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${f.post_mgmt === '후속관리중' ? 'bg-orange-100 text-orange-700' : f.post_mgmt === '성장추적중' ? 'bg-teal-100 text-teal-700' : 'bg-green-100 text-green-700'}`}>{f.post_mgmt}</span>
                      ) : <span className="text-xs text-gray-300">-</span>}
                      {lastNote && <div className="text-xs text-gray-400 mt-0.5">{lastNote.date}</div>}
                    </td>
                  ) : null}
                  {/* 관리 — 첫 행만 */}
                  {isFirst ? (
                    <td className="px-3 py-2.5" rowSpan={rowCount} style={{ verticalAlign: 'top', borderLeft: rowCount > 1 ? '1px solid #f3f4f6' : undefined }}>
                      <div className="flex gap-1">
                        <button onClick={() => onDetail(f)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Eye size={12} /></button>
                        <button onClick={() => onEdit(f)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil size={12} /></button>
                        <button onClick={() => onDelete(f.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              )
            })
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
              <div className="flex gap-4"><span className="text-xs text-orange-600">진행중 {inProg}개사</span><span className="text-sm font-bold text-green-700">{total.toLocaleString()}원</span></div>
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
                      <td className="px-4 py-2 text-xs font-bold text-green-700">{f.amount ? Number(f.amount).toLocaleString() + '원' : '-'}</td>
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
