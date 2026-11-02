// 관리자: 멘토링 사업 · 멘티(창업자·소상공인) 관리
import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatPhone } from '../../utils/formatPhone'
import PageHeader from '../../components/common/PageHeader'
import Modal from '../../components/common/Modal'
import { MENTEE_TYPES, MENTEE_METHODS, ALL_SUBS, fieldsToLabel } from '../../lib/mentorFields'
import { FieldPicker, TagInput, Label, ChipGroup } from './mtUi'
import { Plus, Upload, Download, UserPlus, Pencil, Trash2 } from 'lucide-react'

const emptyProgram = () => ({ name: '', year: new Date().getFullYear(), start_date: '', end_date: '', sessions: 3, min_grade: '', fee_by_grade: { 1: 0, 2: 0, 3: 0 }, target_type: '', staff: '', status: '운영중', memo: '' })
const emptyMentee = pid => ({ program_id: pid, mentee_type: '창업자', name: '', company_name: '', phone: '', email: '', item: '', region: '', need_fields: [], need_keywords: [], method: '모두', preferred_mentor_ids: [], request_detail: '', source_type: 'direct' })

export default function MtPrograms() {
  const { hasRole } = useAuth()
  const canEdit = hasRole('manager')
  const [programs, setPrograms] = useState([])
  const [pid, setPid] = useState('')
  const [mentees, setMentees] = useState([])
  const [mentors, setMentors] = useState([])
  const [editProg, setEditProg] = useState(null)
  const [editMentee, setEditMentee] = useState(null)
  const [importer, setImporter] = useState(false)

  useEffect(() => { loadPrograms(); supabase.from('mt_mentors').select('id,name,org,fields').eq('status', '활동중').order('name').then(({ data }) => setMentors(data || [])) }, [])
  useEffect(() => { if (pid) loadMentees() }, [pid])

  async function loadPrograms() {
    const { data, error } = await supabase.from('mt_programs').select('*').order('created_at', { ascending: false })
    if (error) { alert(error.message); return }
    setPrograms(data || [])
    if (!pid && data?.length) setPid(data[0].id)
  }
  async function loadMentees() {
    const { data } = await supabase.from('mt_mentees').select('*').eq('program_id', pid).order('created_at')
    setMentees(data || [])
  }

  async function saveProgram() {
    const p = { ...editProg }
    delete p.id; delete p.created_at; delete p.legacy_source
    p.min_grade = p.min_grade ? Number(p.min_grade) : null
    p.sessions = Number(p.sessions) || 3
    p.start_date = p.start_date || null; p.end_date = p.end_date || null
    p.fee_by_grade = Object.fromEntries(Object.entries(p.fee_by_grade || {}).map(([k, v]) => [k, Number(String(v).replace(/,/g, '')) || 0]))
    const { error } = editProg.id ? await supabase.from('mt_programs').update(p).eq('id', editProg.id) : await supabase.from('mt_programs').insert(p)
    if (error) { alert(error.message); return }
    setEditProg(null); loadPrograms()
  }

  async function removeMentee(id) {
    if (!confirm('이 멘티를 삭제할까요? 매칭·수행서류도 함께 삭제됩니다.')) return
    const { error } = await supabase.from('mt_mentees').delete().eq('id', id)
    if (error) alert(error.message); else loadMentees()
  }

  function template() {
    const ws = XLSX.utils.aoa_to_sheet([
      ['구분(예비창업자/창업자/소상공인/중소기업/기타)', '대표자명', '기업명', '연락처', '이메일', '업종·아이템', '지역', '필요분야(세부분야, 쉼표로 구분)', '키워드(쉼표)', '희망방식(모두/대면/비대면)', '요청사항'],
      ['소상공인', '홍길동', '길동분식', '010-0000-0000', 'a@b.com', '분식점', '울산 중구', '온라인·SNS마케팅, 생성형 AI 업무활용', '배달앱, 인스타그램', '모두', '배달 매출 개선'],
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([['대분류', '세부분야'], ...ALL_SUBS.map(s => [s.cat, s.sub])])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '멘티')
    XLSX.utils.book_append_sheet(wb, ws2, '분야목록')
    XLSX.writeFile(wb, 'mentee_upload_template.xlsx')
  }

  function uploadXlsx(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = async evt => {
      const wb = XLSX.read(evt.target.result, { type: 'array' })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).slice(1).filter(r => r[1])
      const subMap = Object.fromEntries(ALL_SUBS.map(s => [s.sub, s]))
      const unknown = new Set()
      const payload = rows.map(r => ({
        program_id: pid,
        mentee_type: MENTEE_TYPES.includes(r[0]) ? r[0] : '기타',
        name: String(r[1] || '').trim(), company_name: String(r[2] || ''), phone: formatPhone(String(r[3] || '')),
        email: String(r[4] || ''), item: String(r[5] || ''), region: String(r[6] || ''),
        need_fields: String(r[7] || '').split(',').map(s => s.trim()).filter(Boolean).map(s => { if (!subMap[s]) unknown.add(s); return subMap[s] }).filter(Boolean),
        need_keywords: String(r[8] || '').split(',').map(s => s.trim()).filter(Boolean),
        method: MENTEE_METHODS.includes(r[9]) ? r[9] : '모두',
        request_detail: String(r[10] || ''), source_type: 'excel',
      }))
      if (!payload.length) { alert('등록할 행이 없습니다.'); return }
      const { error } = await supabase.from('mt_mentees').insert(payload)
      if (error) { alert(error.message); return }
      alert(`${payload.length}명 등록 완료${unknown.size ? `\n※ 분야 목록에 없어 제외된 항목: ${[...unknown].join(', ')}` : ''}`)
      loadMentees()
    }
    reader.readAsArrayBuffer(file)
  }

  const prog = programs.find(p => p.id === pid)
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="멘토링 사업 · 멘티" subtitle="사업별로 멘티(창업자·소상공인)를 등록하고 필요 분야를 입력합니다"
        actions={canEdit && <button onClick={() => setEditProg(emptyProgram())} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2E75B6] text-white text-sm font-semibold"><Plus size={14} />사업 추가</button>} />

      <div className="flex flex-wrap gap-2">
        {programs.map(p => (
          <button key={p.id} onClick={() => setPid(p.id)}
            className={`px-3 py-2 rounded-lg border text-sm text-left ${pid === p.id ? 'border-[#2E75B6] bg-blue-50' : 'bg-white'}`}>
            <div className="font-semibold">{p.name}</div>
            <div className="text-[11px] text-gray-500">{p.year} · {p.sessions}회차 · {p.status}</div>
          </button>
        ))}
        {!programs.length && <div className="text-sm text-gray-400">등록된 사업이 없습니다. '사업 추가'로 시작하세요.</div>}
      </div>

      {prog && (
        <div className="bg-white rounded-xl border">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b">
            <div className="flex-1 text-sm">
              <b>{prog.name}</b>
              <span className="text-xs text-gray-500 ml-2">
                {prog.start_date || '-'} ~ {prog.end_date || '-'} · 최소등급 {prog.min_grade ? `${prog.min_grade}급` : '제한없음'} ·
                회당수당 1급 {Number(prog.fee_by_grade?.[1] || 0).toLocaleString()} / 2급 {Number(prog.fee_by_grade?.[2] || 0).toLocaleString()} / 3급 {Number(prog.fee_by_grade?.[3] || 0).toLocaleString()}원
              </span>
            </div>
            {canEdit && <>
              <button onClick={() => setEditProg({ ...prog, min_grade: prog.min_grade || '' })} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs"><Pencil size={12} />사업 수정</button>
              <button onClick={template} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs"><Download size={12} />엑셀 양식</button>
              <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer"><Upload size={12} />엑셀 일괄등록<input type="file" accept=".xlsx,.xls" className="hidden" onChange={uploadXlsx} /></label>
              <button onClick={() => setImporter(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs"><UserPlus size={12} />기존 DB에서 불러오기</button>
              <button onClick={() => setEditMentee(emptyMentee(pid))} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2E75B6] text-white text-xs"><Plus size={12} />멘티 직접 등록</button>
            </>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500"><tr>{['구분', '대표자', '기업명', '아이템', '지역', '필요분야', '방식', '희망멘토', '상태', ''].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {mentees.length === 0 ? <tr><td colSpan={10} className="py-8 text-center text-gray-400">등록된 멘티가 없습니다.</td></tr>
                  : mentees.map(e => (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-2 text-xs">{e.mentee_type}</td>
                      <td className="px-3 py-2 font-semibold">{e.name}</td>
                      <td className="px-3 py-2 text-xs">{e.company_name}</td>
                      <td className="px-3 py-2 text-xs max-w-[160px] truncate">{e.item}</td>
                      <td className="px-3 py-2 text-xs">{e.region}</td>
                      <td className="px-3 py-2 text-xs max-w-[220px] truncate">{fieldsToLabel(e.need_fields) || <span className="text-amber-600">미입력</span>}</td>
                      <td className="px-3 py-2 text-xs">{e.method}</td>
                      <td className="px-3 py-2 text-xs">{(e.preferred_mentor_ids || []).map(id => mentors.find(m => m.id === id)?.name).filter(Boolean).join(' > ') || '-'}</td>
                      <td className="px-3 py-2 text-xs">{e.status}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{canEdit && <>
                        <button onClick={() => setEditMentee(e)} className="p-1 text-gray-400 hover:text-[#2E75B6]"><Pencil size={13} /></button>
                        <button onClick={() => removeMentee(e.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </>}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editProg && (
        <Modal isOpen onClose={() => setEditProg(null)} title={editProg.id ? '사업 수정' : '사업 추가'}
          footer={<button onClick={saveProgram} className="px-4 py-2 rounded-lg bg-[#2E75B6] text-white text-sm font-semibold">저장</button>}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label required>사업명</Label><input className="form-input" value={editProg.name} onChange={e => setEditProg(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>연도</Label><input type="number" className="form-input" value={editProg.year || ''} onChange={e => setEditProg(p => ({ ...p, year: e.target.value }))} /></div>
            <div><Label>상태</Label><select className="form-input" value={editProg.status} onChange={e => setEditProg(p => ({ ...p, status: e.target.value }))}><option>준비</option><option>운영중</option><option>종료</option></select></div>
            <div><Label>시작일</Label><input type="date" className="form-input" value={editProg.start_date || ''} onChange={e => setEditProg(p => ({ ...p, start_date: e.target.value }))} /></div>
            <div><Label>종료일</Label><input type="date" className="form-input" value={editProg.end_date || ''} onChange={e => setEditProg(p => ({ ...p, end_date: e.target.value }))} /></div>
            <div><Label>멘티당 회차 수</Label><input type="number" min={1} className="form-input" value={editProg.sessions} onChange={e => setEditProg(p => ({ ...p, sessions: e.target.value }))} /></div>
            <div><Label>최소 멘토 등급</Label><select className="form-input" value={editProg.min_grade || ''} onChange={e => setEditProg(p => ({ ...p, min_grade: e.target.value }))}><option value="">제한 없음</option><option value="1">1급</option><option value="2">2급 이상</option><option value="3">3급 이상</option></select></div>
            {[1, 2, 3].map(g => (
              <div key={g}><Label>{g}급 회당 수당(원)</Label><input className="form-input" value={editProg.fee_by_grade?.[g] ?? 0}
                onChange={e => setEditProg(p => ({ ...p, fee_by_grade: { ...p.fee_by_grade, [g]: e.target.value } }))} /></div>
            ))}
            <div><Label>담당자</Label><input className="form-input" value={editProg.staff || ''} onChange={e => setEditProg(p => ({ ...p, staff: e.target.value }))} /></div>
            <div className="col-span-2"><Label>메모</Label><textarea className="form-input" value={editProg.memo || ''} onChange={e => setEditProg(p => ({ ...p, memo: e.target.value }))} /></div>
          </div>
        </Modal>
      )}

      {editMentee && <MenteeEditor mentee={editMentee} mentors={mentors} onClose={() => setEditMentee(null)} onSaved={() => { setEditMentee(null); loadMentees() }} />}
      {importer && <Importer pid={pid} existing={mentees} onClose={() => setImporter(false)} onDone={() => { setImporter(false); loadMentees() }} />}
    </div>
  )
}

function MenteeEditor({ mentee, mentors, onClose, onSaved }) {
  const [e, setE] = useState(mentee)
  const set = (k, v) => setE(p => ({ ...p, [k]: v }))
  async function save() {
    if (!e.name?.trim()) { alert('대표자명을 입력하세요'); return }
    const p = { ...e }; delete p.id; delete p.created_at
    const { error } = e.id ? await supabase.from('mt_mentees').update(p).eq('id', e.id) : await supabase.from('mt_mentees').insert(p)
    if (error) { alert(error.message); return }
    onSaved()
  }
  const pref = e.preferred_mentor_ids || []
  return (
    <Modal isOpen wide onClose={onClose} title={e.id ? '멘티 수정' : '멘티 등록'}
      footer={<button onClick={save} className="px-4 py-2 rounded-lg bg-[#2E75B6] text-white text-sm font-semibold">저장</button>}>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label>구분</Label><select className="form-input" value={e.mentee_type} onChange={x => set('mentee_type', x.target.value)}>{MENTEE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          <div><Label required>대표자명</Label><input className="form-input" value={e.name} onChange={x => set('name', x.target.value)} /></div>
          <div><Label>기업명</Label><input className="form-input" value={e.company_name || ''} onChange={x => set('company_name', x.target.value)} /></div>
          <div><Label>연락처</Label><input className="form-input" value={e.phone || ''} onChange={x => set('phone', formatPhone(x.target.value))} /></div>
          <div><Label>이메일</Label><input className="form-input" value={e.email || ''} onChange={x => set('email', x.target.value)} /></div>
          <div><Label>지역</Label><input className="form-input" placeholder="예: 울산 남구" value={e.region || ''} onChange={x => set('region', x.target.value)} /></div>
          <div className="sm:col-span-2"><Label>업종·아이템</Label><input className="form-input" value={e.item || ''} onChange={x => set('item', x.target.value)} /></div>
          <div><Label>희망 방식</Label><select className="form-input" value={e.method} onChange={x => set('method', x.target.value)}>{MENTEE_METHODS.map(t => <option key={t}>{t}</option>)}</select></div>
        </div>
        <div><Label>필요 분야</Label><FieldPicker value={e.need_fields || []} onChange={v => set('need_fields', v)} /></div>
        <div><Label>키워드</Label><TagInput value={e.need_keywords || []} onChange={v => set('need_keywords', v)} /></div>
        <div><Label>희망 멘토 (1~3순위, 선택)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{[0, 1, 2].map(i => (
            <select key={i} className="form-input" value={pref[i] || ''} onChange={x => {
              const next = [...pref]; next[i] = x.target.value; set('preferred_mentor_ids', next.filter(Boolean))
            }}>
              <option value="">{i + 1}순위 선택 안 함</option>
              {mentors.map(m => <option key={m.id} value={m.id}>{m.name}{m.org ? ` (${m.org})` : ''}</option>)}
            </select>
          ))}</div>
        </div>
        <div><Label>요청사항</Label><textarea className="form-input" value={e.request_detail || ''} onChange={x => set('request_detail', x.target.value)} /></div>
      </div>
    </Modal>
  )
}

const SOURCES = {
  founder: { label: '창업자 DB', table: 'founders', cols: 'id,name,phone,biz,region', map: r => ({ mentee_type: '창업자', name: r.name, phone: r.phone || '', item: r.biz || '', region: r.region || '' }) },
  selected_firm: { label: '선정기업', table: 'selected_firms', cols: 'id,company_name,ceo,phone,email,biz_item,region,program', map: r => ({ mentee_type: '창업자', name: r.ceo || r.company_name, company_name: r.company_name, phone: r.phone || '', email: r.email || '', item: r.biz_item || '', region: r.region || '' }) },
  small_business: { label: '소상공인 신청(멘토매칭)', table: 'small_businesses', cols: 'id,name,company_name,phone,email,item,region', map: r => ({ mentee_type: '소상공인', name: r.name, company_name: r.company_name, phone: r.phone || '', email: r.email || '', item: r.item || '', region: r.region || '' }) },
}

function Importer({ pid, existing, onClose, onDone }) {
  const [src, setSrc] = useState('founder')
  const [rows, setRows] = useState([])
  const [sel, setSel] = useState([])
  const [q, setQ] = useState('')
  useEffect(() => {
    setSel([])
    supabase.from(SOURCES[src].table).select(SOURCES[src].cols).limit(2000).then(({ data, error }) => { if (error) alert(error.message); setRows(data || []) })
  }, [src])
  const already = new Set(existing.filter(e => e.source_type === src).map(e => String(e.source_id)))
  const list = rows.filter(r => !already.has(String(r.id)) && JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
  async function run() {
    const payload = rows.filter(r => sel.includes(r.id)).map(r => ({ program_id: pid, source_type: src, source_id: String(r.id), method: '모두', ...SOURCES[src].map(r) }))
    if (!payload.length) return
    const { error } = await supabase.from('mt_mentees').insert(payload)
    if (error) { alert(error.message); return }
    alert(`${payload.length}명을 불러왔습니다. 필요 분야를 입력해야 자동매칭 정확도가 높아집니다.`)
    onDone()
  }
  return (
    <Modal isOpen wide onClose={onClose} title="기존 DB에서 멘티 불러오기"
      footer={<button onClick={run} disabled={!sel.length} className="px-4 py-2 rounded-lg bg-[#2E75B6] text-white text-sm font-semibold disabled:opacity-50">{sel.length}명 불러오기</button>}>
      <div className="space-y-3">
        <ChipGroup single options={Object.values(SOURCES).map(s => s.label)} value={[SOURCES[src].label]}
          onChange={v => { const k = Object.keys(SOURCES).find(k => SOURCES[k].label === v[0]); if (k) setSrc(k) }} />
        <input className="form-input" placeholder="검색" value={q} onChange={e => setQ(e.target.value)} />
        <div className="max-h-[50vh] overflow-y-auto border rounded-lg">
          <table className="w-full text-xs">
            <tbody>{list.map(r => {
              const v = SOURCES[src].map(r)
              return <tr key={r.id} className="border-t cursor-pointer hover:bg-blue-50" onClick={() => setSel(s => s.includes(r.id) ? s.filter(x => x !== r.id) : [...s, r.id])}>
                <td className="px-2 py-1.5"><input type="checkbox" readOnly checked={sel.includes(r.id)} /></td>
                <td className="px-2 py-1.5 font-semibold">{v.name}</td><td className="px-2 py-1.5">{v.company_name}</td>
                <td className="px-2 py-1.5">{v.item}</td><td className="px-2 py-1.5">{v.region}</td><td className="px-2 py-1.5">{v.phone}</td>
              </tr>
            })}</tbody>
          </table>
          {!list.length && <div className="p-6 text-center text-gray-400 text-xs">불러올 대상이 없습니다.</div>}
        </div>
      </div>
    </Modal>
  )
}
