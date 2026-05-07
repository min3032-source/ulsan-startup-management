import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const todayStr = () => new Date().toISOString().slice(0, 10)

function formatKorean(num) {
  const n = Number(num) || 0
  if (n === 0) return '0원'
  const eok = Math.floor(n / 100000000)
  const man = Math.floor((n % 100000000) / 10000)
  let result = ''
  if (eok > 0) result += `${eok.toLocaleString('ko-KR')}억 `
  if (man > 0) result += `${man.toLocaleString('ko-KR')}만`
  if (!eok && !man) result += (n % 10000).toLocaleString('ko-KR')
  return result.trim() + '원'
}

function fmtK(num) {
  return Math.round((Number(num) || 0) / 1000).toLocaleString('ko-KR')
}

function barColor(rate) {
  if (rate > 100) return '#ef4444'
  if (rate > 80) return '#10b981'
  if (rate > 50) return '#f59e0b'
  return '#3b82f6'
}

const PROGRAM_COLORS = ['#1d4ed8', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2']
const CARD_BORDER = '1px solid #e5e7eb'

export default function BudgetDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [programs, setPrograms] = useState([])
  const [budgetByProgram, setBudgetByProgram] = useState({})
  const [execByProgram, setExecByProgram] = useState({})
  const [l1StatsByProgram, setL1StatsByProgram] = useState({})
  const [level1Data, setLevel1Data] = useState([])
  const [recentExecs, setRecentExecs] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: progs }, { data: items }, { data: execs }] = await Promise.all([
        supabase.from('budget_programs').select('*').order('year', { ascending: false }),
        supabase.from('budget_items')
          .select('id, program_id, level, name, budgeted_amount, parent_id, sort_order')
          .limit(100000),
        supabase.from('budget_executions')
          .select('id, program_id, budget_item_id, amount, execution_date, created_at')
          .order('id', { ascending: false })
          .limit(100000),
      ])

      const allPrograms = progs || []
      const allItems = items || []
      const allExecs = execs || []

      const itemMap = {}
      allItems.forEach(i => { itemMap[i.id] = i })

      function findL1(item) {
        let cur = item
        while (cur && cur.level > 1) cur = itemMap[cur.parent_id]
        return cur?.level === 1 ? cur : null
      }

      // 프로그램별 예산 (level4 합계)
      const budgetMap = {}
      allItems.filter(i => i.level === 4).forEach(i => {
        const key = String(i.program_id)
        budgetMap[key] = (budgetMap[key] || 0) + (Number(i.budgeted_amount) || 0)
      })

      // 프로그램별 집행액
      const execMap = {}
      allExecs.forEach(e => {
        const key = String(e.program_id)
        execMap[key] = (execMap[key] || 0) + (Number(e.amount) || 0)
      })

      // 프로그램별 관(level1) 통계
      const l1StatMap = {}
      allItems.filter(i => i.level === 4).forEach(i => {
        const l1 = findL1(i)
        if (!l1) return
        const pid = String(i.program_id)
        if (!l1StatMap[pid]) l1StatMap[pid] = {}
        if (!l1StatMap[pid][l1.id]) {
          l1StatMap[pid][l1.id] = { id: l1.id, name: l1.name, budget: 0, exec: 0, sortOrder: l1.sort_order || 0 }
        }
        l1StatMap[pid][l1.id].budget += Number(i.budgeted_amount) || 0
      })

      allExecs.forEach(e => {
        const item = itemMap[e.budget_item_id]
        if (!item) return
        const l1 = findL1(item)
        if (!l1) return
        const pid = String(e.program_id)
        if (!l1StatMap[pid]) l1StatMap[pid] = {}
        if (!l1StatMap[pid][l1.id]) {
          l1StatMap[pid][l1.id] = { id: l1.id, name: l1.name, budget: 0, exec: 0, sortOrder: l1.sort_order || 0 }
        }
        l1StatMap[pid][l1.id].exec += Number(e.amount) || 0
      })

      const l1Arrays = {}
      Object.entries(l1StatMap).forEach(([pid, map]) => {
        l1Arrays[pid] = Object.values(map).sort((a, b) => a.sortOrder - b.sortOrder)
      })

      // 전체 현황 탭용 관별 집계
      const l1AggAll = {}
      allItems.filter(i => i.level === 4).forEach(i => {
        const l1 = findL1(i)
        if (!l1) return
        l1AggAll[l1.name] = (l1AggAll[l1.name] || 0) + (Number(i.budgeted_amount) || 0)
      })
      const l1DataArr = Object.entries(l1AggAll)
        .map(([name, budget]) => ({ name, budget }))
        .sort((a, b) => b.budget - a.budget)

      // 프로그램별 최근 집행 5건
      const recentMap = {}
      allPrograms.forEach(p => {
        const pid = String(p.id)
        const progExecs = allExecs.filter(e => String(e.program_id) === pid).slice(0, 5)
        recentMap[pid] = progExecs.map(e => ({
          date: e.execution_date
            ? String(e.execution_date).slice(0, 10)
            : (e.created_at ? String(e.created_at).slice(0, 10) : '-'),
          itemName: itemMap[e.budget_item_id]?.name || '(항목 미상)',
          amount: Number(e.amount) || 0,
        }))
      })

      setPrograms(allPrograms)
      setBudgetByProgram(budgetMap)
      setExecByProgram(execMap)
      setL1StatsByProgram(l1Arrays)
      setLevel1Data(l1DataArr)
      setRecentExecs(recentMap)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const totalBudget = Object.values(budgetByProgram).reduce((s, v) => s + v, 0)
  const totalExec = Object.values(execByProgram).reduce((s, v) => s + v, 0)
  const avgRate = totalBudget > 0 ? totalExec / totalBudget * 100 : 0
  const maxL1Budget = Math.max(...level1Data.map(d => d.budget), 1)

  const activeProgram = programs.find(p => String(p.id) === activeTab)
  const activeL1Stats = l1StatsByProgram[activeTab] || []
  const activeBudget = budgetByProgram[activeTab] || 0
  const activeExec = execByProgram[activeTab] || 0
  const activeRemain = activeBudget - activeExec
  const activeRate = activeBudget > 0 ? activeExec / activeBudget * 100 : 0
  const activeRecent = recentExecs[activeTab] || []

  return (
    <div style={{ fontFamily: '"Malgun Gothic", sans-serif', minHeight: '100vh', background: '#f8fafc' }}>
      <style>{`
        .print-header { display: none; }
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; text-align: center; margin-bottom: 20px; }
          body, * { font-size: 9pt !important; }
          @page { size: A4 portrait; margin: 15mm 10mm; }
          table { border-collapse: collapse !important; width: 100% !important; }
          td, th { border: 1px solid #000 !important; padding: 3px 6px !important; }
          .print-grid { display: block !important; }
          .print-card { border: 1px solid #ccc !important; margin-bottom: 8px; }
        }
      `}</style>

      {/* 탭 바 */}
      <div className="no-print" style={{
        background: 'white', borderBottom: '1px solid #e5e7eb',
        padding: '0 20px', display: 'flex', alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto', gap: 0
      }}>
        {[{ id: 'all', label: '전체 현황' }, ...programs.map(p => ({ id: String(p.id), label: p.name }))].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '12px 18px', fontSize: '13px', border: 'none', cursor: 'pointer',
            background: 'none', whiteSpace: 'nowrap',
            borderBottom: activeTab === tab.id ? '2px solid #1e3a5f' : '2px solid transparent',
            color: activeTab === tab.id ? '#1e3a5f' : '#6b7280',
            fontWeight: activeTab === tab.id ? '600' : '400',
          }}>{tab.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        {activeTab !== 'all' && (
          <button onClick={() => window.print()} style={{
            padding: '7px 14px', fontSize: '12px', background: '#1e3a5f',
            color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
            margin: '6px 8px 6px 0', fontWeight: '600', flexShrink: 0
          }}>🖨️ 이 사업 현황 인쇄</button>
        )}
        <button onClick={() => navigate('/budget')} style={{
          padding: '7px 12px', fontSize: '12px', border: '1px solid #d1d5db',
          borderRadius: '6px', background: 'white', cursor: 'pointer', color: '#6b7280',
          margin: '6px 0', flexShrink: 0
        }}>← 사업비 관리</button>
      </div>

      {/* ===== 전체 현황 탭 ===== */}
      {activeTab === 'all' && (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

          {/* KPI 카드 4개 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: CARD_BORDER, height: '80px' }} />
              ))
              : [
                { label: '전체 사업수', value: `${programs.length}개`, color: '#1e3a5f' },
                { label: '전체 예산합계', value: formatKorean(totalBudget), color: '#1d4ed8' },
                { label: '전체 집행액', value: formatKorean(totalExec), color: '#059669' },
                { label: '평균 집행률', value: `${avgRate.toFixed(1)}%`, color: barColor(avgRate) },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: 'white', borderRadius: '12px', padding: '16px',
                  border: CARD_BORDER, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>{label}</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color }}>{value}</div>
                </div>
              ))
            }
          </div>

          {/* 사업별 비교 카드 그리드 */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>사업별 현황</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: CARD_BORDER, height: '130px' }} />
                ))
                : programs.map((prog, idx) => {
                  const pid = String(prog.id)
                  const budget = budgetByProgram[pid] || 0
                  const exec = execByProgram[pid] || 0
                  const remain = budget - exec
                  const rate = budget > 0 ? exec / budget * 100 : 0
                  const color = PROGRAM_COLORS[idx % PROGRAM_COLORS.length]
                  return (
                    <div key={prog.id}
                      onClick={() => setActiveTab(pid)}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
                      style={{
                        background: 'white', borderRadius: '12px', padding: '16px',
                        border: CARD_BORDER, cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)', transition: 'box-shadow 0.15s'
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontWeight: '600', fontSize: '13px', color: '#1f2937' }}>{prog.name}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', paddingLeft: '16px' }}>
                            {prog.year}년{prog.manager ? ` · ${prog.manager}` : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: barColor(rate), flexShrink: 0 }}>{rate.toFixed(1)}%</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', marginBottom: '10px' }}>
                        {[['총예산', formatKorean(budget), '#374151'], ['집행액', formatKorean(exec), '#059669'], ['잔액', formatKorean(remain), '#1d4ed8']].map(([l, v, c]) => (
                          <div key={l}>
                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>{l}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: c }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: '#f3f4f6', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '6px', borderRadius: '999px', background: barColor(rate), width: `${Math.min(rate, 100)}%` }} />
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </div>

          {/* 관별 예산 현황 가로 막대 차트 */}
          {!loading && level1Data.length > 0 && (
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: CARD_BORDER, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>예산과목(관)별 예산 현황</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {level1Data.map((item, idx) => {
                  const pct = item.budget / maxL1Budget * 100
                  return (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '120px', fontSize: '11px', color: '#4b5563', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </div>
                      <div style={{ flex: 1, background: '#f3f4f6', borderRadius: '999px', height: '24px', overflow: 'hidden' }}>
                        <div style={{
                          height: '24px', borderRadius: '999px',
                          background: PROGRAM_COLORS[idx % PROGRAM_COLORS.length],
                          width: `${Math.max(pct, 1)}%`,
                          display: 'flex', alignItems: 'center', paddingLeft: '8px', minWidth: '4px'
                        }}>
                          {pct > 15 && (
                            <span style={{ fontSize: '10px', color: 'white', fontWeight: '500', whiteSpace: 'nowrap' }}>
                              {formatKorean(item.budget)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ width: '100px', fontSize: '11px', color: '#6b7280', textAlign: 'right', flexShrink: 0 }}>
                        {formatKorean(item.budget)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 사업별 탭 ===== */}
      {activeTab !== 'all' && activeProgram && (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

          {/* 인쇄용 헤더 (화면에서 숨김) */}
          <div className="print-header">
            <div style={{ fontSize: '12pt', color: '#555', marginBottom: '4px' }}>울산경제일자리진흥원</div>
            <div style={{ fontSize: '18pt', fontWeight: 'bold', marginBottom: '6px' }}>{activeProgram.name} 집행현황</div>
            <div style={{ fontSize: '10pt', color: '#555' }}>기준일: {todayStr()}</div>
          </div>

          {/* 사업명 */}
          <div className="no-print" style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>{activeProgram.name}</h1>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {activeProgram.year}년{activeProgram.manager ? ` · 담당: ${activeProgram.manager}` : ''}
            </div>
          </div>

          {/* KPI 4개 */}
          <div className="print-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: '총 예산', value: formatKorean(activeBudget), sub: `${fmtK(activeBudget)}천원`, color: '#1e3a5f' },
              { label: '집행액', value: formatKorean(activeExec), sub: `${fmtK(activeExec)}천원`, color: '#059669' },
              { label: '잔액', value: formatKorean(activeRemain), sub: `${fmtK(activeRemain)}천원`, color: '#1d4ed8' },
              { label: '집행률', value: `${activeRate.toFixed(1)}%`, sub: `${fmtK(activeExec)} / ${fmtK(activeBudget)}`, color: barColor(activeRate) },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="print-card" style={{
                background: 'white', borderRadius: '10px', padding: '14px',
                border: CARD_BORDER, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color, marginBottom: '2px' }}>{value}</div>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* 2컬럼 레이아웃 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* 왼쪽: 관별 현황 테이블 */}
            <div>
              <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>관별 예산·집행 현황</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#1e3a5f', color: 'white' }}>
                    {['구분(관)', '예산액(천원)', '집행액(천원)', '잔액(천원)', '집행률'].map((h, i) => (
                      <th key={h} style={{
                        padding: '7px 8px', border: '1px solid #374151',
                        textAlign: i === 0 ? 'left' : 'right', fontWeight: '600', fontSize: '11px'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeL1Stats.map((stat, idx) => {
                    const remain = stat.budget - stat.exec
                    const rate = stat.budget > 0 ? stat.exec / stat.budget * 100 : 0
                    const bg = idx % 2 === 0 ? 'white' : '#f9fafb'
                    return (
                      <tr key={stat.id} style={{ background: bg }}>
                        <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', fontSize: '11px' }}>{stat.name}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '11px' }}>{fmtK(stat.budget)}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '11px' }}>{fmtK(stat.exec)}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '11px' }}>{fmtK(remain)}</td>
                        <td style={{ padding: '6px 8px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: '11px', color: barColor(rate), fontWeight: '600' }}>{rate.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                  <tr style={{ background: '#374151', color: 'white', fontWeight: 'bold' }}>
                    <td style={{ padding: '6px 8px', border: '1px solid #4b5563', fontSize: '11px' }}>합 계</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #4b5563', textAlign: 'right', fontSize: '11px' }}>{fmtK(activeBudget)}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #4b5563', textAlign: 'right', fontSize: '11px' }}>{fmtK(activeExec)}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #4b5563', textAlign: 'right', fontSize: '11px' }}>{fmtK(activeRemain)}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #4b5563', textAlign: 'right', fontSize: '11px' }}>{activeRate.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 오른쪽: 시각화 + 최근 집행 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* 집행률 시각화 */}
              <div style={{ background: 'white', borderRadius: '10px', padding: '16px', border: CARD_BORDER }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>관별 집행률</h3>
                {activeL1Stats.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '16px 0' }}>데이터 없음</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeL1Stats.map(stat => {
                      const rate = stat.budget > 0 ? stat.exec / stat.budget * 100 : 0
                      return (
                        <div key={stat.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                              {stat.name}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: barColor(rate), flexShrink: 0 }}>{rate.toFixed(1)}%</span>
                          </div>
                          <div style={{ background: '#f3f4f6', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
                            <div style={{ height: '10px', borderRadius: '999px', background: barColor(rate), width: `${Math.min(rate, 100)}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 최근 집행 내역 5건 */}
              <div style={{ background: 'white', borderRadius: '10px', padding: '16px', border: CARD_BORDER }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>최근 집행 내역</h3>
                {activeRecent.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '20px 0' }}>집행 내역이 없습니다</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {activeRecent.map((e, idx) => (
                      <div key={idx} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: idx < activeRecent.length - 1 ? '1px solid #f3f4f6' : 'none'
                      }}>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '12px', color: '#1f2937', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.itemName}
                          </div>
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>{e.date}</div>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#059669', flexShrink: 0, marginLeft: '8px' }}>
                          {formatKorean(e.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af', fontSize: '14px' }}>
          데이터 로딩 중...
        </div>
      )}
    </div>
  )
}
