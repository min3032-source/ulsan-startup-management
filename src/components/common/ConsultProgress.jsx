// 진행상태 스텝 UI
// Props: assignee(string), consultCount(number), consultStatus(string), small(bool)
export default function ConsultProgress({ assignee, consultCount, consultStatus, small = false }) {
  const steps = [
    { label: '담당자 지정',   done: !!assignee },
    { label: '상담일지 작성', done: (consultCount || 0) > 0 },
    { label: '상담 완료',    done: consultStatus === '완료' },
  ]
  const activeIdx = steps.findIndex(s => !s.done)

  if (small) {
    return (
      <div className="flex items-center gap-0.5">
        {steps.map((step, i) => {
          const isDone   = step.done
          const isActive = activeIdx === i
          return (
            <div key={i} className="flex items-center gap-0.5">
              <div
                title={step.label}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold cursor-default ${
                  isDone   ? 'bg-green-100 text-green-600' :
                  isActive ? 'bg-blue-100  text-blue-600'  :
                             'bg-gray-100  text-gray-400'
                }`}
              >
                {isDone ? '✓' : isActive ? '●' : '○'}
              </div>
              {i < 2 && <div className="w-2.5 h-px bg-gray-300" />}
            </div>
          )
        })}
      </div>
    )
  }

  // 전체 크기 (모달용)
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {steps.map((step, i) => {
        const isDone   = step.done
        const isActive = activeIdx === i
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              isDone   ? 'bg-green-50 text-green-700 border-green-200' :
              isActive ? 'bg-blue-50  text-blue-700  border-blue-300'  :
                         'bg-gray-50  text-gray-400  border-gray-200'
            }`}>
              <span>{isDone ? '✅' : isActive ? '🔵' : '⬜'}</span>
              <span>{step.label}</span>
            </div>
            {i < 2 && <span className="text-gray-300 text-xs">→</span>}
          </div>
        )
      })}
    </div>
  )
}
