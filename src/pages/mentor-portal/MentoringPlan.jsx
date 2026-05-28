import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ChevronLeft, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react'

function emptySession(num) {
  return { session_num: num, date: '', location: '', content: '' }
}

export default function MentoringPlan() {
  const navigate = useNavigate()
  const assignmentId = sessionStorage.getItem('mentoring_assignment_id')
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [planId, setPlanId] = useState(null)

  const [form, setForm] = useState({
    company_status: '',
    problem_diagnosis: '',
    goal: '',
    start_date: '',
    end_date: '',
  })
  const [sessions, setSessions] = useState([emptySession(1), emptySession(2), emptySession(3)])

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

    const { data: plan } = await supabase
      .from('mentoring_plans')
      .select('*')
      .eq('assignment_id', assignmentId)
      .maybeSingle()
    if (plan) {
      setPlanId(plan.id)
      setForm({
        company_status: plan.company_status || '',
        problem_diagnosis: plan.problem_diagnosis || '',
        goal: plan.goal || '',
        start_date: plan.start_date || '',
        end_date: plan.end_date || '',
      })
      if (plan.sessions?.length) setSessions(plan.sessions)
    }
    setLoading(false)
  }

  function addSession() {
    if (sessions.length >= 7) return
    setSessions(prev => [...prev, emptySession(prev.length + 1)])
  }

  function removeSession(idx) {
    if (sessions.length <= 1) return
    setSessions(prev =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, session_num: i + 1 }))
    )
  }

  function updateSession(idx, field, value) {
    setSessions(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const now = new Date().toISOString()
    const payload = { assignment_id: assignmentId, ...form, sessions, updated_at: now }
    let err
    if (planId) {
      ;({ error: err } = await supabase.from('mentoring_plans').update(payload).eq('id', planId))
    } else {
      const { data, error } = await supabase
        .from('mentoring_plans')
        .insert({ ...payload, submitted_at: now })
        .select()
        .single()
      err = error
      if (data) setPlanId(data.id)
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
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }} className="px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/mentoring/dashboard')} className="text-white/80 hover:text-white transition">
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-white">수행계획서</h1>
            <p className="text-xs text-white/70">{assignment?.company_name}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Card title="창업기업 현황">
          <textarea
            className="form-input"
            style={{ minHeight: 100 }}
            value={form.company_status}
            onChange={e => setForm(f => ({ ...f, company_status: e.target.value }))}
            placeholder="창업기업의 현황을 입력하세요"
          />
        </Card>

        <Card title="기업문제 진단">
          <textarea
            className="form-input"
            style={{ minHeight: 100 }}
            value={form.problem_diagnosis}
            onChange={e => setForm(f => ({ ...f, problem_diagnosis: e.target.value }))}
            placeholder="기업이 직면한 문제를 진단하세요"
          />
        </Card>

        <Card title="목표">
          <textarea
            className="form-input"
            style={{ minHeight: 80 }}
            value={form.goal}
            onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
            placeholder="멘토링을 통해 달성할 목표를 입력하세요"
          />
        </Card>

        <Card title="멘토링 기간">
          <div className="flex items-center gap-3">
            <input
              type="date"
              className="form-input flex-1"
              value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            />
            <span className="text-gray-400 text-sm shrink-0">~</span>
            <input
              type="date"
              className="form-input flex-1"
              value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
            />
          </div>
        </Card>

        <Card title={`회차별 일정 (${sessions.length} / 7회차)`}>
          <div className="space-y-3">
            {sessions.map((s, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                    {s.session_num}회차
                  </span>
                  {sessions.length > 1 && (
                    <button type="button" onClick={() => removeSession(idx)} className="text-gray-300 hover:text-red-400 transition">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">일정</label>
                    <input
                      type="date"
                      className="form-input"
                      value={s.date}
                      onChange={e => updateSession(idx, 'date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">장소</label>
                    <input
                      className="form-input"
                      value={s.location}
                      onChange={e => updateSession(idx, 'location', e.target.value)}
                      placeholder="장소 입력"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">내용</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: 60 }}
                    value={s.content}
                    onChange={e => updateSession(idx, 'content', e.target.value)}
                    placeholder="회차 내용을 입력하세요"
                  />
                </div>
              </div>
            ))}
          </div>
          {sessions.length < 7 && (
            <button
              type="button"
              onClick={addSession}
              className="mt-3 flex items-center gap-1.5 text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition"
            >
              <Plus size={15} /> 회차 추가
            </button>
          )}
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  )
}
