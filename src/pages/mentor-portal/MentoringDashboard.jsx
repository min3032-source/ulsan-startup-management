import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { FileText, BookOpen, BarChart2, LogOut, CheckCircle, Circle, ChevronRight, Loader2 } from 'lucide-react'

export default function MentoringDashboard() {
  const navigate = useNavigate()
  const assignmentId = sessionStorage.getItem('mentoring_assignment_id')
  const [assignment, setAssignment] = useState(null)
  const [planSubmitted, setPlanSubmitted] = useState(false)
  const [logCount, setLogCount] = useState(0)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)

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
    if (!a) { sessionStorage.removeItem('mentoring_assignment_id'); navigate('/mentoring'); return }
    setAssignment(a)

    const [{ data: plan }, { data: logs }, { data: report }] = await Promise.all([
      supabase.from('mentoring_plans').select('id').eq('assignment_id', assignmentId).maybeSingle(),
      supabase.from('mentoring_logs').select('session_num').eq('assignment_id', assignmentId),
      supabase.from('mentoring_reports').select('id').eq('assignment_id', assignmentId).maybeSingle(),
    ])

    setPlanSubmitted(!!plan)
    setLogCount(logs ? logs.length : 0)
    setReportSubmitted(!!report)
    setLoading(false)
  }

  function logout() {
    sessionStorage.removeItem('mentoring_assignment_id')
    navigate('/mentoring')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      </div>
    )
  }

  const docs = [
    {
      label: '수행계획서',
      icon: FileText,
      path: '/mentoring/plan',
      submitted: planSubmitted,
      desc: planSubmitted ? '제출완료' : '미제출',
    },
    {
      label: '수행일지',
      icon: BookOpen,
      path: '/mentoring/log',
      submitted: logCount > 0,
      desc: logCount > 0 ? `${logCount}회차 작성됨` : '미제출',
    },
    {
      label: '결과보고서',
      icon: BarChart2,
      path: '/mentoring/report',
      submitted: reportSubmitted,
      desc: reportSubmitted ? '제출완료' : '미제출',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }} className="px-6 py-6">
        <div className="max-w-xl mx-auto flex items-start justify-between">
          <div>
            <p className="text-white/70 text-sm">멘토</p>
            <h1 className="text-xl font-extrabold text-white">{assignment?.mentor_name} 님</h1>
            <p className="text-white/70 text-xs mt-0.5">{assignment?.mentor_org}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition"
          >
            <LogOut size={15} /> 로그아웃
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* 기업 정보 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 mb-3">담당 창업기업</p>
          <div className="space-y-2.5">
            <Row label="기업명" value={assignment?.company_name} bold />
            <Row label="대표자" value={assignment?.founder_name} />
            <Row label="연락처" value={assignment?.founder_phone} />
            <Row label="아이템" value={assignment?.item} />
          </div>
        </div>

        {/* 제출 서류 */}
        <p className="text-xs font-semibold text-gray-400 px-1">제출 서류</p>
        {docs.map(doc => (
          <button
            key={doc.label}
            onClick={() => navigate(doc.path)}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:border-emerald-300 hover:shadow-md transition text-left"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${doc.submitted ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              <doc.icon size={20} className={doc.submitted ? 'text-emerald-600' : 'text-gray-400'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm">{doc.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{doc.desc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {doc.submitted ? (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <CheckCircle size={11} /> 제출완료
                </span>
              ) : (
                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Circle size={11} /> 미제출
                </span>
              )}
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className={`text-sm text-right ${bold ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{value || '-'}</span>
    </div>
  )
}
