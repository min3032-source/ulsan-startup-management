// 멘토링 통합 공통 함수
import { supabase } from '../../lib/supabase'

export const BUCKET = 'mt-files'

export async function openStorageFile(path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
  if (error) { alert('파일을 열 수 없습니다: ' + error.message); return }
  window.open(data.signedUrl, '_blank', 'noopener')
}

export function portalLink(token) {
  return `${window.location.origin}/mentor?k=${encodeURIComponent(token)}`
}

export async function copyText(text, msg = '복사되었습니다') {
  try { await navigator.clipboard.writeText(text); alert(msg) }
  catch { window.prompt('아래 내용을 복사하세요', text) }
}
