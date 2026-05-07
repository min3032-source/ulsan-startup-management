import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const todayStr = () => new Date().toISOString().slice(0, 10)

function fmtK(num) {
  return Math.round((Number(num) || 0) / 1000).toLocaleString('ko-KR')
}

function rateColor(rate) {
  if (rate <= 50) return '#2563eb'
  if (rate <= 80) return '#ea580c'
  if (rate <= 100) return '#16a34a'
  return '#dc2626'
}

function buildTree(flatItems) {
  const map = {}
  flatItems.forEach(i => { map[i.id] = { ...i, children: [] } })
  const roots = []
  ;[...flatItems]
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach(item => {
      if (item.parent_id && map[item.parent_id]) map[item.parent_id].children.push(map[item.id])
      else if (!item.parent_id) roots.push(map[item.id])
    })
  return roots
}

function collectL4(node) {
  if (node.level === 4) return [node]
  return (node.children || []).flatMap(collectL4)
}

function buildSimpleRows(tree, execMap) {
  const allL4 = tree.flatMap(collectL4)
  const totalBudget = allL4.reduce((s, i) => s + (Number(i.budgeted_amount) || 0), 0)
  const totalExec = allL4.reduce((s, i) => s + (execMap[i.id] || 0), 0)
  const rows = []

  tree.forEach(l1 => {
    const l1L4 = collectL4(l1)
    const l1Budget = l1L4.reduce((s, i) => s + (Number(i.budgeted_amount) || 0), 0)
    const l1Exec = l1L4.reduce((s, i) => s + (execMap[i.id] || 0), 0)
    rows.push({ type: 'l1', name: l1.name, budget: l1Budget, exec: l1Exec })

    ;(l1.children || []).forEach(l2 => {
      const l2L4 = collectL4(l2)
      const l2Budget = l2L4.reduce((s, i) => s + (Number(i.budgeted_amount) || 0), 0)
      const l2Exec = l2L4.reduce((s, i) => s + (execMap[i.id] || 0), 0)
      rows.push({ type: 'l2', l1Name: l1.name, l2Name: l2.name, budget: l2Budget, exec: l2Exec })

      l2L4.forEach(l4 => {
        rows.push({ type: 'l4', name: l4.name, budget: Number(l4.budgeted_amount) || 0, exec: execMap[l4.id] || 0 })
      })
    })
  })

  rows.push({ type: 'total', budget: totalBudget, exec: totalExec })
  return rows
}

const B = '1px solid #000'
const TD = { padding: '4px 8px', border: B, fontSize: '11px', verticalAlign: 'middle' }
const TD_R = { ...TD, textAlign: 'right' }
const TH = { ...TD, fontWeight: 'bold', textAlign: 'center', background: '#374151', color: 'white' }
const TH_R = { ...TH, textAlign: 'right' }

function SimpleRow({ row, mode }) {
  if (row.type === 'l1') {
    const remain = row.budget - row.exec
    const rate = row.budget > 0 ? row.exec / row.budget * 100 : 0
    const s = { ...TD, background: '#1e3a5f', color: 'white', fontWeight: 'bold' }
    const sr = { ...s, textAlign: 'right' }
    return (
      <tr>
        <td colSpan={2} style={s}>{row.name} 소계</td>
        <td style={sr}>{fmtK(row.budget)}</td>
        {mode === 'exec' && <>
          <td style={sr}>{fmtK(row.exec)}</td>
          <td style={sr}>{fmtK(remain)}</td>
          <td style={sr}>{rate.toFixed(1)}%</td>
        </>}
      </tr>
    )
  }

  if (row.type === 'l2') {
    const remain = row.budget - row.exec
    const rate = row.budget > 0 ? row.exec / row.budget * 100 : 0
    const s = { ...TD, background: '#dbeafe' }
    const sr = { ...s, textAlign: 'right' }
    return (
      <tr>
        <td style={s}>{row.l1Name}</td>
        <td style={s}>{row.l2Name}</td>
        <td style={sr}>{fmtK(row.budget)}</td>
        {mode === 'exec' && <>
          <td style={sr}>{fmtK(row.exec)}</td>
          <td style={sr}>{fmtK(remain)}</td>
          <td style={{ ...sr, color: rateColor(rate), fontWeight: '600' }}>{rate.toFixed(1)}%</td>
        </>}
      </tr>
    )
  }

  if (row.type === 'l4') {
    const remain = row.budget - row.exec
    const rate = row.budget > 0 ? row.exec / row.budget * 100 : 0
    return (
      <tr>
        <td style={TD} />
        <td style={{ ...TD, paddingLeft: '20px', color: '#4b5563' }}>└ {row.name}</td>
        <td style={TD_R}>{fmtK(row.budget)}</td>
        {mode === 'exec' && <>
          <td style={TD_R}>{fmtK(row.exec)}</td>
          <td style={TD_R}>{fmtK(remain)}</td>
          <td style={{ ...TD_R, color: rateColor(rate) }}>{rate.toFixed(1)}%</td>
        </>}
      </tr>
    )
  }

  if (row.type === 'total') {
    const remain = row.budget - row.exec
    const rate = row.budget > 0 ? row.exec / row.budget * 100 : 0
    const s = { ...TD, background: '#374151', color: 'white', fontWeight: 'bold' }
    const sr = { ...s, textAlign: 'right' }
    return (
      <tr>
        <td colSpan={2} style={s}>합 계</td>
        <td style={sr}>{fmtK(row.budget)}</td>
        {mode === 'exec' && <>
          <td style={sr}>{fmtK(row.exec)}</td>
          <td style={sr}>{fmtK(remain)}</td>
          <td style={sr}>{rate.toFixed(1)}%</td>
        </>}
      </tr>
    )
  }

  return null
}

export default function BudgetReport() {
  const [programs, setPrograms] = useState([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [baseDate, setBaseDate] = useState(todayStr())
  const [mode, setMode] = useState('budget')
  const [items, setItems] = useState([])
  const [execMap, setExecMap] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('budget_programs').select('*').order('year', { ascending: false })
      .then(({ data }) => {
        const list = data || []
        setPrograms(list)
        if (list.length > 0) setSelectedProgramId(String(list[0].id))
      })
  }, [])

  useEffect(() => {
    if (!selectedProgramId) { setItems([]); return }
    setLoading(true)
    supabase.from('budget_items').select('*').eq('program_id', selectedProgramId).limit(100000)
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [selectedProgramId])

  useEffect(() => {
    if (!selectedProgramId || mode !== 'exec') { setExecMap({}); return }
    supabase.from('budget_executions')
      .select('budget_item_id, amount')
      .eq('program_id', selectedProgramId)
      .limit(100000)
      .then(({ data }) => {
        const em = {}
        ;(data || []).forEach(e => {
          em[e.budget_item_id] = (em[e.budget_item_id] || 0) + (Number(e.amount) || 0)
        })
        setExecMap(em)
      })
  }, [selectedProgramId, mode])

  const selectedProgram = programs.find(p => String(p.id) === selectedProgramId)
  const tree = buildTree(items)
  const rows = buildSimpleRows(tree, execMap)
  const totalRow = rows.find(r => r.type === 'total')
  const totalBudget = totalRow?.budget || 0
  const totalExec = totalRow?.exec || 0
  const totalRemain = totalBudget - totalExec
  const totalRate = totalBudget > 0 ? totalExec / totalBudget * 100 : 0

  return (
    <div style={{ fontFamily: '"Malgun Gothic", sans-serif', minHeight: '100vh', background: '#f8fafc' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, * { font-size: 9pt !important; }
          @page { size: A4 portrait; margin: 15mm 10mm; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #000 !important; padding: 3px 5px; }
          .print-body { background: white !important; padding: 0 !important; box-shadow: none !important; }
        }
      `}</style>

      {/* 컨트롤 바 */}
      <div className="no-print" style={{
        background: 'white', borderBottom: '1px solid #e5e7eb',
        padding: '12px 24px', display: 'flex', alignItems: 'center',
        gap: '16px', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <select value={selectedProgramId} onChange={e => setSelectedProgramId(e.target.value)}
          style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}>
          <option value="">사업 선택</option>
          {programs.map(p => <option key={p.id} value={String(p.id)}>{p.name} ({p.year})</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>기준일</span>
          <input type="date" value={baseDate} onChange={e => setBaseDate(e.target.value)}
            style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
          {[['budget', '예산서'], ['exec', '집행현황']].map(([val, label]) => (
            <button key={val} onClick={() => setMode(val)} style={{
              padding: '6px 18px', fontSize: '13px', border: 'none', cursor: 'pointer',
              background: mode === val ? '#1e3a5f' : 'white',
              color: mode === val ? 'white' : '#374151',
              fontWeight: mode === val ? '600' : '400',
            }}>{label}</button>
          ))}
        </div>

        <button onClick={() => window.print()} style={{
          padding: '6px 18px', fontSize: '13px', background: '#1e3a5f',
          color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
        }}>🖨️ 인쇄</button>
      </div>

      {/* 보고서 본문 */}
      <div className="print-body" style={{
        maxWidth: '210mm', margin: '24px auto', padding: '20mm',
        background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>울산경제일자리진흥원</div>
          <div style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: '#111827', marginBottom: '14px' }}>
            {mode === 'budget' ? '사업비 예산서' : '사업비 집행현황 보고서'}
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#4b5563', lineHeight: '1.9' }}>
            <div>사업명: <strong>{selectedProgram?.name || '-'}</strong></div>
            <div>기준일: {baseDate}</div>
            {selectedProgram?.manager && <div>담당자: {selectedProgram.manager}</div>}
          </div>
        </div>

        {!selectedProgramId && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontSize: '15px' }}>사업을 선택하세요</div>
        )}

        {selectedProgramId && <>
          {/* 요약 박스 */}
          <div style={{ border: B, marginBottom: '20px', display: 'flex' }}>
            {mode === 'budget' ? (
              <div style={{ flex: 1, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '6px' }}>총 예 산 (천원)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>{fmtK(totalBudget)}</div>
              </div>
            ) : (
              [
                { label: '현재예산 (천원)', value: fmtK(totalBudget) },
                { label: '집행액 (천원)', value: fmtK(totalExec) },
                { label: '잔액 (천원)', value: fmtK(totalRemain) },
                { label: '집행률', value: totalRate.toFixed(1) + '%', color: rateColor(totalRate) },
              ].map(({ label, value, color }, i, arr) => (
                <div key={label} style={{
                  flex: 1, padding: '10px', textAlign: 'center',
                  borderRight: i < arr.length - 1 ? B : 'none',
                }}>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: color || '#111827' }}>{value}</div>
                </div>
              ))
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>로딩 중...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  <th style={TH}>구분</th>
                  <th style={TH}>세목</th>
                  <th style={TH_R}>예산액(천원)</th>
                  {mode === 'exec' && <>
                    <th style={TH_R}>집행액(천원)</th>
                    <th style={TH_R}>잔액(천원)</th>
                    <th style={TH_R}>집행률</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => <SimpleRow key={idx} row={row} mode={mode} />)}
              </tbody>
            </table>
          )}
        </>}
      </div>
    </div>
  )
}
