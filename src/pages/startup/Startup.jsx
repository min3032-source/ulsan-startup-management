import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { DEFAULT_SETTINGS, COMPANY_STATUSES, today, fmtAmt } from '../../lib/constants'
import { VerdictBadge, StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Plus, Pencil, Trash2, TrendingUp } from 'lucide-react'

const emptyForm = () => ({
  name: '', founder_id: '', staff: '', biz: '', reg_date: today(), status: '초기운영',
})

export default function Startup() {
  const { hasRole } = useAuth()
  const canWrite = hasRole("manager")
  const canDelete = hasRole("admin")

  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [selectedFirms, setSelectedFirms] = useState([])
  const [founders, setFounders] = useState([])
  const [growths, setGrowths] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: co }, { data: sf }, { data: f }, { data: g }, { data: s }] = await Promise.all([
        supabase.from('companies').select('*'),
        supabase.from('selected_firms').select('id, company_name, ceo, sector, start_date, staff, status, type'),
        supabase.from('founders').select('*'),
        supabase.from('growths').select('*'),
        supabase.from('team_settings').select('*').limit(1).single(),
      ])
      setCompanies(co || [])
      setSelectedFirms(sf || [])
      setFounders(f || [])
      setGrowths(g || [])
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function openAdd() { setEditingId(null); setForm(emptyForm()); setModalOpen(true) }
  function openEdit(co) {
    setEditingId(co.id)
    setForm({ name: co.name || '', founder_id: co.founder_id || '', staff: co.staff || '', biz: co.biz || '', reg_date: co.reg_date || today(), status: co.status || '초기운영' })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('기업명을 입력해주세요'); return }
    const payload = { ...form }
    try {
      if (editingId) {
        const { error } = await supabase.from('companies').update(payload).eq('id', editingId)
        if (error) throw error
        setCompanies(prev => prev.map(c => c.id === editingId ? { ...c, ...payload } : c))
      } else {
        const { data, error } = await supabase.from('companies').insert([payload]).select().single()
        if (error) throw error
        setCompanies(prev => [data, ...prev])
      }
      setModalOpen(false)
    } catch (e) { alert('저장 실패: ' + e.message) }
  }

  async function handleDelete(id) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setCompanies(prev => prev.filter(c => c.id !== id))
  }

  const founderMap = Object.fromEntries(founders.map(f => [f.id, f]))

  // Merge companies from both sources
  const fromConsult = companies.map(co => {
    const f = founderMap[co.founder_id]
    return { ...co, _ceo: f?.name || '-', _verdict: f?.verdict || '-', _src: '상담경로', _founderId: co.founder_id }
  })
  const fromSelected = selectedFirms.map(sf => ({
    id: sf.id, name: sf.company_name, founder_id: sf.id,
    biz: sf.sector, reg_date: sf.start_date, staff: sf.staff,
    status: sf.status === '지원중' ? '지원중' : '운영중',
    _ceo: sf.ceo, _verdict: sf.type, _src: '선정경로', _sfId: sf.id, _founderId: sf.id,
  }))
  const all = [...fromConsult, ...fromSelected]

  const growthFIds = new Set(growths.map(g => g.founder_id || g.company_id))
  const trackCount = growthFIds.size
  const totalEmp = (() => {
    const latestByKey = {}
    growths.forEach(g => {
      const key = g.founder_id || g.company_id
      if (!latestByKey[key] || g.year > latestByKey[key].year) latestByKey[key] = g
    })
    return Object.values(latestByKey).reduce((a, g) => a + (Number(g.employees) || 0), 0)
  })()

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-800">창업 현황</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="전체 기업" value={`${all.length}개사`} sub={`상담경로 ${fromConsult.length} · 선정경로 ${fromSelected.length}`} color="blue" />
        <StatCard label="성장 지표 등록" value={`${trackCount}개사`} color="green" />
        <StatCard label="총 고용 창출" value={`${totalEmp}명`} color="teal" />
        <StatCard label="성장 지표 미등록" value={`${all.length - trackCount}개사`} sub="입력 권장" color="orange" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">창업자 접수 경로 + 선정기업 경로 통합 현황</p>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: '#2E75B6' }}>
          <Plus size={15} /> 창업 직접 등록
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['기업명', '대표자', '업종', '유형', '등록/시작일', '담당자', '진입경로', '현황', '성장지표', '관리'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : all.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400 text-sm">등록된 기업이 없습니다</td></tr>
            ) : all.map(co => {
              const fGrowths = growths.filter(g => (g.founder_id || g.company_id) === co._founderId)
                .sort((a, b) => b.year.localeCompare(a.year))
              const latest = fGrowths[0]
              return (
                <tr key={co.id + co._src} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <button onClick={() => navigate('/growth')} className="font-bold text-blue-600 underline text-xs">{co.name}</button>
                  </td>
                  <td className="px-4 py-2.5 text-xs">{co._ceo}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[100px] truncate">{co.biz || '-'}</td>
                  <td className="px-4 py-2.5"><VerdictBadge verdict={co._verdict} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{co.reg_date}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{co.staff || '-'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${co._src === '상담경로' ? 'bg-teal-100 text-teal-700' : 'bg-purple-100 text-purple-700'}`}>{co._src}</span>
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={co.status} /></td>
                  <td className="px-4 py-2.5">
                    {latest
                      ? <span className="text-xs font-semibold text-green-700">{Number(latest.revenue || 0).toLocaleString()}원 ({latest.year})</span>
                      : <span className="text-xs text-red-400">미입력</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => navigate('/growth')} className="p-1 rounded hover:bg-green-50 text-green-600" title="성장지표">
                        <TrendingUp size={13} />
                      </button>
                      {!co._sfId && (
                        <>
                          <button onClick={() => openEdit(co)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(co.id)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? '창업 정보 수정' : '창업 등록'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={handleSave} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>저장</button>
          </>
        }
      >
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">기업명 *</label><input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">대표자(창업자)</label>
              <select className="form-input" value={form.founder_id} onChange={e => setField('founder_id', e.target.value)}>
                <option value="">선택</option>
                {founders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">담당자</label>
              <select className="form-input" value={form.staff} onChange={e => setField('staff', e.target.value)}>
                <option value="">선택</option>
                {settings.staff.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">업종</label><input className="form-input" value={form.biz} onChange={e => setField('biz', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">사업자 등록일</label><input type="date" className="form-input" value={form.reg_date} onChange={e => setField('reg_date', e.target.value)} /></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">현황</label>
            <select className="form-input" value={form.status} onChange={e => setField('status', e.target.value)}>
              {COMPANY_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
