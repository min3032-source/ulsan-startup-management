import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, Search } from 'lucide-react'
import StatCard from '../../components/common/StatCard'
import PageHeader from '../../components/common/PageHeader'
import { formatPhone } from '../../utils/formatPhone'

const STATUSES = ['신청', '승인', '완료', '취소']
const METHODS  = ['방문', '화상', '전화']

const STATUS_COLOR = {
  '신청': 'bg-amber-100 text-amber-700',
  '승인': 'bg-blue-100 text-blue-700',
  '완료': 'bg-green-100 text-green-700',
  '취소': 'bg-gray-100 text-gray-500',
}

const emptyForm = () => ({
  expert_id: '', applicant_name: '', phone: '', email: '',
  consult_field: '', consult_date: '', consult_method: '방문',
  content: '', result: '', status: '신청',
})

export default function ExpertConsult() {
  const { hasRole } = useAuth()
  const canWrite = hasRole('manager')

  const [consults, setConsults]   = useState([])
  const [experts, setExperts]     = useState([])
  const [founders, setFounders]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]           = useState(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: c }, { data: e }, { data: f }] = await Promise.all([
      supabase.from('expert_consultations')
        .select('*, experts(name, field)')
        .order('created_at', { ascending: false }),
      supabase.from('experts').select('id, name, field').order('name'),
      supabase.from('founders').select('id, name, phone, email').order('name'),
    ])
    setConsults(c || [])
    setExperts(e || [])
    setFounders(f || [])
    setLoading(false)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(c) {
    setEditingId(c.id)
    setForm({
      expert_id: c.expert_id || '', applicant_name: c.applicant_name || '',
      phone: c.phone || '', email: c.email || '',
      consult_field: c.consult_field || '', consult_date: c.consult_date || '',
      consult_method: c.consult_method || '방문',
      content: c.content || '', result: c.result || '', status: c.status || '신청',
    })
    setModalOpen(true)
  }

  async function save() {
    if (!form.applicant_name.trim()) { alert('신청자명을 입력해주세요'); return }
    if (!form.expert_id) { alert('전문가를 선택해주세요'); return }
    setSaving(true)
    const payload = {
      expert_id: form.expert_id || null,
      applicant_name: form.applicant_name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      consult_field: form.consult_field || null,
      consult_date: form.consult_date || null,
      consult_method: form.consult_method,
      content: form.content || null,
      result: form.result || null,
      status: form.status,
    }
    let error
    if (editingId) {
      ({ error } = await supabase.from('expert_consultations').update(payload).eq('id', editingId))
    } else {
      ({ error } = await supabase.from('expert_consultations').insert(payload))
    }
    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    setModalOpen(false)
    showToast(editingId ? '수정되었습니다.' : '상담이 등록되었습니다.')
    loadData()
  }

  async function remove(id) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('expert_consultations').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    showToast('삭제되었습니다.')
    loadData()
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('expert_consultations').update({ status }).eq('id', id)
    if (error) { alert('상태 변경 실패: ' + error.message); return }
    setConsults(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  // 멘티 선택 시 자동 채우기
  function selectFounder(id) {
    const f = founders.find(f => f.id === id)
    if (f) setForm(p => ({ ...p, applicant_name: f.name, phone: f.phone || '', email: f.email || '' }))
  }

  const filtered = consults.filter(c => {
    const matchSearch = !search || c.applicant_name?.includes(search) || c.experts?.name?.includes(search)
    const matchStatus = !filterStatus || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total: consults.length,
    신청: consults.filter(c => c.status === '신청').length,
    승인: consults.filter(c => c.status === '승인').length,
    완료: consults.filter(c => c.status === '완료').length,
  }

  return (
    <div className="p-6 space-y-5">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>
      )}

      <PageHeader title="전문가 상담" subtitle="1회성 전문가 자문 신청 및 관리" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 상담" value={`${stats.total}건`} color="blue" />
        <StatCard label="신청"     value={`${stats.신청}건`}  color="orange" />
        <StatCard label="승인"     value={`${stats.승인}건`}  color="teal" />
        <StatCard label="완료"     value={`${stats.완료}건`}  color="green" />
      </div>

      {/* 필터 + 등록 */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
              placeholder="신청자·전문가 검색"
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">전체 상태</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {canWrite && (
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg font-medium"
            style={{ background: '#2E75B6' }}>
            <Plus size={15} /> 상담 신청
          </button>
        )}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['신청자', '연락처', '전문가', '상담분야', '상담일시', '방법', '상태', '관리'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">등록된 상담이 없습니다</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2.5 text-xs font-medium text-gray-800">{c.applicant_name}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{c.phone || '-'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{c.experts?.name || '-'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{c.consult_field || '-'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{c.consult_date || '-'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{c.consult_method}</td>
                <td className="px-4 py-2.5">
                  {canWrite ? (
                    <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded border font-medium ${STATUS_COLOR[c.status]}`}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${STATUS_COLOR[c.status]}`}>{c.status}</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {canWrite && (
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(c)} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">수정</button>
                      <button onClick={() => remove(c.id)} className="text-xs px-2 py-1 border border-red-200 text-red-500 rounded hover:bg-red-50">삭제</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 등록/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">{editingId ? '상담 수정' : '상담 신청 등록'}</h2>
              <button onClick={() => setModalOpen(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <Field label="멘티 선택 (founders에서)">
                <select className="input-base" onChange={e => selectFounder(e.target.value)} defaultValue="">
                  <option value="">직접 입력 또는 선택</option>
                  {founders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="신청자명 *">
                  <input className="input-base" value={form.applicant_name}
                    onChange={e => setF('applicant_name', e.target.value)} placeholder="홍길동" />
                </Field>
                <Field label="연락처">
                  <input className="input-base" value={form.phone}
                    onChange={e => setF('phone', formatPhone(e.target.value))} placeholder="010-1234-5678" maxLength={13} />
                </Field>
              </div>
              <Field label="이메일">
                <input type="email" className="input-base" value={form.email}
                  onChange={e => setF('email', e.target.value)} placeholder="example@email.com" />
              </Field>
              <Field label="전문가 *">
                <select className="input-base" value={form.expert_id} onChange={e => setF('expert_id', e.target.value)}>
                  <option value="">전문가 선택</option>
                  {experts.map(e => <option key={e.id} value={e.id}>{e.name} ({e.field})</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="상담 분야">
                  <input className="input-base" value={form.consult_field}
                    onChange={e => setF('consult_field', e.target.value)} placeholder="마케팅, 법률, 재무 등" />
                </Field>
                <Field label="상담 방법">
                  <select className="input-base" value={form.consult_method} onChange={e => setF('consult_method', e.target.value)}>
                    {METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="상담 일시">
                <input type="datetime-local" className="input-base" value={form.consult_date}
                  onChange={e => setF('consult_date', e.target.value)} />
              </Field>
              <Field label="상담 내용">
                <textarea className="input-base h-20 resize-none" value={form.content}
                  onChange={e => setF('content', e.target.value)} placeholder="상담 요청 내용" />
              </Field>
              <Field label="상담 결과">
                <textarea className="input-base h-20 resize-none" value={form.result}
                  onChange={e => setF('result', e.target.value)} placeholder="상담 결과 및 조언" />
              </Field>
              <Field label="상태">
                <select className="input-base" value={form.status} onChange={e => setF('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-40"
                style={{ background: '#2E75B6' }}>
                {saving ? '저장 중...' : '저장'}
              </button>
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
