// 서류 검증 엔진 — 필수항목 / 파일형식 / 파일크기 검증
import { DOCUMENT_ALLOWED_EXT, DOCUMENT_MAX_FILE_MB, DOCUMENT_MAX_TOTAL_MB } from '../../lib/constants'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateRequiredFields(form) {
  const errors = []
  if (!form.company_name?.trim()) errors.push('회사명을 입력해주세요')
  if (!form.contact_name?.trim()) errors.push('담당자명을 입력해주세요')
  if (!form.phone?.trim()) errors.push('연락처를 입력해주세요')
  if (!form.email?.trim()) errors.push('이메일을 입력해주세요')
  else if (!EMAIL_RE.test(form.email.trim())) errors.push('이메일 형식이 올바르지 않습니다')
  return errors
}

export function validateFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const sizeMB = file.size / (1024 * 1024)
  const errors = []
  if (!DOCUMENT_ALLOWED_EXT.includes(ext)) {
    errors.push(`${file.name}: 허용되지 않는 형식입니다 (PDF/Excel/한글만 가능)`)
  }
  if (sizeMB > DOCUMENT_MAX_FILE_MB) {
    errors.push(`${file.name}: 개별 파일 용량 초과 (${sizeMB.toFixed(1)}MB / 최대 ${DOCUMENT_MAX_FILE_MB}MB)`)
  }
  return { name: file.name, ext, sizeMB: Number(sizeMB.toFixed(2)), passed: errors.length === 0, errors }
}

export function validateFiles(files) {
  const errors = []
  const fileChecks = files.map(validateFile)
  fileChecks.forEach(c => errors.push(...c.errors))

  const totalMB = fileChecks.reduce((a, c) => a + c.sizeMB, 0)
  if (totalMB > DOCUMENT_MAX_TOTAL_MB) {
    errors.push(`전체 파일 용량 초과 (${totalMB.toFixed(1)}MB / 최대 ${DOCUMENT_MAX_TOTAL_MB}MB)`)
  }
  if (files.length === 0) {
    errors.push('최소 1개 이상의 서류 파일을 첨부해주세요')
  }

  return { fileChecks, totalMB: Number(totalMB.toFixed(2)), errors }
}

// form + files 통합 검증 — 업로드 폼 제출 시 사용
export function validateDocument(form, files) {
  const fieldErrors = validateRequiredFields(form)
  const { fileChecks, errors: fileErrors } = validateFiles(files)
  const errors = [...fieldErrors, ...fileErrors]
  return { passed: errors.length === 0, errors, fileChecks }
}
