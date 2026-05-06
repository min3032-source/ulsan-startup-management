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

// ─── ProgramModal ─────────────────────────────────────────────────────────────
function ProgramModal({ onClose, onSave, userId }) {
  const [form, setForm] = useState({ name: '', year: String(CURRENT_YEAR), manager: '', memo: '', total_budget: '' })
  const [autoCreate, setAutoCreate] = useState(true)
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
    if (autoCreate) await createDefaultItems(data.id, userId)
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">사업 등록</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
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
          <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
            <input type="checkbox" checked={autoCreate} onChange={e => setAutoCreate(e.target.checked)}
              className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-gray-700">기본 과목 자동 생성 (21개)</span>
          </label>
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

// ─── ItemAddModal ─────────────────────────────────────────────────────────────
function ItemAddModal({ programId, items, userId, onClose, onSave }) {
  const [level, setLevel] = useState(4)
  const [parentId, setParentId] = useState('')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const parents = items.filter(i => i.level === level - 1)

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
function HistoryModal({ item, onClose }) {
  const [histories, setHistories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('budget_item_histories').select('*').eq('budget_item_id', item.id).order('revision_number')
      .then(({ data }) => { setHistories(data || []); setLoading(false) })
  }, [item.id])

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
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
                </tr>
              </thead>
              <tbody>
                {histories.length === 0
                  ? <tr><td colSpan={5} className="px-2 py-3 text-center text-gray-400">이력 없음</td></tr>
                  : histories.map((h, idx) => {
                    const prev = idx > 0 ? Number(histories[idx - 1].new_amount) || 0 : null
                    const diff = prev !== null ? (Number(h.new_amount) || 0) - prev : null
                    return (
                      <tr key={h.id} className="border-t border-gray-100">
                        <td className="px-2 py-2 font-semibold text-gray-700">{h.revision_type}</td>
                        <td className="px-2 py-2 text-right text-gray-800">{formatAmount(h.new_amount)}</td>
                        <td className={`px-2 py-2 text-right font-semibold ${diff === null ? 'text-gray-300' : diff >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                          {diff === null ? '-' : (diff >= 0 ? '+' : '') + formatAmount(diff)}
                        </td>
                        <td className="px-2 py-2 text-gray-500">{h.created_at ? h.created_at.slice(0, 10) : '-'}</td>
                        <td className="px-2 py-2 text-gray-500">{h.reason || '-'}</td>
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
const LEVEL_BG = { 1: 'bg-gray-100', 2: 'bg-gray-50', 3: 'bg-white', 4: 'bg-white' }
const LEVEL_PL = { 1: 'pl-2', 2: 'pl-6', 3: 'pl-10', 4: 'pl-14' }
const LEVEL_TEXT = {
  1: 'font-bold text-sm text-gray-800',
  2: 'font-semibold text-sm text-gray-700',
  3: 'text-xs text-gray-600',
  4: 'text-sm text-blue-700 hover:text-blue-900',
}

function TreeRow({ node, executions, selectedItem, onSelect, editingId, editingValue, onStartEdit, onEditChange, onSaveEdit, onCancelEdit, canEdit, onRevise, onHistory }) {
  const [open, setOpen] = useState(node.level <= 2)
  const hasChildren = node.children && node.children.length > 0
  const budget = getNodeBudget(node)
  const exec = getNodeExec(node, executions)
  const remain = budget - exec
  const rate = budget > 0 ? (exec / budget) * 100 : 0
  const isSelected = selectedItem?.id === node.id
  const isEditing = editingId === node.id

  return (
    <>
      <div className={`flex items-center border-b border-gray-100 transition-colors ${LEVEL_BG[node.level]} ${isSelected ? '!bg-blue-100' : 'hover:bg-blue-50'}`}
        style={{ minHeight: 36 }}>
        {/* 과목명 */}
        <div className={`flex items-center gap-1 flex-1 min-w-0 py-1.5 cursor-pointer ${LEVEL_PL[node.level]}`}
          onClick={() => {
            if (hasChildren) setOpen(o => !o)
            if (node.level === 4) onSelect(node)
          }}>
          <span className="flex-shrink-0 w-4 text-gray-400 flex items-center">
            {hasChildren ? (open ? <ChevronDown size={12} /> : <ChevronRight size={12} />) : null}
          </span>
          <span className={`truncate ${LEVEL_TEXT[node.level]}`}>{node.name}</span>
          {node.level === 4 && node.revision_count > 0 && (
            <span className="ml-1 flex-shrink-0 px-1 py-0.5 text-[9px] font-bold rounded bg-yellow-100 text-yellow-700">추경{node.revision_count}</span>
          )}
        </div>

        {/* 예산액 */}
        <div className="w-28 text-right pr-2 text-xs text-gray-600 flex-shrink-0">
          {isEditing ? (
            <div className="flex items-center gap-0.5 justify-end">
              <input type="text" value={editingValue} autoFocus
                onChange={e => {
                  const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '')
                  onEditChange(parseInt(raw || '0') ? formatAmount(parseInt(raw)) : '')
                }}
                onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit() }}
                className="w-20 border border-blue-400 rounded px-1 py-0.5 text-xs text-right outline-none" />
              <button onClick={onSaveEdit} className="text-green-500 hover:text-green-700 p-0.5"><Check size={12} /></button>
              <button onClick={onCancelEdit} className="text-gray-400 hover:text-gray-600 p-0.5"><X size={12} /></button>
            </div>
          ) : (
            <span>{budget > 0 ? formatAmount(budget) : '-'}</span>
          )}
        </div>

        {/* 집행액 */}
        <div className="w-24 text-right pr-2 text-xs text-gray-600 flex-shrink-0">
          {exec > 0 ? formatAmount(exec) : '-'}
        </div>

        {/* 잔액 */}
        <div className={`w-24 text-right pr-2 text-xs flex-shrink-0 ${remain < 0 ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>
          {budget > 0 ? formatAmount(remain) : '-'}
        </div>

        {/* 집행률 */}
        <div className="w-16 text-right pr-2 flex-shrink-0">
          {budget > 0
            ? <span className="text-xs font-semibold" style={{ color: rateColor(rate) }}>{rate.toFixed(1)}%</span>
            : <span className="text-xs text-gray-300">-</span>}
        </div>

        {/* 액션 버튼 (level 4) */}
        <div className="w-24 flex items-center justify-end gap-0.5 flex-shrink-0 pr-1">
          {canEdit && node.level === 4 && !isEditing && (
            <>
              <button onClick={() => onStartEdit(node)} className="text-gray-300 hover:text-blue-500 transition-colors p-0.5">
                <Pencil size={11} />
              </button>
              <button onClick={e => { e.stopPropagation(); onRevise(node) }}
                className="px-1 py-0.5 text-[10px] font-semibold rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors">
                추경
              </button>
              <button onClick={e => { e.stopPropagation(); onHistory(node) }}
                className="px-1 py-0.5 text-[10px] font-semibold rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                이력
              </button>
            </>
          )}
        </div>
      </div>

      {/* 인라인 한글 금액 */}
      {isEditing && parseAmount(editingValue) > 0 && (
        <div className="bg-blue-50 border-b border-gray-100 px-3 py-0.5 text-xs text-blue-600 text-right">
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

  const fetchPrograms = useCallback(async () => {
    setLoading(l => ({ ...l, programs: true }))
    let q = supabase.from('budget_programs').select('*').order('year', { ascending: false }).order('created_at', { ascending: false })
    if (filterYear) q = q.eq('year', Number(filterYear))
    const { data } = await q
    setPrograms(data || [])
    if (data && data.length > 0) {
      const { data: execs } = await supabase.from('budget_executions').select('program_id, amount')
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
  const totalBudget = leafItems.reduce((s, i) => s + (Number(i.budgeted_amount) || 0), 0)
  const totalExec = executions.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const totalRate = totalBudget > 0 ? totalExec / totalBudget * 100 : 0
  const selectedExecs = selectedItem ? executions.filter(e => e.budget_item_id === selectedItem.id) : []
  const selBudget = Number(selectedItem?.budgeted_amount) || 0
  const selExec = selectedExecs.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const selRemain = selBudget - selExec
  const selRate = selBudget > 0 ? selExec / selBudget * 100 : 0

  // ── 왼쪽 패널 ────────────────────────────────────────────────────────────────
  const LeftPanel = (
    <div className="flex flex-col h-full bg-white">
      <div className="px-3 py-2.5 border-b flex-shrink-0">
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white outline-none focus:border-blue-400">
          <option value="">전체 연도</option>
          {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading.programs ? (
          <div className="p-6 text-center text-sm text-gray-400">로딩 중...</div>
        ) : programs.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">사업이 없습니다.</div>
        ) : programs.map(p => {
          const pExec = execTotals[p.id] || 0
          const pRate = p.total_budget > 0 ? Math.min(pExec / p.total_budget * 100, 100) : 0
          const isActive = selectedProgram?.id === p.id
          return (
            <div key={p.id} onClick={() => selectProgram(p)}
              className={`px-3 py-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-blue-50 ${isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-800 truncate">{p.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{p.year}년 · {p.manager || '-'}</div>
                  {p.total_budget > 0 && (
                    <div className="text-xs text-gray-500 mt-0.5">{formatKorean(p.total_budget)}</div>
                  )}
                  {p.total_budget > 0 && (
                    <div className="mt-1.5">
                      <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                        <span>집행률</span>
                        <span style={{ color: rateColor(pRate) }}>{pRate.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pRate}%`, background: rateColor(pRate) }} />
                      </div>
                    </div>
                  )}
                </div>
                {canEdit && (
                  <button onClick={e => { e.stopPropagation(); deleteProgram(p) }}
                    className="flex-shrink-0 p-1 text-red-300 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {canEdit && (
        <div className="p-3 border-t flex-shrink-0">
          <button onClick={() => setShowProgramModal(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#2E75B6' }}>
            <Plus size={14} /> 사업 등록
          </button>
        </div>
      )}
    </div>
  )

  // ── 가운데 패널 ───────────────────────────────────────────────────────────────
  const MiddlePanel = (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b flex-shrink-0">
        <div className="px-3 py-2.5 flex items-center gap-2">
          <div className="flex-1 font-semibold text-sm text-gray-700 truncate">
            {selectedProgram ? selectedProgram.name : '예산 과목 트리'}
          </div>
          {canEdit && selectedProgram && (
            <button onClick={() => setShowItemModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg flex-shrink-0 hover:opacity-90"
              style={{ background: '#2E75B6' }}>
              <Plus size={11} /> 과목 추가
            </button>
          )}
        </div>
        {selectedProgram && (
          <div className="px-3 pb-2 flex gap-4 text-xs text-gray-500">
            <span>예산 <b className="text-gray-700">{formatKorean(totalBudget)}</b></span>
            <span>집행 <b style={{ color: rateColor(totalRate) }}>{formatKorean(totalExec)}</b></span>
            <span>집행률 <b style={{ color: rateColor(totalRate) }}>{totalRate.toFixed(1)}%</b></span>
          </div>
        )}
        {selectedProgram && (
          <div className="flex items-center bg-gray-50 border-t text-[11px] font-semibold text-gray-400 py-1.5">
            <div className="flex-1 pl-3">과목명</div>
            <div className="w-28 text-right pr-2">예산액</div>
            <div className="w-24 text-right pr-2">집행액</div>
            <div className="w-24 text-right pr-2">잔액</div>
            <div className="w-16 text-right pr-2">집행률</div>
            <div className="w-24" />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {!selectedProgram ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">사업을 선택하세요.</div>
        ) : loading.items ? (
          <div className="p-6 text-center text-sm text-gray-400">로딩 중...</div>
        ) : treeData.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">예산 과목이 없습니다.</div>
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
  )

  // ── 오른쪽 패널 ───────────────────────────────────────────────────────────────
  const RightPanel = (
    <div className="flex flex-col h-full bg-white">
      <div className="px-3 py-2.5 border-b flex items-center gap-2 flex-shrink-0">
        <div className="flex-1 font-semibold text-sm text-gray-700 truncate">
          {selectedItem ? selectedItem.name : '집행 내역'}
        </div>
        {canEdit && selectedProgram && (
          <button onClick={() => setShowExecModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg flex-shrink-0 hover:opacity-90"
            style={{ background: '#2E75B6' }}>
            <Plus size={11} /> 집행 추가
          </button>
        )}
      </div>

      {selectedItem && (
        <div className="px-4 py-2.5 bg-blue-50 border-b flex-shrink-0 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
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
          <div className="flex items-center justify-center h-full text-sm text-gray-400 text-center px-4">사업을 선택하세요.</div>
        ) : !selectedItem ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400 text-center px-4">
            목(目) 항목을 클릭하면<br />집행 내역을 볼 수 있습니다.
          </div>
        ) : loading.exec ? (
          <div className="p-6 text-center text-sm text-gray-400">로딩 중...</div>
        ) : selectedExecs.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">집행 내역이 없습니다.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 text-left text-gray-500 font-semibold w-7">#</th>
                <th className="px-2 py-2 text-left text-gray-500 font-semibold">집행일</th>
                <th className="px-2 py-2 text-left text-gray-500 font-semibold">적요</th>
                <th className="px-2 py-2 text-right text-gray-500 font-semibold">금액</th>
                {canEdit && <th className="w-7" />}
              </tr>
            </thead>
            <tbody>
              {selectedExecs.map((e, idx) => (
                <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-2 text-gray-400">{idx + 1}</td>
                  <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{e.execution_date}</td>
                  <td className="px-2 py-2 text-gray-500 max-w-[80px] truncate">{e.note || '-'}</td>
                  <td className="px-2 py-2 text-right font-semibold text-gray-800 whitespace-nowrap">{formatAmount(e.amount)}</td>
                  {canEdit && (
                    <td className="px-1 py-2 text-center">
                      <button onClick={() => deleteExecution(e.id)} className="text-red-300 hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-50 border-t-2 border-blue-200">
              <tr>
                <td colSpan={3} className="px-2 py-2 text-xs font-semibold text-gray-600">합계</td>
                <td className="px-2 py-2 text-right text-xs font-bold text-gray-800">{formatAmount(selExec)}</td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* 데스크탑 3패널 */}
      <div className="hidden md:flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="bg-white border-b px-5 py-3 flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-800">사업비 관리</h1>
          <p className="text-xs text-gray-400 mt-0.5">예산 과목 트리 · 집행 내역 관리</p>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 border-r flex-shrink-0 overflow-hidden flex flex-col">{LeftPanel}</div>
          <div className="flex-1 border-r overflow-hidden flex flex-col min-w-0">{MiddlePanel}</div>
          <div className="w-72 flex-shrink-0 overflow-hidden flex flex-col">{RightPanel}</div>
        </div>
      </div>

      {/* 모바일 탭 */}
      <div className="md:hidden flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="bg-white border-b px-3 py-2 flex-shrink-0">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            {[{ k: 'programs', l: '사업' }, { k: 'tree', l: '예산과목' }, { k: 'exec', l: '집행내역' }].map(({ k, l }) => (
              <button key={k} onClick={() => setActiveTab(k)}
                className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${activeTab === k ? 'text-white' : 'text-gray-500 bg-white'}`}
                style={activeTab === k ? { background: '#2E75B6' } : {}}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {activeTab === 'programs' && LeftPanel}
          {activeTab === 'tree' && MiddlePanel}
          {activeTab === 'exec' && RightPanel}
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
        <HistoryModal item={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}
    </>
  )
}
