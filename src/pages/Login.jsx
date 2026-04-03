import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [tab, setTab] = useState('login')        // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  function resetForm() {
    setEmail(''); setPassword(''); setName(''); setConfirmPw('')
    setError(''); setInfo('')
  }

  function switchTab(t) {
    setTab(t)
    resetForm()
  }

  // ── 로그인 ─────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  // ── 회원가입 ────────────────────────────────────
  async function handleSignup(e) {
    e.preventDefault()
    setError(''); setInfo('')

    if (!name.trim()) return setError('이름을 입력해주세요.')
    if (password.length < 8) return setError('비밀번호는 8자 이상이어야 합니다.')
    if (password !== confirmPw) return setError('비밀번호가 일치하지 않습니다.')

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim() } },
    })

    setLoading(false)
    if (error) {
      if (error.message.includes('already registered')) {
        setError('이미 등록된 이메일입니다.')
      } else {
        setError('가입 중 오류가 발생했습니다: ' + error.message)
      }
    } else {
      setInfo('가입이 완료됐습니다. 관리자가 권한을 부여하면 이용할 수 있습니다.')
      // 이메일 인증이 꺼진 경우 바로 로그인 시도
      const { error: loginErr } = await signIn(email, password)
      if (!loginErr) navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #1F4E79 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* 헤더 */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="text-xs font-semibold text-blue-600 tracking-wide mb-1">울산경제일자리진흥원</div>
          <h1 className="text-xl font-bold text-gray-900">창업지원 통합관리 시스템</h1>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-200 mx-8">
          {[['login', '로그인'], ['signup', '회원가입']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="px-8 py-6 space-y-4">

          {/* 이름 (회원가입만) */}
          {tab === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="홍길동"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* 이메일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="example@ulsan.go.kr"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder={tab === 'signup' ? '8자 이상 입력' : '비밀번호를 입력하세요'}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 비밀번호 확인 (회원가입만) */}
          {tab === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                required
                placeholder="비밀번호 재입력"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* 오류 / 안내 메시지 */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>
          )}
          {info && (
            <div className="bg-blue-50 text-blue-700 text-sm px-4 py-2.5 rounded-lg">{info}</div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: '#2E75B6' }}
          >
            {loading
              ? (tab === 'login' ? '로그인 중...' : '가입 중...')
              : (tab === 'login' ? '로그인' : '회원가입')
            }
          </button>

          {/* 회원가입 안내 */}
          {tab === 'signup' && (
            <p className="text-xs text-center text-gray-400 leading-relaxed">
              가입 후 기본 권한은 <strong>열람자</strong>입니다.<br />
              관리자에게 권한 변경을 요청하세요.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
