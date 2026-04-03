import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { VerdictBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import StatCard from '../../components/common/StatCard'
import Avatar from '../../components/common/Avatar'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { today } from '../../lib/constants'

const emptyForm = () => ({
  founder_id: '', year: String(new Date().getFullYear()),
  revenue: '', employees: '', investment: '', memo: '',
})

function growthStage(g) {
  if (!g) return null
  const rev = Number(g.revenue || 0)
  const emp = Number(g.employees || 0)
  const inv = Number(g.investment || 0)
  if (inv > 0 || rev > 500) return { label: '스케일업', cls: 'bg-teal-100 text-teal-700' }
  if (rev > 200 || emp >= 5) return { label: '성장중', cls: 'bg-blue-100 text-blue-700' }
  if (rev > 0 || emp > 0) return { label: '초기운영', cls: 'bg-amber-100 text-amber-700' }
  return { label: '데이터없음', cls: 'bg-gray-100 text-gray-500' }
}

export default function Growth() {
  const { hasRole } = useAuth()
  const canWrite = hasRole("manager")
  const canDelete = hasRole("admin")

  const [founders, setFounders] = useState([])
  const [companies, setCompanies] = useState([])
  const [growths, setGrowths] = useState([])
  const [supports, setSupports] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [detailFounder, setDetailFounder] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: f }, { data: co }, { data: g }, { data: s }] = await Promise.all([
        supabase.from('founders').select('*'),
        supabase.from('companies').select('*'),
        supabase.from('growths').select('*').order('year'),
        supabase.from('support_items').select('*').order('start_date'),
      ])
      setFounders(f || [])
      setCompanies(co || [])
      setGrowths(g || [])
      setSupports(s || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function openAdd(preFounderId = '') {
    setEditingId(null)
    const f = emptyForm()
    if (preFounderId) f.founder_id = preFounderId
    setForm(f)
    setModalOpen(true)
  }

  function openEdit(g) {
    setEditingId(g.id)
    setForm({ founder_id: g.founder_id || '', year: g.year || '', revenue: g.revenue || '', employees: g.employees || '', investment: g.investment || '', memo: g.memo || '' })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.founder_id) { alert('창업자를 선택해주세요'); return }
    if (!form.year) { alert('연도를 입력해주세요'); return }
    const payload = { ...form }
    try {
      if (editingId) {
        const { error } = await supabase.from('growths').update(payload).eq('id', editingId)
        if (error) throw error
        setGrowths(prev => prev.map(g => g.id === editingId ? { ...g, ...payload } : g))
      } else {
        const { data, error } = await supabase.from('growths').insert([payload]).select().single()
        if (error) throw error
        setGrowths(prev => [...prev, data].sort((a, b) => a.year.localeCompare(b.year)))
      }
      setModalOpen(false)
    } catch (e) { alert('저장 실패: ' + e.message) }
  }

  async function handleDelete(id) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('growths').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    setGrowths(prev => prev.filter(g => g.id !== id))
  }

  const founderMap = Object.fromEntries(founders.map(f => [f.id, f]))
  const coMap = Object.fromEntries(companies.map(c => [c.founder_id, c]))

  // Latest by founder
  const latestByFounder = {}
  growths.forEach(g => {
    const key = g.founder_id
    if (!latestByFounder[key] || g.year > latestByFounder[key].year) latestByFounder[key] = g
  })

  const totalRev = Object.values(latestByFounder).reduce((a, g) => a + (Number(g.revenue) || 0), 0)
  const totalEmp = Object.values(latestByFounder).reduce((a, g) => a + (Number(g.employees) || 0), 0)
  const totalInv = Object.values(latestByFounder).reduce((a, g) => a + (Number(g.investment) || 0), 0)
  const trackCount = new Set(growths.map(g => g.founder_id)).size

  // Founders with company OR growth data
  const registeredFIds = new Set(companies.map(c => c.founder_id))
  const growthFIds = new Set(growths.map(g => g.founder_id))
  const targetFIds = new Set([...registeredFIds, ...growthFIds])
  const targetFounders = founders.filter(f => targetFIds.has(f.id))

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-gray-800">기업 성장 지표</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="추적 기업 수" value={`${trackCount}개`} sub={`창업 완료 ${companies.length}개사`} color="blue" />
        <StatCard label="총 매출 합산" value={`${totalRev >= 10000 ? (totalRev / 10000).toFixed(1) + '억' : totalRev.toLocaleString() + '만'}`} sub="최신 연도 기준" color="green" />
        <StatCard label="총 고용 창출" value={`${totalEmp}명`} color="teal" />
        <StatCard label="총 투자 유치" value={`${totalInv >= 10000 ? (totalInv / 10000).toFixed(1) + '억' : totalInv.toLocaleString() + '만'}`} color="orange" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">창업자별 성장 현황 — 이름 클릭 시 상세 이력 확인</p>
        <button onClick={() => openAdd()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: '#2E75B6' }}>
          <Plus size={15} /> 성장 지표 입력
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['창업자', '유형', '기업명', '최근연도', '매출(만원)', '고용(명)', '투자(만원)', '성장 단계', '성장 흐름', '관리'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : targetFounders.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-10 text-gray-400 text-sm">창업 완료 기업을 먼저 등록해주세요</td></tr>
            ) : targetFounders.map(f => {
              const co = coMap[f.id]
              const fGrowths = growths.filter(g => g.founder_id === f.id).sort((a, b) => a.year.localeCompare(b.year))
              const latest = fGrowths[fGrowths.length - 1]
              const stage = growthStage(latest)
              const maxRev = Math.max(...fGrowths.map(g => Number(g.revenue || 0)), 1)
              return (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <button onClick={() => { setDetailFounder(f); setDetailOpen(true) }} className="flex items-center gap-2">
                      <Avatar name={f.name} />
                      <span className="font-semibold text-blue-600 underline text-xs">{f.name}</span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5"><VerdictBadge verdict={f.verdict} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{co?.name || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-center">{latest?.year || '-'}</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-green-700">{latest ? Number(latest.revenue || 0).toLocaleString() : '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-center">{latest?.employees || '-'}</td>
                  <td className="px-4 py-2.5 text-xs text-blue-700">{latest ? Number(latest.investment || 0).toLocaleString() : '-'}</td>
                  <td className="px-4 py-2.5">
                    {stage
                      ? <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${stage.cls}`}>{stage.label}</span>
                      : <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">미입력</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {fGrowths.length > 0 ? (
                      <div className="flex items-end gap-0.5 h-5">
                        {fGrowths.slice(-4).map(g => {
                          const h = Math.max(3, Math.round(Number(g.revenue || 0) / maxRev * 18))
                          return <div key={g.id} title={`${g.year}: ${Number(g.revenue || 0).toLocaleString()}만원`} style={{ width: '8px', height: `${h}px`, background: '#2E75B6', borderRadius: '1px', opacity: 0.75 }} />
                        })}
                      </div>
                    ) : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openAdd(f.id)} className="text-xs px-1.5 py-0.5 text-white rounded" style={{ background: '#2E75B6' }}>입력</button>
                      {fGrowths.length > 0 && (
                        <button onClick={() => { setDetailFounder(f); setDetailOpen(true) }} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Eye size={12} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Growth input modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? '성장 지표 수정' : '성장 지표 입력'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={handleSave} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>저장</button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">창업자 *</label>
            <select className="form-input" value={form.founder_id} onChange={e => setField('founder_id', e.target.value)}>
              <option value="">선택</option>
              {founders.map(f => <option key={f.id} value={f.id}>{f.name} ({f.biz || ''})</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">창업 등록된 창업자 또는 이미 지표가 있는 창업자 목록입니다</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">연도 *</label>
            <input className="form-input" value={form.year} onChange={e => setField('year', e.target.value)} placeholder="2026" />
          </div>
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-600">성장 지표 입력</div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">매출 (만원)</label><input type="number" className="form-input" value={form.revenue} onChange={e => setField('revenue', e.target.value)} placeholder="0" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">고용 인원 (명)</label><input type="number" className="form-input" value={form.employees} onChange={e => setField('employees', e.target.value)} placeholder="0" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">투자 유치 (만원)</label><input type="number" className="form-input" value={form.investment} onChange={e => setField('investment', e.target.value)} placeholder="0" /></div>
            </div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">메모</label><textarea className="form-input" value={form.memo} onChange={e => setField('memo', e.target.value)} /></div>
        </div>
      </Modal>

      {/* Detail modal */}
      {detailFounder && (
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`${detailFounder.name} — 성장 여정`} wide>
          <FounderGrowthDetail
            founder={detailFounder}
            company={coMap[detailFounder.id]}
            growths={growths.filter(g => g.founder_id === detailFounder.id).sort((a, b) => a.year.localeCompare(b.year))}
            supports={supports.filter(s => s.founder_id === detailFounder.id).sort((a, b) => a.start_date.localeCompare(b.start_date))}
            onDelete={handleDelete}
            onAdd={() => { setDetailOpen(false); openAdd(detailFounder.id) }}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setDetailOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg">닫기</button>
            <button onClick={() => { setDetailOpen(false); openAdd(detailFounder.id) }} className="px-4 py-1.5 text-sm text-white rounded-lg" style={{ background: '#2E75B6' }}>+ 성장 지표 추가</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FounderGrowthDetail({ founder, company, growths, supports, onDelete }) {
  const maxRev = Math.max(...growths.map(g => Number(g.revenue || 0)), 1)
  const colors = ['#2E75B6', '#1E5631', '#8B6914', '#17627A', '#C55A11', '#C00000']

  const consults_done = [] // simplified — full version would fetch
  const journeySteps = [
    { label: '창업 등록', done: !!company, detail: company ? company.reg_date : '미등록' },
    { label: '지원사업', done: supports.length > 0, detail: supports.length > 0 ? `${supports.length}건` : '없음' },
    { label: '성장 추적', done: growths.length > 0, detail: growths.length > 0 ? `${growths.length}개 연도` : '미입력' },
  ]

  return (
    <div className="space-y-4">
      {/* Journey steps */}
      <div className="flex gap-2">
        {journeySteps.map((s, i) => (
          <div key={i} className={`flex-1 text-center p-2.5 rounded-xl border ${s.done ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100'}`}>
            <div className={`w-5 h-5 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-bold ${s.done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {s.done ? '✓' : i + 1}
            </div>
            <div className={`text-xs font-semibold ${s.done ? 'text-gray-800' : 'text-gray-400'}`}>{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.detail}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      {growths.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-600 mb-3">매출 추이 + 지원사업 기간</div>
          <div className="flex items-end gap-3 h-24 mb-2">
            {growths.map(g => {
              const h = Math.max(6, Math.round(Number(g.revenue || 0) / maxRev * 90))
              return (
                <div key={g.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-green-700">{Number(g.revenue || 0) >= 10000 ? (Number(g.revenue) / 10000).toFixed(1) + '억' : Number(g.revenue || 0).toLocaleString() + '만'}</span>
                  <div style={{ width: '100%', maxWidth: '36px', height: `${h}px`, background: '#2E75B6', borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
                  <span className="text-xs text-gray-500 font-semibold">{g.year}</span>
                </div>
              )
            })}
          </div>
          {supports.length > 0 && (
            <div className="border-t border-gray-200 pt-3">
              {supports.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 mb-1.5">
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
                  <span className="text-xs font-semibold text-gray-700 min-w-[110px]">{s.program}</span>
                  <span className="text-xs text-gray-500">{s.start_date} ~ {s.end_date || '진행중'}</span>
                  {s.amount && <span className="text-xs font-bold text-green-700 ml-auto">{Number(s.amount).toLocaleString()}만원</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Growth table */}
      {growths.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">연도</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">매출(만원)</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">고용(명)</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">투자(만원)</th>
                <th className="px-3 py-2 text-xs font-medium text-gray-500">해당연도 지원사업</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {growths.map(g => {
                const activeSups = supports.filter(s => {
                  const sy = s.start_date?.slice(0, 4)
                  const ey = s.end_date?.slice(0, 4) || String(new Date().getFullYear())
                  return g.year >= sy && g.year <= ey
                })
                return (
                  <tr key={g.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 font-semibold text-xs">{g.year}</td>
                    <td className="px-3 py-2 text-right text-xs font-bold text-green-700">{Number(g.revenue || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-center text-xs">{g.employees}</td>
                    <td className="px-3 py-2 text-right text-xs text-blue-700">{Number(g.investment || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs">
                      {activeSups.map(s => <span key={s.id} className="bg-teal-100 text-teal-700 text-xs px-1 py-0.5 rounded mr-1">{s.program}</span>)}
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => onDelete(g.id)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {growths.length === 0 && (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl text-sm">아직 입력된 성장 지표가 없습니다</div>
      )}
    </div>
  )
}
