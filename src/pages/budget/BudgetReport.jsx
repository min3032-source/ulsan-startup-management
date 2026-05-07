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

const B = '1px solid #000'
const TD = { padding: '4px 8px', border: B, fontSize: '11px', verticalAlign: 'middle' }
const TD_R = { ...TD, textAlign: 'right' }
const TH = { ...TD, fontWeight: 'bold', textAlign: 'center', background: '#374151', color: 'white' }
const TH_R = { ...TH, textAlign: 'right' }

// 구분별 그룹 생성 (순서 유지)
function groupByDivision(entries) {
  const groups = []
  const map = new Map()
  entries.forEach(e => {
    if (!map.has(e.division)) {
      const g = { division: e.division, items: [] }
      map.set(e.division, g)
      groups.push(g)
    }
    map.get(e.division).items.push(e)
  })
  return groups
}

function ReportRows({ entries, execMap, mode }) {
  const groups = groupByDivision(entries)
  const rows = []

  const totOrig = entries.reduce((s, e) => s + (Number(e.original_amount) || 0), 0)
  const totBdg = entries.reduce((s, e) => s + (Number(e.budgeted_amount) || 0), 0)
  const totExec = entries.reduce((s, e) => s + (execMap[e.id] || 0), 0)
  const totRemain = totBdg - totExec
  const totRate = totBdg > 0 ? totExec / totBdg * 100 : 0

  groups.forEach(({ division, items }) => {
    const dOrig = items.reduce((s, e) => s + (Number(e.original_amount) || 0), 0)
    const dBdg = items.reduce((s, e) => s + (Number(e.budgeted_amount) || 0), 0)
    const dExec = items.reduce((s, e) => s + (execMap[e.id] || 0), 0)
    const dRemain = dBdg - dExec
    const dRate = dBdg > 0 ? dExec / dBdg * 100 : 0
    const SS = { ...TD, background: '#1e3a5f', color: 'white', fontWeight: 'bold' }
    const SSR = { ...SS, textAlign: 'right' }

    // 소계 행
    const colSpanCount = mode === 'budget' ? 3 : 3
    rows.push(
      <tr key={`sub-${division}`}>
        <td colSpan={colSpanCount} style={SS}>{division} 소계</td>
        <td style={SSR}>{fmtK(dOrig)}</td>
        <td style={SSR}>{fmtK(dBdg)}</td>
        {mode === 'exec' && <>
          <td style={SSR}>{fmtK(dExec)}</td>
          <td style={SSR}>{fmtK(dRemain)}</td>
          <td style={SSR}>{dRate.toFixed(1)}%</td>
        </>}
      </tr>
    )

    // 항목 행 (division rowspan)
    items.forEach((entry, idx) => {
      const exec = execMap[entry.id] || 0
      const bdg = Number(entry.budgeted_amount) || 0
      const orig = Number(entry.original_amount) || 0
      const remain = bdg - exec
      const rate = bdg > 0 ? exec / bdg * 100 : 0
      rows.push(
        <tr key={entry.id}>
          {idx === 0 && (
            <td rowSpan={items.length} style={{ ...TD, verticalAlign: 'middle', textAlign: 'center', fontWeight: '600', background: '#f8fafc' }}>
              {entry.division}
            </td>
          )}
          <td style={TD}>{entry.sub_item}</td>
          <td style={TD}>{entry.calculation}</td>
          <td style={TD_R}>{fmtK(orig)}</td>
          <td style={TD_R}>{fmtK(bdg)}</td>
          {mode === 'exec' && <>
            <td style={TD_R}>{fmtK(exec)}</td>
            <td style={TD_R}>{fmtK(remain)}</td>
            <td style={{ ...TD_R, color: rateColor(rate) }}>{rate.toFixed(1)}%</td>
          </>}
        </tr>
      )
    })
  })

  // 합계 행
  const TS = { ...TD, background: '#374151', color: 'white', fontWeight: 'bold' }
  const TSR = { ...TS, textAlign: 'right' }
  rows.push(
    <tr key="total">
      <td colSpan={3} style={TS}>합 계</td>
      <td style={TSR}>{fmtK(totOrig)}</td>
      <td style={TSR}>{fmtK(totBdg)}</td>
      {mode === 'exec' && <>
        <td style={TSR}>{fmtK(totExec)}</td>
        <td style={TSR}>{fmtK(totRemain)}</td>
        <td style={TSR}>{totRate.toFixed(1)}%</td>
      </>}
    </tr>
  )

  return rows
}

export default function BudgetReport() {
  const [programs, setPrograms] = useState([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [baseDate, setBaseDate] = useState(todayStr())
  const [mode, setMode] = useState('budget')
  const [entries, setEntries] = useState([])
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
    if (!selectedProgramId) { setEntries([]); return }
    setLoading(true)
    supabase.from('budget_entries').select('*').eq('program_id', selectedProgramId).order('sort_order')
      .then(({ data }) => { setEntries(data || []); setLoading(false) })
  }, [selectedProgramId])

  useEffect(() => {
    if (!selectedProgramId || mode !== 'exec') { setExecMap({}); return }
    supabase.from('budget_entry_executions')
      .select('budget_entry_id, amount')
      .eq('program_id', selectedProgramId)
      .limit(100000)
      .then(({ data }) => {
        const em = {}
        ;(data || []).forEach(e => {
          em[e.budget_entry_id] = (em[e.budget_entry_id] || 0) + (Number(e.amount) || 0)
        })
        setExecMap(em)
      })
  }, [selectedProgramId, mode])

  const selectedProgram = programs.find(p => String(p.id) === selectedProgramId)
  const totalOriginal = entries.reduce((s, e) => s + (Number(e.original_amount) || 0), 0)
  const totalBudget = entries.reduce((s, e) => s + (Number(e.budgeted_amount) || 0), 0)
  const totalExec = entries.reduce((s, e) => s + (execMap[e.id] || 0), 0)
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
              <>
                <div style={{ flex: 1, padding: '10px', textAlign: 'center', borderRight: B }}>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>당초예산 (천원)</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>{fmtK(totalOriginal)}</div>
                </div>
                <div style={{ flex: 1, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>현재예산 (천원)</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>{fmtK(totalBudget)}</div>
                </div>
              </>
            ) : (
              [
                { label: '당초예산 (천원)', value: fmtK(totalOriginal) },
                { label: '현재예산 (천원)', value: fmtK(totalBudget) },
                { label: '집행액 (천원)', value: fmtK(totalExec) },
                { label: '잔액 (천원)', value: fmtK(totalRemain) },
                { label: '집행률', value: totalRate.toFixed(1) + '%', color: rateColor(totalRate) },
              ].map(({ label, value, color }, i, arr) => (
                <div key={label} style={{ flex: 1, padding: '10px', textAlign: 'center', borderRight: i < arr.length - 1 ? B : 'none' }}>
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
                  <th style={TH}>산출내역</th>
                  <th style={TH_R}>당초예산(천원)</th>
                  <th style={TH_R}>현재예산(천원)</th>
                  {mode === 'exec' && <>
                    <th style={TH_R}>집행액(천원)</th>
                    <th style={TH_R}>잔액(천원)</th>
                    <th style={TH_R}>집행률</th>
                  </>}
                </tr>
              </thead>
              <tbody>
                <ReportRows entries={entries} execMap={execMap} mode={mode} />
              </tbody>
            </table>
          )}
        </>}
      </div>
    </div>
  )
}
