import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const todayStr = () => new Date().toISOString().slice(0, 10)

function fmt(num) {
  return (Number(num) || 0).toLocaleString('ko-KR')
}

function buildTree(flatItems) {
  const map = {}
  flatItems.forEach(i => { map[i.id] = { ...i, children: [] } })
  const roots = []
  ;[...flatItems].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).forEach(item => {
    if (item.parent_id && map[item.parent_id]) map[item.parent_id].children.push(map[item.id])
    else if (!item.parent_id) roots.push(map[item.id])
  })
  return roots
}

function sumNode(node, field, execMap) {
  if (node.level === 4) {
    if (field === 'exec') return execMap[node.id] || 0
    if (field === 'budget') return Number(node.budgeted_amount) || 0
    if (field === 'original') return Number(node.original_amount) || Number(node.budgeted_amount) || 0
    return 0
  }
  return (node.children || []).reduce((s, c) => s + sumNode(c, field, execMap), 0)
}

const CELL = {
  padding: '4px 8px',
  borderBottom: '1px solid #d1d5db',
  borderRight: '1px solid #d1d5db',
  fontSize: '11px',
  verticalAlign: 'middle',
}
const CELL_RIGHT = { ...CELL, textAlign: 'right' }
const CELL_LAST = { ...CELL_RIGHT, borderRight: 'none' }

function renderRows(nodes, execMap) {
  const rows = []
  nodes.forEach(node => {
    const original = sumNode(node, 'original', execMap)
    const budget = sumNode(node, 'budget', execMap)
    const exec = sumNode(node, 'exec', execMap)
    const remain = budget - exec
    const rate = budget > 0 ? (exec / budget * 100) : 0

    let rowStyle = {}
    if (node.level === 1) rowStyle = { background: '#1e3a5f', color: 'white', fontWeight: 'bold' }
    else if (node.level === 2) rowStyle = { background: '#dbeafe' }
    else if (node.level === 3) rowStyle = { background: '#f1f5f9' }
    else rowStyle = { background: 'white' }

    rows.push(
      <tr key={node.id} style={rowStyle}>
        <td style={CELL}>{node.level === 1 ? node.name : ''}</td>
        <td style={CELL}>{node.level === 2 ? node.name : ''}</td>
        <td style={CELL}>{node.level === 3 ? node.name : ''}</td>
        <td style={CELL}>{node.level === 4 ? node.name : ''}</td>
        <td style={CELL_RIGHT}>{fmt(original)}</td>
        <td style={CELL_RIGHT}>{fmt(budget)}</td>
        <td style={CELL_RIGHT}>{fmt(exec)}</td>
        <td style={CELL_RIGHT}>{fmt(remain)}</td>
        <td style={CELL_LAST}>{rate.toFixed(1)}%</td>
      </tr>
    )
    if (node.children && node.children.length > 0) {
      rows.push(...renderRows(node.children, execMap))
    }
  })
  return rows
}

export default function BudgetReport() {
  const [programs, setPrograms] = useState([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [baseDate, setBaseDate] = useState(todayStr())
  const [items, setItems] = useState([])
  const [execMap, setExecMap] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('budget_programs').select('*').order('year', { ascending: false })
      .then(({ data }) => {
        const list = data || []
        setPrograms(list)
        if (list.length > 0) setSelectedProgramId(list[0].id)
      })
  }, [])

  useEffect(() => {
    if (!selectedProgramId) return
    loadProgramData(selectedProgramId)
  }, [selectedProgramId])

  async function loadProgramData(programId) {
    setLoading(true)
    try {
      const [{ data: its }, { data: execs }] = await Promise.all([
        supabase.from('budget_items').select('*').eq('program_id', programId).limit(100000),
        supabase.from('budget_executions').select('budget_item_id, amount').eq('program_id', programId).limit(100000),
      ])
      setItems(its || [])
      const em = {}
      ;(execs || []).forEach(e => {
        em[e.budget_item_id] = (em[e.budget_item_id] || 0) + (Number(e.amount) || 0)
      })
      setExecMap(em)
    } finally {
      setLoading(false)
    }
  }

  const selectedProgram = programs.find(p => p.id === selectedProgramId)
  const tree = buildTree(items)

  const leaf = items.filter(i => i.level === 4)
  const totalOriginal = leaf.reduce((s, i) => s + (Number(i.original_amount) || Number(i.budgeted_amount) || 0), 0)
  const totalBudget = leaf.reduce((s, i) => s + (Number(i.budgeted_amount) || 0), 0)
  const totalExec = Object.values(execMap).reduce((s, v) => s + v, 0)
  const totalRemain = totalBudget - totalExec
  const totalRate = totalBudget > 0 ? (totalExec / totalBudget * 100) : 0

  return (
    <div style={{ fontFamily: '"Malgun Gothic", sans-serif', minHeight: '100vh', background: '#f8fafc' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-body { padding: 0 !important; background: white !important; }
          body { font-size: 9pt; margin: 0; }
          table { border-collapse: collapse !important; width: 100% !important; }
          th, td { border: 1px solid #333 !important; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>

      {/* 인쇄시 숨김 컨트롤 */}
      <div className="no-print bg-white border-b px-6 py-3 flex flex-wrap items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-gray-800">사업비 집행현황 보고서</h1>
        </div>
        <select
          value={selectedProgramId}
          onChange={e => setSelectedProgramId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400">
          <option value="">사업 선택</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name} ({p.year})</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">기준일</span>
          <input type="date" value={baseDate} onChange={e => setBaseDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg"
          style={{ background: '#1e3a5f' }}>
          🖨️ 인쇄
        </button>
      </div>

      {/* 보고서 본문 (A4 형태) */}
      <div className="print-body" style={{ maxWidth: '210mm', margin: '24px auto', padding: '20mm', background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>울산경제일자리진흥원</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>
            사업비 집행현황 보고서
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#4b5563', lineHeight: '1.8' }}>
            <div>사업명: <strong>{selectedProgram?.name || '-'}</strong></div>
            <div>기준일: {baseDate}</div>
            {selectedProgram?.manager && <div>담당자: {selectedProgram.manager}</div>}
          </div>
        </div>

        {/* 요약 박스 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', border: '1px solid #374151', marginBottom: '20px' }}>
          {[
            { label: '당초예산', value: fmt(totalOriginal) },
            { label: '현재예산', value: fmt(totalBudget) },
            { label: '집행액', value: fmt(totalExec) },
            { label: '잔액', value: fmt(totalRemain) },
            { label: '집행률', value: totalRate.toFixed(1) + '%' },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              padding: '10px',
              textAlign: 'center',
              borderRight: i < 4 ? '1px solid #374151' : 'none',
              background: i === 4 ? '#f1f5f9' : 'white',
            }}>
              <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111827' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* 집행현황표 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>로딩 중...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#374151', color: 'white' }}>
                {['관', '항', '세항', '목', '당초예산', '현재예산', '집행액', '잔액', '집행률'].map((h, i, arr) => (
                  <th key={h} style={{
                    padding: '7px 8px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    border: '1px solid #4b5563',
                    textAlign: i >= 4 ? 'right' : 'left',
                    borderRight: i === arr.length - 1 ? 'none' : '1px solid #4b5563',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderRows(tree, execMap)}
              <tr style={{ background: '#374151', color: 'white', fontWeight: 'bold' }}>
                <td colSpan={4} style={{ padding: '6px 8px', border: '1px solid #4b5563', fontSize: '11px' }}>합계</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #4b5563', fontSize: '11px' }}>{fmt(totalOriginal)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #4b5563', fontSize: '11px' }}>{fmt(totalBudget)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #4b5563', fontSize: '11px' }}>{fmt(totalExec)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #4b5563', fontSize: '11px' }}>{fmt(totalRemain)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', borderRight: 'none', border: '1px solid #4b5563', fontSize: '11px' }}>{totalRate.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        )}

        {/* 서명란 */}
        <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'flex-end', gap: '32px' }}>
          {['작성', '검토', '결재'].map(label => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#374151', marginBottom: '6px', fontWeight: '600' }}>{label}</div>
              <div style={{ width: '80px', height: '64px', border: '1px solid #9ca3af' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
