import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ChevronLeft, Loader2, CheckCircle } from 'lucide-react'

const EVAL_OPTIONS = ['상', '중', '하']
const EVAL_ITEMS = [
  { key: 'eval_founder_capability', label: '창업자 역량' },
  { key: 'eval_support_effectiveness', label: '지원 효과성' },
  { key: 'eval_sales_increase', label: '매출 증진' },
  { key: 'eval_employment_creation', label: '고용 창출' },
]
const QUANT_ROWS = [
  { key: 'sales', label: '매출액 (만원)' },
  { key: 'employment', label: '고용인원 (명)' },
  { key: 'investment', label: '투자유치 (만원)' },
]

function emptyForm() {
  return {
    diagnosis_summary: '',
    goal: '',
    steep: { social: '', technology: '', economic: '', environmental: '', political: '' },
    analysis_3c: { customer: '', competitor: '', company: '' },
    swot: { strengths: '', weaknesses: '', opportunities: '', threats: '' },
    strategic_direction: '',
    lean_canvas: {
      problem: '', customer_segments: '', unique_value_proposition: '',
      solution: '', channels: '', revenue_streams: '',
      cost_structure: '', key_metrics: '', unfair_advantage: '',
    },
    bm_strategy: '',
    quantitative_effect: {
      sales_before: '', sales_after: '',
      employment_before: '', employment_after: '',
      investment_before: '', investment_after: '',
    },
    qualitative_effect: '',
    eval_founder_capability: '',
    eval_support_effectiveness: '',
    eval_sales_increase: '',
    eval_employment_creation: '',
  }
}

export default function MentoringReport() {
  const navigate = useNavigate()
  const assignmentId = sessionStorage.getItem('mentoring_assignment_id')
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reportId, setReportId] = useState(null)
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    if (!assignmentId) { navigate('/mentoring'); return }
    loadData()
  }, [assignmentId])

  async function loadData() {
    setLoading(true)
    const { data: a } = await supabase
      .from('mentoring_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle()
    if (!a) { navigate('/mentoring'); return }
    setAssignment(a)

    const { data: report } = await supabase
      .from('mentoring_reports')
      .select('*')
      .eq('assignment_id', assignmentId)
      .maybeSingle()
    if (report) {
      setReportId(report.id)
      const empty = emptyForm()
      setForm({
        diagnosis_summary: report.diagnosis_summary || '',
        goal: report.goal || '',
        steep: { ...empty.steep, ...(report.steep || {}) },
        analysis_3c: { ...empty.analysis_3c, ...(report.analysis_3c || {}) },
        swot: { ...empty.swot, ...(report.swot || {}) },
        strategic_direction: report.strategic_direction || '',
        lean_canvas: { ...empty.lean_canvas, ...(report.lean_canvas || {}) },
        bm_strategy: report.bm_strategy || '',
        quantitative_effect: { ...empty.quantitative_effect, ...(report.quantitative_effect || {}) },
        qualitative_effect: report.qualitative_effect || '',
        eval_founder_capability: report.eval_founder_capability || '',
        eval_support_effectiveness: report.eval_support_effectiveness || '',
        eval_sales_increase: report.eval_sales_increase || '',
        eval_employment_creation: report.eval_employment_creation || '',
      })
    }
    setLoading(false)
  }

  function setNested(key, subKey, value) {
    setForm(f => ({ ...f, [key]: { ...f[key], [subKey]: value } }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const now = new Date().toISOString()
    const payload = { assignment_id: assignmentId, ...form, updated_at: now }
    let err
    if (reportId) {
      ;({ error: err } = await supabase.from('mentoring_reports').update(payload).eq('id', reportId))
    } else {
      const { data, error } = await supabase
        .from('mentoring_reports')
        .insert({ ...payload, submitted_at: now })
        .select()
        .single()
      err = error
      if (data) setReportId(data.id)
    }
    setSaving(false)
    if (err) { alert('저장 실패: ' + err.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }} className="px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/mentoring/dashboard')} className="text-white/80 hover:text-white transition">
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-white">결과보고서</h1>
            <p className="text-xs text-white/70">{assignment?.company_name}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* 기업진단 요약 & 목표 */}
        <Card title="기업진단 요약 및 목표">
          <Field label="기업진단 요약">
            <textarea className="form-input" style={{ minHeight: 80 }}
              value={form.diagnosis_summary}
              onChange={e => setForm(f => ({ ...f, diagnosis_summary: e.target.value }))}
              placeholder="기업진단 요약 내용" />
          </Field>
          <Field label="목표">
            <textarea className="form-input" style={{ minHeight: 80 }}
              value={form.goal}
              onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
              placeholder="멘토링 목표" />
          </Field>
        </Card>

        {/* STEEP 분석 */}
        <Card title="STEEP 분석">
          {[
            { key: 'social', label: 'S - Social (사회)' },
            { key: 'technology', label: 'T - Technology (기술)' },
            { key: 'economic', label: 'E - Economic (경제)' },
            { key: 'environmental', label: 'E - Environmental (환경)' },
            { key: 'political', label: 'P - Political (정치)' },
          ].map(({ key, label }) => (
            <Field key={key} label={label}>
              <textarea className="form-input" style={{ minHeight: 64 }}
                value={form.steep[key]}
                onChange={e => setNested('steep', key, e.target.value)}
                placeholder={`${label} 분석 내용`} />
            </Field>
          ))}
        </Card>

        {/* 3C 분석 */}
        <Card title="3C 분석">
          {[
            { key: 'customer', label: 'Customer (고객)' },
            { key: 'competitor', label: 'Competitor (경쟁사)' },
            { key: 'company', label: 'Company (자사)' },
          ].map(({ key, label }) => (
            <Field key={key} label={label}>
              <textarea className="form-input" style={{ minHeight: 64 }}
                value={form.analysis_3c[key]}
                onChange={e => setNested('analysis_3c', key, e.target.value)}
                placeholder={`${label} 분석`} />
            </Field>
          ))}
        </Card>

        {/* SWOT 분석 */}
        <Card title="SWOT 분석">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'strengths', label: 'S - 강점', color: 'text-blue-600' },
              { key: 'weaknesses', label: 'W - 약점', color: 'text-red-500' },
              { key: 'opportunities', label: 'O - 기회', color: 'text-emerald-600' },
              { key: 'threats', label: 'T - 위협', color: 'text-orange-500' },
            ].map(({ key, label, color }) => (
              <div key={key}>
                <label className={`block text-xs font-bold mb-1 ${color}`}>{label}</label>
                <textarea className="form-input" style={{ minHeight: 80 }}
                  value={form.swot[key]}
                  onChange={e => setNested('swot', key, e.target.value)}
                  placeholder={label} />
              </div>
            ))}
          </div>
        </Card>

        {/* 전략적 방향성 */}
        <Card title="전략적 방향성">
          <textarea className="form-input" style={{ minHeight: 80 }}
            value={form.strategic_direction}
            onChange={e => setForm(f => ({ ...f, strategic_direction: e.target.value }))}
            placeholder="전략적 방향성 입력" />
        </Card>

        {/* 린캔버스 */}
        <Card title="린캔버스 (Lean Canvas)">
          {[
            { key: 'problem', label: '문제 (Problem)' },
            { key: 'customer_segments', label: '고객 세그먼트 (Customer Segments)' },
            { key: 'unique_value_proposition', label: '가치 제안 (Unique Value Proposition)' },
            { key: 'solution', label: '솔루션 (Solution)' },
            { key: 'channels', label: '채널 (Channels)' },
            { key: 'revenue_streams', label: '수익원 (Revenue Streams)' },
            { key: 'cost_structure', label: '비용 구조 (Cost Structure)' },
            { key: 'key_metrics', label: '핵심 지표 (Key Metrics)' },
            { key: 'unfair_advantage', label: '경쟁 우위 (Unfair Advantage)' },
          ].map(({ key, label }) => (
            <Field key={key} label={label}>
              <textarea className="form-input" style={{ minHeight: 64 }}
                value={form.lean_canvas[key]}
                onChange={e => setNested('lean_canvas', key, e.target.value)}
                placeholder={label} />
            </Field>
          ))}
        </Card>

        {/* BM전략 */}
        <Card title="BM전략">
          <textarea className="form-input" style={{ minHeight: 100 }}
            value={form.bm_strategy}
            onChange={e => setForm(f => ({ ...f, bm_strategy: e.target.value }))}
            placeholder="비즈니스 모델 전략 입력" />
        </Card>

        {/* 멘토링 지원효과 */}
        <Card title="멘토링 지원효과">
          {/* 정량적 */}
          <h4 className="text-xs font-bold text-gray-600 mb-2">정량적 효과 (전 / 후 비교)</h4>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 font-semibold text-gray-500 rounded-l-lg">항목</th>
                  <th className="text-center p-2 font-semibold text-gray-500">지원 전</th>
                  <th className="text-center p-2 font-semibold text-gray-500 rounded-r-lg">지원 후</th>
                </tr>
              </thead>
              <tbody>
                {QUANT_ROWS.map(({ key, label }) => (
                  <tr key={key} className="border-t border-gray-100">
                    <td className="p-2 text-gray-600 font-medium">{label}</td>
                    <td className="p-2">
                      <input className="form-input text-center" style={{ fontSize: 12 }}
                        value={form.quantitative_effect[`${key}_before`]}
                        onChange={e => setNested('quantitative_effect', `${key}_before`, e.target.value)}
                        placeholder="0" />
                    </td>
                    <td className="p-2">
                      <input className="form-input text-center" style={{ fontSize: 12 }}
                        value={form.quantitative_effect[`${key}_after`]}
                        onChange={e => setNested('quantitative_effect', `${key}_after`, e.target.value)}
                        placeholder="0" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 정성적 */}
          <h4 className="text-xs font-bold text-gray-600 mb-2">정성적 효과</h4>
          <textarea className="form-input" style={{ minHeight: 80 }}
            value={form.qualitative_effect}
            onChange={e => setForm(f => ({ ...f, qualitative_effect: e.target.value }))}
            placeholder="정성적 지원효과를 입력하세요" />
        </Card>

        {/* 평가 */}
        <Card title="평가">
          <div className="space-y-4">
            {EVAL_ITEMS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <div className="flex gap-2">
                  {EVAL_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, [key]: opt }))}
                      className="px-3 py-1.5 rounded-xl text-sm font-bold transition border"
                      style={
                        form[key] === opt
                          ? { background: opt === '상' ? '#059669' : opt === '중' ? '#d97706' : '#dc2626', color: '#fff', borderColor: 'transparent' }
                          : { background: '#fff', color: '#9ca3af', borderColor: '#e5e7eb' }
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition"
          style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : null}
          {saving ? '저장 중...' : saved ? '저장 완료!' : '저장하기'}
        </button>
      </form>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
      <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1 font-medium">{label}</label>
      {children}
    </div>
  )
}
