import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth, ROLES } from '../../context/AuthContext'
import { DEFAULT_SETTINGS } from '../../lib/constants'
import Modal from '../../components/common/Modal'
import Avatar from '../../components/common/Avatar'
import { Save, Plus, Trash2, UserCog, Settings2, Users, PowerOff, UserX, KeyRound, Briefcase } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'master',  label: '마스터(팀장)' },
  { value: 'admin',   label: '관리자' },
  { value: 'manager', label: '담당자' },
  { value: 'viewer',  label: '열람자' },
]

const ROLE_BADGE = {
  master:  'bg-purple-100 text-purple-700',
  admin:   'bg-blue-100 text-blue-700',
  manager: 'bg-teal-100 text-teal-700',
  viewer:  'bg-gray-100 text-gray-500',
}

export default function Settings() {
  const { profile, hasRole } = useAuth()
  const canEdit  = hasRole('admin')
  const canManageUsers = hasRole('master')

  const [activeTab, setActiveTab] = useState('consult')

  // ── 팀 설정 ──────────────────────────────────────
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS, teams: [] })
  const [settingsId, setSettingsId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // ── 사용자 관리 ───────────────────────────────────
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [targetUser, setTargetUser] = useState(null)
  const [newRole, setNewRole] = useState('viewer')

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // ── 팀 목록 ──────────────────────────────────────
  const [newTeamName, setNewTeamName] = useState('')

  function addTeam() {
    const name = newTeamName.trim()
    if (!name) return
    setSettings(prev => ({ ...prev, teams: [...(prev.teams || []), name] }))
    setNewTeamName('')
  }

  function removeTeam(idx) {
    setSettings(prev => ({ ...prev, teams: (prev.teams || []).filter((_, i) => i !== idx) }))
  }

  // ── 비밀번호 변경 ─────────────────────────────────
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    loadSettings()
    if (canManageUsers) loadUsers()
  }, [])

  async function loadSettings() {
    const { data } = await supabase.from('team_settings').select('*').limit(1).single()
    if (data) {
      setSettingsId(data.id)
      setSettings({
        staff:    data.staff    || DEFAULT_SETTINGS.staff,
        programs: data.programs || DEFAULT_SETTINGS.programs,
        stages:   data.stages   || DEFAULT_SETTINGS.stages,
        methods:  data.methods  || DEFAULT_SETTINGS.methods,
        teams:    data.teams    || [],
      })
    }
  }

  async function loadUsers() {
    setUsersLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data || [])
    setUsersLoading(false)
  }

  async function saveSettings() {
    if (!canEdit && !canManageUsers) return
    setSaving(true)
    setSaveMsg('')
    const payload = {
      staff:    settings.staff,
      programs: settings.programs,
      stages:   settings.stages,
      methods:  settings.methods,
      teams:    settings.teams || [],
      updated_at: new Date().toISOString(),
    }
    let error
    if (settingsId) {
      ({ error } = await supabase.from('team_settings').update(payload).eq('id', settingsId))
    } else {
      ({ error } = await supabase.from('team_settings').insert(payload))
    }
    setSaving(false)
    if (error) {
      setSaveMsg('저장 실패: ' + error.message)
    } else {
      setSaveMsg('저장되었습니다.')
      setTimeout(() => setSaveMsg(''), 2500)
    }
  }

  function addItem(key) {
    setSettings(prev => ({ ...prev, [key]: [...prev[key], ''] }))
  }

  function updateItem(key, idx, val) {
    setSettings(prev => {
      const arr = [...prev[key]]
      arr[idx] = val
      return { ...prev, [key]: arr }
    })
  }

  function removeItem(key, idx) {
    setSettings(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx),
    }))
  }

  async function changePassword() {
    setPwMsg('')
    if (newPw.length < 8) { setPwMsg('비밀번호는 8자 이상이어야 합니다.'); return }
    if (newPw !== confirmPw) { setPwMsg('비밀번호가 일치하지 않습니다.'); return }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwLoading(false)
    if (error) {
      setPwMsg('변경 실패: ' + error.message)
    } else {
      setPwMsg('비밀번호가 변경됐습니다.')
      setNewPw('')
      setConfirmPw('')
    }
  }

  function openRoleModal(u) {
    setTargetUser(u)
    setNewRole(u.role)
    setRoleModalOpen(true)
  }

  async function saveRole() {
    if (!targetUser) return
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUser.id)
    if (error) {
      alert('권한 변경 실패: ' + error.message)
    } else {
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: newRole } : u))
    }
    setRoleModalOpen(false)
  }

  async function updateDepartment(userId, dept) {
    const { error } = await supabase
      .from('profiles')
      .update({ department: dept || null, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) {
      alert('소속 팀 변경 실패: ' + error.message)
    } else {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, department: dept } : u))
    }
  }

  function openDeleteModal(u) {
    setDeleteTarget(u)
    setDeleteModalOpen(true)
  }

  async function deleteUser() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.rpc('delete_user', { user_id: deleteTarget.id })
    setDeleting(false)
    if (error) {
      alert('삭제 실패: ' + error.message)
    } else {
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      setDeleteModalOpen(false)
      setDeleteTarget(null)
    }
  }

  async function toggleActive(u) {
    const next = !u.is_active
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: next, updated_at: new Date().toISOString() })
      .eq('id', u.id)
    if (error) {
      alert('변경 실패: ' + error.message)
    } else {
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: next } : x))
    }
  }

  // ── 렌더 ─────────────────────────────────────────

  function ListEditor({ label, stateKey }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">{label}</span>
          {canEdit && (
            <button
              onClick={() => addItem(stateKey)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
            >
              <Plus size={12} /> 추가
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {settings[stateKey].length === 0 && (
            <p className="text-xs text-gray-400 py-1">항목이 없습니다. 추가 버튼을 눌러 추가하세요.</p>
          )}
          {settings[stateKey].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                value={item}
                disabled={!canEdit}
                onChange={e => updateItem(stateKey, idx, e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-500"
              />
              {canEdit && (
                <button onClick={() => removeItem(stateKey, idx)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">환경 설정</h1>
        <p className="text-sm text-gray-500 mt-0.5">사용자 관리, 비밀번호 변경</p>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {[
          { key: 'consult',  label: '상담 설정',    icon: Settings2 },
          { key: 'team',     label: '팀 설정',      icon: Users },
          { key: 'programs', label: '지원사업 등록', icon: Briefcase },
          ...(canManageUsers ? [{ key: 'users', label: '사용자 관리', icon: UserCog }] : []),
          { key: 'password', label: '비밀번호 변경', icon: KeyRound },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── 상담 설정 탭 ── */}
      {activeTab === 'consult' && (
        <div className="space-y-6">
          {!canEdit && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2.5 rounded-lg">
              관리자 권한이 필요합니다.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <ListEditor label="상담 방법" stateKey="methods" />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <ListEditor label="창업 단계" stateKey="stages" />
            </div>
          </div>
          {(canEdit || canManageUsers) && (
            <div className="flex items-center gap-3">
              <button onClick={saveSettings} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Save size={15} />
                {saving ? '저장 중...' : '저장'}
              </button>
              {saveMsg && <span className={`text-sm ${saveMsg.includes('실패') ? 'text-red-600' : 'text-green-600'}`}>{saveMsg}</span>}
            </div>
          )}
        </div>
      )}

      {/* ── 팀 설정 탭 ── */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {!canManageUsers && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2.5 rounded-lg">
              마스터 권한이 필요합니다.
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">팀 목록</span>
            </div>
            {canManageUsers && (
              <div className="flex gap-2 mb-3">
                <input
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTeam()}
                  placeholder="팀 이름 입력"
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button onClick={addTeam} disabled={!newTeamName.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
                  <Plus size={13} /> 추가
                </button>
              </div>
            )}
            <div className="space-y-1.5">
              {(settings.teams || []).length === 0 && <p className="text-xs text-gray-400 py-1">등록된 팀이 없습니다.</p>}
              {(settings.teams || []).map((team, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-700">{team}</span>
                  {canManageUsers && (
                    <button onClick={() => removeTeam(idx)} className="text-gray-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          {canManageUsers && (
            <div className="flex items-center gap-3">
              <button onClick={saveSettings} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                <Save size={15} />
                {saving ? '저장 중...' : '저장'}
              </button>
              {saveMsg && <span className={`text-sm ${saveMsg.includes('실패') ? 'text-red-600' : 'text-green-600'}`}>{saveMsg}</span>}
            </div>
          )}
        </div>
      )}

      {/* ── 지원사업 등록 탭 ── */}
      {activeTab === 'programs' && (
        <div className="space-y-6">
          {!canEdit && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2.5 rounded-lg">
              관리자 권한이 필요합니다.
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <ListEditor label="지원 프로그램 목록" stateKey="programs" />
          </div>
          {(canEdit || canManageUsers) && (
            <div className="flex items-center gap-3">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save size={15} />
                {saving ? '저장 중...' : '저장'}
              </button>
              {saveMsg && (
                <span className={`text-sm ${saveMsg.includes('실패') ? 'text-red-600' : 'text-green-600'}`}>{saveMsg}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 사용자 관리 탭 ── */}
      {activeTab === 'users' && canManageUsers && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">사용자 목록</span>
            <span className="text-xs text-gray-400">{users.length}명</span>
          </div>
          {usersLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">로딩 중...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">이름</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">이메일</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">권한</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">소속 팀</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">상태</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={u.name} />
                        <span className="font-medium text-gray-800">{u.name}</span>
                        {u.id === profile?.id && (
                          <span className="text-xs text-blue-500">(나)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[u.role] || 'bg-gray-100 text-gray-500'}`}>
                        {ROLES[u.role]?.label || u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {u.id !== profile?.id ? (
                        <select
                          value={u.department || ''}
                          onChange={e => updateDepartment(u.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        >
                          <option value="">미지정</option>
                          {settings.teams.filter(t => t.trim()).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-500">{u.department || '미지정'}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                        {u.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {u.id !== profile?.id && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openRoleModal(u)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            <UserCog size={13} /> 권한 변경
                          </button>
                          <button
                            onClick={() => toggleActive(u)}
                            title={u.is_active ? '비활성화' : '활성화'}
                            className={`flex items-center gap-1 text-xs ${u.is_active ? 'text-orange-400 hover:text-orange-600' : 'text-green-500 hover:text-green-700'}`}
                          >
                            <PowerOff size={13} />
                            {u.is_active ? '비활성화' : '활성화'}
                          </button>
                          <button
                            onClick={() => openDeleteModal(u)}
                            title="계정 삭제"
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
                          >
                            <UserX size={13} /> 삭제
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400 text-xs">사용자가 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* 계정 생성 안내 */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">
              직원이 앱 로그인 화면에서 <strong>회원가입</strong>하면 자동으로 <strong>열람자</strong> 권한으로 등록됩니다.
              이 화면에서 권한을 변경해 주세요.
            </p>
          </div>
        </div>
      )}

      {/* ── 비밀번호 변경 탭 ── */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="8자 이상 입력"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="비밀번호 재입력"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.includes('변경됐습니다') ? 'text-green-600' : 'text-red-500'}`}>
              {pwMsg}
            </p>
          )}
          <button
            onClick={changePassword}
            disabled={pwLoading}
            className="w-full py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: '#2E75B6' }}
          >
            {pwLoading ? '변경 중...' : '변경하기'}
          </button>
        </div>
      )}

      {/* 계정 삭제 확인 모달 */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteTarget(null) }}
        title="계정 삭제"
        footer={
          <>
            <button
              onClick={() => { setDeleteModalOpen(false); setDeleteTarget(null) }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={deleteUser}
              disabled={deleting}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? '삭제 중...' : '삭제 확인'}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
              <Avatar name={deleteTarget.name} />
              <div>
                <div className="font-medium text-gray-800 text-sm">{deleteTarget.name}</div>
                <div className="text-xs text-gray-500">{deleteTarget.email}</div>
              </div>
            </div>
            <p className="text-sm text-gray-700">
              이 계정을 <strong className="text-red-600">영구 삭제</strong>합니다.<br />
              로그인 정보와 모든 계정 데이터가 삭제되며 <strong>복구할 수 없습니다.</strong>
            </p>
          </div>
        )}
      </Modal>

      {/* 권한 변경 모달 */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="권한 변경"
        footer={
          <>
            <button onClick={() => setRoleModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
            <button onClick={saveRole} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">저장</button>
          </>
        }
      >
        {targetUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Avatar name={targetUser.name} />
              <div>
                <div className="font-medium text-gray-800 text-sm">{targetUser.name}</div>
                <div className="text-xs text-gray-500">{targetUser.email}</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">권한 선택</label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="role"
                      value={opt.value}
                      checked={newRole === opt.value}
                      onChange={() => setNewRole(opt.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {opt.value === 'master'  && '전체 관리, 사용자 권한 변경, 팀 설정 수정'}
                        {opt.value === 'admin'   && '팀 설정 수정, 데이터 삭제, 권한 일부 관리'}
                        {opt.value === 'manager' && '데이터 등록·수정 가능 (삭제 불가)'}
                        {opt.value === 'viewer'  && '데이터 조회만 가능 (쓰기 불가)'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
