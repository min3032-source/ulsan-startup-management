import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Printer } from 'lucide-react'

// 수료번호 → "제YYYY-MM-NNN호" 형식으로 변환
function formatCertNumber(raw) {
  if (!raw) return '-'
  // 이미 "제YYYY-MM-NNN호" 형식이면 그대로
  if (/^제\d{4}-\d{2}-\d{3}호$/.test(raw)) return raw
  // "울산경제일자리진흥원-YYYY-NNN" 또는 "YYYY-NNN" 등 파싱 시도
  const match = raw.match(/(\d{4})[^\d]*(\d{2,3})$/)
  if (match) {
    const year = match[1]
    const seq  = String(match[2]).padStart(3, '0')
    const now  = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `제${year}-${month}-${seq}호`
  }
  return raw
}

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
  const certNo = formatCertNumber(data.certificate_number)

  return (
    <>
      {/* Google Fonts - Gowun Batang (고급스러운 한국어 명조체) */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap" rel="stylesheet" />

      <div className="certificate-container min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 print:bg-white print:p-0">
        {/* 인쇄 버튼 */}
        <div className="print-hide mb-6">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 text-white rounded-xl shadow-md hover:opacity-90 transition"
            style={{ background: '#2E75B6' }}
          >
            <Printer size={18} />
            인쇄하기
          </button>
        </div>

        {/* 수료증 본체 - A4 */}
        <div
          id="certificate"
          className="bg-white shadow-2xl print:shadow-none"
          style={{
            fontFamily: "'Gowun Batang', 'Noto Serif KR', 'Batang', serif",
            width: '210mm',
            minHeight: '297mm',
            boxSizing: 'border-box',
            padding: '18mm 20mm',
            position: 'relative',
          }}
        >
          {/* 이중 테두리 */}
          <div style={{
            position: 'absolute', inset: '10mm',
            border: '3px double #1e3a6e',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', inset: '12mm',
            border: '1px solid #1e3a6e',
            pointerEvents: 'none',
          }} />

          {/* 내용 래퍼 */}
          <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '8mm' }}>

            {/* 수료번호 — 좌측 상단 */}
            <p style={{
              position: 'absolute', top: 0, left: '2mm',
              fontSize: '11px', color: '#6b7280', letterSpacing: '0.03em',
            }}>
              {certNo}
            </p>

            {/* 기관 로고 + 기관명 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <img src="/logo.gif" alt="울산경제일자리진흥원" style={{ height: 56, width: 56, objectFit: 'contain' }} />
              <p style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a6e', letterSpacing: '0.25em' }}>
                울산경제일자리진흥원
              </p>
            </div>

            {/* 제목 */}
            <div style={{ margin: '32px 0 28px' }}>
              <h1 style={{
                fontSize: '54px', fontWeight: 'bold', color: '#1a1a2e',
                letterSpacing: '0.5em', textIndent: '0.5em',
                lineHeight: 1,
              }}>
                수료증
              </h1>
            </div>

            {/* 교육 내용 */}
            <div style={{
              borderTop: '2px solid #374151',
              borderBottom: '2px solid #374151',
              padding: '24px 0',
              width: '100%',
              maxWidth: '320px',
            }}>
              <table style={{ width: '100%', fontSize: '15px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#374151', width: '90px', paddingBottom: '12px', verticalAlign: 'top' }}>
                      성&nbsp;&nbsp;&nbsp;&nbsp;명
                    </td>
                    <td style={{ color: '#1f2937', paddingBottom: '12px', verticalAlign: 'top' }}>
                      :&nbsp;&nbsp;{app?.applicant_name || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#374151', paddingBottom: '12px', verticalAlign: 'top' }}>
                      교&nbsp;육&nbsp;명
                    </td>
                    <td style={{ color: '#1f2937', paddingBottom: '12px', verticalAlign: 'top', lineHeight: '1.5' }}>
                      :&nbsp;&nbsp;{prog?.title || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#374151', paddingBottom: '12px', verticalAlign: 'top' }}>
                      교육기간
                    </td>
                    <td style={{ color: '#1f2937', paddingBottom: '12px', verticalAlign: 'top' }}>
                      :&nbsp;&nbsp;{prog?.start_date && prog?.end_date
                        ? `${prog.start_date} ~ ${prog.end_date}` : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', color: '#374151', verticalAlign: 'top' }}>
                      교육시간
                    </td>
                    <td style={{ color: '#1f2937', verticalAlign: 'top' }}>
                      :&nbsp;&nbsp;{prog?.total_hours ? `${prog.total_hours}시간` : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 본문 */}
            <p style={{
              fontSize: '15px', color: '#4b5563', lineHeight: '2.2',
              textAlign: 'center', margin: '32px 0',
              letterSpacing: '0.04em',
            }}>
              위 사람은 위의 교육과정을 성실히 이수하였기에<br />
              이 증서를 수여합니다.
            </p>

            {/* 날짜 & 서명 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: 'auto', paddingBottom: '12mm' }}>
              <p style={{ fontSize: '17px', color: '#374151', letterSpacing: '0.1em' }}>
                {y}년&nbsp;&nbsp;{Number(m)}월&nbsp;&nbsp;{Number(d)}일
              </p>

              {/* 기관장 + 전자관인 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e3a6e', letterSpacing: '0.05em', lineHeight: 1 }}>
                  울산경제일자리진흥원장
                </p>
                {/* (인) 위에 관인 이미지를 겹침 */}
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px' }}>
                  <span style={{ fontSize: '18px', color: '#374151' }}>(인)</span>
                  <img
                    src="/seal.png"
                    alt="전자관인"
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      height: '80px', width: '80px',
                      objectFit: 'contain',
                      opacity: 0.85,
                      pointerEvents: 'none',
                    }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap');

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body > *:not(.certificate-container) {
            display: none !important;
          }
          .certificate-container {
            display: block !important;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
          }
          .print-hide {
            display: none !important;
          }
          #certificate {
            width: 210mm !important;
            height: 297mm !important;
            min-height: unset !important;
            margin: 0 !important;
            padding: 18mm 20mm !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </>
  )
}
