// 공개: 멘토 포털 (개인 접속링크 토큰 방식, 로그인 계정 불필요)
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { DOC_FORMS, checkFile, newFileName } from '../../lib/mentorFields'
import { DocForm, FileList, StatusBadge } from './mtUi'
import { BUCKET } from './mtHelpers'
import { Loader2, LogOut, ChevronLeft, Upload, AlertCircle } from 'lucide-react'

const KEY = 'mt_portal_token'

export default function MentorPortal() {
  const [params, setParams] = useSearchParams()
  const [token, setToken] = useState(() => {
    const k = params.get('k')
    if (k) { try { sessionStorage.setItem(KEY, k) } catch { /* ignore */ } return k }
    try { return sessionStorage.getItem(KEY) || '' } catch { return '' }
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!!token)
  const [err, setErr] = useState('')
  const [matchId, setMatchId] = useState(null)

  useEffect(() => { if (params.get('k')) setParams({}, { replace: true }) }, [])
  useEffect(() => { if (token) load() }, [token])

  async function load() {
    setLoading(true); setErr('')
    const { data: d, error } = await supabase.rpc('mt_portal_get', { p_token: token })
    setLoading(false)
    if (error || !d) {
      setErr(error ? '접속 중 오류가 발생했습니다.' : '유효하지 않은 접속 링크입니다. 담당자에게 링크 재발급을 요청하세요.')
      try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
      setData(null); return
    }
    setData(d)
  }

  function logout() { try { sessionStorage.removeItem(KEY) } catch { /* ignore */ } setToken(''); setData(null); setMatchId(null) }

  if (!token || (!data && !loading)) return <Gate err={err} onEnter={t => setToken(t.trim())} />
  if (loading && !data) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>

  const match = data.matches.find(m => m.id === matchId)
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0D1B2A] text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          {match ? <button onClick={() => setMatchId(null)}><ChevronLeft size={20} /></button> : null}
          <div className="flex-1">
            <div className="text-[11px] text-white/60">울산경제일자리진흥원 멘토 포털</div>
            <div className="font-bold">{data.mentor.name} 멘토님{data.mentor.grade ? ` · ${data.mentor.grade}급` : ''}</div>
          </div>
          <button onClick={logout} className="text-white/70 hover:text-white flex items-center gap-1 text-xs"><LogOut size={14} />나가기</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-5">
        {match ? <MatchView token={token} match={match} onChanged={load} /> : (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-700">배정된 멘토링 ({data.matches.length}건)</h2>
            {!data.matches.length && <div className="bg-white rounded-xl border p-8 text-center text-sm text-gray-400">아직 배정된 멘토링이 없습니다.</div>}
            {data.matches.map(m => {
              const docs = m.documents || []
              const plan = docs.find(d => d.doc_type === 'plan')
              const report = docs.find(d => d.doc_type === 'report')
              const logsDone = docs.filter(d => d.doc_type === 'log' && ['제출', '승인'].includes(d.status)).length
              const rejected = docs.some(d => d.status === '반려')
              return (
                <button key={m.id} onClick={() => setMatchId(m.id)} className="w-full text-left bg-white rounded-xl border p-4 hover:border-[#2E75B6]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="font-semibold">{m.mentee.company_name || m.mentee.name} <span className="text-xs text-gray-500">{m.mentee.name}</span></div>
                      <div className="text-xs text-gray-500">{m.program.name} · {m.mentee.item}</div>
                    </div>
                    {rejected && <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1"><AlertCircle size={12} />반려 있음</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs items-center">
                    <span>계획서 <StatusBadge status={plan?.status} /></span>
                    <span>일지 <b>{logsDone}</b>/{m.sessions}</span>
                    <span>결과보고 <StatusBadge status={report?.status} /></span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function Gate({ err, onEnter }) {
  const [v, setV] = useState('')
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form onSubmit={e => { e.preventDefault(); if (v.trim()) onEnter(decodeURIComponent((v.match(/k=([^&\s]+)/) || [null, v])[1])) }}
        className="bg-white rounded-2xl shadow p-6 w-full max-w-sm space-y-3">
        <h1 className="font-bold text-lg">멘토 포털</h1>
        <p className="text-xs text-gray-500">안내받은 멘토 전용 링크로 접속하거나, 링크(또는 접속코드)를 붙여넣으세요.</p>
        {err && <p className="text-xs text-red-500">{err}</p>}
        <input className="form-input" value={v} onChange={e => setV(e.target.value)} placeholder="접속 링크 또는 코드" />
        <button className="w-full py-2 rounded-lg bg-[#2E75B6] text-white font-semibold text-sm">접속</button>
      </form>
    </div>
  )
}

function MatchView({ token, match, onChanged }) {
  const tabs = [{ doc_type: 'plan', session_no: 0, label: '수행계획서' },
    ...Array.from({ length: match.sessions }, (_, i) => ({ doc_type: 'log', session_no: i + 1, label: `수행일지 ${i + 1}회` })),
    { doc_type: 'report', session_no: 0, label: '결과보고서' }]
  const [sel, setSel] = useState(tabs[0])
  const docOf = t => (match.documents || []).find(d => d.doc_type === t.doc_type && d.session_no === t.session_no)
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border p-4 text-sm">
        <div className="font-bold">{match.mentee.company_name || match.mentee.name}</div>
        <div className="text-xs text-gray-500 mt-1">{match.program.name} · 대표 {match.mentee.name} · {match.mentee.phone} {match.mentee.email}</div>
        {match.mentee.item && <div className="text-xs text-gray-500">아이템: {match.mentee.item}</div>}
        {match.mentee.request_detail && <div className="text-xs mt-1 bg-slate-50 rounded p-2">요청사항: {match.mentee.request_detail}</div>}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => {
          const on = sel.doc_type === t.doc_type && sel.session_no === t.session_no
          return <button key={t.label} onClick={() => setSel(t)} className={`shrink-0 px-3 py-2 rounded-lg text-xs border bg-white flex items-center gap-1 ${on ? 'border-[#2E75B6] text-[#2E75B6] font-semibold' : ''}`}>
            {t.label} <StatusBadge status={docOf(t)?.status} /></button>
        })}
      </div>
      <DocEditor key={`${sel.doc_type}-${sel.session_no}`} token={token} match={match} tab={sel} doc={docOf(sel)} onChanged={onChanged} />
    </div>
  )
}

function DocEditor({ token, match, tab, doc, onChanged }) {
  const [content, setContent] = useState(doc?.content || {})
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const locked = doc && ['제출', '승인'].includes(doc.status)
  const form = DOC_FORMS[tab.doc_type]
  const files = (match.files || []).filter(f => f.doc_type === tab.doc_type && f.session_no === tab.session_no)

  async function save(submit) {
    if (submit) {
      const miss = form.fields.filter(f => f.required && !String(content[f.key] || '').trim()).map(f => f.label)
      if (miss.length) { alert(`필수 항목을 입력하세요: ${miss.join(', ')}`); return }
      if (!confirm('제출하면 담당자 검토 전까지 수정할 수 없습니다. 제출할까요?')) return
    }
    setBusy(true)
    const { error } = await supabase.rpc('mt_portal_save_doc', {
      p_token: token, p_match: match.id, p_doc_type: tab.doc_type, p_session: tab.session_no, p_content: content, p_submit: submit,
    })
    setBusy(false)
    if (error) { alert('저장 실패: ' + error.message); return }
    alert(submit ? '제출되었습니다.' : '임시저장되었습니다.')
    onChanged()
  }

  async function upload(list) {
    const arr = Array.from(list || [])
    for (const f of arr) { const e = checkFile(f); if (e) { alert(`${f.name}: ${e}`); return } }
    setUploading(true)
    for (const file of arr) {
      const path = `m/${token}/${match.id}/${tab.doc_type}-${tab.session_no}-${newFileName(file.name)}`
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined })
      if (error) { alert(`${file.name} 업로드 실패: ${error.message}`); continue }
      const { error: e2 } = await supabase.rpc('mt_portal_add_file', {
        p_token: token, p_match: match.id, p_doc_type: tab.doc_type, p_session: tab.session_no,
        p_path: path, p_name: file.name, p_size: file.size, p_mime: file.type || '',
      })
      if (e2) alert(`${file.name} 등록 실패: ${e2.message}`)
    }
    setUploading(false)
    onChanged()
  }

  async function removeFile(f) {
    if (!confirm(`${f.file_name} 파일을 삭제할까요?`)) return
    const { error } = await supabase.rpc('mt_portal_delete_file', { p_token: token, p_file: f.id })
    if (error) alert(error.message); else onChanged()
  }

  return (
    <div className="bg-white rounded-xl border p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-sm flex-1">{tab.doc_type === 'log' ? `${form.label} ${tab.session_no}회차` : form.label}</h3>
        <StatusBadge status={doc?.status} />
      </div>
      {doc?.status === '반려' && doc.review_comment && (
        <div className="bg-red-50 text-red-700 text-xs rounded-lg p-3"><b>반려 사유:</b> {doc.review_comment}<br />내용을 수정한 뒤 다시 제출해 주세요.</div>
      )}
      {doc?.status === '승인' && doc.review_comment && <div className="bg-emerald-50 text-emerald-700 text-xs rounded-lg p-3">담당자 의견: {doc.review_comment}</div>}
      <DocForm docType={tab.doc_type} value={content} onChange={setContent} readOnly={locked} sessions={match.sessions} />
      <div className="border-t pt-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-gray-600 flex-1">첨부파일 {tab.doc_type === 'log' ? '(현장 사진, 확인서 등)' : '(작성한 양식 파일 등)'}</span>
          {!locked && <label className="flex items-center gap-1 text-xs text-[#2E75B6] font-semibold cursor-pointer">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} 파일 올리기
            <input type="file" multiple className="hidden" disabled={uploading} onChange={e => { upload(e.target.files); e.target.value = '' }} />
          </label>}
        </div>
        <FileList files={files} onDelete={locked ? null : removeFile} />
        <p className="text-[11px] text-gray-400 mt-1">PDF·HWP·워드·엑셀·이미지, 파일당 20MB 이하</p>
      </div>
      {!locked && (
        <div className="flex gap-2 justify-end">
          <button disabled={busy} onClick={() => save(false)} className="px-4 py-2 rounded-lg border text-sm">임시저장</button>
          <button disabled={busy} onClick={() => save(true)} className="px-4 py-2 rounded-lg bg-[#2E75B6] text-white text-sm font-semibold">{busy ? '처리 중...' : '제출'}</button>
        </div>
      )}
    </div>
  )
}
