import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { StatusBadge } from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { DEFAULT_SETTINGS, DOCUMENT_STATUS_FLOW } from '../../lib/constants'
import { FileText, Download, Clock } from 'lucide-react'

export default function DocumentStatusTracker({ document, isOpen, onClose, onUpdated }) {
  const { user, profile } = useAuth()
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [nextStatus, setNextStatus] = useState('')
  const [statusMemo, setStatusMemo] = useState('')
  const [assignee, setAssignee] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && document) {
      setAssignee(document.assignee || '')
      setNextStatus('')
      setStatusMemo('')
      loadHistory()
    }
  }, [isOpen, document?.id])

  async function loadHistory() {
    setLoadingHistory(true)
    const { data } = await supabase
      .from('document_status_history')
      .select('*')
      .eq('document_id', document.id)
      .order('created_at', { ascending: false })
    setHistory(data || [])
    setLoadingHistory(false)
  }

  async function handleStatusChange() {
    if (!nextStatus) { alert('변경할 상태를 선택해주세요'); return }
    setSaving(true)
    try {
      const { error: updError } = await supabase
        .from('documents').update({ status: nextStatus }).eq('id', document.id)
      if (updError) throw updError

      const { error: histError } = await supabase.from('document_status_history').insert([{
        document_id: document.id,
        from_status: document.status,
        to_status: nextStatus,
        memo: statusMemo || null,
        changed_by: user?.id || null,
        changed_by_name: profile?.name || null,
      }])
      if (histError) throw histError

      onUpdated({ ...document, status: nextStatus })
      setNextStatus('')
      setStatusMemo('')
      loadHistory()
    } catch (e) {
      alert('상태 변경 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAssigneeChange(v) {
    setAssignee(v)
    const { error } = await supabase.from('documents').update({ assignee: v }).eq('id', document.id)
    if (error) { alert('담당자 변경 실패: ' + error.message); return }
    onUpdated({ ...document, assignee: v })
  }

  async function handleMemoSave(memo) {
    const { error } = await supabase.from('documents').update({ memo }).eq('id', document.id)
    if (error) { alert('메모 저장 실패: ' + error.message); return }
    onUpdated({ ...document, memo })
  }

  if (!document) return null
  const nextOptions = DOCUMENT_STATUS_FLOW[document.status] || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`서류 상세 — ${document.company_name}`} wide
      footer={<button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">닫기</button>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-3">
          <div><span className="text-xs text-gray-400">담당자명</span><div className="font-medium">{document.contact_name}</div></div>
          <div><span className="text-xs text-gray-400">연락처</span><div className="font-medium">{document.phone}</div></div>
          <div><span className="text-xs text-gray-400">이메일</span><div className="font-medium">{document.email}</div></div>
          <div><span className="text-xs text-gray-400">사업유형</span><div className="font-medium">{document.business_type || '-'}</div></div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-600 mb-2">첨부 서류</div>
          {(document.files || []).length === 0 ? (
            <div className="text-xs text-gray-400">첨부된 파일이 없습니다</div>
          ) : (
            <ul className="space-y-1">
              {document.files.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                  <span className="flex items-center gap-1.5 truncate text-gray-700"><FileText size={12} /> {f.name}</span>
                  <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline flex-shrink-0">
                    <Download size={12} /> 다운로드
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">현재 상태</label>
            <StatusBadge status={document.status} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">담당자 배정</label>
            <select className="form-input" value={assignee} onChange={e => handleAssigneeChange(e.target.value)}>
              <option value="">미배정</option>
              {DEFAULT_SETTINGS.staff.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {nextOptions.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-600">상태 변경</div>
            <div className="flex gap-2">
              {nextOptions.map(s => (
                <button
                  key={s}
                  onClick={() => setNextStatus(s)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    nextStatus === s ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                  style={nextStatus === s ? { background: '#2E75B6' } : {}}
                >
                  → {s}
                </button>
              ))}
            </div>
            {nextStatus && (
              <>
                <input
                  className="form-input"
                  placeholder="변경 사유 / 메모 (선택)"
                  value={statusMemo}
                  onChange={e => setStatusMemo(e.target.value)}
                />
                <button
                  onClick={handleStatusChange}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs text-white rounded-lg disabled:opacity-50"
                  style={{ background: '#2E75B6' }}
                >
                  {saving ? '변경 중...' : `${document.status} → ${nextStatus} 변경 확정`}
                </button>
              </>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
          <textarea
            className="form-input"
            rows={2}
            defaultValue={document.memo || ''}
            onBlur={e => handleMemoSave(e.target.value)}
            placeholder="내용을 입력 후 다른 곳을 클릭하면 저장됩니다"
          />
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-600 mb-2">상태 변경 이력</div>
          {loadingHistory ? (
            <div className="text-xs text-gray-400">불러오는 중...</div>
          ) : history.length === 0 ? (
            <div className="text-xs text-gray-400">이력이 없습니다</div>
          ) : (
            <ul className="space-y-2">
              {history.map(h => (
                <li key={h.id} className="flex items-start gap-2 text-xs">
                  <Clock size={12} className="text-gray-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-gray-700">
                      {h.from_status ? <>{h.from_status} → <span className="font-semibold">{h.to_status}</span></> : <span className="font-semibold">{h.to_status}</span>}
                      {h.changed_by_name && <span className="text-gray-400 ml-1.5">({h.changed_by_name})</span>}
                    </div>
                    {h.memo && <div className="text-gray-500">{h.memo}</div>}
                    <div className="text-gray-300">{new Date(h.created_at).toLocaleString('ko-KR')}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
