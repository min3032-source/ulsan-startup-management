import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatPhone } from '../../utils/formatPhone'
import { BookOpen, Users, Award, Plus, X, Search, ChevronDown, ChevronUp, Printer, Mail, Download } from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import PageHeader from '../../components/common/PageHeader'
import * as XLSX from 'xlsx'

const DEFAULT_SURVEY_QUESTIONS = [
  { text: '교육 내용은 창업에 도움이 되었나요?', type: 'rating' },
  { text: '강사의 강의 전달력은 어땠나요?', type: 'rating' },
  { text: '교육 환경(장소, 시설)은 만족스러웠나요?', type: 'rating' },
  { text: '교육 일정과 시간은 적절했나요?', type: 'rating' },
  { text: '이 교육을 다른 분께 추천하시겠어요?', type: 'rating' },
]

function fmtDateTime(date, time) {
  if (!date) return null
  const dateStr = date.includes('T') ? date.split('T')[0] : date
  const fallbackTime = date.includes('T') ? date.split('T')[1]?.slice(0, 5) : null
  const t = time?.slice(0, 5) || fallbackTime
  return t && t !== '00:00' ? `${dateStr} ${t}` : dateStr
}

const formatTime = (time) => {
  if (!time) return ''
  return time.slice(0, 5)
}

const formatDateWithTime = (date, time) => {
  if (!date) return ''
  const timeStr = time ? ' ' + formatTime(time) : ''
  return date + timeStr
}

const formatPeriod = (startDate, startTime, endDate, endTime) => {
  if (!startDate) return '-'
  if (startDate === endDate) {
    const timeStr = (startTime || endTime)
      ? `⏰ ${formatTime(startTime)} ~ ${formatTime(endTime)}`
      : null
    return { date: startDate, time: timeStr }
  }
  return { date: `${formatDateWithTime(startDate, startTime)} ~ ${formatDateWithTime(endDate, endTime)}`, time: null }
}

const formatDateTimeDisplay = (date, time) => {
  if (!date) return ''
  if (!time) return date
  const t = typeof time === 'string' ? time.slice(0, 5) : ''
  return t ? date + ' ' + t : date
}

const CATEGORIES = ['창업기초', '마케팅', '재무', '기술', '네트워킹', '기타']
const PROGRAM_TYPES = ['집합교육', '온라인', '혼합']
const PROGRAM_STATUSES = ['모집중', '진행중', '완료', '취소']
const APP_STATUSES = ['신청', '승인', '수료', '미수료']

const STATUS_COLOR = {
  '모집중': 'bg-blue-100 text-blue-700',
  '진행중': 'bg-teal-100 text-teal-700',
  '완료':   'bg-green-100 text-green-700',
  '취소':   'bg-gray-100 text-gray-500',
  '신청':   'bg-amber-100 text-amber-700',
  '승인':   'bg-blue-100 text-blue-700',
  '수료':   'bg-green-100 text-green-700',
  '미수료': 'bg-red-100 text-red-700',
}

const TABS = [
  { id: 'programs', label: '교육 프로그램', icon: BookOpen },
  { id: 'students', label: '수강생 관리', icon: Users },
  { id: 'certificates', label: '수료 관리', icon: Award },
]

// education_applications.certificate_number 컬럼은 마이그레이션 적용 전엔 DB에 없어
// update가 42703(컬럼 없음)으로 매번 실패한다. 세션 동안은 재시도하지 않도록 캐시한다.
let certificateNumberColumnExists = true

export default function Education() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')

  const [tab, setTab] = useState('programs')
  const [programs, setPrograms] = useState([])
  const [applications, setApplications] = useState([])
  const [certificates, setCertificates] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  // 프로그램 모달
  const [showProgramModal, setShowProgramModal] = useState(false)
  const [editProgram, setEditProgram] = useState(null)
  const [programForm, setProgramForm] = useState(defaultProgramForm())

  // 수강생 탭
  const [filterProgram, setFilterProgram] = useState('')
  const [searchStudent, setSearchStudent] = useState('')
  const [filterBusiness, setFilterBusiness] = useState('전체')

  // 수강생 직접 입력 모달
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [studentForm, setStudentForm] = useState(defaultStudentForm())

  // 출석 모달
  const [attendanceModal, setAttendanceModal] = useState(null) // application
  const [attendance, setAttendance] = useState([])

  // 수료증 미리보기 모달
  const [certPreview, setCertPreview] = useState(null)

  // 발급 직후 팝업 (Certificate.jsx 라우트를 그대로 재사용)
  const [issuedCert, setIssuedCert] = useState(null)
  const [issuingId, setIssuingId] = useState(null)

  // 수강생 목록 모달 (프로그램 클릭)
  const [studentsModal, setStudentsModal] = useState(null) // program

  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [relatedPrograms, setRelatedPrograms] = useState([])
  const [showRelatedProgramModal, setShowRelatedProgramModal] = useState(false)
  const [newRelatedProgram, setNewRelatedProgram] = useState({ name: '', year: new Date().getFullYear() })
  const [editingProgramId, setEditingProgramId] = useState(null)
  const [editingProgramName, setEditingProgramName] = useState('')
  const [editingProgramYear, setEditingProgramYear] = useState(new Date().getFullYear())
  const [approvalModal, setApprovalModal] = useState(null) // { app, selectedBusiness }

  // 일괄 변경
  const [selectedStudents, setSelectedStudents] = useState(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkBusiness, setBulkBusiness] = useState('__no_change__')

  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const [posterFile, setPosterFile] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [doneExpanded, setDoneExpanded] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [pRes, aRes, cRes, prRes, rpRes] = await Promise.all([
      supabase.from('education_programs').select('*').order('start_date', { ascending: true }),
      supabase.from('education_applications').select('*, education_programs(title, start_date, start_time, end_date, end_time, total_hours), founders(name)').order('applied_at', { ascending: false }),
      supabase.from('certificates').select('*, education_applications(applicant_name, email, education_programs(title, start_date, start_time, end_date, end_time, total_hours))').order('issued_at', { ascending: false }),
      supabase.from('profiles').select('id, name').eq('is_active', true),
      supabase.from('education_related_programs').select('*').order('year', { ascending: false }),
    ])
    if (!pRes.error) setPrograms(pRes.data || [])
    if (!aRes.error) setApplications(aRes.data || [])
    if (!cRes.error) setCertificates(cRes.data || [])
    if (!prRes.error) setProfiles(prRes.data || [])
    if (!rpRes.error) setRelatedPrograms(rpRes.data || [])
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  async function loadRelatedPrograms() {
    const { data } = await supabase.from('education_related_programs').select('*').order('year', { ascending: false })
    setRelatedPrograms(data || [])
  }

  async function addRelatedProgram() {
    if (!newRelatedProgram.name.trim()) { alert('사업명을 입력해주세요'); return }
    const { error } = await supabase.from('education_related_programs').insert({
      name: newRelatedProgram.name.trim(),
      year: newRelatedProgram.year,
    })
    if (error) { alert('추가 실패: ' + error.message); return }
    setNewRelatedProgram({ name: '', year: new Date().getFullYear() })
    loadRelatedPrograms()
  }

  async function deleteRelatedProgram(id) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('education_related_programs').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    loadRelatedPrograms()
  }

  function startEditRelatedProgram(rp) {
    setEditingProgramId(rp.id)
    setEditingProgramName(rp.name)
    setEditingProgramYear(rp.year)
  }

  async function saveEditRelatedProgram() {
    if (!editingProgramName.trim()) { alert('사업명을 입력해주세요'); return }
    const { error } = await supabase.from('education_related_programs')
      .update({ name: editingProgramName.trim(), year: editingProgramYear })
      .eq('id', editingProgramId)
    if (error) { alert('수정 실패: ' + error.message); return }
    setEditingProgramId(null)
    loadRelatedPrograms()
  }

  async function confirmApproval() {
    const { error } = await supabase.from('education_applications')
      .update({ status: '승인', related_program: approvalModal.selectedBusiness || null })
      .eq('id', approvalModal.app.id)
    if (error) { alert('승인 실패: ' + error.message); return }
    setApprovalModal(null)
    showToast('승인 처리되었습니다.')
    loadAll()
  }

  async function updateAppBusiness(appId, businessName) {
    const { error } = await supabase.from('education_applications')
      .update({ related_program: businessName || null })
      .eq('id', appId)
    if (error) { alert('사업 변경 실패: ' + error.message); return }
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, related_program: businessName || null } : a))
  }

  async function applyBulkChanges() {
    if (selectedStudents.size === 0) return
    const hasStatusChange = bulkStatus !== ''
    const hasBusinessChange = bulkBusiness !== '__no_change__'
    if (!hasStatusChange && !hasBusinessChange) {
      showToast('변경할 항목을 선택해주세요.')
      return
    }
    const ids = [...selectedStudents]
    const updates = {}
    if (hasStatusChange) updates.status = bulkStatus
    if (hasBusinessChange) updates.related_program = bulkBusiness || null

    setSaving(true)
    const { error } = await supabase.from('education_applications').update(updates).in('id', ids)
    if (error) { alert('일괄 변경 실패: ' + error.message); setSaving(false); return }

    if (hasStatusChange && bulkStatus === '수료') {
      for (const id of ids) await issueCertificate(id)
    }

    const count = ids.length
    setSelectedStudents(new Set())
    setBulkStatus('')
    setBulkBusiness('__no_change__')
    showToast(`${count}명 변경되었습니다.`)
    setSaving(false)
    loadAll()
  }

  function defaultStudentForm() {
    return {
      program_id: '', applicant_name: '', company_name: '',
      phone: '', email: '', status: '신청', motivation: ''
    }
  }

  function openAddStudent() {
    setEditStudent(null)
    setStudentForm({ ...defaultStudentForm(), program_id: filterProgram || '' })
    setShowStudentModal(true)
  }

  function openEditStudent(a) {
    setEditStudent(a)
    setStudentForm({
      program_id: a.program_id || '',
      applicant_name: a.applicant_name || '',
      company_name: a.company_name || '',
      phone: a.phone || '',
      email: a.email || '',
      status: a.status || '신청',
      motivation: a.motivation || '',
    })
    setShowStudentModal(true)
  }

  async function saveStudent() {
    if (!studentForm.applicant_name.trim()) { alert('이름을 입력해주세요'); return }
    if (!studentForm.program_id) { alert('프로그램을 선택해주세요'); return }
    setSaving(true)
    const payload = {
      program_id: studentForm.program_id,
      applicant_name: studentForm.applicant_name.trim(),
      company_name: studentForm.company_name.trim() || null,
      motivation: studentForm.motivation.trim() || null,
      phone: studentForm.phone.trim() || null,
      email: studentForm.email.trim() || null,
      status: studentForm.status,
    }
    let error
    if (editStudent) {
      ({ error } = await supabase.from('education_applications').update(payload).eq('id', editStudent.id))
    } else {
      payload.applied_at = new Date().toISOString()
      payload.attendance_rate = 0
      ;({ error } = await supabase.from('education_applications').insert(payload))
    }
    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setShowStudentModal(false)
    showToast(editStudent ? '수강생 정보가 수정되었습니다.' : '수강생이 등록되었습니다.')
    loadAll()
  }

  function downloadStudentExcel() {
    const progTitle = filterProgram
      ? (programs.find(p => p.id === filterProgram)?.title || '전체')
      : '전체'
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const dateTimeStr = now.toLocaleString('ko-KR')

    const rows = [
      ['교육명:', progTitle, '', '', '', '', '', '', '', ''],
      ['다운로드일시:', dateTimeStr, '', '', '', '', '', '', '', ''],
      [],
      ['번호', '이름', '연락처', '이메일', '기업명', '참여사업', '신청일', '상태', '수료여부', '설문완료'],
      ...filteredApps.map((a, i) => [
        i + 1,
        a.applicant_name || '',
        a.phone || '',
        a.email || '',
        a.company_name || '',
        a.related_program || '',
        a.applied_at ? a.applied_at.slice(0, 10) : '',
        a.status || '',
        a.status === '수료' ? 'O' : '',
        a.survey_completed ? 'O' : '',
      ]),
      ['', '합계', `${filteredApps.length}명`, '', '', '', '', '', '', ''],
    ]

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 6 }, { wch: 10 }, { wch: 14 }, { wch: 24 },
      { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '수강생목록')
    XLSX.writeFile(wb, `수강생목록_${progTitle}_${dateStr}.xlsx`)
  }

  async function deleteStudent(id) {
    if (!confirm('수강생을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('education_applications').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    showToast('삭제되었습니다.')
    loadAll()
  }

  function defaultProgramForm() {
    return {
      title: '', description: '', overview: '', category: '창업기초', program_type: '집합교육',
      instructor_name: '', instructor_organization: '', location: '', start_date: '', end_date: '',
      total_sessions: 1, hours_per_session: 2, max_participants: '', assignee: '', status: '모집중', completion_rate: 80,
      poster_url: '', survey_questions: [...DEFAULT_SURVEY_QUESTIONS]
    }
  }

  function openAddProgram() {
    setEditProgram(null)
    setProgramForm(defaultProgramForm())
    setStartTime('09:00')
    setEndTime('18:00')
    setPosterFile(null)
    setShowProgramModal(true)
  }

  function openEditProgram(p) {
    setEditProgram(p)
    setProgramForm({
      title: p.title || '', description: p.description || '', overview: p.overview || '',
      category: p.category || '창업기초', program_type: p.program_type || '집합교육',
      instructor_name: p.instructor_name || p.instructor || '', instructor_organization: p.instructor_organization || '', location: p.location || '',
      start_date: p.start_date ? p.start_date.split('T')[0] : '',
      end_date: p.end_date ? p.end_date.split('T')[0] : '',
      total_sessions: p.total_sessions || 1, hours_per_session: p.hours_per_session || 2, max_participants: p.max_participants || '',
      assignee: p.assignee || '', status: p.status || '모집중', completion_rate: p.completion_rate ?? 80,
      poster_url: p.poster_url || '',
      survey_questions: p.survey_questions?.length
        ? p.survey_questions.map(q => typeof q === 'string' ? { text: q, type: 'rating' } : q)
        : [...DEFAULT_SURVEY_QUESTIONS]
    })
    setStartTime(p.start_time ? p.start_time.slice(0, 5) : '09:00')
    setEndTime(p.end_time ? p.end_time.slice(0, 5) : '18:00')
    setPosterFile(null)
    setShowProgramModal(true)
  }

  async function saveProgram() {
    if (!programForm.title.trim()) { alert('교육명을 입력해주세요'); return }
    setSaving(true)

    let posterUrl = programForm.poster_url || null
    if (posterFile) {
      const ext = posterFile.name.split('.').pop()
      const fileName = `poster_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('education-posters')
        .upload(fileName, posterFile, { upsert: true })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('education-posters').getPublicUrl(fileName)
        posterUrl = publicUrl
      }
    }

    const totalHours = (programForm.total_sessions || 1) * (programForm.hours_per_session || 2)
    const payload = {
      ...programForm,
      poster_url: posterUrl,
      start_date: programForm.start_date || null,
      start_time: startTime || null,
      end_date: programForm.end_date || null,
      end_time: endTime || null,
      max_participants: programForm.max_participants ? Number(programForm.max_participants) : null,
      hours_per_session: programForm.hours_per_session || null,
      total_hours: totalHours || null,
      overview: programForm.overview || null,
      survey_questions: programForm.survey_questions
        ?.map(q => typeof q === 'string' ? { text: q, type: 'rating' } : q)
        .filter(q => q.text.trim()) || null,
    }
    let error
    if (editProgram) {
      ({ error } = await supabase.from('education_programs').update(payload).eq('id', editProgram.id))
    } else {
      ({ error } = await supabase.from('education_programs').insert(payload))
    }
    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setShowProgramModal(false)
    showToast(editProgram ? '프로그램이 수정되었습니다.' : '프로그램이 등록되었습니다.')
    loadAll()
  }

  async function deleteProgram(id) {
    if (!confirm('프로그램을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('education_programs').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    showToast('삭제되었습니다.')
    loadAll()
  }

  async function handleDeletePoster(programId) {
    const { error } = await supabase
      .from('education_programs')
      .update({ poster_url: null })
      .eq('id', programId)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      setPrograms(prev => prev.map(p => p.id === programId ? { ...p, poster_url: null } : p))
      setProgramForm(prev => ({ ...prev, poster_url: null }))
    }
  }

  async function updateAppStatus(appId, status) {
    if (status === '승인') {
      const app = applications.find(a => a.id === appId)
      setApprovalModal({ app, selectedBusiness: app.related_program || '' })
      return
    }
    if (status === '수료') {
      const app = applications.find(a => a.id === appId)
      const program = programs.find(p => p.id === app?.program_id)
      const rate = app?.attendance_rate || 0
      const threshold = program?.completion_rate ?? 80
      if (rate < threshold) {
        const ok = confirm(`출석률이 수료 기준(${threshold}%)에 미달합니다. (현재: ${rate}%)\n그래도 수료 처리하시겠습니까?`)
        if (!ok) return
      }
    }
    const { error } = await supabase.from('education_applications').update({ status }).eq('id', appId)
    if (error) { alert('상태 변경 실패: ' + error.message); return }
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
    if (status === '수료') {
      await issueCertificate(appId)
      loadAll()
    }
  }

  async function loadFullCertificate(certId) {
    const { data } = await supabase
      .from('certificates')
      .select('*, education_applications(applicant_name, email, education_programs(title, start_date, end_date, total_hours))')
      .eq('id', certId)
      .single()
    return data
  }

  async function issueCertificate(appId) {
    if (issuingId === appId) return // 같은 버튼 연타 방지
    setIssuingId(appId)
    try {
      // 컴포넌트 state는 방금 반영한 status 변경을 아직 못 읽을 수 있어(재렌더 전) DB에서 직접 확인한다.
      const { data: app, error: fetchErr } = await supabase
        .from('education_applications')
        .select('id, status, program_id')
        .eq('id', appId)
        .single()
      if (fetchErr || !app || app.status !== '수료') {
        alert('수료 상태인 신청건만 수료증을 발급할 수 있습니다.')
        return
      }

      // 중복 발급 방지: 컴포넌트 state가 아니라 DB를 직접 재조회해서 확인한다(레이스 컨디션 방지).
      const { data: existing } = await supabase
        .from('certificates')
        .select('id, certificate_number')
        .eq('application_id', appId)
        .maybeSingle()
      if (existing) {
        showToast(`이미 발급된 수료증입니다 (${existing.certificate_number})`)
        const full = await loadFullCertificate(existing.id)
        if (full) setIssuedCert(full)
        await loadAll()
        return
      }

      const program = programs.find(p => p.id === app.program_id)
      const year = program?.start_date ? new Date(program.start_date).getFullYear() : new Date().getFullYear()
      const { count } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .like('certificate_number', `제${year}-03-%`)
      const seq = String((count || 0) + 1).padStart(3, '0')
      const certNo = `제${year}-03-${seq}호`

      const { data: inserted, error } = await supabase
        .from('certificates')
        .insert({ application_id: appId, certificate_number: certNo, issued_at: new Date().toISOString() })
        .select('id')
        .single()
      if (error) {
        if (error.code === '23505') {
          // 동시 클릭 등으로 이미 다른 요청이 먼저 발급한 경우: 새로 만들지 않고 기존 것을 보여준다.
          const { data: raced } = await supabase.from('certificates').select('id, certificate_number').eq('application_id', appId).maybeSingle()
          if (raced) {
            showToast(`이미 발급된 수료증입니다 (${raced.certificate_number})`)
            const full = await loadFullCertificate(raced.id)
            if (full) setIssuedCert(full)
          }
        } else {
          alert('수료증 발급 실패: ' + error.message)
        }
        await loadAll()
        return
      }

      // education_applications.certificate_number 동기화 (마이그레이션 적용 전이라 컬럼이 없으면 건너뛴다)
      if (certificateNumberColumnExists) {
        const { error: syncErr } = await supabase.from('education_applications').update({ certificate_number: certNo }).eq('id', appId)
        if (syncErr?.code === '42703') certificateNumberColumnExists = false
      }

      showToast(`수료증 번호 ${certNo} 발급 완료`)
      await loadAll()
      const full = await loadFullCertificate(inserted.id)
      if (full) setIssuedCert(full)
    } finally {
      setIssuingId(null)
    }
  }

  async function loadAttendance(app) {
    const { data } = await supabase.from('education_attendance').select('*').eq('application_id', app.id).order('session_number')
    setAttendance(data || [])
    setAttendanceModal(app)
  }

  async function toggleAttendance(app, sessionNum, existing) {
    if (existing) {
      const newStatus = existing.status === '출석' ? '결석' : '출석'
      await supabase.from('education_attendance').update({ status: newStatus }).eq('id', existing.id)
    } else {
      await supabase.from('education_attendance').insert({
        application_id: app.id,
        session_number: sessionNum,
        attended_at: new Date().toISOString().slice(0, 10),
        status: '출석'
      })
    }
    const { data } = await supabase.from('education_attendance').select('*').eq('application_id', app.id)
    const attended = (data || []).filter(a => a.status === '출석').length
    const program = programs.find(p => p.id === app.program_id)
    const total = program?.total_sessions || 1
    const rate = Math.round((attended / total) * 100)
    await supabase.from('education_applications').update({ attendance_rate: rate }).eq('id', app.id)
    loadAttendance(app)
    loadAll()
  }

  async function sendCertEmail(cert) {
    const app = cert.education_applications
    if (!app) return
    if (!app.email) {
      alert('신청자의 이메일 정보가 없어 발송할 수 없습니다.')
      return
    }
    const certUrl = `${window.location.origin}/certificate/${cert.id}`
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          to: app.email,
          subject: `[울산경제일자리진흥원] 수료증이 발급되었습니다`,
          html: `<p>안녕하세요, ${app.applicant_name}님!</p>
<p><strong>${app.education_programs?.title}</strong> 교육과정을 성공적으로 수료하셨습니다.</p>
<p>수료증 확인: <a href="${certUrl}">${certUrl}</a></p>
<p>감사합니다.<br>울산경제일자리진흥원</p>`
        }
      })
      showToast('수료증 이메일이 발송되었습니다.')
    } catch (e) {
      alert('이메일 발송 실패: ' + e.message)
    }
  }

  const appsByProgram = (pid) => applications.filter(a => a.program_id === pid)

  const businessList = ['전체', ...[...new Set(applications.filter(a => a.related_program).map(a => a.related_program))]]

  const filteredApps = applications.filter(a => {
    const matchProg = !filterProgram || a.program_id === filterProgram
    const matchSearch = !searchStudent ||
      a.applicant_name?.includes(searchStudent) ||
      a.company_name?.includes(searchStudent) ||
      a.phone?.includes(searchStudent)
    const matchBusiness = filterBusiness === '전체' || a.related_program === filterBusiness
    return matchProg && matchSearch && matchBusiness
  })

  const completedApps = applications.filter(a => a.status === '수료')

  const stats = {
    total: programs.length,
    recruiting: programs.filter(p => p.status === '모집중').length,
    ongoing: programs.filter(p => p.status === '진행중').length,
    done: programs.filter(p => p.status === '완료').length,
  }

  const sortByStartAsc = arr => [...arr].sort((a, b) => (a.start_date || '') < (b.start_date || '') ? -1 : 1)
  const sortByEndDesc  = arr => [...arr].sort((a, b) => (a.end_date   || '') > (b.end_date   || '') ? -1 : 1)

  const progGroups = {
    '모집중': sortByStartAsc(programs.filter(p => p.status === '모집중')),
    '진행중': sortByStartAsc(programs.filter(p => p.status === '진행중')),
    '완료':   sortByEndDesc(programs.filter(p => p.status === '완료')),
  }

  const filteredPrograms = filterStatus ? (progGroups[filterStatus] ?? []) : []

  function renderProgramRows(list) {
    return list.map(p => {
      const enrolled = appsByProgram(p.id).length
      return (
        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
          <td className="px-4 py-2.5">
            <button onClick={() => setStudentsModal(p)} className="font-medium text-blue-600 hover:underline text-xs">{p.title}</button>
          </td>
          <td className="px-4 py-2.5"><span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">{p.category}</span></td>
          <td className="px-4 py-2.5 text-xs text-gray-600">{p.program_type}</td>
          <td className="px-4 py-2.5 text-xs text-gray-500">
            {p.start_date && <span>{p.start_date}{p.start_time ? ' ' + String(p.start_time).slice(0, 5) : ''}{' ~ '}{p.end_date}{p.end_time ? ' ' + String(p.end_time).slice(0, 5) : ''}</span>}
          </td>
          <td className="px-4 py-2.5 text-xs text-gray-600">{p.total_hours ? `${p.total_hours}시간 (${p.total_sessions}회)` : '-'}</td>
          <td className="px-4 py-2.5 text-xs text-gray-600">{enrolled}명 / {p.max_participants ? `${p.max_participants}명` : '제한없음'}</td>
          <td className="px-4 py-2.5 text-xs text-gray-600">{p.assignee || '-'}</td>
          <td className="px-4 py-2.5">
            <span className={`px-2 py-0.5 text-xs rounded font-medium ${STATUS_COLOR[p.status] || 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
          </td>
          <td className="px-4 py-2.5">
            {canWrite && (
              <div className="flex gap-1.5">
                <button onClick={() => openEditProgram(p)} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">수정</button>
                <button onClick={() => deleteProgram(p.id)} className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50">삭제</button>
              </div>
            )}
          </td>
        </tr>
      )
    })
  }

  const TABLE_HEADERS = ['교육명', '카테고리', '유형', '기간', '교육시간', '수강인원/정원', '담당자', '상태', '관리']

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <PageHeader title="교육 프로그램 관리" />

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── 탭 1: 교육 프로그램 ─── */}
      {tab === 'programs' && (
        <div className="space-y-4">
          {/* 요약 카드 — 클릭 시 해당 상태 필터 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: '전체 프로그램', value: `${stats.total}개`,      color: 'blue',   key: '' },
              { label: '모집중',        value: `${stats.recruiting}개`, color: 'teal',   key: '모집중' },
              { label: '진행중',        value: `${stats.ongoing}개`,    color: 'orange', key: '진행중' },
              { label: '완료',          value: `${stats.done}개`,       color: 'green',  key: '완료' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setFilterStatus(prev => prev === s.key ? '' : s.key)}
                className={`text-left w-full rounded-xl transition-all ${filterStatus === s.key ? 'ring-2 ring-offset-2 ring-blue-400' : 'hover:opacity-80'}`}
              >
                <StatCard label={s.label} value={s.value} color={s.color} />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              {filterStatus && (
                <button
                  onClick={() => setFilterStatus('')}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 border border-gray-300 rounded-lg"
                >
                  <X size={12} /> 필터 해제 ({filterStatus})
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {hasRole('admin') && (
                <button onClick={() => setShowRelatedProgramModal(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition">
                  사업명 관리
                </button>
              )}
              {canWrite && (
                <button onClick={openAddProgram} className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg font-medium" style={{ background: '#2E75B6' }}>
                  <Plus size={15} /> 프로그램 등록
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400">로딩 중...</div>
          ) : filterStatus ? (
            /* ── 특정 상태 필터 적용: 단일 테이블 ── */
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {TABLE_HEADERS.map(h => <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredPrograms.length === 0
                    ? <tr><td colSpan={9} className="text-center py-10 text-gray-400">해당 상태의 프로그램이 없습니다</td></tr>
                    : renderProgramRows(filteredPrograms)
                  }
                </tbody>
              </table>
            </div>
          ) : (
            /* ── 전체 보기: 상태별 섹션 ── */
            <div className="space-y-5">
              {(['모집중', '진행중'] ).map(status => (
                <div key={status}>
                  <div className={`flex items-center gap-2 mb-2 px-1`}>
                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLOR[status]}`}>{status}</span>
                    <span className="text-xs text-gray-400">{progGroups[status].length}개</span>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {TABLE_HEADERS.map(h => <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {progGroups[status].length === 0
                          ? <tr><td colSpan={9} className="text-center py-6 text-gray-400 text-xs">{status} 프로그램이 없습니다</td></tr>
                          : renderProgramRows(progGroups[status])
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {/* 완료 — 접힘 토글 */}
              <div>
                <button
                  onClick={() => setDoneExpanded(v => !v)}
                  className="flex items-center gap-2 mb-2 px-1 w-full text-left"
                >
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLOR['완료']}`}>완료</span>
                  <span className="text-xs text-gray-400">{progGroups['완료'].length}개</span>
                  {doneExpanded ? <ChevronUp size={14} className="text-gray-400 ml-auto" /> : <ChevronDown size={14} className="text-gray-400 ml-auto" />}
                </button>
                {doneExpanded && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {TABLE_HEADERS.map(h => <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {progGroups['완료'].length === 0
                          ? <tr><td colSpan={9} className="text-center py-6 text-gray-400 text-xs">완료된 프로그램이 없습니다</td></tr>
                          : renderProgramRows(progGroups['완료'])
                        }
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {programs.length === 0 && (
                <div className="text-center py-10 text-gray-400">등록된 프로그램이 없습니다</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── 탭 2: 수강생 관리 ─── */}
      {tab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <select
                className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
                value={filterProgram}
                onChange={e => setFilterProgram(e.target.value)}
              >
                <option value="">전체 프로그램</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <select
                value={filterBusiness}
                onChange={e => setFilterBusiness(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
              >
                {businessList.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-48"
                  placeholder="이름·기업명·연락처 검색"
                  value={searchStudent}
                  onChange={e => setSearchStudent(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadStudentExcel}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
              >
                <Download size={15} /> 엑셀 다운로드
              </button>
              {canWrite && (
                <button
                  onClick={openAddStudent}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg font-medium"
                  style={{ background: '#2E75B6' }}
                >
                  <Plus size={15} /> 수강생 추가
                </button>
              )}
            </div>
          </div>

          {selectedStudents.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="text-sm font-medium text-blue-700">{selectedStudents.size}명 선택됨</span>
              <select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value)}
                className="text-sm border border-blue-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700"
              >
                <option value="">상태 변경 없음</option>
                {APP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={bulkBusiness}
                onChange={e => setBulkBusiness(e.target.value)}
                className="text-sm border border-blue-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700"
              >
                <option value="__no_change__">참여사업 변경 없음</option>
                <option value="">미지정</option>
                {relatedPrograms.map(rp => <option key={rp.id} value={rp.name}>{rp.name}</option>)}
              </select>
              <button
                onClick={applyBulkChanges}
                disabled={saving}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition"
              >
                적용
              </button>
              <button
                onClick={() => setSelectedStudents(new Set())}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                선택 해제
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={filteredApps.length > 0 && filteredApps.every(a => selectedStudents.has(a.id))}
                      ref={el => { if (el) el.indeterminate = filteredApps.some(a => selectedStudents.has(a.id)) && !filteredApps.every(a => selectedStudents.has(a.id)) }}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedStudents(new Set(filteredApps.map(a => a.id)))
                        } else {
                          setSelectedStudents(new Set())
                        }
                      }}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </th>
                  {['이름', '기업명', '연락처', '이메일', '프로그램', '신청일', '상태', '참여 사업', '출석률', '만족도조사', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredApps.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-10 text-gray-400">수강생이 없습니다</td></tr>
                ) : filteredApps.map(a => (
                  <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50 ${selectedStudents.has(a.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(a.id)}
                        onChange={e => {
                          const next = new Set(selectedStudents)
                          if (e.target.checked) next.add(a.id)
                          else next.delete(a.id)
                          setSelectedStudents(next)
                        }}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-800">
                      {a.applicant_name}
                      {a.founder_id && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-600 rounded">상담자</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{a.company_name || '-'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{a.phone || '-'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{a.email || '-'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{a.education_programs?.title || '-'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{a.applied_at?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5">
                      {canWrite ? (
                        <select
                          value={a.status}
                          onChange={e => updateAppStatus(a.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded border font-medium ${STATUS_COLOR[a.status]}`}
                        >
                          {APP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${STATUS_COLOR[a.status]}`}>{a.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {canWrite ? (
                        <select
                          value={a.related_program || ''}
                          onChange={e => updateAppBusiness(a.id, e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 bg-white max-w-[140px]"
                        >
                          <option value="">미지정</option>
                          {relatedPrograms.map(rp => (
                            <option key={rp.id} value={rp.name}>{rp.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span>{a.related_program || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {(() => {
                        const prog = programs.find(p => p.id === a.program_id)
                        const threshold = prog?.completion_rate ?? 80
                        const rate = a.attendance_rate || 0
                        const canComplete = rate >= threshold
                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-xs text-gray-600">{rate}%</span>
                            </div>
                            {a.status !== '수료' && a.status !== '미수료' && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit ${canComplete ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {canComplete ? '수료 가능' : `출석 부족 (기준 ${threshold}%)`}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-2.5">
                      {a.survey_completed ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded font-medium">조사완료</span>
                          {a.survey_data && (() => {
                            const ratings = [a.survey_data.q1, a.survey_data.q2, a.survey_data.q3, a.survey_data.q4, a.survey_data.q5].filter(Boolean)
                            if (ratings.length === 0) return null
                            const avg = (ratings.reduce((s, v) => s + v, 0) / ratings.length).toFixed(1)
                            return <div className="text-[10px] text-gray-500">평균 {avg}점</div>
                          })()}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded font-medium">미완료</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {canWrite && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => loadAttendance(a)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            출석
                          </button>
                          <button
                            onClick={() => openEditStudent(a)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => deleteStudent(a.id)}
                            className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50"
                          >
                            삭제
                          </button>
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

      {/* ─── 탭 3: 수료 관리 ─── */}
      {tab === 'certificates' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['이름', '프로그램', '교육기간', '수료일', '수료증 번호', '관리'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completedApps.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">수료 처리된 수강생이 없습니다</td></tr>
                ) : completedApps.map(a => {
                  const cert = certificates.find(c => c.application_id === a.id)
                  const prog = a.education_programs
                  return (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{a.applicant_name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-600">{prog?.title || '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {prog?.start_date && (
                          <span>
                            {prog.start_date}{prog.start_time ? ' ' + String(prog.start_time).slice(0, 5) : ''}
                            {' ~ '}
                            {prog.end_date}{prog.end_time ? ' ' + String(prog.end_time).slice(0, 5) : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{cert?.issued_at?.slice(0, 10) || '-'}</td>
                      <td className="px-4 py-2.5 text-xs font-mono text-gray-700">{cert?.certificate_number || '-'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5">
                          {cert && (
                            <>
                              <button
                                onClick={() => setCertPreview({ cert, app: a, prog })}
                                className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                              >
                                미리보기
                              </button>
                              <a
                                href={`/certificate/${cert.id}?autoprint=1`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs px-2 py-1 border border-blue-200 text-blue-600 rounded hover:bg-blue-50"
                              >
                                <Printer size={11} /> 인쇄
                              </a>
                              <button
                                onClick={() => sendCertEmail(cert)}
                                className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                              >
                                <Mail size={11} /> 발송
                              </button>
                            </>
                          )}
                          {!cert && canWrite && (
                            <button
                              onClick={() => issueCertificate(a.id)}
                              disabled={issuingId === a.id}
                              className="text-xs px-2 py-1 border border-green-300 text-green-600 rounded hover:bg-green-50 disabled:opacity-40"
                            >
                              {issuingId === a.id ? '발급 중...' : '수료증 발급'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 프로그램 등록/수정 모달 ─── */}
      {showProgramModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">{editProgram ? '프로그램 수정' : '프로그램 등록'}</h2>
              <button onClick={() => setShowProgramModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <Field label="교육명 *">
                <input className="input-base" value={programForm.title} onChange={e => setProgramForm(f => ({ ...f, title: e.target.value }))} placeholder="교육 프로그램명 입력" />
              </Field>
              <Field label="교육 설명">
                <textarea className="input-base h-20 resize-none" value={programForm.description} onChange={e => setProgramForm(f => ({ ...f, description: e.target.value }))} placeholder="교육 내용 설명 (짧은 소개)" />
              </Field>
              <Field label="교육 개요 (아코디언 펼침 내용)">
                <textarea className="input-base h-24 resize-none" value={programForm.overview} onChange={e => setProgramForm(f => ({ ...f, overview: e.target.value }))} placeholder="교육 세부 개요, 커리큘럼, 주요 내용 등" />
              </Field>
              <Field label="교육 포스터 이미지">
                {programForm.poster_url && !posterFile && (
                  <div className="mb-2">
                    <div className="flex items-start gap-2">
                      <img src={programForm.poster_url} alt="현재 포스터" className="w-20 h-20 object-cover rounded border border-gray-200" />
                      <button
                        onClick={() => handleDeletePoster(editProgram?.id)}
                        className="text-xs text-red-400 hover:text-red-600 border border-red-200 rounded px-2 py-1 mt-1"
                      >
                        🗑 포스터 삭제
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">현재 포스터 (새 파일 선택 시 교체됩니다)</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setPosterFile(e.target.files[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="카테고리">
                  <select className="input-base" value={programForm.category} onChange={e => setProgramForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="교육 유형">
                  <select className="input-base" value={programForm.program_type} onChange={e => setProgramForm(f => ({ ...f, program_type: e.target.value }))}>
                    {PROGRAM_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="강사 소속">
                  <input className="input-base" value={programForm.instructor_organization} onChange={e => setProgramForm(f => ({ ...f, instructor_organization: e.target.value }))} placeholder="예: 울산대학교" />
                </Field>
                <Field label="강사명">
                  <input className="input-base" value={programForm.instructor_name} onChange={e => setProgramForm(f => ({ ...f, instructor_name: e.target.value }))} placeholder="예: 홍길동" />
                </Field>
              </div>
              <Field label="교육 장소">
                <input className="input-base" value={programForm.location} onChange={e => setProgramForm(f => ({ ...f, location: e.target.value }))} placeholder="예: 울산경제일자리진흥원 3층 교육장" />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Field label="시작일">
                    <input type="date" className="input-base" value={programForm.start_date} onChange={e => setProgramForm(f => ({ ...f, start_date: e.target.value }))} />
                  </Field>
                </div>
                <Field label="시작시간">
                  <input type="time" className="input-base" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Field label="종료일">
                    <input type="date" className="input-base" value={programForm.end_date} onChange={e => setProgramForm(f => ({ ...f, end_date: e.target.value }))} />
                  </Field>
                </div>
                <Field label="종료시간">
                  <input type="time" className="input-base" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="총 회차 수">
                  <input type="number" min="1" className="input-base" value={programForm.total_sessions} onChange={e => setProgramForm(f => ({ ...f, total_sessions: Number(e.target.value) }))} />
                </Field>
                <Field label="회차당 교육시간 (시간)">
                  <input type="number" min="1" className="input-base" value={programForm.hours_per_session} onChange={e => setProgramForm(f => ({ ...f, hours_per_session: Number(e.target.value) }))} placeholder="2" />
                </Field>
              </div>
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700 font-medium">
                총 교육시간: {(programForm.total_sessions || 1) * (programForm.hours_per_session || 2)}시간 ({programForm.total_sessions || 1}회 × {programForm.hours_per_session || 2}시간)
              </div>
              <Field label="수료 기준 출석률 (%)">
                <input
                  type="number" min="0" max="100" className="input-base"
                  value={programForm.completion_rate}
                  onChange={e => setProgramForm(f => ({ ...f, completion_rate: Number(e.target.value) }))}
                  placeholder="80"
                />
                <p className="text-xs text-gray-400 mt-1">해당 출석률 이상 시 수료 처리됩니다</p>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="최대 수강인원">
                  <input type="number" min="1" className="input-base" value={programForm.max_participants} onChange={e => setProgramForm(f => ({ ...f, max_participants: e.target.value }))} placeholder="제한없음" />
                </Field>
                <Field label="담당자">
                  <select className="input-base" value={programForm.assignee} onChange={e => setProgramForm(f => ({ ...f, assignee: e.target.value }))}>
                    <option value="">선택</option>
                    {profiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="상태">
                  <select className="input-base" value={programForm.status} onChange={e => setProgramForm(f => ({ ...f, status: e.target.value }))}>
                    {PROGRAM_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="만족도 조사 문항">
                <p className="text-xs text-gray-400 mb-2">수강생 포털 만족도 조사에 사용될 문항입니다. 비워두면 기본 5개 문항이 사용됩니다.</p>
                <div className="space-y-2">
                  {(programForm.survey_questions || []).map((q, idx, arr) => {
                    const qObj = typeof q === 'string' ? { text: q, type: 'rating' } : q
                    const moveQ = (dir) => setProgramForm(f => {
                      const qs = [...f.survey_questions]
                      const ni = idx + dir
                      if (ni < 0 || ni >= qs.length) return f
                      ;[qs[idx], qs[ni]] = [qs[ni], qs[idx]]
                      return { ...f, survey_questions: qs }
                    })
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5 shrink-0 text-right">{idx + 1}.</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${qObj.type === 'text' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {qObj.type === 'text' ? '주관식' : '객관식'}
                        </span>
                        <input
                          className="input-base flex-1"
                          value={qObj.text}
                          onChange={e => setProgramForm(f => ({
                            ...f,
                            survey_questions: f.survey_questions.map((v, i) => {
                              if (i !== idx) return v
                              const vObj = typeof v === 'string' ? { text: v, type: 'rating' } : v
                              return { ...vObj, text: e.target.value }
                            })
                          }))}
                          placeholder={`문항 ${idx + 1}`}
                        />
                        <div className="flex flex-col shrink-0">
                          <button type="button" onClick={() => moveQ(-1)} disabled={idx === 0}
                            className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 transition">
                            <ChevronUp size={13} />
                          </button>
                          <button type="button" onClick={() => moveQ(1)} disabled={idx === arr.length - 1}
                            className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 transition">
                            <ChevronDown size={13} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setProgramForm(f => ({
                            ...f,
                            survey_questions: f.survey_questions.filter((_, i) => i !== idx)
                          }))}
                          className="p-1 text-gray-300 hover:text-red-400 transition shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })}
                  <div className="flex gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setProgramForm(f => ({
                        ...f,
                        survey_questions: [...(f.survey_questions || []), { text: '', type: 'rating' }]
                      }))}
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition"
                    >
                      <Plus size={13} /> 객관식 문항 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => setProgramForm(f => ({
                        ...f,
                        survey_questions: [...(f.survey_questions || []), { text: '', type: 'text' }]
                      }))}
                      className="flex items-center gap-1 text-xs text-green-500 hover:text-green-700 transition"
                    >
                      <Plus size={13} /> 주관식 문항 추가
                    </button>
                  </div>
                </div>
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowProgramModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={saveProgram} disabled={saving} className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-40" style={{ background: '#2E75B6' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 수강생 목록 모달 ─── */}
      {studentsModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">{studentsModal.title} — 수강생 목록</h2>
              <button onClick={() => setStudentsModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['이름', '기업명', '연락처', '신청일', '상태', '출석률'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appsByProgram(studentsModal.id).length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">신청자가 없습니다</td></tr>
                  ) : appsByProgram(studentsModal.id).map(a => (
                    <tr key={a.id} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-xs font-medium text-gray-800">{a.applicant_name}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{a.company_name || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{a.phone || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{a.applied_at?.slice(0, 10)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${STATUS_COLOR[a.status]}`}>{a.status}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">{a.attendance_rate || 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── 출석 관리 모달 ─── */}
      {attendanceModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">{attendanceModal.applicant_name} — 출석 관리</h2>
              <button onClick={() => setAttendanceModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs text-gray-500 mb-3">
                프로그램: {attendanceModal.education_programs?.title} | 출석률: {attendanceModal.attendance_rate || 0}%
              </p>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: programs.find(p => p.id === attendanceModal.program_id)?.total_sessions || 1 }, (_, i) => {
                  const session = i + 1
                  const rec = attendance.find(a => a.session_number === session)
                  const attended = rec?.status === '출석'
                  return (
                    <button
                      key={session}
                      onClick={() => toggleAttendance(attendanceModal, session, rec)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        attended ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-200 hover:border-green-300'
                      }`}
                    >
                      {session}회차
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setAttendanceModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 수강생 직접 입력/수정 모달 ─── */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">{editStudent ? '수강생 정보 수정' : '수강생 직접 등록'}</h2>
              <button onClick={() => setShowStudentModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <Field label="프로그램 *">
                <select
                  className="input-base"
                  value={studentForm.program_id}
                  onChange={e => setStudentForm(f => ({ ...f, program_id: e.target.value }))}
                >
                  <option value="">프로그램 선택</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </Field>
              <Field label="이름 *">
                <input
                  className="input-base"
                  value={studentForm.applicant_name}
                  onChange={e => setStudentForm(f => ({ ...f, applicant_name: e.target.value }))}
                  placeholder="수강생 이름"
                />
              </Field>
              <Field label="기업명 (선택)">
                <input
                  className="input-base"
                  value={studentForm.company_name}
                  onChange={e => setStudentForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="(선택) 예비창업자의 경우 미기재 가능"
                />
              </Field>
              <Field label="신청 동기 (선택)">
                <textarea
                  className="input-base resize-none h-20"
                  value={studentForm.motivation}
                  onChange={e => setStudentForm(f => ({ ...f, motivation: e.target.value }))}
                  placeholder="이 교육을 신청한 동기를 간략히 적어주세요 (선택사항)"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="연락처">
                  <input
                    className="input-base"
                    value={studentForm.phone}
                    onChange={e => setStudentForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                    placeholder="010-1234-5678" maxLength={13}
                  />
                </Field>
                <Field label="이메일">
                  <input
                    type="email"
                    className="input-base"
                    value={studentForm.email}
                    onChange={e => setStudentForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="example@email.com"
                  />
                </Field>
              </div>
              <Field label="상태">
                <select
                  className="input-base"
                  value={studentForm.status}
                  onChange={e => setStudentForm(f => ({ ...f, status: e.target.value }))}
                >
                  {APP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowStudentModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={saveStudent} disabled={saving} className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-40" style={{ background: '#2E75B6' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 수료증 미리보기 모달 ─── */}
      {certPreview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-800">수료증 미리보기</h2>
                <p className="text-xs text-gray-400 mt-0.5">{certPreview.cert?.certificate_number}</p>
              </div>
              <button onClick={() => setCertPreview(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            {/* 스케일된 A4 미리보기 */}
            <div style={{ overflow: 'hidden', display: 'flex', justifyContent: 'center', padding: '20px 16px', background: '#f3f4f6', minHeight: '380px' }}>
              <div style={{ transform: 'scale(0.68)', transformOrigin: 'top center', width: '540px', flexShrink: 0 }}>
                <CertificateView
                  name={certPreview.app.applicant_name}
                  programTitle={certPreview.prog?.title}
                  startDate={certPreview.prog?.start_date}
                  startTime={certPreview.prog?.start_time}
                  endDate={certPreview.prog?.end_date}
                  endTime={certPreview.prog?.end_time}
                  totalHours={certPreview.prog?.total_hours}
                  issuedAt={certPreview.cert?.issued_at}
                  certNumber={certPreview.cert?.certificate_number}
                />
              </div>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setCertPreview(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>
              <a
                href={`/certificate/${certPreview.cert?.id}?autoprint=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg"
                style={{ background: '#2E75B6' }}
              >
                <Printer size={14} /> 인쇄하기
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── 수료증 발급 완료 팝업 (Certificate.jsx 라우트를 iframe으로 그대로 재사용) ─── */}
      {issuedCert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-800">수료증 발급 완료</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {issuedCert.education_applications?.applicant_name} · {issuedCert.certificate_number}
                </p>
              </div>
              <button onClick={() => setIssuedCert(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100">
              <iframe
                src={`/certificate/${issuedCert.id}`}
                title="수료증 미리보기"
                style={{ width: '100%', height: '65vh', border: 'none' }}
              />
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2 flex-wrap">
              <button onClick={() => setIssuedCert(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>
              <a
                href={`/certificate/${issuedCert.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                새 창에서 크게 보기
              </a>
              <button
                onClick={() => sendCertEmail(issuedCert)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
              >
                <Mail size={14} /> 이메일 발송
              </button>
              <a
                href={`/certificate/${issuedCert.id}?autoprint=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg"
                style={{ background: '#2E75B6' }}
              >
                <Printer size={14} /> 인쇄
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── 승인 모달 ─── */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">수강 승인</h2>
              <button onClick={() => setApprovalModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">신청자</span><span className="font-medium text-gray-800">{approvalModal.app.applicant_name}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">연락처</span><span className="text-gray-700">{approvalModal.app.phone || '-'}</span></div>
                <div className="flex gap-2"><span className="text-gray-400 w-16 shrink-0">기업명</span><span className="text-gray-700">{approvalModal.app.company_name || '-'}</span></div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">참여 사업</label>
                <select
                  className="input-base"
                  value={approvalModal.selectedBusiness}
                  onChange={e => setApprovalModal(m => ({ ...m, selectedBusiness: e.target.value }))}
                >
                  <option value="">-- 사업 미지정 --</option>
                  {relatedPrograms.map(rp => (
                    <option key={rp.id} value={rp.name}>{rp.name} ({rp.year}년)</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setApprovalModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={confirmApproval} className="px-4 py-2 text-sm text-white rounded-lg font-bold" style={{ background: '#2E75B6' }}>승인 확정</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 사업명 관리 모달 ─── */}
      {showRelatedProgramModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">사업명 관리</h2>
              <button onClick={() => setShowRelatedProgramModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                {relatedPrograms.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">등록된 사업명이 없습니다.</p>
                ) : relatedPrograms.map(rp => (
                  <div key={rp.id} className="bg-gray-50 rounded-lg px-3 py-2.5">
                    {editingProgramId === rp.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="flex-1 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={editingProgramName}
                          onChange={e => setEditingProgramName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEditRelatedProgram()}
                        />
                        <select
                          className="w-24 border border-gray-200 rounded px-1 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          value={editingProgramYear}
                          onChange={e => setEditingProgramYear(Number(e.target.value))}
                        >
                          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}년</option>)}
                        </select>
                        <button onClick={saveEditRelatedProgram} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">저장</button>
                        <button onClick={() => setEditingProgramId(null)} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">취소</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-800">{rp.name}</span>
                          <span className="ml-2 text-xs text-gray-400">{rp.year}년</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => startEditRelatedProgram(rp)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">수정</button>
                          <button onClick={() => deleteRelatedProgram(rp.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">삭제</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <p className="text-xs font-medium text-gray-500">새 사업명 추가</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={newRelatedProgram.name}
                    onChange={e => setNewRelatedProgram(f => ({ ...f, name: e.target.value }))}
                    placeholder="사업명 입력"
                    onKeyDown={e => e.key === 'Enter' && addRelatedProgram()}
                  />
                  <select
                    className="w-28 border border-gray-200 rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={newRelatedProgram.year}
                    onChange={e => setNewRelatedProgram(f => ({ ...f, year: Number(e.target.value) }))}
                  >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                  <button
                    onClick={addRelatedProgram}
                    className="w-20 bg-blue-600 text-white rounded px-3 py-2 text-sm font-bold hover:bg-blue-700 transition"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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

// 창업지원부 부서코드: 03 고정
function formatCertNo(raw) {
  if (!raw) return '-'
  if (/^제\d{4}-\d{2}-\d{3}호$/.test(raw)) {
    return raw.replace(/^(제\d{4}-)\d{2}(-\d{3}호)$/, '$103$2')
  }
  const match = raw.match(/(\d{4})[^\d]*(\d{2,3})$/)
  if (match) {
    const year = match[1]
    const seq  = String(match[2]).padStart(3, '0')
    return `제${year}-03-${seq}호`
  }
  return raw
}

export function CertificateView({ name, programTitle, startDate, startTime, endDate, endTime, totalHours, issuedAt, certNumber }) {
  const issueDate = issuedAt ? new Date(issuedAt) : new Date()
  const y = issueDate.getFullYear()
  const m = String(issueDate.getMonth() + 1).padStart(2, '0')
  const d = String(issueDate.getDate()).padStart(2, '0')
  const certNo = formatCertNo(certNumber)

  return (
    <div style={{
      fontFamily: "'Gowun Batang', 'Noto Serif KR', 'Batang', serif",
      border: '3px double #1e3a6e',
      padding: '32px 28px',
      textAlign: 'center',
      minHeight: 480,
      position: 'relative',
      background: '#fff',
    }}>
      {/* 수료번호 — 좌측 상단 */}
      <p style={{ position: 'absolute', top: 10, left: 14, fontSize: '11px', color: '#9ca3af' }}>{certNo}</p>

      {/* 기관 로고 + 기관명 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <img src="/logo.gif" alt="울산경제일자리진흥원" style={{ height: 44, width: 44, objectFit: 'contain' }} />
        <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a6e', letterSpacing: '0.2em' }}>울산경제일자리진흥원</p>
      </div>

      {/* 제목 */}
      <h1 style={{ fontSize: '40px', fontWeight: 'bold', color: '#1a1a2e', letterSpacing: '0.5em', textIndent: '0.5em', lineHeight: 1, marginBottom: 20 }}>
        수료증
      </h1>

      {/* 교육 내용 */}
      <div style={{ borderTop: '2px solid #374151', borderBottom: '2px solid #374151', padding: '16px 0', maxWidth: 300, margin: '0 auto 16px', textAlign: 'left' }}>
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', color: '#374151', width: 80, paddingBottom: 10, verticalAlign: 'top' }}>성&nbsp;&nbsp;&nbsp;&nbsp;명</td>
              <td style={{ color: '#1f2937', paddingBottom: 10, verticalAlign: 'top' }}>:&nbsp;&nbsp;{name || '-'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', color: '#374151', paddingBottom: 10, verticalAlign: 'top' }}>교&nbsp;육&nbsp;명</td>
              <td style={{ color: '#1f2937', paddingBottom: 10, verticalAlign: 'top', lineHeight: 1.5 }}>:&nbsp;&nbsp;{programTitle || '-'}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', color: '#374151', paddingBottom: 10, verticalAlign: 'top' }}>교육기간</td>
              <td style={{ color: '#1f2937', paddingBottom: 10, verticalAlign: 'top' }}>
                :&nbsp;&nbsp;{startDate
                    ? (() => {
                        const { date, time } = formatPeriod(startDate, startTime, endDate, endTime)
                        return time ? `${date} (${time})` : date
                      })()
                    : '-'}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', color: '#374151', verticalAlign: 'top' }}>교육시간</td>
              <td style={{ color: '#1f2937', verticalAlign: 'top' }}>:&nbsp;&nbsp;{totalHours ? `${totalHours}시간` : '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 본문 */}
      <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 2, marginBottom: 20, letterSpacing: '0.03em' }}>
        위 사람은 위의 교육과정을 성실히 이수하였기에<br />이 증서를 수여합니다.
      </p>

      {/* 날짜 & 서명 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <p style={{ fontSize: '15px', color: '#374151', letterSpacing: '0.08em' }}>
          {y}년&nbsp;&nbsp;{Number(m)}월&nbsp;&nbsp;{Number(d)}일
        </p>
        {/* 원장 서명 영역 */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e3a6e', letterSpacing: '0.04em' }}>
            울산경제일자리진흥원장
          </span>
          {/* (인) + 관인 겹침 영역 */}
          <div style={{ position: 'relative', marginLeft: '8px', width: '60px', height: '60px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ position: 'relative', zIndex: 2, fontSize: '15px', fontWeight: 'bold', color: '#1e3a6e' }}>(인)</span>
            <img
              src="/seal.png"
              alt="전자관인"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '65px',
                height: '65px',
                objectFit: 'contain',
                opacity: 0.85,
                zIndex: 1,
                pointerEvents: 'none',
              }}
              onError={e => { e.target.style.display = 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// input 공통 스타일 (tailwind 적용)
const style = document.createElement('style')
style.textContent = `.input-base { width: 100%; border: 1px solid #D1D5DB; border-radius: 0.5rem; padding: 0.375rem 0.625rem; font-size: 0.875rem; outline: none; } .input-base:focus { box-shadow: 0 0 0 1px #3B82F6; border-color: #3B82F6; }`
document.head.appendChild(style)
