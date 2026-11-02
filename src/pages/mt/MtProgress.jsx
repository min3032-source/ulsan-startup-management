// 관리자: 진행 관리(제출현황·검토) + 수당 정산
import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/common/PageHeader'
import Modal from '../../components/common/Modal'
import { DOC_FORMS } from '../../lib/mentorFields'
import { StatusBadge, DocForm, FileList, Label } from './mtUi'
import { portalLink, copyText } from './mtHelpers'
import { Download, Loader2, Search, Mail } from 'lucide-react'

export default function MtProgress() {
  const { hasRole } = useAuth()
  const canEdit = hasRole('manager')
  const [tab, setTab] = useState('progress')
  const [programs, setPrograms] = useState([])
  const [pid, setPid] = useState('')
  const [matches, setMatches] = useState([])
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    supabase.from('mt_programs').select('*').order('created_at', { ascending: false }).then(({ data }) => setPrograms(data || []))
  }, [])
  useEffect(() => { load() }, [pid])

  async function load() {
    setLoading(true)
    let mq = supabase.from('mt_matches').select('*, mentor:mt_mentors(id,name,org,grade,email,phone,access_token), mentee:mt_mentees(id,name,company_name,phone,item), program:mt_programs(id,name,sessions,fee_by_grade)')
      .neq('status', '취소').order('created_at', { ascending: false })
    if (pid) mq = mq.eq('program_id', pid)
    const { data: m, error } = await mq
    if (error) { alert(error.message); setLoading(false); return }
    const ids = (m || []).map(x => x.id)
    const { data: d } = ids.length
      ? await supabase.from('mt_documents').select('id,match_id,doc_type,session_no,status,submitted_at,reviewed_at').in('match_id', ids)
      : { data: [] }
    setMatches(m || []); setDocs(d || []); setLoading(false)
  }

  const byMatch = useMemo(() => {
    const map = {}
    for (const d of docs) (map[d.match_id] ||= []).push(d)
    return map
  }, [docs])

  const rows = useMemo(() => matches.map(m => {
    const ds = byMatch[m.id] || []
    const total = m.sessions || m.program?.sessions || 3
    const plan = ds.find(d => d.doc_type === 'plan')
    const report = ds.find(d => d.doc_type === 'report')
    const logs = ds.filter(d => d.doc_type === 'log')
    const pending = ds.filter(d => d.status === '제출').length
    return { m, total, plan, report, logs, pending,
      logApproved: logs.filter(l => l.status === '승인').length,
      logSubmitted: logs.filter(l => ['제출', '승인'].includes(l.status)).length }
  }).filter(r => !q || [r.m.mentor?.name, r.m.mentee?.name, r.m.mentee?.company_name].join(' ').includes(q)), [matches, byMatch, q])

  const settle = useMemo(() => {
    const map = {}
    for (const r of rows) {
      const k = r.m.mentor?.id; if (!k) continue
      const fee = Number(r.m.program?.fee_by_grade?.[r.m.mentor.grade] || 0)
      const o = map[k] ||= { mentor: r.m.mentor, matches: 0, approved: 0, amount: 0, missingGrade: !r.m.mentor.grade }
      o.matches++; o.approved += r.logApproved; o.amount += r.logApproved * fee
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount)
  }, [rows])

  function exportProgress() {
    const data = rows.map(r => ({
      사업: r.m.program?.name, 멘토: r.m.mentor?.name, 멘토소속: r.m.mentor?.org, 멘티: r.m.mentee?.name, 기업명: r.m.mentee?.company_name,
      계획서: r.plan?.status || '미작성', '일지(승인/제출/전체)': `${r.logApproved}/${r.logSubmitted}/${r.total}`, 결과보고: r.report?.status || '미작성', 상태: r.m.status,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), '진행현황')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(settle.map(s => ({
      멘토: s.mentor.name, 소속: s.mentor.org, 등급: s.mentor.grade ? `${s.mentor.grade}급` : '미판정', 매칭수: s.matches, 승인회차: s.approved, '지급예정액(원)': s.amount,
    }))), '수당정산')
    XLSX.writeFile(wb, `mentoring_progress_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  async function remind() {
    const targets = rows.filter(r => r.m.status !== '완료' && (!r.plan || r.logSubmitted < r.total || !r.report) && r.m.mentor?.email)
    if (!targets.length) { alert('독촉 대상이 없습니다.'); return }
    if (!confirm(`미제출 서류가 있는 ${targets.length}건의 멘토에게 안내메일을 보낼까요?`)) return
    let ok = 0
    for (const r of targets) {
      const miss = [!r.plan && '수행계획서', r.logSubmitted < r.total && `수행일지(${r.logSubmitted}/${r.total})`, !r.report && '결과보고서'].filter(Boolean).join(', ')
      const { error } = await supabase.functions.invoke('send-email', { body: {
        to: r.m.mentor.email, subject: '[울산경제일자리진흥원] 멘토링 서류 제출 안내',
        html: `<p>${r.m.mentor.name} 멘토님, ${r.m.mentee?.company_name || r.m.mentee?.name} 멘토링의 미제출 서류가 있습니다: <b>${miss}</b></p>
               <p><a href="${portalLink(r.m.mentor.access_token)}">멘토 포털에서 제출하기</a></p>` } })
      if (!error) ok++
    }
    alert(`${ok}건 발송 완료${ok < targets.length ? `, ${targets.length - ok}건 실패` : ''}`)
  }

  const Cell = ({ d }) => <StatusBadge status={d?.status} />
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="진행 관리 · 정산" subtitle="수행계획서·수행일지·결과보고서 제출 현황을 확인하고 검토(승인/반려)합니다"
        actions={<>
          {canEdit && <button onClick={remind} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm"><Mail size={14} />미제출 독촉</button>}
          <button onClick={exportProgress} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm"><Download size={14} />엑셀</button>
        </>} />
      <div className="flex flex-wrap items-center gap-2">
        {[['progress', '제출 현황'], ['settle', '수당 정산']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-1.5 rounded-lg text-sm border ${tab === k ? 'bg-[#2E75B6] text-white border-[#2E75B6]' : 'bg-white'}`}>{l}</button>
        ))}
        <select className="form-input" style={{ width: 'auto' }} value={pid} onChange={e => setPid(e.target.value)}>
          <option value="">전체 사업</option>{programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-gray-400 pointer-events-none" />
          <input className="form-input" style={{ paddingLeft: 30, width: 224 }} placeholder="멘토·멘티 검색" value={q} onChange={e => setQ(e.target.value)} /></div>
        <span className="text-xs text-gray-500">{rows.length}건 · 검토 대기 {rows.reduce((a, r) => a + r.pending, 0)}건</span>
      </div>

      {loading ? <div className="py-10 text-center"><Loader2 className="inline animate-spin" /></div> : tab === 'progress' ? (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500"><tr>{['사업', '멘토', '멘티', '계획서', '수행일지', '결과보고', '검토대기', '상태'].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={8} className="py-10 text-center text-gray-400">매칭된 건이 없습니다.</td></tr>
                : rows.map(r => (
                  <tr key={r.m.id} className="border-t hover:bg-blue-50/40 cursor-pointer" onClick={() => setOpen(r.m)}>
                    <td className="px-3 py-2 text-xs max-w-[160px] truncate">{r.m.program?.name}</td>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.m.mentor?.name}</td>
                    <td className="px-3 py-2 text-xs">{r.m.mentee?.company_name || r.m.mentee?.name}</td>
                    <td className="px-3 py-2"><Cell d={r.plan} /></td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      <div className="flex gap-0.5">{Array.from({ length: r.total }, (_, i) => {
                        const l = r.logs.find(x => x.session_no === i + 1)
                        const c = { 승인: 'bg-emerald-500', 제출: 'bg-blue-500', 반려: 'bg-red-400', 작성중: 'bg-amber-300' }[l?.status] || 'bg-gray-200'
                        return <span key={i} title={`${i + 1}회차 ${l?.status || '미작성'}`} className={`w-3 h-3 rounded-sm ${c}`} />
                      })}</div>
                    </td>
                    <td className="px-3 py-2"><Cell d={r.report} /></td>
                    <td className="px-3 py-2 text-xs">{r.pending ? <span className="text-blue-600 font-bold">{r.pending}</span> : '-'}</td>
                    <td className="px-3 py-2 text-xs">{r.m.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500"><tr>{['멘토', '소속', '등급', '매칭 수', '승인 회차', '지급 예정액'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {settle.map(s => (
                <tr key={s.mentor.id} className="border-t">
                  <td className="px-3 py-2 font-semibold">{s.mentor.name}</td><td className="px-3 py-2 text-xs">{s.mentor.org}</td>
                  <td className="px-3 py-2 text-xs">{s.mentor.grade ? `${s.mentor.grade}급` : <span className="text-red-500">미판정(수당 0원 처리)</span>}</td>
                  <td className="px-3 py-2">{s.matches}</td><td className="px-3 py-2">{s.approved}</td>
                  <td className="px-3 py-2 font-semibold">{s.amount.toLocaleString()}원</td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50 font-bold"><td className="px-3 py-2" colSpan={4}>합계</td>
                <td className="px-3 py-2">{settle.reduce((a, s) => a + s.approved, 0)}</td>
                <td className="px-3 py-2">{settle.reduce((a, s) => a + s.amount, 0).toLocaleString()}원</td></tr>
            </tbody>
          </table>
          <p className="text-[11px] text-gray-400 p-3">※ 승인된 수행일지 회차 × 사업별 등급 수당 기준입니다. 원천징수 등 세금은 반영되지 않았습니다.</p>
        </div>
      )}

      {open && <MatchDetail match={open} canEdit={canEdit} onClose={() => { setOpen(null); load() }} />}
    </div>
  )
}

function MatchDetail({ match, canEdit, onClose }) {
  const [docs, setDocs] = useState([])
  const [files, setFiles] = useState([])
  const [sel, setSel] = useState({ doc_type: 'plan', session_no: 0 })
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const total = match.sessions || match.program?.sessions || 3

  useEffect(() => { load() }, [])
  async function load() {
    const [{ data: d }, { data: f }] = await Promise.all([
      supabase.from('mt_documents').select('*').eq('match_id', match.id),
      supabase.from('mt_files').select('*').eq('match_id', match.id).order('created_at'),
    ])
    setDocs(d || []); setFiles(f || [])
  }
  const doc = docs.find(d => d.doc_type === sel.doc_type && d.session_no === sel.session_no)
  useEffect(() => { setComment(doc?.review_comment || '') }, [doc?.id])

  async function review(status) {
    if (status === '반려' && !comment.trim()) { alert('반려 사유를 입력하세요.'); return }
    setBusy(true)
    const { error } = await supabase.from('mt_documents').update({ status, review_comment: comment, reviewed_at: new Date().toISOString() }).eq('id', doc.id)
    if (!error && status === '승인' && sel.doc_type === 'report') {
      await supabase.from('mt_matches').update({ status: '완료' }).eq('id', match.id)
      await supabase.from('mt_mentees').update({ status: '완료' }).eq('id', match.mentee_id)
    }
    setBusy(false)
    if (error) alert(error.message); else load()
  }

  async function setMatchStatus(status) {
    if (status === '취소' && !confirm('이 매칭을 취소할까요? 멘토 포털에서 더 이상 보이지 않습니다.')) return
    const { error } = await supabase.from('mt_matches').update({ status }).eq('id', match.id)
    if (status === '취소') await supabase.from('mt_mentees').update({ status: '대기' }).eq('id', match.mentee_id)
    if (error) alert(error.message); else onClose()
  }

  const tabs = [{ doc_type: 'plan', session_no: 0, label: '계획서' },
    ...Array.from({ length: total }, (_, i) => ({ doc_type: 'log', session_no: i + 1, label: `일지 ${i + 1}회` })),
    { doc_type: 'report', session_no: 0, label: '결과보고' }]
  const docFiles = files.filter(f => f.doc_type === sel.doc_type && f.session_no === sel.session_no)

  return (
    <Modal isOpen wide onClose={onClose} title={`${match.mentor?.name} → ${match.mentee?.company_name || match.mentee?.name}`}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>{match.program?.name}</span><span>· 상태 {match.status}</span>
          {match.score != null && <span>· 매칭점수 {match.score}</span>}
          <button onClick={() => copyText(portalLink(match.mentor?.access_token), '멘토 포털 링크가 복사되었습니다.')} className="ml-auto px-2 py-1 rounded border">멘토 포털 링크</button>
          {canEdit && match.status !== '완료' && <button onClick={() => setMatchStatus('완료')} className="px-2 py-1 rounded border">완료 처리</button>}
          {canEdit && <button onClick={() => setMatchStatus('취소')} className="px-2 py-1 rounded border text-red-500">매칭 취소</button>}
        </div>
        <div className="flex flex-wrap gap-1">
          {tabs.map(t => {
            const d = docs.find(x => x.doc_type === t.doc_type && x.session_no === t.session_no)
            const on = sel.doc_type === t.doc_type && sel.session_no === t.session_no
            return <button key={t.label} onClick={() => setSel(t)} className={`px-2.5 py-1.5 rounded-lg text-xs border flex items-center gap-1 ${on ? 'border-[#2E75B6] bg-blue-50' : ''}`}>
              {t.label}<StatusBadge status={d?.status} /></button>
          })}
        </div>
        {doc ? (
          <>
            <div className="text-xs text-gray-500">제출일 {doc.submitted_at?.slice(0, 16).replace('T', ' ') || '-'}{doc.reviewed_at ? ` · 검토일 ${doc.reviewed_at.slice(0, 10)}` : ''}</div>
            <DocForm docType={sel.doc_type} value={doc.content} readOnly />
          </>
        ) : <div className="text-sm text-gray-400 py-6 text-center">아직 작성되지 않았습니다.</div>}
        <div><div className="text-xs font-bold text-gray-600 mb-1">첨부파일</div><FileList files={docFiles} /></div>
        {canEdit && doc && doc.status !== '작성중' && (
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <Label>검토 의견 (반려 시 필수, 멘토에게 표시됩니다)</Label>
            <textarea className="form-input" rows={2} value={comment} onChange={e => setComment(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button disabled={busy} onClick={() => review('반려')} className="px-3 py-1.5 rounded-lg border text-sm text-red-600">반려</button>
              <button disabled={busy} onClick={() => review('승인')} className="px-3 py-1.5 rounded-lg bg-[#2E75B6] text-white text-sm font-semibold">{DOC_FORMS[sel.doc_type].label} 승인</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
