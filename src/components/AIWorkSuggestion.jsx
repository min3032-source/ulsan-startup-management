import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORY_COLORS = {
  '기획': 'bg-purple-100 text-purple-700',
  '홍보': 'bg-pink-100 text-pink-700',
  '운영': 'bg-blue-100 text-blue-700',
  '행정': 'bg-gray-100 text-gray-700',
  '정산': 'bg-green-100 text-green-700',
  '보고': 'bg-orange-100 text-orange-700',
}

function Stars({ n }) {
  return (
    <span className="text-yellow-400 tracking-tight" title={`난이도 ${n}점`}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  )
}

export default function AIWorkSuggestion({ program, onClose, onSaved }) {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') { setFile(f); setError('') }
    else setError('PDF 파일만 업로드 가능합니다')
  }

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (f) { setFile(f); setError('') }
    e.target.value = ''
  }

  function toBase64(f) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(f)
    })
  }

  async function analyze() {
    if (!file) return
    setLoading(true)
    setError('')
    setTasks([])
    try {
      const base64Data = await toBase64(file)
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'pdfs-2024-09-25',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64Data },
              },
              {
                type: 'text',
                text: `이 사업계획서를 분석해서 실무 담당자가 수행해야 할 업무 목록을 추출해줘.

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이 JSON만:
{
  "tasks": [
    {
      "title": "업무명",
      "description": "업무 상세 설명 (2-3문장)",
      "category": "업무 카테고리 (기획/홍보/운영/행정/정산/보고 중 하나)",
      "difficulty": 난이도 숫자 (1-5),
      "difficulty_reason": "이 난이도로 설정한 이유"
    }
  ]
}

난이도 기준:
1점: 단순 반복 행정 (서류 수령, 명단 정리 등)
2점: 기본 실무 (공문 작성, 일정 조율 등)
3점: 전문 실무 (공고문 작성, 업체 섭외, 교육 운영 등)
4점: 고난도 실무 (심사 운영, 예산 정산, 평가 관리 등)
5점: 최고난도 (사업 기획, 성과 분석, 정책 보고 등)

업무는 최소 8개 최대 20개 추출해줘. 단순하고 뻔한 업무보다 실제 사업 내용에 맞는 구체적인 업무를 추출해줘.`,
              },
            ],
          }],
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || '분석 실패')
      const text = data.content[0].text
      const json = JSON.parse(text)
      const list = json.tasks || []
      setTasks(list)
      setSelected(new Set(list.map((_, i) => i)))
    } catch (e) {
      setError('분석 중 오류가 발생했습니다: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(i) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === tasks.length) setSelected(new Set())
    else setSelected(new Set(tasks.map((_, i) => i)))
  }

  async function handleSave() {
    const toSave = tasks.filter((_, i) => selected.has(i))
    if (toSave.length === 0) return
    setSaving(true)
    setError('')
    const rows = toSave.map(t => ({
      program_id: program.id,
      program_name: program.name,
      title: t.title,
      description: t.description,
      category: t.category,
      difficulty: t.difficulty,
      difficulty_reason: t.difficulty_reason,
      status: '대기',
    }))
    const { error: err } = await supabase.from('work_items').insert(rows)
    setSaving(false)
    if (err) { setError('저장 실패: ' + err.message); return }
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full mx-4 flex flex-col" style={{ maxWidth: '780px', maxHeight: '90vh' }}>

        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-800">AI 업무 자동 제안</h2>
            <p className="text-xs text-gray-400 mt-0.5">{program.name} · 사업계획서 PDF 분석</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">
          {tasks.length === 0 ? (
            <div className="space-y-4">
              {/* 드래그앤드롭 업로드 영역 */}
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors select-none ${
                  dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className="text-5xl mb-3">📄</div>
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · 클릭하여 다시 선택</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">사업계획서 PDF를 여기에 드래그하거나 클릭하여 선택</p>
                    <p className="text-xs text-gray-400 mt-1">PDF 파일만 지원합니다</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
              )}

              {loading ? (
                <div className="text-center py-6">
                  <div className="inline-flex items-center gap-3 text-blue-600">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm font-medium">📄 사업계획서 분석 중...</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">AI가 사업 내용을 분석하고 있습니다. 잠시만 기다려주세요.</p>
                </div>
              ) : (
                <button
                  onClick={analyze}
                  disabled={!file}
                  className="w-full py-3 text-sm font-semibold text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  style={{ background: '#1e3a5f' }}
                >
                  AI 분석 시작
                </button>
              )}
            </div>
          ) : (
            /* 분석 결과 */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">{tasks.length}개</span> 업무가 추출되었습니다
                </p>
                <button onClick={toggleAll} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  {selected.size === tasks.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
              )}

              {tasks.map((task, i) => (
                <div
                  key={i}
                  onClick={() => toggleSelect(i)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    selected.has(i)
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleSelect(i)}
                      onClick={e => e.stopPropagation()}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 flex-shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-semibold text-sm text-gray-800">{task.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[task.category] || 'bg-gray-100 text-gray-600'}`}>
                          {task.category}
                        </span>
                        <Stars n={task.difficulty} />
                        <span className="text-xs text-gray-400">난이도 {task.difficulty}점</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mb-1">{task.description}</p>
                      <p className="text-xs text-gray-400">난이도 근거: {task.difficulty_reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 (결과 있을 때만) */}
        {tasks.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50 rounded-b-2xl">
            <span className="text-xs text-gray-500">{selected.size}개 선택됨</span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100">
                닫기
              </button>
              <button
                onClick={handleSave}
                disabled={selected.size === 0 || saving}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40"
                style={{ background: '#1e3a5f' }}
              >
                {saving ? '저장 중...' : `선택한 업무 추가 (${selected.size}개)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
