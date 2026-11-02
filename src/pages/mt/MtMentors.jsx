// 관리자: 멘토 DB
import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatPhone } from '../../utils/formatPhone'
import PageHeader from '../../components/common/PageHeader'
import Modal from '../../components/common/Modal'
import { FIELD_CATEGORIES, REGIONS, METHODS, fieldsToLabel } from '../../lib/mentorFields'
import { FieldPicker, ChipGroup, TagInput, RowsInput, Label } from './mtUi'
import { portalLink, copyText } from './mtHelpers'
import { Plus, Search, Download, Link2, RefreshCw, Loader2 } from 'lucide-react'

const emptyMentor = () => ({
  mentor_type: '개인', name: '', phone: '', email: '', org: '', position: '', education: '', major: '', address: '',
  grade: null, fields: [], field_etc: '', priority_fields: [], keywords: [], regions: [], methods: [],
  careers: [], track_records: [], licenses: [], intro: '', max_active_matches: 5, status: '활동중', memo: '',
})

export default function MtMentors() {
  const { hasRole } = useAuth()
  const isAdmin = hasRole('admin')
  const canEdit = hasRole('manager')
  const [rows, setRows] = useState([])
  const [active, setActive] = useState({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [grade, setGrade] = useState('')
  const [region, setRegion] = useState('')
  const [status, setStatus] = useState('활동중')
  const [edit, setEdit] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: m, error }, { data: mt }] = await Promise.all([
      supabase.from('mt_mentors').select('*').order('name'),
      supabase.from('mt_matches').select('mentor_id,status').in('status', ['확정', '진행중']),
    ])
    if (error) alert('멘토 목록을 불러오지 못했습니다. DB 마이그레이션 실행 여부를 확인하세요.\n' + error.message)
    const cnt = {}
    ;(mt || []).forEach(x => { cnt[x.mentor_id] = (cnt[x.mentor_id] || 0) + 1 })
    setRows(m || []); setActive(cnt); setLoading(false)
  }

  const list = useMemo(() => rows.filter(r => {
    if (status && r.status !== status) return false
    if (grade && String(r.grade || '') !== grade) return false
    if (cat && !(r.fields || []).some(f => f.cat === cat)) return false
    if (region && !(r.regions || []).includes(region) && !(r.regions || []).includes('전국')) return false
    if (q) {
      const t = [r.name, r.org, r.phone, r.email, fieldsToLabel(r.fields), (r.keywords || []).join(' '), r.legacy_field_text, r.intro].join(' ').toLowerCase()
      if (!t.includes(q.toLowerCase())) return false
    }
    return true
  }), [rows, q, cat, grade, region, status])

  function exportXlsx() {
    const data = list.map(r => ({
      구분: r.mentor_type, 성명: r.name, 소속: r.org, 직위: r.position, 연락처: r.phone, 이메일: r.email,
      등급: r.grade ? `${r.grade}급` : '', 전문분야: fieldsToLabel(r.fields) || r.legacy_field_text,
      주력분야: (r.priority_fields || []).join(', '), 키워드: (r.keywords || []).join(', '),
      활동지역: (r.regions || []).join(', '), 방식: (r.methods || []).join(', '),
      진행중매칭: active[r.id] || 0, 상태: r.status,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), '멘토DB')
    XLSX.writeFile(wb, `mentor_db_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="멘토 DB" subtitle="멘토링 통합관리 · 전문분야·등급·활동지역 기준으로 관리합니다"
        actions={<>
          <button onClick={exportXlsx} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm"><Download size={14} />엑셀</button>
          {canEdit && <button onClick={() => setEdit(emptyMentor())} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2E75B6] text-white text-sm font-semibold"><Plus size={14} />멘토 등록</button>}
        </>} />

      <div className="bg-white rounded-xl border p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400 pointer-events-none" />
          <input className="form-input" style={{ paddingLeft: 30 }} placeholder="이름·소속·분야·키워드 검색" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <select className="form-input" style={{ width: 'auto' }} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">전체 분야</option>{FIELD_CATEGORIES.map(c => <option key={c.cat}>{c.cat}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto' }} value={grade} onChange={e => setGrade(e.target.value)}>
          <option value="">전체 등급</option><option value="1">1급</option><option value="2">2급</option><option value="3">3급</option>
        </select>
        <select className="form-input" style={{ width: 'auto' }} value={region} onChange={e => setRegion(e.target.value)}>
          <option value="">전체 지역</option>{REGIONS.filter(r => r !== '전국').map(r => <option key={r}>{r}</option>)}
        </select>
        <select className="form-input" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">전체 상태</option><option>활동중</option><option>휴식중</option><option>종료</option>
        </select>
        <span className="text-xs text-gray-500">{list.length}명</span>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>{['구분', '성명', '소속/직위', '등급', '전문분야', '지역', '방식', '진행 매칭', '상태'].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} className="py-10 text-center text-gray-400"><Loader2 className="inline animate-spin" size={16} /></td></tr>
              : list.length === 0 ? <tr><td colSpan={9} className="py-10 text-center text-gray-400">등록된 멘토가 없습니다.</td></tr>
              : list.map(r => (
                <tr key={r.id} className="border-t hover:bg-blue-50/40 cursor-pointer" onClick={() => setEdit(r)}>
                  <td className="px-3 py-2 text-xs text-gray-500">{r.mentor_type}</td>
                  <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.name}</td>
                  <td className="px-3 py-2 text-xs">{r.org}{r.position ? ` · ${r.position}` : ''}</td>
                  <td className="px-3 py-2">{r.grade ? `${r.grade}급` : <span className="text-xs text-amber-600">미판정</span>}</td>
                  <td className="px-3 py-2 text-xs max-w-[260px] truncate">{fieldsToLabel(r.fields) || <span className="text-gray-400">{r.legacy_field_text || '-'}</span>}</td>
                  <td className="px-3 py-2 text-xs">{(r.regions || []).join(', ') || '-'}</td>
                  <td className="px-3 py-2 text-xs">{(r.methods || []).join(', ') || '-'}</td>
                  <td className="px-3 py-2 text-xs">{active[r.id] || 0} / {r.max_active_matches}</td>
                  <td className="px-3 py-2 text-xs">{r.status}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {edit && <MentorEditor mentor={edit} isAdmin={isAdmin} canEdit={canEdit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
    </div>
  )
}

export function MentorEditor({ mentor, isAdmin, canEdit, onClose, onSaved }) {
  const [m, setM] = useState(mentor)
  const [priv, setPriv] = useState({ bank_name: '', bank_account: '', account_holder: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setM(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (isAdmin && mentor.id) {
      supabase.from('mt_mentor_private').select('*').eq('mentor_id', mentor.id).maybeSingle()
        .then(({ data }) => data && setPriv(data))
    }
  }, [mentor.id, isAdmin])

  async function save() {
    if (!m.name?.trim()) { alert('성명을 입력하세요'); return }
    setSaving(true)
    const payload = { ...m }
    ;['id', 'created_at', 'updated_at', 'access_token', 'legacy_source', 'legacy_id'].forEach(k => delete payload[k])
    payload.grade = m.grade ? Number(m.grade) : null
    payload.max_active_matches = Number(m.max_active_matches) || 5
    let id = m.id, error
    if (id) ({ error } = await supabase.from('mt_mentors').update(payload).eq('id', id))
    else {
      const r = await supabase.from('mt_mentors').insert(payload).select('id').single()
      error = r.error; id = r.data?.id
    }
    if (!error && isAdmin && id && (priv.bank_account || priv.bank_name)) {
      const r = await supabase.from('mt_mentor_private').upsert({ mentor_id: id, bank_name: priv.bank_name, bank_account: priv.bank_account, account_holder: priv.account_holder })
      error = r.error
    }
    setSaving(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    onSaved()
  }

  async function reissue() {
    if (!confirm('접속 링크를 새로 발급하면 기존 링크는 더 이상 사용할 수 없습니다. 계속할까요?')) return
    const { data, error } = await supabase.rpc('mt_reissue_token', { p_mentor: m.id })
    if (error) { alert(error.message); return }
    set('access_token', data)
    copyText(portalLink(data), '새 접속 링크가 복사되었습니다.')
  }

  const ro = !canEdit
  return (
    <Modal isOpen onClose={onClose} wide title={m.id ? `멘토 정보 · ${m.name}` : '멘토 등록'}
      footer={canEdit && <button disabled={saving} onClick={save} className="px-4 py-2 rounded-lg bg-[#2E75B6] text-white text-sm font-semibold">{saving ? '저장 중...' : '저장'}</button>}>
      <fieldset disabled={ro} className="space-y-4">
        {m.id && m.access_token && (
          <div className="flex flex-wrap items-center gap-2 bg-blue-50 rounded-lg p-3 text-xs">
            <Link2 size={14} className="text-[#2E75B6]" />
            <span className="font-semibold">멘토 포털 접속 링크</span>
            <button type="button" onClick={() => copyText(portalLink(m.access_token), '접속 링크가 복사되었습니다. 멘토에게 전달하세요.')} className="px-2 py-1 rounded bg-white border">링크 복사</button>
            {canEdit && <button type="button" onClick={reissue} className="px-2 py-1 rounded bg-white border flex items-center gap-1"><RefreshCw size={11} />재발급</button>}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><Label>구분</Label><select className="form-input" value={m.mentor_type} onChange={e => set('mentor_type', e.target.value)}><option>개인</option><option>기업</option></select></div>
          <div><Label required>성명</Label><input className="form-input" value={m.name} onChange={e => set('name', e.target.value)} /></div>
          <div><Label>상태</Label><select className="form-input" value={m.status} onChange={e => set('status', e.target.value)}><option>활동중</option><option>휴식중</option><option>종료</option></select></div>
          <div><Label>소속</Label><input className="form-input" value={m.org || ''} onChange={e => set('org', e.target.value)} /></div>
          <div><Label>직위</Label><input className="form-input" value={m.position || ''} onChange={e => set('position', e.target.value)} /></div>
          <div><Label>등급</Label><select className="form-input" value={m.grade || ''} onChange={e => set('grade', e.target.value)}><option value="">미판정</option><option value="1">1급</option><option value="2">2급</option><option value="3">3급</option></select></div>
          <div><Label>연락처</Label><input className="form-input" value={m.phone || ''} onChange={e => set('phone', formatPhone(e.target.value))} /></div>
          <div><Label>이메일</Label><input className="form-input" value={m.email || ''} onChange={e => set('email', e.target.value)} /></div>
          <div><Label>동시 진행 가능 매칭 수</Label><input type="number" min={1} className="form-input" value={m.max_active_matches} onChange={e => set('max_active_matches', e.target.value)} /></div>
          <div><Label>최종학력</Label><input className="form-input" value={m.education || ''} onChange={e => set('education', e.target.value)} /></div>
          <div><Label>전공</Label><input className="form-input" value={m.major || ''} onChange={e => set('major', e.target.value)} /></div>
          <div><Label>주소</Label><input className="form-input" value={m.address || ''} onChange={e => set('address', e.target.value)} /></div>
        </div>
        <div><Label>전문분야</Label><FieldPicker value={m.fields || []} onChange={v => set('fields', v)} />
          {m.legacy_field_text && <p className="text-[11px] text-amber-600 mt-1">기존 DB 분야 기재: {m.legacy_field_text} (위에서 세부분야를 선택해 주세요)</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>주력분야 (최대 3개)</Label>
            <ChipGroup options={(m.fields || []).map(f => f.sub).filter(Boolean)} value={m.priority_fields || []}
              onChange={v => set('priority_fields', v.slice(0, 3))} /></div>
          <div><Label>키워드</Label><TagInput value={m.keywords || []} onChange={v => set('keywords', v)} /></div>
          <div><Label>활동지역</Label><ChipGroup options={REGIONS} value={m.regions || []} onChange={v => set('regions', v)} /></div>
          <div><Label>멘토링 방식</Label><ChipGroup options={METHODS} value={m.methods || []} onChange={v => set('methods', v)} /></div>
        </div>
        <div><Label>소개·주요 경력 요약</Label><textarea className="form-input" rows={3} value={m.intro || ''} onChange={e => set('intro', e.target.value)} /></div>
        <div><Label>근무경력</Label><RowsInput value={m.careers || []} onChange={v => set('careers', v)}
          columns={[{ key: 'org', label: '소속' }, { key: 'period', label: '기간' }, { key: 'position', label: '직위' }, { key: 'duty', label: '담당업무' }]} /></div>
        <div><Label>컨설팅·멘토링·강의 실적</Label><RowsInput value={m.track_records || []} onChange={v => set('track_records', v)}
          columns={[{ key: 'agency', label: '수행기관' }, { key: 'period', label: '기간' }, { key: 'project', label: '사업명' }, { key: 'kind', label: '구분' }]} /></div>
        <div><Label>자격·면허</Label><RowsInput value={m.licenses || []} onChange={v => set('licenses', v)}
          columns={[{ key: 'name', label: '자격증명' }, { key: 'date', label: '발급일자' }, { key: 'issuer', label: '발급기관' }, { key: 'note', label: '비고' }]} /></div>
        {isAdmin && (
          <div className="border-t pt-3">
            <Label>수당 지급 계좌 (마스터·관리자만 표시)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input className="form-input" placeholder="은행명" value={priv.bank_name || ''} onChange={e => setPriv(p => ({ ...p, bank_name: e.target.value }))} />
              <input className="form-input" placeholder="계좌번호" value={priv.bank_account || ''} onChange={e => setPriv(p => ({ ...p, bank_account: e.target.value }))} />
              <input className="form-input" placeholder="예금주" value={priv.account_holder || ''} onChange={e => setPriv(p => ({ ...p, account_holder: e.target.value }))} />
            </div>
          </div>
        )}
        <div><Label>메모</Label><textarea className="form-input" rows={2} value={m.memo || ''} onChange={e => set('memo', e.target.value)} /></div>
      </fieldset>
    </Modal>
  )
}
