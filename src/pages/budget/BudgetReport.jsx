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

// 트리를 level4 경로 목록으로 평탄화 ({l1, l2, l3, l4})
function flattenPaths(tree) {
  const paths = []
  function traverse(node, ctx) {
    const newCtx = { ...ctx, [`l${node.level}`]: node }
    if (node.level === 4) {
      paths.push(newCtx)
    } else {
      ;(node.children || []).forEach(child => traverse(child, newCtx))
    }
  }
  tree.forEach(node => traverse(node, { l1: null, l2: null, l3: null, l4: null }))
  return paths
}

// 순서를 유지하며 연속 그룹으로 묶기
function groupBy(arr, keyFn) {
  const groups = []
  const seen = new Map()
  arr.forEach(item => {
    const key = keyFn(item)
    if (!seen.has(key)) {
      const group = { key, items: [] }
      seen.set(key, group)
      groups.push(group)
    }
    seen.get(key).items.push(item)
  })
  return groups
}

// 테이블 행 목록 생성 (rowspan 정보 포함)
function buildRows(tree, execMap) {
  const paths = flattenPaths(tree)
  if (paths.length === 0) return []

  const sum = (ps, field) =>
    ps.reduce((s, p) => {
      if (field === 'budget') return s + (Number(p.l4?.budgeted_amount) || 0)
      if (field === 'original') return s + (Number(p.l4?.original_amount) || Number(p.l4?.budgeted_amount) || 0)
      if (field === 'exec') return s + (execMap[p.l4?.id] || 0)
      return s
    }, 0)

  const rows = [{
    type: 'total',
    totalBudget: sum(paths, 'budget'),
    totalOriginal: sum(paths, 'original'),
    totalExec: sum(paths, 'exec'),
  }]

  groupBy(paths, p => p.l1?.id).forEach(({ items: l1Paths }) => {
    const l1 = l1Paths[0]?.l1
    rows.push({
      type: 'subtotal',
      l1,
      l1Budget: sum(l1Paths, 'budget'),
      l1Original: sum(l1Paths, 'original'),
      l1Exec: sum(l1Paths, 'exec'),
    })

    let l1First = true
    groupBy(l1Paths, p => p.l2?.id).forEach(({ items: l2Paths }) => {
      let l2First = true
      l2Paths.forEach(path => {
        rows.push({
          type: 'detail',
          path,
          showL1: l1First,
          l1Rowspan: l1Paths.length,
          showL2: l2First,
          l2Rowspan: l2Paths.length,
        })
        l1First = false
        l2First = false
      })
    })
  })

  return rows
}

const BORDER = '1px solid #000'
const TD = { padding: '4px 8px', border: BORDER, fontSize: '11px', verticalAlign: 'middle' }
const TD_R = { ...TD, textAlign: 'right' }
const TH = { ...TD, fontWeight: 'bold', textAlign: 'center', background: '#374151', color: 'white' }
const TH_R = { ...TH, textAlign: 'right' }
const TOTAL_L = { ...TD, background: '#1e3a5f', color: 'white', fontWeight: 'bold' }
const TOTAL_R = { ...TD_R, background: '#1e3a5f', color: 'white', fontWeight: 'bold' }
const SUB_L = { ...TD, background: '#374151', color: 'white', fontWeight: 'bold' }
const SUB_R = { ...TD_R, background: '#374151', color: 'white', fontWeight: 'bold' }

function ReportRow({ row, mode, execMap }) {
  if (row.type === 'total') {
    const remain = row.totalBudget - row.totalExec
    const rate = row.totalBudget > 0 ? row.totalExec / row.totalBudget * 100 : 0
    return (
      <tr>
        <td colSpan={3} style={TOTAL_L}>총 계</td>
        <td style={TOTAL_R}>{fmtK(row.totalBudget)}</td>
        {mode === 'exec' && <>
          <td style={TOTAL_R}>{fmtK(row.totalExec)}</td>
          <td style={TOTAL_R}>{fmtK(remain)}</td>
          <td style={TOTAL_R}>{rate.toFixed(1)}%</td>
        </>}
      </tr>
    )
  }

  if (row.type === 'subtotal') {
    const remain = row.l1Budget - row.l1Exec
    const rate = row.l1Budget > 0 ? row.l1Exec / row.l1Budget * 100 : 0
    return (
      <tr>
        <td colSpan={3} style={SUB_L}>{row.l1?.name} &nbsp;소 계</td>
        <td style={SUB_R}>{fmtK(row.l1Budget)}</td>
        {mode === 'exec' && <>
          <td style={SUB_R}>{fmtK(row.l1Exec)}</td>
          <td style={SUB_R}>{fmtK(remain)}</td>
          <td style={SUB_R}>{rate.toFixed(1)}%</td>
        </>}
      </tr>
    )
  }

  if (row.type === 'detail') {
    const { path, showL1, l1Rowspan, showL2, l2Rowspan } = row
    const { l1, l2, l3, l4 } = path
    const budget = Number(l4?.budgeted_amount) || 0
    const exec = execMap[l4?.id] || 0
    const remain = budget - exec
    const rate = budget > 0 ? exec / budget * 100 : 0
    const detail = l3 ? `${l3.name} · ${l4.name}` : l4?.name

    return (
      <tr>
        {showL1 && <td rowSpan={l1Rowspan} style={{ ...TD, verticalAlign: 'middle' }}>{l1?.name}</td>}
        {showL2 && <td rowSpan={l2Rowspan} style={{ ...TD, verticalAlign: 'middle' }}>{l2?.name}</td>}
        <td style={TD}>{detail}</td>
        <td style={TD_R}>{fmtK(budget)}</td>
        {mode === 'exec' && <>
          <td style={TD_R}>{fmtK(exec)}</td>
          <td style={TD_R}>{fmtK(remain)}</td>
          <td style={{ ...TD_R, color: rateColor(rate) }}>{rate.toFixed(1)}%</td>
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
  const rows = buildRows(tree, execMap)
  const totalRow = rows.find(r => r.type === 'total')
  const totalBudget = totalRow?.totalBudget || 0
  const totalOriginal = totalRow?.totalOriginal || 0
  const totalExec = totalRow?.totalExec || 0
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
          .page-break { page-break-before: always; }
          .print-body { background: white !important; padding: 0 !important; box-shadow: none !important; }
        }
      `}</style>

      {/* 컨트롤 바 (인쇄 시 숨김) */}
      <div className="no-print" style={{
        background: 'white', borderBottom: '1px solid #e5e7eb',
        padding: '12px 24px', display: 'flex', alignItems: 'center',
        gap: '16px', flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <select
          value={selectedProgramId}
          onChange={e => setSelectedProgramId(e.target.value)}
          style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }}>
          <option value="">사업 선택</option>
          {programs.map(p => <option key={p.id} value={String(p.id)}>{p.name} ({p.year})</option>)}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>기준일</span>
          <input
            type="date"
            value={baseDate}
            onChange={e => setBaseDate(e.target.value)}
            style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
          {[['budget', '예산서'], ['exec', '집행현황']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setMode(val)}
              style={{
                padding: '6px 18px', fontSize: '13px', border: 'none', cursor: 'pointer',
                background: mode === val ? '#1e3a5f' : 'white',
                color: mode === val ? 'white' : '#374151',
                fontWeight: mode === val ? '600' : '400',
              }}>
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => window.print()}
          style={{
            padding: '6px 18px', fontSize: '13px', background: '#1e3a5f',
            color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
          }}>
          🖨️ 인쇄
        </button>
      </div>

      {/* 보고서 본문 (A4) */}
      <div className="print-body" style={{
        maxWidth: '210mm', margin: '24px auto', padding: '20mm',
        background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
      }}>
        {/* 헤더 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>
            울산경제일자리진흥원
          </div>
          <div style={{ textAlign: 'center', fontSize: '22px', fontWeight: 'bold', color: '#111827', marginBottom: '14px' }}>
            {mode === 'budget' ? '사업비 예산서' : '사업비 집행현황 보고서'}
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#4b5563', lineHeight: '1.9' }}>
            <div>사업명: <strong>{selectedProgram?.name || '-'}</strong></div>
            <div>기준일: {baseDate}</div>
            {selectedProgram?.manager && <div>담당자: {selectedProgram.manager}</div>}
          </div>
        </div>

        {/* 사업 미선택 안내 */}
        {!selectedProgramId && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontSize: '15px' }}>
            사업을 선택하세요
          </div>
        )}

        {selectedProgramId && <>
          {/* 요약 박스 */}
          <div style={{ border: BORDER, marginBottom: '20px', display: 'flex' }}>
            {mode === 'budget' ? (
              <div style={{ flex: 1, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '6px' }}>총 예 산 (천원)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>{fmtK(totalBudget)}</div>
              </div>
            ) : (
              [
                { label: '당초예산 (천원)', value: fmtK(totalOriginal) },
                { label: '현재예산 (천원)', value: fmtK(totalBudget) },
                { label: '집행액 (천원)', value: fmtK(totalExec) },
                { label: '잔액 (천원)', value: fmtK(totalRemain) },
                { label: '집행률', value: totalRate.toFixed(1) + '%', color: rateColor(totalRate) },
              ].map(({ label, value, color }, i, arr) => (
                <div key={label} style={{
                  flex: 1, padding: '10px', textAlign: 'center',
                  borderRight: i < arr.length - 1 ? BORDER : 'none',
                }}>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: color || '#111827' }}>{value}</div>
                </div>
              ))
            )}
          </div>

          {/* 메인 테이블 */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>로딩 중...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  <th style={TH}>구분</th>
                  <th style={TH}>세목</th>
                  <th style={TH}>산출내역</th>
                  {mode === 'budget'
                    ? <th style={TH_R}>소요예산(천원)</th>
                    : <>
                      <th style={TH_R}>예산액(천원)</th>
                      <th style={TH_R}>집행액(천원)</th>
                      <th style={TH_R}>잔액(천원)</th>
                      <th style={TH_R}>집행률</th>
                    </>
                  }
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <ReportRow key={idx} row={row} mode={mode} execMap={execMap} />
                ))}
              </tbody>
            </table>
          )}

          {/* 서명란 */}
          <div style={{ marginTop: '48px' }}>
            <table style={{ marginLeft: 'auto', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  {['작 성', '검 토', '결 재'].map(label => (
                    <td key={label} style={{
                      border: BORDER, padding: '6px 0', textAlign: 'center',
                      fontSize: '11px', fontWeight: '600', minWidth: '90px'
                    }}>
                      {label}
                    </td>
                  ))}
                </tr>
                <tr>
                  {[1, 2, 3].map(i => (
                    <td key={i} style={{ border: BORDER, height: '40px', minWidth: '90px' }} />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>}
      </div>
    </div>
  )
}
