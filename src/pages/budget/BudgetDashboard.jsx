import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

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

function barColor(rate) {
  if (rate > 100) return '#ef4444'
  if (rate > 80) return '#10b981'
  if (rate > 50) return '#f59e0b'
  return '#3b82f6'
}

const PROGRAM_COLORS = ['#1d4ed8', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2']

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

export default function BudgetDashboard() {
  const navigate = useNavigate()
  const [programs, setPrograms] = useState([])
  const [budgetByProgram, setBudgetByProgram] = useState({})
  const [execByProgram, setExecByProgram] = useState({})
  const [level1Data, setLevel1Data] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [{ data: progs }, { data: items }, { data: execs }] = await Promise.all([
        supabase.from('budget_programs').select('*').order('year', { ascending: false }),
        supabase.from('budget_items').select('*').limit(100000),
        supabase.from('budget_executions').select('program_id, amount').limit(100000),
      ])

      const allPrograms = progs || []
      const allItems = items || []
      const allExecs = execs || []

      // level4 budget by program
      const budgetMap = {}
      allItems.filter(i => i.level === 4).forEach(i => {
        budgetMap[i.program_id] = (budgetMap[i.program_id] || 0) + (Number(i.budgeted_amount) || 0)
      })

      // exec by program
      const execMap = {}
      allExecs.forEach(e => {
        execMap[e.program_id] = (execMap[e.program_id] || 0) + (Number(e.amount) || 0)
      })

      // level1(관)별 집계: 각 level4 item에서 level1 조상 탐색
      const itemMap = {}
      allItems.forEach(i => { itemMap[i.id] = i })

      const l1Agg = {}
      allItems.filter(i => i.level === 4).forEach(item => {
        let current = item
        while (current && current.level > 1) {
          current = itemMap[current.parent_id]
        }
        if (current && current.level === 1) {
          if (!l1Agg[current.name]) l1Agg[current.name] = 0
          l1Agg[current.name] += Number(item.budgeted_amount) || 0
        }
      })

      const l1Array = Object.entries(l1Agg)
        .map(([name, budget]) => ({ name, budget }))
        .sort((a, b) => b.budget - a.budget)

      setPrograms(allPrograms)
      setBudgetByProgram(budgetMap)
      setExecByProgram(execMap)
      setLevel1Data(l1Array)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const totalBudget = Object.values(budgetByProgram).reduce((s, v) => s + v, 0)
  const totalExec = Object.values(execByProgram).reduce((s, v) => s + v, 0)
  const avgRate = totalBudget > 0 ? (totalExec / totalBudget * 100) : 0
  const maxL1Budget = Math.max(...level1Data.map(d => d.budget), 1)

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">사업비 전체 대시보드</h1>
          <p className="text-xs text-gray-400 mt-0.5">전체 사업 예산 현황 요약</p>
        </div>
        <button onClick={() => navigate('/budget')}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
          ← 사업비 관리로
        </button>
      </div>

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">전체 사업수</div>
              <div className="text-2xl font-bold text-gray-800">{programs.length}<span className="text-sm font-normal text-gray-400 ml-1">개</span></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">전체 예산합계</div>
              <div className="text-lg font-bold text-blue-700">{formatKorean(totalBudget)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">전체 집행액</div>
              <div className="text-lg font-bold text-emerald-600">{formatKorean(totalExec)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">전체 평균 집행률</div>
              <div className="text-2xl font-bold" style={{ color: barColor(avgRate) }}>
                {avgRate.toFixed(1)}<span className="text-sm font-normal text-gray-400 ml-0.5">%</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 사업별 카드 그리드 (3열) */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-3">사업별 현황</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-3 w-24 mb-4" />
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {Array.from({ length: 3 }).map((_, j) => <Skeleton key={j} className="h-8" />)}
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((prog, idx) => {
              const budget = budgetByProgram[prog.id] || 0
              const exec = execByProgram[prog.id] || 0
              const remain = budget - exec
              const rate = budget > 0 ? (exec / budget * 100) : 0
              const color = PROGRAM_COLORS[idx % PROGRAM_COLORS.length]
              return (
                <div key={prog.id}
                  onClick={() => navigate('/budget')}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="font-semibold text-gray-800 text-sm">{prog.name}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 ml-4">
                        {prog.year}년{prog.manager ? ` · ${prog.manager}` : ''}
                      </div>
                    </div>
                    <span className="text-xs font-bold" style={{ color: barColor(rate) }}>{rate.toFixed(1)}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                      <div className="text-[10px] text-gray-400">총예산</div>
                      <div className="text-xs font-semibold text-gray-700">{formatKorean(budget)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400">집행액</div>
                      <div className="text-xs font-semibold text-emerald-600">{formatKorean(exec)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400">잔액</div>
                      <div className="text-xs font-semibold text-blue-600">{formatKorean(remain)}</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(rate, 100)}%`, background: barColor(rate) }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 관(level1)별 예산 현황 가로 막대 */}
      {!loading && level1Data.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">예산과목(관)별 예산 현황</h2>
          <div className="space-y-3">
            {level1Data.map((item, idx) => {
              const pct = (item.budget / maxL1Budget * 100)
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-32 text-xs text-gray-600 text-right flex-shrink-0 truncate">{item.name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div className="h-6 rounded-full flex items-center pl-2 transition-all"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        background: PROGRAM_COLORS[idx % PROGRAM_COLORS.length],
                        minWidth: '4px',
                      }}>
                      {pct > 15 && (
                        <span className="text-[10px] text-white font-medium whitespace-nowrap">{formatKorean(item.budget)}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-28 text-xs text-gray-500 text-right flex-shrink-0">{formatKorean(item.budget)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
