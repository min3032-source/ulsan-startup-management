// 멘토링 통합 시스템 공통 UI
import { useState } from 'react'
import { FIELD_CATEGORIES, DOC_FORMS, DOC_STATUS_STYLE } from '../../lib/mentorFields'
import { Download, Paperclip, Trash2, Plus, X } from 'lucide-react'

import { BUCKET, openStorageFile } from './mtHelpers'

export function Chip({ active, onClick, children, disabled }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs border transition ${active
        ? 'bg-[#2E75B6] border-[#2E75B6] text-white'
        : 'bg-white border-gray-200 text-gray-600 hover:border-[#2E75B6]'} ${disabled ? 'opacity-50' : ''}`}>
      {children}
    </button>
  )
}

export function ChipGroup({ options, value = [], onChange, single = false }) {
  const toggle = o => {
    if (single) return onChange(value.includes(o) ? [] : [o])
    onChange(value.includes(o) ? value.filter(v => v !== o) : [...value, o])
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => <Chip key={o} active={value.includes(o)} onClick={() => toggle(o)}>{o}</Chip>)}
    </div>
  )
}

/** 분야 선택: value = [{cat, sub}] */
export function FieldPicker({ value = [], onChange }) {
  const has = (cat, sub) => value.some(f => f.cat === cat && f.sub === sub)
  const toggle = (cat, sub) => onChange(has(cat, sub)
    ? value.filter(f => !(f.cat === cat && f.sub === sub))
    : [...value, { cat, sub }])
  return (
    <div className="space-y-2">
      {FIELD_CATEGORIES.map(c => (
        <div key={c.cat} className="flex flex-col sm:flex-row sm:items-start gap-1.5">
          <div className="w-24 shrink-0 text-xs font-semibold text-gray-600 pt-1">{c.cat}</div>
          <div className="flex flex-wrap gap-1.5">
            {c.subs.map(s => <Chip key={s} active={has(c.cat, s)} onClick={() => toggle(c.cat, s)}>{s}</Chip>)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TagInput({ value = [], onChange, placeholder = '입력 후 Enter' }) {
  const [text, setText] = useState('')
  const add = () => {
    const parts = text.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length) onChange([...new Set([...value, ...parts])])
    setText('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 border border-gray-300 rounded-lg px-2 py-1.5 bg-white">
      {value.map(v => (
        <span key={v} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs rounded px-1.5 py-0.5">
          {v}<button type="button" onClick={() => onChange(value.filter(x => x !== v))}><X size={11} /></button>
        </span>
      ))}
      <input className="flex-1 min-w-[120px] text-[13px] outline-none" value={text} placeholder={placeholder}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        onBlur={add} />
    </div>
  )
}

export function StatusBadge({ status }) {
  const s = status || '미작성'
  return <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${DOC_STATUS_STYLE[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>
}

export function Label({ children, required }) {
  return <label className="block text-xs font-semibold text-gray-600 mb-1">{children}{required && <span className="text-red-500"> *</span>}</label>
}

/** 행 추가형 표 입력 */
export function RowsInput({ columns, value = [], onChange, addLabel = '행 추가' }) {
  const empty = () => Object.fromEntries(columns.map(c => [c.key, '']))
  const update = (i, k, v) => onChange(value.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-lg p-2">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {columns.map(c => (
              <input key={c.key} type={c.type || 'text'} className="form-input" placeholder={c.label}
                value={row[c.key] || ''} onChange={e => update(i, c.key, e.target.value)} />
            ))}
          </div>
          <button type="button" className="p-1.5 text-gray-400 hover:text-red-500" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, empty()])}
        className="flex items-center gap-1 text-xs text-[#2E75B6] font-semibold"><Plus size={13} />{addLabel}</button>
    </div>
  )
}

/** 수행 문서 입력/열람 폼 */
export function DocForm({ docType, value = {}, onChange, readOnly = false, sessions = 3 }) {
  const form = DOC_FORMS[docType]
  if (value?.legacy_text !== undefined && Object.keys(value).length <= 2) {
    return <pre className="whitespace-pre-wrap text-sm bg-gray-50 rounded-lg p-3">{value.legacy_text || '(내용 없음)'}</pre>
  }
  const set = (k, v) => onChange?.({ ...value, [k]: v })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {form.fields.map(f => (
        <div key={f.key} className={f.half ? '' : 'sm:col-span-2'}>
          <Label required={f.required && !readOnly}>{f.label}</Label>
          {readOnly ? (
            f.type === 'sessions'
              ? <SessionsView rows={value[f.key]} />
              : <div className="text-sm whitespace-pre-wrap bg-gray-50 rounded-lg px-3 py-2 min-h-[36px]">{value[f.key] || '-'}</div>
          ) : f.type === 'textarea' ? (
            <textarea className="form-input" rows={4} value={value[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
          ) : f.type === 'select' ? (
            <select className="form-input" value={value[f.key] || ''} onChange={e => set(f.key, e.target.value)}>
              <option value="">선택</option>
              {f.options.map(o => <option key={o}>{o}</option>)}
            </select>
          ) : f.type === 'sessions' ? (
            <RowsInput
              columns={[{ key: 'session', label: '회차' }, { key: 'date', label: '일정', type: 'date' }, { key: 'topic', label: '주제' }, { key: 'content', label: '내용' }]}
              value={value[f.key]?.length ? value[f.key] : Array.from({ length: sessions }, (_, i) => ({ session: `${i + 1}회차`, date: '', topic: '', content: '' }))}
              onChange={v => set(f.key, v)} addLabel="회차 추가" />
          ) : (
            <input type={f.type} className="form-input" value={value[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
          )}
        </div>
      ))}
      {readOnly && value && Object.keys(value).some(k => !form.fields.find(f => f.key === k)) && (
        <details className="sm:col-span-2 text-xs text-gray-500">
          <summary className="cursor-pointer">기존 시스템 원본 항목 보기</summary>
          <pre className="whitespace-pre-wrap bg-gray-50 rounded p-2 mt-1">{JSON.stringify(
            Object.fromEntries(Object.entries(value).filter(([k]) => !form.fields.find(f => f.key === k))), null, 2)}</pre>
        </details>
      )}
    </div>
  )
}

function SessionsView({ rows }) {
  if (!rows?.length) return <div className="text-sm text-gray-400">-</div>
  return (
    <table className="w-full text-xs border border-gray-200">
      <thead className="bg-gray-50"><tr>{['회차', '일정', '주제', '내용'].map(h => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={i} className="border-t"><td className="px-2 py-1">{r.session || r.session_num}</td><td className="px-2 py-1">{r.date}</td><td className="px-2 py-1">{r.topic}</td><td className="px-2 py-1">{r.content || r.location}</td></tr>
      ))}</tbody>
    </table>
  )
}


export function FileList({ files = [], onDelete }) {
  if (!files.length) return <div className="text-xs text-gray-400">첨부파일 없음</div>
  return (
    <ul className="space-y-1">
      {files.map(f => (
        <li key={f.id || f.path} className="flex items-center gap-2 text-xs">
          <Paperclip size={12} className="text-gray-400" />
          <button type="button" className="text-[#2E75B6] hover:underline truncate" onClick={() => openStorageFile(f.path)}>
            {f.file_name || f.name}
          </button>
          {f.size ? <span className="text-gray-400">{(f.size / 1024 / 1024).toFixed(1)}MB</span> : null}
          <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => openStorageFile(f.path)}><Download size={12} /></button>
          {onDelete && <button type="button" className="text-gray-400 hover:text-red-500" onClick={() => onDelete(f)}><Trash2 size={12} /></button>}
        </li>
      ))}
    </ul>
  )
}



export function Card({ title, right, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700">{title}</h3>{right}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
