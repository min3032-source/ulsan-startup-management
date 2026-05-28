import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Lock, Loader2 } from 'lucide-react'

export default function MentoringLogin() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    if (!password.trim()) { setError('비밀번호를 입력해주세요.'); return }
    setLoading(true)
    const { data, error: err } = await supabase
      .from('mentoring_assignments')
      .select('*')
      .eq('access_password', password.trim())
      .maybeSingle()
    setLoading(false)
    if (err || !data) {
      setError('비밀번호가 올바르지 않습니다.')
      return
    }
    sessionStorage.setItem('mentoring_assignment_id', data.id)
    navigate('/mentoring/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <img src="/logo.gif" alt="울산경제일자리진흥원" className="h-10 w-auto mx-auto mb-3" onError={e => { e.target.style.display='none' }} />
          <h1 className="text-2xl font-extrabold text-gray-800">멘토 포털</h1>
          <p className="text-sm text-gray-400 mt-1">배정된 비밀번호로 접속하세요</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">비밀번호</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="배정된 비밀번호 입력"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition"
            style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            {loading ? '확인 중...' : '접속하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
