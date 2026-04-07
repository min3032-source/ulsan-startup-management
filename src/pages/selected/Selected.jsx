import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ULSAN_REGIONS, DEFAULT_SETTINGS, NOTE_TYPES, today } from '../../lib/constants'
import { VerdictBadge, StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react'

const emptyFirmForm = () => ({
  company_name: '', ceo: '', biz_no: '', found_year: '', employees: '',
  biz_type: '', biz_item: '', sector: '', type: '테크', region: '',
  gender: '', phone: '', email: '',
  program: '', sub_program: '', staff: '', start_date: today(), end_date: '',
  amount: '', status: '지원중', post_mgmt: '후속관리중', memo: '',
})

const emptyNoteForm = () => ({
  firm_id: '', staff: '', date: today(), type: '방문점검', content: '', next_date: '',
})

export default function Selected() {
  const { hasRole } = useAuth()
  const canWrite = hasRole("manager")
  const canDelete = hasRole("admin")

  const [firms, setFirms] = useState([])
  const [notes, setNotes] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
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

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: f }, { data: n }, { data: s }] = await Promise.all([
        supabase.from('selected_firms').select('*').order('start_date', { ascending: false }),
        supabase.from('selected_notes').select('*').order('date', { ascending: false }),
        supabase.from('team_settings').select('*').limit(1).single(),
      ])
      setFirms(f || [])
      setNotes(n || [])
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function setFF(k, v) { setFirmForm(p => ({ ...p, [k]: v })) }
  function setNF(k, v) { setNoteForm(p => ({ ...p, [k]: v })) }

  function openAddFirm() { setFirmEditId(null); setFirmForm(emptyFirmForm()); setFirmModal(true) }
  function openEditFirm(f) {
    setFirmEditId(f.id)
    setFirmForm({
      company_name: f.company_name || '', ceo: f.ceo || '', biz_no: f.biz_no || '',
      found_year: f.found_year || '', employees: f.employees || '',
      biz_type: f.biz_type || '', biz_item: f.biz_item || '', sector: f.sector || '',
      type: f.type || '테크', region: f.region || '', gender: f.gender || '',
      phone: f.phone || '', email: f.email || '',
      program: f.program || '', sub_program: f.sub_program || '', staff: f.staff || '',
      start_date: f.start_date || today(), end_date: f.end_date || '',
      amount: f.amount || '', status: f.status || '지원중',
      post_mgmt: f.post_mgmt || '후속관리중', memo: f.memo || '',
    })
    setFirmModal(true)
  }

  async function saveFirm() {
    if (!firmForm.company_name.trim()) { alert('기업명을 입력해주세요'); return }
    if (!firmForm.ceo.trim()) { alert('대표자를 입력해주세요'); return }
    const payload = {
      ...firmForm,
      sector: (firmForm.biz_type || '') + (firmForm.biz_item ? ' / ' + firmForm.biz_item : ''),
    }
    try {
      if (firmEditId) {
        const { error } = await supabase.from('selected_firms').update(payload).eq('id', firmEditId)
        if (error) throw error
        setFirms(prev => prev.map(f => f.id === firmEditId ? { ...f, ...payload } : f))
      } else {
        const { data, error } = await supabase.from('selected_firms').insert([payload]).select().single()
        if (error) throw error
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
    const payload = { ...noteForm }
    try {
      if (noteEditId) {
        const { error } = await supabase.from('selected_notes').update(payload).eq('id', noteEditId)
        if (error) throw error
        setNotes(prev => prev.map(n => n.id === noteEditId ? { ...n, ...payload } : n))
      } else {
        const { data, error } = await supabase.from('selected_notes').insert([payload]).select().single()
        if (error) throw error
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
        <button onClick={openAddFirm} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: '#2E75B6' }}>
          <Plus size={15} /> 선정기업 등록
        </button>
      </div>

      {/* Filters */}
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
        activeTab === 'list' ? <FirmListTab firms={filteredFirms} notes={notes} onEdit={openEditFirm} onDelete={deleteFirm} onDetail={f => { setDetailFirm(f); setDetailOpen(true) }} /> :
        activeTab === 'program' ? <ProgramTab firms={firms} /> :
        <PostTab firms={firms} notes={notes} onAddNote={openAddNote} onDeleteNote={deleteNote} />
      }

      {/* Firm modal */}
      <Modal isOpen={firmModal} onClose={() => setFirmModal(false)} title={firmEditId ? '선정기업 수정' : '선정기업 등록'} wide
        footer={
          <>
            <button onClick={() => setFirmModal(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={saveFirm} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>저장</button>
          </>
        }
      >
        <div className="space-y-3">
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
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 space-y-3">
            <div className="text-xs font-semibold text-blue-800">지원사업 정보</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">지원사업명 *</label>
                <select className="form-input" value={firmForm.program} onChange={e => setFF('program', e.target.value)}>
                  <option value="">선택</option>
                  {settings.programs.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">세부 프로그램</label>
                <input className="form-input" value={firmForm.sub_program} onChange={e => setFF('sub_program', e.target.value)} placeholder="예: 비즈니스 모델 혁신 트랙" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">담당자</label>
              <select className="form-input" value={firmForm.staff} onChange={e => setFF('staff', e.target.value)}>
                <option value="">선택</option>
                {settings.staff.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">지원 시작일 *</label><input type="date" className="form-input" value={firmForm.start_date} onChange={e => setFF('start_date', e.target.value)} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">지원 종료일</label><input type="date" className="form-input" value={firmForm.end_date} onChange={e => setFF('end_date', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">지원금액(만원)</label><input type="number" className="form-input" value={firmForm.amount} onChange={e => setFF('amount', e.target.value)} /></div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">지원 상태</label>
                <select className="form-input" value={firmForm.status} onChange={e => setFF('status', e.target.value)}>
                  <option>지원중</option><option>완료</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">사후관리 상태</label>
                <select className="form-input" value={firmForm.post_mgmt} onChange={e => setFF('post_mgmt', e.target.value)}>
                  <option>후속관리중</option><option>성장추적중</option><option>완료</option>
                </select>
              </div>
            </div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">메모</label><textarea className="form-input" value={firmForm.memo} onChange={e => setFF('memo', e.target.value)} /></div>
        </div>
      </Modal>

      {/* Note modal */}
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
                {settings.staff.map(s => <option key={s}>{s}</option>)}
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

      {/* Detail Modal */}
      {detailFirm && (
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`${detailFirm.company_name} 상세`} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[['대표자', detailFirm.ceo], ['사업자번호', detailFirm.biz_no], ['설립연도', detailFirm.found_year],
                ['업종', detailFirm.sector], ['지역', detailFirm.region], ['임직원수', detailFirm.employees ? detailFirm.employees + '명' : '-'],
                ['연락처', detailFirm.phone], ['이메일', detailFirm.email], ['기업유형', detailFirm.type]].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-lg p-2.5">
                  <div className="text-xs text-gray-400">{l}</div>
                  <div className="text-sm font-medium text-gray-700">{v || '-'}</div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <div className="text-xs font-semibold text-blue-700 mb-2">지원사업 정보</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><span className="text-gray-500">사업명: </span><strong>{detailFirm.program}</strong></div>
                <div><span className="text-gray-500">시작일: </span>{detailFirm.start_date}</div>
                <div><span className="text-gray-500">종료일: </span>{detailFirm.end_date || <span className="text-orange-500">진행중</span>}</div>
                <div><span className="text-gray-500">지원금: </span><strong className="text-green-700">{detailFirm.amount ? Number(detailFirm.amount).toLocaleString() + '만원' : '-'}</strong></div>
                <div><span className="text-gray-500">담당자: </span>{detailFirm.staff}</div>
                <div><span className="text-gray-500">상태: </span><StatusBadge status={detailFirm.status} /></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500">사후관리 기록 ({notes.filter(n => n.firm_id === detailFirm.id).length}건)</div>
                <button onClick={() => { setDetailOpen(false); openAddNote(detailFirm.id) }} className="text-xs text-white px-2 py-1 rounded" style={{ background: '#2E75B6' }}>+ 기록 추가</button>
              </div>
              {notes.filter(n => n.firm_id === detailFirm.id).map(n => (
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
          </div>
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
            {['기업명', '대표자', '업종', '유형', '지원사업', '지원기간', '지원금(만원)', '담당', '상태', '사후관리', '관리'].map(h => (
              <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {firms.length === 0 ? (
            <tr><td colSpan={11} className="text-center py-10 text-gray-400 text-sm">등록된 선정기업이 없습니다</td></tr>
          ) : firms.map(f => {
            const lastNote = notes.filter(n => n.firm_id === f.id).sort((a, b) => b.date.localeCompare(a.date))[0]
            return (
              <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2.5">
                  <button onClick={() => onDetail(f)} className="font-bold text-blue-600 underline text-xs">{f.company_name}</button>
                </td>
                <td className="px-3 py-2.5 text-xs">{f.ceo}</td>
                <td className="px-3 py-2.5 text-xs text-gray-500 max-w-[80px] truncate">{f.sector}</td>
                <td className="px-3 py-2.5"><VerdictBadge verdict={f.type} /></td>
                <td className="px-3 py-2.5 text-xs font-medium">{f.program}</td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{f.start_date}<br />{f.end_date || <span className="text-orange-500">진행중</span>}</td>
                <td className="px-3 py-2.5 text-xs font-bold text-green-700">{f.amount ? Number(f.amount).toLocaleString() : '-'}</td>
                <td className="px-3 py-2.5 text-xs">{f.staff}</td>
                <td className="px-3 py-2.5"><StatusBadge status={f.status} /></td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    f.post_mgmt === '후속관리중' ? 'bg-orange-100 text-orange-700' :
                    f.post_mgmt === '성장추적중' ? 'bg-teal-100 text-teal-700' : 'bg-green-100 text-green-700'
                  }`}>{f.post_mgmt || '-'}</span>
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
              <div>
                <span className="font-semibold text-gray-800">{prog}</span>
                <span className="text-xs text-gray-400 ml-2">총 {list.length}개사</span>
              </div>
              <div className="flex gap-4">
                <span className="text-xs text-orange-600">진행중 {inProg}개사</span>
                <span className="text-sm font-bold text-green-700">{total.toLocaleString()}만원</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['기업명', '대표자', '유형', '지원기간', '지원금', '담당', '상태'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {list.map(f => (
                    <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs font-semibold">{f.company_name}</td>
                      <td className="px-4 py-2 text-xs">{f.ceo}</td>
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
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ml-1 ${f.post_mgmt === '후속관리중' ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'}`}>{f.post_mgmt}</span>
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
                      {n.next_date && (
                        <span className={`text-xs ml-auto ${n.next_date < today() ? 'text-red-500' : 'text-teal-600'}`}>다음: {n.next_date}</span>
                      )}
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
