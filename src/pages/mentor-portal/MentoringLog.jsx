import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ChevronLeft, Upload, X, Loader2, CheckCircle } from 'lucide-react'

export default function MentoringLog() {
  const navigate = useNavigate()
  const assignmentId = sessionStorage.getItem('mentoring_assignment_id')
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedSession, setSelectedSession] = useState(1)
  const [maxSessions, setMaxSessions] = useState(7)
  const [logId, setLogId] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef()

  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    if (!assignmentId) { navigate('/mentoring'); return }
    loadAssignment()
  }, [assignmentId])

  useEffect(() => {
    if (assignment) loadLog(selectedSession)
  }, [selectedSession, assignment])

  async function loadAssignment() {
    const { data: a } = await supabase
      .from('mentoring_assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle()
    if (!a) { navigate('/mentoring'); return }
    setAssignment(a)

    const { data: plan } = await supabase
      .from('mentoring_plans')
      .select('sessions')
      .eq('assignment_id', assignmentId)
      .maybeSingle()
    if (plan?.sessions?.length) setMaxSessions(plan.sessions.length)
    setLoading(false)
  }

  async function loadLog(sessionNum) {
    const { data: log } = await supabase
      .from('mentoring_logs')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('session_num', sessionNum)
      .maybeSingle()
    if (log) {
      setLogId(log.id)
      setForm({
        topic: log.topic || '',
        date: log.date || '',
        location_type: log.location_type || '대면',
        location: log.location || '',
        main_content: log.main_content || '',
        advice: log.advice || '',
        mentee_understanding: log.mentee_understanding || '',
        result: log.result || '',
        future_plan: log.future_plan || '',
        photos: log.photos || [],
      })
    } else {
      setLogId(null)
      setForm(emptyForm())
    }
  }

  async function uploadPhoto(file) {
    const ext = file.name.split('.').pop()
    const path = `${assignmentId}/${selectedSession}_${Date.now()}.${ext}`
    setUploadingPhoto(true)
    const { error } = await supabase.storage.from('mentoring-photos').upload(path, file)
    if (error) { alert('업로드 실패: ' + error.message); setUploadingPhoto(false); return }
    const { data: urlData } = supabase.storage.from('mentoring-photos').getPublicUrl(path)
    setForm(f => ({ ...f, photos: [...f.photos, urlData.publicUrl] }))
    setUploadingPhoto(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const now = new Date().toISOString()
    const payload = { assignment_id: assignmentId, session_num: selectedSession, ...form, updated_at: now }
    let err
    if (logId) {
      ;({ error: err } = await supabase.from('mentoring_logs').update(payload).eq('id', logId))
    } else {
      const { data, error } = await supabase
        .from('mentoring_logs')
        .insert({ ...payload, submitted_at: now })
        .select()
        .single()
      err = error
      if (data) setLogId(data.id)
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
            <h1 className="text-base font-extrabold text-white">수행일지</h1>
            <p className="text-xs text-white/70">{assignment?.company_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* 회차 선택 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">회차 선택</h3>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: maxSessions }, (_, i) => i + 1).map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setSelectedSession(num)}
                className="px-3 py-1.5 rounded-xl text-sm font-bold transition"
                style={
                  selectedSession === num
                    ? { background: 'linear-gradient(135deg, #059669, #0d9488)', color: '#fff' }
                    : { background: '#f3f4f6', color: '#6b7280' }
                }
              >
                {num}회차
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-700">{selectedSession}회차 수행일지</h3>

            <Field label="주제">
              <input
                className="form-input"
                value={form.topic}
                onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                placeholder="멘토링 주제"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="일시">
                <input
                  type="date"
                  className="form-input"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </Field>
              <Field label="장소 유형">
                <select
                  className="form-input"
                  value={form.location_type}
                  onChange={e => setForm(f => ({ ...f, location_type: e.target.value }))}
                >
                  <option>대면</option>
                  <option>비대면</option>
                </select>
              </Field>
            </div>

            <Field label="장소">
              <input
                className="form-input"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder={form.location_type === '비대면' ? 'Zoom, Google Meet 등' : '장소명 입력'}
              />
            </Field>

            <Field label="주요 내용">
              <textarea
                className="form-input"
                style={{ minHeight: 80 }}
                value={form.main_content}
                onChange={e => setForm(f => ({ ...f, main_content: e.target.value }))}
                placeholder="멘토링 주요 내용"
              />
            </Field>

            <Field label="조언">
              <textarea
                className="form-input"
                style={{ minHeight: 80 }}
                value={form.advice}
                onChange={e => setForm(f => ({ ...f, advice: e.target.value }))}
                placeholder="멘티에게 제공한 조언"
              />
            </Field>

            <Field label="멘티 이해도">
              <input
                className="form-input"
                value={form.mentee_understanding}
                onChange={e => setForm(f => ({ ...f, mentee_understanding: e.target.value }))}
                placeholder="예: 높음 / 보통 / 낮음"
              />
            </Field>

            <Field label="결과">
              <textarea
                className="form-input"
                style={{ minHeight: 80 }}
                value={form.result}
                onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                placeholder="이번 회차 결과"
              />
            </Field>

            <Field label="추후 계획">
              <textarea
                className="form-input"
                style={{ minHeight: 80 }}
                value={form.future_plan}
                onChange={e => setForm(f => ({ ...f, future_plan: e.target.value }))}
                placeholder="다음 회차 계획"
              />
            </Field>
          </div>

          {/* 사진 업로드 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">현장 사진</h3>
            <div className="flex flex-wrap gap-2">
              {form.photos.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition text-xs gap-1"
              >
                {uploadingPhoto
                  ? <Loader2 size={18} className="animate-spin" />
                  : <><Upload size={18} /><span>사진 추가</span></>
                }
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) uploadPhoto(e.target.files[0])
                e.target.value = ''
              }}
            />
          </div>

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

function emptyForm() {
  return {
    topic: '',
    date: '',
    location_type: '대면',
    location: '',
    main_content: '',
    advice: '',
    mentee_understanding: '',
    result: '',
    future_plan: '',
    photos: [],
  }
}
