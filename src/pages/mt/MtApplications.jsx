// 관리자(마스터·관리자): 멘토 등록 신청 심사
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/common/PageHeader'
import Modal from '../../components/common/Modal'
import { GRADE_CRITERIA, REQUIRED_DOCS, fieldsToLabel, suggestGrade } from '../../lib/mentorFields'
import { FileList, Label } from './mtUi'
import { copyText, portalLink } from './mtHelpers'
import { Loader2, Copy } from 'lucide-react'

const STATUS_STYLE = { 접수: 'bg-blue-50 text-blue-700', 보완요청: 'bg-amber-50 text-amber-700', 승인: 'bg-emerald-50 text-emerald-700', 반려: 'bg-red-50 text-red-600', 이관: 'bg-gray-100 text-gray-600' }

export default function MtApplications() {
  const { hasRole } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('접수')
  const [open, setOpen] = useState(null)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('mt_applications').select('*').order('created_at', { ascending: false })
    if (error) alert(error.message)
    setRows(data || []); setLoading(false)
  }

  if (!hasRole('admin')) return <div className="p-6 text-sm text-gray-500">멘토 신청서에는 계좌 등 개인정보가 포함되어 있어 마스터·관리자만 열람할 수 있습니다.</div>

  const list = rows.filter(r => !filter || r.status === filter)
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="멘토 신청 심사" subtitle="신청서·증빙 확인 → 등급 판정 → 승인 시 멘토 DB에 등록"
        actions={<button onClick={() => copyText(`${window.location.origin}/mentor-register`, '멘토 등록 신청서 주소가 복사되었습니다.')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm"><Copy size={14} />신청서 주소 복사</button>} />
      <div className="flex gap-1.5">
        {['접수', '보완요청', '승인', '반려', '이관', ''].map(s => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs border ${filter === s ? 'bg-[#2E75B6] text-white border-[#2E75B6]' : 'bg-white'}`}>
            {s || '전체'} ({s ? rows.filter(r => r.status === s).length : rows.length})
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500"><tr>{['접수일', '성명', '소속', '연락처', '전문분야', '희망등급', '상태'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="inline animate-spin" size={16} /></td></tr>
              : list.length === 0 ? <tr><td colSpan={7} className="py-10 text-center text-gray-400">해당 신청이 없습니다.</td></tr>
              : list.map(r => (
                <tr key={r.id} className="border-t hover:bg-blue-50/40 cursor-pointer" onClick={() => setOpen(r)}>
                  <td className="px-3 py-2 text-xs">{r.created_at?.slice(0, 10)}</td>
                  <td className="px-3 py-2 font-semibold">{r.name}</td>
                  <td className="px-3 py-2 text-xs">{r.org}</td>
                  <td className="px-3 py-2 text-xs">{r.phone}</td>
                  <td className="px-3 py-2 text-xs max-w-[280px] truncate">{fieldsToLabel(r.payload?.fields) || r.payload?.expertise_field || '-'}</td>
                  <td className="px-3 py-2 text-xs">{r.requested_grade ? `${r.requested_grade}급` : '-'}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_STYLE[r.status]}`}>{r.status}</span></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {open && <Review app={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); load() }} />}
    </div>
  )
}

function Review({ app, onClose, onDone }) {
  const p = app.payload || {}
  const legacy = p.introduction_parsed || {}
  const evidenceText = [p.position, p.education, ...(p.careers || []).map(c => `${c.position} ${c.org}`), ...(p.licenses || []).map(l => l.name), legacy.education, p.position].join(' ')
  const suggested = suggestGrade(evidenceText)
  const [grade, setGrade] = useState(app.decided_grade || app.requested_grade || suggested)
  const [comment, setComment] = useState(app.review_comment || '')
  const [busy, setBusy] = useState(false)

  async function decide(status) {
    if (status !== '승인' && !comment.trim()) { alert('보완요청·반려 사유를 입력하세요.'); return }
    setBusy(true)
    let mentorId = app.mentor_id
    try {
      if (status === '승인' && !mentorId) {
        const { data: m, error } = await supabase.from('mt_mentors').insert({
          mentor_type: '개인', name: app.name, phone: app.phone, email: app.email,
          org: p.org || app.org || '', position: p.position || legacy.position || '',
          birth_date: p.birth_date || legacy.birth_date || null,
          education: p.education || legacy.education || '', major: p.major || legacy.major || '', address: p.address || legacy.address || '',
          grade: Number(grade) || null, fields: p.fields || [], field_etc: p.field_etc || '',
          legacy_field_text: p.expertise_field || '',
          priority_fields: p.priority_fields || [], keywords: p.keywords || [],
          regions: p.regions || [], methods: p.methods || [],
          educations: p.educations || [], licenses: p.licenses || legacy.licenses || [],
          careers: p.careers || legacy.work_history || [], track_records: p.track_records || legacy.consulting_history || [],
          photo_path: (app.files || []).find(f => f.kind === 'photo')?.path || null,
        }).select('id, access_token').single()
        if (error) throw error
        mentorId = m.id
        if (app.bank_account) {
          const r = await supabase.from('mt_mentor_private').upsert({ mentor_id: m.id, bank_name: app.bank_name, bank_account: app.bank_account, account_holder: app.account_holder })
          if (r.error) throw r.error
        }
        if (p.conflicts?.trim()) {
          await supabase.from('mt_conflicts').insert({ mentor_id: m.id, company_name: p.conflicts.trim(), reason: '등록 신청서 이해관계 신고' })
        }
        if (app.email && confirm('승인되었습니다. 멘토에게 승인 안내 메일(포털 접속 링크 포함)을 보낼까요?')) {
          await supabase.functions.invoke('send-email', { body: {
            to: app.email, subject: '[울산경제일자리진흥원] 전문멘토 등록 승인 안내',
            html: `<p>${app.name} 님, 울산경제일자리진흥원 전문멘토로 등록되었습니다(등급: ${grade}급).</p>
                   <p>멘토링이 배정되면 아래 멘토 포털에서 수행계획서·수행일지·결과보고서를 작성·제출하실 수 있습니다.</p>
                   <p><a href="${portalLink(m.access_token)}">멘토 포털 바로가기</a></p><p>이 링크는 본인 전용이니 다른 사람과 공유하지 마세요.</p>` } })
        }
      }
      const { error } = await supabase.from('mt_applications').update({
        status, decided_grade: status === '승인' ? Number(grade) : null, review_comment: comment,
        mentor_id: mentorId || null, reviewed_at: new Date().toISOString(),
      }).eq('id', app.id)
      if (error) throw error
      onDone()
    } catch (e) {
      alert('처리 실패: ' + e.message)
    } finally { setBusy(false) }
  }

  const Row = ({ k, v }) => v ? <div className="flex gap-2 text-sm"><span className="w-24 shrink-0 text-gray-500 text-xs pt-0.5">{k}</span><span className="whitespace-pre-wrap">{v}</span></div> : null
  const Table = ({ title, rows, cols }) => rows?.length ? (
    <div><div className="text-xs font-bold text-gray-600 mb-1">{title}</div>
      <table className="w-full text-xs border"><tbody>{rows.map((r, i) => <tr key={i} className="border-t">{cols.map(c => <td key={c} className="px-2 py-1">{r[c]}</td>)}</tr>)}</tbody></table></div>
  ) : null

  return (
    <Modal isOpen wide onClose={onClose} title={`멘토 신청 · ${app.name}`}
      footer={app.status !== '승인' && <>
        <button disabled={busy} onClick={() => decide('보완요청')} className="px-3 py-2 rounded-lg border text-sm">보완요청</button>
        <button disabled={busy} onClick={() => decide('반려')} className="px-3 py-2 rounded-lg border text-sm text-red-600">반려</button>
        <button disabled={busy} onClick={() => decide('승인')} className="px-4 py-2 rounded-lg bg-[#2E75B6] text-white text-sm font-semibold">{busy ? '처리 중...' : `${grade}급으로 승인`}</button>
      </>}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <Row k="연락처" v={app.phone} /><Row k="이메일" v={app.email} />
          <Row k="소속/직위" v={[p.org || app.org, p.position].filter(Boolean).join(' · ')} />
          <Row k="생년월일" v={p.birth_date || legacy.birth_date} />
          <Row k="학력/전공" v={[p.education || legacy.education, p.major || legacy.major].filter(Boolean).join(' / ')} />
          <Row k="주소" v={p.address || legacy.address} />
          <Row k="계좌" v={[app.bank_name, app.bank_account, app.account_holder].filter(Boolean).join(' ')} />
        </div>
        <Row k="전문분야" v={fieldsToLabel(p.fields) || p.expertise_field} />
        <Row k="주력분야" v={(p.priority_fields || []).join(' > ')} />
        <Row k="키워드" v={(p.keywords || []).join(', ')} />
        <Row k="지역/방식" v={[(p.regions || []).join(', '), (p.methods || []).join(', ')].filter(Boolean).join(' / ')} />
        <Row k="이해관계" v={p.conflicts} />
        <Table title="학력" rows={p.educations} cols={['period', 'school', 'major', 'degree']} />
        <Table title="자격·면허" rows={p.licenses || legacy.licenses} cols={['name', 'date', 'issuer', 'note']} />
        <Table title="근무경력" rows={p.careers || legacy.work_history} cols={['org', 'period', 'dept', 'position', 'duty', 'project']} />
        <Table title="컨설팅·멘토링·강의 실적" rows={p.track_records || legacy.consulting_history} cols={['agency', 'period', 'project', 'kind', 'field', 'target', 'content']} />
        {app.status === '이관' && <details className="text-xs"><summary className="cursor-pointer text-gray-500">기존 신청서 원본</summary><pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded">{JSON.stringify(p, null, 2)}</pre></details>}

        <div>
          <div className="text-xs font-bold text-gray-600 mb-1">제출서류</div>
          {REQUIRED_DOCS.map(d => {
            const fs = (app.files || []).filter(f => f.kind === d.kind)
            return <div key={d.kind} className="flex gap-2 text-xs py-1 border-b border-gray-100">
              <span className={`w-64 shrink-0 ${!fs.length && d.required ? 'text-red-500' : ''}`}>{d.label}{!fs.length && d.required ? ' (미제출)' : ''}</span>
              <FileList files={fs} />
            </div>
          })}
        </div>

        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
          <div className="text-sm font-bold">등급 판정</div>
          <p className="text-xs text-gray-500">신청 희망: {app.requested_grade ? `${app.requested_grade}급` : '없음'} · 시스템 제안: {suggested}급 (경력·직위 문구 기준, 증빙 확인 후 확정)</p>
          <div className="flex gap-2">{[1, 2, 3].map(g => (
            <label key={g} className={`flex-1 border rounded-lg p-2 text-xs cursor-pointer ${Number(grade) === g ? 'border-[#2E75B6] bg-white' : 'border-gray-200'}`}>
              <input type="radio" checked={Number(grade) === g} onChange={() => setGrade(g)} /> <b>{g}급</b>
              <ul className="list-disc ml-4 text-gray-500 mt-1">{GRADE_CRITERIA[g].slice(0, 3).map(c => <li key={c}>{c}</li>)}</ul>
            </label>
          ))}</div>
          <Label>검토 의견 (보완요청·반려 시 필수)</Label>
          <textarea className="form-input" rows={2} value={comment} onChange={e => setComment(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
