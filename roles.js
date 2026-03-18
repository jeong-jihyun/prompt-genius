// PromptGenius roles.js
// 역할 관련 모든 데이터를 중앙 관리하는 파일
// 이 파일만 수정하면 전체 앱의 역할/모델/프로바이더 설정이 반영됩니다.

// ──────────────────────────────────────────────────────────────────────────────
// 카테고리
// ──────────────────────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  coding:       '💻 코딩',
  writing:      '✍️ 글쓰기',
  analysis:     '🔍 분석',
  business:     '💼 비즈니스',
  creative:     '🎨 크리에이티브',
  education:    '📚 교육',
  productivity: '⚡ 생산성',
  custom:       '⭐ 커스텀',
};

// ──────────────────────────────────────────────────────────────────────────────
// 에이전트 역할 템플릿 (도메인별 기본 아이콘·설명 제공)
// ──────────────────────────────────────────────────────────────────────────────
const AGENT_ROLE_TEMPLATES = {
  coding: [
    { role: 'Architect',    desc: '전체 시스템 설계 및 기술 스택 결정',  icon: '🏗️' },
    { role: 'Developer',    desc: '핵심 기능 코드 구현',                  icon: '💻' },
    { role: 'Reviewer',     desc: '코드 품질·보안·성능 검토',             icon: '🔍' },
    { role: 'Tester',       desc: '테스트 케이스 작성 및 검증',           icon: '🧪' },
  ],
  analysis: [
    { role: 'Researcher',   desc: '데이터·자료 수집 및 조사',             icon: '🔬' },
    { role: 'Analyst',      desc: '데이터 분석 및 패턴 발견',             icon: '📊' },
    { role: 'Critic',       desc: '분석 결과 검증 및 반론 제시',          icon: '⚖️' },
    { role: 'Synthesizer',  desc: '최종 결론 및 인사이트 도출',           icon: '💡' },
  ],
  writing: [
    { role: 'Planner',      desc: '문서 구조·목차 기획',                  icon: '📋' },
    { role: 'Writer',       desc: '본문 작성',                            icon: '✍️' },
    { role: 'Editor',       desc: '문체·논리·가독성 개선',                icon: '✂️' },
    { role: 'Fact-Checker', desc: '사실 확인 및 정확성 검증',             icon: '✅' },
  ],
  business: [
    { role: 'Strategist',   desc: '전략 방향 및 목표 설정',              icon: '🎯' },
    { role: 'Researcher',   desc: '시장·경쟁사 조사',                    icon: '🔍' },
    { role: 'Executor',     desc: '실행 계획 수립',                       icon: '⚡' },
    { role: 'Evaluator',    desc: '리스크·기회 평가',                    icon: '📈' },
  ],
  default: [
    { role: 'Orchestrator', desc: '전체 작업 조율 및 최종 통합',         icon: '🎭' },
    { role: 'Specialist-A', desc: '1차 전문 작업 수행',                  icon: '🔧' },
    { role: 'Specialist-B', desc: '2차 전문 작업 수행',                  icon: '🔨' },
    { role: 'Validator',    desc: '결과물 검증 및 품질 확인',            icon: '✅' },
  ],
};

// ──────────────────────────────────────────────────────────────────────────────
// 에이전트 자동 감지 키워드
// ──────────────────────────────────────────────────────────────────────────────
const AGENT_TRIGGERS = [
  '분석하고', '분석 후', '작성하고', '검토하고', '검토 후',
  '코드 작성', '테스트', '리뷰', '배포', '기획하고',
  '조사하고', '정리하고', '번역하고', '요약하고',
  'research', 'analyze', 'review', 'implement', 'test',
  '단계별', '순서대로', '파이프라인', '워크플로우', '자동화',
  '여러', '다양한', '복합', '통합',
];

// ──────────────────────────────────────────────────────────────────────────────
// 프롬프트 패턴 (생성 탭 — 패턴 기반 템플릿)
// ──────────────────────────────────────────────────────────────────────────────
const PROMPT_PATTERNS = {
  RCTF: {
    name: 'Role-Context-Task-Format',
    desc: '역할 부여 + 맥락 + 작업 + 출력형식 — 범용 고품질 패턴',
    template: '당신은 [역할]입니다.\n\n## 배경 및 맥락\n[상황 설명]\n\n## 수행할 작업\n[구체적인 작업 내용]\n\n## 입력\n[사용자가 제공할 내용]\n\n## 출력 형식\n[원하는 결과물 형태]\n\n## 조건 및 제약\n- [조건1]\n- [조건2]',
  },
  COT: {
    name: 'Chain-of-Thought',
    desc: '단계적 사고 유도 — 분석·추론·문제해결에 최적',
    template: '당신은 [역할]입니다.\n\n## 작업\n[수행할 작업]\n\n## 입력\n[사용자 입력]\n\n## 사고 과정 (반드시 순서대로 수행)\n1단계: [첫 번째로 확인할 것]\n2단계: [두 번째로 분석할 것]\n3단계: [세 번째로 판단할 것]\n4단계: 최종 결론 도출\n\n## 출력\n각 단계의 근거를 포함하여 최종 답변을 작성하세요.',
  },
  FEW_SHOT: {
    name: 'Few-Shot Learning',
    desc: '예시를 보여주고 같은 패턴으로 수행 — 일관성이 중요할 때',
    template: '당신은 [역할]입니다.\n\n## 작업\n[수행할 작업]\n\n## 예시\n**입력:** [예시 입력1]\n**출력:** [예시 출력1]\n\n**입력:** [예시 입력2]\n**출력:** [예시 출력2]\n\n## 실제 수행\n**입력:** [실제 사용자 입력]\n**출력:**',
  },
  STRUCTURED: {
    name: 'Structured Output',
    desc: '특정 형식으로 출력 강제 — 데이터 추출·요약·정리에 최적',
    template: '당신은 [역할]입니다.\n\n## 작업\n아래 입력을 분석하여 지정된 형식으로 정리하세요.\n\n## 입력\n[사용자 입력]\n\n## 출력 형식 (반드시 이 구조로만 출력)\n**[항목1]:** [내용]\n**[항목2]:** [내용]\n**[항목3]:** [내용]\n**요약:** [전체 요약 1-2문장]\n\n## 주의사항\n- 형식 외 추가 설명 금지\n- 정보가 없는 항목은 "해당 없음"으로 표기',
  },
  ITERATIVE: {
    name: 'Iterative Refinement',
    desc: '초안 작성 → 자기 검토 → 개선 — 글쓰기·보고서에 최적',
    template: '당신은 [역할]입니다.\n\n## 작업\n[수행할 작업]\n\n## 입력\n[사용자 입력]\n\n## 수행 방식\n**1차 초안:** 먼저 초안을 작성하세요.\n\n**자기 검토:** 초안의 문제점을 스스로 찾으세요.\n- 빠진 내용이 있는가?\n- 더 명확하게 표현할 부분이 있는가?\n- 독자가 오해할 여지가 있는가?\n\n**최종본:** 검토 결과를 반영한 개선된 버전을 작성하세요.',
  },
  CONSTRAINT: {
    name: 'Constraint-First',
    desc: '제약 조건을 먼저 명시 — 코드 생성·특수 요구사항에 최적',
    template: '당신은 [역할]입니다.\n\n## 절대 조건 (반드시 준수)\n- [금지사항1]\n- [필수사항1]\n- [형식 제약]\n\n## 작업\n[수행할 작업]\n\n## 입력\n[사용자 입력]\n\n## 기대 결과\n[원하는 결과물 설명]',
  },
};

// 카테고리별 추천 패턴
const CATEGORY_PATTERN_MAP = {
  coding:       ['RCTF', 'CONSTRAINT', 'FEW_SHOT'],
  writing:      ['ITERATIVE', 'RCTF', 'FEW_SHOT'],
  analysis:     ['COT', 'STRUCTURED', 'RCTF'],
  business:     ['STRUCTURED', 'RCTF', 'COT'],
  creative:     ['RCTF', 'ITERATIVE', 'FEW_SHOT'],
  education:    ['COT', 'FEW_SHOT', 'RCTF'],
  productivity: ['STRUCTURED', 'CONSTRAINT', 'RCTF'],
  custom:       ['RCTF', 'COT', 'STRUCTURED'],
};

// ──────────────────────────────────────────────────────────────────────────────
// LLM 모델 목록
// ──────────────────────────────────────────────────────────────────────────────
const CLAUDE_MODELS = [
  { id:'claude-opus-4-5',           label:'Claude Opus 4.5',   note:'최고 품질 · 느림' },
  { id:'claude-sonnet-4-5',         label:'Claude Sonnet 4.5', note:'균형 · 추천 ⭐' },
  { id:'claude-haiku-4-5-20251001', label:'Claude Haiku 4.5',  note:'빠름 · 저렴' },
];

const OLLAMA_MODELS = [
  { id:'qwen2.5:14b',  label:'Qwen2.5 14B',  note:'한국어 최고품질 (RAM 16GB+)' },
  { id:'qwen2.5:7b',   label:'Qwen2.5 7B',   note:'한국어 우수 · 빠름 (RAM 8GB+)' },
  { id:'qwen2.5:3b',   label:'Qwen2.5 3B',   note:'초경량 (RAM 4GB+)' },
  { id:'llama3.1:8b',  label:'Llama 3.1 8B', note:'범용 영어/한국어 (RAM 8GB+)' },
  { id:'mistral:7b',   label:'Mistral 7B',   note:'지시 따르기 우수 (RAM 8GB+)' },
  { id:'gemma2:9b',    label:'Gemma2 9B',    note:'구조화 출력 우수 (RAM 10GB+)' },
  { id:'phi3.5:3.8b',  label:'Phi-3.5 3.8B', note:'초경량 빠름 (RAM 4GB+)' },
  { id:'__custom__',   label:'직접 입력',    note:'' },
];

// ──────────────────────────────────────────────────────────────────────────────
// 프로바이더 설정 가이드
// ──────────────────────────────────────────────────────────────────────────────
const PROVIDER_INFO = {
  claude: {
    title:'☁️ Claude API (Anthropic) 설정 방법',
    steps:[
      '① <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a> 접속 → 계정 생성/로그인',
      '② 좌측 메뉴 <strong>API Keys</strong> → <strong>Create Key</strong> → 생성된 키 복사',
      '③ 아래 <strong>API 키 입력란</strong>에 붙여넣기 후 저장',
      '④ 모델 선택 (기본 추천: Claude Sonnet 4.5)',
    ],
    note:'💳 사용량에 따라 비용 발생. 첫 가입 시 무료 크레딧 제공.',
  },
  ollama: {
    title:'🦙 Ollama (로컬 무료) 설정 방법',
    steps:[
      '① <a href="https://ollama.com/download" target="_blank">ollama.com/download</a> 에서 설치 (Windows/Mac/Linux)',
      '② 터미널(cmd/PowerShell) 열기 → <code>ollama serve</code> 입력 후 실행 유지',
      '③ 아래에서 모델 선택 (추천: Qwen2.5 7B)',
      '④ 저장 → 처음 사용 시 모델 자동 다운로드 (수 분 소요)',
    ],
    note:'🆓 완전 무료. 인터넷 없이도 사용 가능. 모든 데이터가 내 PC에서만 처리됩니다.',
  },
  lmstudio: {
    title:'🖥️ LM Studio (로컬 무료) 설정 방법',
    steps:[
      '① <a href="https://lmstudio.ai" target="_blank">lmstudio.ai</a> 에서 앱 설치',
      '② 앱 실행 → 검색탭에서 모델 다운로드 (예: Qwen2.5-14B-Instruct-GGUF)',
      '③ 상단 <strong>Local Server</strong> 탭 → <strong>Start Server</strong> 클릭',
      '④ 서버 주소 <code>http://localhost:1234</code> 확인 후 저장',
    ],
    note:'🆓 완전 무료. 드래그&드롭 GUI로 초보자도 쉽게 사용 가능.',
  },
  jan: {
    title:'📦 Jan (로컬 무료) 설정 방법',
    steps:[
      '① <a href="https://jan.ai" target="_blank">jan.ai</a> 에서 앱 설치',
      '② 앱 실행 → Hub 탭에서 원하는 모델 다운로드',
      '③ 좌측 ⚙️ Settings → Advanced → <strong>API Server</strong> 토글 ON',
      '④ 서버 주소 <code>http://localhost:1337</code> 확인 후 저장',
    ],
    note:'🆓 완전 무료. ChatGPT와 유사한 UI, 한 앱에서 모든 것 관리 가능.',
  },
  llamacpp: {
    title:'⚡ llama.cpp server (고급) 설정 방법',
    steps:[
      '① <a href="https://github.com/ggerganov/llama.cpp/releases" target="_blank">GitHub Releases</a>에서 바이너리 다운로드',
      '② Hugging Face에서 .gguf 모델 파일 다운로드',
      '③ 터미널에서 실행: <code>./llama-server -m model.gguf --port 8080</code>',
      '④ 서버 주소 <code>http://localhost:8080</code> 으로 설정 후 저장',
    ],
    note:'⚙️ 개발자용 고급 도구. GPU 직접 제어, 최고 성능 및 세밀한 설정 가능.',
  },
  custom: {
    title:'🔧 커스텀 엔드포인트 — 사용 가능 범위',
    steps:[
      '① <strong>OpenAI 호환 API</strong>(/v1/chat/completions)를 제공하는 모든 서비스 연결 가능',
      '② 로컬: vLLM, text-generation-webui, FastChat, Ollama(직접 주소 지정)',
      '③ 클라우드(유료): Together AI, Groq, OpenRouter, Fireworks, Perplexity API',
      '④ 엔드포인트 URL + 모델 ID + API 키(없으면 공란) 입력 후 저장',
    ],
    note:'🌐 OpenAI API 형식이면 로컬/클라우드 가리지 않고 모두 연결됩니다.',
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// 커스텀 서비스 빠른 설정 예시
// ──────────────────────────────────────────────────────────────────────────────
const CUSTOM_EXAMPLES = [
  { name:'Groq',       url:'https://api.groq.com/openai/v1/chat/completions',  model:'llama-3.1-8b-instant',                  needKey:true, free:true  },
  { name:'OpenRouter', url:'https://openrouter.ai/api/v1/chat/completions',    model:'meta-llama/llama-3.1-8b-instruct:free', needKey:true, free:true  },
  { name:'Together AI',url:'https://api.together.xyz/v1/chat/completions',     model:'meta-llama/Llama-3.1-8B-Instruct-Turbo',needKey:true, free:false },
  { name:'vLLM (로컬)',url:'http://localhost:8000/v1/chat/completions',         model:'default',                               needKey:false,free:true  },
];

// ──────────────────────────────────────────────────────────────────────────────
// 무료 서비스 상세 가이드
// ──────────────────────────────────────────────────────────────────────────────
const FREE_SERVICE_GUIDES = {
  groq: {
    name: 'Groq',
    badge: '완전 무료 · 매우 빠름',
    color: '#f55036',
    signup: 'https://console.groq.com',
    models: [
      { id:'llama-3.1-8b-instant',    label:'Llama 3.1 8B',   note:'빠름 · 한국어 양호' },
      { id:'llama-3.3-70b-versatile', label:'Llama 3.3 70B',  note:'고품질 · 느림' },
      { id:'gemma2-9b-it',            label:'Gemma2 9B',      note:'균형형' },
      { id:'qwen-qwq-32b',            label:'Qwen QwQ 32B',   note:'한국어 최고품질' },
    ],
    steps: [
      'console.groq.com 접속 → Sign Up (구글 계정 가능)',
      '이메일 인증 완료',
      '좌측 메뉴 API Keys → Create API Key → 키 복사',
      '아래 API 키 입력란에 붙여넣기 → 저장',
    ],
    limit: '분당 30 요청 / 하루 14,400 토큰 (무료)',
    desc: 'Meta Llama 모델을 전용 하드웨어(LPU)로 서빙해 응답 속도가 매우 빠릅니다.',
  },
  openrouter: {
    name: 'OpenRouter',
    badge: '무료 모델 다수',
    color: '#6366f1',
    signup: 'https://openrouter.ai',
    models: [
      { id:'meta-llama/llama-3.1-8b-instruct:free',  label:'Llama 3.1 8B (무료)',  note:'무료' },
      { id:'meta-llama/llama-3.2-3b-instruct:free',  label:'Llama 3.2 3B (무료)',  note:'무료 · 빠름' },
      { id:'google/gemma-3-12b-it:free',             label:'Gemma 3 12B (무료)',   note:'무료 · 고품질' },
      { id:'mistralai/mistral-7b-instruct:free',     label:'Mistral 7B (무료)',    note:'무료' },
      { id:'qwen/qwen-2.5-7b-instruct:free',         label:'Qwen2.5 7B (무료)',   note:'무료 · 한국어' },
    ],
    steps: [
      'openrouter.ai 접속 → Sign In (구글 계정 가능)',
      '우측 상단 프로필 → Keys → Create Key → 키 복사',
      '모델 ID 끝에 :free 가 붙은 것이 무료 모델',
      '아래 API 키 입력란에 붙여넣기 → 저장',
    ],
    limit: '무료 모델은 무제한 (단, 분당 20 요청)',
    desc: '200개 이상의 AI 모델을 하나의 API로 사용할 수 있는 허브입니다.',
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// 워크플로우 예시 (생성 탭 가이드)
// ──────────────────────────────────────────────────────────────────────────────
const WORKFLOW_EXAMPLES = [
  { title:'💻 유튜브 링크 분석', raw:'유튜브에서 링크정보를 올리면 코드 중심적으로 방향성있는 답변을 듣고 싶어. 영상의 핵심 기술 내용과 구현 방법을 코드 예제와 함께 정리해줬으면 해.' },
  { title:'📝 회의록 요약',      raw:'1시간짜리 회의를 요약해야 하는데 항상 뭔가 빠뜨려요. 결정사항, 액션아이템, 담당자, 기한이 명확하게 정리된 구조적인 요약본이 필요합니다.' },
  { title:'🔍 코드 리뷰',        raw:'코드 리뷰를 받고 싶은데 리뷰어마다 기준이 달라서 불편해요. 성능, 가독성, 보안 측면에서 일관성 있게 체계적으로 검토받고 싶습니다.' },
  { title:'📊 데이터 분석',      raw:'CSV 데이터를 붙여넣으면 자동으로 인사이트를 뽑아주는 프롬프트가 필요해요. 주요 통계, 이상값, 트렌드를 보기 좋게 요약해줬으면 합니다.' },
];

// ──────────────────────────────────────────────────────────────────────────────
// 베스트 프랙티스 진단 시스템 프롬프트
// ──────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────
// BP_RULES_SYSTEM — 에이전트 관계 연결 규칙 기반 진단 시스템 프롬프트
// 이 상수를 수정하면 진단/분석 결과 전체가 달라집니다.
// ──────────────────────────────────────────────────────────────────────────────
const BP_RULES_SYSTEM = [

  '반드시 JSON만 출력. 설명 텍스트 절대 금지.',
  '',

  // ══════════════════════════════════════════════════════════════════════════
  // 1. 에이전트 관계(from/to) 규칙
  // ══════════════════════════════════════════════════════════════════════════
  '[규칙1: 에이전트 관계 연결 — from/to]',
  '각 에이전트는 반드시 from(누구에게 받는가)과 to(누구에게 주는가)를 명시해야 한다.',
  '',
  'from 값:',
  '  "START"          → 파이프라인 시작점, 사용자/외부로부터 직접 입력 수신',
  '  "에이전트ID"     → 해당 에이전트의 출력을 입력으로 받음',
  '  ["ID1","ID2"]    → 여러 에이전트의 출력을 병합(Merge)하여 입력으로 받음',
  '',
  'to 값:',
  '  "END"            → 파이프라인 종료점, 최종 결과물을 외부/사용자에게 전달',
  '  "에이전트ID"     → 해당 에이전트에게 출력을 전달',
  '  ["ID1","ID2"]    → 여러 에이전트에게 동시에 병렬 전달(Parallel 분기)',
  '',
  '관계 연결 예시:',
  '  시장분석가: from=["START"],       to=["기획자"]           → 직렬',
  '  기획자:     from=["시장분석가"],  to=["팀장"]             → 직렬',
  '  팀장:       from=["기획자"],      to=["디자이너","개발팀"] → 병렬 분기',
  '  디자이너:   from=["팀장"],        to=["통합담당"]         → 직렬',
  '  개발팀:     from=["팀장"],        to=["통합담당"]         → 직렬',
  '  통합담당:   from=["디자이너","개발팀"], to=["END"]        → 병합(Merge)',
  '',

  // ══════════════════════════════════════════════════════════════════════════
  // 2. connections 구조 규칙
  // ══════════════════════════════════════════════════════════════════════════
  '[규칙2: connections 구조]',
  '각 에이전트의 connections 배열은 출력 경로를 정의한다.',
  '',
  'IF 노드 (조건 분기):',
  '  outputIndex 0 → true/승인 경로',
  '  outputIndex 1 → false/반려 경로',
  '  예: 팀장(검토) → 승인(0)→디자이너, 반려(1)→기획자(재작업)',
  '',
  'Switch 노드 (다중 분기):',
  '  outputIndex 0 → case 1',
  '  outputIndex 1 → case 2',
  '  outputIndex 2 → case 3 ...',
  '',
  'Loop 루프백:',
  '  조건확인 에이전트 → 미충족 시 이전 에이전트 ID로 되돌아감',
  '  패턴: 처리 → 검수 → (합격:END, 불합격:처리로 루프백)',
  '  connections: [{to:"처리에이전트", outputIndex:1, label:"불합격/재시도"}]',
  '',
  'Merge 병합:',
  '  여러 에이전트가 동일한 ID를 to로 가리킴',
  '  병합 에이전트의 from에 모든 입력 에이전트 ID를 나열',
  '',
  '⚠️ 금지: 모든 에이전트를 1:1 직렬(Serial)로만 연결하지 말 것',
  '',

  // ══════════════════════════════════════════════════════════════════════════
  // 3. 패턴 자동 감지 규칙
  // ══════════════════════════════════════════════════════════════════════════
  '[규칙3: 요구사항 패턴 자동 감지]',
  '"조건에 따라" / "승인되면" / "통과하면"  → IF 분기 적용',
  '"반려" / "재시도" / "검수 통과까지"       → Loop 루프백 적용',
  '"동시에" / "각각" / "병렬로"              → Parallel 분기 (to 배열)',
  '"합쳐서" / "통합하여" / "모아서"          → Merge 병합 (from 배열)',
  '"단계별" / "순서대로"                     → Serial 직렬 (기본, 단독 사용 금지)',
  '',

  // ══════════════════════════════════════════════════════════════════════════
  // 4. 데이터 참조 표기법
  // ══════════════════════════════════════════════════════════════════════════
  '[규칙4: 에이전트 간 데이터 참조 표기법]',
  '{{ $json.fieldName }}                      → 현재 에이전트 출력 필드',
  '{{ $node["에이전트명"].json.field }}       → 특정 에이전트 결과 참조',
  '{{ $items("에이전트명")[0].json.field }}   → 특정 에이전트 첫 번째 아이템',
  '{{ $now }}                                 → 현재 시간',
  '{{ $runIndex }}                            → 루프 반복 횟수 (Loop 패턴에서 사용)',
  '',

  // ══════════════════════════════════════════════════════════════════════════
  // 5. 출력 JSON 형식 (엄격 준수)
  // ══════════════════════════════════════════════════════════════════════════
  '[출력 JSON 형식 — 이 구조 그대로만 출력]',
  JSON.stringify({
    score: 75,
    agentType: 'multi',
    patterns: [
      { type: 'IF',       detected: true,  reason: '승인/반려 조건 분기 감지' },
      { type: 'Loop',     detected: true,  reason: '검수 미통과 시 재시도 루프 감지' },
      { type: 'Parallel', detected: true,  reason: '디자인/개발 동시 진행 감지' },
      { type: 'Merge',    detected: true,  reason: '최종 통합 병합 감지' },
      { type: 'Serial',   detected: false, reason: '직렬 전용 아님 — 복합 구조' },
    ],
    issues: [
      '기획자→팀장 연결이 직렬만으로 구성됨. 병렬 검토 추가 권장',
      '검수 단계에 루프백 연결 누락',
    ],
    suggestions: [
      '팀장 승인 후 디자이너/개발팀 병렬 분기 적용',
      '검수 실패 시 이전 단계로 루프백 연결 추가',
      '시장분석(3명) 결과를 Merge 후 기획자에게 전달',
    ],
    agents: [
      {
        id: 'a1', label: '시장분석가', role: 'process',
        from: ['START'], to: ['a2'],
        connections: [{ to: 'a2', outputIndex: 0, label: '분석결과' }],
        dataRef: '{{ $json.analysisReport }}',
      },
      {
        id: 'a2', label: '기획자', role: 'process',
        from: ['a1'], to: ['a3'],
        connections: [{ to: 'a3', outputIndex: 0, label: '기획안' }],
        dataRef: '{{ $node["시장분석가"].json.analysisReport }}',
      },
      {
        id: 'a3', label: '팀장', role: 'condition',
        from: ['a2'], to: ['a4', 'a2'],
        connections: [
          { to: 'a4', outputIndex: 0, label: '승인' },
          { to: 'a2', outputIndex: 1, label: '반려→재작업' },
        ],
        dataRef: '{{ $json.approvalStatus }}',
      },
      {
        id: 'a4', label: '디자이너', role: 'process',
        from: ['a3'], to: ['a6'],
        connections: [{ to: 'a6', outputIndex: 0, label: '디자인' }],
        dataRef: '{{ $node["팀장"].json.approvedPlan }}',
      },
      {
        id: 'a5', label: '개발팀', role: 'process',
        from: ['a3'], to: ['a6'],
        connections: [{ to: 'a6', outputIndex: 0, label: '개발결과' }],
        dataRef: '{{ $node["팀장"].json.approvedPlan }}',
      },
      {
        id: 'a6', label: '검수팀', role: 'condition',
        from: ['a4', 'a5'], to: ['END', 'a5'],
        connections: [
          { to: 'END', outputIndex: 0, label: '합격→출시' },
          { to: 'a5',  outputIndex: 1, label: '불합격→재개발' },
        ],
        dataRef: '{{ $runIndex }} 번째 검수',
      },
    ],
  }),

].join('\n');

// ──────────────────────────────────────────────────────────────────────────────
// Service Worker(background.js) 전용 — window 없는 환경에서도 사용 가능하도록
// 아래 조건부 export는 브라우저에서 무시됨
// ──────────────────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CATEGORY_LABELS, AGENT_ROLE_TEMPLATES, AGENT_TRIGGERS,
    PROMPT_PATTERNS, CATEGORY_PATTERN_MAP,
    CLAUDE_MODELS, OLLAMA_MODELS,
    PROVIDER_INFO, CUSTOM_EXAMPLES, FREE_SERVICE_GUIDES,
    WORKFLOW_EXAMPLES, BP_RULES_SYSTEM,
  };
}
