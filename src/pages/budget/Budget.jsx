import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, X, Check } from 'lucide-react'

const YEARS = [2024, 2025, 2026, 2027]
const CURRENT_YEAR = new Date().getFullYear()

const DEFAULT_BUDGET_ITEMS = [
  { l1: '인건비', l2: '인건비', l3: '인건비', l4: '전담인력 인건비', amount: 405700000 },
  { l1: '일반운영비', l2: '사무관리비', l3: '소모품비', l4: '소모품비 및 인쇄비', amount: 7000000 },
  { l1: '일반운영비', l2: '사무관리비', l3: '임차료', l4: '임차료 및 관리비', amount: 600000000 },
  { l1: '일반운영비', l2: '사무관리비', l3: '지급수수료', l4: '무인경비·회계감사비', amount: 19000000 },
  { l1: '일반운영비', l2: '사무관리비', l3: '회의비', l4: '회의비', amount: 3000000 },
  { l1: '일반운영비', l2: '사무관리비', l3: '광고선전비', l4: '광고선전비', amount: 20000000 },
  { l1: '일반운영비', l2: '사무관리비', l3: '강사수당', l4: '교육강사수당', amount: 20000000 },
  { l1: '일반운영비', l2: '사무관리비', l3: '멘토수당', l4: '멘토 수당', amount: 100000000 },
  { l1: '일반운영비', l2: '사무관리비', l3: '심사수당', l4: '심사참석 수당', amount: 10000000 },
  { l1: '일반운영비', l2: '공공운영비', l3: '공공요금', l4: '공공요금 및 제세공과금', amount: 7500000 },
  { l1: '일반운영비', l2: '행사운영비', l3: '행사운영비', l4: '울산스타트업 페스타', amount: 10000000 },
  { l1: '여비', l2: '국내여비', l3: '국내여비', l4: '국내여비', amount: 4800000 },
  { l1: '수선유지교체비', l2: '수선유지비', l3: '수선유지비', l4: '수선유지비', amount: 80000000 },
  { l1: '업무추진비', l2: '사업업무추진비', l3: '업무추진비', l4: '업무추진비', amount: 4000000 },
  { l1: '교육훈련비', l2: '교육훈련비', l3: '교육훈련비', l4: '교육훈련비', amount: 5000000 },
  { l1: '민간사업지원금', l2: '민간사업지원금', l3: '기술제품실증', l4: '기술제품 실증 및 개발지원', amount: 250000000 },
  { l1: '민간사업지원금', l2: '민간사업지원금', l3: '기술보호서비스', l4: '기술보호 및 경영전문서비스', amount: 50000000 },
  { l1: '민간사업지원금', l2: '민간사업지원금', l3: '마케팅지원', l4: '마케팅 지원', amount: 150000000 },
  { l1: '민간사업지원금', l2: '민간사업지원금', l3: '교육비지원', l4: '창업자 역량강화 교육비', amount: 80000000 },
  { l1: '민간사업지원금', l2: '민간사업지원금', l3: 'AI솔루션', l4: 'AI 솔루션 융합 지원', amount: 100000000 },
  { l1: '위탁운영비', l2: '위탁운영비', l3: '위탁운영비', l4: '위탁운영비', amount: 214000000 },
]

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
const formatAmount = (num) => (Number(num) || 0).toLocaleString('ko-KR')
const parseAmount = (str) => parseInt((str || '').replace(/,/g, '') || '0')

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

function rateColor(rate) {
  if (rate > 100) return '#ef4444'
  if (rate >= 81) return '#22c55e'
  if (rate >= 51) return '#f59e0b'
  return '#2E75B6'
}

function barColor(rate) {
  if (rate > 100) return '#ef4444'
  if (rate > 80) return '#10b981'
  if (rate > 50) return '#f59e0b'
  return '#3b82f6'
}

const PROGRAM_COLORS = ['#1d4ed8', '#059669', '#7c3aed', '#d97706', '#dc2626', '#0891b2']

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

function getNodeBudget(node) {
  if (node.level === 4) return Number(node.budgeted_amount) || 0
  return (node.children || []).reduce((s, c) => s + getNodeBudget(c), 0)
}

function getNodeExec(node, executions) {
  if (node.level === 4) return executions.filter(e => e.budget_item_id === node.id).reduce((s, e) => s + (Number(e.amount) || 0), 0)
  return (node.children || []).reduce((s, c) => s + getNodeExec(c, executions), 0)
}

function getNodeOriginal(node) {
  if (node.level === 4) return Number(node.original_amount) || 0
  return (node.children || []).reduce((s, c) => s + getNodeOriginal(c), 0)
}

async function createDefaultItems(programId, userId) {
  const l1Map = {}, l2Map = {}, l3Map = {}
  let l1O = 0, l2O = 0, l3O = 0, l4O = 0
  for (const item of DEFAULT_BUDGET_ITEMS) {
    if (!l1Map[item.l1]) {
      const { data } = await supabase.from('budget_items').insert({ program_id: programId, level: 1, parent_id: null, name: item.l1, budgeted_amount: 0, sort_order: l1O++ }).select().single()
      if (data) l1Map[item.l1] = data.id
    }
    const l2Key = `${item.l1}|${item.l2}`
    if (!l2Map[l2Key] && l1Map[item.l1]) {
      const { data } = await supabase.from('budget_items').insert({ program_id: programId, level: 2, parent_id: l1Map[item.l1], name: item.l2, budgeted_amount: 0, sort_order: l2O++ }).select().single()
      if (data) l2Map[l2Key] = data.id
    }
    const l3Key = `${item.l1}|${item.l2}|${item.l3}`
    if (!l3Map[l3Key] && l2Map[l2Key]) {
      const { data } = await supabase.from('budget_items').insert({ program_id: programId, level: 3, parent_id: l2Map[l2Key], name: item.l3, budgeted_amount: 0, sort_order: l3O++ }).select().single()
      if (data) l3Map[l3Key] = data.id
    }
    if (l3Map[l3Key]) {
      const { data: l4data } = await supabase.from('budget_items').insert({ program_id: programId, level: 4, parent_id: l3Map[l3Key], name: item.l4, budgeted_amount: item.amount, original_amount: item.amount, sort_order: l4O++ }).select().single()
      if (l4data) {
        const { error: hErr } = await supabase.from('budget_item_histories').insert({ budget_item_id: l4data.id, revision_type: '당초', revision_number: 0, previous_amount: null, new_amount: item.amount, reason: null })
        if (hErr) console.error('history insert error:', hErr.message)
      }
    }
  }
}

async function createItemsFromSelected(programId, selectedWithAmounts, allStdItems) {
  const stdMap = {}
  allStdItems.forEach(i => { stdMap[i.id] = i })
  const l1Map = {}, l2Map = {}, l3Map = {}
  let l1O = 0, l2O = 0, l3O = 0, l4O = 0
  for (const sel of selectedWithAmounts) {
    const l4std = stdMap[sel.id]
    if (!l4std) continue
    const l3std = stdMap[l4std.parent_id]
    const l2std = l3std ? stdMap[l3std.parent_id] : null
    const l1std = l2std ? stdMap[l2std.parent_id] : null
    if (l1std && !l1Map[l1std.id]) {
      const { data } = await supabase.from('budget_items').insert({ program_id: programId, level: 1, parent_id: null, name: l1std.name, budgeted_amount: 0, sort_order: l1O++ }).select().single()
      if (data) l1Map[l1std.id] = data.id
    }
    if (l2std && !l2Map[l2std.id]) {
      const { data } = await supabase.from('budget_items').insert({ program_id: programId, level: 2, parent_id: l1Map[l1std?.id] || null, name: l2std.name, budgeted_amount: 0, sort_order: l2O++ }).select().single()
      if (data) l2Map[l2std.id] = data.id
    }
    if (l3std && !l3Map[l3std.id]) {
      const { data } = await supabase.from('budget_items').insert({ program_id: programId, level: 3, parent_id: l2Map[l2std?.id] || null, name: l3std.name, budgeted_amount: 0, sort_order: l3O++ }).select().single()
      if (data) l3Map[l3std.id] = data.id
    }
    const amt = parseAmount(sel.amount) || 0
    const { data: l4data } = await supabase.from('budget_items').insert({ program_id: programId, level: 4, parent_id: l3Map[l3std?.id] || null, name: l4std.name, budgeted_amount: amt, original_amount: amt, sort_order: l4O++ }).select().single()
    if (l4data) {
      await supabase.from('budget_item_histories').insert({ budget_item_id: l4data.id, revision_type: '당초', revision_number: 0, previous_amount: null, new_amount: amt, reason: null })
    }
  }
}

// ─── AmountInput ──────────────────────────────────────────────────────────────
function AmountInput({ value, onChange, placeholder = '0', autoFocus = false }) {
  return (
    <div>
      <input
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={e => {
          const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '')
          const num = parseInt(raw || '0')
          onChange(num ? formatAmount(num) : '')
        }}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
      />
      {value && parseAmount(value) > 0 && (
        <p className="text-xs text-blue-600 mt-1 pl-1">{formatKorean(parseAmount(value))}</p>
      )}
    </div>
  )
}

// ─── Skeleton / CircleProgress ───────────────────────────────────────────────
function Skeleton({ className, style }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className || ''}`} style={style} />
}

function CircleProgress({ rate }) {
  const r = 26, circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(Math.max(rate, 0), 100) / 100)
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={barColor(rate)} strokeWidth="7"
        strokeDasharray={circ.toFixed(2)} strokeDashoffset={offset.toFixed(2)}
        strokeLinecap="round" transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
    </svg>
  )
}

// ─── StdManageRow ─────────────────────────────────────────────────────────────
function StdManageRow({ node, onDelete }) {
  const [open, setOpen] = useState(node.level <= 2)
  const hasChildren = node.children && node.children.length > 0
  const LEVEL_PL = { 1: 'pl-1', 2: 'pl-5', 3: 'pl-9', 4: 'pl-13' }
  const LEVEL_TEXT = { 1: 'font-bold text-sm text-gray-800', 2: 'font-semibold text-sm text-gray-700', 3: 'text-xs text-gray-600', 4: 'text-xs text-blue-700' }
  return (
    <>
      <div className={`flex items-center py-1.5 hover:bg-gray-50 rounded gap-1 ${LEVEL_PL[node.level]}`}>
        {hasChildren
          ? <button onClick={() => setOpen(o => !o)} className="text-gray-400 flex-shrink-0">{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</button>
          : <span className="w-4 flex-shrink-0" />}
        <span className={`flex-1 ${LEVEL_TEXT[node.level]}`}>{node.name}</span>
        <button onClick={() => onDelete(node.id)} className="text-red-300 hover:text-red-500 p-0.5 flex-shrink-0"><Trash2 size={11} /></button>
      </div>
      {open && hasChildren && node.children.map(c => <StdManageRow key={c.id} node={c} onDelete={onDelete} />)}
    </>
  )
}

// ─── StandardTreeRow ──────────────────────────────────────────────────────────
function StandardTreeRow({ node, checked, onToggle, existingNames }) {
  const [open, setOpen] = useState(node.level <= 2)
  const hasChildren = node.children && node.children.length > 0
  const isExisting = existingNames?.has(node.name)
  const isChecked = checked.has(node.id)
  const LEVEL_PL = { 1: 'pl-1', 2: 'pl-5', 3: 'pl-9', 4: 'pl-13' }
  const LEVEL_TEXT = { 1: 'font-bold text-sm text-gray-800', 2: 'font-semibold text-sm text-gray-700', 3: 'text-xs text-gray-600', 4: 'text-sm text-gray-700' }
  return (
    <>
      <div className={`flex items-center py-1.5 rounded gap-1 ${LEVEL_PL[node.level]} ${isExisting ? '' : 'hover:bg-gray-50'}`}>
        <input type="checkbox" checked={isChecked} disabled={isExisting}
          onChange={() => onToggle(node)}
          className="flex-shrink-0 accent-blue-600 cursor-pointer disabled:cursor-not-allowed" />
        {hasChildren
          ? <button onClick={() => setOpen(o => !o)} className="text-gray-400 flex-shrink-0">{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</button>
          : <span className="w-4 flex-shrink-0" />}
        <span className={`${LEVEL_TEXT[node.level]} ${isExisting ? 'text-gray-400 line-through' : ''}`}>
          {node.name}{isExisting && <span className="ml-1 text-[10px] text-gray-400 no-underline">(추가됨)</span>}
        </span>
      </div>
      {open && hasChildren && node.children.map(c => (
        <StandardTreeRow key={c.id} node={c} checked={checked} onToggle={onToggle} existingNames={existingNames} />
      ))}
    </>
  )
}

// ─── StandardItemSelectModal ──────────────────────────────────────────────────
function StandardItemSelectModal({ onClose, onConfirm, existingNames = new Set() }) {
  const [stdItems, setStdItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState(new Set())
  const [phase, setPhase] = useState('select')
  const [selectedWithAmounts, setSelectedWithAmounts] = useState([])

  useEffect(() => {
    supabase.from('budget_standard_items').select('*').order('sort_order')
      .then(({ data }) => { setStdItems(data || []); setLoading(false) })
  }, [])

  const stdMap = {}
  stdItems.forEach(i => { stdMap[i.id] = i })
  const treeData = buildTree(stdItems)

  const getDescIds = (nodeId) => {
    const ids = []
    const traverse = (id) => stdItems.filter(i => i.parent_id === id).forEach(c => { ids.push(c.id); traverse(c.id) })
    traverse(nodeId)
    return ids
  }
  const getAncIds = (itemId) => {
    const ids = []
    let cur = stdMap[itemId]
    while (cur?.parent_id) { ids.push(cur.parent_id); cur = stdMap[cur.parent_id] }
    return ids
  }

  const toggleCheck = (node) => {
    if (existingNames.has(node.name)) return
    const nc = new Set(checked)
    if (nc.has(node.id)) {
      nc.delete(node.id)
      getDescIds(node.id).forEach(id => nc.delete(id))
      getAncIds(node.id).forEach(aid => {
        if (!stdItems.filter(i => i.parent_id === aid).some(c => nc.has(c.id))) nc.delete(aid)
      })
    } else {
      nc.add(node.id)
      getDescIds(node.id).forEach(id => { if (!existingNames.has(stdMap[id]?.name)) nc.add(id) })
      getAncIds(node.id).forEach(id => nc.add(id))
    }
    setChecked(nc)
  }

  const goToAmount = () => {
    const level4 = stdItems.filter(i => i.level === 4 && checked.has(i.id))
    if (level4.length === 0) { alert('과목을 선택하세요.'); return }
    setSelectedWithAmounts(level4.map(i => ({ ...i, amount: '' })))
    setPhase('amount')
  }

  if (phase === 'amount') return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">예산액 입력</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {selectedWithAmounts.map((item, idx) => (
            <div key={item.id}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{item.name}</label>
              <AmountInput value={item.amount} placeholder="0 (나중에 수정 가능)"
                onChange={v => setSelectedWithAmounts(prev => prev.map((s, i) => i === idx ? { ...s, amount: v } : s))} />
            </div>
          ))}
        </div>
        <div className="flex justify-between gap-2 px-6 py-4 border-t flex-shrink-0">
          <button onClick={() => setPhase('select')} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">← 다시 선택</button>
          <button onClick={() => onConfirm(selectedWithAmounts, stdItems)}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#2E75B6' }}>
            선택 완료
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">표준과목 선택</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading
            ? <div className="text-center text-sm text-gray-400 py-8">로딩 중...</div>
            : treeData.length === 0
              ? <div className="text-center text-sm text-gray-400 py-8">표준과목이 없습니다.<br/><span className="text-xs">표준과목 관리에서 먼저 과목을 등록하세요.</span></div>
              : treeData.map(node => <StandardTreeRow key={node.id} node={node} checked={checked} onToggle={toggleCheck} existingNames={existingNames} />)}
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-t flex-shrink-0">
          <span className="text-xs text-gray-500">{stdItems.filter(i => i.level === 4 && checked.has(i.id)).length}개 선택됨</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={goToAmount} className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#2E75B6' }}>다음 →</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── StandardItemManageModal ──────────────────────────────────────────────────
function StandardItemManageModal({ onClose }) {
  const [stdItems, setStdItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingLevel, setAddingLevel] = useState(null)
  const [addingParentId, setAddingParentId] = useState('')
  const [addingName, setAddingName] = useState('')
  const [saving, setSaving] = useState(false)

  const loadItems = () => {
    supabase.from('budget_standard_items').select('*').order('sort_order')
      .then(({ data }) => { setStdItems(data || []); setLoading(false) })
  }
  useEffect(() => { loadItems() }, [])

  const treeData = buildTree(stdItems)

  const addItem = async () => {
    if (!addingName.trim()) { alert('과목명을 입력하세요.'); return }
    if (addingLevel > 1 && !addingParentId) { alert('상위 과목을 선택하세요.'); return }
    setSaving(true)
    const sortOrder = stdItems.filter(i => i.parent_id === (addingParentId || null) && i.level === addingLevel).length
    await supabase.from('budget_standard_items').insert({ level: addingLevel, parent_id: addingParentId || null, name: addingName.trim(), sort_order: sortOrder })
    setAddingLevel(null); setAddingParentId(''); setAddingName('')
    setSaving(false); loadItems()
  }

  const deleteItem = async (id) => {
    if (!window.confirm('이 과목과 하위 과목이 모두 삭제됩니다. 계속하시겠습니까?')) return
    const getAllDescIds = (pid) => {
      const ids = [pid]
      stdItems.filter(i => i.parent_id === pid).forEach(c => ids.push(...getAllDescIds(c.id)))
      return ids
    }
    await supabase.from('budget_standard_items').delete().in('id', getAllDescIds(id))
    loadItems()
  }

  const parents = addingLevel > 1 ? stdItems.filter(i => i.level === addingLevel - 1) : []

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-800">표준과목 관리</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-3 border-b flex-shrink-0 bg-gray-50">
          {addingLevel === null ? (
            <div className="flex gap-2 flex-wrap">
              {[{ v: 1, l: '관(款)' }, { v: 2, l: '항(項)' }, { v: 3, l: '세항' }, { v: 4, l: '목(目)' }].map(({ v, l }) => (
                <button key={v} onClick={() => { setAddingLevel(v); setAddingParentId(''); setAddingName('') }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#2E75B6' }}>
                  <Plus size={11} /> {l} 추가
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-600">{['관(款)', '항(項)', '세항', '목(目)'][addingLevel - 1]} 추가</span>
                <button onClick={() => setAddingLevel(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
              {addingLevel > 1 && (
                <select value={addingParentId} onChange={e => setAddingParentId(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white outline-none focus:border-blue-400">
                  <option value="">-- 상위 과목 선택 --</option>
                  {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <div className="flex gap-2">
                <input value={addingName} onChange={e => setAddingName(e.target.value)} placeholder="과목명 입력"
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-400" />
                <button onClick={addItem} disabled={saving}
                  className="px-3 py-1.5 text-xs font-semibold text-white rounded disabled:opacity-60" style={{ background: '#2E75B6' }}>저장</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading
            ? <div className="text-center text-sm text-gray-400 py-8">로딩 중...</div>
            : treeData.length === 0
              ? <div className="text-center text-sm text-gray-400 py-8">등록된 표준과목이 없습니다.</div>
              : treeData.map(node => <StdManageRow key={node.id} node={node} onDelete={deleteItem} />)}
        </div>
        <div className="flex justify-end px-6 py-4 border-t flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>
        </div>
      </div>
    </div>
  )
}

// ─── ProgramModal ─────────────────────────────────────────────────────────────
function ProgramModal({ onClose, onSave, userId }) {
  const [form, setForm] = useState({ name: '', year: String(CURRENT_YEAR), manager: '', memo: '', total_budget: '' })
  const [showStdSelect, setShowStdSelect] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const [allStdItems, setAllStdItems] = useState([])
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name.trim()) { alert('사업명을 입력하세요.'); return }
    setSaving(true)
    const { data, error } = await supabase.from('budget_programs').insert({
      name: form.name.trim(), year: Number(form.year),
      manager: form.manager.trim() || null, memo: form.memo.trim() || null,
      total_budget: parseAmount(form.total_budget),
    }).select().single()
    if (error) { alert('저장 실패: ' + error.message); setSaving(false); return }
    if (selectedItems.length > 0) await createItemsFromSelected(data.id, selectedItems, allStdItems)
    setSaving(false); onSave()
  }

  const handleStdConfirm = (items, allItems) => {
    setSelectedItems(items); setAllStdItems(allItems); setShowStdSelect(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-800">사업 등록</h2>
            <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">사업명 *</label>
              <input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))}
                placeholder="예: 울산 창업 U-시리즈"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">연도</label>
                <select value={form.year} onChange={e => setForm(v => ({ ...v, year: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-400">
                  {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">담당자</label>
                <input value={form.manager} onChange={e => setForm(v => ({ ...v, manager: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">총 예산</label>
              <AmountInput value={form.total_budget} onChange={v => setForm(f => ({ ...f, total_budget: v }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">메모</label>
              <input value={form.memo} onChange={e => setForm(v => ({ ...v, memo: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500">예산 과목 선택</label>
                <button onClick={() => setShowStdSelect(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#2E75B6' }}>
                  <Plus size={11} /> 표준과목에서 선택
                </button>
              </div>
              {selectedItems.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-xs text-gray-400">
                  표준과목에서 예산 과목을 선택하세요
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg divide-y max-h-48 overflow-y-auto">
                  {selectedItems.map((item, idx) => (
                    <div key={item.id} className="px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-700">{item.name}</span>
                        <button onClick={() => setSelectedItems(prev => prev.filter(s => s.id !== item.id))}
                          className="text-red-300 hover:text-red-500 p-0.5"><X size={12} /></button>
                      </div>
                      <AmountInput value={item.amount} placeholder="0 (나중에 수정 가능)"
                        onChange={v => setSelectedItems(prev => prev.map((s, i) => i === idx ? { ...s, amount: v } : s))} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60" style={{ background: '#2E75B6' }}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
      {showStdSelect && <StandardItemSelectModal onClose={() => setShowStdSelect(false)} onConfirm={handleStdConfirm} />}
    </>
  )
}

// ─── ItemAddModal ─────────────────────────────────────────────────────────────
function ItemAddModal({ programId, items, userId, onClose, onSave }) {
  const [mode, setMode] = useState(null) // null | 'direct' | 'standard'
  const [level, setLevel] = useState(4)
  const [parentId, setParentId] = useState('')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const existingNames = new Set(items.map(i => i.name))
  const parents = items.filter(i => i.level === level - 1)

  if (mode === null) return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">과목 추가</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-8 space-y-3">
          <button onClick={() => setMode('standard')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: '#2E75B6' }}>
            <Plus size={15} /> 표준과목에서 선택
          </button>
          <button onClick={() => setMode('direct')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50">
            직접 입력
          </button>
        </div>
      </div>
    </div>
  )

  if (mode === 'standard') return (
    <StandardItemSelectModal
      onClose={onClose}
      existingNames={existingNames}
      onConfirm={async (selectedItems, allStdItems) => {
        await createItemsFromSelected(programId, selectedItems, allStdItems)
        onSave()
      }}
    />
  )

  const save = async () => {
    if (!name.trim()) { alert('과목명을 입력하세요.'); return }
    if (level > 1 && !parentId) { alert('상위 과목을 선택하세요.'); return }
    setSaving(true)
    const sortOrder = items.filter(i => i.parent_id === (parentId || null) && i.level === level).length
    const amt = level === 4 ? parseAmount(amount) : 0
    const { data: newItem, error } = await supabase.from('budget_items').insert({
      program_id: programId, level, parent_id: parentId || null,
      name: name.trim(), budgeted_amount: amt,
      ...(level === 4 ? { original_amount: amt } : {}),
      sort_order: sortOrder,
    }).select().single()
    if (error) { alert('저장 실패: ' + error.message); setSaving(false); return }
    if (newItem && level === 4) {
      await supabase.from('budget_item_histories').insert({
        budget_item_id: newItem.id, revision_type: '당초', revision_number: 0,
        previous_amount: null, new_amount: amt, reason: null,
      })
    }
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">과목 추가</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">단계 선택</label>
            <div className="flex gap-4">
              {[{ v: 1, l: '관(款)' }, { v: 2, l: '항(項)' }, { v: 3, l: '세항' }, { v: 4, l: '목(目)' }].map(({ v, l }) => (
                <label key={v} className="flex items-center gap-1 text-sm cursor-pointer">
                  <input type="radio" value={v} checked={level === v}
                    onChange={() => { setLevel(v); setParentId('') }} className="accent-blue-600" />
                  {l}
                </label>
              ))}
            </div>
          </div>
          {level > 1 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">상위 과목 *</label>
              <select value={parentId} onChange={e => setParentId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-400">
                <option value="">-- 선택 --</option>
                {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">과목명 *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>
          {level === 4 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">예산액</label>
              <AmountInput value={amount} onChange={setAmount} />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ background: '#2E75B6' }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ExecAddModal ─────────────────────────────────────────────────────────────
function ExecAddModal({ programId, items, defaultItemId, onClose, onSave }) {
  const [form, setForm] = useState({
    budget_item_id: defaultItemId || '',
    execution_date: new Date().toISOString().slice(0, 10),
    amount: '', note: '',
  })
  const [saving, setSaving] = useState(false)
  const leafItems = items.filter(i => i.level === 4)

  const save = async () => {
    if (!form.budget_item_id) { alert('과목을 선택하세요.'); return }
    if (parseAmount(form.amount) <= 0) { alert('금액을 입력하세요.'); return }
    setSaving(true)
    const { error } = await supabase.from('budget_executions').insert({
      program_id: programId, budget_item_id: form.budget_item_id,
      execution_date: form.execution_date, amount: parseAmount(form.amount),
      note: form.note.trim() || null,
    })
    if (error) { alert('저장 실패: ' + error.message); setSaving(false); return }
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">집행 추가</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">과목 (목) *</label>
            <select value={form.budget_item_id} onChange={e => setForm(v => ({ ...v, budget_item_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-400">
              <option value="">-- 선택 --</option>
              {leafItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">집행일 *</label>
            <input type="date" value={form.execution_date} onChange={e => setForm(v => ({ ...v, execution_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">금액 *</label>
            <AmountInput value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">적요</label>
            <input value={form.note} onChange={e => setForm(v => ({ ...v, note: e.target.value }))}
              placeholder="내역 설명"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ background: '#2E75B6' }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── RevisionModal ────────────────────────────────────────────────────────────
function RevisionModal({ item, userId, onClose, onSave }) {
  const [histories, setHistories] = useState([])
  const [newAmount, setNewAmount] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('budget_item_histories').select('*').eq('budget_item_id', item.id).order('revision_number')
      .then(({ data }) => { setHistories(data || []); setLoading(false) })
  }, [item.id])

  const nextRevNum = (item.revision_count || 0) + 1
  const nextRevType = `추경${nextRevNum}`

  const save = async () => {
    const amt = parseAmount(newAmount)
    if (amt <= 0) { alert('변경 후 예산액을 입력하세요.'); return }
    setSaving(true)
    const { error: hErr } = await supabase.from('budget_item_histories').insert({
      budget_item_id: item.id, revision_type: nextRevType, revision_number: nextRevNum,
      previous_amount: Number(item.budgeted_amount) || 0, new_amount: amt,
      reason: reason.trim() || null,
    })
    if (hErr) { alert('저장 실패: ' + hErr.message); setSaving(false); return }
    const { error: uErr } = await supabase.from('budget_items').update({ budgeted_amount: amt, revision_count: nextRevNum }).eq('id', item.id)
    if (uErr) { alert('저장 실패: ' + uErr.message); setSaving(false); return }
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">추경 — {item.name}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-4">로딩 중...</div>
          ) : (
            <>
              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-2 py-2 text-left text-gray-500 font-semibold">구분</th>
                    <th className="px-2 py-2 text-right text-gray-500 font-semibold">예산액</th>
                    <th className="px-2 py-2 text-left text-gray-500 font-semibold">변경일</th>
                    <th className="px-2 py-2 text-left text-gray-500 font-semibold">사유</th>
                  </tr>
                </thead>
                <tbody>
                  {histories.length === 0
                    ? <tr><td colSpan={4} className="px-2 py-3 text-center text-gray-400">이력 없음</td></tr>
                    : histories.map(h => (
                      <tr key={h.id} className="border-t border-gray-100">
                        <td className="px-2 py-2 font-semibold text-gray-700">{h.revision_type}</td>
                        <td className="px-2 py-2 text-right text-gray-800">{formatAmount(h.new_amount)}</td>
                        <td className="px-2 py-2 text-gray-500">{h.created_at ? h.created_at.slice(0, 10) : '-'}</td>
                        <td className="px-2 py-2 text-gray-500">{h.reason || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <hr className="my-4 border-gray-200" />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 w-24 flex-shrink-0">구분</span>
                  <span className="font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">{nextRevType}</span>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex gap-6 text-xs">
                  <div>
                    <span className="text-gray-400">당초금액</span>
                    <span className="ml-2 font-semibold text-gray-700">
                      {formatAmount(histories.find(h => h.revision_number === 0)?.new_amount ?? 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">현재금액</span>
                    <span className="ml-2 font-semibold text-blue-700">
                      {formatAmount(Number(item.budgeted_amount) || 0)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">변경 후 예산액 *</label>
                  <AmountInput value={newAmount} onChange={setNewAmount} autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">사유</label>
                  <input value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="변경 사유를 입력하세요"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400" />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
          <button onClick={save} disabled={saving || loading}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ background: '#d97706' }}>
            {saving ? '저장 중...' : '추경 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── HistoryModal ─────────────────────────────────────────────────────────────
function HistoryModal({ item, onClose, onSave }) {
  const [histories, setHistories] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editReason, setEditReason] = useState('')
  const [saving, setSaving] = useState(false)

  const loadHistories = () => {
    supabase.from('budget_item_histories').select('*').eq('budget_item_id', item.id).order('revision_number')
      .then(({ data }) => { setHistories(data || []); setLoading(false) })
  }

  useEffect(() => { loadHistories() }, [item.id])

  const startEdit = (h) => {
    setEditingId(h.id)
    setEditAmount(h.new_amount ? formatAmount(h.new_amount) : '')
    setEditReason(h.reason || '')
  }
  const cancelEdit = () => { setEditingId(null); setEditAmount(''); setEditReason('') }

  const saveEdit = async (h) => {
    const amt = parseAmount(editAmount)
    if (amt <= 0) { alert('금액을 입력하세요.'); return }
    setSaving(true)
    const { error } = await supabase.from('budget_item_histories')
      .update({ new_amount: amt, reason: editReason.trim() || null }).eq('id', h.id)
    if (error) { alert('저장 실패: ' + error.message); setSaving(false); return }
    const updatedHistories = histories.map(r => r.id === h.id ? { ...r, new_amount: amt } : r)
    const latest = [...updatedHistories].sort((a, b) => b.revision_number - a.revision_number)[0]
    await supabase.from('budget_items').update({ budgeted_amount: latest.new_amount }).eq('id', item.id)
    setSaving(false); setEditingId(null)
    loadHistories()
    if (onSave) onSave()
  }

  const deleteHistory = async (h) => {
    if (!window.confirm('이 추경 이력을 삭제하시겠습니까?')) return
    const { error } = await supabase.from('budget_item_histories').delete().eq('id', h.id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    const remaining = histories.filter(r => r.id !== h.id)
    const revisionHistories = remaining.filter(r => r.revision_number > 0)
    const latest = [...remaining].sort((a, b) => b.revision_number - a.revision_number)[0]
    const newBudget = latest ? Number(latest.new_amount) : null
    const { data: itemData } = await supabase.from('budget_items').select('original_amount').eq('id', item.id).single()
    await supabase.from('budget_items').update({
      budgeted_amount: newBudget ?? (Number(itemData?.original_amount) || 0),
      revision_count: revisionHistories.length,
    }).eq('id', item.id)
    loadHistories()
    if (onSave) onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">예산 이력 — {item.name}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-4">
          {loading ? (
            <div className="text-center text-sm text-gray-400 py-4">로딩 중...</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-2 py-2 text-left text-gray-500 font-semibold">구분</th>
                  <th className="px-2 py-2 text-right text-gray-500 font-semibold">예산액</th>
                  <th className="px-2 py-2 text-right text-gray-500 font-semibold">증감</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-semibold">변경일</th>
                  <th className="px-2 py-2 text-left text-gray-500 font-semibold">사유</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {histories.length === 0
                  ? <tr><td colSpan={6} className="px-2 py-3 text-center text-gray-400">이력 없음</td></tr>
                  : histories.map(h => {
                    const isEditing = editingId === h.id
                    const diff = h.revision_number === 0 ? null : (Number(h.new_amount) || 0) - (Number(h.previous_amount) || 0)
                    return (
                      <tr key={h.id} className="border-t border-gray-100">
                        <td className="px-2 py-2 font-semibold text-gray-700 whitespace-nowrap">{h.revision_type}</td>
                        <td className="px-2 py-2 text-right text-gray-800">
                          {isEditing ? (
                            <div className="flex flex-col items-end">
                              <input type="text" value={editAmount} autoFocus
                                onChange={e => {
                                  const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '')
                                  setEditAmount(parseInt(raw || '0') ? formatAmount(parseInt(raw)) : '')
                                }}
                                className="w-28 border border-blue-400 rounded px-1 py-0.5 text-xs text-right outline-none" />
                              {parseAmount(editAmount) > 0 && (
                                <span className="text-[10px] text-blue-500 mt-0.5">{formatKorean(parseAmount(editAmount))}</span>
                              )}
                            </div>
                          ) : formatAmount(h.new_amount)}
                        </td>
                        <td className={`px-2 py-2 text-right font-semibold whitespace-nowrap ${diff === null ? 'text-gray-300' : diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {diff === null ? '-' : (diff >= 0 ? '+' : '') + formatAmount(diff)}
                        </td>
                        <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{h.created_at ? h.created_at.slice(0, 10) : '-'}</td>
                        <td className="px-2 py-2 text-gray-500">
                          {isEditing ? (
                            <input type="text" value={editReason} onChange={e => setEditReason(e.target.value)}
                              placeholder="사유"
                              className="w-full border border-blue-400 rounded px-1 py-0.5 text-xs outline-none" />
                          ) : (h.reason || '-')}
                        </td>
                        <td className="px-1 py-2 text-center">
                          {h.revision_number > 0 && (
                            isEditing ? (
                              <div className="flex gap-0.5 justify-center">
                                <button onClick={() => saveEdit(h)} disabled={saving} className="text-green-500 hover:text-green-700 p-0.5"><Check size={12} /></button>
                                <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 p-0.5"><X size={12} /></button>
                              </div>
                            ) : (
                              <div className="flex gap-0.5 justify-center">
                                <button onClick={() => startEdit(h)}
                                  className="px-1 py-0.5 text-[10px] font-semibold rounded bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors">
                                  수정
                                </button>
                                <button onClick={() => deleteHistory(h)}
                                  className="px-1 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-500 hover:bg-red-200 transition-colors">
                                  삭제
                                </button>
                              </div>
                            )
                          )}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>
        </div>
      </div>
    </div>
  )
}

// ─── TreeRow ──────────────────────────────────────────────────────────────────
const LEVEL_STYLE = {
  1: { bg: '#1e3a5f', color: 'white', fontWeight: 700, fontSize: 12, pl: 16 },
  2: { bg: '#dbeafe', color: '#1a56db', fontWeight: 600, fontSize: 12, pl: 28 },
  3: { bg: '#f8fafc', color: '#4b5563', fontWeight: 500, fontSize: 11, pl: 40 },
  4: { bg: 'white', color: '#374151', fontWeight: 400, fontSize: 13, pl: 52 },
}

function TreeRow({ node, executions, selectedItem, onSelect, editingId, editingValue, onStartEdit, onEditChange, onSaveEdit, onCancelEdit, canEdit, onRevise, onHistory }) {
  const [open, setOpen] = useState(node.level <= 2)
  const hasChildren = node.children && node.children.length > 0
  const budget = getNodeBudget(node)
  const original = getNodeOriginal(node)
  const exec = getNodeExec(node, executions)
  const remain = budget - exec
  const rate = budget > 0 ? (exec / budget) * 100 : 0
  const isSelected = selectedItem?.id === node.id
  const isEditing = editingId === node.id
  const s = LEVEL_STYLE[node.level]
  const rowBg = node.level === 4 && isSelected ? '#eff6ff' : s.bg
  const isLight = node.level === 1

  return (
    <>
      <div style={{ background: rowBg, borderBottom: '1px solid #e8edf4', minHeight: 36, transition: 'background 0.1s' }}
        className={`flex items-center ${node.level === 4 && !isSelected ? 'hover:!bg-[#f0f7ff]' : ''}`}
        onClick={() => { if (hasChildren) setOpen(o => !o); if (node.level === 4) onSelect(node) }}>

        {/* 과목명 */}
        <div className="flex items-center gap-1 flex-1 min-w-0 py-2" style={{ paddingLeft: s.pl, cursor: node.level === 4 || hasChildren ? 'pointer' : 'default' }}>
          <span className="flex-shrink-0 w-4 flex items-center" style={{ color: isLight ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>
            {hasChildren ? (open ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : null}
          </span>
          <span className="truncate" style={{ color: s.color, fontWeight: s.fontWeight, fontSize: s.fontSize }}>{node.name}</span>
          {node.level === 4 && node.revision_count > 0 && (
            <span style={{ background: '#fef3c7', color: '#92400e', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 9999, flexShrink: 0 }}>추경{node.revision_count}</span>
          )}
        </div>

        {/* 당초예산 */}
        <div style={{ width: 88, flexShrink: 0, textAlign: 'right', paddingRight: 8, fontSize: 11, color: isLight ? 'rgba(255,255,255,0.55)' : '#9ca3af' }}>
          {node.level === 4 ? (original > 0 ? formatAmount(original) : '-') : '-'}
        </div>

        {/* 현재예산 */}
        <div style={{ width: 96, flexShrink: 0, textAlign: 'right', paddingRight: 8 }}>
          {isEditing ? (
            <div className="flex items-center gap-0.5 justify-end" onClick={e => e.stopPropagation()}>
              <input type="text" value={editingValue} autoFocus
                onChange={e => { const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, ''); onEditChange(parseInt(raw || '0') ? formatAmount(parseInt(raw)) : '') }}
                onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit() }}
                className="w-20 border border-blue-400 rounded px-1 py-0.5 text-xs text-right outline-none" />
              <button onClick={e => { e.stopPropagation(); onSaveEdit() }} className="text-green-500 hover:text-green-700 p-0.5"><Check size={11} /></button>
              <button onClick={e => { e.stopPropagation(); onCancelEdit() }} className="text-gray-400 hover:text-gray-600 p-0.5"><X size={11} /></button>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: isLight ? 'rgba(255,255,255,0.9)' : '#374151', fontWeight: node.level <= 2 ? 600 : 400 }}>
              {budget > 0 ? formatAmount(budget) : '-'}
            </span>
          )}
        </div>

        {/* 집행액 */}
        <div style={{ width: 88, flexShrink: 0, textAlign: 'right', paddingRight: 8, fontSize: 11, color: isLight ? 'rgba(255,255,255,0.9)' : exec > 0 ? '#059669' : '#d1d5db', fontWeight: exec > 0 ? 600 : 400 }}>
          {exec > 0 ? formatAmount(exec) : '-'}
        </div>

        {/* 잔액 */}
        <div style={{ width: 80, flexShrink: 0, textAlign: 'right', paddingRight: 8, fontSize: 11, fontWeight: remain < 0 ? 600 : 400, color: remain < 0 ? '#dc2626' : isLight ? 'rgba(255,255,255,0.9)' : '#374151' }}>
          {budget > 0 ? formatAmount(remain) : '-'}
        </div>

        {/* 집행률 bar */}
        <div style={{ width: 136, flexShrink: 0, paddingRight: 12 }}>
          {budget > 0 ? (
            <div className="flex items-center gap-2">
              <div style={{ flex: 1, height: 5, background: isLight ? 'rgba(255,255,255,0.2)' : '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(rate, 100)}%`, height: '100%', background: isLight ? 'rgba(255,255,255,0.7)' : barColor(rate), borderRadius: 9999, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: isLight ? 'rgba(255,255,255,0.9)' : barColor(rate), width: 28, textAlign: 'right', flexShrink: 0 }}>
                {rate.toFixed(0)}%
              </span>
            </div>
          ) : <span style={{ fontSize: 10, color: '#d1d5db' }}>-</span>}
        </div>

        {/* 액션 */}
        <div style={{ width: 76, flexShrink: 0, paddingRight: 8 }} className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
          {canEdit && node.level === 4 && !isEditing && (
            <>
              <button onClick={() => onStartEdit(node)} className="p-1 text-gray-300 hover:text-blue-500 transition-colors"><Pencil size={10} /></button>
              <button onClick={e => { e.stopPropagation(); onRevise(node) }}
                style={{ background: '#fef3c7', color: '#92400e', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}
                className="hover:opacity-80 transition-opacity">추경</button>
              <button onClick={e => { e.stopPropagation(); onHistory(node) }}
                style={{ background: '#f1f5f9', color: '#475569', fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}
                className="hover:opacity-80 transition-opacity">이력</button>
            </>
          )}
        </div>
      </div>

      {isEditing && parseAmount(editingValue) > 0 && (
        <div style={{ background: '#eff6ff', borderBottom: '1px solid #e8edf4', padding: '2px 12px', textAlign: 'right', fontSize: 10, color: '#1d4ed8' }}>
          {formatKorean(parseAmount(editingValue))}
        </div>
      )}

      {open && hasChildren && node.children.map(child => (
        <TreeRow key={child.id} node={child} executions={executions} selectedItem={selectedItem} onSelect={onSelect}
          editingId={editingId} editingValue={editingValue}
          onStartEdit={onStartEdit} onEditChange={onEditChange} onSaveEdit={onSaveEdit} onCancelEdit={onCancelEdit}
          canEdit={canEdit} onRevise={onRevise} onHistory={onHistory} />
      ))}
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Budget() {
  const { profile, user } = useAuth()
  const canEdit = profile?.role !== 'viewer'
  const canManageStandard = profile?.role === 'master' || profile?.role === 'admin'
  const userId = user?.id

  const [activeTab, setActiveTab] = useState('programs')
  const [filterYear, setFilterYear] = useState(String(CURRENT_YEAR))
  const [programs, setPrograms] = useState([])
  const [execTotals, setExecTotals] = useState({})
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [items, setItems] = useState([])
  const [executions, setExecutions] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [loading, setLoading] = useState({ programs: true, items: false, exec: false })
  const [showProgramModal, setShowProgramModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showExecModal, setShowExecModal] = useState(false)
  const [revisionTarget, setRevisionTarget] = useState(null)
  const [historyTarget, setHistoryTarget] = useState(null)
  const [showStandardManage, setShowStandardManage] = useState(false)

  const fetchPrograms = useCallback(async () => {
    setLoading(l => ({ ...l, programs: true }))
    let q = supabase.from('budget_programs').select('*').order('year', { ascending: false }).order('created_at', { ascending: false })
    if (filterYear) q = q.eq('year', Number(filterYear))
    const { data } = await q
    setPrograms(data || [])
    {
      const { data: execs } = await supabase.from('budget_executions').select('program_id, amount').limit(100000)
      const totals = {}
      execs?.forEach(e => { totals[e.program_id] = (totals[e.program_id] || 0) + Number(e.amount) })
      setExecTotals(totals)
    }
    setLoading(l => ({ ...l, programs: false }))
  }, [filterYear])

  const fetchItems = useCallback(async (programId) => {
    setLoading(l => ({ ...l, items: true }))
    const { data } = await supabase.from('budget_items').select('*').eq('program_id', programId).order('sort_order')
    setItems(data || [])
    setLoading(l => ({ ...l, items: false }))
  }, [])

  const fetchExecutions = useCallback(async (programId) => {
    setLoading(l => ({ ...l, exec: true }))
    const { data } = await supabase.from('budget_executions').select('*').eq('program_id', programId).order('execution_date', { ascending: false })
    setExecutions(data || [])
    setLoading(l => ({ ...l, exec: false }))
  }, [])

  useEffect(() => { fetchPrograms() }, [fetchPrograms])

  const ensureInitialHistories = async (programId) => {
    const { data: l4items } = await supabase.from('budget_items')
      .select('id, budgeted_amount').eq('program_id', programId).eq('level', 4)
    if (!l4items || l4items.length === 0) return
    const { data: existingHistories } = await supabase.from('budget_item_histories')
      .select('budget_item_id').in('budget_item_id', l4items.map(i => i.id)).eq('revision_number', 0)
    const existingIds = new Set((existingHistories || []).map(h => h.budget_item_id))
    const missing = l4items.filter(i => !existingIds.has(i.id))
    if (missing.length === 0) return
    await supabase.from('budget_item_histories').insert(
      missing.map(i => ({ budget_item_id: i.id, revision_type: '당초', revision_number: 0, previous_amount: null, new_amount: Number(i.budgeted_amount) || 0, reason: null }))
    )
  }

  const selectProgram = (p) => {
    setSelectedProgram(p); setSelectedItem(null)
    setItems([]); setExecutions([])
    fetchItems(p.id); fetchExecutions(p.id)
    ensureInitialHistories(p.id)
    setActiveTab('tree')
  }

  const deleteProgram = async (p) => {
    await supabase.from('budget_programs').delete().eq('id', p.id)
    if (selectedProgram?.id === p.id) { setSelectedProgram(null); setItems([]); setExecutions([]); setSelectedItem(null) }
    fetchPrograms()
  }

  const deleteExecution = async (id) => {
    await supabase.from('budget_executions').delete().eq('id', id)
    fetchExecutions(selectedProgram.id)
    fetchPrograms()
  }

  const saveInlineBudget = async () => {
    if (!editingId) return
    const newAmount = parseAmount(editingValue)
    await supabase.from('budget_items').update({ budgeted_amount: newAmount }).eq('id', editingId)
    if (selectedItem?.id === editingId) setSelectedItem(prev => prev ? { ...prev, budgeted_amount: newAmount } : prev)
    setEditingId(null); setEditingValue('')
    fetchItems(selectedProgram.id)
  }

  const treeData = buildTree(items)
  const leafItems = items.filter(i => i.level === 4)
  // 선택된 사업의 tree panel용
  const totalBudget = leafItems.reduce((s, i) => s + (Number(i.budgeted_amount) || 0), 0)
  const totalExec = executions.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const selectedExecs = selectedItem ? executions.filter(e => e.budget_item_id === selectedItem.id) : []
  const selBudget = Number(selectedItem?.budgeted_amount) || 0
  const selExec = selectedExecs.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const selRemain = selBudget - selExec
  const selRate = selBudget > 0 ? selExec / selBudget * 100 : 0

  // ── KPI 계산 ──────────────────────────────────────────────────────────────────
  // 선택된 사업: level4 budgeted_amount 합계 / executions amount 합계
  // 전체 보기: programs total_budget 합계 / execTotals 합계
  const kpiLoading = selectedProgram ? (loading.items || loading.exec) : loading.programs
  const kpiTotalBudget = selectedProgram
    ? leafItems.reduce((s, i) => s + (Number(i.budgeted_amount) || 0), 0)
    : programs.reduce((s, p) => s + (Number(p.total_budget) || 0), 0)
  const kpiTotalExec = selectedProgram
    ? executions.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    : programs.reduce((s, p) => s + (execTotals[p.id] || 0), 0)
  const kpiRemain = kpiTotalBudget - kpiTotalExec
  const kpiRate = kpiTotalBudget > 0 ? (kpiTotalExec / kpiTotalBudget * 100) : 0

  const ReceiptIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
      <path d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
    </svg>
  )

  return (
    <>
      <div className="flex flex-col bg-slate-50" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

        {/* 헤더 */}
        <div className="bg-white border-b px-6 py-3 flex-shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">사업비 관리</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedProgram ? selectedProgram.name : '전체 사업'} · 예산 현황
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-blue-400">
              <option value="">전체 연도</option>
              {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            {canManageStandard && (
              <button onClick={() => setShowStandardManage(true)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                표준과목 관리
              </button>
            )}
          </div>
        </div>

        {/* 사업 카드 (수평 스크롤) */}
        <div className="flex-shrink-0 bg-white border-b px-4 py-3">
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {loading.programs ? (
              [1, 2, 3].map(i => <Skeleton key={i} style={{ width: 220, height: 96, flexShrink: 0 }} />)
            ) : (
              <>
                {programs.map((p, idx) => {
                  const pExec = execTotals[p.id] || 0
                  const pRate = p.total_budget > 0 ? Math.min(pExec / p.total_budget * 100, 100) : 0
                  const isActive = selectedProgram?.id === p.id
                  const color = PROGRAM_COLORS[idx % PROGRAM_COLORS.length]
                  return (
                    <div key={p.id} onClick={() => selectProgram(p)}
                      className="flex-shrink-0 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md"
                      style={{ width: 220, borderColor: isActive ? color : '#e5e7eb', background: isActive ? `${color}10` : 'white' }}>
                      <div className="h-1.5 rounded-t-xl" style={{ background: color }} />
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-semibold text-sm text-gray-800 leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                          {canEdit && (
                            <button onClick={e => { e.stopPropagation(); deleteProgram(p) }}
                              className="flex-shrink-0 p-0.5 text-red-300 hover:text-red-500 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{p.year}년 · {p.manager || '-'}</div>
                        {p.total_budget > 0 && (
                          <>
                            <div className="text-xs font-semibold mt-1" style={{ color }}>{formatKorean(p.total_budget)}</div>
                            <div className="mt-1.5">
                              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                <span>집행률</span>
                                <span style={{ color: barColor(pRate) }}>{pRate.toFixed(1)}%</span>
                              </div>
                              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pRate}%`, background: barColor(pRate) }} />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
                {canEdit && (
                  <div onClick={() => setShowProgramModal(true)}
                    className="flex-shrink-0 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
                    style={{ width: 130, minHeight: 96 }}>
                    <Plus size={20} className="text-gray-400" />
                    <span className="text-xs text-gray-400 font-medium">사업 등록</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* KPI 카드 */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2 grid grid-cols-4 gap-3">
          {[
            { label: '총예산', value: formatKorean(kpiTotalBudget), sub: '현재 예산 기준', color: '#1d4ed8', bg: '#eff6ff' },
            { label: '총집행액', value: formatKorean(kpiTotalExec), sub: `${kpiRate.toFixed(1)}% 집행`, color: '#059669', bg: '#ecfdf5' },
            { label: '잔액', value: formatKorean(kpiRemain), sub: kpiRemain < 0 ? '예산 초과!' : '남은 예산', color: kpiRemain < 0 ? '#ef4444' : '#374151', bg: 'white' },
          ].map(({ label, value, sub, color, bg }) => (
            <div key={label} className="rounded-xl border shadow-sm p-4 flex flex-col gap-1" style={{ background: bg }}>
              <div className="text-xs font-semibold text-gray-500">{label}</div>
              {kpiLoading
                ? <Skeleton style={{ height: 28, width: '70%', marginTop: 2 }} />
                : <div className="text-lg font-bold" style={{ color }}>{value}</div>
              }
              <div className="text-[11px] text-gray-400">{sub}</div>
            </div>
          ))}
          <div className="rounded-xl border shadow-sm p-4 flex items-center gap-3 bg-white">
            {kpiLoading ? <Skeleton style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0 }} /> : <CircleProgress rate={kpiRate} />}
            <div>
              <div className="text-xs font-semibold text-gray-500">집행률</div>
              {kpiLoading
                ? <Skeleton style={{ height: 28, width: 60, marginTop: 2 }} />
                : <div className="text-xl font-bold" style={{ color: barColor(kpiRate) }}>{kpiRate.toFixed(1)}%</div>
              }
              <div className="text-[11px] text-gray-400">{selectedProgram ? selectedProgram.name : '전체'}</div>
            </div>
          </div>
        </div>

        {/* 메인 2컬럼 */}
        <div className="flex flex-1 overflow-hidden px-4 pb-4 gap-3" style={{ minHeight: 0 }}>

          {/* 예산 트리 패널 (60%) */}
          <div className="flex flex-col rounded-xl border shadow-sm bg-white overflow-hidden" style={{ flex: 3 }}>
            <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
              <div>
                <div className="font-semibold text-sm text-gray-800">
                  {selectedProgram ? selectedProgram.name : '예산 과목 트리'}
                </div>
                {selectedProgram && (
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    예산 {formatKorean(totalBudget)} · 집행 {formatKorean(totalExec)}
                  </div>
                )}
              </div>
              {canEdit && selectedProgram && (
                <button onClick={() => setShowItemModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90"
                  style={{ background: '#1d4ed8' }}>
                  <Plus size={12} /> 과목 추가
                </button>
              )}
            </div>
            {selectedProgram && (
              <div className="flex items-center bg-gray-50 border-b text-[11px] font-semibold text-gray-400 py-1.5 flex-shrink-0">
                <div className="flex-1 pl-3">과목명</div>
                <div className="w-24 text-right pr-2">당초예산</div>
                <div className="w-24 text-right pr-2">현재예산</div>
                <div className="w-24 text-right pr-2">집행액</div>
                <div className="w-24 text-right pr-2">잔액</div>
                <div className="w-28 pr-3">집행률</div>
                <div className="w-20" />
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              {!selectedProgram ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="text-4xl mb-3">📊</div>
                  <div className="text-sm font-semibold text-gray-500">사업을 선택하세요</div>
                  <div className="text-xs text-gray-400 mt-1">위 카드에서 사업을 클릭하면 예산 트리가 표시됩니다</div>
                </div>
              ) : loading.items ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} style={{ height: 36 }} />)}
                </div>
              ) : treeData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="text-4xl mb-3">📋</div>
                  <div className="text-sm font-semibold text-gray-500">예산 과목이 없습니다</div>
                  {canEdit && (
                    <button onClick={() => setShowItemModal(true)}
                      className="mt-3 px-4 py-2 text-xs font-semibold text-white rounded-lg"
                      style={{ background: '#1d4ed8' }}>
                      과목 추가하기
                    </button>
                  )}
                </div>
              ) : treeData.map(node => (
                <TreeRow key={node.id} node={node} executions={executions}
                  selectedItem={selectedItem}
                  onSelect={item => { setSelectedItem(prev => prev?.id === item.id ? null : item); setActiveTab('exec') }}
                  editingId={editingId} editingValue={editingValue}
                  onStartEdit={n => { setEditingId(n.id); setEditingValue(n.budgeted_amount ? formatAmount(n.budgeted_amount) : '') }}
                  onEditChange={setEditingValue}
                  onSaveEdit={saveInlineBudget}
                  onCancelEdit={() => { setEditingId(null); setEditingValue('') }}
                  canEdit={canEdit}
                  onRevise={node => setRevisionTarget(node)}
                  onHistory={node => setHistoryTarget(node)} />
              ))}
            </div>
          </div>

          {/* 집행 패널 (40%) */}
          <div className="flex flex-col rounded-xl border shadow-sm bg-white overflow-hidden" style={{ flex: 2 }}>
            <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
              <div>
                <div className="font-semibold text-sm text-gray-800">
                  {selectedItem ? selectedItem.name : '집행 내역'}
                </div>
                {selectedItem && (
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    예산 {formatKorean(selBudget)} · 집행률 {selRate.toFixed(1)}%
                  </div>
                )}
              </div>
              {canEdit && selectedProgram && (
                <button onClick={() => setShowExecModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90"
                  style={{ background: '#059669' }}>
                  <Plus size={12} /> 집행 추가
                </button>
              )}
            </div>

            {selectedItem && (
              <div className="px-4 py-2 bg-blue-50 border-b flex-shrink-0 grid grid-cols-2 gap-1 text-xs">
                {[
                  { label: '예산액', value: formatKorean(selBudget), color: '#374151' },
                  { label: '집행액', value: formatKorean(selExec), color: rateColor(selRate) },
                  { label: '잔액', value: formatKorean(selRemain), color: selRemain < 0 ? '#ef4444' : '#374151' },
                  { label: '집행률', value: `${selRate.toFixed(1)}%`, color: rateColor(selRate) },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {!selectedProgram ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
                  <ReceiptIcon />
                  <div className="text-sm font-semibold text-gray-500 mt-3">사업을 선택하세요</div>
                </div>
              ) : !selectedItem ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
                  <ReceiptIcon />
                  <div className="text-sm font-semibold text-gray-500 mt-3">목(目) 항목을 클릭하세요</div>
                  <div className="text-xs text-gray-400 mt-1">트리에서 항목을 선택하면<br />집행 내역이 표시됩니다</div>
                </div>
              ) : loading.exec ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} style={{ height: 56 }} />)}
                </div>
              ) : selectedExecs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
                  <ReceiptIcon />
                  <div className="text-sm font-semibold text-gray-500 mt-3">집행 내역이 없습니다</div>
                  {canEdit && (
                    <button onClick={() => setShowExecModal(true)}
                      className="mt-3 px-4 py-2 text-xs font-semibold text-white rounded-lg"
                      style={{ background: '#059669' }}>
                      집행 추가하기
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {selectedExecs.map((e, idx) => (
                    <div key={e.id} className="rounded-lg border border-gray-100 bg-white p-3 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-mono">#{idx + 1}</span>
                            <span className="text-xs text-gray-500">{e.execution_date}</span>
                          </div>
                          <div className="text-sm font-semibold text-gray-700 mt-0.5 truncate">{e.note || '-'}</div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-sm font-bold text-gray-800">{formatAmount(e.amount)}</span>
                          {canEdit && (
                            <button onClick={() => deleteExecution(e.id)} className="p-1 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 pb-1 border-t border-gray-100 flex justify-between items-center px-1">
                    <span className="text-xs text-gray-500 font-semibold">합계</span>
                    <span className="text-sm font-bold text-gray-800">{formatAmount(selExec)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 모달 */}
      {showProgramModal && (
        <ProgramModal onClose={() => setShowProgramModal(false)}
          onSave={() => { setShowProgramModal(false); fetchPrograms() }}
          userId={userId} />
      )}
      {showItemModal && selectedProgram && (
        <ItemAddModal programId={selectedProgram.id} items={items} userId={userId}
          onClose={() => setShowItemModal(false)}
          onSave={() => { setShowItemModal(false); fetchItems(selectedProgram.id) }} />
      )}
      {showExecModal && selectedProgram && (
        <ExecAddModal programId={selectedProgram.id} items={items} defaultItemId={selectedItem?.id || ''}
          onClose={() => setShowExecModal(false)}
          onSave={() => { setShowExecModal(false); fetchExecutions(selectedProgram.id); fetchPrograms() }} />
      )}
      {revisionTarget && (
        <RevisionModal item={revisionTarget} userId={userId}
          onClose={() => setRevisionTarget(null)}
          onSave={() => { setRevisionTarget(null); fetchItems(selectedProgram.id) }} />
      )}
      {historyTarget && (
        <HistoryModal item={historyTarget} onClose={() => setHistoryTarget(null)} onSave={() => fetchItems(selectedProgram.id)} />
      )}
      {showStandardManage && (
        <StandardItemManageModal onClose={() => setShowStandardManage(false)} />
      )}
    </>
  )
}
