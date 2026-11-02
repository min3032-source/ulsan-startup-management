// 관리자: 자동매칭 (추천 → 담당자 확정)
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/common/PageHeader'
import Modal from '../../components/common/Modal'
import { recommend, autoAssign, scorePair } from '../../lib/mentorMatching'
import { fieldsToLabel } from '../../lib/mentorFields'
import { portalLink } from './mtHelpers'
import { Wand2, Check, Loader2, Mail } from 'lucide-react'

export default function MtMatching() {
  const { hasRole, profile } = useAuth()
  const canEdit = hasRole('manager')
  const [programs, setPrograms] = useState([])
  const [pid, setPid] = useState('')
  const [mentors, setMentors] = useState([])
  const [mentees, setMentees] = useState([])
  const [conflicts, setConflicts] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [notify, setNotify] = useState(true)
  const [preview, setPreview] = useState(null)
  const [manual, setManual] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.from('mt_programs').select('*').neq('status', '종료').order('created_at', { ascending: false })
      .then(({ data }) => { setPrograms(data || []); if (data?.length) setPid(data[0].id) })
  }, [])
  useEffect(() => { if (pid) load() }, [pid])

  async function load() {
    setLoading(true)
    const [{ data: m }, { data: e }, { data: act }, { data: c }] = await Promise.all([
      supabase.from('mt_mentors').select('*').eq('status', '활동중'),
      supabase.from('mt_mentees').select('*').eq('program_id', pid).eq('status', '대기').order('created_at'),
      supabase.from('mt_matches').select('mentor_id').in('status', ['확정', '진행중']),
      supabase.from('mt_conflicts').select('mentor_id, mentee_id, company_name'),
    ])
    const cnt = {}
    ;(act || []).forEach(x => { cnt[x.mentor_id] = (cnt[x.mentor_id] || 0) + 1 })
    setMentors((m || []).map(x => ({ ...x, activeCount: cnt[x.id] || 0 })))
    setMentees(e || [])
    const set = new Set()
    for (const x of c || []) {
      if (x.mentee_id) set.add(`${x.mentor_id}|${x.mentee_id}`)
      if (x.company_name) for (const me of e || []) {
        const names = x.company_name.split(/[,\n]/).map(s => s.trim()).filter(s => s.length >= 2)
        if (names.some(n => (me.company_name || '').includes(n) || (me.name || '') === n)) set.add(`${x.mentor_id}|${me.id}`)
      }
    }
    setConflicts(set)
    setLoading(false)
  }

  const prog = programs.find(p => p.id === pid)
  const opts = useMemo(() => ({ minGrade: prog?.min_grade || null, conflicts }), [prog, conflicts])
  const recs = useMemo(() => Object.fromEntries(mentees.map(e => [e.id, recommend(e, mentors, opts, 3)])), [mentees, mentors, opts])

  async function confirmPairs(pairs) {
    if (!pairs.length) return
    setBusy(true)
    const rows = pairs.map(p => ({
      program_id: pid, mentor_id: p.mentor.id, mentee_id: p.mentee.id, score: p.score,
      score_detail: p.reasons, status: '확정', staff: profile?.name || '',
    }))
    const { error } = await supabase.from('mt_matches').insert(rows)
    if (error) { setBusy(false); alert('매칭 저장 실패: ' + error.message); return }
    await supabase.from('mt_mentees').update({ status: '매칭완료' }).in('id', pairs.map(p => p.mentee.id))
    let sent = 0, failed = 0
    if (notify) {
      for (const p of pairs) {
        if (!p.mentor.email) { failed++; continue }
        const { error: mailErr } = await supabase.functions.invoke('send-email', { body: {
          to: p.mentor.email,
          subject: `[울산경제일자리진흥원] 멘토링 배정 안내 - ${prog?.name || ''}`,
          html: `<p>${p.mentor.name} 멘토님, 아래와 같이 멘토링이 배정되었습니다.</p>
                 <ul><li>사업: ${prog?.name || ''}</li><li>멘티: ${p.mentee.company_name || ''} ${p.mentee.name} (${p.mentee.item || ''})</li>
                 <li>회차: ${prog?.sessions || 3}회</li></ul>
                 <p>멘토 포털에서 수행계획서 → 수행일지 → 결과보고서 순으로 작성·제출해 주세요.</p>
                 <p><a href="${portalLink(p.mentor.access_token)}">멘토 포털 바로가기</a> (본인 전용 링크)</p>` } })
        mailErr ? failed++ : sent++
      }
    }
    setBusy(false); setPreview(null); setManual(null)
    alert(`${pairs.length}건 매칭 확정${notify ? ` · 안내메일 ${sent}건 발송${failed ? `, ${failed}건 실패(이메일 없음 또는 발송 오류)` : ''}` : ''}`)
    load()
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="자동 매칭" subtitle="멘티의 필요분야·지역·방식·희망멘토와 멘토의 전문분야·등급·업무량을 점수화해 추천합니다" />
      <div className="bg-white rounded-xl border p-3 flex flex-wrap items-center gap-3">
        <select className="form-input" style={{ width: 'auto' }} value={pid} onChange={e => setPid(e.target.value)}>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="text-xs text-gray-500">매칭 대기 {mentees.length}명 · 활동 멘토 {mentors.length}명{prog?.min_grade ? ` · ${prog.min_grade}급 이상만` : ''}</span>
        <label className="flex items-center gap-1 text-xs ml-auto"><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} /><Mail size={12} />확정 시 멘토에게 안내메일</label>
        {canEdit && <button disabled={!mentees.length} onClick={() => setPreview(autoAssign(mentees, mentors, opts))}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2E75B6] text-white text-sm font-semibold disabled:opacity-50"><Wand2 size={14} />일괄 자동배정</button>}
      </div>

      {loading ? <div className="py-10 text-center"><Loader2 className="inline animate-spin" /></div> : (
        <div className="space-y-2">
          {!mentees.length && <div className="bg-white rounded-xl border p-8 text-center text-sm text-gray-400">매칭 대기 중인 멘티가 없습니다. '사업·멘티' 메뉴에서 멘티를 등록하세요.</div>}
          {mentees.map(e => (
            <div key={e.id} className="bg-white rounded-xl border p-4 flex flex-col lg:flex-row gap-3">
              <div className="lg:w-64 shrink-0">
                <div className="font-semibold text-sm">{e.company_name || e.name} <span className="text-xs text-gray-500">{e.name}</span></div>
                <div className="text-xs text-gray-500">{e.mentee_type} · {e.region || '지역 미입력'} · {e.method}</div>
                <div className="text-xs mt-1">{fieldsToLabel(e.need_fields) || <span className="text-amber-600">필요분야 미입력</span>}</div>
                {e.item && <div className="text-xs text-gray-400 truncate">{e.item}</div>}
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                {(recs[e.id] || []).map((r, i) => (
                  <div key={r.mentor.id} className={`rounded-lg border p-2.5 ${i === 0 ? 'border-[#2E75B6] bg-blue-50/40' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{r.mentor.name}<span className="text-[11px] text-gray-500 ml-1">{r.mentor.grade ? `${r.mentor.grade}급` : ''} {r.mentor.org}</span></div>
                      <span className="text-xs font-bold text-[#2E75B6]">{r.score}점</span>
                    </div>
                    <ul className="text-[11px] text-gray-500 mt-1 space-y-0.5">{r.reasons.map(t => <li key={t}>· {t}</li>)}</ul>
                    {canEdit && <button disabled={busy} onClick={() => confirmPairs([{ mentee: e, ...r }])}
                      className="mt-2 w-full flex items-center justify-center gap-1 text-xs py-1 rounded bg-white border hover:border-[#2E75B6]"><Check size={12} />이 멘토로 확정</button>}
                  </div>
                ))}
                {!(recs[e.id] || []).length && <div className="text-xs text-gray-400 md:col-span-3 py-3">조건에 맞는 추천 멘토가 없습니다. 필요분야를 입력하거나 직접 지정하세요.</div>}
              </div>
              {canEdit && <button onClick={() => setManual(e)} className="self-start text-xs text-gray-500 underline whitespace-nowrap">직접 지정</button>}
            </div>
          ))}
        </div>
      )}

      {preview && (
        <Modal isOpen wide onClose={() => setPreview(null)} title={`일괄 자동배정 미리보기 (${preview.result.length}건)`}
          footer={<button disabled={busy || !preview.result.length} onClick={() => confirmPairs(preview.result)} className="px-4 py-2 rounded-lg bg-[#2E75B6] text-white text-sm font-semibold">{busy ? '처리 중...' : '전체 확정'}</button>}>
          <table className="w-full text-xs">
            <thead className="bg-gray-50"><tr>{['멘티', '배정 멘토', '점수', '근거', ''].map(h => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr></thead>
            <tbody>{preview.result.map((p, i) => (
              <tr key={p.mentee.id} className="border-t align-top">
                <td className="px-2 py-1.5">{p.mentee.company_name || p.mentee.name}</td>
                <td className="px-2 py-1.5 font-semibold">{p.mentor.name}</td>
                <td className="px-2 py-1.5">{p.score}</td>
                <td className="px-2 py-1.5 text-gray-500">{p.reasons.join(' · ')}</td>
                <td className="px-2 py-1.5"><button className="text-red-500" onClick={() => setPreview(v => ({ ...v, result: v.result.filter((_, idx) => idx !== i), unassigned: [...v.unassigned, p.mentee] }))}>제외</button></td>
              </tr>
            ))}</tbody>
          </table>
          {preview.unassigned.length > 0 && <p className="text-xs text-amber-600 mt-3">미배정 {preview.unassigned.length}명: {preview.unassigned.map(e => e.company_name || e.name).join(', ')} — 조건에 맞는 멘토가 없거나 정원이 찼습니다.</p>}
        </Modal>
      )}

      {manual && <ManualPick mentee={manual} mentors={mentors} opts={opts} busy={busy} onClose={() => setManual(null)} onPick={r => confirmPairs([{ mentee: manual, ...r }])} />}
    </div>
  )
}

function ManualPick({ mentee, mentors, opts, busy, onClose, onPick }) {
  const [q, setQ] = useState('')
  const list = mentors.filter(m => (m.name + m.org + fieldsToLabel(m.fields)).includes(q))
    .map(m => ({ mentor: m, ...scorePair(m, mentee, opts) }))
    .sort((a, b) => b.score - a.score)
  return (
    <Modal isOpen wide onClose={onClose} title={`멘토 직접 지정 · ${mentee.company_name || mentee.name}`}>
      <input className="form-input mb-2" placeholder="멘토 검색" value={q} onChange={e => setQ(e.target.value)} />
      <div className="max-h-[55vh] overflow-y-auto space-y-1">
        {list.map(r => (
          <div key={r.mentor.id} className="flex items-center gap-2 border rounded-lg p-2 text-xs">
            <div className="flex-1"><b className="text-sm">{r.mentor.name}</b> {r.mentor.grade ? `${r.mentor.grade}급` : ''} {r.mentor.org}
              <div className="text-gray-500">{fieldsToLabel(r.mentor.fields) || r.mentor.legacy_field_text}</div>
              <div className={r.excluded ? 'text-red-500' : 'text-gray-400'}>{r.excluded ? `제외 사유: ${r.reasons[0]}` : r.reasons.join(' · ')}</div></div>
            <span className="font-bold text-[#2E75B6]">{r.excluded ? '-' : `${r.score}점`}</span>
            <button disabled={busy} onClick={() => { if (r.excluded && !confirm(`${r.reasons[0]} — 그래도 배정할까요?`)) return; onPick(r) }}
              className="px-2 py-1 rounded border">지정</button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
