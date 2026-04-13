import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Printer } from 'lucide-react'

export default function Certificate() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: cert, error: err } = await supabase
        .from('certificates')
        .select('*, education_applications(applicant_name, email, education_programs(title, start_date, end_date, total_hours))')
        .eq('id', id)
        .single()
      if (err || !cert) {
        setError('수료증을 찾을 수 없습니다.')
      } else {
        setData(cert)
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      <div className="text-center">
        <p className="text-lg font-medium mb-2">{error}</p>
        <p className="text-sm text-gray-400">수료증 번호를 다시 확인해주세요.</p>
      </div>
    </div>
  )

  const app = data.education_applications
  const prog = app?.education_programs
  const issueDate = data.issued_at ? new Date(data.issued_at) : new Date()
  const y = issueDate.getFullYear()
  const m = String(issueDate.getMonth() + 1).padStart(2, '0')
  const d = String(issueDate.getDate()).padStart(2, '0')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      {/* 인쇄 버튼 - 인쇄 시 숨김 */}
      <div className="mb-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-3 text-white rounded-xl shadow-md hover:opacity-90 transition"
          style={{ background: '#2E75B6' }}
        >
          <Printer size={18} />
          인쇄하기
        </button>
      </div>

      {/* 수료증 - A4 레이아웃 */}
      <div
        id="certificate"
        className="bg-white shadow-xl print:shadow-none"
        style={{ width: '210mm', minHeight: '297mm', padding: '20mm', boxSizing: 'border-box' }}
      >
        <div className="relative h-full flex flex-col items-center justify-center border-8 border-double border-blue-800 p-12 text-center space-y-10">
          {/* 수료증번호 - 좌상단 */}
          <p className="absolute top-4 left-5" style={{ fontSize: '11px', color: '#9ca3af' }}>수료증번호: {data.certificate_number}</p>

          {/* 기관명 + 로고 */}
          <div className="flex flex-col items-center gap-2">
            <img src="/logo.gif" alt="울산경제일자리진흥원" style={{ height: 48 }} className="w-auto" />
            <p className="text-lg font-bold text-blue-800 tracking-[0.2em]">울산경제일자리진흥원</p>
          </div>

          {/* 제목 */}
          <div>
            <h1 className="text-5xl font-bold text-gray-800 tracking-[0.4em]">수  료  증</h1>
          </div>

          {/* 수료 내용 */}
          <div className="border-t-2 border-b-2 border-gray-300 py-8 w-full max-w-sm text-left space-y-4">
            <table className="w-full text-base">
              <tbody>
                <tr>
                  <td className="font-bold text-gray-700 w-28 py-1.5">성&nbsp;&nbsp;&nbsp;&nbsp;명</td>
                  <td className="text-gray-800 py-1.5">: &nbsp;{app?.applicant_name || '-'}</td>
                </tr>
                <tr>
                  <td className="font-bold text-gray-700 py-1.5">교 육 명</td>
                  <td className="text-gray-800 py-1.5">: &nbsp;{prog?.title || '-'}</td>
                </tr>
                <tr>
                  <td className="font-bold text-gray-700 py-1.5">교육기간</td>
                  <td className="text-gray-800 py-1.5">
                    : &nbsp;{prog?.start_date && prog?.end_date ? `${prog.start_date} ~ ${prog.end_date}` : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="font-bold text-gray-700 py-1.5">교육시간</td>
                  <td className="text-gray-800 py-1.5">: &nbsp;{prog?.total_hours ? `${prog.total_hours}시간` : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 본문 */}
          <p className="text-base text-gray-600 leading-loose">
            위 사람은 위의 교육과정을 성실히 이수하였기에<br />
            이 증서를 수여합니다.
          </p>

          {/* 날짜 & 서명 */}
          <div className="space-y-3">
            <p className="text-lg font-medium text-gray-700">{`${y}년 ${Number(m)}월 ${Number(d)}일`}</p>
            <div className="flex flex-col items-center gap-2">
              {/* 도장 이미지: 추후 <img src="/stamp.png"> 로 교체 */}
              <div style={{ width: '80px', height: '80px', border: '2px solid #cc0000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cc0000', fontSize: '11px', margin: '0 auto' }}>
                직인
              </div>
              <p className="text-xl font-bold text-blue-800">울산경제일자리진흥원장 (인)</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          #certificate { width: 210mm; min-height: 297mm; }
        }
      `}</style>
    </div>
  )
}
