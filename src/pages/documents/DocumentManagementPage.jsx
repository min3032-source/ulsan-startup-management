import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { StatusBadge } from '../../components/common/Badge'
import StatCard from '../../components/common/StatCard'
import { DEFAULT_SETTINGS, DOCUMENT_STATUSES } from '../../lib/constants'
import DocumentUploadForm from './DocumentUploadForm'
import DocumentStatusTracker from './DocumentStatusTracker'
import { Plus, Mail, FileText, Paperclip } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

export default function DocumentManagementPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [chartMode, setChartMode] = useState('daily')

  const [statusFilter, setStatusFilter] = useState('전체')
  const [typeFilter, setTypeFilter] = useState('전체')
  const [assigneeFilter, setAssigneeFilter] = useState('전체')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('documents').select('*').order('received_at', { ascending: false })
    if (!error) setDocuments(data || [])
    setLoading(false)
  }

  const businessTypes = useMemo(() => {
    const fromData = documents.map(d => d.business_type).filter(Boolean)
    return Array.from(new Set([...DEFAULT_SETTINGS.programs, ...fromData]))
  }, [documents])

  const assignees = useMemo(() => {
    const fromData = documents.map(d => d.assignee).filter(Boolean)
    return Array.from(new Set([...DEFAULT_SETTINGS.staff, ...fromData]))
  }, [documents])

  const filtered = documents.filter(d =>
    (statusFilter === '전체' || d.status === statusFilter) &&
    (typeFilter === '전체' || d.business_type === typeFilter) &&
    (assigneeFilter === '전체' || d.assignee === assigneeFilter)
  )

  const stats = {
    total: documents.length,
    수신: documents.filter(d => d.status === '수신').length,
    검토중: documents.filter(d => d.status === '검토중').length,
    승인: documents.filter(d => d.status === '승인').length,
    반려: documents.filter(d => d.status === '반려').length,
    처리완료: documents.filter(d => d.status === '처리완료').length,
  }

  const dailyStats = useMemo(() => buildDailyStats(documents), [documents])
  const weeklyStats = useMemo(() => buildWeeklyStats(documents), [documents])
  const chartData = chartMode === 'daily' ? dailyStats : weeklyStats

  function handleUploaded(doc) {
    setDocuments(prev => [doc, ...prev])
  }

  function handleUpdated(updatedDoc) {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d))
    setSelectedDoc(updatedDoc)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Mail size={20} /> 이메일 서류 수신 관리</h1>
        <button onClick={() => setUploadOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: '#2E75B6' }}>
          <Plus size={15} /> 서류 업로드
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="전체 서류" value={`${stats.total}건`} color="blue" />
        <StatCard label="수신" value={`${stats.수신}건`} color="blue" />
        <StatCard label="검토중" value={`${stats.검토중}건`} color="orange" />
        <StatCard label="승인" value={`${stats.승인}건`} color="teal" />
        <StatCard label="반려" value={`${stats.반려}건`} color="red" />
        <StatCard label="처리완료" value={`${stats.처리완료}건`} color="green" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-gray-700 text-sm">서류 수신 현황</div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[{ key: 'daily', label: '일일' }, { key: 'weekly', label: '주간' }].map(t => (
              <button
                key={t.key}
                onClick={() => setChartMode(t.key)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  chartMode === t.key ? 'bg-white text-gray-800 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip formatter={v => [`${v}건`, '수신']} />
            <Bar dataKey="count" name="수신 건수" fill="#2E75B6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect label="상태" value={statusFilter} onChange={setStatusFilter} options={DOCUMENT_STATUSES} />
        <FilterSelect label="사업유형" value={typeFilter} onChange={setTypeFilter} options={businessTypes} />
        <FilterSelect label="담당자" value={assigneeFilter} onChange={setAssigneeFilter} options={assignees} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['회사명', '담당자명', '이메일', '사업유형', '상태', '배정 담당자', '첨부', '수신일', '관리'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">로딩 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400 text-sm">데이터가 없습니다</td></tr>
            ) : filtered.map(d => (
              <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDoc(d)}>
                <td className="px-4 py-2.5 font-medium text-xs text-gray-800">{d.company_name}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{d.contact_name}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{d.email}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{d.business_type || '-'}</td>
                <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{d.assignee || <span className="text-gray-300">미배정</span>}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Paperclip size={11} /> {(d.files || []).length}개</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(d.received_at).toLocaleDateString('ko-KR')}</td>
                <td className="px-4 py-2.5">
                  <button onClick={e => { e.stopPropagation(); setSelectedDoc(d) }} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600">
                    <FileText size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocumentUploadForm isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onSaved={handleUploaded} />
      <DocumentStatusTracker
        document={selectedDoc}
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onUpdated={handleUpdated}
      />
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 bg-white"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="전체">{label} 전체</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function buildDailyStats(documents) {
  const days = 14
  const today = new Date()
  const buckets = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 })
  }
  const map = Object.fromEntries(buckets.map(b => [b.key, b]))
  documents.forEach(d => {
    const key = (d.received_at || d.created_at || '').slice(0, 10)
    if (map[key]) map[key].count += 1
  })
  return buckets
}

function buildWeeklyStats(documents) {
  const weeks = 8
  const today = new Date()
  const buckets = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(today)
    start.setDate(start.getDate() - start.getDay() - i * 7)
    const startKey = start.toISOString().slice(0, 10)
    buckets.push({ key: startKey, start, label: `${start.getMonth() + 1}/${start.getDate()}주`, count: 0 })
  }
  documents.forEach(d => {
    const raw = d.received_at || d.created_at
    if (!raw) return
    const date = new Date(raw)
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (date >= buckets[i].start) { buckets[i].count += 1; break }
    }
  })
  return buckets.map(({ key, label, count }) => ({ key, label, count }))
}
