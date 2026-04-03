// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 데이터 스토어 (localStorage 기반)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DB = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  id: () => Date.now().toString(36) + Math.random().toString(36).slice(2,6),
};

// 기본 샘플 데이터
function initData() {
  if (DB.get('settings').length === 0) {
    DB.set('settings', [{
      staff:    ['김민준','이서연','박지훈','최수아','정도윤','한채원','박현우'],
      programs: ['예비창업패키지','초기창업패키지','창업도약패키지','로컬크리에이터',
                 '창업자금융자','R&D지원','상권분석컨설팅','투자연계',
                 '글로벌진출','IP·특허','세무·노무교육','SNS·마케팅','멘토링','공간·인큐베이터','기타'],
      stages:   ['아이디어 단계','준비 중','초기(1년 미만)','운영 중','성장기'],
      methods:  ['방문(대면)','전화','화상(Zoom·Teams)'],
    }]);
  }
  if (DB.get('founders').length === 0) {
    const sample = [
      {id:'f001',name:'김지훈',phone:'010-1234-5678',biz:'AI 기반 재고관리 앱',region:'울산 남구',stage:'초기(1년 미만)',q1:'예',q2:'예',q3:'예',q4:'아니요',q5:'예',q6:'예',q7:'기술 고도화',verdict:'테크 창업',date:'2026-03-20'},
      {id:'f002',name:'박미나',phone:'010-2345-6789',biz:'수제 베이커리 카페',region:'울산 중구',stage:'준비 중',q1:'아니요',q2:'아니요',q3:'아니요',q4:'아니요',q5:'아니요',q6:'아니요',q7:'지역 운영 확대',verdict:'로컬 창업',date:'2026-03-18'},
      {id:'f003',name:'최성호',phone:'010-3456-7890',biz:'O2O 음식 배달 플랫폼',region:'울산 남구',stage:'아이디어 단계',q1:'예',q2:'아니요',q3:'예',q4:'아니요',q5:'예',q6:'예',q7:'기술 고도화',verdict:'테크 창업 (혼합)',date:'2026-03-15'},
      {id:'f004',name:'이도현',phone:'010-4567-8901',biz:'HR 관리 SaaS',region:'울산 울주군',stage:'운영 중',q1:'예',q2:'예',q3:'예',q4:'예',q5:'예',q6:'예',q7:'기술 고도화',verdict:'테크 창업',date:'2026-03-10'},
      {id:'f005',name:'정유나',phone:'010-5678-9012',biz:'반려동물 용품 쇼핑몰',region:'울산 북구',stage:'준비 중',q1:'아니요',q2:'아니요',q3:'아니요',q4:'아니요',q5:'아니요',q6:'아니요',q7:'지역 운영 확대',verdict:'로컬 창업',date:'2026-03-08'},
    ];
    DB.set('founders', sample);
  }
  if (DB.get('consults').length === 0) {
    DB.set('consults', [
      {id:'c001',founderId:'f001',date:'2026-03-25',staff:'이서연',method:'방문',verdict:'테크 창업',finalVerdict:'테크 창업',request:'초기 투자 연계 문의',content:'기술 고도화 방향 및 초기창업패키지 안내',programs:['초기창업패키지'],status:'후속필요',followUp:'다음 주 서류 준비 지원 예정',nextDate:'2026-04-01',memo:''},
      {id:'c002',founderId:'f002',date:'2026-03-24',staff:'김민준',method:'방문',verdict:'로컬 창업',finalVerdict:'로컬 창업',request:'창업 자금 문의',content:'로컬크리에이터 지원사업 안내 및 신청 방법 설명',programs:['로컬크리에이터'],status:'완료',followUp:'',nextDate:'',memo:''},
      {id:'c003',founderId:'f003',date:'2026-03-23',staff:'박지훈',method:'전화',verdict:'혼합형',finalVerdict:'혼합형',request:'사업 방향성 자문',content:'테크/로컬 혼합 구조 분석, 예비창업패키지 안내',programs:['예비창업패키지'],status:'진행중',followUp:'추가 상담 예정',nextDate:'2026-04-05',memo:''},
      {id:'c004',founderId:'f004',date:'2026-03-22',staff:'최수아',method:'온라인',verdict:'테크 창업',finalVerdict:'테크 창업',request:'R&D 지원 연계',content:'R&D 지원사업 상세 안내, 신청서 작성 도움',programs:['R&D지원'],status:'완료',followUp:'',nextDate:'',memo:''},
    ]);
  }
  if (DB.get('supports').length === 0) {
    DB.set('supports', [
      {id:'s001',founderId:'f001',program:'톡톡팩토리',startDate:'2023-01-01',endDate:'2023-12-31',stage:'수령완료',result:'선정',amount:'500',staff:'이서연',memo:'창업공간 1년 입주'},
      {id:'s002',founderId:'f001',program:'초기창업패키지',startDate:'2024-03-01',endDate:'2024-08-31',stage:'수령완료',result:'선정',amount:'1000',staff:'이서연',memo:''},
      {id:'s003',founderId:'f001',program:'R&D지원',startDate:'2025-01-01',endDate:'',stage:'심사중',result:'-',amount:'',staff:'최수아',memo:''},
      {id:'s004',founderId:'f004',program:'예비창업패키지',startDate:'2022-06-01',endDate:'2022-11-30',stage:'수령완료',result:'선정',amount:'800',staff:'최수아',memo:''},
      {id:'s005',founderId:'f004',program:'초기창업패키지',startDate:'2023-04-01',endDate:'2023-09-30',stage:'수령완료',result:'선정',amount:'1000',staff:'최수아',memo:''},
      {id:'s006',founderId:'f004',program:'창업도약패키지',startDate:'2024-05-01',endDate:'2025-02-28',stage:'수령완료',result:'선정',amount:'2000',staff:'최수아',memo:''},
      {id:'s007',founderId:'f002',program:'로컬크리에이터',startDate:'2024-03-01',endDate:'2024-08-31',stage:'서류심사',result:'-',amount:'',staff:'김민준',memo:''},
      {id:'s008',founderId:'f005',program:'창업자금융자',startDate:'2026-01-15',endDate:'',stage:'수령완료',result:'선정',amount:'500',staff:'정도윤',memo:''},
    ]);
  }
  if (DB.get('companies').length === 0) {
    DB.set('companies', [
      {id:'co001',founderId:'f001',name:'(주)데이터온',regDate:'2024-06-01',biz:'AI·소프트웨어',staff:'이서연',status:'성장중'},
      {id:'co002',founderId:'f002',name:'베이크하우스',regDate:'2024-11-15',biz:'식음료',staff:'김민준',status:'운영중'},
      {id:'co003',founderId:'f004',name:'(주)HR온',regDate:'2023-09-01',biz:'SaaS',staff:'최수아',status:'스케일업'},
    ]);
  }
  if (DB.get('growths').length === 0) {
    DB.set('growths', [
      {id:'g001',founderId:'f001',year:'2023',revenue:'80', employees:'2',investment:'0',  memo:'톡톡팩토리 입주 첫해'},
      {id:'g002',founderId:'f001',year:'2024',revenue:'420',employees:'8',investment:'200',memo:'초기창업패키지 수혜 후 성장'},
      {id:'g003',founderId:'f001',year:'2025',revenue:'890',employees:'14',investment:'500',memo:'시리즈A 투자 유치'},
      {id:'g004',founderId:'f004',year:'2022',revenue:'50', employees:'1',investment:'0',  memo:'예비창업패키지 수혜'},
      {id:'g005',founderId:'f004',year:'2023',revenue:'210',employees:'5',investment:'0',  memo:'초기창업패키지 수혜'},
      {id:'g006',founderId:'f004',year:'2024',revenue:'580',employees:'11',investment:'300',memo:'창업도약패키지 수혜'},
      {id:'g007',founderId:'f004',year:'2025',revenue:'710',employees:'15',investment:'500',memo:'시리즈B 준비중'},
      {id:'g008',founderId:'f002',year:'2025',revenue:'180',employees:'3',investment:'0',  memo:''},
    ]);
  }
  if (DB.get('consultRequests').length === 0) {
    DB.set('consultRequests', [
      {id:'cr001', name:'홍길동', phone:'010-9876-5432', email:'hong@email.com',
       biz:'친환경 포장재 제조', region:'울산 남구', gender:'남',
       method:'줌(Zoom)', preferDate:'2026-04-05', preferTime:'14:00',
       request:'창업 초기 자금 조달 방법과 지원사업 신청 절차가 궁금합니다.',
       status:'대기중', staff:'', assignedAt:'', memo:'',
       createdAt:'2026-03-30'},
      {id:'cr002', name:'이수진', phone:'010-8765-4321', email:'lee@email.com',
       biz:'반려동물 케어 서비스', region:'울산 북구', gender:'여',
       method:'방문(대면)', preferDate:'2026-04-07', preferTime:'10:00',
       request:'사업계획서 작성 방법과 유형 판정을 받고 싶습니다.',
       status:'담당자배정', staff:'김민준', assignedAt:'2026-03-31', memo:'',
       createdAt:'2026-03-29'},
      {id:'cr003', name:'박성민', phone:'010-7654-3210', email:'park@email.com',
       biz:'IT 교육 플랫폼', region:'울산 중구', gender:'남',
       method:'전화', preferDate:'2026-04-03', preferTime:'15:00',
       request:'테크 창업 지원사업 종류와 신청 방법을 알고 싶습니다.',
       status:'상담완료', staff:'이서연', assignedAt:'2026-03-28', memo:'전화 상담 완료',
       createdAt:'2026-03-27'},
    ]);
  }
  if (DB.get('selectedFirms').length === 0) {
    DB.set('selectedFirms', [
      {id:'sf001',companyName:'(주)스마트모빌리티',ceo:'강태영',bizNo:'123-45-67890',sector:'모빌리티·IoT',type:'테크',region:'울산 북구',phone:'052-111-2222',email:'ceo@smartmob.co.kr',employees:'12',foundYear:'2021',program:'창업도약패키지',startDate:'2024-04-01',endDate:'2025-03-31',amount:'3000',staff:'이서연',status:'완료',postMgmt:'후속관리중',memo:'자율주행 물류 솔루션 개발사',hasConsult:false,founderId:''},
      {id:'sf002',companyName:'로컬키친협동조합',ceo:'윤미경',bizNo:'234-56-78901',sector:'식품·외식',type:'로컬',region:'울산 중구',phone:'052-222-3333',email:'info@localkitchen.kr',employees:'8',foundYear:'2022',program:'로컬크리에이터',startDate:'2024-06-01',endDate:'2024-11-30',amount:'1500',staff:'김민준',status:'완료',postMgmt:'완료',memo:'지역 식재료 활용 공유주방 운영',hasConsult:false,founderId:''},
      {id:'sf003',companyName:'울산테크허브(주)',ceo:'박준서',bizNo:'345-67-89012',sector:'IT·소프트웨어',type:'테크',region:'울산 남구',phone:'052-333-4444',email:'park@utechhub.com',employees:'25',foundYear:'2020',program:'창업도약패키지',startDate:'2023-03-01',endDate:'2024-02-28',amount:'4000',staff:'최수아',status:'완료',postMgmt:'성장추적중',memo:'B2B SaaS 플랫폼, 매출 성장세',hasConsult:false,founderId:''},
      {id:'sf004',companyName:'그린팜테크',ceo:'이지현',bizNo:'456-78-90123',sector:'농업·푸드테크',type:'테크',region:'울산 울주군',phone:'052-444-5555',email:'lee@greenfarm.kr',employees:'6',foundYear:'2023',program:'예비창업패키지',startDate:'2023-09-01',endDate:'2024-02-28',amount:'1000',staff:'정도윤',status:'완료',postMgmt:'후속관리중',memo:'스마트팜 센서·관제 솔루션',hasConsult:false,founderId:''},
    ]);
  }
  if (DB.get('experts').length === 0) {
    DB.set('experts', [
      {id:'e001',name:'김상훈',field:'기술·R&D',subField:'AI·빅데이터·SW개발',org:'한국과학기술원',role:'교수',phone:'010-1111-2222',email:'kim@kaist.ac.kr',career:'삼성전자 AI연구소 10년, KAIST 교수 5년',avail:'화·목 오후',cost:'무료(진흥원 지원)',status:'활동중',memo:'스타트업 기술 자문 경험 다수'},
      {id:'e002',name:'박정아',field:'경영·마케팅',subField:'브랜딩·온라인마케팅·SNS',org:'울산대학교',role:'교수',phone:'010-2222-3333',email:'park@ulsan.ac.kr',career:'LG전자 마케팅 15년, 현 울산대 교수',avail:'월·수 오전',cost:'무료(진흥원 지원)',status:'활동중',memo:'로컬 창업 마케팅 전문'},
      {id:'e003',name:'이준혁',field:'법무·특허',subField:'창업법률·IP·특허',org:'법무법인 울산',role:'변호사',phone:'010-3333-4444',email:'lee@lawulsan.com',career:'변호사 12년, 특허법인 창업 자문 전문',avail:'금 오전',cost:'1회 5만원',status:'활동중',memo:'창업법인 설립, 계약서 검토 전문'},
      {id:'e004',name:'최민지',field:'재무·투자',subField:'VC투자·재무모델·IR',org:'울산벤처캐피탈',role:'심사역',phone:'010-4444-5555',email:'choi@uvc.co.kr',career:'VC 심사역 7년, 스타트업 투자 50건 이상',avail:'목 오후',cost:'무료(진흥원 지원)',status:'활동중',memo:'시드~시리즈A 투자 연계 가능'},
      {id:'e005',name:'정소연',field:'인사·노무',subField:'노무관리·4대보험·급여',org:'공인노무사 사무소',role:'공인노무사',phone:'010-5555-6666',email:'jung@labor.kr',career:'노무사 8년, 중소기업 인사 자문',avail:'화·목 오전',cost:'1회 3만원',status:'휴식중',memo:'창업 초기 인사 구조 설계 전문'},
    ]);
  }
  if (DB.get('mentorings').length === 0) {
    DB.set('mentorings', [
      {id:'m001',expertId:'e001',targetType:'founder',targetId:'f001',targetName:'김지훈',program:'기술 자문',date:'2026-03-10',time:'14:00',duration:'2',method:'방문',status:'완료',cost:'0',content:'AI 모델 고도화 방향 자문. 경량화 기법 적용 권고.',outcome:'기술 로드맵 수립 완료',nextDate:'2026-04-10',staff:'이서연',memo:''},
      {id:'m002',expertId:'e002',targetType:'selected',targetId:'sf001',targetName:'(주)스마트모빌리티',program:'마케팅 멘토링',date:'2026-03-15',time:'10:00',duration:'1.5',method:'온라인',status:'완료',cost:'0',content:'B2B 영업 전략 및 홍보 채널 수립 멘토링',outcome:'LinkedIn 마케팅 계획 수립',nextDate:'2026-04-15',staff:'이서연',memo:''},
      {id:'m003',expertId:'e004',targetType:'founder',targetId:'f004',targetName:'이도현',program:'투자 유치 자문',date:'2026-04-05',time:'15:00',duration:'2',method:'방문',status:'예정',cost:'0',content:'',outcome:'',nextDate:'',staff:'최수아',memo:'시리즈A IR자료 검토 예정'},
      {id:'m004',expertId:'e003',targetType:'selected',targetId:'sf003',targetName:'울산테크허브(주)',program:'법무 자문',date:'2026-03-20',time:'11:00',duration:'1',method:'전화',status:'완료',cost:'50000',content:'기술이전 계약서 검토 및 NDA 작성 자문',outcome:'계약서 수정 완료',nextDate:'',staff:'최수아',memo:''},
    ]);
  }
  if (DB.get('selectedNotes').length === 0) {
    DB.set('selectedNotes', [
      {id:'sn001',firmId:'sf001',date:'2025-01-15',staff:'이서연',type:'방문점검',content:'사무실 방문, 개발 진행상황 확인. 베타 출시 예정 3월로 확정.',nextDate:'2025-04-01'},
      {id:'sn002',firmId:'sf001',date:'2025-03-20',staff:'이서연',type:'전화',content:'베타 출시 완료, 파일럿 고객 3개사 확보. 정부과제 추가 연계 논의.',nextDate:'2025-06-01'},
      {id:'sn003',firmId:'sf003',date:'2024-06-10',staff:'최수아',type:'방문점검',content:'연매출 5억 돌파, 고용 25명. 시리즈A 투자 준비중.',nextDate:'2024-09-01'},
    ]);
  }
}

// 설정 가져오기
const cfg = () => DB.get('settings')[0] || {staff:[],programs:[],stages:[],methods:[]};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 유틸
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const $ = id => document.getElementById(id);
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function verdictBadge(v) {
  if (!v) return '';
  if (v.includes('테크'))  return `<span class="badge badge-blue">${esc(v)}</span>`;
  if (v.includes('로컬'))  return `<span class="badge badge-green">${esc(v)}</span>`;
  if (v.includes('혼합'))  return `<span class="badge badge-amber">${esc(v)}</span>`;
  return `<span class="badge badge-gray">${esc(v)}</span>`;
}
function statusBadge(s) {
  const m = {완료:'badge-green',후속필요:'badge-red',진행중:'badge-blue',선정:'badge-green',미선정:'badge-red',심사중:'badge-amber',서류심사:'badge-teal',신청완료:'badge-teal',수령완료:'badge-purple'};
  return `<span class="badge ${m[s]||'badge-gray'}">${esc(s)}</span>`;
}
function founderName(id) {
  const f = DB.get('founders').find(x=>x.id===id);
  return f ? f.name : '-';
}
function avatarHtml(name, cls='av-blue') {
  const colors = ['av-blue','av-green','av-amber','av-teal','av-purple'];
  const c = colors[(name||'').charCodeAt(0) % colors.length];
  return `<span class="avatar ${c}">${(name||'?')[0]}</span>`;
}
function calcVerdict(q1,q2,q3,q4,q5,q6,q7) {
  // Q1~Q6: 테크 지표 (예=테크 신호)
  // Q7: 혼합형 방향 확정 (기술고도화=테크 / 지역운영확대=로컬)
  const techQs  = [q1,q2,q3,q4,q5,q6];
  const answered = techQs.filter(q=>q==='예'||q==='아니요');
  if (answered.length < 5) return ''; // 최소 5개 이상 답해야 판정

  const yes = techQs.filter(q=>q==='예').length;
  const no  = techQs.filter(q=>q==='아니요').length;

  // Q6(수익 구조)는 가중치 부여: Q6=예 이면 yes에 0.5 추가
  const yesW = yes + (q6==='예' ? 0.5 : 0);
  const noW  = no  + (q6==='아니요' ? 0.5 : 0);

  if (yesW >= 5)   return '테크 창업';
  if (noW  >= 5)   return '로컬 창업';
  if (yesW >= 3.5) {
    // 혼합형 → Q7로 방향 확정
    if (q7==='기술 고도화') return '테크 창업 (혼합)';
    if (q7==='지역 운영 확대') return '로컬 창업 (혼합)';
    return '혼합형';
  }
  if (noW  >= 3.5) {
    if (q7==='기술 고도화') return '테크 창업 (혼합)';
    if (q7==='지역 운영 확대') return '로컬 창업 (혼합)';
    return '혼합형';
  }
  if (q7==='기술 고도화') return '테크 창업 (혼합)';
  if (q7==='지역 운영 확대') return '로컬 창업 (혼합)';
  return '혼합형';
}
function today() { return new Date().toISOString().slice(0,10); }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 모달
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function openModal(title, body, footer='', large=false) {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = body;
  $('modal-footer').innerHTML = footer;
  $('modal-box').className = 'modal' + (large?' modal-lg':'');
  $('modal-overlay').classList.add('open');
}
function closeModal() { $('modal-overlay').classList.remove('open'); }
$('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) closeModal(); });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 라우터
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PAGES = {
  dashboard:   { title:'대시보드', badge:'전체 현황', render: renderDashboard },
  stats:       { title:'통계 현황', badge:'지역·성별·유형 분석', render: renderStats },
  crequest:    { title:'상담 신청 관리', badge:'사전예약·담당자배정 (온라인/전화 신청)', render: renderConsultRequest },
  intake:      { title:'창업 상담 접수', badge:'현장·즉시 접수 및 유형 판정', render: renderIntake },
  consult:     { title:'상담일지', badge:'상담 관리', render: renderConsult },
  db:          { title:'창업자 DB', badge:'통합 이력 조회', render: renderDB },
  experts:     { title:'전문가 DB', badge:'전문가·멘토 등록 관리', render: renderExperts },
  mentoring:   { title:'전문가 상담·멘토링', badge:'매칭·일정·성과 관리', render: renderMentoring },
  support:     { title:'지원사업 연계', badge:'신청·추적 관리', render: renderSupport },
  selected:    { title:'선정기업 관리', badge:'지원사업 선정기업 현황', render: renderSelected },
  startup:     { title:'창업 현황', badge:'사업자 등록 관리', render: renderStartup },
  growth:      { title:'기업 성장 지표', badge:'매출·고용·투자', render: renderGrowth },
  report:      { title:'성과 보고', badge:'통계 자동 생성', render: renderReport },
  settings:    { title:'팀 설정', badge:'담당자·목록 관리', render: renderSettings },
};

function navigate(page) {
  closeSidebar();
  closeQuickPanel();
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const p = PAGES[page] || PAGES.dashboard;
  $('page-title').textContent = p.title;
  $('page-badge').textContent = p.badge;
  $('content').innerHTML = '';
  p.render();
  closeModal();
  setBottomTab(page);
}

document.querySelectorAll('.nav-item[data-page]').forEach(btn =>
  btn.addEventListener('click', () => navigate(btn.dataset.page))
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 상담 신청 관리 — 신청 접수·담당자 배정·확인
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const METHOD_ICONS = {
  '방문(대면)': '🏢', '전화': '📞', '화상(Zoom·Teams)': '💻'
};

function renderConsultRequest() {
  const reqs   = DB.get('consultRequests');
  const waiting = reqs.filter(r=>r.status==='대기중').length;
  const assigned= reqs.filter(r=>r.status==='담당자배정').length;
  const done    = reqs.filter(r=>r.status==='상담완료').length;

  $('content').innerHTML = `
  <div class="stat-grid">
    <div class="stat-card stat-blue">
      <div class="stat-label">전체 신청</div>
      <div class="stat-value">${reqs.length}건</div>
    </div>
    <div class="stat-card stat-red">
      <div class="stat-label">대기중 (배정필요)</div>
      <div class="stat-value">${waiting}건</div>
      <div class="stat-sub">${waiting>0?'⚠️ 담당자 배정 필요':'-'}</div>
    </div>
    <div class="stat-card stat-orange">
      <div class="stat-label">담당자 배정완료</div>
      <div class="stat-value">${assigned}건</div>
    </div>
    <div class="stat-card stat-green">
      <div class="stat-label">상담 완료</div>
      <div class="stat-value">${done}건</div>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <div class="tabs" style="margin-bottom:0">
      <button class="tab-btn active" id="cr-tab-all"      onclick="switchCRTab('all')">전체</button>
      <button class="tab-btn"        id="cr-tab-waiting"  onclick="switchCRTab('waiting')">대기중 ${waiting>0?`<span style="background:var(--red);color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;margin-left:4px">${waiting}</span>`:''}</button>
      <button class="tab-btn"        id="cr-tab-assigned" onclick="switchCRTab('assigned')">배정완료</button>
      <button class="tab-btn"        id="cr-tab-done"     onclick="switchCRTab('done')">상담완료</button>
    </div>
    <button class="btn btn-primary" onclick="openCRModal()">+ 상담 신청 등록</button>
  </div>

  <div id="cr-panel"></div>`;

  renderCRList('all');
}

function switchCRTab(tab) {
  ['all','waiting','assigned','done'].forEach(t=>{
    const btn = $(`cr-tab-${t}`);
    if(btn) btn.classList.toggle('active', t===tab);
  });
  renderCRList(tab);
}

function renderCRList(tab) {
  let reqs = DB.get('consultRequests');
  if(tab==='waiting')  reqs = reqs.filter(r=>r.status==='대기중');
  if(tab==='assigned') reqs = reqs.filter(r=>r.status==='담당자배정');
  if(tab==='done')     reqs = reqs.filter(r=>r.status==='상담완료');
  reqs = reqs.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));

  const panel = $('cr-panel');
  if(!panel) return;

  if(reqs.length===0){
    panel.innerHTML=`<div class="card"><div class="card-body" style="text-align:center;color:var(--gray4);padding:40px">해당 상담 신청이 없습니다</div></div>`;
    return;
  }

  const statusColor = {'대기중':'badge-red','담당자배정':'badge-amber','상담완료':'badge-green'};

  panel.innerHTML = `
  <div class="card">
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>신청자</th><th>연락처</th><th>업종·아이템</th><th>지역</th>
            <th>상담방법</th><th>희망일시</th><th>신청내용</th>
            <th>상태</th><th>담당자</th><th>관리</th>
          </tr>
        </thead>
        <tbody>
          ${reqs.map(r=>`
          <tr style="${r.status==='대기중'?'background:#FFF5F5;':''}">
            <td>
              <div style="display:flex;align-items:center;gap:6px">
                ${avatarHtml(r.name)}
                <div>
                  <div style="font-weight:600">${esc(r.name)}</div>
                  <div style="font-size:10px;color:var(--gray4)">${r.gender||''}</div>
                </div>
              </div>
            </td>
            <td style="font-size:12px">
              <div>${esc(r.phone)}</div>
              <div style="color:var(--gray4)">${esc(r.email||'')}</div>
            </td>
            <td style="font-size:12px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.biz||'-')}</td>
            <td style="font-size:12px;color:var(--gray5)">${esc(r.region||'-')}</td>
            <td>
              <div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:16px">${METHOD_ICONS[r.method]||'💬'}</span>
                <span style="font-size:12px;font-weight:500">${esc(r.method)}</span>
              </div>
            </td>
            <td style="font-size:12px">
              <div style="font-weight:500;color:${r.preferDate<today()?'var(--red)':'var(--text)'}">${esc(r.preferDate)}</div>
              <div style="color:var(--gray4)">${esc(r.preferTime||'')}</div>
            </td>
            <td style="font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--gray6)">${esc(r.request||'-')}</td>
            <td><span class="badge ${statusColor[r.status]||'badge-gray'}">${esc(r.status)}</span></td>
            <td>
              ${r.staff
                ? `<div style="display:flex;align-items:center;gap:5px">${avatarHtml(r.staff)}<span style="font-size:12px">${esc(r.staff)}</span></div>`
                : `<button class="btn btn-sm btn-primary" onclick="openAssignModal('${r.id}')">배정하기</button>`}
            </td>
            <td>
              <div style="display:flex;gap:3px;flex-wrap:wrap">
                <button class="btn btn-sm" onclick="viewCRDetail('${r.id}')">상세</button>
                ${r.status!=='상담완료'?`<button class="btn btn-sm" onclick="openAssignModal('${r.id}')">편집</button>`:''}
                ${r.status==='담당자배정'?`<button class="btn btn-sm btn-primary" onclick="convertToConsult('${r.id}')">상담등록</button>`:''}
                <button class="btn btn-sm btn-danger" onclick="deleteCR('${r.id}')">삭제</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function viewCRDetail(id) {
  const r = DB.get('consultRequests').find(x=>x.id===id);
  if(!r) return;
  const statusColor = {'대기중':'badge-red','담당자배정':'badge-amber','상담완료':'badge-green'};

  openModal(`상담 신청 상세 — ${r.name}`, `
  <div style="display:grid;gap:14px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">신청자</div><div style="font-weight:600">${esc(r.name)} (${r.gender||'-'})</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">연락처</div><div style="font-size:12px">${esc(r.phone)}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">이메일</div><div style="font-size:12px">${esc(r.email||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">업종·아이템</div><div style="font-weight:500">${esc(r.biz||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">지역</div><div>${esc(r.region||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">신청일</div><div style="font-size:12px">${esc(r.createdAt)}</div></div>
    </div>

    <div style="background:#EFF6FF;padding:14px;border-radius:var(--radius);border:1px solid #BFDBFE">
      <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:8px">상담 신청 정보</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div>
          <span style="font-size:11px;color:var(--gray5)">상담 방법: </span>
          <span style="font-size:20px">${METHOD_ICONS[r.method]||'💬'}</span>
          <strong>${esc(r.method)}</strong>
        </div>
        <div>
          <span style="font-size:11px;color:var(--gray5)">희망 일시: </span>
          <strong style="color:${r.preferDate<today()?'var(--red)':'var(--text)'}">${esc(r.preferDate)} ${esc(r.preferTime||'')}</strong>
        </div>
      </div>
      <div style="font-size:11px;color:var(--gray5);margin-bottom:4px">신청 내용</div>
      <div style="font-size:13px;line-height:1.7;background:white;padding:10px;border-radius:var(--radius)">${esc(r.request||'없음')}</div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--gray1);border-radius:var(--radius)">
      <div>
        <span style="font-size:11px;color:var(--gray5)">현재 상태: </span>
        <span class="badge ${statusColor[r.status]||'badge-gray'}">${esc(r.status)}</span>
        ${r.staff?`<span style="font-size:12px;margin-left:8px">담당: <strong>${esc(r.staff)}</strong></span>`:''}
      </div>
      ${r.memo?`<div style="font-size:12px;color:var(--gray5)">${esc(r.memo)}</div>`:''}
    </div>
  </div>`,
  `<button class="btn" onclick="closeModal()">닫기</button>
   ${r.status!=='상담완료'?`<button class="btn" onclick="closeModal();openAssignModal('${id}')">담당자 배정</button>`:''}
   ${r.status==='담당자배정'?`<button class="btn btn-primary" onclick="closeModal();convertToConsult('${id}')">상담일지로 등록</button>`:''}`,
  true);
}

function openCRModal(id) {
  const r = id ? DB.get('consultRequests').find(x=>x.id===id) : null;
  const v = r || {};
  const s = cfg();
  const methodOpts = s.methods.map(m=>`<option${v.method===m?' selected':''}>${m}</option>`).join('');
  const regionOpts = ULSAN_REGIONS.map(rg=>`<option${v.region===rg?' selected':''}>${rg}</option>`).join('');

  openModal(id ? '상담 신청 수정' : '상담 신청 등록', `
  <div class="form-grid">
    <div style="background:var(--gray1);border-radius:var(--radius);padding:12px">
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:10px">신청자 정보</div>
      <div class="form-grid form-grid-3">
        <div class="form-group"><label>성함 <span>*</span></label><input class="form-control" id="cr-name" value="${esc(v.name||'')}"></div>
        <div class="form-group"><label>연락처 <span>*</span></label><input class="form-control" id="cr-phone" value="${esc(v.phone||'')}" placeholder="010-0000-0000"></div>
        <div class="form-group"><label>이메일</label><input class="form-control" id="cr-email" value="${esc(v.email||'')}"></div>
      </div>
      <div class="form-grid form-grid-3">
        <div class="form-group"><label>업종·아이템</label><input class="form-control" id="cr-biz" value="${esc(v.biz||'')}" placeholder="예: AI 기반 재고관리 앱"></div>
        <div class="form-group"><label>지역</label>
          <select class="form-control" id="cr-region">
            <option value="">선택</option>${regionOpts}
          </select>
        </div>
        <div class="form-group"><label>성별</label>
          <select class="form-control" id="cr-gender">
            <option value="">선택</option>
            <option${v.gender==='남'?' selected':''}>남</option>
            <option${v.gender==='여'?' selected':''}>여</option>
          </select>
        </div>
      </div>
    </div>

    <div style="background:#EFF6FF;border-radius:var(--radius);padding:12px;border:1px solid #BFDBFE">
      <div style="font-size:12px;font-weight:600;color:var(--accent);margin-bottom:10px">상담 신청 정보</div>
      <div class="form-group" style="margin-bottom:10px">
        <label>상담 방법 <span>*</span></label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px">
          ${cfg().methods.map(m=>`
          <label style="display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--gray3);border-radius:var(--radius);cursor:pointer;background:${v.method===m?'var(--accent)':'white'};color:${v.method===m?'white':'var(--text)'}">
            <input type="radio" name="cr-method" value="${m}" ${v.method===m?'checked':''} style="display:none" onchange="updateMethodStyle()">
            <span style="font-size:16px">${METHOD_ICONS[m]||'💬'}</span>
            <span style="font-size:12px;font-weight:500">${m}</span>
          </label>`).join('')}
        </div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>희망 상담일 <span>*</span></label><input type="date" class="form-control" id="cr-date" value="${v.preferDate||today()}"></div>
        <div class="form-group"><label>희망 시간</label><input type="time" class="form-control" id="cr-time" value="${v.preferTime||''}"></div>
      </div>
    </div>

    <div class="form-group"><label>상담 신청 내용 <span>*</span></label>
      <textarea class="form-control" id="cr-request" style="min-height:100px" placeholder="궁금한 점이나 상담 받고 싶은 내용을 자세히 적어주세요">${esc(v.request||'')}</textarea>
    </div>
    <div class="form-group"><label>메모 (내부용)</label><input class="form-control" id="cr-memo" value="${esc(v.memo||'')}"></div>
  </div>`,
  `<button class="btn" onclick="closeModal()">취소</button>
   <button class="btn btn-primary" onclick="saveCR('${id||''}')">저장</button>`, true);

  // 라디오버튼 스타일 초기화
  setTimeout(()=>updateMethodStyle(), 100);
}

function updateMethodStyle() {
  document.querySelectorAll('input[name="cr-method"]').forEach(radio=>{
    const label = radio.closest('label');
    if(!label) return;
    if(radio.checked) {
      label.style.background='var(--accent)';
      label.style.color='white';
      label.style.borderColor='var(--accent)';
    } else {
      label.style.background='white';
      label.style.color='var(--text)';
      label.style.borderColor='var(--gray3)';
    }
  });
}

function saveCR(id) {
  const name  = $('cr-name')?.value?.trim();
  const phone = $('cr-phone')?.value?.trim();
  const req   = $('cr-request')?.value?.trim();
  const method= document.querySelector('input[name="cr-method"]:checked')?.value;
  const date  = $('cr-date')?.value;
  if(!name)   { alert('성함을 입력해주세요'); return; }
  if(!phone)  { alert('연락처를 입력해주세요'); return; }
  if(!req)    { alert('상담 신청 내용을 입력해주세요'); return; }
  if(!method) { alert('상담 방법을 선택해주세요'); return; }
  if(!date)   { alert('희망 상담일을 선택해주세요'); return; }

  const data = {
    name, phone,
    email:       $('cr-email')?.value||'',
    biz:         $('cr-biz')?.value||'',
    region:      $('cr-region')?.value||'',
    gender:      $('cr-gender')?.value||'',
    method,
    preferDate:  date,
    preferTime:  $('cr-time')?.value||'',
    request:     req,
    memo:        $('cr-memo')?.value||'',
  };
  const reqs = DB.get('consultRequests');
  if(id) {
    const idx = reqs.findIndex(r=>r.id===id);
    if(idx>=0) reqs[idx] = {...reqs[idx], ...data};
  } else {
    reqs.push({id:DB.id(), status:'대기중', staff:'', assignedAt:'', createdAt:today(), ...data});
  }
  DB.set('consultRequests', reqs);
  closeModal();
  navigate('crequest');
}

function openAssignModal(id) {
  const r = DB.get('consultRequests').find(x=>x.id===id);
  if(!r) return;
  const s = cfg();
  const staffOpts = s.staff.filter(x=>x).map(st=>`
    <label style="display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--gray3);border-radius:var(--radius);cursor:pointer;margin-bottom:6px;background:${r.staff===st?'#EFF6FF':'white'}">
      <input type="radio" name="assign-staff" value="${st}" ${r.staff===st?'checked':''} style="accent-color:var(--accent)">
      ${avatarHtml(st)}
      <span style="font-size:13px;font-weight:500">${esc(st)}</span>
    </label>`).join('');
  const statusOpts = ['대기중','담당자배정','상담완료'].map(s=>`<option${r.status===s?' selected':''}>${s}</option>`).join('');

  openModal(`담당자 배정 — ${r.name}`, `
  <div style="display:grid;gap:14px">
    <div style="background:var(--gray1);padding:12px;border-radius:var(--radius)">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div><span style="font-size:11px;color:var(--gray4)">신청자</span><div style="font-weight:600">${esc(r.name)}</div></div>
        <div><span style="font-size:11px;color:var(--gray4)">상담방법</span><div><span style="font-size:18px">${METHOD_ICONS[r.method]||'💬'}</span> ${esc(r.method)}</div></div>
        <div><span style="font-size:11px;color:var(--gray4)">희망일시</span><div style="font-weight:500">${esc(r.preferDate)} ${esc(r.preferTime||'')}</div></div>
      </div>
    </div>
    <div>
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:8px">담당자 선택 <span style="color:var(--red)">*</span></div>
      ${staffOpts||'<div style="color:var(--gray4)">등록된 담당자가 없습니다. 팀 설정에서 추가해주세요.</div>'}
    </div>
    <div class="form-group"><label>상태 변경</label>
      <select class="form-control" id="assign-status">${statusOpts}</select>
    </div>
    <div class="form-group"><label>메모</label>
      <input class="form-control" id="assign-memo" value="${esc(r.memo||'')}" placeholder="배정 관련 메모">
    </div>
  </div>`,
  `<button class="btn" onclick="closeModal()">취소</button>
   <button class="btn btn-primary" onclick="saveAssign('${id}')">저장</button>`, true);
}

function saveAssign(id) {
  const staff  = document.querySelector('input[name="assign-staff"]:checked')?.value;
  const status = $('assign-status')?.value;
  const memo   = $('assign-memo')?.value;
  if(!staff) { alert('담당자를 선택해주세요'); return; }
  const reqs = DB.get('consultRequests');
  const idx  = reqs.findIndex(r=>r.id===id);
  if(idx>=0) {
    reqs[idx] = {...reqs[idx], staff, status, memo, assignedAt: today()};
  }
  DB.set('consultRequests', reqs);
  closeModal();
  navigate('crequest');
}

function convertToConsult(id) {
  const r = DB.get('consultRequests').find(x=>x.id===id);
  if(!r) return;
  if(!confirm(`${r.name}님의 상담 신청을 상담일지로 등록하시겠습니까?\n창업자 접수도 함께 등록됩니다.`)) return;

  // 창업자 자동 등록
  const founders = DB.get('founders');
  let founderId  = founders.find(f=>f.phone===r.phone)?.id;
  if(!founderId) {
    founderId = DB.id();
    founders.push({
      id: founderId, name: r.name, phone: r.phone,
      biz: r.biz||'', region: r.region||'', gender: r.gender||'',
      stage: '아이디어 단계', verdict: '', date: today(),
      q1:'',q2:'',q3:'',q4:'',q5:'',q6:'',q7:'',
    });
    DB.set('founders', founders);
  }

  // 상담일지 자동 생성
  const consults = DB.get('consults');
  consults.push({
    id: DB.id(), founderId, staff: r.staff||'',
    method: r.method, date: r.preferDate||today(),
    verdict: '', finalVerdict: '',
    request: r.request||'', content: '',
    programs: [], status: '진행중',
    followUp: '', nextDate: '', memo: r.memo||'',
  });
  DB.set('consults', consults);

  // 상담 신청 상태 → 완료
  const reqs = DB.get('consultRequests');
  const idx  = reqs.findIndex(x=>x.id===id);
  if(idx>=0) reqs[idx].status = '상담완료';
  DB.set('consultRequests', reqs);

  alert(`✅ 상담일지 등록 완료!\n창업자 DB와 상담일지에 자동으로 등록됐습니다.\n상담일지에서 내용을 추가로 입력해주세요.`);
  navigate('consult');
}

function deleteCR(id) {
  if(!confirm('이 상담 신청을 삭제하시겠습니까?')) return;
  DB.set('consultRequests', DB.get('consultRequests').filter(r=>r.id!==id));
  navigate('crequest');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 통계 현황
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderStats() {
  const founders  = DB.get('founders');
  const selFirms  = DB.get('selectedFirms');
  const supports  = DB.get('supports');
  const growths   = DB.get('growths');

  // 전체 대상 (창업자 + 선정기업)
  const allPersons = [
    ...founders.map(f=>({name:f.name, region:f.region, gender:f.gender, type:f.verdict, src:'창업자'})),
    ...selFirms.map(f=>({name:f.companyName, region:f.region, gender:f.gender, type:f.type, src:'선정기업'})),
  ];

  // 지역별 집계
  const regionData = ULSAN_REGIONS.map(r=>({
    label: r.replace('울산 ',''),
    founders: founders.filter(f=>f.region===r).length,
    firms:    selFirms.filter(f=>f.region===r).length,
  }));
  const maxRegion = Math.max(...regionData.map(d=>d.founders+d.firms), 1);

  // 성별 집계
  const maleF   = founders.filter(f=>f.gender==='남').length;
  const femaleF = founders.filter(f=>f.gender==='여').length;
  const maleS   = selFirms.filter(f=>f.gender==='남').length;
  const femaleS = selFirms.filter(f=>f.gender==='여').length;
  const totalM  = maleF + maleS;
  const totalW  = femaleF + femaleS;
  const totalG  = totalM + totalW || 1;

  // 유형별 집계 (창업자)
  const typeMap = {};
  founders.forEach(f=>{
    const t = f.verdict||'미분류';
    typeMap[t] = (typeMap[t]||0) + 1;
  });
  const typeColors = {'테크 창업':'var(--accent)','로컬 창업':'var(--green)','혼합형':'var(--gold)','테크 창업 (혼합)':'var(--teal)','로컬 창업 (혼합)':'var(--orange)','미분류':'var(--gray3)'};
  const totalType = founders.length || 1;

  // 지원금 집계 (원 단위)
  const supAmt = supports.filter(s=>s.result==='선정').reduce((a,s)=>a+(Number(s.amount)||0),0);
  const sfAmt  = selFirms.reduce((a,f)=>a+(Number(f.amount)||0),0);
  const totalAmt = supAmt + sfAmt;

  // 연도별 성장 추이
  const yearMap = {};
  growths.forEach(g=>{
    if(!yearMap[g.year]) yearMap[g.year]={rev:0,emp:0};
    yearMap[g.year].rev += Number(g.revenue||0);
    yearMap[g.year].emp += Number(g.employees||0);
  });
  const years = Object.keys(yearMap).sort();
  const maxRev = Math.max(...years.map(y=>yearMap[y].rev), 1);

  $('content').innerHTML = `
  <div class="stat-grid">
    <div class="stat-card stat-blue"><div class="stat-label">창업자 접수</div><div class="stat-value">${founders.length}명</div></div>
    <div class="stat-card stat-green"><div class="stat-label">선정기업</div><div class="stat-value">${selFirms.length}개사</div></div>
    <div class="stat-card stat-teal"><div class="stat-label">총 지원금액</div><div class="stat-value">${totalAmt>=100000000?(totalAmt/100000000).toFixed(1)+'억':totalAmt>=10000?(totalAmt/10000).toFixed(0)+'만':'0'}원</div></div>
    <div class="stat-card stat-orange"><div class="stat-label">지원사업 선정률</div><div class="stat-value">${supports.length?Math.round(supports.filter(s=>s.result==='선정').length/supports.length*100):0}%</div></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

    <!-- 지역별 현황 -->
    <div class="card">
      <div class="card-header"><span class="card-title">지역별 현황</span></div>
      <div class="card-body">
        ${regionData.map(d=>{
          const total = d.founders + d.firms;
          const w1 = Math.round(d.founders/maxRegion*100);
          const w2 = Math.round(d.firms/maxRegion*100);
          return `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:13px;font-weight:600">${d.label}</span>
              <span style="font-size:12px;color:var(--gray5)">
                창업자 <b>${d.founders}</b>명 · 선정기업 <b>${d.firms}</b>개
              </span>
            </div>
            <div style="height:8px;background:var(--gray2);border-radius:4px;overflow:hidden;display:flex">
              <div style="width:${w1}%;background:var(--accent);opacity:.85"></div>
              <div style="width:${w2}%;background:var(--green);opacity:.85"></div>
            </div>
          </div>`;
        }).join('')}
        <div style="display:flex;gap:14px;margin-top:8px;font-size:11px;color:var(--gray4)">
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--accent);border-radius:2px;margin-right:3px"></span>창업자</span>
          <span><span style="display:inline-block;width:10px;height:10px;background:var(--green);border-radius:2px;margin-right:3px"></span>선정기업</span>
        </div>
      </div>
    </div>

    <!-- 성별 현황 -->
    <div class="card">
      <div class="card-header"><span class="card-title">성별 현황</span></div>
      <div class="card-body">
        <div style="display:flex;gap:16px;margin-bottom:16px">
          <div style="flex:1;text-align:center;padding:16px;background:var(--gray1);border-radius:var(--radius)">
            <div style="font-size:28px;font-weight:700;color:var(--accent)">${totalM}</div>
            <div style="font-size:12px;color:var(--gray5)">남성</div>
            <div style="font-size:11px;color:var(--gray4);margin-top:4px">창업자 ${maleF} · 기업 ${maleS}</div>
          </div>
          <div style="flex:1;text-align:center;padding:16px;background:var(--gray1);border-radius:var(--radius)">
            <div style="font-size:28px;font-weight:700;color:var(--orange)">${totalW}</div>
            <div style="font-size:12px;color:var(--gray5)">여성</div>
            <div style="font-size:11px;color:var(--gray4);margin-top:4px">창업자 ${femaleF} · 기업 ${femaleS}</div>
          </div>
        </div>
        <div style="height:14px;border-radius:7px;overflow:hidden;background:var(--gray2);display:flex">
          <div style="width:${Math.round(totalM/totalG*100)}%;background:var(--accent);transition:.5s"></div>
          <div style="flex:1;background:var(--orange)"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--gray4);margin-top:4px">
          <span>남성 ${Math.round(totalM/totalG*100)}%</span>
          <span>여성 ${Math.round(totalW/totalG*100)}%</span>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--gray4);text-align:center">
          * 성별 미입력 ${allPersons.length - totalM - totalW}명 제외
        </div>
      </div>
    </div>

    <!-- 창업 유형별 -->
    <div class="card">
      <div class="card-header"><span class="card-title">창업 유형별 현황 (창업자)</span></div>
      <div class="card-body">
        ${Object.entries(typeMap).sort((a,b)=>b[1]-a[1]).map(([type,cnt])=>`
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="min-width:110px;font-size:12px;color:var(--gray6)">${verdictBadge(type)}</div>
          <div style="flex:1;height:8px;background:var(--gray2);border-radius:4px;overflow:hidden">
            <div style="width:${Math.round(cnt/totalType*100)}%;height:100%;background:${typeColors[type]||'var(--gray3)'}"></div>
          </div>
          <div style="font-size:13px;font-weight:700;min-width:32px;text-align:right">${cnt}명</div>
          <div style="font-size:11px;color:var(--gray4);min-width:36px">${Math.round(cnt/totalType*100)}%</div>
        </div>`).join('') || '<div style="color:var(--gray4);text-align:center;padding:16px">데이터 없음</div>'}
      </div>
    </div>

    <!-- 연도별 성장 추이 -->
    <div class="card">
      <div class="card-header"><span class="card-title">연도별 매출·고용 추이</span></div>
      <div class="card-body">
        ${years.length === 0
          ? `<div style="color:var(--gray4);text-align:center;padding:24px">성장 지표 데이터 없음</div>`
          : `<div style="display:flex;align-items:flex-end;gap:8px;height:100px;margin-bottom:8px">
              ${years.map(y=>{
                const h = Math.round(yearMap[y].rev/maxRev*90);
                return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
                  <div style="font-size:9px;color:var(--green);font-weight:600">${yearMap[y].rev>=10000?(yearMap[y].rev/10000).toFixed(0)+'만':yearMap[y].rev+'만'}</div>
                  <div style="width:100%;max-width:44px;height:${Math.max(h,4)}px;background:var(--accent);border-radius:2px 2px 0 0;opacity:.8"></div>
                  <div style="font-size:10px;color:var(--gray5);font-weight:600">${y}</div>
                </div>`;
              }).join('')}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              ${years.map(y=>`
              <div style="font-size:11px;color:var(--gray5)">
                <b>${y}</b>: 매출 ${(yearMap[y].rev).toLocaleString()}만 · 고용 ${yearMap[y].emp}명
              </div>`).join('')}
            </div>`}
      </div>
    </div>
  </div>

  <!-- 지원사업별 선정 현황 -->
  <div class="card">
    <div class="card-header"><span class="card-title">지원사업별 선정 현황</span></div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>지원사업</th><th>신청</th><th>선정</th><th>선정률</th><th>총 지원금액</th><th>창업자/기업</th></tr></thead>
        <tbody>
          ${(()=>{
            const progMap = {};
            supports.forEach(s=>{
              if(!progMap[s.program]) progMap[s.program]={total:0,selected:0,amt:0,names:[]};
              progMap[s.program].total++;
              if(s.result==='선정'){progMap[s.program].selected++;progMap[s.program].amt+=Number(s.amount||0);}
              progMap[s.program].names.push(founderName(s.founderId));
            });
            selFirms.forEach(f=>{
              if(!progMap[f.program]) progMap[f.program]={total:0,selected:0,amt:0,names:[]};
              progMap[f.program].total++;
              progMap[f.program].selected++;
              progMap[f.program].amt+=Number(f.amount||0);
              progMap[f.program].names.push(f.companyName);
            });
            return Object.entries(progMap).sort((a,b)=>b[1].total-a[1].total).map(([prog,d])=>`
            <tr>
              <td style="font-weight:600">${esc(prog)}</td>
              <td style="text-align:center">${d.total}건</td>
              <td style="text-align:center;color:var(--green);font-weight:600">${d.selected}건</td>
              <td style="text-align:center">${Math.round(d.selected/d.total*100)}%</td>
              <td style="color:var(--green);font-weight:600">${d.amt>0?d.amt.toLocaleString()+'원':'-'}</td>
              <td style="font-size:11px;color:var(--gray5)">${d.names.slice(0,3).join(', ')}${d.names.length>3?` 외 ${d.names.length-3}명`:''}</td>
            </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--gray4);padding:24px">데이터 없음</td></tr>`;
          })()}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 대시보드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderDashboard() {
  const founders  = DB.get('founders');
  const consults  = DB.get('consults');
  const supports  = DB.get('supports');
  const companies = DB.get('companies');

  const tech    = founders.filter(f=>f.verdict?.includes('테크')).length;
  const local   = founders.filter(f=>f.verdict?.includes('로컬')).length;
  const hybrid  = founders.filter(f=>f.verdict?.includes('혼합')).length;
  const total   = founders.length;
  const techPct  = total ? Math.round(tech/total*100) : 0;
  const localPct = total ? Math.round(local/total*100) : 0;

  const followUp = consults.filter(c=>c.status==='후속필요').length;
  const selectedFirms  = DB.get('selectedFirms');
  const selInProg      = selectedFirms.filter(f=>f.status==='지원중').length;
  const mentorings     = DB.get('mentorings');
  const mentorSched    = mentorings.filter(m=>m.status==='예정').length;
  const consultReqs    = DB.get('consultRequests');
  const crWaiting      = consultReqs.filter(r=>r.status==='대기중').length;
  const s = DB.get('settings')[0] || {staff:[]};

  // 담당자별 건수
  const staffCount = {};
  s.staff.filter(x=>x).forEach(name => {
    staffCount[name] = consults.filter(c=>c.staff===name).length;
  });

  // 최근 상담 5건
  const recent = [...consults].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);

  $('content').innerHTML = `
  <div class="stat-grid">
    <div class="stat-card stat-blue">
      <div class="stat-label">전체 접수</div>
      <div class="stat-value">${total}</div>
      <div class="stat-sub">이번달 ${founders.filter(f=>f.date>=today().slice(0,7)).length}건</div>
    </div>
    <div class="stat-card stat-red">
      <div class="stat-label">상담 신청 대기</div>
      <div class="stat-value">${crWaiting}</div>
      <div class="stat-sub" style="cursor:pointer" onclick="navigate('crequest')">${crWaiting>0?'⚠️ 담당자 배정 필요':'배정 완료'}</div>
    </div>
    <div class="stat-card stat-green">
      <div class="stat-label">선정기업</div>
      <div class="stat-value">${selectedFirms.length}</div>
      <div class="stat-sub">지원중 ${selInProg}개사</div>
    </div>
    <div class="stat-card stat-teal">
      <div class="stat-label">전문가 상담·멘토링</div>
      <div class="stat-value">${mentorings.length}</div>
      <div class="stat-sub">예정 ${mentorSched}건</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:16px;margin-bottom:16px">
    <div class="card">
      <div class="card-header">
        <span class="card-title">최근 상담 현황</span>
        <button class="btn btn-sm" onclick="navigate('consult')">전체보기</button>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>성함</th><th>유형</th><th>담당자</th><th>상태</th><th>일시</th></tr></thead>
          <tbody>
            ${recent.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--gray4);padding:24px">상담 이력이 없습니다</td></tr>` :
              recent.map(c => `<tr>
                <td><div style="display:flex;align-items:center;gap:7px">${avatarHtml(founderName(c.founderId))}${esc(founderName(c.founderId))}</div></td>
                <td>${verdictBadge(c.finalVerdict||c.verdict)}</td>
                <td>${esc(c.staff)}</td>
                <td>${statusBadge(c.status)}</td>
                <td style="color:var(--gray4);font-size:12px">${esc(c.date)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="card">
        <div class="card-header"><span class="card-title">창업 유형 분포</span></div>
        <div class="card-body">
          <div style="display:flex;justify-content:space-around;margin-bottom:12px">
            <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--accent)">${techPct}%</div><div style="font-size:11px;color:var(--gray4)">테크</div></div>
            <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--green)">${localPct}%</div><div style="font-size:11px;color:var(--gray4)">로컬</div></div>
            <div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--gold)">${total ? 100-techPct-localPct : 0}%</div><div style="font-size:11px;color:var(--gray4)">혼합형</div></div>
          </div>
          <div style="height:6px;border-radius:3px;overflow:hidden;display:flex;background:var(--gray2)">
            <div style="width:${techPct}%;background:var(--accent);transition:.4s"></div>
            <div style="width:${localPct}%;background:var(--green);transition:.4s"></div>
            <div style="flex:1;background:var(--gold);transition:.4s"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">담당자별 현황</span></div>
        <div class="card-body" style="padding-top:8px">
          ${Object.entries(staffCount).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,cnt])=>`
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            ${avatarHtml(name)}
            <span style="flex:1;font-size:13px">${esc(name)}</span>
            <span style="font-size:13px;font-weight:600;color:var(--accent)">${cnt}건</span>
          </div>`).join('') || '<div style="color:var(--gray4);font-size:13px">데이터 없음</div>'}
        </div>
      </div>
    </div>
  </div>`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 창업자 접수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderIntake() {
  const s = cfg();
  $('content').innerHTML = `

  <!-- 두 가지 접수 경로 안내 -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
    <div style="background:#EFF6FF;border:2px solid var(--accent);border-radius:var(--radius-lg);padding:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:20px">📋</span>
        <span style="font-size:14px;font-weight:700;color:var(--accent)">사전 신청 접수</span>
      </div>
      <div style="font-size:12px;color:var(--gray6);line-height:1.6;margin-bottom:10px">
        전화·온라인으로 미리 신청한 창업자<br>
        <span style="color:var(--gray4)">상담 신청 관리 메뉴에서 관리</span>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="navigate('crequest')">
        상담 신청 관리로 이동 →
      </button>
    </div>
    <div style="background:#F0FDF4;border:2px solid var(--green);border-radius:var(--radius-lg);padding:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:20px">🚶</span>
        <span style="font-size:14px;font-weight:700;color:var(--green)">현장 즉시 접수</span>
      </div>
      <div style="font-size:12px;color:var(--gray6);line-height:1.6;margin-bottom:10px">
        신청 없이 직접 방문한 창업자<br>
        <span style="color:var(--gray4)">아래에서 바로 등록·유형 판정</span>
      </div>
      <button class="btn" style="width:100%;background:var(--green);color:#fff;border-color:var(--green)" onclick="openIntakeModal()">
        + 현장 접수 등록
      </button>
    </div>
  </div>

  <div style="max-width:100%">
    <div class="card">
      <div class="card-header">
        <span class="card-title">창업 상담 접수 목록</span>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="search-box">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="form-control" id="intake-search" placeholder="이름·업종 검색" oninput="filterIntake()">
          </div>
          <button class="btn btn-primary" onclick="openIntakeModal()">+ 현장 접수</button>
        </div>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>No.</th><th>성함</th><th>업종·아이템</th><th>지역</th><th>단계</th><th>유형판정</th><th>접수일</th><th>관리</th></tr></thead>
          <tbody id="intake-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>`;
  filterIntake();
}

function filterIntake() {
  const q = ($('intake-search')||{value:''}).value.toLowerCase();
  const founders = DB.get('founders').filter(f =>
    !q || f.name?.toLowerCase().includes(q) || f.biz?.toLowerCase().includes(q)
  ).sort((a,b)=>b.date.localeCompare(a.date));

  const tbody = $('intake-tbody');
  if (!tbody) return;
  if (founders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--gray4);padding:32px">접수된 창업자가 없습니다</td></tr>`;
    return;
  }
  tbody.innerHTML = founders.map((f,i) => `
    <tr>
      <td style="color:var(--gray4);font-size:12px">${String(i+1).padStart(3,'0')}</td>
      <td><div style="display:flex;align-items:center;gap:7px">${avatarHtml(f.name)}<span style="font-weight:500">${esc(f.name)}</span></div></td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.biz)}</td>
      <td>${esc(f.region)}</td>
      <td><span class="badge badge-gray">${esc(f.stage)}</span></td>
      <td>${verdictBadge(f.verdict)}</td>
      <td style="color:var(--gray4);font-size:12px">${esc(f.date)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm" onclick="editFounder('${f.id}')">편집</button>
          <button class="btn btn-sm btn-primary" onclick="newConsultFromFounder('${f.id}')">상담</button>
          <button class="btn btn-sm btn-danger" onclick="deleteFounder('${f.id}')">삭제</button>
        </div>
      </td>
    </tr>`).join('');
}

function openIntakeModal(id) {
  const s = cfg();
  const f = id ? DB.get('founders').find(x=>x.id===id) : null;
  const v = f || {};
  const stageOpts = s.stages.map(st=>`<option${v.stage===st?' selected':''}>${st}</option>`).join('');
  const qFields = [
    ['q1','Q1','소프트웨어·앱·플랫폼을 없애면 사업 자체가 사라지나요?','yn'],
    ['q2','Q2','고객이 2배로 늘어도 추가 인력·공간이 거의 필요 없나요?','yn'],
    ['q3','Q3','지금 사업을 다른 도시에서도 추가 비용 없이 동일하게 할 수 있나요?','yn'],
    ['q4','Q4','대표님이 한 달 자리를 비워도 매출이 계속 발생하나요?','yn'],
    ['q5','Q5','사업의 가장 중요한 자산이 코드·데이터·플랫폼인가요?','yn'],
    ['q6','Q6','주요 수익이 소프트웨어 이용료·구독료·플랫폼 수수료로 들어오나요?','yn'],
    ['q7','Q7','3년 후 사업의 핵심 방향은 무엇인가요?','dir'],
  ];

  openModal(id ? '창업자 정보 수정' : '창업 상담 접수 (현장)', `
  <div class="form-grid">
    <div class="form-grid form-grid-2">
      <div class="form-group"><label>성함 <span>*</span></label><input class="form-control" id="f-name" value="${esc(v.name||'')}"></div>
      <div class="form-group"><label>연락처</label><input class="form-control" id="f-phone" value="${esc(v.phone||'')}"></div>
    </div>
    <div class="form-group"><label>업종·아이템 <span>*</span></label><input class="form-control" id="f-biz" value="${esc(v.biz||'')}" placeholder="예: AI 기반 재고관리 앱"></div>
    <div class="form-grid form-grid-3">
      <div class="form-group"><label>창업 지역</label>
        <select class="form-control" id="f-region">
          <option value="">선택</option>
          ${ULSAN_REGIONS.map(r=>`<option${v.region===r?' selected':''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>성별</label>
        <select class="form-control" id="f-gender">
          <option value="">선택</option>
          <option${v.gender==='남'?' selected':''}>남</option>
          <option${v.gender==='여'?' selected':''}>여</option>
        </select>
      </div>
      <div class="form-group"><label>창업 단계</label><select class="form-control" id="f-stage">${stageOpts}</select></div>
    </div>
    <div style="margin-top:4px">
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:4px">유형 판정 질문 (Q1~Q7)</div>
      <div style="font-size:11px;color:var(--gray4);margin-bottom:10px">Q1~Q6: 예/아니요 선택 · Q7: 방향 선택 (혼합형 판정 시 최종 방향 결정)</div>
      ${qFields.map(([k,label,q,type])=>`
      <div class="q-row" style="${k==='q6'?'margin-top:6px;border-top:1px solid var(--gray2);padding-top:10px;':''} ${k==='q7'?'background:var(--gray1);border:1px solid var(--gray3);':''}">
        <span class="q-label" style="color:${k==='q6'?'var(--gold)':k==='q7'?'var(--teal)':'var(--accent)'}">${label}</span>
        <span class="q-text" style="${k==='q7'?'font-weight:500;color:var(--teal)':''}">${q}
          ${k==='q6'?'<span style="font-size:10px;color:var(--gray4);display:block;margin-top:1px">예: 구독료, 수수료, 라이선스 → 예 / 직접 판매, 서비스 노동 → 아니요</span>':''}
          ${k==='q7'?'<span style="font-size:10px;color:var(--gray4);display:block;margin-top:1px">혼합형 창업자에게만 적용 · 나머지는 선택 불필요</span>':''}
        </span>
        ${type==='yn'
          ? `<select class="form-control q-select" id="f-${k}" onchange="updateVerdict()">
               <option value="">-</option>
               <option${v[k]==='예'?' selected':''}>예</option>
               <option${v[k]==='아니요'?' selected':''}>아니요</option>
             </select>`
          : `<select class="form-control q-select" style="width:110px" id="f-${k}" onchange="updateVerdict()">
               <option value="">미정</option>
               <option${v[k]==='기술 고도화'?' selected':''}>기술 고도화</option>
               <option${v[k]==='지역 운영 확대'?' selected':''}>지역 운영 확대</option>
             </select>`}
      </div>`).join('')}
      <div class="verdict-box" id="verdict-box">
        <div class="verdict-label">자동 판정 결과</div>
        <div class="verdict-value" id="verdict-val">${v.verdict||'질문에 모두 답해주세요'}</div>
      </div>
    </div>
    <div class="form-group"><label>접수일</label><input class="form-control" type="date" id="f-date" value="${v.date||today()}"></div>
  </div>`,
  `<button class="btn" onclick="closeModal()">취소</button>
   <button class="btn btn-primary" onclick="saveFounder('${id||''}')">저장</button>`);

  if (v.verdict) updateVerdict();
}

function updateVerdict() {
  const q1=$('f-q1')?.value, q2=$('f-q2')?.value, q3=$('f-q3')?.value,
        q4=$('f-q4')?.value, q5=$('f-q5')?.value,
        q6=$('f-q6')?.value, q7=$('f-q7')?.value;
  const v = calcVerdict(q1,q2,q3,q4,q5,q6,q7);
  const box = $('verdict-box');
  const val = $('verdict-val');
  if (!box||!val) return;
  box.className = 'verdict-box';
  if (v.includes('테크'))  { box.classList.add('tech');   val.style.color='var(--accent)'; }
  else if (v.includes('로컬')) { box.classList.add('local'); val.style.color='var(--green)'; }
  else if (v.includes('혼합')) { box.classList.add('hybrid');val.style.color='var(--gold)'; }
  else { val.style.color='var(--gray4)'; }
  val.textContent = v || '질문에 답해주세요 (최소 5개)';
}

function saveFounder(id) {
  const name = $('f-name')?.value?.trim();
  if (!name) { alert('성함을 입력해주세요'); return; }
  const q1=$('f-q1')?.value, q2=$('f-q2')?.value, q3=$('f-q3')?.value,
        q4=$('f-q4')?.value, q5=$('f-q5')?.value,
        q6=$('f-q6')?.value, q7=$('f-q7')?.value;
  const verdict = calcVerdict(q1,q2,q3,q4,q5,q6,q7);
  const founders = DB.get('founders');
  const data = {
    name, phone:$('f-phone')?.value, biz:$('f-biz')?.value,
    region:$('f-region')?.value, gender:$('f-gender')?.value,
    stage:$('f-stage')?.value,
    q1,q2,q3,q4,q5,q6,q7, verdict, date:$('f-date')?.value||today()
  };
  if (id) {
    const idx = founders.findIndex(f=>f.id===id);
    if (idx>=0) founders[idx] = {...founders[idx],...data};
  } else {
    founders.push({id:DB.id(),...data});
  }
  DB.set('founders',founders);
  closeModal();
  navigate('intake');
}

function editFounder(id) { openIntakeModal(id); }

function deleteFounder(id) {
  if (!confirm('이 창업자를 삭제하시겠습니까?')) return;
  DB.set('founders', DB.get('founders').filter(f=>f.id!==id));
  navigate('intake');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 상담일지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderConsult() {
  $('content').innerHTML = `
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
    <button class="btn btn-primary" onclick="openConsultModal()">+ 상담일지 작성</button>
  </div>
  <div class="filter-bar">
    <div class="search-box">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input class="form-control" id="cs-search" placeholder="이름 검색" oninput="filterConsult()">
    </div>
    <select class="form-control" id="cs-staff" onchange="filterConsult()" style="width:130px">
      <option value="">전체 담당자</option>
      ${cfg().staff.filter(x=>x).map(s=>`<option>${s}</option>`).join('')}
    </select>
    <select class="form-control" id="cs-status" onchange="filterConsult()" style="width:120px">
      <option value="">전체 상태</option>
      <option>완료</option><option>후속필요</option><option>진행중</option>
    </select>
    <select class="form-control" id="cs-verdict" onchange="filterConsult()" style="width:130px">
      <option value="">전체 유형</option>
      <option>테크 창업</option><option>로컬 창업</option><option>혼합형</option>
    </select>
  </div>
  <div class="card">
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>No.</th><th>성함</th><th>유형</th><th>담당자</th><th>상담일시</th><th>연계지원사업</th><th>상태</th><th>다음상담</th><th>관리</th></tr></thead>
        <tbody id="consult-tbody"></tbody>
      </table>
    </div>
  </div>`;
  filterConsult();
}

function filterConsult() {
  const q  = ($('cs-search')||{value:''}).value.toLowerCase();
  const st = ($('cs-staff')||{value:''}).value;
  const ss = ($('cs-status')||{value:''}).value;
  const sv = ($('cs-verdict')||{value:''}).value;

  const consults = DB.get('consults').filter(c => {
    const fname = founderName(c.founderId).toLowerCase();
    return (!q || fname.includes(q)) &&
           (!st || c.staff===st) &&
           (!ss || c.status===ss) &&
           (!sv || (c.finalVerdict||c.verdict)===sv);
  }).sort((a,b)=>b.date.localeCompare(a.date));

  const tbody = $('consult-tbody');
  if (!tbody) return;
  if (consults.length===0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--gray4);padding:32px">상담 이력이 없습니다</td></tr>`;
    return;
  }
  tbody.innerHTML = consults.map((c,i)=>`
    <tr>
      <td style="color:var(--gray4);font-size:12px">${String(i+1).padStart(3,'0')}</td>
      <td><div style="display:flex;align-items:center;gap:7px">${avatarHtml(founderName(c.founderId))}<span style="font-weight:500">${esc(founderName(c.founderId))}</span></div></td>
      <td>${verdictBadge(c.finalVerdict||c.verdict)}</td>
      <td>${esc(c.staff)}</td>
      <td style="font-size:12px;color:var(--gray5)">${esc(c.date)}</td>
      <td style="font-size:12px">${(c.programs||[]).map(p=>`<span class="badge badge-teal" style="margin:1px">${esc(p)}</span>`).join('')}</td>
      <td>${statusBadge(c.status)}</td>
      <td style="font-size:12px;color:${c.nextDate&&c.nextDate<today()?'var(--red)':'var(--gray5)'}">${c.status==='완료' ? '<span style="color:var(--gray3)">-</span>' : (c.nextDate||'-')}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm" onclick="editConsult('${c.id}')">편집</button>
          <button class="btn btn-sm btn-danger" onclick="deleteConsult('${c.id}')">삭제</button>
        </div>
      </td>
    </tr>`).join('');
}

function openConsultModal(id, preFounderId) {
  const s = cfg();
  const c = id ? DB.get('consults').find(x=>x.id===id) : null;
  const v = c || {};
  const founders = DB.get('founders');

  const founderOpts = founders.map(f=>`<option value="${f.id}"${(v.founderId||preFounderId)===f.id?' selected':''}>${f.name}</option>`).join('');
  const staffOpts   = s.staff.filter(x=>x).map(st=>`<option${v.staff===st?' selected':''}>${st}</option>`).join('');
  const methodOpts  = s.methods.map(m=>`<option${v.method===m?' selected':''}>${m}</option>`).join('');
  const progOpts    = s.programs.map(p=>`<option value="${p}"${(v.programs||[]).includes(p)?' selected':''}>${p}</option>`).join('');

  openModal(id ? '상담일지 수정' : '상담일지 작성', `
  <div class="form-grid">
    <div class="form-grid form-grid-3">
      <div class="form-group"><label>창업자 <span>*</span></label><select class="form-control" id="c-founder"><option value="">선택</option>${founderOpts}</select></div>
      <div class="form-group"><label>담당자 <span>*</span></label><select class="form-control" id="c-staff"><option value="">선택</option>${staffOpts}</select></div>
      <div class="form-group"><label>상담 방식</label><select class="form-control" id="c-method">${methodOpts}</select></div>
    </div>
    <div class="form-grid form-grid-2">
      <div class="form-group"><label>상담일시</label><input type="date" class="form-control" id="c-date" value="${v.date||today()}"></div>
      <div class="form-group"><label>자동 판정 유형</label><input class="form-control" id="c-verdict" value="${v.verdict||''}" readonly style="background:var(--gray1)"></div>
    </div>
    <div class="form-group"><label>최종 유형 확정</label>
      <select class="form-control" id="c-final">
        <option value="">자동판정 결과 사용</option>
        <option${v.finalVerdict==='테크 창업'?' selected':''}>테크 창업</option>
        <option${v.finalVerdict==='로컬 창업'?' selected':''}>로컬 창업</option>
        <option${v.finalVerdict==='혼합형'?' selected':''}>혼합형</option>
      </select>
    </div>
    <div class="form-group"><label>요청 사항</label><textarea class="form-control" id="c-request">${esc(v.request||'')}</textarea></div>
    <div class="form-group"><label>상담 내용 <span>*</span></label><textarea class="form-control" id="c-content" style="min-height:100px">${esc(v.content||'')}</textarea></div>
    <div class="form-group"><label>연계 지원사업</label><select class="form-control" id="c-programs" multiple style="height:100px">${progOpts}</select><div style="font-size:11px;color:var(--gray4);margin-top:3px">Ctrl 누르고 클릭하면 여러 개 선택 가능</div></div>
    <div class="form-group"><label>상담 상태</label>
      <select class="form-control" id="c-status" onchange="toggleFollowUpFields()">
        <option${v.status==='완료'?' selected':''}>완료</option>
        <option${v.status==='후속필요'?' selected':''}>후속필요</option>
        <option${v.status==='진행중'?' selected':''}>진행중</option>
      </select>
    </div>
    <div id="c-followup-wrap" class="form-group"><label>후속 조치 내용</label><textarea class="form-control" id="c-followup">${esc(v.followUp||'')}</textarea></div>
    <div id="c-next-wrap" class="form-grid form-grid-2">
      <div class="form-group"><label>다음 상담 예정일</label><input type="date" class="form-control" id="c-next" value="${v.nextDate||''}"></div>
      <div class="form-group"><label>특이사항</label><input class="form-control" id="c-memo" value="${esc(v.memo||'')}"></div>
    </div>
    <div id="c-memo-only-wrap" class="form-group" style="display:none"><label>특이사항</label><input class="form-control" id="c-memo-only" value="${esc(v.memo||'')}"></div>
  </div>`,
  `<button class="btn" onclick="closeModal()">취소</button>
   <button class="btn btn-primary" onclick="saveConsult('${id||''}')">저장</button>`, true);

  // 창업자 선택 시 자동 판정 채우기
  $('c-founder')?.addEventListener('change', function() {
    const f = DB.get('founders').find(x=>x.id===this.value);
    if (f && $('c-verdict')) $('c-verdict').value = f.verdict || '';
  });

  // 초기 상태 적용
  toggleFollowUpFields();
  if (preFounderId) {
    const f = founders.find(x=>x.id===preFounderId);
    if (f && $('c-verdict')) $('c-verdict').value = f.verdict||'';
  }
}

function toggleFollowUpFields() {
  const status = $('c-status')?.value;
  const isDone = status === '완료';
  const followWrap = $('c-followup-wrap');
  const nextWrap   = $('c-next-wrap');
  const memoOnly   = $('c-memo-only-wrap');
  if (!followWrap) return;
  followWrap.style.display = isDone ? 'none' : '';
  nextWrap.style.display   = isDone ? 'none' : '';
  memoOnly.style.display   = isDone ? '' : 'none';
  // 완료로 바꿀 때 다음 상담 예정일 초기화
  if (isDone && $('c-next')) $('c-next').value = '';
}

function saveConsult(id) {
  const founderId = $('c-founder')?.value;
  const staff     = $('c-staff')?.value;
  const content   = $('c-content')?.value?.trim();
  if (!founderId) { alert('창업자를 선택해주세요'); return; }
  if (!staff)     { alert('담당자를 선택해주세요'); return; }
  if (!content)   { alert('상담 내용을 입력해주세요'); return; }

  const status = $('c-status')?.value || '완료';
  const isDone = status === '완료';
  const programs = Array.from($('c-programs')?.selectedOptions||[]).map(o=>o.value);
  const data = {
    founderId, staff, content, programs, status,
    method:       $('c-method')?.value,
    date:         $('c-date')?.value||today(),
    verdict:      $('c-verdict')?.value,
    finalVerdict: $('c-final')?.value || $('c-verdict')?.value,
    request:      $('c-request')?.value,
    followUp:     isDone ? '' : ($('c-followup')?.value || ''),
    nextDate:     isDone ? '' : ($('c-next')?.value || ''),
    memo:         isDone ? ($('c-memo-only')?.value || '') : ($('c-memo')?.value || ''),
  };
  const consults = DB.get('consults');
  if (id) {
    const idx = consults.findIndex(c=>c.id===id);
    if (idx>=0) consults[idx] = {...consults[idx],...data};
  } else {
    consults.push({id:DB.id(),...data});
  }
  DB.set('consults',consults);
  closeModal();
  navigate('consult');
}

function editConsult(id) { openConsultModal(id); }
function newConsultFromFounder(fid) { navigate('consult'); setTimeout(()=>openConsultModal('',fid),100); }
function deleteConsult(id) {
  if (!confirm('이 상담일지를 삭제하시겠습니까?')) return;
  DB.set('consults', DB.get('consults').filter(c=>c.id!==id));
  navigate('consult');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 창업자 DB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderDB() {
  const founders  = DB.get('founders');
  const consults  = DB.get('consults');
  const supports  = DB.get('supports');
  const companies = DB.get('companies');

  $('content').innerHTML = `
  <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
    <div class="stat-card stat-blue"><div class="stat-label">전체 등록</div><div class="stat-value">${founders.length}</div></div>
    <div class="stat-card stat-green"><div class="stat-label">창업 완료</div><div class="stat-value">${companies.length}</div></div>
    <div class="stat-card stat-orange"><div class="stat-label">지원사업 수혜</div><div class="stat-value">${supports.filter(s=>s.result==='선정').length}건</div></div>
  </div>
  <div class="filter-bar">
    <div class="search-box">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input class="form-control" id="db-search" placeholder="이름·업종·연락처 검색" oninput="filterDB()">
    </div>
  </div>
  <div class="card">
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>No.</th><th>성함</th><th>업종</th><th>유형</th><th>상담수</th><th>지원수혜</th><th>창업여부</th><th>접수일</th><th>관리</th></tr></thead>
        <tbody id="db-tbody"></tbody>
      </table>
    </div>
  </div>`;
  filterDB();
}

function filterDB() {
  const q = ($('db-search')||{value:''}).value.toLowerCase();
  const founders = DB.get('founders').filter(f =>
    !q || f.name?.toLowerCase().includes(q) || f.biz?.toLowerCase().includes(q) || f.phone?.includes(q)
  ).sort((a,b)=>b.date.localeCompare(a.date));

  const consults  = DB.get('consults');
  const supports  = DB.get('supports');
  const companies = DB.get('companies');
  const tbody = $('db-tbody');
  if (!tbody) return;

  tbody.innerHTML = founders.map((f,i)=>{
    const cCnt = consults.filter(c=>c.founderId===f.id).length;
    const sCnt = supports.filter(s=>s.founderId===f.id&&s.result==='선정').length;
    const co   = companies.find(c=>c.founderId===f.id);
    return `<tr>
      <td style="color:var(--gray4);font-size:12px">${String(i+1).padStart(3,'0')}</td>
      <td><div style="display:flex;align-items:center;gap:7px">${avatarHtml(f.name)}<span style="font-weight:500">${esc(f.name)}</span></div></td>
      <td style="font-size:12px;color:var(--gray5)">${esc(f.biz)}</td>
      <td>${verdictBadge(f.verdict)}</td>
      <td style="text-align:center">${cCnt}회</td>
      <td style="text-align:center">${sCnt}건</td>
      <td>${co ? statusBadge('선정') : `<span class="badge badge-gray">상담중</span>`}</td>
      <td style="font-size:12px;color:var(--gray4)">${esc(f.date)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm" onclick="viewFounderDetail('${f.id}')">상세</button>
          <button class="btn btn-sm btn-primary" onclick="newConsultFromFounder('${f.id}')">상담추가</button>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--gray4);padding:32px">데이터 없음</td></tr>`;
}

function viewFounderDetail(id) {
  const f = DB.get('founders').find(x=>x.id===id);
  if (!f) return;
  const consults  = DB.get('consults').filter(c=>c.founderId===id);
  const supports  = DB.get('supports').filter(s=>s.founderId===id);
  const companies = DB.get('companies');
  const co        = companies.find(c=>c.founderId===id);
  const growths   = DB.get('growths')
                    .filter(g=>g.founderId===id||(co&&g.companyId===co.id))
                    .sort((a,b)=>a.year.localeCompare(b.year));
  const latest    = growths[growths.length-1];

  // 여정 단계
  const steps = [
    {label:'상담',   done:consults.length>0,  sub:`${consults.length}회`},
    {label:'지원사업',done:supports.length>0, sub:`${supports.filter(s=>s.result==='선정').length}건 선정`},
    {label:'창업',   done:!!co,               sub:co?co.regDate:'미등록'},
    {label:'성장추적',done:growths.length>0,  sub:growths.length>0?`${growths.length}개 연도`:'미입력'},
  ];

  openModal(`${f.name} 통합 현황`, `
  <div style="display:grid;gap:14px">

    <div style="display:flex;gap:6px">
      ${steps.map((s,i)=>`
      <div style="flex:1;text-align:center;padding:9px 4px;border-radius:var(--radius);background:${s.done?'var(--gray1)':'#fff'};border:1px solid ${s.done?'var(--gray3)':'var(--gray2)'}">
        <div style="width:18px;height:18px;border-radius:50%;margin:0 auto 5px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;background:${s.done?'var(--accent)':'var(--gray2)'};color:${s.done?'#fff':'var(--gray4)'}">
          ${s.done?'✓':i+1}
        </div>
        <div style="font-size:11px;font-weight:600;color:${s.done?'var(--text)':'var(--gray4)'}">${s.label}</div>
        <div style="font-size:10px;color:var(--gray4)">${s.sub}</div>
      </div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:11px;color:var(--gray4)">연락처</div><div style="font-weight:500">${esc(f.phone||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:11px;color:var(--gray4)">업종</div><div style="font-weight:500">${esc(f.biz||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:11px;color:var(--gray4)">창업 유형</div><div>${verdictBadge(f.verdict)}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:11px;color:var(--gray4)">기업명</div><div style="font-weight:500">${esc(co?.name||'미등록')}</div></div>
    </div>

    ${latest ? `
    <div style="background:var(--gray1);border-radius:var(--radius);padding:12px">
      <div style="font-size:11px;font-weight:600;color:var(--gray5);margin-bottom:8px">최근 성장 지표 (${latest.year}년)</div>
      <div style="display:flex;gap:12px">
        <div style="text-align:center"><div style="font-size:16px;font-weight:700;color:var(--green)">${Number(latest.revenue||0).toLocaleString()}</div><div style="font-size:10px;color:var(--gray4)">매출(만원)</div></div>
        <div style="text-align:center"><div style="font-size:16px;font-weight:700;color:var(--accent)">${latest.employees}</div><div style="font-size:10px;color:var(--gray4)">고용(명)</div></div>
        <div style="text-align:center"><div style="font-size:16px;font-weight:700;color:var(--teal)">${Number(latest.investment||0).toLocaleString()}</div><div style="font-size:10px;color:var(--gray4)">투자(만원)</div></div>
      </div>
    </div>` : ''}

    <div>
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:6px">상담 이력 (${consults.length}건)</div>
      ${consults.length===0 ? '<div style="color:var(--gray4);font-size:13px">없음</div>' :
        consults.slice(-3).map(c=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--gray2)">
          <span style="font-size:12px;color:var(--gray5)">${c.date} · ${esc(c.staff)}</span>
          <div style="display:flex;gap:4px">${statusBadge(c.status)}</div>
        </div>`).join('')}
    </div>

    <div>
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:6px">지원사업 (${supports.length}건)</div>
      ${supports.length===0 ? '<div style="color:var(--gray4);font-size:13px">없음</div>' :
        supports.map(s=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray2)">
          <span style="font-size:13px">${esc(s.program)}</span>
          <div>${statusBadge(s.stage)}${s.amount?` <span style="font-size:12px;color:var(--green);font-weight:600">${Number(s.amount).toLocaleString()}만원</span>`:''}</div>
        </div>`).join('')}
    </div>
  </div>`,
  `<button class="btn" onclick="closeModal()">닫기</button>
   <button class="btn" onclick="closeModal();viewFounderGrowth('${id}')">성장 이력</button>
   <button class="btn btn-primary" onclick="closeModal();openGrowthModal('','${id}')">+ 성장 지표 입력</button>`,
  true);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 지원사업 연계 — 창업자별 복수 지원사업 + 기간 관리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderSupport() {
  const supports  = DB.get('supports');
  const founders  = DB.get('founders');
  const selected  = supports.filter(s=>s.result==='선정');
  const inProg    = supports.filter(s=>['심사중','서류심사','신청완료'].includes(s.stage));
  const totalAmt  = selected.reduce((a,s)=>a+(Number(s.amount)||0),0);

  // 창업자별 그룹핑
  const byFounder = {};
  supports.forEach(s=>{
    if(!byFounder[s.founderId]) byFounder[s.founderId]=[];
    byFounder[s.founderId].push(s);
  });

  $('content').innerHTML = `
  <div class="stat-grid">
    <div class="stat-card stat-blue"><div class="stat-label">전체 지원 건수</div><div class="stat-value">${supports.length}건</div><div class="stat-sub">${Object.keys(byFounder).length}명 창업자</div></div>
    <div class="stat-card stat-orange"><div class="stat-label">진행중</div><div class="stat-value">${inProg.length}건</div></div>
    <div class="stat-card stat-green"><div class="stat-label">선정 완료</div><div class="stat-value">${selected.length}건</div><div class="stat-sub">선정률 ${supports.length?Math.round(selected.length/supports.length*100):0}%</div></div>
    <div class="stat-card stat-teal"><div class="stat-label">총 지원 금액</div><div class="stat-value">${totalAmt>=10000?(totalAmt/10000).toFixed(1)+'억':totalAmt.toLocaleString()+'만'}</div></div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div class="tabs" style="margin-bottom:0">
      <button class="tab-btn active" id="tab-list"   onclick="switchSupportTab('list')">창업자별 목록</button>
      <button class="tab-btn"        id="tab-all"    onclick="switchSupportTab('all')">전체 이력</button>
      <button class="tab-btn"        id="tab-timeline" onclick="switchSupportTab('timeline')">타임라인</button>
    </div>
    <button class="btn btn-primary" onclick="openSupportModal()">+ 지원사업 등록</button>
  </div>

  <div id="support-panel"></div>`;

  renderSupportList();
}

function switchSupportTab(tab) {
  ['list','all','timeline'].forEach(t=>{
    const btn = $(`tab-${t}`);
    if(btn) btn.classList.toggle('active', t===tab);
  });
  if(tab==='list')     renderSupportList();
  else if(tab==='all') renderSupportAll();
  else                 renderSupportTimeline();
}

function renderSupportList() {
  const supports = DB.get('supports');
  const founders = DB.get('founders');
  const byFounder = {};
  supports.forEach(s=>{
    if(!byFounder[s.founderId]) byFounder[s.founderId]=[];
    byFounder[s.founderId].push(s);
  });

  const panel = $('support-panel');
  if(!panel) return;
  if(Object.keys(byFounder).length===0){
    panel.innerHTML=`<div class="card"><div class="card-body" style="text-align:center;color:var(--gray4);padding:40px">등록된 지원사업이 없습니다</div></div>`;
    return;
  }

  panel.innerHTML = founders.filter(f=>byFounder[f.id]).map(f=>{
    const fSupports = [...(byFounder[f.id]||[])].sort((a,b)=>a.startDate.localeCompare(b.startDate));
    const totalF    = fSupports.reduce((a,s)=>a+(Number(s.amount)||0),0);
    return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:8px">
          ${avatarHtml(f.name)}
          <span class="card-title">${esc(f.name)}</span>
          ${verdictBadge(f.verdict)}
          <span style="font-size:12px;color:var(--gray4)">${esc(f.biz||'')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:12px;color:var(--green);font-weight:600">총 ${totalF.toLocaleString()}만원</span>
          <span style="font-size:12px;color:var(--gray4)">${fSupports.length}건</span>
          <button class="btn btn-sm btn-primary" onclick="openSupportModal('','${f.id}')">+ 추가</button>
        </div>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>지원사업명</th><th>세부프로그램</th><th>지원 시작일</th><th>지원 종료일</th><th>기간</th><th>단계</th><th>결과</th><th>금액(원)</th><th>담당자</th><th>관리</th></tr></thead>
          <tbody>
            ${fSupports.map(s=>{
              const dur = supportDuration(s.startDate, s.endDate);
              return `<tr>
                <td style="font-weight:600">${esc(s.program)}</td>
                <td style="font-size:12px;color:var(--teal)">${s.subProgram?`<span class="badge badge-teal">${esc(s.subProgram)}</span>`:'<span style="color:var(--gray3)">-</span>'}</td>
                <td style="font-size:12px;color:var(--gray5)">${esc(s.startDate)}</td>
                <td style="font-size:12px;color:var(--gray5)">${s.endDate||'<span style="color:var(--orange)">진행중</span>'}</td>
                <td style="font-size:12px;color:var(--gray5)">${dur}</td>
                <td>${statusBadge(s.stage)}</td>
                <td>${s.result&&s.result!=='-'?statusBadge(s.result):'<span style="color:var(--gray4)">-</span>'}</td>
                <td style="font-weight:600;color:${s.amount?'var(--green)':'var(--gray4)'}">${s.amount?Number(s.amount).toLocaleString():'-'}</td>
                <td style="font-size:12px">${esc(s.staff||'')}</td>
                <td><div style="display:flex;gap:4px">
                  <button class="btn btn-sm" onclick="editSupport('${s.id}')">편집</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteSupportItem('${s.id}')">삭제</button>
                </div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }).join('');
}

function renderSupportAll() {
  const supports = [...DB.get('supports')].sort((a,b)=>b.startDate.localeCompare(a.startDate));
  const panel = $('support-panel');
  if(!panel) return;
  panel.innerHTML = `
  <div class="card">
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>창업자</th><th>지원사업명</th><th>시작일</th><th>종료일</th><th>단계</th><th>금액(원)</th><th>담당자</th><th>관리</th></tr></thead>
        <tbody>
          ${supports.length===0?`<tr><td colspan="8" style="text-align:center;color:var(--gray4);padding:32px">없음</td></tr>`:
            supports.map(s=>`<tr>
              <td><div style="display:flex;align-items:center;gap:6px">${avatarHtml(founderName(s.founderId))}<span style="font-weight:500">${esc(founderName(s.founderId))}</span></div></td>
              <td style="font-weight:600">${esc(s.program)}</td>
              <td style="font-size:12px;color:var(--gray5)">${esc(s.startDate)}</td>
              <td style="font-size:12px;color:var(--gray5)">${s.endDate||'<span style="color:var(--orange)">진행중</span>'}</td>
              <td>${statusBadge(s.stage)}</td>
              <td style="font-weight:600;color:${s.amount?'var(--green)':'var(--gray4)'}">${s.amount?Number(s.amount).toLocaleString():'-'}</td>
              <td style="font-size:12px">${esc(s.staff||'')}</td>
              <td><div style="display:flex;gap:4px">
                <button class="btn btn-sm" onclick="editSupport('${s.id}')">편집</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSupportItem('${s.id}')">삭제</button>
              </div></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderSupportTimeline() {
  const panel = $('support-panel');
  if(!panel) return;
  const founders = DB.get('founders');
  const supports = DB.get('supports');
  const byFounder = {};
  supports.forEach(s=>{
    if(!byFounder[s.founderId]) byFounder[s.founderId]=[];
    byFounder[s.founderId].push(s);
  });
  const targetFounders = founders.filter(f=>byFounder[f.id]&&byFounder[f.id].length>0);
  if(targetFounders.length===0){
    panel.innerHTML=`<div class="card"><div class="card-body" style="text-align:center;color:var(--gray4);padding:40px">지원사업 데이터가 없습니다</div></div>`;
    return;
  }

  panel.innerHTML = targetFounders.map(f=>`
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:8px">
          ${avatarHtml(f.name)}<span class="card-title">${esc(f.name)}</span>${verdictBadge(f.verdict)}
        </div>
        <button class="btn btn-sm" onclick="viewSupportGrowthChart('${f.id}')">성장 연계 분석</button>
      </div>
      <div class="card-body" style="padding-top:8px">
        ${buildTimelineHtml(f.id)}
      </div>
    </div>`).join('');
}

function buildTimelineHtml(founderId) {
  const supports = DB.get('supports').filter(s=>s.founderId===founderId)
                   .sort((a,b)=>a.startDate.localeCompare(b.startDate));
  if(supports.length===0) return '<div style="color:var(--gray4)">지원사업 없음</div>';
  const colors = ['var(--accent)','var(--green)','var(--gold)','var(--teal)','var(--orange)','var(--red)'];
  return `<div style="position:relative;padding-left:16px">
    <div style="position:absolute;left:6px;top:0;bottom:0;width:2px;background:var(--gray2)"></div>
    ${supports.map((s,i)=>`
    <div style="position:relative;margin-bottom:14px;padding-left:20px">
      <div style="position:absolute;left:-2px;top:4px;width:10px;height:10px;border-radius:50%;background:${colors[i%colors.length]};border:2px solid white;box-shadow:0 0 0 2px ${colors[i%colors.length]}"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:4px">
        <div>
          <span style="font-size:13px;font-weight:700;color:var(--text)">${esc(s.program)}</span>
          <span style="font-size:11px;color:var(--gray4);margin-left:8px">${esc(s.startDate)} ~ ${s.endDate||'진행중'}</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center">
          ${statusBadge(s.stage)}
          ${s.amount?`<span style="font-size:12px;font-weight:700;color:var(--green)">${Number(s.amount).toLocaleString()}만원</span>`:''}
        </div>
      </div>
      ${s.memo?`<div style="font-size:11px;color:var(--gray5);margin-top:2px">${esc(s.memo)}</div>`:''}
    </div>`).join('')}
  </div>`;
}

function supportDuration(start, end) {
  if(!start) return '-';
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const months = Math.round((e-s)/(1000*60*60*24*30));
  if(months<1) return '1개월 미만';
  if(months<12) return `${months}개월`;
  return `${Math.floor(months/12)}년 ${months%12?months%12+'개월':''}`;
}

function viewSupportGrowthChart(founderId) {
  const f        = DB.get('founders').find(x=>x.id===founderId);
  const supports = DB.get('supports').filter(s=>s.founderId===founderId).sort((a,b)=>a.startDate.localeCompare(b.startDate));
  const growths  = DB.get('growths').filter(g=>g.founderId===founderId).sort((a,b)=>a.year.localeCompare(b.year));

  if(growths.length===0 && supports.length===0){
    alert('성장 지표 또는 지원사업 데이터가 없습니다');
    return;
  }

  const maxRev = Math.max(...growths.map(g=>Number(g.revenue||0)),1);
  const barColors=['#2E75B6','#1E5631','#8B6914','#17627A','#C55A11','#C00000'];
  const allYears = [...new Set([
    ...growths.map(g=>g.year),
    ...supports.map(s=>s.startDate.slice(0,4)),
    ...supports.filter(s=>s.endDate).map(s=>s.endDate.slice(0,4)),
  ])].sort();
  const minYear = allYears[0]||'2022';
  const maxYear = allYears[allYears.length-1]||String(new Date().getFullYear());

  openModal(`${f?.name} — 지원사업 × 성장 지표 연계 분석`, `
  <div style="display:grid;gap:20px">

    <div>
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:10px">연도별 매출 추이 (막대) + 지원사업 기간 (색상 띠)</div>
      <div style="position:relative;background:var(--gray1);border-radius:var(--radius);padding:16px 16px 8px;overflow:hidden">

        <!-- 성장 지표 막대 차트 -->
        <div style="display:flex;align-items:flex-end;gap:6px;height:120px;margin-bottom:4px;position:relative;z-index:2">
          ${growths.map(g=>{
            const h = Math.max(8, Math.round(Number(g.revenue||0)/maxRev*110));
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
              <div style="font-size:10px;color:var(--green);font-weight:600">${Number(g.revenue||0)>=10000?(Number(g.revenue)/10000).toFixed(1)+'억':Number(g.revenue||0).toLocaleString()+'만'}</div>
              <div title="${g.year}: 매출 ${Number(g.revenue||0).toLocaleString()}만원" style="width:100%;max-width:40px;height:${h}px;background:var(--accent);border-radius:3px 3px 0 0;opacity:.85"></div>
              <div style="font-size:10px;color:var(--gray5);font-weight:600">${g.year}</div>
            </div>`;
          }).join('')}
          ${growths.length===0?`<div style="color:var(--gray4);font-size:12px;align-self:center">성장 지표 없음</div>`:''}
        </div>

        <!-- 지원사업 기간 띠 -->
        ${supports.length>0?`
        <div style="margin-top:12px;border-top:1px solid var(--gray3);padding-top:10px">
          <div style="font-size:10px;color:var(--gray5);margin-bottom:6px;font-weight:600">지원사업 기간</div>
          ${supports.map((s,i)=>`
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <div style="width:10px;height:10px;border-radius:2px;background:${barColors[i%barColors.length]};flex-shrink:0"></div>
            <div style="font-size:11px;font-weight:600;min-width:120px;color:var(--text)">${esc(s.program)}</div>
            <div style="font-size:11px;color:var(--gray5)">${esc(s.startDate)} ~ ${s.endDate||'진행중'}</div>
            <div style="font-size:11px;color:var(--gray4)">(${supportDuration(s.startDate,s.endDate)})</div>
            ${s.amount?`<span style="font-size:11px;font-weight:700;color:var(--green);margin-left:auto">${Number(s.amount).toLocaleString()}만원</span>`:''}
          </div>`).join('')}
        </div>`:''}
      </div>
    </div>

    <!-- 고용 추이 -->
    ${growths.length>0?`
    <div>
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:8px">고용 인원 추이</div>
      <div style="display:flex;align-items:flex-end;gap:6px;height:60px;background:var(--gray1);border-radius:var(--radius);padding:8px">
        ${growths.map(g=>{
          const maxEmp = Math.max(...growths.map(x=>Number(x.employees||0)),1);
          const h = Math.max(4, Math.round(Number(g.employees||0)/maxEmp*44));
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
            <div style="font-size:9px;color:var(--teal);font-weight:600">${g.employees}명</div>
            <div style="width:100%;max-width:30px;height:${h}px;background:var(--teal);border-radius:2px 2px 0 0;opacity:.8"></div>
            <div style="font-size:9px;color:var(--gray5)">${g.year}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`:''}

    <!-- 지원사업 요약 -->
    <div>
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:8px">지원사업 누적 현황</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
        <div style="text-align:center;padding:10px;background:var(--gray1);border-radius:var(--radius)">
          <div style="font-size:18px;font-weight:700;color:var(--accent)">${supports.length}건</div>
          <div style="font-size:10px;color:var(--gray4)">총 지원 건수</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--gray1);border-radius:var(--radius)">
          <div style="font-size:18px;font-weight:700;color:var(--green)">${supports.reduce((a,s)=>a+(Number(s.amount)||0),0).toLocaleString()}만</div>
          <div style="font-size:10px;color:var(--gray4)">총 수혜 금액</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--gray1);border-radius:var(--radius)">
          <div style="font-size:18px;font-weight:700;color:var(--teal)">${growths.length>1?((Number(growths[growths.length-1].revenue)-Number(growths[0].revenue))/Number(growths[0].revenue)*100).toFixed(0)+'%':'-'}</div>
          <div style="font-size:10px;color:var(--gray4)">매출 성장률</div>
        </div>
      </div>
    </div>

  </div>`,
  `<button class="btn" onclick="closeModal()">닫기</button>
   <button class="btn btn-primary" onclick="closeModal();openSupportModal('','${founderId}')">+ 지원사업 추가</button>`,
  true);
}

function openSupportModal(id, preFounderId) {
  const s   = cfg();
  const sup = id ? DB.get('supports').find(x=>x.id===id) : null;
  const v   = sup || {};
  const founders   = DB.get('founders');
  const targetId   = v.founderId || preFounderId || '';
  const founderOpts= founders.map(f=>`<option value="${f.id}"${targetId===f.id?' selected':''}>${f.name} (${f.biz||''})</option>`).join('');
  const staffOpts  = s.staff.filter(x=>x).map(st=>`<option${v.staff===st?' selected':''}>${st}</option>`).join('');
  const progOpts   = s.programs.map(p=>`<option${v.program===p?' selected':''}>${p}</option>`).join('');
  const stages     = ['신청완료','서류심사','심사중','발표대기','수령완료','미선정'];
  const stageOpts  = stages.map(st=>`<option${v.stage===st?' selected':''}>${st}</option>`).join('');

  openModal(id ? '지원사업 수정' : '지원사업 등록', `
  <div class="form-grid">
    <div class="form-grid form-grid-2">
      <div class="form-group"><label>창업자 <span>*</span></label>
        <select class="form-control" id="s-founder"><option value="">선택</option>${founderOpts}</select>
      </div>
      <div class="form-group"><label>담당자</label>
        <select class="form-control" id="s-staff"><option value="">선택</option>${staffOpts}</select>
      </div>
    </div>
    <div class="form-group"><label>지원사업명 <span>*</span></label>
      <select class="form-control" id="s-program">${progOpts}</select>
    </div>
    <div class="form-group">
      <label>세부 프로그램 <span style="color:var(--gray4);font-weight:400;font-size:11px">(없으면 비워두세요)</span></label>
      <input class="form-control" id="s-subprogram" value="${esc(v.subProgram||'')}" placeholder="예: 비즈니스 모델 혁신 트랙, 제조 분야 특화 과정">
    </div>
    <div style="background:var(--gray1);border-radius:var(--radius);padding:12px">
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:8px">지원 기간</div>
      <div class="form-grid form-grid-2">
        <div class="form-group"><label>시작일 <span>*</span></label>
          <input type="date" class="form-control" id="s-start" value="${v.startDate||today()}">
        </div>
        <div class="form-group"><label>종료일 <span style="color:var(--gray4);font-weight:400">(진행중이면 비워두세요)</span></label>
          <input type="date" class="form-control" id="s-end" value="${v.endDate||''}">
        </div>
      </div>
    </div>
    <div class="form-grid form-grid-2">
      <div class="form-group"><label>진행 단계</label>
        <select class="form-control" id="s-stage">${stageOpts}</select>
      </div>
      <div class="form-group"><label>결과</label>
        <select class="form-control" id="s-result">
          <option${(!v.result||v.result==='-')?' selected':''} value="-">미정</option>
          <option${v.result==='선정'?' selected':''}>선정</option>
          <option${v.result==='미선정'?' selected':''}>미선정</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>지원 금액 (원)</label>
      <input class="form-control" id="s-amount" type="number" value="${v.amount||''}" placeholder="예: 10000000">
    </div>
    <div class="form-group"><label>메모</label>
      <textarea class="form-control" id="s-memo">${esc(v.memo||'')}</textarea>
    </div>
  </div>`,
  `<button class="btn" onclick="closeModal()">취소</button>
   <button class="btn btn-primary" onclick="saveSupport('${id||''}')">저장</button>`);
}

function saveSupport(id) {
  const founderId = $('s-founder')?.value;
  const program   = $('s-program')?.value;
  const startDate = $('s-start')?.value;
  if (!founderId) { alert('창업자를 선택해주세요'); return; }
  if (!program)   { alert('지원사업을 선택해주세요'); return; }
  if (!startDate) { alert('시작일을 입력해주세요'); return; }
  const data = {
    founderId, program, startDate,
    subProgram: $('s-subprogram')?.value||'',
    endDate:  $('s-end')?.value||'',
    staff:    $('s-staff')?.value,
    stage:    $('s-stage')?.value,
    result:   $('s-result')?.value||'-',
    amount:   $('s-amount')?.value,
    memo:     $('s-memo')?.value,
  };
  const supports = DB.get('supports');
  if (id) {
    const idx=supports.findIndex(s=>s.id===id);
    if(idx>=0) supports[idx]={...supports[idx],...data};
  } else {
    supports.push({id:DB.id(),...data});
  }
  DB.set('supports',supports);
  closeModal();
  navigate('support');
}
function editSupport(id) { openSupportModal(id); }
function deleteSupportItem(id) {
  if (!confirm('이 지원사업을 삭제하시겠습니까?')) return;
  DB.set('supports',DB.get('supports').filter(s=>s.id!==id));
  navigate('support');
}
function deleteSupport(id) { deleteSupportItem(id); }






// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 전문가 DB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const EXPERT_FIELDS = ['기술·R&D','경영·마케팅','법무·특허','재무·투자','인사·노무','세무·회계','수출·글로벌','디자인·UX','기타'];

// 울산 지역 구분
const ULSAN_REGIONS = ['울산 중구','울산 남구','울산 동구','울산 북구','울산 울주군','기타(타지역)'];

// 금액 포맷 (원 단위)
function fmtAmt(v) {
  if(!v || v==='' || v==='0') return '-';
  return Number(v).toLocaleString() + '원';
}
function fmtAmtInput(v) { return v||''; }


function renderExperts() {
  const experts    = DB.get('experts');
  const mentorings = DB.get('mentorings');
  const activeCount = experts.filter(e=>e.status==='활동중').length;
  const totalMeet   = mentorings.length;

  $('content').innerHTML = `
  <div class="stat-grid" style="grid-template-columns:repeat(4,1fr)">
    <div class="stat-card stat-blue"><div class="stat-label">전체 전문가</div><div class="stat-value">${experts.length}명</div></div>
    <div class="stat-card stat-green"><div class="stat-label">활동중</div><div class="stat-value">${activeCount}명</div></div>
    <div class="stat-card stat-teal"><div class="stat-label">누적 상담·멘토링</div><div class="stat-value">${totalMeet}건</div></div>
    <div class="stat-card stat-orange"><div class="stat-label">분야 수</div><div class="stat-value">${new Set(experts.map(e=>e.field)).size}개</div></div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div class="filter-bar" style="margin-bottom:0">
      <div class="search-box">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="form-control" id="exp-search" placeholder="이름·분야 검색" oninput="filterExperts()" style="width:180px">
      </div>
      <select class="form-control" id="exp-field" onchange="filterExperts()" style="width:140px">
        <option value="">전체 분야</option>
        ${EXPERT_FIELDS.map(f=>`<option>${f}</option>`).join('')}
      </select>
      <select class="form-control" id="exp-status" onchange="filterExperts()" style="width:110px">
        <option value="">전체 상태</option>
        <option>활동중</option><option>휴식중</option><option>종료</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="openExpertModal()">+ 전문가 등록</button>
  </div>

  <div class="card">
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>이름</th><th>분야</th><th>세부전문</th><th>소속·직위</th><th>가능일정</th><th>비용</th><th>누적상담</th><th>상태</th><th>관리</th></tr></thead>
        <tbody id="exp-tbody"></tbody>
      </table>
    </div>
  </div>`;

  filterExperts();
}

function filterExperts() {
  const q  = ($('exp-search')||{value:''}).value.toLowerCase();
  const f  = ($('exp-field')||{value:''}).value;
  const st = ($('exp-status')||{value:''}).value;
  const experts    = DB.get('experts').filter(e=>
    (!q  || e.name?.toLowerCase().includes(q) || e.field?.toLowerCase().includes(q) || e.subField?.toLowerCase().includes(q)) &&
    (!f  || e.field===f) &&
    (!st || e.status===st)
  );
  const mentorings = DB.get('mentorings');
  const tbody = $('exp-tbody');
  if(!tbody) return;

  const fieldColors = {'기술·R&D':'badge-blue','경영·마케팅':'badge-teal','법무·특허':'badge-purple','재무·투자':'badge-green','인사·노무':'badge-amber','세무·회계':'badge-amber','수출·글로벌':'badge-teal','디자인·UX':'badge-purple'};

  tbody.innerHTML = experts.length===0
    ? `<tr><td colspan="9" style="text-align:center;color:var(--gray4);padding:32px">등록된 전문가가 없습니다</td></tr>`
    : experts.map(e=>{
        const cnt = mentorings.filter(m=>m.expertId===e.id).length;
        return `<tr>
          <td>
            <button style="background:none;border:none;padding:0;cursor:pointer" onclick="viewExpertDetail('${e.id}')">
              <div style="display:flex;align-items:center;gap:7px">
                ${avatarHtml(e.name)}
                <span style="font-weight:700;color:var(--accent);text-decoration:underline">${esc(e.name)}</span>
              </div>
            </button>
          </td>
          <td><span class="badge ${fieldColors[e.field]||'badge-gray'}">${esc(e.field)}</span></td>
          <td style="font-size:12px;color:var(--gray5)">${esc(e.subField||'-')}</td>
          <td style="font-size:12px">${esc(e.org||'')} <span style="color:var(--gray4)">${esc(e.role||'')}</span></td>
          <td style="font-size:12px;color:var(--gray5)">${esc(e.avail||'-')}</td>
          <td style="font-size:12px;${e.cost?.includes('무료')?'color:var(--green);font-weight:600':''}">${esc(e.cost||'-')}</td>
          <td style="text-align:center">
            <button style="background:none;border:none;cursor:pointer;color:var(--accent);font-weight:600;text-decoration:underline" onclick="navigate('mentoring');setTimeout(()=>filterMentoringByExpert('${e.id}'),200)">${cnt}건</button>
          </td>
          <td><span class="badge ${e.status==='활동중'?'badge-green':e.status==='휴식중'?'badge-amber':'badge-gray'}">${esc(e.status)}</span></td>
          <td>
            <div style="display:flex;gap:3px">
              <button class="btn btn-sm btn-primary" onclick="openMentoringModal('','${e.id}')">매칭</button>
              <button class="btn btn-sm" onclick="openExpertModal('${e.id}')">편집</button>
              <button class="btn btn-sm btn-danger" onclick="deleteExpert('${e.id}')">삭제</button>
            </div>
          </td>
        </tr>`;
      }).join('');
}

function viewExpertDetail(id) {
  const e  = DB.get('experts').find(x=>x.id===id);
  if(!e) return;
  const ms = DB.get('mentorings').filter(m=>m.expertId===id).sort((a,b)=>b.date.localeCompare(a.date));

  openModal(`${e.name} 전문가 상세`, `
  <div style="display:grid;gap:14px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">소속</div><div style="font-weight:600">${esc(e.org||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">직위</div><div style="font-weight:500">${esc(e.role||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">상태</div><div>${esc(e.status||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">연락처</div><div style="font-size:12px">${esc(e.phone||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius);grid-column:span 2"><div style="font-size:10px;color:var(--gray4)">이메일</div><div style="font-size:12px">${esc(e.email||'-')}</div></div>
    </div>
    <div style="background:#EFF6FF;padding:12px;border-radius:var(--radius);border:1px solid #BFDBFE">
      <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px">전문 분야</div>
      <div style="font-size:13px;font-weight:600">${esc(e.field)} · ${esc(e.subField||'')}</div>
    </div>
    ${e.career?`<div><div style="font-size:11px;color:var(--gray5);font-weight:600;margin-bottom:4px">주요 경력</div><div style="font-size:13px;line-height:1.7">${esc(e.career)}</div></div>`:''}
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--gray6)">상담·멘토링 이력 (${ms.length}건)</div>
        <button class="btn btn-sm btn-primary" onclick="closeModal();openMentoringModal('','${id}')">+ 상담 등록</button>
      </div>
      ${ms.length===0
        ? `<div style="text-align:center;color:var(--gray4);padding:16px;background:var(--gray1);border-radius:var(--radius)">이력 없음</div>`
        : ms.slice(0,5).map(m=>`
          <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray2)">
            <div style="min-width:80px;font-size:11px;color:var(--gray4)">${m.date}</div>
            <div style="flex:1">
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:2px">
                <span style="font-size:12px;font-weight:600">${esc(m.targetName)}</span>
                <span class="badge badge-gray" style="font-size:10px">${esc(m.program)}</span>
                <span class="badge ${m.status==='완료'?'badge-green':m.status==='예정'?'badge-blue':'badge-amber'}" style="font-size:10px">${esc(m.status)}</span>
              </div>
              ${m.outcome?`<div style="font-size:11px;color:var(--gray5)">${esc(m.outcome)}</div>`:''}
              ${(m.attachments||[]).length>0?`<div style="font-size:10px;color:var(--accent);margin-top:2px">📎 첨부 ${m.attachments.length}건</div>`:''}
            </div>
          </div>`).join('')}
    </div>
  </div>`,
  `<button class="btn" onclick="closeModal()">닫기</button>
   <button class="btn btn-primary" onclick="closeModal();openMentoringModal('','${id}')">+ 상담 매칭</button>`,
  true);
}

function openExpertModal(id) {
  const e = id ? DB.get('experts').find(x=>x.id===id) : null;
  const v = e || {};
  const fieldOpts  = EXPERT_FIELDS.map(f=>`<option${v.field===f?' selected':''}>${f}</option>`).join('');
  const statusOpts = ['활동중','휴식중','종료'].map(s=>`<option${v.status===s?' selected':''}>${s}</option>`).join('');

  openModal(id ? '전문가 정보 수정' : '전문가 등록', `
  <div class="form-grid">
    <div class="form-grid form-grid-3">
      <div class="form-group"><label>이름 <span>*</span></label><input class="form-control" id="ex-name" value="${esc(v.name||'')}"></div>
      <div class="form-group"><label>소속기관</label><input class="form-control" id="ex-org" value="${esc(v.org||'')}"></div>
      <div class="form-group"><label>직위·직책</label><input class="form-control" id="ex-role" value="${esc(v.role||'')}"></div>
    </div>
    <div class="form-grid form-grid-2">
      <div class="form-group"><label>전문 분야 <span>*</span></label><select class="form-control" id="ex-field">${fieldOpts}</select></div>
      <div class="form-group"><label>세부 전문</label><input class="form-control" id="ex-sub" value="${esc(v.subField||'')}" placeholder="예: AI·빅데이터·SW개발"></div>
    </div>
    <div class="form-grid form-grid-2">
      <div class="form-group"><label>연락처</label><input class="form-control" id="ex-phone" value="${esc(v.phone||'')}"></div>
      <div class="form-group"><label>이메일</label><input class="form-control" id="ex-email" value="${esc(v.email||'')}"></div>
    </div>
    <div class="form-group"><label>주요 경력</label><textarea class="form-control" id="ex-career">${esc(v.career||'')}</textarea></div>
    <div class="form-grid form-grid-2">
      <div class="form-group"><label>활동 상태</label><select class="form-control" id="ex-status">${statusOpts}</select></div>
      <div class="form-group"><label>메모</label><input class="form-control" id="ex-memo" value="${esc(v.memo||'')}"></div>
    </div>
  </div>`,
  `<button class="btn" onclick="closeModal()">취소</button>
   <button class="btn btn-primary" onclick="saveExpert('${id||''}')">저장</button>`, true);
}

function saveExpert(id) {
  const name = $('ex-name')?.value?.trim();
  if(!name) { alert('이름을 입력해주세요'); return; }
  const data = {
    name, org:$('ex-org')?.value, role:$('ex-role')?.value,
    field:$('ex-field')?.value, subField:$('ex-sub')?.value,
    phone:$('ex-phone')?.value, email:$('ex-email')?.value,
    career:$('ex-career')?.value, status:$('ex-status')?.value||'활동중',
    memo:$('ex-memo')?.value,
  };
  const experts = DB.get('experts');
  if(id) { const idx=experts.findIndex(e=>e.id===id); if(idx>=0) experts[idx]={...experts[idx],...data}; }
  else experts.push({id:DB.id(),...data});
  DB.set('experts',experts);
  closeModal(); navigate('experts');
}

function deleteExpert(id) {
  if(!confirm('이 전문가를 삭제하시겠습니까?')) return;
  DB.set('experts', DB.get('experts').filter(e=>e.id!==id));
  navigate('experts');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 전문가 상담·멘토링 관리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _mentorFilterExpert = '';

function filterMentoringByExpert(expertId) {
  _mentorFilterExpert = expertId;
  const sel = $('ment-expert');
  if(sel) sel.value = expertId;
  filterMentorings();
}

function renderMentoring() {
  _mentorFilterExpert = '';
  const mentorings = DB.get('mentorings');
  const experts    = DB.get('experts');
  const done    = mentorings.filter(m=>m.status==='완료').length;
  const sched   = mentorings.filter(m=>m.status==='예정').length;
  const totalCost = mentorings.reduce((a,m)=>a+(Number(m.cost)||0),0);

  $('content').innerHTML = `
  <div class="stat-grid">
    <div class="stat-card stat-blue"><div class="stat-label">전체 상담·멘토링</div><div class="stat-value">${mentorings.length}건</div></div>
    <div class="stat-card stat-green"><div class="stat-label">완료</div><div class="stat-value">${done}건</div></div>
    <div class="stat-card stat-orange"><div class="stat-label">예정</div><div class="stat-value">${sched}건</div></div>
    <div class="stat-card stat-teal"><div class="stat-label">총 지원 비용</div><div class="stat-value">${totalCost>0?totalCost.toLocaleString()+'만':'전액 무료'}</div></div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
    <div class="filter-bar" style="margin-bottom:0;flex-wrap:wrap">
      <div class="search-box">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="form-control" id="ment-search" placeholder="기업·창업자 검색" oninput="filterMentorings()" style="width:180px">
      </div>
      <select class="form-control" id="ment-expert" onchange="filterMentorings()" style="width:130px">
        <option value="">전체 전문가</option>
        ${experts.map(e=>`<option value="${e.id}">${e.name} (${e.field})</option>`).join('')}
      </select>
      <select class="form-control" id="ment-status" onchange="filterMentorings()" style="width:100px">
        <option value="">전체 상태</option>
        <option>예정</option><option>완료</option><option>취소</option>
      </select>
      <select class="form-control" id="ment-field" onchange="filterMentorings()" style="width:130px">
        <option value="">전체 분야</option>
        ${EXPERT_FIELDS.map(f=>`<option>${f}</option>`).join('')}
      </select>
    </div>
    <button class="btn btn-primary" onclick="openMentoringModal()">+ 상담·멘토링 등록</button>
  </div>

  <div class="card">
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>대상</th><th>전문가</th><th>분야</th><th>프로그램</th>
            <th>일시</th><th>시간</th><th>방식</th><th>비용</th>
            <th>상태</th><th>성과</th><th>첨부</th><th>담당</th><th>관리</th>
          </tr>
        </thead>
        <tbody id="ment-tbody"></tbody>
      </table>
    </div>
  </div>

  <!-- 분야별 현황 -->
  <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
    <div class="card">
      <div class="card-header"><span class="card-title">분야별 상담 현황</span></div>
      <div class="card-body" style="padding-top:8px">
        ${EXPERT_FIELDS.map(f=>{
          const cnt = mentorings.filter(m=>{
            const ex = experts.find(e=>e.id===m.expertId);
            return ex?.field===f;
          }).length;
          if(!cnt) return '';
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
            <div style="font-size:12px;min-width:90px;color:var(--gray6)">${f}</div>
            <div style="flex:1;height:6px;background:var(--gray2);border-radius:3px;overflow:hidden">
              <div style="width:${Math.round(cnt/mentorings.length*100)}%;height:100%;background:var(--accent)"></div>
            </div>
            <div style="font-size:12px;font-weight:600;color:var(--accent)">${cnt}건</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">전문가별 상담 건수</span></div>
      <div class="card-body" style="padding-top:8px">
        ${experts.filter(e=>mentorings.some(m=>m.expertId===e.id)).map(e=>{
          const cnt = mentorings.filter(m=>m.expertId===e.id).length;
          const done2 = mentorings.filter(m=>m.expertId===e.id&&m.status==='완료').length;
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            ${avatarHtml(e.name)}
            <div style="flex:1">
              <div style="font-size:12px;font-weight:600">${esc(e.name)}</div>
              <div style="font-size:10px;color:var(--gray4)">${esc(e.field)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:13px;font-weight:700;color:var(--accent)">${cnt}건</div>
              <div style="font-size:10px;color:var(--green)">완료 ${done2}</div>
            </div>
          </div>`;
        }).join('') || '<div style="color:var(--gray4);font-size:13px">데이터 없음</div>'}
      </div>
    </div>
  </div>`;

  if(_mentorFilterExpert) { $('ment-expert').value=_mentorFilterExpert; }
  filterMentorings();
}

function filterMentorings() {
  const q   = ($('ment-search')||{value:''}).value.toLowerCase();
  const eid = ($('ment-expert')||{value:''}).value;
  const st  = ($('ment-status')||{value:''}).value;
  const fd  = ($('ment-field')||{value:''}).value;
  const experts = DB.get('experts');
  const mentorings = DB.get('mentorings').filter(m=>{
    const ex = experts.find(e=>e.id===m.expertId);
    return (!q  || m.targetName?.toLowerCase().includes(q) || ex?.name?.toLowerCase().includes(q)) &&
           (!eid || m.expertId===eid) &&
           (!st  || m.status===st) &&
           (!fd  || ex?.field===fd);
  }).sort((a,b)=>b.date.localeCompare(a.date));

  const tbody = $('ment-tbody');
  if(!tbody) return;
  tbody.innerHTML = mentorings.length===0
    ? `<tr><td colspan="12" style="text-align:center;color:var(--gray4);padding:32px">등록된 상담·멘토링이 없습니다</td></tr>`
    : mentorings.map(m=>{
        const ex = experts.find(e=>e.id===m.expertId);
        const fieldColors = {'기술·R&D':'badge-blue','경영·마케팅':'badge-teal','법무·특허':'badge-purple','재무·투자':'badge-green','인사·노무':'badge-amber'};
        return `<tr>
          <td>
            <div style="font-weight:600;font-size:13px">${esc(m.targetName)}</div>
            <div style="font-size:10px;color:var(--gray4)">${m.targetType==='founder'?'창업자':'선정기업'}</div>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:6px">
              ${avatarHtml(ex?.name||'?')}
              <span style="font-size:12px;font-weight:500">${esc(ex?.name||'-')}</span>
            </div>
          </td>
          <td><span class="badge ${fieldColors[ex?.field]||'badge-gray'}" style="font-size:10px">${esc(ex?.field||'-')}</span></td>
          <td style="font-size:12px">${esc(m.program||'-')}</td>
          <td style="font-size:12px;color:var(--gray5)">${esc(m.date)} ${m.time?m.time:''}</td>
          <td style="text-align:center;font-size:12px">${m.duration||'-'}시간</td>
          <td style="font-size:12px">${esc(m.method||'-')}</td>
          <td style="font-size:12px;color:${Number(m.cost)>0?'var(--orange)':'var(--green)'}">
            ${Number(m.cost)>0?Number(m.cost).toLocaleString()+'원':'무료'}
          </td>
          <td><span class="badge ${m.status==='완료'?'badge-green':m.status==='예정'?'badge-blue':'badge-gray'}">${esc(m.status)}</span></td>
          <td style="font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--gray6)">${esc(m.outcome||'-')}</td>
          <td style="font-size:12px">
            ${(m.attachments||[]).length>0
              ? `<span class="badge badge-teal" style="font-size:10px;cursor:pointer" onclick="viewAttachments('${m.id}')">📎 ${m.attachments.length}건</span>`
              : '<span style="color:var(--gray3);font-size:11px">-</span>'}
          </td>
          <td style="font-size:12px">${esc(m.staff||'-')}</td>
          <td>
            <div style="display:flex;gap:3px">
              <button class="btn btn-sm" onclick="openMentoringModal('${m.id}')">편집</button>
              <button class="btn btn-sm btn-danger" onclick="deleteMentoring('${m.id}')">삭제</button>
            </div>
          </td>
        </tr>`;
      }).join('');
}

function openMentoringModal(id, preExpertId) {
  const s    = cfg();
  const m    = id ? DB.get('mentorings').find(x=>x.id===id) : null;
  const v    = m || {};
  const experts    = DB.get('experts');
  const founders   = DB.get('founders');
  const selFirms   = DB.get('selectedFirms');
  const targetEid  = v.expertId || preExpertId || '';

  const expertOpts = experts.map(e=>`<option value="${e.id}"${targetEid===e.id?' selected':''}>${e.name} — ${e.field} (${e.avail||'일정 미정'})</option>`).join('');
  const staffOpts  = s.staff.filter(x=>x).map(st=>`<option${v.staff===st?' selected':''}>${st}</option>`).join('');
  const methodOpts = ['방문','온라인','전화','화상'].map(x=>`<option${v.method===x?' selected':''}>${x}</option>`).join('');
  const statusOpts = ['예정','완료','취소'].map(x=>`<option${v.status===x?' selected':''}>${x}</option>`).join('');
  const programOpts= ['기술 자문','마케팅 멘토링','법무 자문','투자 유치 자문','인사·노무 자문','세무·회계 자문','수출 자문','경영 전략','기타'].map(x=>`<option${v.program===x?' selected':''}>${x}</option>`).join('');

  // 대상 목록 (창업자 + 선정기업)
  const founderOpts = founders.map(f=>`<option value="founder|${f.id}|${f.name}"${v.targetType==='founder'&&v.targetId===f.id?' selected':''}>창업자 · ${f.name} (${f.biz||''})</option>`).join('');
  const firmOpts    = selFirms.map(f=>`<option value="selected|${f.id}|${f.companyName}"${v.targetType==='selected'&&v.targetId===f.id?' selected':''}>선정기업 · ${f.companyName}</option>`).join('');

  openModal(id ? '상담·멘토링 수정' : '상담·멘토링 등록', `
  <div class="form-grid">
    <div style="background:#EFF6FF;padding:12px;border-radius:var(--radius);border:1px solid #BFDBFE">
      <div style="font-size:12px;font-weight:600;color:var(--accent);margin-bottom:8px">매칭 정보</div>
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label>전문가 선택 <span>*</span></label>
          <select class="form-control" id="mn-expert"><option value="">선택</option>${expertOpts}</select>
        </div>
        <div class="form-group">
          <label>대상 기업·창업자 <span>*</span></label>
          <select class="form-control" id="mn-target">
            <option value="">선택</option>
            <optgroup label="── 창업자 ──">${founderOpts}</optgroup>
            <optgroup label="── 선정기업 ──">${firmOpts}</optgroup>
          </select>
        </div>
      </div>
      <div class="form-grid form-grid-2" style="margin-top:8px">
        <div class="form-group"><label>프로그램 유형</label><select class="form-control" id="mn-program">${programOpts}</select></div>
        <div class="form-group"><label>담당 직원</label><select class="form-control" id="mn-staff"><option value="">선택</option>${staffOpts}</select></div>
      </div>
    </div>

    <div class="form-grid form-grid-3">
      <div class="form-group"><label>상담 날짜 <span>*</span></label><input type="date" class="form-control" id="mn-date" value="${v.date||today()}"></div>
      <div class="form-group"><label>시작 시간</label><input type="time" class="form-control" id="mn-time" value="${v.time||''}"></div>
      <div class="form-group"><label>소요 시간(시간)</label><input class="form-control" type="number" step="0.5" id="mn-dur" value="${v.duration||'1'}" placeholder="1"></div>
    </div>
    <div class="form-grid form-grid-3">
      <div class="form-group"><label>상담 방식</label><select class="form-control" id="mn-method">${methodOpts}</select></div>
      <div class="form-group"><label>상태</label><select class="form-control" id="mn-status">${statusOpts}</select></div>
      <div class="form-group"><label>비용(원, 0=무료)</label><input class="form-control" type="number" id="mn-cost" value="${v.cost||'0'}"></div>
    </div>
    <div class="form-group"><label>상담 내용</label><textarea class="form-control" id="mn-content" style="min-height:80px">${esc(v.content||'')}</textarea></div>
    <div class="form-group"><label>성과·결과</label><textarea class="form-control" id="mn-outcome">${esc(v.outcome||'')}</textarea></div>

    <div style="background:var(--gray1);border-radius:var(--radius);padding:12px">
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:8px">
        📎 첨부파일 기록
        <span style="font-size:11px;font-weight:400;color:var(--gray4);margin-left:6px">파일명과 설명을 입력하세요 (실제 파일은 Firebase 연동 후 업로드 가능)</span>
      </div>
      <div id="attach-list">
        ${(v.attachments||[]).map((a,i)=>`
        <div style="display:flex;gap:6px;margin-bottom:6px" id="attach-row-${i}">
          <input class="form-control" style="flex:1" placeholder="파일명 (예: 사업계획서_검토.pdf)" value="${esc(a.name||'')}">
          <input class="form-control" style="flex:1" placeholder="설명 (예: 1차 검토 의견서)" value="${esc(a.desc||'')}">
          <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()" style="flex-shrink:0">×</button>
        </div>`).join('')}
      </div>
      <button class="btn btn-sm" onclick="addAttachRow()" style="margin-top:4px">
        + 파일 추가
      </button>
    </div>

    <div class="form-grid form-grid-2">
      <div class="form-group"><label>다음 상담 예정일</label><input type="date" class="form-control" id="mn-next" value="${v.nextDate||''}"></div>
      <div class="form-group"><label>메모</label><input class="form-control" id="mn-memo" value="${esc(v.memo||'')}"></div>
    </div>
  </div>`,
  `<button class="btn" onclick="closeModal()">취소</button>
   <button class="btn btn-primary" onclick="saveMentoring('${id||''}')">저장</button>`, true);
}

function addAttachRow() {
  const list = $('attach-list');
  if(!list) return;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:6px;margin-bottom:6px';
  div.innerHTML = `
    <input class="form-control" style="flex:1" placeholder="파일명 (예: 사업계획서_검토.pdf)">
    <input class="form-control" style="flex:1" placeholder="설명 (예: 1차 검토 의견서)">
    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()" style="flex-shrink:0">×</button>`;
  list.appendChild(div);
}

function saveMentoring(id) {
  const expertId = $('mn-expert')?.value;
  const targetVal= $('mn-target')?.value;
  if(!expertId)  { alert('전문가를 선택해주세요'); return; }
  if(!targetVal) { alert('대상을 선택해주세요'); return; }
  const [targetType, targetId, targetName] = targetVal.split('|');

  // 첨부파일 수집
  const attachRows = $('attach-list')?.querySelectorAll('div') || [];
  const attachments = [];
  attachRows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const name = inputs[0]?.value?.trim();
    const desc = inputs[1]?.value?.trim();
    if(name) attachments.push({name, desc});
  });

  const data = {
    expertId, targetType, targetId, targetName, attachments,
    program:  $('mn-program')?.value,
    staff:    $('mn-staff')?.value,
    date:     $('mn-date')?.value||today(),
    time:     $('mn-time')?.value,
    duration: $('mn-dur')?.value,
    method:   $('mn-method')?.value,
    status:   $('mn-status')?.value||'예정',
    cost:     $('mn-cost')?.value||'0',
    content:  $('mn-content')?.value,
    outcome:  $('mn-outcome')?.value,
    nextDate: $('mn-next')?.value,
    memo:     $('mn-memo')?.value,
  };
  const mentorings = DB.get('mentorings');
  if(id) { const idx=mentorings.findIndex(m=>m.id===id); if(idx>=0) mentorings[idx]={...mentorings[idx],...data}; }
  else mentorings.push({id:DB.id(),...data});
  DB.set('mentorings',mentorings);
  closeModal(); navigate('mentoring');
}

function viewAttachments(mentoringId) {
  const m = DB.get('mentorings').find(x=>x.id===mentoringId);
  if(!m) return;
  const attachments = m.attachments || [];

  openModal(`📎 첨부파일 목록 — ${esc(m.targetName)}`, `
  <div style="display:grid;gap:8px">
    <div style="font-size:12px;color:var(--gray4);margin-bottom:4px">
      ${m.date} · ${m.program} · ${m.targetName}
    </div>
    ${attachments.length === 0
      ? `<div style="text-align:center;color:var(--gray4);padding:24px;background:var(--gray1);border-radius:var(--radius)">첨부파일 없음</div>`
      : attachments.map((a,i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--gray1);border-radius:var(--radius);border:1px solid var(--gray2)">
          <div style="width:32px;height:32px;background:#EFF6FF;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px">📄</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:var(--accent)">${esc(a.name||'파일명 없음')}</div>
            ${a.desc ? `<div style="font-size:11px;color:var(--gray5);margin-top:2px">${esc(a.desc)}</div>` : ''}
          </div>
          <div style="font-size:10px;color:var(--gray4)">기록 ${i+1}</div>
        </div>`).join('')}
    <div style="margin-top:8px;padding:10px;background:#FFFBEB;border-radius:var(--radius);border:1px solid #FDE68A;font-size:11px;color:var(--gold)">
      💡 실제 파일 업로드는 Firebase 연동 후 가능합니다. 현재는 파일명·설명 기록만 저장됩니다.
    </div>
  </div>`,
  `<button class="btn" onclick="closeModal()">닫기</button>
   <button class="btn btn-primary" onclick="closeModal();openMentoringModal('${mentoringId}')">편집</button>`);
}

function deleteMentoring(id) {
  if(!confirm('삭제하시겠습니까?')) return;
  DB.set('mentorings', DB.get('mentorings').filter(m=>m.id!==id));
  navigate('mentoring');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 선정기업 관리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderSelected() {
  const firms = DB.get('selectedFirms');
  const notes = DB.get('selectedNotes');
  const inProg  = firms.filter(f=>f.status==='지원중').length;
  const done    = firms.filter(f=>f.status==='완료').length;
  const totalAmt = firms.reduce((a,f)=>a+(Number(f.amount)||0),0);
  const postMgmt = firms.filter(f=>f.postMgmt==='후속관리중').length;

  $('content').innerHTML = `
  <div class="stat-grid">
    <div class="stat-card stat-blue">
      <div class="stat-label">전체 선정기업</div>
      <div class="stat-value">${firms.length}개사</div>
    </div>
    <div class="stat-card stat-orange">
      <div class="stat-label">지원 진행중</div>
      <div class="stat-value">${inProg}개사</div>
    </div>
    <div class="stat-card stat-green">
      <div class="stat-label">지원 완료</div>
      <div class="stat-value">${done}개사</div>
    </div>
    <div class="stat-card stat-teal">
      <div class="stat-label">총 지원금액</div>
      <div class="stat-value">${totalAmt>=10000?(totalAmt/10000).toFixed(1)+'억':totalAmt.toLocaleString()+'만'}</div>
      <div class="stat-sub">후속관리 ${postMgmt}개사</div>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div class="tabs" style="margin-bottom:0">
      <button class="tab-btn active" id="sel-tab-list"    onclick="switchSelTab('list')">기업 목록</button>
      <button class="tab-btn"        id="sel-tab-program" onclick="switchSelTab('program')">사업별 현황</button>
      <button class="tab-btn"        id="sel-tab-post"    onclick="switchSelTab('post')">사후관리</button>
    </div>
    <button class="btn btn-primary" onclick="openSelectedModal()">+ 선정기업 등록</button>
  </div>

  <div class="filter-bar">
    <div class="search-box">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input class="form-control" id="sel-search" placeholder="기업명·대표자 검색" oninput="filterSelectedFirms()" style="width:200px">
    </div>
    <select class="form-control" id="sel-program-filter" onchange="filterSelectedFirms()" style="width:150px">
      <option value="">전체 사업</option>
      ${[...new Set(firms.map(f=>f.program))].map(p=>`<option>${p}</option>`).join('')}
    </select>
    <select class="form-control" id="sel-status-filter" onchange="filterSelectedFirms()" style="width:110px">
      <option value="">전체 상태</option>
      <option>지원중</option><option>완료</option>
    </select>
    <select class="form-control" id="sel-type-filter" onchange="filterSelectedFirms()" style="width:110px">
      <option value="">전체 유형</option>
      <option>테크</option><option>로컬</option><option>혼합형</option>
    </select>
  </div>

  <div id="sel-panel"></div>`;

  renderSelList();
}

function switchSelTab(tab) {
  ['list','program','post'].forEach(t=>{
    const btn = $(`sel-tab-${t}`);
    if(btn) btn.classList.toggle('active', t===tab);
  });
  if(tab==='list')    renderSelList();
  else if(tab==='program') renderSelByProgram();
  else                renderSelPostMgmt();
}

function getFilteredFirms() {
  const q  = ($('sel-search')||{value:''}).value.toLowerCase();
  const sp = ($('sel-program-filter')||{value:''}).value;
  const ss = ($('sel-status-filter')||{value:''}).value;
  const st = ($('sel-type-filter')||{value:''}).value;
  return DB.get('selectedFirms').filter(f=>
    (!q  || f.companyName?.toLowerCase().includes(q) || f.ceo?.toLowerCase().includes(q)) &&
    (!sp || f.program===sp) &&
    (!ss || f.status===ss) &&
    (!st || f.type===st)
  );
}

function filterSelectedFirms() { renderSelList(); }

function renderSelList() {
  const firms = getFilteredFirms().sort((a,b)=>b.startDate.localeCompare(a.startDate));
  const notes = DB.get('selectedNotes');
  const panel = $('sel-panel');
  if(!panel) return;

  if(firms.length===0){
    panel.innerHTML=`<div class="card"><div class="card-body" style="text-align:center;color:var(--gray4);padding:40px">등록된 선정기업이 없습니다</div></div>`;
    return;
  }

  panel.innerHTML = `
  <div class="card">
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>기업명</th><th>대표자</th><th>업종</th><th>유형</th><th>지원사업</th><th>지원기간</th><th>지원금(만원)</th><th>담당</th><th>상태</th><th>사후관리</th><th>관리</th></tr></thead>
        <tbody>
          ${firms.map(f=>{
            const lastNote = notes.filter(n=>n.firmId===f.id).sort((a,b)=>b.date.localeCompare(a.date))[0];
            const postColor = {후속관리중:'badge-orange',성장추적중:'badge-teal',완료:'badge-green'};
            return `<tr>
              <td>
                <button style="background:none;border:none;padding:0;cursor:pointer;text-align:left" onclick="viewSelectedDetail('${f.id}')">
                  <span style="font-weight:700;color:var(--accent);text-decoration:underline">${esc(f.companyName)}</span>
                </button>
              </td>
              <td>${esc(f.ceo)}</td>
              <td style="font-size:12px;color:var(--gray5)">${esc(f.sector)}</td>
              <td>${verdictBadge(f.type)}</td>
              <td style="font-weight:500">${esc(f.program)}</td>
              <td style="font-size:11px;color:var(--gray5)">${esc(f.startDate)}<br>${f.endDate||'<span style="color:var(--orange)">진행중</span>'}</td>
              <td style="font-weight:600;color:var(--green)">${f.amount?Number(f.amount).toLocaleString():'-'}</td>
              <td style="font-size:12px">${esc(f.staff)}</td>
              <td>${statusBadge(f.status)}</td>
              <td>
                <span class="badge ${postColor[f.postMgmt]||'badge-gray'}" style="font-size:10px">${esc(f.postMgmt||'-')}</span>
                ${lastNote?`<div style="font-size:10px;color:var(--gray4);margin-top:2px">${lastNote.date}</div>`:''}
              </td>
              <td>
                <div style="display:flex;gap:3px;flex-wrap:wrap">
                  <button class="btn btn-sm" onclick="viewSelectedDetail('${f.id}')">상세</button>
                  <button class="btn btn-sm" onclick="editSelectedFirm('${f.id}')">편집</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteSelectedFirm('${f.id}')">삭제</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderSelByProgram() {
  const firms = DB.get('selectedFirms');
  const panel = $('sel-panel');
  if(!panel) return;

  const byProg = {};
  firms.forEach(f=>{
    if(!byProg[f.program]) byProg[f.program]=[];
    byProg[f.program].push(f);
  });

  panel.innerHTML = Object.entries(byProg).map(([prog, list])=>{
    const total = list.reduce((a,f)=>a+(Number(f.amount)||0),0);
    const inProg = list.filter(f=>f.status==='지원중').length;
    return `
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <div>
          <span class="card-title">${esc(prog)}</span>
          <span style="font-size:12px;color:var(--gray4);margin-left:8px">총 ${list.length}개사</span>
        </div>
        <div style="display:flex;gap:12px;align-items:center">
          <span style="font-size:12px;color:var(--orange)">진행중 ${inProg}개사</span>
          <span style="font-size:13px;font-weight:700;color:var(--green)">${total.toLocaleString()}만원</span>
        </div>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>기업명</th><th>대표자</th><th>유형</th><th>지원기간</th><th>지원금</th><th>담당</th><th>상태</th></tr></thead>
          <tbody>
            ${list.sort((a,b)=>b.startDate.localeCompare(a.startDate)).map(f=>`
            <tr>
              <td style="font-weight:600">${esc(f.companyName)}</td>
              <td>${esc(f.ceo)}</td>
              <td>${verdictBadge(f.type)}</td>
              <td style="font-size:11px;color:var(--gray5)">${f.startDate} ~ ${f.endDate||'진행중'}</td>
              <td style="font-weight:600;color:var(--green)">${f.amount?Number(f.amount).toLocaleString()+' 만':'-'}</td>
              <td style="font-size:12px">${esc(f.staff)}</td>
              <td>${statusBadge(f.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }).join('') || `<div class="card"><div class="card-body" style="text-align:center;color:var(--gray4);padding:32px">데이터 없음</div></div>`;
}

function renderSelPostMgmt() {
  const firms = DB.get('selectedFirms').filter(f=>f.postMgmt!=='완료');
  const notes = DB.get('selectedNotes');
  const panel = $('sel-panel');
  if(!panel) return;

  panel.innerHTML = `
  <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
    <button class="btn btn-primary" onclick="openNoteModal()">+ 사후관리 기록 추가</button>
  </div>
  ${firms.length===0
    ? `<div class="card"><div class="card-body" style="text-align:center;color:var(--gray4);padding:32px">사후관리 대상 기업이 없습니다</div></div>`
    : firms.map(f=>{
        const fNotes = notes.filter(n=>n.firmId===f.id).sort((a,b)=>b.date.localeCompare(a.date));
        const lastNote = fNotes[0];
        const overdue  = lastNote?.nextDate && lastNote.nextDate < today();
        return `
        <div class="card" style="margin-bottom:14px;${overdue?'border-left:3px solid var(--red)':''}">
          <div class="card-header">
            <div style="display:flex;align-items:center;gap:8px">
              ${avatarHtml(f.companyName)}
              <div>
                <div style="font-weight:700;font-size:14px">${esc(f.companyName)}</div>
                <div style="font-size:11px;color:var(--gray4)">${esc(f.program)} · 담당: ${esc(f.staff)}</div>
              </div>
              <span class="badge ${f.postMgmt==='후속관리중'?'badge-orange':'badge-teal'}" style="margin-left:4px">${esc(f.postMgmt)}</span>
              ${overdue?`<span class="badge badge-red">다음관리 기한 초과!</span>`:''}
            </div>
            <button class="btn btn-sm btn-primary" onclick="openNoteModal('','${f.id}')">+ 기록 추가</button>
          </div>
          <div class="card-body" style="padding-top:8px">
            ${fNotes.length===0
              ? `<div style="color:var(--gray4);font-size:13px">관리 기록이 없습니다</div>`
              : fNotes.slice(0,3).map((n,i)=>`
                <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray2)">
                  <div style="min-width:80px;font-size:11px;color:var(--gray4);padding-top:1px">${n.date}</div>
                  <div style="flex:1">
                    <div style="display:flex;gap:6px;align-items:center;margin-bottom:3px">
                      <span class="badge badge-gray" style="font-size:10px">${esc(n.type)}</span>
                      <span style="font-size:12px;color:var(--gray5)">${esc(n.staff)}</span>
                      ${n.nextDate?`<span style="font-size:11px;color:${n.nextDate<today()?'var(--red)':'var(--teal)'};margin-left:auto">다음: ${n.nextDate}</span>`:''}
                    </div>
                    <div style="font-size:13px">${esc(n.content)}</div>
                  </div>
                  <button class="btn btn-sm btn-danger" style="flex-shrink:0;align-self:flex-start" onclick="deleteNote('${n.id}','post')">삭제</button>
                </div>`).join('')}
            ${fNotes.length>3?`<div style="font-size:12px;color:var(--gray4);padding-top:6px">외 ${fNotes.length-3}건 더보기 → 상세보기</div>`:''}
          </div>
        </div>`;
      }).join('')}`;
}

function viewSelectedDetail(id) {
  const f     = DB.get('selectedFirms').find(x=>x.id===id);
  if(!f) return;
  const notes = DB.get('selectedNotes').filter(n=>n.firmId===id).sort((a,b)=>b.date.localeCompare(a.date));

  openModal(`${f.companyName} 상세`, `
  <div style="display:grid;gap:14px">

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">대표자</div><div style="font-weight:600">${esc(f.ceo)}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">사업자번호</div><div style="font-weight:500;font-size:12px">${esc(f.bizNo||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">설립연도</div><div style="font-weight:500">${esc(f.foundYear||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">업종</div><div style="font-weight:500">${esc(f.sector||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">지역</div><div style="font-weight:500">${esc(f.region||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">임직원수</div><div style="font-weight:500">${esc(f.employees||'-')}명</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius)"><div style="font-size:10px;color:var(--gray4)">연락처</div><div style="font-weight:500;font-size:12px">${esc(f.phone||'-')}</div></div>
      <div style="background:var(--gray1);padding:10px;border-radius:var(--radius);grid-column:span 2"><div style="font-size:10px;color:var(--gray4)">이메일</div><div style="font-weight:500;font-size:12px">${esc(f.email||'-')}</div></div>
    </div>

    <div style="background:#EFF6FF;border-radius:var(--radius);padding:12px;border:1px solid #BFDBFE">
      <div style="font-size:11px;font-weight:600;color:var(--accent);margin-bottom:8px">지원사업 정보</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px">
        <div><span style="color:var(--gray5)">사업명: </span><strong>${esc(f.program)}</strong></div>
        <div><span style="color:var(--gray5)">시작일: </span>${esc(f.startDate)}</div>
        <div><span style="color:var(--gray5)">종료일: </span>${f.endDate||'<span style="color:var(--orange)">진행중</span>'}</div>
        <div><span style="color:var(--gray5)">지원금: </span><strong style="color:var(--green)">${f.amount?Number(f.amount).toLocaleString()+'만원':'-'}</strong></div>
        <div><span style="color:var(--gray5)">담당자: </span>${esc(f.staff)}</div>
        <div><span style="color:var(--gray5)">상태: </span>${statusBadge(f.status)}</div>
      </div>
      ${f.memo?`<div style="margin-top:8px;font-size:12px;color:var(--gray5)">${esc(f.memo)}</div>`:''}
    </div>

    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--gray6)">사후관리 기록 (${notes.length}건)</div>
        <button class="btn btn-sm btn-primary" onclick="closeModal();openNoteModal('','${id}')">+ 기록 추가</button>
      </div>
      ${notes.length===0
        ? `<div style="color:var(--gray4);font-size:13px;padding:12px;background:var(--gray1);border-radius:var(--radius);text-align:center">기록 없음</div>`
        : notes.map(n=>`
          <div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--gray2)">
            <div style="min-width:90px;font-size:11px;color:var(--gray4);">${n.date}</div>
            <div style="flex:1">
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:3px">
                <span class="badge badge-gray" style="font-size:10px">${esc(n.type)}</span>
                <span style="font-size:11px;color:var(--gray5)">${esc(n.staff)}</span>
                ${n.nextDate?`<span style="font-size:11px;color:var(--teal);margin-left:auto">다음: ${n.nextDate}</span>`:''}
              </div>
              <div style="font-size:13px">${esc(n.content)}</div>
            </div>
            <button class="btn btn-sm btn-danger" style="flex-shrink:0;align-self:flex-start" onclick="deleteNote('${n.id}','detail_${id}')">삭제</button>
          </div>`).join('')}
    </div>
  </div>`,
  `<button class="btn" onclick="closeModal()">닫기</button>
   <button class="btn" onclick="closeModal();editSelectedFirm('${id}')">편집</button>
   <button class="btn btn-primary" onclick="closeModal();openNoteModal('','${id}')">+ 사후관리 기록</button>`,
  true);
}

function openSelectedModal(id) {
  const s  = cfg();
  const f  = id ? DB.get('selectedFirms').find(x=>x.id===id) : null;
  const v  = f || {};
  const staffOpts  = s.staff.filter(x=>x).map(st=>`<option${v.staff===st?' selected':''}>${st}</option>`).join('');
  const progOpts   = s.programs.map(p=>`<option${v.program===p?' selected':''}>${p}</option>`).join('');
  const statusOpts = ['지원중','완료'].map(st=>`<option${v.status===st?' selected':''}>${st}</option>`).join('');
  const postOpts   = ['후속관리중','성장추적중','완료'].map(st=>`<option${v.postMgmt===st?' selected':''}>${st}</option>`).join('');

  openModal(id ? '선정기업 수정' : '선정기업 등록', `
  <div class="form-grid">
    <div style="background:var(--gray1);border-radius:var(--radius);padding:12px">
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:10px">기업 기본 정보</div>
      <div class="form-grid">
        <div class="form-grid form-grid-2">
          <div class="form-group"><label>기업명 <span>*</span></label><input class="form-control" id="sf-name" value="${esc(v.companyName||'')}"></div>
          <div class="form-group"><label>대표자 <span>*</span></label><input class="form-control" id="sf-ceo" value="${esc(v.ceo||'')}"></div>
        </div>
        <div class="form-grid form-grid-3">
          <div class="form-group"><label>사업자번호</label><input class="form-control" id="sf-bizno" value="${esc(v.bizNo||'')}" placeholder="000-00-00000"></div>
          <div class="form-group"><label>설립연도</label><input class="form-control" id="sf-year" value="${esc(v.foundYear||'')}" placeholder="2023"></div>
          <div class="form-group"><label>임직원수(명)</label><input class="form-control" type="number" id="sf-emp" value="${v.employees||''}"></div>
        </div>
        <div class="form-grid form-grid-2">
          <div class="form-group"><label>대표 업태 <span style="color:var(--gray4);font-weight:400;font-size:11px">(사업자등록증 기준)</span></label>
            <input class="form-control" id="sf-biztype" value="${esc(v.bizType||v.sector||'')}" placeholder="예: 제조업, 도소매업, 서비스업">
          </div>
          <div class="form-group"><label>대표 종목 <span style="color:var(--gray4);font-weight:400;font-size:11px">(사업자등록증 기준)</span></label>
            <input class="form-control" id="sf-bizitem" value="${esc(v.bizItem||'')}" placeholder="예: 소프트웨어 개발, 식품 제조">
          </div>
        </div>
        <div class="form-grid form-grid-3">
          <div class="form-group"><label>기업 유형</label>
            <select class="form-control" id="sf-type">
              <option${v.type==='테크'?' selected':''}>테크</option>
              <option${v.type==='로컬'?' selected':''}>로컬</option>
              <option${v.type==='혼합형'?' selected':''}>혼합형</option>
            </select>
          </div>
          <div class="form-group"><label>지역</label>
            <select class="form-control" id="sf-region">
              <option value="">선택</option>
              ${ULSAN_REGIONS.map(r=>`<option${v.region===r?' selected':''}>${r}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>성별(대표자)</label>
            <select class="form-control" id="sf-gender">
              <option value="">선택</option>
              <option${v.gender==='남'?' selected':''}>남</option>
              <option${v.gender==='여'?' selected':''}>여</option>
            </select>
          </div>
        </div>
        <div class="form-grid form-grid-2">
          <div class="form-group"><label>연락처</label><input class="form-control" id="sf-phone" value="${esc(v.phone||'')}"></div>
          <div class="form-group"><label>이메일</label><input class="form-control" id="sf-email" value="${esc(v.email||'')}"></div>
        </div>
      </div>
    </div>

    <div style="background:#EFF6FF;border-radius:var(--radius);padding:12px;border:1px solid #BFDBFE">
      <div style="font-size:12px;font-weight:600;color:var(--accent);margin-bottom:10px">지원사업 정보</div>
      <div class="form-grid">
        <div class="form-grid form-grid-2">
          <div class="form-group"><label>지원사업명 <span>*</span></label><select class="form-control" id="sf-program">${progOpts}</select></div>
          <div class="form-group"><label>담당자</label><select class="form-control" id="sf-staff"><option value="">선택</option>${staffOpts}</select></div>
        </div>
        <div class="form-grid form-grid-2">
          <div class="form-group"><label>지원 시작일 <span>*</span></label><input type="date" class="form-control" id="sf-start" value="${v.startDate||today()}"></div>
          <div class="form-group"><label>지원 종료일</label><input type="date" class="form-control" id="sf-end" value="${v.endDate||''}"></div>
        </div>
        <div class="form-grid form-grid-3">
          <div class="form-group"><label>지원금액(원)</label><input class="form-control" type="number" id="sf-amount" value="${v.amount||''}" placeholder="예: 10000000"></div>
          <div class="form-group"><label>지원 상태</label><select class="form-control" id="sf-status">${statusOpts}</select></div>
          <div class="form-group"><label>사후관리 상태</label><select class="form-control" id="sf-post">${postOpts}</select></div>
        </div>
      </div>
    </div>

    <div class="form-group"><label>메모</label><textarea class="form-control" id="sf-memo">${esc(v.memo||'')}</textarea></div>
  </div>`,
  `<button class="btn" onclick="closeModal()">취소</button>
   <button class="btn btn-primary" onclick="saveSelectedFirm('${id||''}')">저장</button>`,
  true);
}

function saveSelectedFirm(id) {
  const name = $('sf-name')?.value?.trim();
  const ceo  = $('sf-ceo')?.value?.trim();
  if(!name) { alert('기업명을 입력해주세요'); return; }
  if(!ceo)  { alert('대표자를 입력해주세요'); return; }
  const data = {
    companyName: name, ceo,
    bizNo:      $('sf-bizno')?.value,
    foundYear:  $('sf-year')?.value,
    employees:  $('sf-emp')?.value,
    bizType:    $('sf-biztype')?.value,
    bizItem:    $('sf-bizitem')?.value,
    sector:     ($('sf-biztype')?.value||'') + ($('sf-bizitem')?.value?' / '+$('sf-bizitem')?.value:''),
    type:       $('sf-type')?.value||'테크',
    region:     $('sf-region')?.value,
    gender:     $('sf-gender')?.value,
    phone:      $('sf-phone')?.value,
    email:      $('sf-email')?.value,
    program:    $('sf-program')?.value,
    staff:      $('sf-staff')?.value,
    startDate:  $('sf-start')?.value||today(),
    endDate:    $('sf-end')?.value||'',
    amount:     $('sf-amount')?.value,
    status:     $('sf-status')?.value||'지원중',
    postMgmt:   $('sf-post')?.value||'후속관리중',
    memo:       $('sf-memo')?.value,
  };
  const firms = DB.get('selectedFirms');
  if(id) {
    const idx = firms.findIndex(f=>f.id===id);
    if(idx>=0) firms[idx] = {...firms[idx], ...data};
  } else {
    firms.push({id:DB.id(), hasConsult:false, founderId:'', ...data});
  }
  DB.set('selectedFirms', firms);
  closeModal();
  navigate('selected');
}
function editSelectedFirm(id) { openSelectedModal(id); }
function deleteSelectedFirm(id) {
  if(!confirm('이 선정기업을 삭제하시겠습니까?')) return;
  DB.set('selectedFirms', DB.get('selectedFirms').filter(f=>f.id!==id));
  DB.set('selectedNotes', DB.get('selectedNotes').filter(n=>n.firmId!==id));
  navigate('selected');
}

function openNoteModal(id, preFirmId) {
  const s    = cfg();
  const n    = id ? DB.get('selectedNotes').find(x=>x.id===id) : null;
  const v    = n || {};
  const firms = DB.get('selectedFirms');
  const firmOpts = firms.map(f=>`<option value="${f.id}"${(v.firmId||preFirmId)===f.id?' selected':''}>${f.companyName}</option>`).join('');
  const staffOpts = s.staff.filter(x=>x).map(st=>`<option${v.staff===st?' selected':''}>${st}</option>`).join('');
  const typeOpts = ['방문점검','전화','이메일','화상','기타'].map(t=>`<option${v.type===t?' selected':''}>${t}</option>`).join('');

  openModal(id ? '사후관리 기록 수정' : '사후관리 기록 추가', `
  <div class="form-grid">
    <div class="form-grid form-grid-2">
      <div class="form-group"><label>기업 <span>*</span></label><select class="form-control" id="sn-firm"><option value="">선택</option>${firmOpts}</select></div>
      <div class="form-group"><label>담당자</label><select class="form-control" id="sn-staff"><option value="">선택</option>${staffOpts}</select></div>
    </div>
    <div class="form-grid form-grid-2">
      <div class="form-group"><label>방문/연락일 <span>*</span></label><input type="date" class="form-control" id="sn-date" value="${v.date||today()}"></div>
      <div class="form-group"><label>관리 유형</label><select class="form-control" id="sn-type">${typeOpts}</select></div>
    </div>
    <div class="form-group"><label>내용 <span>*</span></label><textarea class="form-control" id="sn-content" style="min-height:100px">${esc(v.content||'')}</textarea></div>
    <div class="form-group"><label>다음 관리 예정일</label><input type="date" class="form-control" id="sn-next" value="${v.nextDate||''}"></div>
  </div>`,
  `<button class="btn" onclick="closeModal()">취소</button>
   <button class="btn btn-primary" onclick="saveNote('${id||''}')">저장</button>`);
}

function saveNote(id) {
  const firmId  = $('sn-firm')?.value;
  const content = $('sn-content')?.value?.trim();
  if(!firmId)  { alert('기업을 선택해주세요'); return; }
  if(!content) { alert('내용을 입력해주세요'); return; }
  const data = {
    firmId, content,
    staff:    $('sn-staff')?.value,
    date:     $('sn-date')?.value||today(),
    type:     $('sn-type')?.value||'방문점검',
    nextDate: $('sn-next')?.value||'',
  };
  const notes = DB.get('selectedNotes');
  if(id) {
    const idx = notes.findIndex(n=>n.id===id);
    if(idx>=0) notes[idx] = {...notes[idx], ...data};
  } else {
    notes.push({id:DB.id(), ...data});
  }
  DB.set('selectedNotes', notes);
  closeModal();
  navigate('selected');
}

function deleteNote(id, context) {
  if(!confirm('이 기록을 삭제하시겠습니까?')) return;
  DB.set('selectedNotes', DB.get('selectedNotes').filter(n=>n.id!==id));
  if(context && context.startsWith('detail_')) {
    const firmId = context.replace('detail_','');
    closeModal();
    setTimeout(()=>viewSelectedDetail(firmId), 100);
  } else {
    navigate('selected');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 창업 현황
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderStartup() {
  const companies     = DB.get('companies');
  const selectedFirms = DB.get('selectedFirms');
  const founders      = DB.get('founders');
  const growths       = DB.get('growths');

  // 창업자 접수 경로 기업
  const fromConsult = companies.map(co=>{
    const f = founders.find(x=>x.id===co.founderId);
    return {...co, _ceo: f?.name||co.founderId, _verdict: f?.verdict||'-', _src:'상담경로'};
  });
  // 선정기업 경로 (companies에 없는 것만)
  const coFounderIds = new Set(companies.map(c=>c.founderId));
  const fromSelected = selectedFirms.map(sf=>({
    id: sf.id, name: sf.companyName, founderId: sf.id,
    biz: sf.sector, regDate: sf.startDate, staff: sf.staff,
    status: sf.status==='지원중'?'지원중':'운영중',
    _ceo: sf.ceo, _verdict: sf.type, _src:'선정경로', _sfId: sf.id,
  }));

  const all = [...fromConsult, ...fromSelected];
  const statusMap = {성장중:'badge-blue',운영중:'badge-green',스케일업:'badge-teal',초기운영:'badge-amber',지원중:'badge-purple',폐업:'badge-red'};
  const srcMap    = {상담경로:'badge-teal',선정경로:'badge-purple'};

  $('content').innerHTML = `
  <div class="stat-grid">
    <div class="stat-card stat-blue">
      <div class="stat-label">전체 기업</div>
      <div class="stat-value">${all.length}개사</div>
      <div class="stat-sub">상담경로 ${fromConsult.length} · 선정경로 ${fromSelected.length}</div>
    </div>
    <div class="stat-card stat-green">
      <div class="stat-label">성장 지표 등록</div>
      <div class="stat-value">${new Set(growths.map(g=>g.founderId||g.companyId)).size}개사</div>
    </div>
    <div class="stat-card stat-teal">
      <div class="stat-label">총 고용 창출</div>
      <div class="stat-value">${growths.reduce((a,g)=>a+(Number(g.employees)||0),0)}명</div>
    </div>
    <div class="stat-card stat-orange">
      <div class="stat-label">성장 지표 미등록</div>
      <div class="stat-value">${all.length - new Set(growths.map(g=>g.founderId||g.companyId)).size}개사</div>
      <div class="stat-sub">입력 권장</div>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <div style="font-size:13px;color:var(--gray5)">
      창업자 접수 경로 + 선정기업 경로 통합 현황 · 기업명 클릭 시 성장 지표로 이동
    </div>
    <button class="btn btn-primary" onclick="openStartupModal()">+ 창업 직접 등록</button>
  </div>

  <div class="card">
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>기업명</th><th>대표자</th><th>업종</th><th>유형</th><th>등록/시작일</th><th>담당자</th><th>진입경로</th><th>현황</th><th>성장지표</th><th>관리</th></tr></thead>
        <tbody>
          ${all.length===0
            ? `<tr><td colspan="10" style="text-align:center;color:var(--gray4);padding:32px">등록된 기업이 없습니다</td></tr>`
            : all.map(co=>{
                const fId = co._sfId ? co._sfId : co.founderId;
                const gKey = co._sfId ? co._sfId : co.founderId;
                const fGrowths = growths.filter(g=>g.founderId===gKey||g.companyId===co.id);
                const latest   = fGrowths.sort((a,b)=>b.year.localeCompare(a.year))[0];
                return `<tr>
                  <td>
                    <button style="background:none;border:none;padding:0;cursor:pointer" onclick="goToGrowthFrom('${co._sfId||''}','${co.founderId||''}','${co.id}')">
                      <span style="font-weight:700;color:var(--accent);text-decoration:underline">${esc(co.name)}</span>
                    </button>
                  </td>
                  <td>${esc(co._ceo)}</td>
                  <td style="font-size:12px;color:var(--gray5)">${esc(co.biz||'-')}</td>
                  <td>${verdictBadge(co._verdict)}</td>
                  <td style="font-size:12px;color:var(--gray5)">${esc(co.regDate||'-')}</td>
                  <td style="font-size:12px">${esc(co.staff||'-')}</td>
                  <td><span class="badge ${srcMap[co._src]||'badge-gray'}" style="font-size:10px">${esc(co._src)}</span></td>
                  <td><span class="badge ${statusMap[co.status]||'badge-gray'}">${esc(co.status)}</span></td>
                  <td>
                    ${latest
                      ? `<div style="font-size:11px"><span style="color:var(--green);font-weight:600">${Number(latest.revenue||0).toLocaleString()}만</span> <span style="color:var(--gray4)">(${latest.year})</span></div>`
                      : `<span style="font-size:11px;color:var(--red)">미입력</span>`}
                  </td>
                  <td>
                    <div style="display:flex;gap:3px;flex-wrap:wrap">
                      <button class="btn btn-sm btn-primary" onclick="goToGrowthFrom('${co._sfId||''}','${co.founderId||''}','${co.id}')">성장지표</button>
                      ${!co._sfId?`<button class="btn btn-sm btn-danger" onclick="deleteStartup('${co.id}')">삭제</button>`:''}
                    </div>
                  </td>
                </tr>`;
              }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function goToGrowthFrom(sfId, founderId, coId) {
  // 성장 지표 페이지로 이동 후 해당 기업 모달 자동 열기
  navigate('growth');
  setTimeout(()=>{
    // founderId 또는 selectedFirm id 기반으로 성장지표 입력 모달 열기
    const targetFounderId = founderId || sfId;
    if(targetFounderId) openGrowthModal('', targetFounderId);
  }, 150);
}


function openStartupModal(id) {
  const s = cfg();
  const co = id ? DB.get('companies').find(x=>x.id===id) : null;
  const v = co || {};
  const founders = DB.get('founders');
  const founderOpts = founders.map(f=>`<option value="${f.id}"${v.founderId===f.id?' selected':''}>${f.name}</option>`).join('');
  const staffOpts = s.staff.filter(x=>x).map(st=>`<option${v.staff===st?' selected':''}>${st}</option>`).join('');
  const statuses = ['초기운영','운영중','성장중','스케일업','폐업'];
  const statusOpts = statuses.map(st=>`<option${v.status===st?' selected':''}>${st}</option>`).join('');

  openModal(id ? '창업 정보 수정' : '창업 등록', `
  <div class="form-grid">
    <div class="form-group"><label>기업명 <span>*</span></label><input class="form-control" id="co-name" value="${esc(v.name||'')}"></div>
    <div class="form-grid form-grid-2">
      <div class="form-group"><label>대표자(창업자)</label><select class="form-control" id="co-founder"><option value="">선택</option>${founderOpts}</select></div>
      <div class="form-group"><label>담당자</label><select class="form-control" id="co-staff"><option value="">선택</option>${staffOpts}</select></div>
    </div>
    <div class="form-grid form-grid-2">
      <div class="form-group"><label>업종</label><input class="form-control" id="co-biz" value="${esc(v.biz||'')}"></div>
      <div class="form-group"><label>사업자 등록일</label><input type="date" class="form-control" id="co-reg" value="${v.regDate||today()}"></div>
    </div>
    <div class="form-group"><label>현황</label><select class="form-control" id="co-status">${statusOpts}</select></div>
  </div>`,
  `<button class="btn" onclick="closeModal()">취소</button>
   <button class="btn btn-primary" onclick="saveStartup('${id||''}')">저장</button>`);
}

function saveStartup(id) {
  const name = $('co-name')?.value?.trim();
  if (!name) { alert('기업명을 입력해주세요'); return; }
  const data = {name, founderId:$('co-founder')?.value, staff:$('co-staff')?.value, biz:$('co-biz')?.value, regDate:$('co-reg')?.value||today(), status:$('co-status')?.value||'초기운영'};
  const companies = DB.get('companies');
  if (id) { const idx=companies.findIndex(c=>c.id===id); if(idx>=0) companies[idx]={...companies[idx],...data}; }
  else companies.push({id:DB.id(),...data});
  DB.set('companies',companies);
  closeModal(); navigate('startup');
}
function editStartup(id) { openStartupModal(id); }
function deleteStartup(id) {
  if (!confirm('삭제하시겠습니까?')) return;
  DB.set('companies',DB.get('companies').filter(c=>c.id!==id));
  navigate('startup');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 기업 성장 지표 — 창업자 직접 연결
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderGrowth() {
  const founders  = DB.get('founders');
  const growths   = DB.get('growths');
  const companies = DB.get('companies');

  // 최신 연도 기준으로 창업자별 대표 지표 집계
  const latestByFounder = {};
  growths.forEach(g => {
    const key = g.founderId || g.companyId;
    if (!latestByFounder[key] || g.year > latestByFounder[key].year)
      latestByFounder[key] = g;
  });

  const totalRev = Object.values(latestByFounder).reduce((a,g)=>a+(Number(g.revenue)||0),0);
  const totalEmp = Object.values(latestByFounder).reduce((a,g)=>a+(Number(g.employees)||0),0);
  const totalInv = Object.values(latestByFounder).reduce((a,g)=>a+(Number(g.investment)||0),0);
  const trackCount = new Set(growths.map(g=>g.founderId||g.companyId)).size;

  // 성장 단계 계산
  function growthStage(g) {
    if (!g) return null;
    const rev = Number(g.revenue||0);
    const emp = Number(g.employees||0);
    const inv = Number(g.investment||0);
    if (inv > 0 || rev > 500) return {label:'스케일업', color:'var(--teal)', badge:'badge-teal'};
    if (rev > 200 || emp >= 5) return {label:'성장중',   color:'var(--accent)', badge:'badge-blue'};
    if (rev > 0   || emp > 0)  return {label:'초기운영', color:'var(--gold)',   badge:'badge-amber'};
    return {label:'데이터없음', color:'var(--gray3)', badge:'badge-gray'};
  }

  // 창업 완료(companies)된 창업자 + 성장지표 있는 창업자 목록
  const registeredFIds = new Set(companies.map(c=>c.founderId));
  const growthFIds     = new Set(growths.map(g=>g.founderId||g.companyId));
  const targetFIds     = new Set([...registeredFIds, ...growthFIds]);
  const targetFounders = founders.filter(f=>targetFIds.has(f.id));

  $('content').innerHTML = `
  <div class="stat-grid">
    <div class="stat-card stat-blue"><div class="stat-label">추적 기업 수</div><div class="stat-value">${trackCount}개</div><div class="stat-sub">창업 완료 ${companies.length}개사</div></div>
    <div class="stat-card stat-green"><div class="stat-label">총 매출 합산</div><div class="stat-value">${totalRev>=10000?(totalRev/10000).toFixed(1)+'억':(totalRev.toLocaleString())+'만'}</div><div class="stat-sub">최신 연도 기준</div></div>
    <div class="stat-card stat-teal"><div class="stat-label">총 고용 창출</div><div class="stat-value">${totalEmp}명</div></div>
    <div class="stat-card stat-orange"><div class="stat-label">총 투자 유치</div><div class="stat-value">${totalInv>=10000?(totalInv/10000).toFixed(1)+'억':(totalInv.toLocaleString())+'만'}</div></div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
    <div style="font-size:13px;color:var(--gray5)">창업자별 성장 현황 — 창업자 이름 클릭 시 상세 이력 확인</div>
    <button class="btn btn-primary" onclick="openGrowthModal()">+ 성장 지표 입력</button>
  </div>

  <div class="card">
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>창업자</th><th>유형</th><th>기업명</th><th>최근연도</th><th>매출(만원)</th><th>고용(명)</th><th>투자(만원)</th><th>성장 단계</th><th>성장 흐름</th><th>관리</th></tr></thead>
        <tbody>
          ${targetFounders.length===0
            ? `<tr><td colspan="10" style="text-align:center;color:var(--gray4);padding:32px">창업 완료 기업을 먼저 등록해주세요</td></tr>`
            : targetFounders.map(f=>{
                const co    = companies.find(c=>c.founderId===f.id);
                const fGrowths = growths.filter(g=>(g.founderId||g.companyId)===f.id||g.companyId===co?.id)
                                        .sort((a,b)=>a.year.localeCompare(b.year));
                const latest = fGrowths[fGrowths.length-1];
                const stage  = growthStage(latest);
                // 연도별 매출 미니 바
                const maxRev = Math.max(...fGrowths.map(g=>Number(g.revenue||0)),1);
                const miniBar = fGrowths.length>0
                  ? `<div style="display:flex;align-items:flex-end;gap:2px;height:20px">
                      ${fGrowths.slice(-4).map(g=>{
                        const h = Math.max(3, Math.round(Number(g.revenue||0)/maxRev*18));
                        return `<div title="${g.year}: ${Number(g.revenue||0).toLocaleString()}만원" style="width:8px;height:${h}px;background:var(--accent);border-radius:1px;opacity:.7"></div>`;
                      }).join('')}
                    </div>` : '<span style="color:var(--gray3);font-size:11px">-</span>';
                return `<tr>
                  <td>
                    <button style="background:none;border:none;padding:0;cursor:pointer;display:flex;align-items:center;gap:7px" onclick="viewFounderGrowth('${f.id}')">
                      ${avatarHtml(f.name)}
                      <span style="font-weight:600;color:var(--accent);text-decoration:underline;font-size:13px">${esc(f.name)}</span>
                    </button>
                  </td>
                  <td>${verdictBadge(f.verdict)}</td>
                  <td style="font-size:12px;color:var(--gray6)">${esc(co?.name||'-')}</td>
                  <td style="text-align:center;font-size:12px">${latest?.year||'-'}</td>
                  <td style="font-weight:600;color:var(--green)">${latest?Number(latest.revenue||0).toLocaleString():'-'}</td>
                  <td style="text-align:center">${latest?.employees||'-'}</td>
                  <td style="color:${Number(latest?.investment)>0?'var(--accent)':'var(--gray4)'}">${latest?Number(latest.investment||0).toLocaleString():'-'}</td>
                  <td>${stage?`<span class="badge ${stage.badge}">${stage.label}</span>`:'<span class="badge badge-gray">미입력</span>'}</td>
                  <td>${miniBar}</td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button class="btn btn-sm btn-primary" onclick="openGrowthModal('','${f.id}')">입력</button>
                      ${fGrowths.length>0?`<button class="btn btn-sm" onclick="viewFounderGrowth('${f.id}')">이력</button>`:''}
                    </div>
                  </td>
                </tr>`;
              }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function viewFounderGrowth(founderId) {
  const f         = DB.get('founders').find(x=>x.id===founderId);
  const companies = DB.get('companies');
  const co        = companies.find(c=>c.founderId===founderId);
  const growths   = DB.get('growths')
                    .filter(g=>g.founderId===founderId||g.companyId===co?.id)
                    .sort((a,b)=>a.year.localeCompare(b.year));
  const consults  = DB.get('consults').filter(c=>c.founderId===founderId);
  const supports  = DB.get('supports').filter(s=>s.founderId===founderId)
                    .sort((a,b)=>a.startDate.localeCompare(b.startDate));

  const journeySteps = [
    {label:'상담 접수', done: consults.length>0,  detail: consults.length>0?`${consults.length}회 상담`:'미진행'},
    {label:'지원사업',  done: supports.length>0,  detail: supports.length>0?`${supports.filter(s=>s.result==='선정').length}건 선정`:'없음'},
    {label:'창업 등록', done: !!co,                detail: co?co.regDate:'미등록'},
    {label:'성장 추적', done: growths.length>0,    detail: growths.length>0?`${growths.length}개 연도`:'미입력'},
  ];

  const maxRev = Math.max(...growths.map(g=>Number(g.revenue||0)),1);
  const supColors = ['#2E75B6','#1E5631','#8B6914','#17627A','#C55A11','#C00000'];

  openModal(`${f?.name} — 성장 여정`, `
  <div style="display:grid;gap:16px">

    <div style="display:flex;gap:8px">
      ${journeySteps.map((s,i)=>`
      <div style="flex:1;text-align:center;padding:10px 6px;border-radius:var(--radius);background:${s.done?'var(--gray1)':'#fff'};border:1px solid ${s.done?'var(--gray3)':'var(--gray2)'}">
        <div style="width:20px;height:20px;border-radius:50%;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;background:${s.done?'var(--accent)':'var(--gray2)'};color:${s.done?'#fff':'var(--gray4)'}">
          ${s.done?'✓':i+1}
        </div>
        <div style="font-size:11px;font-weight:600;color:${s.done?'var(--text)':'var(--gray4)'};">${s.label}</div>
        <div style="font-size:10px;color:var(--gray4);margin-top:2px">${s.detail}</div>
      </div>`).join('')}
    </div>

    ${growths.length>0 || supports.length>0 ? `
    <div style="background:var(--gray1);border-radius:var(--radius);padding:14px">
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:10px">매출 추이 + 지원사업 기간</div>

      <!-- 매출 막대 -->
      <div style="display:flex;align-items:flex-end;gap:6px;height:100px;margin-bottom:6px">
        ${growths.map(g=>{
          const h = Math.max(6, Math.round(Number(g.revenue||0)/maxRev*90));
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
            <div style="font-size:9px;color:var(--green);font-weight:600">${Number(g.revenue||0)>=10000?(Number(g.revenue)/10000).toFixed(1)+'억':Number(g.revenue||0).toLocaleString()+'만'}</div>
            <div title="${g.year}" style="width:100%;max-width:36px;height:${h}px;background:var(--accent);border-radius:2px 2px 0 0;opacity:.8"></div>
            <div style="font-size:9px;color:var(--gray5);font-weight:600">${g.year}</div>
          </div>`;
        }).join('')}
        ${growths.length===0?`<div style="color:var(--gray4);font-size:12px;align-self:center;padding:8px">성장 지표 없음</div>`:''}
      </div>

      <!-- 지원사업 기간 띠 -->
      ${supports.length>0?`
      <div style="border-top:1px solid var(--gray3);padding-top:8px">
        ${supports.map((s,i)=>`
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <div style="width:8px;height:8px;border-radius:1px;background:${supColors[i%supColors.length]};flex-shrink:0"></div>
          <span style="font-size:11px;font-weight:600;min-width:110px">${esc(s.program)}</span>
          <span style="font-size:10px;color:var(--gray5)">${s.startDate} ~ ${s.endDate||'진행중'}</span>
          ${s.amount?`<span style="font-size:10px;font-weight:700;color:var(--green);margin-left:auto">${Number(s.amount).toLocaleString()}만원</span>`:''}
        </div>`).join('')}
      </div>`:''}
    </div>` : ''}

    ${growths.length>0 ? `
    <div>
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:10px">연도별 성장 지표</div>
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="background:var(--gray1)">
              <th style="padding:7px 10px;text-align:left;border-bottom:1px solid var(--gray2)">연도</th>
              <th style="padding:7px 10px;text-align:right;border-bottom:1px solid var(--gray2)">매출(만원)</th>
              <th style="padding:7px 10px;text-align:center;border-bottom:1px solid var(--gray2)">고용(명)</th>
              <th style="padding:7px 10px;text-align:right;border-bottom:1px solid var(--gray2)">투자(만원)</th>
              <th style="padding:7px 10px;text-align:left;border-bottom:1px solid var(--gray2)">해당 연도 지원사업</th>
              <th style="padding:7px 10px;border-bottom:1px solid var(--gray2)"></th>
            </tr>
          </thead>
          <tbody>
            ${growths.map(g=>{
              // 해당 연도에 진행된 지원사업 찾기
              const activeSups = supports.filter(s=>{
                const sy = s.startDate?.slice(0,4);
                const ey = s.endDate?.slice(0,4)||String(new Date().getFullYear());
                return g.year >= sy && g.year <= ey;
              });
              return `<tr style="border-bottom:1px solid var(--gray2)">
                <td style="padding:8px 10px;font-weight:600">${g.year}</td>
                <td style="padding:8px 10px;text-align:right;font-weight:600;color:var(--green)">${Number(g.revenue||0).toLocaleString()}</td>
                <td style="padding:8px 10px;text-align:center">${g.employees}</td>
                <td style="padding:8px 10px;text-align:right;color:${Number(g.investment)>0?'var(--accent)':'var(--gray4)'}">${Number(g.investment||0).toLocaleString()}</td>
                <td style="padding:8px 10px">
                  ${activeSups.map(s=>`<span class="badge badge-teal" style="margin:1px;font-size:10px">${esc(s.program)}</span>`).join('')||'<span style="color:var(--gray3)">-</span>'}
                </td>
                <td style="padding:8px 10px">
                  <button class="btn btn-sm btn-danger" onclick="deleteGrowthFromModal('${g.id}','${founderId}')">삭제</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>` : `<div style="text-align:center;padding:20px;color:var(--gray4);background:var(--gray1);border-radius:var(--radius)">아직 입력된 성장 지표가 없습니다</div>`}

  </div>`,
  `<button class="btn" onclick="closeModal()">닫기</button>
   <button class="btn" onclick="closeModal();openSupportModal('','${founderId}')">+ 지원사업 추가</button>
   <button class="btn btn-primary" onclick="closeModal();openGrowthModal('','${founderId}')">+ 성장 지표 추가</button>`,
  true);
}

function deleteGrowthFromModal(gid, founderId) {
  if (!confirm('이 연도 데이터를 삭제하시겠습니까?')) return;
  DB.set('growths', DB.get('growths').filter(g=>g.id!==gid));
  closeModal();
  setTimeout(()=>viewFounderGrowth(founderId), 100);
}

function openGrowthModal(id, preFounderId) {
  const g = id ? DB.get('growths').find(x=>x.id===id) : null;
  const v = g || {};
  const founders  = DB.get('founders');
  const companies = DB.get('companies');

  // 창업 완료 창업자 + 이미 성장지표 있는 창업자 포함
  const growthFIds = new Set(DB.get('growths').map(g=>g.founderId||g.companyId));
  const compFIds   = new Set(companies.map(c=>c.founderId));
  const eligibleIds = new Set([...compFIds, ...growthFIds]);
  const eligible   = founders.filter(f=>eligibleIds.has(f.id)||preFounderId===f.id);
  const targetId   = v.founderId || preFounderId || '';

  const founderOpts = eligible.length > 0
    ? eligible.map(f=>`<option value="${f.id}"${targetId===f.id?' selected':''}>${f.name} (${f.biz||''})</option>`).join('')
    : founders.map(f=>`<option value="${f.id}"${targetId===f.id?' selected':''}>${f.name}</option>`).join('');

  openModal(id ? '성장 지표 수정' : '성장 지표 입력', `
  <div class="form-grid">
    <div class="form-group">
      <label>창업자 <span>*</span></label>
      <select class="form-control" id="g-founder"><option value="">선택</option>${founderOpts}</select>
      <div style="font-size:11px;color:var(--gray4);margin-top:3px">창업 등록된 창업자 또는 이미 지표가 있는 창업자 목록입니다</div>
    </div>
    <div class="form-group">
      <label>연도 <span>*</span></label>
      <input class="form-control" id="g-year" value="${v.year||new Date().getFullYear()}" placeholder="2026">
    </div>
    <div style="background:var(--gray1);border-radius:var(--radius);padding:14px">
      <div style="font-size:12px;font-weight:600;color:var(--gray6);margin-bottom:10px">성장 지표 입력</div>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label>매출 (만원)</label>
          <input class="form-control" type="number" id="g-rev" value="${v.revenue||''}" placeholder="0">
        </div>
        <div class="form-group">
          <label>고용 인원 (명)</label>
          <input class="form-control" type="number" id="g-emp" value="${v.employees||''}" placeholder="0">
        </div>
        <div class="form-group">
          <label>투자 유치 (만원)</label>
          <input class="form-control" type="number" id="g-inv" value="${v.investment||''}" placeholder="0">
        </div>
      </div>
    </div>
    <div class="form-group"><label>메모</label><textarea class="form-control" id="g-memo">${esc(v.memo||'')}</textarea></div>
  </div>`,
  `<button class="btn" onclick="closeModal()">취소</button>
   <button class="btn btn-primary" onclick="saveGrowth('${id||''}')">저장</button>`);
}

function saveGrowth(id) {
  const founderId = $('g-founder')?.value;
  const year = $('g-year')?.value?.trim();
  if (!founderId) { alert('창업자를 선택해주세요'); return; }
  if (!year)      { alert('연도를 입력해주세요'); return; }
  const data = {
    founderId, year,
    revenue:   $('g-rev')?.value||'0',
    employees: $('g-emp')?.value||'0',
    investment:$('g-inv')?.value||'0',
    memo:      $('g-memo')?.value
  };
  const growths = DB.get('growths');
  if (id) {
    const idx=growths.findIndex(g=>g.id===id);
    if(idx>=0) growths[idx]={...growths[idx],...data};
  } else {
    growths.push({id:DB.id(),...data});
  }
  DB.set('growths',growths);
  closeModal();
  navigate('growth');
}
function editGrowth(id) { openGrowthModal(id); }
function deleteGrowth(id) {
  if (!confirm('삭제하시겠습니까?')) return;
  DB.set('growths',DB.get('growths').filter(g=>g.id!==id));
  navigate('growth');
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 성과 보고
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderReport() {
  const founders      = DB.get('founders');
  const consults      = DB.get('consults');
  const supports      = DB.get('supports');
  const companies     = DB.get('companies');
  const selectedFirms = DB.get('selectedFirms');
  const growths       = DB.get('growths');
  const savedReports  = DB.get('savedReports') || [];

  // 사업별 목록
  const programs = [...new Set([
    ...supports.map(s=>s.program),
    ...selectedFirms.map(f=>f.program),
  ])].filter(Boolean).sort();

  const thisYear = String(new Date().getFullYear());

  $('content').innerHTML = `
  <div class="stat-grid">
    <div class="stat-card stat-blue"><div class="stat-label">전체 상담 접수</div><div class="stat-value">${founders.length}명</div></div>
    <div class="stat-card stat-green"><div class="stat-label">창업 완료</div><div class="stat-value">${companies.length + selectedFirms.length}개사</div></div>
    <div class="stat-card stat-teal"><div class="stat-label">지원사업 선정</div><div class="stat-value">${supports.filter(s=>s.result==='선정').length}건</div></div>
    <div class="stat-card stat-orange"><div class="stat-label">저장된 보고서</div><div class="stat-value">${savedReports.length}건</div><div class="stat-sub">연말 자동 저장</div></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

    <!-- 보고서 생성 패널 -->
    <div class="card">
      <div class="card-header"><span class="card-title">보고서 생성</span></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="form-group">
            <label>보고서 유형</label>
            <select class="form-control" id="rpt-type" onchange="updateReportPreview()">
              <option value="total">통합 성과보고서</option>
              <option value="program">사업별 성과보고서</option>
            </select>
          </div>
          <div class="form-group" id="rpt-program-wrap" style="display:none">
            <label>지원사업 선택</label>
            <select class="form-control" id="rpt-program" onchange="updateReportPreview()">
              <option value="">전체 사업</option>
              ${programs.map(p=>`<option value="${p}">${p}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>기준 연도</label>
            <select class="form-control" id="rpt-year" onchange="updateReportPreview()">
              ${[...new Set([...growths.map(g=>g.year), thisYear, String(Number(thisYear)-1), String(Number(thisYear)-2)])].sort().reverse().map(y=>`<option value="${y}"${y===thisYear?' selected':''}>${y}년</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn btn-primary" onclick="saveReportNow()">보고서 저장</button>
          <button class="btn" onclick="printReport()">인쇄</button>
        </div>
      </div>
    </div>

    <!-- 저장된 보고서 목록 -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">저장된 보고서</span>
        <button class="btn btn-sm" onclick="checkYearEndSave()">연말 자동저장 확인</button>
      </div>
      <div style="max-height:220px;overflow-y:auto">
        ${savedReports.length===0
          ? `<div style="text-align:center;color:var(--gray4);padding:24px;font-size:13px">저장된 보고서가 없습니다<br><span style="font-size:11px">연말(12월 31일)에 자동 저장됩니다</span></div>`
          : savedReports.slice().reverse().map((r,i)=>`
            <div style="display:flex;align-items:center;gap:8px;padding:9px 16px;border-bottom:1px solid var(--gray2)">
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500">${esc(r.title)}</div>
                <div style="font-size:11px;color:var(--gray4)">${esc(r.savedAt)}</div>
              </div>
              <button class="btn btn-sm" onclick="viewSavedReport(${savedReports.length-1-i})">보기</button>
              <button class="btn btn-sm btn-danger" onclick="deleteSavedReport(${savedReports.length-1-i})">삭제</button>
            </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- 보고서 미리보기 -->
  <div class="card">
    <div class="card-header">
      <span class="card-title" id="rpt-preview-title">보고서 미리보기</span>
    </div>
    <div class="card-body" id="rpt-preview" style="background:var(--gray1);border-radius:var(--radius);line-height:2;font-size:13px">
    </div>
  </div>`;

  // 보고서 유형 변경 시 사업 선택 표시/숨김
  $('rpt-type')?.addEventListener('change', function() {
    const wrap = $('rpt-program-wrap');
    if(wrap) wrap.style.display = this.value==='program' ? '' : 'none';
  });

  updateReportPreview();
}

function buildReportContent(type, program, year) {
  const founders      = DB.get('founders');
  const consults      = DB.get('consults');
  const supports      = DB.get('supports');
  const companies     = DB.get('companies');
  const selectedFirms = DB.get('selectedFirms');
  const growths       = DB.get('growths');

  if(type === 'program' && program) {
    // 사업별 보고서
    const progSupports = supports.filter(s=>s.program===program);
    const progFirms    = selectedFirms.filter(f=>f.program===program);
    const allFirms     = [...progFirms];
    const selected     = progSupports.filter(s=>s.result==='선정');
    const totalAmt     = [...selected,...progFirms].reduce((a,x)=>a+(Number(x.amount)||0),0);

    // 해당 사업 수혜 창업자 성장 지표 (해당 연도)
    const founderIds = new Set(progSupports.map(s=>s.founderId));
    const yearGrowths = growths.filter(g=>g.year===year && founderIds.has(g.founderId));
    const totalRev = yearGrowths.reduce((a,g)=>a+(Number(g.revenue)||0),0);
    const totalEmp = yearGrowths.reduce((a,g)=>a+(Number(g.employees)||0),0);

    return `<strong>[${year}년] ${program} 성과보고서</strong><br><br>
▪ 사업 참여 기업: <strong>${progSupports.length + progFirms.length}개사</strong><br>
▪ 선정 완료: <strong>${selected.length + progFirms.filter(f=>f.status!=='지원중').length}건</strong><br>
▪ 지원 총액: <strong>${totalAmt.toLocaleString()}만원</strong><br>
▪ 수혜 기업 매출 합산 (${year}년): <strong>${totalRev.toLocaleString()}만원</strong><br>
▪ 수혜 기업 고용 창출 (${year}년): <strong>${totalEmp}명</strong><br>
<br>
<strong>참여 기업 목록</strong><br>
${progSupports.length>0
  ? progSupports.map(s=>`  · ${founderName(s.founderId)} — ${s.startDate}~${s.endDate||'진행중'} (${s.amount?Number(s.amount).toLocaleString()+'만원':'미정'})`).join('<br>')
  : '  (없음)'}
${progFirms.length>0 ? '<br>' + progFirms.map(f=>`  · ${f.companyName} / ${f.ceo} — ${f.startDate}~${f.endDate||'진행중'} (${f.amount?Number(f.amount).toLocaleString()+'만원':'미정'})`).join('<br>') : ''}
<br>
<em style="color:var(--gray4)">생성일시: ${new Date().toLocaleString('ko-KR')}</em>`;

  } else {
    // 통합 성과보고서
    const tech   = founders.filter(f=>f.verdict?.includes('테크')).length;
    const local  = founders.filter(f=>f.verdict?.includes('로컬')).length;
    const hybrid = founders.filter(f=>f.verdict?.includes('혼합')).length;
    const totalSup    = supports.length;
    const selectedSup = supports.filter(s=>s.result==='선정').length;
    const selRate     = totalSup ? Math.round(selectedSup/totalSup*100) : 0;
    const totalAmt    = supports.filter(s=>s.result==='선정').reduce((a,s)=>a+(Number(s.amount)||0),0);
    const selAmt      = selectedFirms.reduce((a,f)=>a+(Number(f.amount)||0),0);
    const yearGrowths = growths.filter(g=>g.year===year);
    const totalRev    = yearGrowths.reduce((a,g)=>a+(Number(g.revenue)||0),0);
    const totalEmp    = yearGrowths.reduce((a,g)=>a+(Number(g.employees)||0),0);

    // 사업별 요약
    const allPrograms = [...new Set([...supports.map(s=>s.program),...selectedFirms.map(f=>f.program)])].filter(Boolean);
    const progSummary = allPrograms.map(p=>{
      const ps = supports.filter(s=>s.program===p&&s.result==='선정');
      const pf = selectedFirms.filter(f=>f.program===p);
      return `  · ${p}: ${ps.length+pf.length}개사 지원`;
    }).join('<br>');

    return `<strong>[${year}년] 울산경제일자리진흥원 창업지원 통합 성과보고서</strong><br><br>
<strong>1. 상담 현황</strong><br>
▪ 전체 창업 상담 접수: <strong>${founders.length}명</strong> (테크 ${tech}명, 로컬 ${local}명, 혼합형 ${hybrid}명)<br>
▪ 상담 진행: 총 <strong>${consults.length}건</strong> (완료 ${consults.filter(c=>c.status==='완료').length}건, 후속필요 ${consults.filter(c=>c.status==='후속필요').length}건)<br>
<br>
<strong>2. 지원사업 현황</strong><br>
▪ 지원사업 연계(상담경로): <strong>${totalSup}건</strong> · 선정 ${selectedSup}건 · 선정률 ${selRate}%<br>
▪ 선정기업 관리: <strong>${selectedFirms.length}개사</strong> · 지원금 ${selAmt.toLocaleString()}만원<br>
▪ 전체 지원금 합계: <strong>${(totalAmt+selAmt).toLocaleString()}만원</strong><br>
${progSummary ? '<br><strong>사업별 현황</strong><br>' + progSummary : ''}<br>
<br>
<strong>3. 창업 및 성장 현황 (${year}년 기준)</strong><br>
▪ 창업 완료: <strong>${companies.length + selectedFirms.filter(f=>f.status!=='지원중').length}개사</strong><br>
▪ 수혜 기업 매출 합산: <strong>${totalRev.toLocaleString()}만원</strong><br>
▪ 고용 창출: <strong>${totalEmp}명</strong><br>
<br>
<em style="color:var(--gray4)">생성일시: ${new Date().toLocaleString('ko-KR')}</em>`;
  }
}

function updateReportPreview() {
  const type    = $('rpt-type')?.value    || 'total';
  const program = $('rpt-program')?.value || '';
  const year    = $('rpt-year')?.value    || String(new Date().getFullYear());
  const preview = $('rpt-preview');
  const title   = $('rpt-preview-title');
  if(!preview) return;
  const content = buildReportContent(type, program, year);
  preview.innerHTML = content;
  if(title) title.textContent = type==='program' && program ? `${program} 성과보고서 미리보기` : `통합 성과보고서 미리보기 (${year}년)`;
}

function saveReportNow() {
  const type    = $('rpt-type')?.value    || 'total';
  const program = $('rpt-program')?.value || '';
  const year    = $('rpt-year')?.value    || String(new Date().getFullYear());
  const content = buildReportContent(type, program, year);
  const title   = type==='program' && program ? `[${year}] ${program} 성과보고서` : `[${year}] 통합 성과보고서`;
  const reports = DB.get('savedReports') || [];
  reports.push({ title, year, type, program, content, savedAt: new Date().toLocaleString('ko-KR') });
  DB.set('savedReports', reports);
  alert(`"${title}" 저장 완료!`);
  navigate('report');
}

function checkYearEndSave() {
  // 현재 연도 마지막 날인지 확인 (또는 수동으로 연말 기준 저장)
  const year = String(new Date().getFullYear());
  const reports = DB.get('savedReports') || [];
  const alreadySaved = reports.some(r=>r.year===year && r.type==='total' && r.title.includes('통합'));
  if(alreadySaved) {
    alert(`${year}년 통합 성과보고서가 이미 저장되어 있습니다.`);
    return;
  }
  if(confirm(`${year}년 통합 성과보고서를 지금 저장하시겠습니까?\n(연말 자동저장과 동일한 기능입니다)`)) {
    const content = buildReportContent('total','',year);
    const title   = `[${year}] 통합 성과보고서 (연말 저장)`;
    const reports2 = DB.get('savedReports') || [];
    reports2.push({title, year, type:'total', program:'', content, savedAt: new Date().toLocaleString('ko-KR')});
    DB.set('savedReports', reports2);
    alert('저장 완료!');
    navigate('report');
  }
}

function viewSavedReport(idx) {
  const reports = DB.get('savedReports') || [];
  const r = reports[idx];
  if(!r) return;
  openModal(r.title, `
  <div style="background:var(--gray1);border-radius:var(--radius);padding:16px;line-height:2;font-size:13px">
    ${r.content}
  </div>`,
  `<button class="btn" onclick="closeModal()">닫기</button>
   <button class="btn btn-primary" onclick="window.print()">인쇄</button>`, true);
}

function deleteSavedReport(idx) {
  if(!confirm('이 보고서를 삭제하시겠습니까?')) return;
  const reports = DB.get('savedReports') || [];
  reports.splice(idx,1);
  DB.set('savedReports', reports);
  navigate('report');
}

// 연말 자동저장 체크 (앱 시작 시)
function checkAutoYearEndSave() {
  const now   = new Date();
  const isYearEnd = now.getMonth()===11 && now.getDate()===31;
  if(!isYearEnd) return;
  const year  = String(now.getFullYear());
  const saved = DB.get('savedReports') || [];
  const alreadySaved = saved.some(r=>r.year===year&&r.type==='total'&&r.savedAt?.includes(year));
  if(!alreadySaved) {
    const content = buildReportContent('total','',year);
    saved.push({
      title: `[${year}] 통합 성과보고서 (연말 자동저장)`,
      year, type:'total', program:'', content,
      savedAt: now.toLocaleString('ko-KR')
    });
    DB.set('savedReports', saved);
    console.log(`${year}년 연말 자동저장 완료`);
  }
}

function printReport() { window.print(); }



// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 팀 설정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderSettings() {
  const s = cfg();
  $('content').innerHTML = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:900px">
    <div class="card">
      <div class="card-header">
        <span class="card-title">담당자 목록</span>
        <button class="btn btn-sm btn-primary" onclick="addStaff()">+ 추가</button>
      </div>
      <div class="card-body" id="staff-list">
        ${s.staff.filter(x=>x).map((name,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--gray2)">
          ${avatarHtml(name)}
          <span style="flex:1;font-size:13px">${esc(name)}</span>
          <button class="btn btn-sm btn-danger" onclick="removeStaff(${i})">삭제</button>
        </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">지원사업 목록</span>
        <button class="btn btn-sm btn-primary" onclick="addProgram()">+ 추가</button>
      </div>
      <div class="card-body" style="max-height:400px;overflow-y:auto">
        ${s.programs.map((p,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--gray2)">
          <span style="flex:1;font-size:13px">${esc(p)}</span>
          <button class="btn btn-sm btn-danger" onclick="removeProgram(${i})">삭제</button>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function addStaff() {
  const name = prompt('담당자 이름을 입력하세요');
  if (!name?.trim()) return;
  const s = DB.get('settings');
  s[0].staff.push(name.trim());
  DB.set('settings', s);
  navigate('settings');
}
function removeStaff(i) {
  if (!confirm('삭제하시겠습니까?')) return;
  const s = DB.get('settings');
  s[0].staff.splice(i,1);
  DB.set('settings',s);
  navigate('settings');
}
function addProgram() {
  const name = prompt('지원사업 이름을 입력하세요');
  if (!name?.trim()) return;
  const s = DB.get('settings');
  s[0].programs.push(name.trim());
  DB.set('settings',s);
  navigate('settings');
}
function removeProgram(i) {
  if (!confirm('삭제하시겠습니까?')) return;
  const s = DB.get('settings');
  s[0].programs.splice(i,1);
  DB.set('settings',s);
  navigate('settings');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 태블릿 UI — 사이드바 토글 · 퀵패널 · 데이터 백업
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function toggleSidebar() {
  const sb  = $('sidebar');
  const ov  = $('sidebar-overlay');
  const qp  = $('quick-panel');
  if (!sb) return;
  const isOpen = sb.classList.contains('open');
  sb.classList.toggle('open', !isOpen);
  if (ov) ov.classList.toggle('open', !isOpen);
  if (qp && !isOpen === false) qp.classList.remove('open');
}

function closeSidebar() {
  const sb = $('sidebar');
  const ov = $('sidebar-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
}

function toggleQuickPanel() {
  const qp = $('quick-panel');
  if (!qp) return;
  qp.classList.toggle('open');
  // 빠른 실행 탭 활성화 표시
  document.querySelectorAll('.bottom-tab').forEach(t=>t.classList.remove('active'));
  if (qp.classList.contains('open')) {
    document.querySelector('#btab-quick')?.classList.add('active');
  }
}

function closeQuickPanel() {
  const qp = $('quick-panel');
  if (qp) qp.classList.remove('open');
}

function setBottomTab(page) {
  closeQuickPanel();
  document.querySelectorAll('.bottom-tab').forEach(t=>t.classList.remove('active'));
  const btn = $(`btab-${page}`);
  if (btn) btn.classList.add('active');
}



// ── 데이터 백업 (내보내기) ─────────────────────────────
function exportData() {
  const keys = ['settings','founders','consults','supports','companies',
                'growths','selectedFirms','selectedNotes','experts',
                'mentorings','savedReports'];
  const backup = {
    _version: 'v9',
    _exportedAt: new Date().toLocaleString('ko-KR'),
    _org: '울산경제일자리진흥원 창업지원 통합관리 시스템',
  };
  keys.forEach(k => { backup[k] = DB.get(k); });

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0,10);
  a.href     = url;
  a.download = `창업지원_데이터백업_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // 백업 성공 알림
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--green);color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2)';
  toast.textContent = `✅ 백업 완료 — 창업지원_데이터백업_${date}.json`;
  document.body.appendChild(toast);
  setTimeout(()=>toast.remove(), 3000);
}

// ── 데이터 복원 (가져오기) ────────────────────────────
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);

      // 버전 및 구조 확인
      if (!data._exportedAt) {
        alert('올바른 백업 파일이 아닙니다.');
        return;
      }

      const confirmed = confirm(
        `백업 파일 정보\n` +
        `내보낸 날시: ${data._exportedAt}\n` +
        `버전: ${data._version||'알 수 없음'}\n\n` +
        `⚠️ 현재 데이터가 모두 백업 파일로 교체됩니다.\n계속하시겠습니까?`
      );
      if (!confirmed) return;

      // 데이터 복원
      const keys = ['settings','founders','consults','supports','companies',
                    'growths','selectedFirms','selectedNotes','experts',
                    'mentorings','savedReports'];
      keys.forEach(k => {
        if (data[k] !== undefined) DB.set(k, data[k]);
      });

      alert('✅ 데이터 복원 완료! 화면을 새로 고침합니다.');
      window.location.reload();
    } catch(err) {
      alert('파일 읽기 오류: ' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
  event.target.value = ''; // 같은 파일 재선택 가능하도록
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
$('today-date').textContent = new Date().toLocaleDateString('ko-KR', {year:'numeric',month:'long',day:'numeric',weekday:'short'});
initData();
checkAutoYearEndSave();
navigate('dashboard');
