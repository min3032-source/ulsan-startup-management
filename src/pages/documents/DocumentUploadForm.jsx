import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/common/Modal'
import { DEFAULT_SETTINGS } from '../../lib/constants'
import { validateDocument } from './DocumentValidator'
import { Paperclip, X, AlertCircle } from 'lucide-react'

const emptyForm = () => ({
  company_name: '', contact_name: '', phone: '', email: '',
  business_type: '', assignee: '', memo: '',
})

export default function DocumentUploadForm({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm())
  const [files, setFiles] = useState([])
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)

  function setField(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function handleFileChange(e) {
    const picked = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...picked])
    e.target.value = ''
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function reset() {
    setForm(emptyForm())
    setFiles([])
    setErrors([])
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function uploadFiles() {
    const uploaded = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('documents').upload(path, file)
      if (error) throw new Error(`${file.name} 업로드 실패: ${error.message}`)
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      uploaded.push({ name: file.name, url: publicUrl, path, size: file.size, type: file.type })
    }
    return uploaded
  }

  async function handleSubmit() {
    const result = validateDocument(form, files)
    setErrors(result.errors)
    if (!result.passed) return

    setSaving(true)
    try {
      const uploadedFiles = await uploadFiles()

      const payload = {
        ...form,
        files: uploadedFiles,
        status: '수신',
        validation_passed: true,
      }
      const { data: doc, error: docError } = await supabase
        .from('documents').insert([payload]).select().single()
      if (docError) throw docError

      await supabase.from('document_validations').insert([{
        document_id: doc.id, passed: true, errors: [], file_checks: result.fileChecks,
      }])

      await supabase.from('document_status_history').insert([{
        document_id: doc.id, from_status: null, to_status: '수신', memo: '서류 접수',
      }])

      onSaved(doc)
      reset()
      onClose()
    } catch (e) {
      setErrors([e.message || '저장 중 오류가 발생했습니다'])
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="서류 업로드" wide
      footer={
        <>
          <button onClick={handleClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-1.5 text-sm text-white rounded-lg disabled:opacity-50" style={{ background: '#2E75B6' }}>
            {saving ? '저장 중...' : '제출'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
            {errors.map((err, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">회사명 *</label>
            <input className="form-input" value={form.company_name} onChange={e => setField('company_name', e.target.value)} placeholder="(주)예시기업" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">담당자명 *</label>
            <input className="form-input" value={form.contact_name} onChange={e => setField('contact_name', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">연락처 *</label>
            <input className="form-input" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="010-1234-5678" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">이메일 *</label>
            <input className="form-input" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="example@email.com" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">사업유형</label>
            <select className="form-input" value={form.business_type} onChange={e => setField('business_type', e.target.value)}>
              <option value="">선택</option>
              {DEFAULT_SETTINGS.programs.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">담당자 배정</label>
            <select className="form-input" value={form.assignee} onChange={e => setField('assignee', e.target.value)}>
              <option value="">미배정</option>
              {DEFAULT_SETTINGS.staff.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">서류 파일 * (PDF/Excel/한글, 개별 10MB · 전체 50MB 이하)</label>
          <label className="flex items-center gap-2 text-sm px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 cursor-pointer">
            <Paperclip size={14} /> 파일 선택
            <input type="file" multiple accept=".pdf,.xls,.xlsx,.hwp,.hwpx" className="hidden" onChange={handleFileChange} />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                  <span className="truncate text-gray-700">{f.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-gray-400">{(f.size / (1024 * 1024)).toFixed(1)}MB</span>
                    <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-600"><X size={12} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
          <textarea className="form-input" rows={2} value={form.memo} onChange={e => setField('memo', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
