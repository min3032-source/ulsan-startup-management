import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/formatPhone'
import {
  Plus, X, Loader2, CheckCircle2, Circle, Eye, RefreshCw,
  Trash2, ChevronDown, ChevronUp
} from 'lucide-react'

const emptyForm = () => ({
  mentor_name: '', mentor_org: '', mentor_phone: '',
  company_name: '', founder_name: '', founder_phone: '',
  item: '', password: '',
})

export default function MentoringAdmin() {
  const [form, setForm] = useState(emptyForm())
  const [registering, setRegistering] = useState(false)
  const [assignments, setAssignments] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [popup, setPopup] = useState(null) // { type: 'plan'|'log'|'report', assignmentId, data }
  const [popupLoading, setPopupLoading] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data: list } = await supabase
      .from('mentoring_assignments')
      .select('*')
      .order('created_at', { ascending: false })

    if (!list) { setLoading(false); return }
    setAssignments(list)

    const ids = list.map(a => a.id)
    const [{ data: plans }, { data: logs }, { data: reports }] = await Promise.all([
      supabase.from('mentoring_plans').select('assignment_id').in('assignment_id', ids),
      supabase.from('mentoring_logs').select('assignment_id, session_num').in('assignment_id', ids),
      supabase.from('mentoring_reports').select('assignment_id').in('assignment_id', ids),
    ])

    const map = {}
    ids.forEach(id => { map[id] = { plan: false, logCount: 0, report: false } })
    ;(plans || []).forEach(p => { map[p.assignment_id].plan = true })
    ;(logs || []).forEach(l => { map[l.assignment_id].logCount++ })
    ;(reports || []).forEach(r => { map[r.assignment_id].report = true })
    setStatusMap(map)
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!form.mentor_name.trim() || !form.company_name.trim() || !form.password.trim()) {
      alert('멘토명, 창업기업명, 비밀번호는 필수입니다.')
      return
    }
    setRegistering(true)
    const { error } = await supabase.from('mentoring_assignments').insert({
      ...form,
      created_at: new Date().toISOString(),
    })
    setRegistering(false)
    if (error) { alert('등록 실패: ' + error.message); return }
    setForm(emptyForm())
    setShowForm(false)
    loadAll()
  }

  async function handleDelete(id) {
    if (!confirm('이 배정을 삭제하시겠습니까? 제출된 서류도 함께 삭제됩니다.')) return
    await Promise.all([
      supabase.from('mentoring_plans').delete().eq('assignment_id', id),
      supabase.from('mentoring_logs').delete().eq('assignment_id', id),
      supabase.from('mentoring_reports').delete().eq('assignment_id', id),
    ])
    await supabase.from('mentoring_assignments').delete().eq('id', id)
    loadAll()
  }

  async function openPopup(type, assignmentId) {
    setPopupLoading(true)
    setPopup({ type, assignmentId, data: null })
    let data = null
    if (type === 'plan') {
      const { data: d } = await supabase.from('mentoring_plans').select('*').eq('assignment_id', assignmentId).maybeSingle()
      data = d
    } else if (type === 'log') {
      const { data: d } = await supabase.from('mentoring_logs').select('*').eq('assignment_id', assignmentId).order('session_num')
      data = d
    } else if (type === 'report') {
      const { data: d } = await supabase.from('mentoring_reports').select('*').eq('assignment_id', assignmentId).maybeSingle()
      data = d
    }
    setPopup({ type, assignmentId, data })
    setPopupLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }} className="px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white">멘토링 담당자 관리</h1>
            <p className="text-xs text-white/70 mt-0.5">멘토 배정 등록 및 제출 현황 관리</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition"
            >
              <RefreshCw size={14} /> 새로고침
            </button>
            <button
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-emerald-700 text-sm font-bold transition hover:bg-emerald-50"
            >
              {showForm ? <ChevronUp size={14} /> : <Plus size={14} />}
              {showForm ? '접기' : '멘토 배정 등록'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* 등록 폼 */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-4">멘토 배정 등록</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField label="멘토명 *">
                  <input className="form-input" value={form.mentor_name}
                    onChange={e => setForm(f => ({ ...f, mentor_name: e.target.value }))}
                    placeholder="홍길동" />
                </FormField>
                <FormField label="소속">
                  <input className="form-input" value={form.mentor_org}
                    onChange={e => setForm(f => ({ ...f, mentor_org: e.target.value }))}
                    placeholder="소속 기관/회사" />
                </FormField>
                <FormField label="멘토 연락처">
                  <input className="form-input" value={form.mentor_phone}
                    onChange={e => setForm(f => ({ ...f, mentor_phone: formatPhone(e.target.value) }))}
                    placeholder="010-0000-0000" maxLength={13} />
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField label="창업기업명 *">
                  <input className="form-input" value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="(주)울산창업" />
                </FormField>
                <FormField label="대표자명">
                  <input className="form-input" value={form.founder_name}
                    onChange={e => setForm(f => ({ ...f, founder_name: e.target.value }))}
                    placeholder="대표자명" />
                </FormField>
                <FormField label="대표자 연락처">
                  <input className="form-input" value={form.founder_phone}
                    onChange={e => setForm(f => ({ ...f, founder_phone: formatPhone(e.target.value) }))}
                    placeholder="010-0000-0000" maxLength={13} />
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="아이템">
                  <input className="form-input" value={form.item}
                    onChange={e => setForm(f => ({ ...f, item: e.target.value }))}
                    placeholder="사업 아이템 설명" />
                </FormField>
                <FormField label="비밀번호 *">
                  <input className="form-input" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="멘토 접속 비밀번호" />
                </FormField>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setForm(emptyForm()); setShowForm(false) }}
                  className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition">
                  취소
                </button>
                <button type="submit" disabled={registering}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition"
                  style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
                  {registering ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {registering ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 제출 현황 테이블 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">전체 제출 현황</h2>
            <span className="text-xs text-gray-400">{assignments.length}건</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-emerald-500" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">등록된 배정이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">멘토명</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">창업기업</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">수행계획서</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">수행일지</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">결과보고서</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assignments.map(a => {
                    const st = statusMap[a.id] || {}
                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800">{a.mentor_name}</p>
                          <p className="text-xs text-gray-400">{a.mentor_org}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-700">{a.company_name}</p>
                          <p className="text-xs text-gray-400">{a.founder_name}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <DocBadge
                            submitted={st.plan}
                            onClick={() => st.plan && openPopup('plan', a.id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <DocBadge
                            submitted={st.logCount > 0}
                            label={st.logCount > 0 ? `${st.logCount}회차` : undefined}
                            onClick={() => st.logCount > 0 && openPopup('log', a.id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <DocBadge
                            submitted={st.report}
                            onClick={() => st.report && openPopup('report', a.id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="p-1.5 text-gray-300 hover:text-red-400 transition rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 팝업 */}
      {popup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-800">
                {popup.type === 'plan' && '수행계획서'}
                {popup.type === 'log' && '수행일지'}
                {popup.type === 'report' && '결과보고서'}
              </h3>
              <button onClick={() => setPopup(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {popupLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-emerald-500" />
                </div>
              ) : popup.type === 'plan' ? (
                <PlanView data={popup.data} />
              ) : popup.type === 'log' ? (
                <LogView data={popup.data} />
              ) : (
                <ReportView data={popup.data} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocBadge({ submitted, label, onClick }) {
  if (submitted) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
      >
        <Eye size={11} /> {label || '제출완료'}
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 bg-gray-50">
      <Circle size={11} /> 미제출
    </span>
  )
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-400 shrink-0 w-28">{label}</span>
      <span className="text-xs text-gray-700 whitespace-pre-wrap flex-1">{value}</span>
    </div>
  )
}

function PlanView({ data }) {
  if (!data) return <p className="text-sm text-gray-400">데이터가 없습니다.</p>
  return (
    <div className="space-y-3 text-sm">
      <Row label="창업기업 현황" value={data.company_status} />
      <Row label="기업문제 진단" value={data.problem_diagnosis} />
      <Row label="목표" value={data.goal} />
      <Row label="기간" value={data.start_date && data.end_date ? `${data.start_date} ~ ${data.end_date}` : ''} />
      {data.sessions?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2">회차별 일정</p>
          <div className="space-y-2">
            {data.sessions.map(s => (
              <div key={s.session_num} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-emerald-700 mb-1">{s.session_num}회차</p>
                <p className="text-xs text-gray-500">{s.date} | {s.location}</p>
                <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LogView({ data }) {
  if (!data?.length) return <p className="text-sm text-gray-400">데이터가 없습니다.</p>
  return (
    <div className="space-y-4">
      {data.map(log => (
        <div key={log.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-emerald-700 mb-2">{log.session_num}회차</p>
          <Row label="주제" value={log.topic} />
          <Row label="일시" value={log.date} />
          <Row label="장소" value={`${log.location_type} | ${log.location}`} />
          <Row label="주요내용" value={log.main_content} />
          <Row label="조언" value={log.advice} />
          <Row label="멘티 이해도" value={log.mentee_understanding} />
          <Row label="결과" value={log.result} />
          <Row label="추후계획" value={log.future_plan} />
          {log.photos?.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-400 mb-2">현장 사진</p>
              <div className="flex gap-2 flex-wrap">
                {log.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ReportView({ data }) {
  if (!data) return <p className="text-sm text-gray-400">데이터가 없습니다.</p>
  const steep = data.steep || {}
  const c3 = data.analysis_3c || {}
  const swot = data.swot || {}
  const canvas = data.lean_canvas || {}
  const quant = data.quantitative_effect || {}
  const evals = [
    { label: '창업자 역량', val: data.eval_founder_capability },
    { label: '지원 효과성', val: data.eval_support_effectiveness },
    { label: '매출 증진', val: data.eval_sales_increase },
    { label: '고용 창출', val: data.eval_employment_creation },
  ]
  return (
    <div className="space-y-4 text-sm">
      <Section title="기업진단 요약 및 목표">
        <Row label="진단 요약" value={data.diagnosis_summary} />
        <Row label="목표" value={data.goal} />
      </Section>
      <Section title="STEEP 분석">
        <Row label="S (사회)" value={steep.social} />
        <Row label="T (기술)" value={steep.technology} />
        <Row label="E (경제)" value={steep.economic} />
        <Row label="E (환경)" value={steep.environmental} />
        <Row label="P (정치)" value={steep.political} />
      </Section>
      <Section title="3C 분석">
        <Row label="Customer" value={c3.customer} />
        <Row label="Competitor" value={c3.competitor} />
        <Row label="Company" value={c3.company} />
      </Section>
      <Section title="SWOT 분석">
        <Row label="강점 (S)" value={swot.strengths} />
        <Row label="약점 (W)" value={swot.weaknesses} />
        <Row label="기회 (O)" value={swot.opportunities} />
        <Row label="위협 (T)" value={swot.threats} />
      </Section>
      <Section title="전략적 방향성">
        <Row label="방향성" value={data.strategic_direction} />
      </Section>
      <Section title="린캔버스">
        <Row label="문제" value={canvas.problem} />
        <Row label="고객 세그먼트" value={canvas.customer_segments} />
        <Row label="가치 제안" value={canvas.unique_value_proposition} />
        <Row label="솔루션" value={canvas.solution} />
        <Row label="채널" value={canvas.channels} />
        <Row label="수익원" value={canvas.revenue_streams} />
        <Row label="비용 구조" value={canvas.cost_structure} />
        <Row label="핵심 지표" value={canvas.key_metrics} />
        <Row label="경쟁 우위" value={canvas.unfair_advantage} />
      </Section>
      <Section title="BM전략">
        <Row label="BM전략" value={data.bm_strategy} />
      </Section>
      <Section title="지원효과">
        <div className="overflow-x-auto mb-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-2 text-gray-500">항목</th>
                <th className="text-center p-2 text-gray-500">지원 전</th>
                <th className="text-center p-2 text-gray-500">지원 후</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'sales', label: '매출액 (만원)' },
                { key: 'employment', label: '고용인원 (명)' },
                { key: 'investment', label: '투자유치 (만원)' },
              ].map(({ key, label }) => (
                <tr key={key} className="border-t border-gray-100">
                  <td className="p-2">{label}</td>
                  <td className="p-2 text-center">{quant[`${key}_before`] || '-'}</td>
                  <td className="p-2 text-center">{quant[`${key}_after`] || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Row label="정성적 효과" value={data.qualitative_effect} />
      </Section>
      <Section title="평가">
        <div className="grid grid-cols-2 gap-2">
          {evals.map(({ label, val }) => (
            <div key={label} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-600">{label}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                val === '상' ? 'bg-emerald-100 text-emerald-700'
                : val === '중' ? 'bg-amber-100 text-amber-700'
                : val === '하' ? 'bg-red-100 text-red-600'
                : 'text-gray-400'
              }`}>{val || '-'}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 mb-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">{title}</p>
      <div className="px-1">{children}</div>
    </div>
  )
}
