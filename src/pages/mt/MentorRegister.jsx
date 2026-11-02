// 공개: 울산경제일자리진흥원 전문멘토 등록 신청서
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatPhone } from '../../utils/formatPhone'
import { REGIONS, METHODS, GRADE_CRITERIA, REQUIRED_DOCS, ALL_SUBS, checkFile, newFileName } from '../../lib/mentorFields'
import { FieldPicker, ChipGroup, TagInput, RowsInput, Label, Card } from './mtUi'
import { BUCKET } from './mtHelpers'
import { Loader2, CheckCircle2, Upload } from 'lucide-react'

const init = {
  name: '', birth_date: '', phone: '', email: '', org: '', position: '',
  bank_name: '', bank_account: '', account_holder: '',
  education: '', major: '', address: '',
  fields: [], field_etc: '', priority_fields: ['', '', ''], keywords: [],
  regions: [], methods: [],
  educations: [], licenses: [], careers: [], track_records: [],
  requested_grade: '', conflicts: '',
  agreed_privacy: false, agreed_third: false, agreed_integrity: false,
}

export default function MentorRegister() {
  const [f, setF] = useState(init)
  const [files, setFiles] = useState({})   // kind -> File[]
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const chosenSubs = f.fields.map(x => x.sub)

  function pickFiles(kind, list) {
    const arr = Array.from(list || [])
    for (const file of arr) { const err = checkFile(file); if (err) { alert(`${file.name}: ${err}`); return } }
    setFiles(p => ({ ...p, [kind]: [...(p[kind] || []), ...arr] }))
  }

  async function submit(e) {
    e.preventDefault()
    const miss = []
    if (!f.name.trim()) miss.push('성명')
    if (!f.phone.trim()) miss.push('연락처')
    if (!f.email.trim()) miss.push('메일주소')
    if (!f.fields.length && !f.field_etc.trim()) miss.push('전문분야')
    if (!f.regions.length) miss.push('활동 가능 지역')
    if (!f.methods.length) miss.push('멘토링 방식')
    if (miss.length) { alert(`필수 항목을 입력해주세요: ${miss.join(', ')}`); return }
    if (!f.agreed_privacy || !f.agreed_third || !f.agreed_integrity) {
      alert('개인정보 수집·이용, 제3자 제공 동의와 청렴 이행·보안 서약은 필수입니다.'); return
    }
    setBusy(true)
    const id = crypto.randomUUID()
    const uploaded = []
    try {
      const all = [...Object.entries(files).flatMap(([kind, arr]) => arr.map(file => ({ kind, file }))),
        ...(photo ? [{ kind: 'photo', file: photo }] : [])]
      for (const { kind, file } of all) {
        const path = `applications/${id}/${kind}-${newFileName(file.name)}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined })
        if (error) throw new Error(`${file.name} 업로드 실패: ${error.message}`)
        uploaded.push({ kind, path, name: file.name, size: file.size })
      }
      const payload = {
        ...f,
        priority_fields: f.priority_fields.filter(Boolean),
        bank_name: undefined, bank_account: undefined, account_holder: undefined,
      }
      const { error } = await supabase.from('mt_applications').insert({
        id, payload,
        name: f.name.trim(), phone: f.phone, email: f.email.trim(), org: f.org,
        requested_grade: f.requested_grade ? Number(f.requested_grade) : null,
        bank_name: f.bank_name, bank_account: f.bank_account, account_holder: f.account_holder,
        files: uploaded,
        agreed_privacy: f.agreed_privacy, agreed_third: f.agreed_third, agreed_integrity: f.agreed_integrity,
      })
      if (error) throw new Error(error.message)
      setDone(true)
    } catch (err) {
      alert('제출 중 오류가 발생했습니다.\n' + err.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
        <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
        <h1 className="text-lg font-bold mt-4">멘토 등록 신청이 접수되었습니다</h1>
        <p className="text-sm text-gray-500 mt-2">증빙서류 검토 후 등급 판정 결과와 멘토 포털 접속 안내를 메일로 보내드립니다.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0D1B2A] text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center gap-3">
          <img src="/logo.gif" alt="" className="h-8" style={{ filter: 'brightness(0) invert(1)' }} />
          <div>
            <div className="text-xs text-white/60">울산경제일자리진흥원</div>
            <h1 className="text-lg font-bold">전문멘토 등록 신청서</h1>
          </div>
        </div>
      </header>

      <form onSubmit={submit} className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Card title="1. 기본 정보">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label required>성명</Label><input className="form-input" value={f.name} onChange={e => set('name', e.target.value)} /></div>
            <div><Label>생년월일</Label><input type="date" className="form-input" value={f.birth_date} onChange={e => set('birth_date', e.target.value)} /></div>
            <div><Label required>연락처</Label><input className="form-input" value={f.phone} onChange={e => set('phone', formatPhone(e.target.value))} /></div>
            <div><Label required>메일주소</Label><input type="email" className="form-input" value={f.email} onChange={e => set('email', e.target.value)} /></div>
            <div><Label>소속</Label><input className="form-input" value={f.org} onChange={e => set('org', e.target.value)} /></div>
            <div><Label>직위</Label><input className="form-input" value={f.position} onChange={e => set('position', e.target.value)} /></div>
            <div><Label>최종학력</Label><input className="form-input" placeholder="예: OO대학교 대학원 박사" value={f.education} onChange={e => set('education', e.target.value)} /></div>
            <div><Label>전공</Label><input className="form-input" value={f.major} onChange={e => set('major', e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>주소</Label><input className="form-input" value={f.address} onChange={e => set('address', e.target.value)} /></div>
            <div><Label>은행명</Label><input className="form-input" value={f.bank_name} onChange={e => set('bank_name', e.target.value)} /></div>
            <div><Label>계좌번호</Label><input className="form-input" value={f.bank_account} onChange={e => set('bank_account', e.target.value)} /></div>
            <div><Label>예금주</Label><input className="form-input" value={f.account_holder} onChange={e => set('account_holder', e.target.value)} /></div>
            <div><Label>사진</Label><input type="file" accept="image/*" className="text-xs" onChange={e => setPhoto(e.target.files?.[0] || null)} /></div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">※ 주민등록번호는 이 신청서에서 받지 않습니다. 수당 지급 시 별도로 안내드립니다.</p>
        </Card>

        <Card title="2. 전문분야 (중복 선택 가능)">
          <FieldPicker value={f.fields} onChange={v => set('fields', v)} />
          <div className="mt-3"><Label>기타 (직접 기재)</Label><input className="form-input" value={f.field_etc} onChange={e => set('field_etc', e.target.value)} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {[0, 1, 2].map(i => (
              <div key={i}>
                <Label>주력 분야 {i + 1}순위</Label>
                <select className="form-input" value={f.priority_fields[i]}
                  onChange={e => set('priority_fields', f.priority_fields.map((p, idx) => idx === i ? e.target.value : p))}>
                  <option value="">선택</option>
                  {(chosenSubs.length ? chosenSubs : ALL_SUBS.map(s => s.sub)).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-3"><Label>주요 키워드</Label><TagInput value={f.keywords} onChange={v => set('keywords', v)} placeholder="예: 스마트스토어, 챗GPT (Enter로 추가)" /></div>
        </Card>

        <Card title="3. 활동 지역 및 방식">
          <div className="space-y-3">
            <div><Label required>활동 가능 지역</Label><ChipGroup options={REGIONS} value={f.regions} onChange={v => set('regions', v)} /></div>
            <div><Label required>멘토링 방식</Label><ChipGroup options={METHODS} value={f.methods} onChange={v => set('methods', v)} />
              <p className="text-[11px] text-gray-400 mt-1">둘 다 선택하면 '모두 가능'입니다.</p></div>
          </div>
        </Card>

        <Card title="4. 학력">
          <RowsInput value={f.educations} onChange={v => set('educations', v)}
            columns={[{ key: 'period', label: '기간 (예: 2010.03~2014.02)' }, { key: 'school', label: '학교명' }, { key: 'major', label: '전공' }, { key: 'degree', label: '학위' }]} />
        </Card>

        <Card title="5. 자격·면허">
          <RowsInput value={f.licenses} onChange={v => set('licenses', v)}
            columns={[{ key: 'name', label: '자격증명' }, { key: 'date', label: '발급일자', type: 'date' }, { key: 'issuer', label: '발급기관' }, { key: 'note', label: '비고' }]} />
        </Card>

        <Card title="6. 근무경력">
          <RowsInput value={f.careers} onChange={v => set('careers', v)}
            columns={[{ key: 'org', label: '소속' }, { key: 'period', label: '기간' }, { key: 'dept', label: '부서명' }, { key: 'position', label: '직위(직급)' },
              { key: 'duty', label: '담당업무' }, { key: 'project', label: '사업(프로젝트)명' }]} />
        </Card>

        <Card title="7. 컨설팅·멘토링·강의 실적 (최근 3년 위주)">
          <RowsInput value={f.track_records} onChange={v => set('track_records', v)}
            columns={[{ key: 'agency', label: '수행기관' }, { key: 'period', label: '기간' }, { key: 'project', label: '사업(프로젝트)명' },
              { key: 'kind', label: '구분(컨설팅/멘토링/강의/자문)' }, { key: 'field', label: '분야' },
              { key: 'target', label: '대상(소상공인/창업기업/중소기업/기타)' }, { key: 'content', label: '수행 내용' }]} />
        </Card>

        <Card title="8. 멘토 등급 (희망)">
          <div className="space-y-2">
            {[1, 2, 3].map(g => (
              <label key={g} className={`flex gap-3 p-3 rounded-lg border cursor-pointer ${String(f.requested_grade) === String(g) ? 'border-[#2E75B6] bg-blue-50' : 'border-gray-200'}`}>
                <input type="radio" name="grade" checked={String(f.requested_grade) === String(g)} onChange={() => set('requested_grade', g)} />
                <div><div className="text-sm font-bold">{g}급</div>
                  <ul className="text-xs text-gray-500 list-disc ml-4">{GRADE_CRITERIA[g].map(c => <li key={c}>{c}</li>)}</ul></div>
              </label>
            ))}
            <p className="text-[11px] text-gray-400">※ 멘토 등급 판정은 제출한 증빙서류를 기준으로 하며, 증빙이 없는 이력은 인정하지 않을 수 있습니다.</p>
          </div>
        </Card>

        <Card title="9. 제출서류">
          <div className="space-y-2">
            {REQUIRED_DOCS.map(d => (
              <div key={d.kind} className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-gray-100 pb-2">
                <div className="sm:w-72 text-sm">{d.label}</div>
                <label className="inline-flex items-center gap-1 text-xs text-[#2E75B6] cursor-pointer font-semibold">
                  <Upload size={13} /> 파일 선택
                  <input type="file" multiple className="hidden" onChange={e => { pickFiles(d.kind, e.target.files); e.target.value = '' }} />
                </label>
                <div className="text-xs text-gray-500 flex-1">
                  {(files[d.kind] || []).map((file, i) => (
                    <span key={i} className="inline-flex items-center gap-1 mr-2">{file.name}
                      <button type="button" className="text-red-400" onClick={() => setFiles(p => ({ ...p, [d.kind]: p[d.kind].filter((_, idx) => idx !== i) }))}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-gray-400">PDF·HWP·이미지 등, 파일당 20MB 이하</p>
          </div>
        </Card>

        <Card title="이해관계 신고 (청렴 이행 및 보안서약서 4항)">
          <Label>친족·거래·투자 관계 등 이해관계가 있는 기업 (없으면 비워두세요)</Label>
          <textarea className="form-input" rows={2} value={f.conflicts} onChange={e => set('conflicts', e.target.value)} placeholder="예: OO상사(친족 운영)" />
        </Card>

        <Card title="동의 및 서약">
          <div className="space-y-3 text-sm">
            <Agree checked={f.agreed_privacy} onChange={v => set('agreed_privacy', v)} required
              title="[필수] 개인정보 수집·이용 동의"
              body="이용목적: 전문 컨설팅 및 멘토링 프로그램 운영(멘토 등급 판정, 멘토링 매칭 포함), 수당 지급 및 기타소득 신고 / 수집항목: 성명, 생년월일, 연락처, 메일주소, 소속·직위, 최종학력, 전공, 주소, 계좌번호, 근무경력, 자격면허, 컨설팅·멘토링 실적, 전문분야, 활동지역, 멘토등급 / 보유기간: 목적 달성 또는 삭제 요청 시 파기(사업 종료 후 이력관리 목적 동의일로부터 5년). 동의하지 않으면 멘토 등록이 불가합니다." />
            <Agree checked={f.agreed_third} onChange={v => set('agreed_third', v)} required
              title="[필수] 개인정보 제3자 제공 동의"
              body="제공받는 자: 진흥원 수행사업의 공동수행기관(컨소시엄 참여기관) 및 멘토링 대상 기업 / 목적: 멘토 정보 사전 제공 및 멘토링 매칭 / 제공항목: 성명, 연락처, 메일주소, 소속·직위, 최종학력, 전공, 근무경력, 자격면허, 실적, 전문분야 / 보유기간: 동의일로부터 2년. 동의하지 않으면 멘토링 매칭 및 활동이 제한될 수 있습니다." />
            <Agree checked={f.agreed_integrity} onChange={v => set('agreed_integrity', v)} required
              title="[필수] 청렴 이행 및 보안 서약"
              body="금품·향응 등 부당한 이익을 요구하거나 받지 않으며, 멘토링 관련 정보와 대상 기업의 경영·기술·고객정보를 멘토링 목적으로만 활용하고 유출하지 않으며, 멘토링을 영리 목적으로 이용하지 않고, 대상 기업과 이해관계가 있는 경우 사전에 알리고 제외를 요청합니다. 위반 시 멘토 등록 취소 등의 조치를 감수합니다." />
          </div>
        </Card>

        <button disabled={busy} className="w-full py-3 rounded-xl text-white font-bold bg-[#2E75B6] disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 size={16} className="animate-spin" />} 멘토 등록 신청
        </button>
        <p className="text-center text-[11px] text-gray-400 pb-8">기재 내용이 사실과 다를 경우 등록 취소 등의 조치에 이의를 제기하지 않습니다.</p>
      </form>
    </div>
  )
}

function Agree({ checked, onChange, title, body }) {
  return (
    <label className="block border border-gray-200 rounded-lg p-3 cursor-pointer">
      <div className="flex items-center gap-2 font-semibold">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />{title}
      </div>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{body}</p>
    </label>
  )
}
