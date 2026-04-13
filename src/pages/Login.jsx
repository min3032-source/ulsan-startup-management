import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function Card({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #1F4E79 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-8 pt-8 pb-4 text-center">
          <img src="/logo.gif" alt="울산경제일자리진흥원 로고" style={{ height: 64 }} className="w-auto mx-auto mb-3" />
          <div className="text-xs font-semibold text-blue-600 tracking-wide mb-1">울산경제일자리진흥원</div>
          <h1 className="text-xl font-bold text-gray-900">창업지원 통합관리 시스템</h1>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Login() {
  const [tab, setTab] = useState('login')             // 'login' | 'signup'
  const [signupComplete, setSignupComplete] = useState(false)
  const [forgotPassword, setForgotPassword] = useState(false)

  // 로그인 폼
  const loginEmailRef = useRef()
  const loginPasswordRef = useRef()
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // 회원가입 폼
  const nameRef = useRef(null)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmRef = useRef(null)
  const [signupError, setSignupError] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)

  // 비밀번호 재설정 폼
  const resetEmailRef = useRef()
  const [resetMsg, setResetMsg] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()

  function switchTab(t) {
    setTab(t)
    setLoginError(''); setSignupError('')
  }

  function goToLogin() {
    setForgotPassword(false)
    setSignupComplete(false)
    switchTab('login')
  }

  // ── 로그인 ────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setLoginLoading(true); setLoginError('')
    const { error } = await signIn(loginEmailRef.current.value, loginPasswordRef.current.value)
    if (error) {
      setLoginError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoginLoading(false)
    } else {
      navigate('/')
    }
  }

  // ── 회원가입 ──────────────────────────────────────
  async function handleSignup(e) {
    e.preventDefault()
    setSignupError('')
    const name = nameRef.current.value
    const email = emailRef.current.value
    const password = passwordRef.current.value
    const confirmPassword = confirmRef.current.value

    if (!name.trim()) return setSignupError('이름을 입력해주세요.')
    if (password.length < 8) return setSignupError('비밀번호는 8자 이상이어야 합니다.')
    if (password !== confirmPassword) return setSignupError('비밀번호가 일치하지 않습니다.')

    setSignupLoading(true)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setSignupLoading(false)
      if (signUpError.message.includes('already registered')) {
        setSignupError('이미 등록된 이메일입니다.')
      } else {
        setSignupError('가입 중 오류가 발생했습니다: ' + signUpError.message)
      }
      return
    }

    // Confirm email OFF 환경에서 자동 생성된 세션 제거
    await supabase.auth.signOut()

    // profiles insert
    if (signUpData?.user) {
      const { error: insertError } = await supabase.from('profiles').insert({
        id:    signUpData.user.id,
        email: email,
        name:  name.trim(),
        role:  'viewer',
      })
      if (insertError) {
        console.error('profiles insert error:', insertError)
        alert('프로필 저장 실패: ' + insertError.message)
      }
    }

    setSignupLoading(false)
    setSignupComplete(true)
  }

  // ── 비밀번호 재설정 메일 발송 ─────────────────────
  async function handleResetPassword(e) {
    e.preventDefault()
    setResetMsg(''); setResetError('')
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmailRef.current.value)
    setResetLoading(false)
    if (error) {
      setResetError('오류가 발생했습니다: ' + error.message)
    } else {
      setResetMsg('이메일을 확인해주세요.')
    }
  }

  // ── 승인 대기 화면 ────────────────────────────────
  if (signupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #1F4E79 100%)' }}>
        <div className="bg-white rounded-2xl p-10 text-center shadow-xl max-w-sm w-full mx-4">
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⏳</div>
          <h2 className="text-2xl font-bold mb-3">가입 신청 완료</h2>
          <p className="text-gray-500 mb-6">
            승인 대기 중입니다.<br />
            관리자 승인 후 이용 가능합니다.
          </p>
          <button
            onClick={() => { setSignupComplete(false); setTab('login') }}
            className="w-full py-2 rounded-lg text-white font-medium"
            style={{ background: '#2E75B6' }}
          >
            로그인 화면으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // ── 비밀번호 재설정 화면 ──────────────────────────
  if (forgotPassword) {
    return (
      <Card>
        <div className="px-8 py-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-800 mb-1">비밀번호 재설정</h2>
            <p className="text-xs text-gray-400">가입한 이메일로 재설정 링크를 보내드립니다.</p>
          </div>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <input
                type="email"
                ref={resetEmailRef}
                required
                placeholder="example@ulsan.go.kr"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {resetError && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{resetError}</div>
            )}
            {resetMsg && (
              <div className="bg-green-50 text-green-700 text-sm px-4 py-2.5 rounded-lg">{resetMsg}</div>
            )}
            <button
              type="submit"
              disabled={resetLoading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#2E75B6' }}
            >
              {resetLoading ? '전송 중...' : '재설정 메일 보내기'}
            </button>
          </form>
          <button
            onClick={goToLogin}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600"
          >
            로그인으로 돌아가기
          </button>
        </div>
      </Card>
    )
  }

  // ── 로그인 / 회원가입 폼 ──────────────────────────
  return (
    <Card>
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

      {/* 로그인 폼 */}
      {tab === 'login' && (
        <form onSubmit={handleLogin} className="px-8 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              ref={loginEmailRef}
              required
              placeholder="example@ulsan.go.kr"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              ref={loginPasswordRef}
              required
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-right">
            <button
              type="button"
              onClick={() => setForgotPassword(true)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
          {loginError && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{loginError}</div>
          )}
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#2E75B6' }}
          >
            {loginLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      )}

      {/* 회원가입 폼 */}
      {tab === 'signup' && (
        <form onSubmit={handleSignup} className="px-8 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              type="text"
              ref={nameRef}
              required
              placeholder="홍길동"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              ref={emailRef}
              required
              placeholder="example@ulsan.go.kr"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              ref={passwordRef}
              required
              placeholder="8자 이상 입력"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
            <input
              type="password"
              ref={confirmRef}
              required
              placeholder="비밀번호 재입력"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {signupError && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{signupError}</div>
          )}
          <button
            type="submit"
            disabled={signupLoading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#2E75B6' }}
          >
            {signupLoading ? '가입 중...' : '회원가입'}
          </button>
          <p className="text-xs text-center text-gray-400 leading-relaxed">
            가입 후 기본 권한은 <strong>열람자</strong>입니다.<br />
            관리자에게 권한 변경을 요청하세요.
          </p>
        </form>
      )}
    </Card>
  )
}
