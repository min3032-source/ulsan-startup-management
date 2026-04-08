import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { DEFAULT_SETTINGS, Q_LABELS, today } from '../../lib/constants'
import { StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'

const emptyForm = () => ({
  founder_id: '', date: today(), staff: '', method: '', verdict: '',
  final_verdict: '', request: '', content: '', programs: [],
  status: '완료', follow_up: '', next_date: '', memo: '',
})

export default function Consult() {
  const { hasRole } = useAuth()
  const canWrite = hasRole("manager")
  const canDelete = hasRole("admin")

  const [consults, setConsults] = useState([])
  const [founders, setFounders] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [users, setUsers] = useState([])
  const [flashId, setFlashId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterStaff, setFilterStaff] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [privacyAgreed, setPrivacyAgreed] = useState(false)
  const [showPrivacyDetail, setShowPrivacyDetail] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: c }, { data: f }, { data: s }, { data: u }] = await Promise.all([
        supabase.from('consults').select('*').order('date', { ascending: false }),
        supabase.from('founders').select('id, name, verdict, biz'),
        supabase.from('team_settings').select('*').limit(1).single(),
        supabase.from('profiles').select('id, name').order('name'),
      ])
      setConsults(c || [])
      setFounders(f || [])
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s })
      setUsers(u || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const founderMap = Object.fromEntries(founders.map(f => [f.id, f]))

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setPrivacyAgreed(false)
    setShowPrivacyDetail(false)
    setModalOpen(true)
  }

  function openEdit(c) {
    setEditingId(c.id)
    setPrivacyAgreed(false)
    setShowPrivacyDetail(false)
    setForm({
      founder_id: c.founder_id || '', date: c.date || today(),
      staff: c.staff || '', method: c.method || '',
      verdict: c.verdict || '', final_verdict: c.final_verdict || '',
      request: c.request || '', content: c.content || '',
      programs: c.programs || [],
      status: c.status || '완료',
      follow_up: c.follow_up || '', next_date: c.next_date || '',
      memo: c.memo || '',
    })
    setModalOpen(true)
  }

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function toggleProgram(prog) {
    setForm(p => {
      const progs = p.programs || []
      return { ...p, programs: progs.includes(prog) ? progs.filter(x => x !== prog) : [...progs, prog] }
    })
  }

  async function handleSave() {
    if (!form.founder_id) { alert('창업자를 선택해주세요'); return }
    const payload = { ...form }
    try {
      if (editingId) {
        const { error } = await supabase.from('consults').update(payload).eq('id', editingId)
        if (error) throw error
        setConsults(prev => prev.map(c => c.id === editingId ? { ...c, ...payload } : c))
      } else {
        const { data, error } = await supabase.from('consults').insert([payload]).select().single()
        if (error) throw error
        setConsults(prev => [data, ...prev])
      }
      setModalOpen(false)
    } catch (e) {
      alert('저장 실패: ' + e.message)
    }
  }

  async function handleStaffChange(id, value) {
    const { error } = await supabase.from('consults').update({ staff: value }).eq('id', id)
    if (error) { alert('담당자 변경 실패: ' + error.message); return }
    setConsults(prev => prev.map(c => c.id === id ? { ...c, staff: value } : c))
    setFlashId(id)
    setTimeout(() => setFlashId(null), 1200)
  }

  async function handleDelete(id) {
    if (!confirm('이 상담일지를 삭제하시겠습니까?')) return
    const { error } = await supabase.from('consults').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setConsults(prev => prev.filter(c => c.id !== id))
  }

  const filtered = consults.filter(c => {
    const fn = founderMap[c.founder_id]?.name || ''
    return (
      (!search || fn.includes(search) || c.staff?.includes(search)) &&
      (!filterStatus || c.status === filterStatus) &&
      (!filterStaff || c.staff === filterStaff)
    )
  })

  const doneCount = consults.filter(c => c.status === '완료').length
  const followCount = consults.filter(c => c.status === '후속필요').length

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-800">상담일지</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 상담" value={`${consults.length}건`} color="blue" />
        <StatCard label="완료" value={`${doneCount}건`} color="green" />
        <StatCard label="후속 필요" value={`${followCount}건`} color="orange" />
        <StatCard label="담당자 수" value={`${new Set(consults.map(c => c.staff).filter(Boolean)).size}명`} color="teal" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
              placeholder="창업자·담당자 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">전체 상태</option>
            <option>완료</option><option>후속필요</option><option>진행중</option>
          </select>
          <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterStaff} onChange={e => setFilterStaff(e.target.value)}>
            <option value="">전체 담당자</option>
            {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: '#2E75B6' }}>
          <Plus size={15} /> 상담일지 등록
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['상담자명', '기업명', '상담일', '담당자', '방법', '상태', '다음상담예정일', '관리'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">등록된 상담일지가 없습니다</td></tr>
            ) : filtered.map(c => {
              const f = founderMap[c.founder_id]
              return (
                <tr key={c.id} className={`border-b border-gray-50 transition-colors ${
                  flashId === c.id ? 'bg-green-50' : 'hover:bg-gray-50'
                }`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={f?.name} />
                      <span className="font-medium text-gray-800 text-xs">{f?.name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{f?.biz || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{c.date}</td>
                  <td className="px-4 py-2.5">
                    <select
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-transparent hover:border-gray-400 focus:outline-none focus:border-blue-400 max-w-[90px]"
                      value={c.staff || ''}
                      onChange={e => handleStaffChange(c.id, e.target.value)}
                    >
                      <option value="">-</option>
                      {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{c.method || '-'}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{c.next_date || '-'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? '상담일지 수정' : '상담일지 등록'} wide
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button
              onClick={handleSave}
              disabled={!privacyAgreed}
              className="px-4 py-1.5 text-sm text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#2E75B6' }}
            >
              저장
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">창업자 *</label>
              <select className="form-input" value={form.founder_id} onChange={e => setField('founder_id', e.target.value)}>
                <option value="">선택</option>
                {founders.map(f => <option key={f.id} value={f.id}>{f.name} ({f.biz || ''})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">담당자</label>
              <select className="form-input" value={form.staff} onChange={e => setField('staff', e.target.value)}>
                <option value="">선택</option>
                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">상담일</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setField('date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">방식</label>
              <select className="form-input" value={form.method} onChange={e => setField('method', e.target.value)}>
                <option value="">선택</option>
                {settings.methods.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">상태</label>
              <select className="form-input" value={form.status} onChange={e => setField('status', e.target.value)}>
                {['상담중', '완료', '후속필요', '보류'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">판정</label>
              <input className="form-input" value={form.verdict} onChange={e => setField('verdict', e.target.value)} placeholder="예: 테크 창업 가능성 높음" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">최종 판정</label>
              <input className="form-input" value={form.final_verdict} onChange={e => setField('final_verdict', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">상담 요청 내용</label>
            <textarea className="form-input" value={form.request} onChange={e => setField('request', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">상담 내용</label>
            <textarea className="form-input" rows={3} value={form.content} onChange={e => setField('content', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">연계 프로그램</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {settings.programs.map(p => (
                <label key={p} className="flex items-center gap-1 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={(form.programs || []).includes(p)}
                    onChange={() => toggleProgram(p)}
                    className="w-3.5 h-3.5"
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">후속 조치</label>
              <input className="form-input" value={form.follow_up} onChange={e => setField('follow_up', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">다음 상담 예정일</label>
              <input type="date" className="form-input" value={form.next_date} onChange={e => setField('next_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
            <textarea className="form-input" value={form.memo} onChange={e => setField('memo', e.target.value)} />
          </div>

          {/* 개인정보 수집·이용 동의 */}
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="privacy-agree"
                checked={privacyAgreed}
                onChange={e => setPrivacyAgreed(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="privacy-agree" className="text-xs text-gray-700 cursor-pointer">
                개인정보 수집·이용에 동의합니다. <span className="text-red-500">(필수)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPrivacyDetail(v => !v)}
                className="text-xs text-blue-500 hover:text-blue-700 underline ml-1"
              >
                {showPrivacyDetail ? '닫기' : '내용보기'}
              </button>
            </div>
            {showPrivacyDetail && (
              <div className="text-xs text-gray-600 bg-white border border-gray-200 rounded p-3 space-y-1 leading-relaxed">
                <div><span className="font-medium">수집 항목:</span> 성명, 연락처, 이메일, 사업 관련 정보</div>
                <div><span className="font-medium">수집 목적:</span> 창업 상담 서비스 제공</div>
                <div><span className="font-medium">보유 기간:</span> 상담 종료 후 3년</div>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
