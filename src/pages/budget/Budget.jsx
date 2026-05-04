/*
SQL SCHEMA (Supabase SQL Editor에서 실행):

CREATE TABLE IF NOT EXISTS budget_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  total_budget BIGINT NOT NULL DEFAULT 0,
  manager TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES budget_programs(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  parent_id UUID REFERENCES budget_items(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  budgeted_amount BIGINT DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES budget_programs(id) ON DELETE CASCADE,
  budget_item_id UUID REFERENCES budget_items(id) ON DELETE SET NULL,
  execution_date DATE NOT NULL,
  amount BIGINT NOT NULL DEFAULT 0,
  note TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budget_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_programs_all" ON budget_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budget_items_all" ON budget_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budget_executions_all" ON budget_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);
*/

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, Trash2, ChevronRight, ChevronDown, X } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()

const DEFAULT_BUDGET_ITEMS = [
  { 관: '인건비', 항: '인건비', 세항: '인건비', 목: '전담인력 인건비' },
  { 관: '일반운영비', 항: '사무관리비', 세항: '소모품비 및 인쇄비', 목: '소모품비' },
  { 관: '일반운영비', 항: '사무관리비', 세항: '임차료', 목: '임차료 및 관리비' },
  { 관: '일반운영비', 항: '사무관리비', 세항: '지급수수료', 목: '무인경비,회계감사비' },
  { 관: '일반운영비', 항: '사무관리비', 세항: '회의비', 목: '회의비' },
  { 관: '일반운영비', 항: '사무관리비', 세항: '광고선전비', 목: '광고선전비' },
  { 관: '일반운영비', 항: '사무관리비', 세항: '강사수당', 목: '교육강사수당' },
  { 관: '일반운영비', 항: '사무관리비', 세항: '멘토수당', 목: '멘토 수당' },
  { 관: '일반운영비', 항: '사무관리비', 세항: '심사수당', 목: '심사참석 수당' },
  { 관: '일반운영비', 항: '공공운영비', 세항: '공공요금', 목: '공공요금 및 제세공과금' },
  { 관: '일반운영비', 항: '행사운영비', 세항: '행사운영비', 목: '울산스타트업 페스타' },
  { 관: '여비', 항: '국내여비', 세항: '국내여비', 목: '국내여비' },
  { 관: '수선유지교체비', 항: '수선유지비', 세항: '수선유지비', 목: '수선유지비' },
  { 관: '업무추진비', 항: '사업업무추진비', 세항: '업무추진비', 목: '업무추진비' },
  { 관: '교육훈련비', 항: '교육훈련비', 세항: '교육훈련비', 목: '교육훈련비' },
  { 관: '민간사업지원금', 항: '민간사업지원금', 세항: '기술제품실증', 목: '기술제품 실증 및 개발지원' },
  { 관: '민간사업지원금', 항: '민간사업지원금', 세항: '기술보호서비스', 목: '기술보호 및 경영전문서비스' },
  { 관: '민간사업지원금', 항: '민간사업지원금', 세항: '마케팅지원', 목: '마케팅 지원' },
  { 관: '민간사업지원금', 항: '민간사업지원금', 세항: '교육비지원', 목: '창업자 역량강화 교육비' },
  { 관: '민간사업지원금', 항: '민간사업지원금', 세항: 'AI솔루션', 목: 'AI 솔루션 융합 지원' },
  { 관: '위탁운영비', 항: '위탁운영비', 세항: '위탁운영비', 목: '위탁운영비' },
]

function buildTree(flatItems) {
  const map = {}
  flatItems.forEach(item => { map[item.id] = { ...item, children: [] } })
  const roots = []
  const sorted = [...flatItems].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  sorted.forEach(item => {
    if (item.parent_id && map[item.parent_id]) {
      map[item.parent_id].children.push(map[item.id])
    } else if (!item.parent_id) {
      roots.push(map[item.id])
    }
  })
  return roots
}

function getNodeExecTotal(node, executions) {
  if (node.level === 4) {
    return executions
      .filter(e => e.budget_item_id === node.id)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
  }
  return (node.children || []).reduce((s, c) => s + getNodeExecTotal(c, executions), 0)
}

function rateColor(rate) {
  if (rate > 100) return '#ef4444'
  if (rate > 80) return '#22c55e'
  if (rate > 50) return '#f59e0b'
  return '#2E75B6'
}

function fmtKRW(n) {
  if (!n && n !== 0) return '-'
  return Number(n).toLocaleString('ko-KR') + '원'
}

async function createDefaultItems(programId) {
  const kanMap = {}, koMap = {}, seMap = {}
  let kanOrder = 0, koOrder = 0, seOrder = 0

  for (const item of DEFAULT_BUDGET_ITEMS) {
    if (!kanMap[item.관]) {
      const { data } = await supabase.from('budget_items').insert({
        program_id: programId, level: 1, parent_id: null,
        name: item.관, budgeted_amount: 0, sort_order: kanOrder++
      }).select().single()
      if (data) kanMap[item.관] = data.id
    }

    const koKey = `${item.관}|${item.항}`
    if (!koMap[koKey] && kanMap[item.관]) {
      const { data } = await supabase.from('budget_items').insert({
        program_id: programId, level: 2, parent_id: kanMap[item.관],
        name: item.항, budgeted_amount: 0, sort_order: koOrder++
      }).select().single()
      if (data) koMap[koKey] = data.id
    }

    const seKey = `${item.관}|${item.항}|${item.세항}`
    if (!seMap[seKey] && koMap[koKey]) {
      const { data } = await supabase.from('budget_items').insert({
        program_id: programId, level: 3, parent_id: koMap[koKey],
        name: item.세항, budgeted_amount: 0, sort_order: seOrder++
      }).select().single()
      if (data) seMap[seKey] = data.id
    }

    if (seMap[seKey]) {
      await supabase.from('budget_items').insert({
        program_id: programId, level: 4, parent_id: seMap[seKey],
        name: item.목, budgeted_amount: 0, sort_order: 0
      })
    }
  }
}

const LEVEL_LABELS = { 1: '관', 2: '항', 3: '세항', 4: '목' }
const LEVEL_INDENT = { 1: 0, 2: 16, 3: 32, 4: 48 }
const LEVEL_FONT = { 1: '14px', 2: '13px', 3: '13px', 4: '13px' }
const LEVEL_WEIGHT = { 1: '700', 2: '600', 3: '500', 4: '400' }
const LEVEL_BG = { 1: '#f0f4ff', 2: '#f7f9ff', 3: '#fafbff', 4: 'white' }

function TreeRow({ node, executions, selectedItem, onSelectItem }) {
  const [open, setOpen] = useState(node.level < 3)
  const hasChildren = node.children && node.children.length > 0
  const execTotal = getNodeExecTotal(node, executions)
  const budgeted = Number(node.budgeted_amount) || 0
  const rate = budgeted > 0 ? (execTotal / budgeted) * 100 : 0
  const isSelected = selectedItem?.id === node.id
  const isClickable = node.level === 4

  return (
    <>
      <div
        onClick={() => {
          if (hasChildren) setOpen(o => !o)
          if (isClickable) onSelectItem(node)
        }}
        style={{
          display: 'flex', alignItems: 'center',
          paddingLeft: `${LEVEL_INDENT[node.level] + 8}px`,
          paddingRight: '8px', paddingTop: '6px', paddingBottom: '6px',
          background: isSelected ? '#dbeafe' : LEVEL_BG[node.level],
          borderBottom: '1px solid #e5e7eb',
          cursor: isClickable ? 'pointer' : 'default',
          fontSize: LEVEL_FONT[node.level],
          fontWeight: LEVEL_WEIGHT[node.level],
          color: '#1f2937',
          userSelect: 'none',
        }}
      >
        <span style={{ width: 16, flexShrink: 0, color: '#9ca3af', marginRight: 2, display: 'flex', alignItems: 'center' }}>
          {hasChildren
            ? (open ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
            : null}
        </span>
        <span style={{ width: 28, flexShrink: 0, fontSize: '10px', fontWeight: '600', color: '#6b7280', marginRight: 6 }}>
          {LEVEL_LABELS[node.level]}
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
        <span style={{ marginLeft: 8, flexShrink: 0, fontSize: '11px', color: '#6b7280', textAlign: 'right', minWidth: 70 }}>
          {budgeted > 0 ? fmtKRW(budgeted) : ''}
        </span>
        {budgeted > 0 && (
          <span style={{ marginLeft: 6, flexShrink: 0, fontSize: '10px', fontWeight: '600', color: rateColor(rate), minWidth: 36, textAlign: 'right' }}>
            {rate.toFixed(0)}%
          </span>
        )}
      </div>
      {open && hasChildren && node.children.map(child => (
        <TreeRow
          key={child.id}
          node={child}
          executions={executions}
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
        />
      ))}
    </>
  )
}

function ProgramModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', year: CURRENT_YEAR, total_budget: '', manager: '', memo: '' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.name.trim()) { alert('사업명을 입력하세요.'); return }
    setSaving(true)
    const { data, error } = await supabase.from('budget_programs').insert({
      name: form.name.trim(),
      year: Number(form.year),
      total_budget: Number(form.total_budget) || 0,
      manager: form.manager.trim() || null,
      memo: form.memo.trim() || null,
    }).select().single()
    if (error) { alert('저장 실패: ' + error.message); setSaving(false); return }
    await createDefaultItems(data.id)
    setSaving(false)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>사업 추가</h2>
          <button onClick={onClose}><X size={18} color="#6b7280" /></button>
        </div>
        {[
          { label: '사업명 *', key: 'name', type: 'text', placeholder: '예: 울산 창업 U-시리즈' },
          { label: '연도', key: 'year', type: 'number', placeholder: String(CURRENT_YEAR) },
          { label: '총 예산 (원)', key: 'total_budget', type: 'number', placeholder: '0' },
          { label: '담당자', key: 'manager', type: 'text', placeholder: '' },
          { label: '메모', key: 'memo', type: 'text', placeholder: '' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{f.label}</label>
            <input
              type={f.type}
              value={form[f.key]}
              onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', color: '#6b7280', fontSize: 14, cursor: 'pointer', background: 'white' }}>취소</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, background: '#2E75B6', color: 'white', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '저장 중...' : '저장 및 기본 항목 생성'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ExecModal({ programId, items, onClose, onSave }) {
  const [form, setForm] = useState({ budget_item_id: '', execution_date: new Date().toISOString().slice(0, 10), amount: '', note: '' })
  const [saving, setSaving] = useState(false)
  const leafItems = items.filter(i => i.level === 4)

  const save = async () => {
    if (!form.budget_item_id) { alert('예산 과목을 선택하세요.'); return }
    if (!form.amount || Number(form.amount) <= 0) { alert('집행 금액을 입력하세요.'); return }
    setSaving(true)
    const { error } = await supabase.from('budget_executions').insert({
      program_id: programId,
      budget_item_id: form.budget_item_id,
      execution_date: form.execution_date,
      amount: Number(form.amount),
      note: form.note.trim() || null,
    })
    if (error) { alert('저장 실패: ' + error.message); setSaving(false); return }
    setSaving(false)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>집행 내역 추가</h2>
          <button onClick={onClose}><X size={18} color="#6b7280" /></button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>예산 과목 (목) *</label>
          <select
            value={form.budget_item_id}
            onChange={e => setForm(v => ({ ...v, budget_item_id: e.target.value }))}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, outline: 'none', background: 'white', boxSizing: 'border-box' }}
          >
            <option value="">-- 과목 선택 --</option>
            {leafItems.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        {[
          { label: '집행일 *', key: 'execution_date', type: 'date' },
          { label: '금액 (원) *', key: 'amount', type: 'number', placeholder: '0' },
          { label: '적요', key: 'note', type: 'text', placeholder: '내역 설명' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{f.label}</label>
            <input
              type={f.type}
              value={form[f.key]}
              onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder || ''}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', color: '#6b7280', fontSize: 14, cursor: 'pointer', background: 'white' }}>취소</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, background: '#2E75B6', color: 'white', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemEditModal({ item, onClose, onSave }) {
  const [budgeted, setBudgeted] = useState(item.budgeted_amount || 0)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await supabase.from('budget_items').update({ budgeted_amount: Number(budgeted) || 0 }).eq('id', item.id)
    setSaving(false)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 28, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>예산액 편집</h2>
          <button onClick={onClose}><X size={18} color="#6b7280" /></button>
        </div>
        <p style={{ fontSize: 14, color: '#374151', marginBottom: 16 }}>{item.name}</p>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>예산액 (원)</label>
          <input
            type="number"
            value={budgeted}
            onChange={e => setBudgeted(e.target.value)}
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', color: '#6b7280', fontSize: 14, cursor: 'pointer', background: 'white' }}>취소</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 18px', borderRadius: 8, background: '#2E75B6', color: 'white', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Budget() {
  const { hasRole } = useAuth()
  const canEdit = hasRole('manager')

  const [programs, setPrograms] = useState([])
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [items, setItems] = useState([])
  const [executions, setExecutions] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [loadingPrograms, setLoadingPrograms] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [loadingExec, setLoadingExec] = useState(false)

  const [showProgramModal, setShowProgramModal] = useState(false)
  const [showExecModal, setShowExecModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [filterYear, setFilterYear] = useState('')

  const fetchPrograms = useCallback(async () => {
    setLoadingPrograms(true)
    let q = supabase.from('budget_programs').select('*').order('year', { ascending: false }).order('created_at', { ascending: false })
    if (filterYear) q = q.eq('year', Number(filterYear))
    const { data, error } = await q
    if (!error) setPrograms(data || [])
    setLoadingPrograms(false)
  }, [filterYear])

  const fetchItems = useCallback(async (programId) => {
    if (!programId) return
    setLoadingItems(true)
    const { data, error } = await supabase.from('budget_items').select('*').eq('program_id', programId).order('sort_order')
    if (!error) setItems(data || [])
    setLoadingItems(false)
  }, [])

  const fetchExecutions = useCallback(async (programId) => {
    if (!programId) return
    setLoadingExec(true)
    const { data, error } = await supabase.from('budget_executions').select('*').eq('program_id', programId).order('execution_date', { ascending: false })
    if (!error) setExecutions(data || [])
    setLoadingExec(false)
  }, [])

  useEffect(() => { fetchPrograms() }, [fetchPrograms])

  const selectProgram = useCallback((p) => {
    setSelectedProgram(p)
    setSelectedItem(null)
    setItems([])
    setExecutions([])
    fetchItems(p.id)
    fetchExecutions(p.id)
  }, [fetchItems, fetchExecutions])

  const deleteProgram = async (p) => {
    await supabase.from('budget_programs').delete().eq('id', p.id)
    if (selectedProgram?.id === p.id) {
      setSelectedProgram(null)
      setItems([])
      setExecutions([])
      setSelectedItem(null)
    }
    fetchPrograms()
  }

  const deleteExecution = async (id) => {
    await supabase.from('budget_executions').delete().eq('id', id)
    fetchExecutions(selectedProgram.id)
  }

  const treeData = buildTree(items)
  const itemExecs = selectedItem
    ? executions.filter(e => e.budget_item_id === selectedItem.id)
    : []

  const totalBudgeted = items.filter(i => i.level === 4).reduce((s, i) => s + (Number(i.budgeted_amount) || 0), 0)
  const totalExec = executions.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const totalRate = totalBudgeted > 0 ? (totalExec / totalBudgeted) * 100 : 0

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: 'white', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>사업비 관리</h1>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>예산 과목 트리 · 집행 내역 관리</p>
        </div>
        <select
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#374151', outline: 'none', background: 'white' }}
        >
          <option value="">전체 연도</option>
          {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(y => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        {canEdit && (
          <button
            onClick={() => setShowProgramModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#2E75B6', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none' }}
          >
            <Plus size={14} /> 사업 추가
          </button>
        )}
      </div>

      {/* 3패널 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 왼쪽: 사업 목록 */}
        <div style={{ width: 240, borderRight: '1px solid #e5e7eb', background: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            사업 목록
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingPrograms ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>로딩 중...</div>
            ) : programs.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>사업이 없습니다.</div>
            ) : programs.map(p => (
              <div
                key={p.id}
                onClick={() => selectProgram(p)}
                style={{
                  padding: '11px 14px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                  background: selectedProgram?.id === p.id ? '#dbeafe' : 'white',
                  borderLeft: selectedProgram?.id === p.id ? '3px solid #2E75B6' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{p.year}년 · {p.manager || '-'}</div>
                    {p.total_budget > 0 && (
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{fmtKRW(p.total_budget)}</div>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); deleteProgram(p) }}
                      style={{ flexShrink: 0, padding: 4, borderRadius: 4, color: '#ef4444', cursor: 'pointer', background: 'none', border: 'none' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 가운데: 예산 과목 트리 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white', borderRight: '1px solid #e5e7eb' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
              예산 과목 트리
            </div>
            {selectedProgram && (
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6b7280' }}>
                <span>예산: <b style={{ color: '#1f2937' }}>{fmtKRW(totalBudgeted)}</b></span>
                <span>집행: <b style={{ color: rateColor(totalRate) }}>{fmtKRW(totalExec)}</b></span>
                <span>집행률: <b style={{ color: rateColor(totalRate) }}>{totalRate.toFixed(1)}%</b></span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!selectedProgram ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 14 }}>
                왼쪽에서 사업을 선택하세요.
              </div>
            ) : loadingItems ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>로딩 중...</div>
            ) : treeData.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>예산 과목이 없습니다.</div>
            ) : (
              treeData.map(node => (
                <TreeRow
                  key={node.id}
                  node={node}
                  executions={executions}
                  selectedItem={selectedItem}
                  onSelectItem={item => setSelectedItem(prev => prev?.id === item.id ? null : item)}
                />
              ))
            )}
          </div>

          {canEdit && selectedItem && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid #e5e7eb', background: '#f0f4ff', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>
                선택: <b>{selectedItem.name}</b> · 예산 {fmtKRW(selectedItem.budgeted_amount)}
              </span>
              <button
                onClick={() => setEditingItem(selectedItem)}
                style={{ padding: '4px 12px', fontSize: 12, background: '#2E75B6', color: 'white', borderRadius: 6, cursor: 'pointer', fontWeight: 600, border: 'none' }}
              >
                예산액 편집
              </button>
            </div>
          )}
        </div>

        {/* 오른쪽: 집행 내역 */}
        <div style={{ width: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white', flexShrink: 0 }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              집행 내역 {selectedItem ? `— ${selectedItem.name}` : ''}
            </div>
            {canEdit && selectedProgram && (
              <button
                onClick={() => setShowExecModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#2E75B6', color: 'white', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', flexShrink: 0 }}
              >
                <Plus size={12} /> 추가
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!selectedProgram ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 13 }}>사업을 선택하세요.</div>
            ) : !selectedItem ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 20 }}>
                트리에서 목(4단계) 항목을<br />클릭하면 집행 내역을 볼 수 있습니다.
              </div>
            ) : loadingExec ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>로딩 중...</div>
            ) : itemExecs.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>집행 내역이 없습니다.</div>
            ) : (
              <>
                {itemExecs.map(e => (
                  <div key={e.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{fmtKRW(e.amount)}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{e.execution_date}</div>
                        {e.note && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{e.note}</div>}
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => deleteExecution(e.id)}
                          style={{ flexShrink: 0, padding: 4, color: '#ef4444', cursor: 'pointer', background: 'none', border: 'none' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ padding: '10px 14px', background: '#f0f4ff', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ fontWeight: 600, color: '#374151' }}>이 과목 합계</span>
                    <span style={{ fontWeight: 700, color: '#1f2937' }}>
                      {fmtKRW(itemExecs.reduce((s, e) => s + (Number(e.amount) || 0), 0))}
                    </span>
                  </div>
                  {Number(selectedItem.budgeted_amount) > 0 && (() => {
                    const execSum = itemExecs.reduce((s, e) => s + (Number(e.amount) || 0), 0)
                    const r = (execSum / Number(selectedItem.budgeted_amount)) * 100
                    return (
                      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#6b7280' }}>예산 대비</span>
                        <span style={{ fontWeight: 600, color: rateColor(r) }}>{r.toFixed(1)}%</span>
                      </div>
                    )
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showProgramModal && (
        <ProgramModal
          onClose={() => setShowProgramModal(false)}
          onSave={() => { setShowProgramModal(false); fetchPrograms() }}
        />
      )}
      {showExecModal && selectedProgram && (
        <ExecModal
          programId={selectedProgram.id}
          items={items}
          onClose={() => setShowExecModal(false)}
          onSave={() => { setShowExecModal(false); fetchExecutions(selectedProgram.id) }}
        />
      )}
      {editingItem && (
        <ItemEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={() => {
            setEditingItem(null)
            fetchItems(selectedProgram.id)
            if (selectedItem?.id === editingItem.id) {
              setSelectedItem(prev => prev ? { ...prev, budgeted_amount: editingItem.budgeted_amount } : prev)
            }
          }}
        />
      )}
    </div>
  )
}
