import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { VerdictBadge, StatusBadge, Badge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Avatar from '../../components/common/Avatar'
import { Search, Eye } from 'lucide-react'

export default function FounderDB() {
  const { hasRole } = useAuth()
  const canWrite = hasRole("manager")
  const canDelete = hasRole("admin")

  const [founders, setFounders] = useState([])
  const [consults, setConsults] = useState([])
  const [supports, setSupports] = useState([])
  const [companies, setCompanies] = useState([])
  const [growths, setGrowths] = useState([])
  const [mentorings, setMentorings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterVerdict, setFilterVerdict] = useState('')
  const [detailFounder, setDetailFounder] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [{ data: f }, { data: c }, { data: s }, { data: co }, { data: g }, { data: m }] = await Promise.all([
          supabase.from('founders').select('*').order('date', { ascending: false }),
          supabase.from('consults').select('*').order('date', { ascending: false }),
          supabase.from('support_items').select('*').order('start_date', { ascending: false }),
          supabase.from('companies').select('*'),
          supabase.from('growths').select('*').order('year', { ascending: false }),
          supabase.from('mentorings').select('*').order('date', { ascending: false }),
        ])
        setFounders(f || [])
        setConsults(c || [])
        setSupports(s || [])
        setCompanies(co || [])
        setGrowths(g || [])
        setMentorings(m || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function openDetail(f) {
    setDetailFounder(f)
    setDetailOpen(true)
  }

  const filtered = founders.filter(f =>
    (!search || f.name?.includes(search) || f.biz?.includes(search) || f.phone?.includes(search)) &&
    (!filterVerdict || f.verdict === filterVerdict)
  )

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">창업자 DB</h1>
        <p className="text-sm text-gray-500 mt-0.5">창업자별 상담·지원·성장 통합 현황</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 w-44"
              placeholder="이름·업종 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5" value={filterVerdict} onChange={e => setFilterVerdict(e.target.value)}>
            <option value="">전체 유형</option>
            <option>테크 창업</option><option>로컬 창업</option><option>혼합형 창업</option>
          </select>
        </div>
        <span className="text-sm text-gray-500">{filtered.length}명</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['창업자', '사업 아이디어', '유형', '지역', '상담', '지원사업', '창업', '성장지표', '상세'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">데이터가 없습니다</td></tr>
            ) : filtered.map(f => {
              const fConsults = consults.filter(c => c.founder_id === f.id)
              const fSupports = supports.filter(s => s.founder_id === f.id)
              const fCo = companies.find(c => c.founder_id === f.id)
              const fGrowths = growths.filter(g => g.founder_id === f.id)
              const latest = fGrowths[0]
              return (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={f.name} />
                      <div>
                        <div className="font-medium text-gray-800 text-xs">{f.name}</div>
                        <div className="text-xs text-gray-400">{f.date}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[120px] truncate">{f.biz}</td>
                  <td className="px-4 py-2.5"><VerdictBadge verdict={f.verdict} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{f.region}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold text-blue-700">{fConsults.length}건</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-bold text-green-700">{fSupports.length}건</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {fCo
                      ? <Badge label={fCo.name} className="bg-teal-100 text-teal-700 text-xs" />
                      : <span className="text-xs text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {latest
                      ? <span className="text-xs font-semibold text-green-700">{Number(latest.revenue || 0).toLocaleString()}만 ({latest.year})</span>
                      : <span className="text-xs text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => openDetail(f)} className="p-1 rounded hover:bg-blue-50 text-blue-500">
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`${detailFounder?.name} — 통합 현황`} wide>
        {detailFounder && <FounderDetail
          founder={detailFounder}
          consults={consults.filter(c => c.founder_id === detailFounder.id)}
          supports={supports.filter(s => s.founder_id === detailFounder.id)}
          company={companies.find(c => c.founder_id === detailFounder.id)}
          growths={growths.filter(g => g.founder_id === detailFounder.id)}
          mentorings={mentorings.filter(m => m.target_id === detailFounder.id)}
        />}
        <div className="mt-4 flex justify-end">
          <button onClick={() => setDetailOpen(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>
        </div>
      </Modal>
    </div>
  )
}

function FounderDetail({ founder, consults, supports, company, growths, mentorings }) {
  return (
    <div className="space-y-4">
      {/* Basic info */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '판정', value: <VerdictBadge verdict={founder.verdict} /> },
          { label: '연락처', value: founder.phone || '-' },
          { label: '지역', value: founder.region || '-' },
          { label: '성별', value: founder.gender || '-' },
          { label: '단계', value: founder.stage || '-' },
          { label: '접수일', value: founder.date || '-' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-0.5">{label}</div>
            <div className="text-sm font-medium text-gray-700">{value}</div>
          </div>
        ))}
      </div>

      {/* Consults */}
      <Section title={`상담일지 (${consults.length}건)`}>
        {consults.length === 0 ? <Empty /> : consults.slice(0, 4).map(c => (
          <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-100 text-sm">
            <span className="text-xs text-gray-400 min-w-[80px]">{c.date}</span>
            <span className="text-xs text-gray-600 flex-1">{c.staff} · {c.method}</span>
            <StatusBadge status={c.status} />
          </div>
        ))}
      </Section>

      {/* Supports */}
      <Section title={`지원사업 (${supports.length}건)`}>
        {supports.length === 0 ? <Empty /> : supports.map(s => (
          <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-100 text-sm">
            <span className="text-xs text-gray-400 min-w-[80px]">{s.start_date}</span>
            <span className="text-xs font-medium text-gray-700 flex-1">{s.program}</span>
            <StatusBadge status={s.stage} />
            {s.amount && <span className="text-xs font-bold text-green-700">{Number(s.amount).toLocaleString()}만</span>}
          </div>
        ))}
      </Section>

      {/* Company */}
      <Section title="창업 현황">
        {!company ? <Empty text="등록된 창업 기업이 없습니다" /> : (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Info label="기업명" value={company.name} />
            <Info label="업종" value={company.biz} />
            <Info label="등록일" value={company.reg_date} />
            <Info label="현황" value={company.status} />
          </div>
        )}
      </Section>

      {/* Growths */}
      <Section title={`성장 지표 (${growths.length}년)`}>
        {growths.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-2 py-1.5 font-medium text-gray-500">연도</th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-500">매출(만원)</th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-500">고용(명)</th>
                  <th className="text-right px-2 py-1.5 font-medium text-gray-500">투자(만원)</th>
                </tr>
              </thead>
              <tbody>
                {growths.map(g => (
                  <tr key={g.id} className="border-b border-gray-50">
                    <td className="px-2 py-1.5 font-semibold">{g.year}</td>
                    <td className="px-2 py-1.5 text-right font-semibold text-green-700">{Number(g.revenue || 0).toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right">{g.employees}</td>
                    <td className="px-2 py-1.5 text-right text-blue-700">{Number(g.investment || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</div>
      {children}
    </div>
  )
}

function Empty({ text = '데이터 없음' }) {
  return <div className="text-xs text-gray-400 py-2 text-center">{text}</div>
}

function Info({ label, value }) {
  return (
    <div className="bg-gray-50 rounded p-2">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-sm font-medium text-gray-700">{value || '-'}</div>
    </div>
  )
}
