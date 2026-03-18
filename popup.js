// ── Edge / 크로미움 호환 폴리필 ───────────────────────────────────────────────
// Element.prototype.closest — Edge 15+ OK, 구버전 대응
if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;
    do { if (el.matches(s)) return el; el = el.parentElement || el.parentNode; }
    while (el !== null && el.nodeType === 1);
    return null;
  };
}
// ──────────────────────────────────────────────────────────────────────────────

// PromptGenius popup.js v2.0
// 신규: 모델 선택, 프로바이더 가이드, 커스텀 범위, 엑셀 내보내기/가져오기, 생성 가이드

const CATEGORY_LABELS = {
  coding:'💻 코딩', writing:'✍️ 글쓰기', analysis:'🔍 분석',
  business:'💼 비즈니스', creative:'🎨 크리에이티브',
  education:'📚 교육', productivity:'⚡ 생산성', custom:'⭐ 커스텀',
};

const OLLAMA_MODELS = [
  { id:'qwen2.5:14b', label:'Qwen2.5 14B', note:'한국어 최고품질 (RAM 16GB+)' },
  { id:'qwen2.5:7b',  label:'Qwen2.5 7B',  note:'한국어 우수 · 빠름 (RAM 8GB+)' },
  { id:'qwen2.5:3b',  label:'Qwen2.5 3B',  note:'초경량 (RAM 4GB+)' },
  { id:'llama3.1:8b', label:'Llama 3.1 8B',note:'범용 영어/한국어 (RAM 8GB+)' },
  { id:'mistral:7b',  label:'Mistral 7B',  note:'지시 따르기 우수 (RAM 8GB+)' },
  { id:'gemma2:9b',   label:'Gemma2 9B',   note:'구조화 출력 우수 (RAM 10GB+)' },
  { id:'phi3.5:3.8b', label:'Phi-3.5 3.8B',note:'초경량 빠름 (RAM 4GB+)' },
  { id:'__custom__',  label:'직접 입력',   note:'' },
];

const CLAUDE_MODELS = [
  { id:'claude-opus-4-5',           label:'Claude Opus 4.5',   note:'최고 품질 · 느림' },
  { id:'claude-sonnet-4-5',         label:'Claude Sonnet 4.5', note:'균형 · 추천 ⭐' },
  { id:'claude-haiku-4-5-20251001', label:'Claude Haiku 4.5',  note:'빠름 · 저렴' },
];

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
      '① <a href="https://lmstudio.ai" target="_blank">lmstudio.ai</a> 에서 앱 설치 후 실행',
      '② 왼쪽 사이드바 🔍 → 모델 검색 (권장: <code>Qwen2.5-3B-Instruct</code>) → Q4_K_M 파일 다운로드',
      '③ 왼쪽 사이드바 ↔ 아이콘 → <strong>Local Server</strong> 탭 이동',
      '④ 상단 드롭다운에서 다운로드한 모델 선택 후 로드',
      '⑤ <strong>Allow CORS</strong> 토글 → <strong>반드시 ON</strong> (크롬 익스텐션 연결 필수)',
      '⑥ <strong>Start Server</strong> 버튼 클릭 → 포트 1234 확인',
      '⑦ 아래 서버 주소·모델 ID 입력 후 저장 → 🔌 연결 테스트',
    ],
    note:'🆓 완전 무료. CORS를 ON 하지 않으면 403 오류가 발생합니다.',
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

const CUSTOM_EXAMPLES = [
  { name:'Groq',       url:'https://api.groq.com/openai/v1/chat/completions',  model:'llama-3.1-8b-instant',                  needKey:true, free:true  },
  { name:'OpenRouter', url:'https://openrouter.ai/api/v1/chat/completions',    model:'meta-llama/llama-3.1-8b-instruct:free', needKey:true, free:true  },
  { name:'Together AI',url:'https://api.together.xyz/v1/chat/completions',     model:'meta-llama/Llama-3.1-8B-Instruct-Turbo',needKey:true, free:false },
  { name:'vLLM (로컬)',url:'http://localhost:8000/v1/chat/completions',         model:'default',                               needKey:false,free:true  },
];

// 무료 서비스 상세 가이드
const FREE_SERVICE_GUIDES = {
  groq: {
    name: 'Groq',
    badge: '완전 무료 · 매우 빠름',
    color: '#f55036',
    signup: 'https://console.groq.com',
    models: [
      { id:'llama-3.1-8b-instant',   label:'Llama 3.1 8B',   note:'빠름 · 한국어 양호' },
      { id:'llama-3.3-70b-versatile',label:'Llama 3.3 70B',  note:'고품질 · 느림' },
      { id:'gemma2-9b-it',           label:'Gemma2 9B',      note:'균형형' },
      { id:'qwen-qwq-32b',           label:'Qwen QwQ 32B',   note:'한국어 최고품질' },
    ],
    steps: [
      'console.groq.com 접속 → Sign Up (구글 계정 가능)',
      '이메일 인증 완료',
      '좌측 메뉴 API Keys → Create API Key → 키 복사',
      '아래 API 키 입력란에 붙여넣기 → 저장',
    ],
    limit: '분당 30 요청 / 하루 14,400 토큰 (무료)',
    desc: 'Meta Llama 모델을 전용 하드웨어(LPU)로 서빙해 응답 속도가 매우 빠릅니다. 무료 한도가 넉넉해 개인 사용에 충분합니다.',
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
    desc: '200개 이상의 AI 모델을 하나의 API로 사용할 수 있는 허브입니다. :free 붙은 모델은 완전 무료입니다.',
  },
};

const WORKFLOW_EXAMPLES = [
  { title:'💻 유튜브 링크 분석', raw:'유튜브에서 링크정보를 올리면 코드 중심적으로 방향성있는 답변을 듣고 싶어. 영상의 핵심 기술 내용과 구현 방법을 코드 예제와 함께 정리해줬으면 해.' },
  { title:'📝 회의록 요약',       raw:'1시간짜리 회의를 요약해야 하는데 항상 뭔가 빠뜨려요. 결정사항, 액션아이템, 담당자, 기한이 명확하게 정리된 구조적인 요약본이 필요합니다.' },
  { title:'🔍 코드 리뷰',         raw:'코드 리뷰를 받고 싶은데 리뷰어마다 기준이 달라서 불편해요. 성능, 가독성, 보안 측면에서 일관성 있게 체계적으로 검토받고 싶습니다.' },
  { title:'📊 데이터 분석',       raw:'CSV 데이터를 붙여넣으면 자동으로 인사이트를 뽑아주는 프롬프트가 필요해요. 주요 통계, 이상값, 트렌드를 보기 좋게 요약해줬으면 합니다.' },
];

// ─── 상태 ─────────────────────────────────────────────────────────────────────
let state = {
  view:'workflow', step:'listen',
  rawInput:'', templateSuggestion:'', finalPrompt:'',
  title:'', category:'productivity',
  isLoading:false, error:null,
  prompts:[], filterCat:'all',
  settings:{
    apiKey:'', providerType:'claude', claudeModel:'claude-sonnet-4-5',
    localBaseUrl:'http://localhost:11434', localModel:'qwen2.5:14b',
    customEndpoint:'', customApiKey:'', customModel:'',
  },
  copyId:null, testResult:null, testLoading:false,
  saveOk:null, saveError:null, apiKeyInput:'',
  showGuide:false, detectedModels:[], freeServiceTab:'groq',
  agentStep:'input', agentInput:'', agentAnalysis:null,
  lmsServerStatus:'idle',
  agentPrompts:[], agentError:null, agentGenProgress:0, patternKey:'RCTF', patternName:'', patternDesc:'', patternReason:'', keyPoints:[], osTab:'windows',
};

function sendMsg(type, payload) {
  return new Promise((resolve,reject) => {
    chrome.runtime.sendMessage({type,payload}, resp => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (resp && resp.success===false) return reject(new Error(resp.error||'오류 발생'));
      resolve(resp?.data ?? resp);
    });
  });
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── 렌더 ─────────────────────────────────────────────────────────────────────
function render() {
  document.getElementById('root').innerHTML =
    renderHeader() +
    (state.view==='workflow'?renderWorkflow():'') +
    (state.view==='agent'   ?renderAgent()   :'') +
    (state.view==='library' ?renderLibrary() :'') +
    (state.view==='settings'?renderSettings():'');
  bindEvents();
}

function renderHeader() {
  return `<header>
    <div class="logo"><span class="logo-icon">✦</span><span>PromptGenius</span></div>
    <nav>
      <button class="nav-btn ${state.view==='workflow'?'active':''}" data-view="workflow">생성</button>
      <button class="nav-btn ${state.view==='agent'   ?'active':''}" data-view="agent">🤖 에이전트</button>
      <button class="nav-btn ${state.view==='library' ?'active':''}" data-view="library">라이브러리</button>
      <button class="nav-btn ${state.view==='settings'?'active':''}" data-view="settings">설정</button>
    </nav>
  </header>`;
}

// ── WORKFLOW ──────────────────────────────────────────
function renderWorkflow() {
  const idx = ['listen','template','draft'].indexOf(state.step);
  const labels = ['청취','제안','탈고'];
  const pt = state.settings.providerType||'claude';
  const noKey = pt==='claude' && !state.settings.apiKey;
  return `<div class="view">
    <div class="stepper">
      ${labels.map((l,i)=>`
        <div class="step ${i<=idx?'active':''} ${i<idx?'done':''}">
          <div class="step-dot">${i<idx?'✓':i+1}</div><span>${l}</span>
          ${i<2?'<div class="step-line"></div>':''}
        </div>`).join('')}
    </div>
    ${noKey?`<div class="warn-box">⚙️ 먼저 <strong>설정</strong> 탭에서 AI 프로바이더를 설정해주세요.</div>`:''}
    ${state.error?`<div class="error-box">⚠️ ${escHtml(state.error)}</div>`:''}
    ${state.step==='listen'  ?renderListen()  :''}
    ${state.step==='template'?renderTemplate():''}
    ${state.step==='draft'   ?renderDraft()   :''}
  </div>`;
}

function renderListen() {
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <label class="field-label">불편사항 / 요구사항 입력</label>
      <button class="guide-toggle" id="btnToggleGuide">${state.showGuide?'▲ 닫기':'💡 사용 가이드'}</button>
    </div>
    ${state.showGuide?renderGuide():''}
    <textarea class="textarea" id="rawInput" rows="5"
      placeholder="예: 유튜브 링크를 올리면 코드 중심으로 핵심 내용을 정리해줬으면 해요."
    >${escHtml(state.rawInput)}</textarea>
    <div style="font-size:11px;color:var(--muted);text-align:right;margin-top:-4px">${state.rawInput.length}자</div>
    <button class="btn-primary" id="btnListen" ${state.isLoading?'disabled':''}>
      ${state.isLoading?'<span class="spinner"></span> AI가 분석 중...':'① 템플릿 제안 받기 →'}
    </button>
  </div>`;
}

function renderGuide() {
  return `<div class="guide-panel">
    <div class="guide-title">📖 3단계 사용법</div>
    <div class="guide-steps">
      <div class="guide-step"><div class="guide-num">1</div><div>
        <div class="guide-step-title">청취 — 요구사항을 자유롭게 적어주세요</div>
        <div class="guide-step-desc">어떤 답변이 필요한지, 무엇이 불편한지 자연어로 설명하세요.<br>
        형식 없이 편하게 써도 됩니다. AI가 알아서 분석합니다.</div>
      </div></div>
      <div class="guide-step"><div class="guide-num">2</div><div>
        <div class="guide-step-title">제안 — AI가 프롬프트 구조를 설계합니다</div>
        <div class="guide-step-desc">요구사항에 맞는 프롬프트 뼈대를 AI가 제안합니다.<br>
        제목·카테고리를 수정하고 내용도 직접 편집할 수 있습니다.</div>
      </div></div>
      <div class="guide-step"><div class="guide-num">3</div><div>
        <div class="guide-step-title">탈고 — 고품질 완성본으로 다듬습니다</div>
        <div class="guide-step-desc">역할 부여·출력 형식·예외 처리 등 프롬프트 엔지니어링 기법이<br>
        자동 적용된 완성본을 저장하거나 웹 입력란에 바로 삽입합니다.</div>
      </div></div>
    </div>
    <div class="guide-examples-title">✨ 예시로 바로 시작하기</div>
    <div class="guide-examples">
      ${WORKFLOW_EXAMPLES.map(ex=>`
        <button class="example-chip" data-example="${escHtml(ex.raw)}">${escHtml(ex.title)}</button>
      `).join('')}
    </div>
  </div>`;
}

function renderTemplate() {
  return `<div class="card">
    <div class="pattern-badge-row">
      <div class="pattern-badge">
        <span class="pattern-icon">📐</span>
        <div>
          <div class="pattern-badge-name">${escHtml(state.patternName||'Best Practice 패턴')}</div>
          <div class="pattern-badge-desc">${escHtml(state.patternDesc||'')}</div>
        </div>
      </div>
    </div>
    ${state.patternReason?`<div class="pattern-reason">💡 ${escHtml(state.patternReason)}</div>`:''}
    ${state.keyPoints&&state.keyPoints.length?`
    <div class="key-points">
      <div class="field-label" style="margin-bottom:4px">핵심 구성 요소</div>
      <div class="key-points-list">
        ${state.keyPoints.map(k=>`<span class="key-point-chip">✓ ${escHtml(k)}</span>`).join('')}
      </div>
    </div>`:''}
    <div class="field-row">
      <div><label class="field-label">제목</label>
        <input class="input" id="titleInput" value="${escHtml(state.title)}" placeholder="프롬프트 제목" />
      </div>
      <div><label class="field-label">카테고리</label>
        <select class="select" id="catSelect">
          ${Object.entries(CATEGORY_LABELS).map(([k,v])=>`<option value="${k}" ${state.category===k?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
    </div>
    <label class="field-label">베스트 프랙티스 템플릿 <span style="color:var(--muted);font-weight:400">([대괄호] 부분을 직접 수정하거나 탈고 버튼으로 AI가 채워줍니다)</span></label>
    <textarea class="textarea" id="templateArea" rows="10">${escHtml(state.templateSuggestion)}</textarea>
    <div class="btn-row">
      <button class="btn-ghost" id="btnBack1">← 처음으로</button>
      <button class="btn-primary" id="btnDraft" ${state.isLoading?'disabled':''}>
        ${state.isLoading?'<span class="spinner"></span> AI가 채우는 중...':'② [대괄호] AI로 완성 →'}
      </button>
    </div>
  </div>`;
}

function renderDraft() {
  return `<div class="card">
    <label class="field-label">완성된 프롬프트 <span style="color:var(--muted);font-weight:400">(최종 수정 가능)</span></label>
    <textarea class="textarea" id="finalArea" rows="10">${escHtml(state.finalPrompt)}</textarea>
    <div style="font-size:11px;color:var(--muted);text-align:right;margin-top:-4px">${state.finalPrompt.length}자</div>
    <div class="btn-row">
      <button class="btn-ghost" id="btnBack2">← 템플릿으로</button>
      <button class="btn-secondary" id="btnCopyDraft">${state.copyId==='draft'?'✓ 복사됨':'📋 복사'}</button>
      <button class="btn-primary" id="btnSave" ${state.isLoading?'disabled':''}>
        ${state.isLoading?'<span class="spinner"></span>':'💾 저장 →'}
      </button>
    </div>
  </div>`;
}

// ── LIBRARY ───────────────────────────────────────────
function renderLibrary() {
  const filtered = state.prompts.filter(p =>
    state.filterCat==='all'?true:state.filterCat==='favorites'?p.isFavorite:p.category===state.filterCat
  );
  return `<div class="view">
    <div class="filter-bar">
      ${['all','favorites',...Object.keys(CATEGORY_LABELS)].map(cat=>`
        <button class="filter-btn ${state.filterCat===cat?'active':''}" data-cat="${cat}">
          ${cat==='all'?'전체':cat==='favorites'?'⭐ 즐겨찾기':CATEGORY_LABELS[cat]}
        </button>`).join('')}
    </div>
    <div class="excel-bar">
      <span style="font-size:11px;color:var(--muted)">${state.prompts.length}개 저장됨 · 필터: ${filtered.length}개</span>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="act-btn" id="btnExcelDown">📥 내보내기</button>
        <label class="act-btn" style="cursor:pointer;margin:0">📤 가져오기
          <input type="file" id="excelUpload" accept=".csv" style="display:none">
        </label>
      </div>
    </div>
    ${filtered.length===0
      ?`<div class="empty">저장된 프롬프트가 없습니다.<br/>생성 탭에서 새 프롬프트를 만들어보세요!</div>`
      :`<div class="prompt-list">${filtered.map(p=>renderCard(p)).join('')}</div>`}
  </div>`;
}

function renderCard(p) {
  const date = new Date(p.createdAt).toLocaleDateString('ko-KR',{month:'short',day:'numeric'});
  return `<div class="prompt-card">
    <div class="prompt-header">
      <span class="cat-badge">${CATEGORY_LABELS[p.category]||p.category}</span>
      <span style="font-size:10px;color:var(--muted);flex:1;margin-left:6px">${date}</span>
      <button class="fav-btn ${p.isFavorite?'on':''}" data-fav="${p.id}">★</button>
    </div>
    <div class="prompt-title">${escHtml(p.title)}</div>
    <div class="prompt-preview">${escHtml((p.finalPrompt||'').slice(0,100))}...</div>
    <div class="prompt-actions">
      <span class="usage">사용 ${p.usageCount||0}회</span>
      <button class="act-btn" data-copy="${p.id}">${state.copyId===p.id?'✓':'📋'}</button>
      <button class="act-btn inject" data-inject="${p.id}">⚡ 삽입</button>
      <button class="act-btn del" data-del="${p.id}">🗑</button>
    </div>
  </div>`;
}

// ── SETTINGS ──────────────────────────────────────────
function renderSettings() {
  const pt = state.settings.providerType||'claude';
  const info = PROVIDER_INFO[pt];
  return `<div class="view">
    <div class="card">
      <label class="field-label">LLM 프로바이더</label>
      <div class="provider-grid">
        ${Object.entries(PROVIDER_INFO).map(([k,v])=>`
          <button class="provider-btn ${pt===k?'active':''}" data-provider="${k}">
            ${escHtml(v.title.split(' ').slice(0,2).join(' '))}
          </button>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="provider-guide-title">${info.title}</div>
      ${pt==='ollama' ? renderOllamaOsGuide() : `
      <ol class="provider-guide-steps">
        ${info.steps.map(s=>`<li>${s}</li>`).join('')}
      </ol>
      <div class="provider-note">${info.note}</div>
      `}
    </div>

    ${pt==='claude'   ?renderClaudeSettings()    :''}
    ${pt==='ollama'   ?renderOllamaSettings()    :''}
    ${(pt==='lmstudio'||pt==='jan'||pt==='llamacpp')?renderLocalSettings(pt):''}
    ${pt==='custom'   ?renderCustomSettings()    :''}

    <div class="card">
      <label class="field-label">응답 언어</label>
      <div class="lang-grid">
        ${[['ko','🇰🇷 한국어'],['en','🇺🇸 English'],['ja','🇯🇵 日本語'],['zh','🇨🇳 中文']].map(([k,v])=>`
          <button class="lang-btn ${(state.settings.language||'ko')===k?'active':''}" data-lang="${k}">${v}</button>
        `).join('')}
      </div>
      <p style="font-size:11px;color:var(--muted);margin-top:6px">
        AI가 생성하는 프롬프트의 언어를 선택합니다.<br>
        로컬 모델(Ollama 등) 사용 시 한국어 성능은 <strong>Qwen2.5</strong> 계열이 가장 우수합니다.
      </p>
    </div>

    <div class="btn-row">
      <button class="btn-ghost" id="btnTestConn" ${state.testLoading?'disabled':''}>
        ${state.testLoading?'<span class="spinner" style="border-top-color:var(--muted)"></span> 테스트 중...':'🔌 연결 테스트'}
      </button>
      <button class="btn-primary" id="btnSaveSettings">저장</button>
    </div>
    ${state.saveOk===true ?`<div class="test-result test-ok">✅ 설정이 저장되었습니다.</div>`:''}
    ${state.saveOk===false?`<div class="test-result test-fail">❌ ${escHtml(state.saveError||'')}</div>`:''}
    ${state.testResult?renderTestResult():''}
  </div>`;
}

function renderClaudeSettings() {
  return `<div class="card">
    <label class="field-label">API 키</label>
    <input class="input" id="apiKeyInput" type="password" placeholder="sk-ant-api03-..." value="${escHtml(state.apiKeyInput)}" />
    <label class="field-label" style="margin-top:10px">모델 선택</label>
    <div class="model-list">
      ${CLAUDE_MODELS.map(m=>`
        <label class="model-item ${state.settings.claudeModel===m.id?'active':''}">
          <input type="radio" name="claudeModel" value="${m.id}" ${state.settings.claudeModel===m.id?'checked':''} style="display:none">
          <span class="model-name">${m.label}</span>
          <span class="model-note">${m.note}</span>
        </label>`).join('')}
    </div>
  </div>`;
}

function renderOllamaSettings() {
  const cur = state.settings.localModel||'qwen2.5:14b';
  const knownIds = OLLAMA_MODELS.filter(m=>m.id!=='__custom__').map(m=>m.id);
  const isCustom = !knownIds.includes(cur);
  return `<div class="card">
    <label class="field-label">서버 주소</label>
    <input class="input" id="localBaseUrl" value="${escHtml(state.settings.localBaseUrl||'http://localhost:11434')}" placeholder="http://localhost:11434" />
    <label class="field-label" style="margin-top:10px">모델 선택</label>
    <div class="model-list">
      ${OLLAMA_MODELS.map(m=>{
        const active = m.id==='__custom__'?isCustom:cur===m.id;
        return `<label class="model-item ${active?'active':''}" data-pick-model="${m.id}">
          <input type="radio" name="ollamaModel" value="${m.id}" ${active?'checked':''} style="display:none">
          <span class="model-name">${m.label}</span>
          <span class="model-note">${m.note}</span>
        </label>`;
      }).join('')}
    </div>
    ${isCustom||cur==='__custom__'?`
    <label class="field-label" style="margin-top:8px">모델명 직접 입력</label>
    <input class="input" id="localModel" value="${escHtml(isCustom?cur:'')}" placeholder="예: llama3.2:3b, codellama:7b" />`:''}
    ${state.detectedModels.length>0?`
    <div class="detected-models">
      <div style="font-size:11px;color:var(--accent2);margin-bottom:4px">✓ 서버에 설치된 모델 (클릭하여 선택)</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${state.detectedModels.slice(0,8).map(m=>`<button class="detected-model-btn" data-set-model="${escHtml(m)}">${escHtml(m)}</button>`).join('')}
      </div>
    </div>`:''}
  </div>`;
}

// OS별 Ollama 상세 설치 가이드
function renderOllamaOsGuide() {
  const os = state.osTab || 'windows';
  const model = state.settings.localModel || 'qwen2.5:7b';

  const tabs = [
    { id:'windows', label:'🪟 Windows' },
    { id:'mac',     label:'🍎 macOS' },
    { id:'linux',   label:'🐧 Linux' },
  ];

  const content = {
    windows: {
      note: 'Windows 10/11 지원. 관리자 권한 불필요.',
      steps: [
        {
          title: '① Ollama 설치',
          desc:  'ollama.com/download 에서 Windows 설치 파일(.exe) 다운로드 후 실행',
          cmds:  [],
          link:  { url:'https://ollama.com/download/windows', label:'Ollama Windows 다운로드' },
        },
        {
          title: '② CORS 허용 환경변수 설정 (필수)',
          desc:  '시스템 속성 → 환경변수 → 사용자 변수에 아래 항목 추가',
          cmds:  [
            { label:'PowerShell에서 자동 설정 (권장)', cmd:'[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS","*","User")' },
            { label:'또는 cmd에서 설정', cmd:'setx OLLAMA_ORIGINS *' },
          ],
          note: '설정 후 시스템 트레이(우측 하단)에서 Ollama 아이콘 → Quit → 재시작 필요',
        },
        {
          title: '③ 모델 다운로드',
          desc:  '명령 프롬프트(cmd) 또는 PowerShell에서 실행',
          cmds:  [
            { label:'모델 다운로드', cmd:'ollama pull ' + model },
            { label:'설치 확인', cmd:'ollama list' },
          ],
        },
        {
          title: '④ 서비스 시작 확인',
          desc:  'Ollama는 설치 후 Windows 시작 시 자동 실행됩니다. 아래 명령으로 상태 확인',
          cmds:  [
            { label:'실행 상태 확인', cmd:'curl http://localhost:11434/api/tags' },
          ],
          note: '이미 실행 중이면 "ollama serve" 불필요. 포트 충돌 오류 = 정상 실행 중',
        },
      ],
    },
    mac: {
      note: 'macOS 12 이상 지원. Apple Silicon(M1~M4) 및 Intel 모두 지원.',
      steps: [
        {
          title: '① Ollama 설치',
          desc:  'ollama.com/download 에서 macOS 설치 파일(.dmg) 다운로드 후 설치',
          cmds:  [
            { label:'Homebrew로 설치 (터미널)', cmd:'brew install ollama' },
          ],
          link:  { url:'https://ollama.com/download/mac', label:'Ollama macOS 다운로드' },
        },
        {
          title: '② CORS 허용 후 서비스 시작',
          desc:  '터미널(Terminal 또는 iTerm2)에서 실행. 백그라운드로 유지됩니다.',
          cmds:  [
            { label:'CORS 허용 후 실행 (권장)', cmd:'OLLAMA_ORIGINS=* ollama serve' },
          ],
          note: '터미널 창을 닫으면 서버가 꺼집니다. 백그라운드 실행은 아래 launchd 방법 사용',
        },
        {
          title: '③ 백그라운드 상시 실행 (선택)',
          desc:  '시스템 시작 시 자동 실행. 아래 두 명령을 순서대로 실행',
          cmds:  [
            { label:'환경변수 등록', cmd:"launchctl setenv OLLAMA_ORIGINS '*'" },
            { label:'서비스 등록 (Homebrew)', cmd:'brew services start ollama' },
          ],
        },
        {
          title: '④ 모델 다운로드',
          desc:  '터미널에서 실행',
          cmds:  [
            { label:'모델 다운로드', cmd:'ollama pull ' + model },
            { label:'설치 확인', cmd:'ollama list' },
          ],
        },
      ],
    },
    linux: {
      note: 'Ubuntu 20.04+, Debian, Fedora, Arch 등 주요 배포판 지원.',
      steps: [
        {
          title: '① Ollama 설치',
          desc:  '터미널에서 공식 설치 스크립트 실행 (NVIDIA GPU 자동 감지)',
          cmds:  [
            { label:'공식 설치 스크립트', cmd:'curl -fsSL https://ollama.com/install.sh | sh' },
          ],
        },
        {
          title: '② CORS 허용 systemd 서비스 설정',
          desc:  'Ollama를 systemd 서비스로 등록하여 재부팅 후에도 자동 실행',
          cmds:  [
            { label:'① 서비스 설정 파일 편집', cmd:'sudo systemctl edit ollama' },
            { label:'② 파일에 아래 내용 붙여넣기', cmd:'[Service]\nEnvironment="OLLAMA_ORIGINS=*"' },
            { label:'③ 서비스 재시작', cmd:'sudo systemctl restart ollama' },
          ],
        },
        {
          title: '③ 또는 직접 실행 (간단 방법)',
          desc:  '서비스 설정 없이 터미널에서 바로 실행',
          cmds:  [
            { label:'CORS 허용 후 직접 실행', cmd:'OLLAMA_ORIGINS=* ollama serve' },
          ],
          note: '터미널 창을 닫으면 종료됩니다.',
        },
        {
          title: '④ 모델 다운로드',
          desc:  '새 터미널 탭에서 실행',
          cmds:  [
            { label:'모델 다운로드', cmd:'ollama pull ' + model },
            { label:'설치 확인', cmd:'ollama list' },
            { label:'실행 상태 확인', cmd:'systemctl status ollama' },
          ],
        },
      ],
    },
  };

  const c = content[os];

  return `
    <div class="os-tab-bar">
      ${tabs.map(t=>`
        <button class="os-tab ${os===t.id?'active':''}" data-os="${t.id}">${t.label}</button>
      `).join('')}
    </div>
    <div class="os-note">${c.note}</div>
    <div class="os-steps">
      ${c.steps.map((step, si) => `
        <div class="os-step">
          <div class="os-step-title">${step.title}</div>
          <div class="os-step-desc">${step.desc}</div>
          ${step.link ? `<a href="${step.link.url}" target="_blank" class="os-link">🔗 ${step.link.label}</a>` : ''}
          ${step.cmds.map((cmd, ci) => `
            <div class="cmd-block">
              <div class="cmd-label">${cmd.label}</div>
              <div class="cmd-row">
                <code class="cmd-code">${escHtml(cmd.cmd)}</code>
                <button class="cmd-copy" data-cmd="${escHtml(cmd.cmd)}" title="복사">📋</button>
              </div>
            </div>
          `).join('')}
          ${step.note ? `<div class="os-step-note">💡 ${step.note}</div>` : ''}
        </div>
      `).join('')}
    </div>
    <div class="provider-note">🆓 완전 무료. 모든 데이터가 내 컴퓨터에서만 처리됩니다.</div>
  `;
}

function renderLocalSettings(pt) {
  const defs = {lmstudio:'http://localhost:1234',jan:'http://localhost:1337',llamacpp:'http://localhost:8080'};
  const defUrl = state.settings.localBaseUrl || defs[pt];

  if (pt === 'lmstudio') {
    return renderLMStudioSettings(defUrl);
  }

  // Jan / llama.cpp — 기본 UI
  return `<div class="card">
    <label class="field-label">서버 주소</label>
    <input class="input" id="localBaseUrl" value="${escHtml(defUrl)}" placeholder="${defs[pt]}" />
    <label class="field-label" style="margin-top:8px">모델 ID (서버에 로드된 모델명)</label>
    <input class="input" id="localModel" value="${escHtml(state.settings.localModel||'')}" placeholder="예: Qwen2.5-14B-Instruct" />
  </div>`;
}

function renderLMStudioSettings(defUrl) {
  const serverOk = state.lmsServerStatus === 'ok';
  const serverFail = state.lmsServerStatus === 'fail';
  const serverChecking = state.lmsServerStatus === 'checking';

  return `<div class="card">

    <label class="field-label">📡 서버 상태 확인</label>
    <div class="lms-status-row">
      <div class="lms-status-dot ${serverOk?'ok':serverFail?'fail':serverChecking?'checking':'idle'}"></div>
      <span class="lms-status-text">
        ${serverOk     ? '✅ LM Studio 서버 실행 중 (포트 1234)' :
          serverFail   ? '❌ 서버 응답 없음 — LM Studio에서 서버를 시작해주세요' :
          serverChecking?'⏳ 확인 중...' :
                         '● 서버 상태 미확인 — 아래 버튼으로 확인'}
      </span>
      <button class="act-btn" id="btnCheckLMServer" ${serverChecking?'disabled':''}>
        ${serverChecking?'<span class="spinner" style="border-top-color:var(--muted)"></span>':'🔍 확인'}
      </button>
    </div>

    <div class="lms-guide-box">
      <div class="lms-guide-title">🖥️ LM Studio 서버 시작 방법</div>
      <div class="lms-guide-steps">
        <div class="lms-step"><span class="lms-step-num">1</span><span>LM Studio 앱 실행 → 왼쪽 사이드바 <strong>↔ 아이콘</strong> 클릭</span></div>
        <div class="lms-step"><span class="lms-step-num">2</span><span>상단 드롭다운에서 <strong>다운로드한 모델 선택</strong></span></div>
        <div class="lms-step"><span class="lms-step-num">3</span>
          <div>
            <span><strong>Allow CORS</strong> 토글 → <strong style="color:var(--accent2)">반드시 ON</strong></span>
            <div style="font-size:10px;color:var(--muted);margin-top:2px">OFF 상태에서는 403 오류 발생 — 크롬 익스텐션 연결 불가</div>
          </div>
        </div>
        <div class="lms-step"><span class="lms-step-num">4</span><span><strong>Start Server</strong> 버튼 클릭 → 상태가 Running으로 변경 확인</span></div>
      </div>

      <div class="lms-terminal-box">
        <div style="font-size:11px;color:var(--accent2);margin-bottom:4px">📋 서버 정상 시작 시 LM Studio 로그 (하단 로그 패널)</div>
        <div class="lms-terminal-line">[LMStudio] Server listening on http://127.0.0.1:1234</div>
        <div class="lms-terminal-line">[LMStudio] CORS: enabled</div>
        <div class="lms-terminal-line">[LMStudio] Model loaded: Qwen2.5-3B-Instruct-Q4_K_M</div>
        <div class="lms-terminal-line">[LMStudio] Ready to accept connections</div>
      </div>

      <div class="lms-terminal-box" style="margin-top:8px">
        <div style="font-size:11px;color:var(--accent2);margin-bottom:4px">🔍 윈도우 cmd에서 서버 동작 확인 (선택)</div>
        <div class="lms-terminal-line">curl http://localhost:1234/v1/models</div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">정상이면 모델 목록 JSON이 출력됩니다. "연결 실패"면 서버가 꺼진 상태입니다.</div>
      </div>
    </div>

    <label class="field-label" style="margin-top:10px">서버 주소</label>
    <input class="input" id="localBaseUrl" value="${escHtml(defUrl)}" placeholder="http://localhost:1234" />

    <label class="field-label" style="margin-top:8px">
      모델 ID
      <span style="font-size:10px;color:var(--muted);font-weight:400"> — LM Studio에 로드된 모델명을 그대로 입력</span>
    </label>
    <input class="input" id="localModel"
      value="${escHtml(state.settings.localModel||'')}"
      placeholder="예: Qwen2.5-3B-Instruct-Q4_K_M" />
    <div style="font-size:11px;color:var(--muted);margin-top:4px;line-height:1.6">
      💡 모델 ID 확인: LM Studio → Local Server 탭 → 로드된 모델명 복사<br>
      대소문자와 하이픈(-) 구분에 주의하세요.
    </div>

    <div class="lms-model-chips">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">자주 쓰는 모델 ID (클릭하여 자동 입력)</div>
      ${[
        'Qwen2.5-3B-Instruct-Q4_K_M',
        'Qwen2.5-7B-Instruct-Q4_K_M',
        'Qwen2.5-14B-Instruct-Q4_K_M',
        'Meta-Llama-3.1-8B-Instruct-Q4_K_M',
        'mistral-7b-instruct-v0.2.Q4_K_M',
      ].map(m=>`<button class="detected-model-btn" data-set-model="${escHtml(m)}">${escHtml(m)}</button>`).join('')}
    </div>
  </div>`;
}

function renderCustomSettings() {
  const selSvc = state.freeServiceTab || 'groq';
  const guide = FREE_SERVICE_GUIDES[selSvc];
  return `<div class="card">

    <label class="field-label">🆓 무료 서비스 가이드</label>
    <div class="free-svc-tabs">
      ${Object.entries(FREE_SERVICE_GUIDES).map(([k,v])=>`
        <button class="free-svc-tab ${selSvc===k?'active':''}" data-svc="${k}"
          style="${selSvc===k?'border-color:'+v.color+';color:'+v.color:''}">
          ${v.name}
          <span class="free-svc-badge" style="${selSvc===k?'background:'+v.color+'22;color:'+v.color:''}">${v.badge}</span>
        </button>`).join('')}
    </div>

    <div class="free-svc-desc">${guide.desc}</div>

    <div class="free-guide-steps">
      <div class="free-guide-title">📋 API 키 발급 방법</div>
      ${guide.steps.map((s,i)=>`
        <div class="free-guide-step">
          <span class="free-guide-num">${i+1}</span>
          <span>${s}</span>
        </div>`).join('')}
      <a class="free-signup-btn" href="${guide.signup}" target="_blank">
        🔗 ${guide.name} 가입 페이지 열기
      </a>
    </div>

    <div class="free-guide-title" style="margin-top:10px">⚡ 추천 모델 (클릭하여 선택)</div>
    <div class="model-list">
      ${guide.models.map(m=>`
        <label class="model-item ${state.settings.customModel===m.id?'active':''}"
          data-set-custom-model="${escHtml(m.id)}" data-set-custom-url="${escHtml(guide.signup.replace('console.','api.').replace('openrouter.ai','openrouter.ai/api/v1/chat/completions').replace('console.groq.com','api.groq.com/openai/v1/chat/completions'))}">
          <span class="model-name">${m.label}</span>
          <span class="model-note">${m.note}</span>
        </label>`).join('')}
    </div>

    <div class="free-limit-box">⏱ 무료 한도: ${guide.limit}</div>

    <div class="field-sep"></div>

    <label class="field-label">엔드포인트 URL</label>
    <input class="input" id="customEndpoint" value="${escHtml(state.settings.customEndpoint||'')}" placeholder="https://api.example.com/v1/chat/completions" />
    <label class="field-label" style="margin-top:8px">모델 ID</label>
    <input class="input" id="customModel" value="${escHtml(state.settings.customModel||'')}" placeholder="모델 이름" />
    <label class="field-label" style="margin-top:8px">API 키</label>
    <input class="input" id="customApiKey" type="password" value="${escHtml(state.settings.customApiKey||'')}" placeholder="발급받은 API 키 입력" />
  </div>`;
}

function renderTestResult() {
  const r = state.testResult;
  if (r.ok) {
    return `<div class="test-result test-ok">
      ✅ 연결 성공 ${r.latencyMs?`(${r.latencyMs}ms)`:''}
      ${r.warning?`<div style="margin-top:4px;font-size:11px;color:#c8941a">⚠️ ${escHtml(r.warning)}</div>`:''}
      ${r.models&&r.models.length?`
        <div style="margin-top:6px;font-size:11px">감지된 모델 (클릭하여 선택):</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
          ${r.models.slice(0,6).map(m=>`<button class="detected-model-btn" data-set-model="${escHtml(m)}">${escHtml(m)}</button>`).join('')}
        </div>`:''}
    </div>`;
  }
  // OOM / 메모리 부족 오류 (500)
  if (r.oom) {
    return `<div class="test-result test-fail">
      <div style="font-weight:600;margin-bottom:8px">⚠️ 모델이 너무 커서 실행할 수 없습니다</div>
      <div style="font-size:12px;line-height:1.8;margin-bottom:10px">
        Ollama 서버는 정상 실행 중입니다. ✓<br>
        현재 선택된 모델 <strong>"${escHtml(r.model||'')}"</strong>이 GPU/RAM 용량을 초과했습니다.<br>
        아래 모델 중 하나로 변경해주세요.
      </div>
      <div style="font-size:12px;font-weight:600;margin-bottom:6px">💡 VRAM/RAM별 추천 모델</div>
      <div class="oom-model-list">
        <div class="oom-model-row">
          <span class="oom-vram">VRAM 4GB</span>
          <span class="oom-model-name">qwen2.5:3b</span>
          <span class="oom-model-note">한국어 양호 · 빠름</span>
          <button class="detected-model-btn" data-set-model="qwen2.5:3b">선택</button>
        </div>
        <div class="oom-model-row">
          <span class="oom-vram">VRAM 6GB</span>
          <span class="oom-model-name">qwen2.5:7b-q4_0</span>
          <span class="oom-model-note">한국어 우수</span>
          <button class="detected-model-btn" data-set-model="qwen2.5:7b-q4_0">선택</button>
        </div>
        <div class="oom-model-row">
          <span class="oom-vram">VRAM 8GB</span>
          <span class="oom-model-name">qwen2.5:7b</span>
          <span class="oom-model-note">한국어 우수 · 추천</span>
          <button class="detected-model-btn" data-set-model="qwen2.5:7b">선택</button>
        </div>
        <div class="oom-model-row">
          <span class="oom-vram">RAM 전용</span>
          <span class="oom-model-name">qwen2.5:3b</span>
          <span class="oom-model-note">CPU만 사용 · 느림</span>
          <button class="detected-model-btn" data-set-model="qwen2.5:3b">선택</button>
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:8px;line-height:1.7">
        모델 선택 후 <strong>저장</strong> → <strong>🔌 연결 테스트</strong> 순서로 확인하세요.<br>
        새 모델은 처음 사용 시 자동 다운로드됩니다 (수 분 소요).
      </div>
    </div>`;
  }

  // CORS 오류 전용 안내
  if (r.cors) {
    return `<div class="test-result test-fail">
      <div style="font-weight:600;margin-bottom:8px">⚠️ 추가 설정이 한 가지 필요합니다</div>
      <div style="font-size:12px;line-height:1.8;margin-bottom:10px">
        Ollama는 정상 실행 중입니다. ✓<br>
        크롬 익스텐션과 통신하려면 <strong>설정 1회</strong>가 필요합니다.
      </div>
      <div class="cors-fix-box">
        <div class="cors-os-tab">
          <button class="cors-tab active" id="tabWin">Windows</button>
          <button class="cors-tab" id="tabMac">macOS / Linux</button>
        </div>
        <div id="corsWin">
          <div style="font-size:12px;font-weight:600;margin-bottom:6px">① 아래 명령어를 복사하세요</div>
          <div class="cors-code">setx OLLAMA_ORIGINS *</div>
          <button class="copy-cmd-btn" data-cmd="setx OLLAMA_ORIGINS *">📋 명령어 복사</button>
          <div style="font-size:12px;margin-top:10px;line-height:1.8">
            ② 윈도우 검색창에 <strong>cmd</strong> 입력<br>
            ③ <strong>관리자 권한으로 실행</strong> 클릭<br>
            ④ 복사한 명령어 붙여넣기 후 Enter<br>
            ⑤ Ollama를 <strong>완전히 종료 후 재시작</strong><br>
            &nbsp;&nbsp;&nbsp;(작업표시줄 오른쪽 끝 ^ 클릭 → Ollama 우클릭 → Quit)<br>
            ⑥ 이 화면에서 <strong>🔌 연결 테스트</strong> 다시 클릭
          </div>
        </div>
        <div id="corsMac" style="display:none">
          <div style="font-size:12px;font-weight:600;margin-bottom:6px">① 아래 명령어를 복사하세요</div>
          <div class="cors-code">OLLAMA_ORIGINS=* ollama serve</div>
          <button class="copy-cmd-btn" data-cmd="OLLAMA_ORIGINS=* ollama serve">📋 명령어 복사</button>
          <div style="font-size:12px;margin-top:10px;line-height:1.8">
            ② Ollama 앱 종료<br>
            ③ 터미널 앱 실행<br>
            ④ 복사한 명령어 붙여넣기 후 Enter<br>
            ⑤ 터미널 창을 <strong>열어둔 채로</strong> 이 화면에서<br>
            &nbsp;&nbsp;&nbsp;<strong>🔌 연결 테스트</strong> 다시 클릭
          </div>
        </div>
      </div>
    </div>`;
  }
  return `<div class="test-result test-fail">❌ ${escHtml(r.error||'연결 실패')}</div>`;
}

// ─── 이벤트 바인딩 ─────────────────────────────────────────────────────────────
function bindEvents() {
  // Edge 팝업 내 외부 링크 처리 — target=_blank는 Edge에서 새 탭 안 열릴 수 있음
  // chrome.tabs.create()로 직접 처리
  document.querySelectorAll('a[target="_blank"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      var url = a.getAttribute('href');
      if (url && url.startsWith('http')) {
        chrome.tabs.create({ url: url });
      }
    });
  });

  // 내비
  document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{
    state.view=btn.dataset.view; state.saveOk=null; state.saveError=null; state.testResult=null; render();
  }));

  // 에이전트 뷰 이벤트
  const agInput = document.getElementById('agentInput');
  if (agInput) agInput.addEventListener('input', function(e){ state.agentInput=e.target.value; });

  document.querySelectorAll('[data-agent-example]').forEach(function(btn){
    btn.addEventListener('click', function(){ state.agentInput=btn.dataset.agentExample; render(); });
  });

  const btnAnalyze = document.getElementById('btnAnalyzeAgent');
  if (btnAnalyze) btnAnalyze.addEventListener('click', handleAnalyzeAgent);

  const btnAgentBack = document.getElementById('btnAgentBack');
  if (btnAgentBack) btnAgentBack.addEventListener('click', function(){
    state.agentStep='input'; state.agentError=null; render();
  });

  const btnGoWf = document.getElementById('btnGoWorkflow');
  if (btnGoWf) btnGoWf.addEventListener('click', function(){
    state.rawInput = state.agentInput || '';
    state.view='workflow'; render();
  });

  const btnGenAgents = document.getElementById('btnGenerateAgents');
  if (btnGenAgents) btnGenAgents.addEventListener('click', handleGenerateAgents);

  const btnAgentReset = document.getElementById('btnAgentReset');
  if (btnAgentReset) btnAgentReset.addEventListener('click', function(){
    state.agentStep='input'; state.agentAnalysis=null;
    state.agentPrompts=[]; state.agentError=null; render();
  });

  const btnSaveAll = document.getElementById('btnSaveAllAgents');
  if (btnSaveAll) btnSaveAll.addEventListener('click', handleSaveAllAgents);

  document.querySelectorAll('[data-copy-agent]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var i = parseInt(btn.dataset.copyAgent);
      var p = state.agentPrompts[i];
      if (p) handleCopy(p.prompt, 'agent_' + i);
    });
  });

  document.querySelectorAll('[data-inject-agent]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var i = parseInt(btn.dataset.injectAgent);
      var p = state.agentPrompts[i];
      if (p) sendMsg('INJECT_PROMPT', { promptText: p.prompt }).catch(function(e){ alert(e.message); });
    });
  });

  // 필터
  document.querySelectorAll('[data-cat]').forEach(btn=>btn.addEventListener('click',()=>{state.filterCat=btn.dataset.cat;render();}));

  // 프로바이더
  document.querySelectorAll('[data-provider]').forEach(btn=>btn.addEventListener('click',()=>{
    state.settings.providerType=btn.dataset.provider; state.testResult=null; state.saveOk=null; render();
  }));

  // 가이드 토글
  const gt=document.getElementById('btnToggleGuide');
  if(gt) gt.addEventListener('click',()=>{state.showGuide=!state.showGuide;render();});

  // 예시 칩
  document.querySelectorAll('[data-example]').forEach(btn=>btn.addEventListener('click',()=>{
    state.rawInput=btn.dataset.example; state.showGuide=false; render();
  }));

  // 입력 동기
  const b=(id,fn)=>{const el=document.getElementById(id);if(el)el.addEventListener('input',fn);};
  b('rawInput',     e=>state.rawInput=e.target.value);
  b('templateArea', e=>state.templateSuggestion=e.target.value);
  b('finalArea',    e=>state.finalPrompt=e.target.value);
  b('titleInput',   e=>state.title=e.target.value);
  b('localBaseUrl', e=>state.settings.localBaseUrl=e.target.value);
  b('localModel',   e=>state.settings.localModel=e.target.value);
  b('customEndpoint',e=>state.settings.customEndpoint=e.target.value);
  b('customModel',  e=>state.settings.customModel=e.target.value);
  b('customApiKey', e=>state.settings.customApiKey=e.target.value);

  const cs=document.getElementById('catSelect');
  if(cs) cs.addEventListener('change',e=>state.category=e.target.value);
  const ak=document.getElementById('apiKeyInput');
  if(ak){
    ak.addEventListener('focus',()=>{if(state.apiKeyInput.startsWith('•')){state.apiKeyInput='';render();}});
    ak.addEventListener('input',e=>state.apiKeyInput=e.target.value);
  }

  // Claude 모델 라디오
  document.querySelectorAll('input[name="claudeModel"]').forEach(r=>
    r.addEventListener('change',e=>{state.settings.claudeModel=e.target.value;render();}));

  // Ollama 모델 선택
  document.querySelectorAll('[data-pick-model]').forEach(el=>el.addEventListener('click',()=>{
    const m=el.dataset.pickModel;
    if(m!=='__custom__') state.settings.localModel=m;
    else state.settings.localModel='__custom__';
    render();
  }));

  // 감지된 모델 / 테스트 결과에서 모델 선택
  document.querySelectorAll('[data-set-model]').forEach(btn=>btn.addEventListener('click',()=>{
    state.settings.localModel=btn.dataset.setModel; render();
  }));

  // 커스텀 예시
  document.querySelectorAll('[data-ex-url]').forEach(btn=>btn.addEventListener('click',()=>{
    state.settings.customEndpoint=btn.dataset.exUrl;
    state.settings.customModel=btn.dataset.exModel;
    render();
  }));

  // 워크플로우 버튼
  const on=(id,fn)=>{const el=document.getElementById(id);if(el)el.addEventListener('click',fn);};
  on('btnListen',   handleListen);
  on('btnDraft',    handleDraft);
  on('btnSave',     handleSave);
  on('btnBack1',    ()=>{state.step='listen';state.error=null;render();});
  on('btnBack2',    ()=>{state.step='template';render();});
  on('btnCopyDraft',()=>handleCopy(state.finalPrompt,'draft'));

  // 설정
  on('btnSaveSettings',handleSaveSettings);
  on('btnTestConn',    handleTestConn);

  // 라이브러리
  document.querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click',()=>{
    const p=state.prompts.find(x=>x.id===btn.dataset.copy);if(p)handleCopy(p.finalPrompt,p.id);
  }));
  document.querySelectorAll('[data-inject]').forEach(btn=>btn.addEventListener('click',()=>handleInject(btn.dataset.inject)));
  document.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click',()=>handleDelete(btn.dataset.del)));
  document.querySelectorAll('[data-fav]').forEach(btn=>btn.addEventListener('click',()=>handleFav(btn.dataset.fav)));

  // OS 탭 전환 (설치 가이드)
  document.querySelectorAll('[data-os]').forEach(btn =>
    btn.addEventListener('click', () => {
      state.osTab = btn.dataset.os;
      render();
    }));

  // 명령어 복사 (설치 가이드 + CORS 안내)
  document.querySelectorAll('[data-cmd]').forEach(btn =>
    btn.addEventListener('click', async () => {
      const cmd = btn.dataset.cmd;
      try {
        await navigator.clipboard.writeText(cmd);
        const orig = btn.innerHTML;
        btn.innerHTML = '✓';
        btn.style.color = 'var(--accent2)';
        setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 1500);
      } catch(e) {
        // clipboard API 실패 시 선택 방식 fallback
        const ta = document.createElement('textarea');
        ta.value = cmd; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        btn.innerHTML = '✓'; setTimeout(() => btn.innerHTML = '📋', 1500);
      }
    }));

  // 무료 서비스 탭
  document.querySelectorAll('[data-svc]').forEach(btn =>
    btn.addEventListener('click', () => {
      state.freeServiceTab = btn.dataset.svc;
      const guide = FREE_SERVICE_GUIDES[btn.dataset.svc];
      // 엔드포인트 자동 입력
      const urls = {
        groq:        'https://api.groq.com/openai/v1/chat/completions',
        openrouter:  'https://openrouter.ai/api/v1/chat/completions',
      };
      if (urls[btn.dataset.svc]) {
        state.settings.customEndpoint = urls[btn.dataset.svc];
        if (guide.models && guide.models.length) {
          state.settings.customModel = guide.models[0].id;
        }
      }
      render();
    }));

  // 커스텀 모델 선택 (무료 서비스 가이드에서)
  document.querySelectorAll('[data-set-custom-model]').forEach(el =>
    el.addEventListener('click', () => {
      state.settings.customModel = el.dataset.setCustomModel;
      render();
    }));

  // LM Studio 서버 확인 버튼
  const btnChk = document.getElementById('btnCheckLMServer');
  if (btnChk) btnChk.addEventListener('click', handleCheckLMServer);

  // 언어 선택
  document.querySelectorAll('[data-lang]').forEach(btn =>
    btn.addEventListener('click', () => {
      state.settings.language = btn.dataset.lang;
      render();
    }));

  // CORS 탭 전환 (테스트 결과)
  const tw = document.getElementById('tabWin');
  const tm = document.getElementById('tabMac');
  if (tw && tm) {
    tw.addEventListener('click', () => {
      document.getElementById('corsWin').style.display='';
      document.getElementById('corsMac').style.display='none';
      tw.classList.add('active'); tm.classList.remove('active');
    });
    tm.addEventListener('click', () => {
      document.getElementById('corsWin').style.display='none';
      document.getElementById('corsMac').style.display='';
      tw.classList.remove('active'); tm.classList.add('active');
    });
  }
  // 명령어 복사
  document.querySelectorAll('[data-cmd]').forEach(btn =>
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(btn.dataset.cmd);
      const orig = btn.textContent;
      btn.textContent = '✓ 복사됨';
      setTimeout(() => btn.textContent = orig, 1500);
    }));

  // 엑셀
  on('btnExcelDown',handleExcelExport);
  const up=document.getElementById('excelUpload');
  if(up) up.addEventListener('change',handleExcelImport);
}

// ─── 핸들러 ────────────────────────────────────────────────────────────────────
async function handleListen() {
  if(!state.rawInput.trim()){state.error='내용을 입력해주세요.';render();return;}
  state.isLoading=true;state.error=null;render();
  try {
    const r=await sendMsg('GENERATE_TEMPLATE',{rawInput:state.rawInput});
    state.templateSuggestion=r.templateSuggestion;
    state.title=r.suggestedTitle; state.category=r.suggestedCategory;
    state.patternKey=r.bestPattern||'RCTF'; state.patternName=r.patternName||''; state.patternDesc=r.patternDesc||''; state.patternReason=r.reason||''; state.keyPoints=r.keyPoints||[]; state.step='template';
  } catch(e){state.error=e.message;}
  state.isLoading=false;render();
}

async function handleDraft() {
  state.isLoading=true;state.error=null;render();
  try {
    const r=await sendMsg('GENERATE_DRAFT',{rawInput:state.rawInput,templateSuggestion:state.templateSuggestion,category:state.category,patternKey:state.patternKey||'RCTF'});
    state.finalPrompt=r.finalPrompt; state.step='draft';
  } catch(e){state.error=e.message;}
  state.isLoading=false;render();
}

// ── 에이전트 핸들러 ────────────────────────────────────────────────────────────
async function handleCheckLMServer() {
  state.lmsServerStatus = 'checking';
  render();
  try {
    const baseUrl = state.settings.localBaseUrl || 'http://localhost:1234';
    const r = await sendMsg('TEST_CONNECTION');
    state.lmsServerStatus = r.ok ? 'ok' : 'fail';
  } catch(e) {
    state.lmsServerStatus = 'fail';
  }
  render();
}

async function handleAnalyzeAgent() {
  if (!state.agentInput.trim()) {
    state.agentError = '요구사항을 입력해주세요.';
    render(); return;
  }
  state.agentStep = 'analyzing';
  state.agentError = null;
  render();
  try {
    var result = await sendMsg('ANALYZE_FOR_AGENT', { rawInput: state.agentInput });
    state.agentAnalysis = result;
    state.agentStep = 'confirm';
  } catch(e) {
    state.agentError = e.message;
    state.agentStep = 'input';
  }
  render();
}

async function handleGenerateAgents() {
  if (!state.agentAnalysis) return;
  var roles = state.agentAnalysis.suggestedRoles || [];
  if (!roles.length) return;

  state.agentStep = 'generating';
  state.agentGenProgress = 0;
  state.agentPrompts = [];
  state.agentError = null;
  render();

  try {
    // 역할별 순차 처리 — Service Worker 30초 제한 대응
    for (var i = 0; i < roles.length; i++) {
      state.agentGenProgress = i + 1;
      render(); // 진행 상황 업데이트
      var result = await sendMsg('GENERATE_AGENT_PROMPTS', {
        rawInput:   state.agentInput,
        analysis:   state.agentAnalysis,
        roleIndex:  i,  // 하나씩 처리
      });
      if (result && result.length > 0) {
        state.agentPrompts.push(result[0]);
      }
    }
    state.agentStep = 'result';
  } catch(e) {
    state.agentError = e.message;
    state.agentStep = 'confirm';
  }
  render();
}

async function handleSaveAllAgents() {
  if (!state.agentPrompts.length) return;
  var baseTitle = (state.agentAnalysis && state.agentAnalysis.suggestedRoles)
    ? state.agentInput.slice(0, 30)
    : '에이전트 패키지';

  for (var i = 0; i < state.agentPrompts.length; i++) {
    var ap = state.agentPrompts[i];
    var p = {
      id: 'pg_agent_' + Date.now() + '_' + i,
      title: '[Agent ' + (i+1) + '/' + state.agentPrompts.length + '] ' + ap.role + ' — ' + baseTitle,
      rawInput: state.agentInput,
      templateSuggestion: ap.desc,
      finalPrompt: ap.prompt,
      category: 'custom',
      tags: ['agent', ap.role.toLowerCase()],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
      isFavorite: false,
    };
    await sendMsg('SAVE_PROMPT', p);
  }
  state.prompts = await sendMsg('GET_PROMPTS');
  state.view = 'library';
  render();
  alert(state.agentPrompts.length + '개의 에이전트 프롬프트가 저장되었습니다.');
}


async function handleSave() {
  state.isLoading=true;render();
  const p={
    id:`pg_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    title:state.title||'제목 없음', rawInput:state.rawInput,
    templateSuggestion:state.templateSuggestion, finalPrompt:state.finalPrompt,
    category:state.category, tags:[], createdAt:Date.now(), updatedAt:Date.now(),
    usageCount:0, isFavorite:false,
  };
  try {
    await sendMsg('SAVE_PROMPT',p);
    state.prompts=await sendMsg('GET_PROMPTS');
    state.step='listen';state.rawInput='';state.templateSuggestion='';
    state.finalPrompt='';state.title='';state.view='library';
  } catch(e){state.error=e.message;}
  state.isLoading=false;render();
}

async function handleCopy(text, id) {
  var ok = false;

  // 방법 1: 익스텐션 팝업 전용 — offscreen document 없이 바로 clipboard API 호출
  // manifest에 clipboardWrite 권한 있으면 항상 동작
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch(e1) {
    // 방법 2: 선택(select) 후 복사 — clipboard API 실패 시
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      // 화면 밖에 위치하되 visible 상태 유지 (invisible이면 select 안 됨)
      ta.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;' +
        'padding:0;border:none;outline:none;box-shadow:none;background:transparent;opacity:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var copied = document.execCommand('copy');
      document.body.removeChild(ta);
      if (copied) ok = true;
    } catch(e2) {
      // 방법 3: background service worker를 통한 복사 (최후 수단)
      try {
        await sendMsg('COPY_TO_CLIPBOARD', { text: text });
        ok = true;
      } catch(e3) {
        console.warn('클립보드 복사 실패:', e1, e2, e3);
      }
    }
  }

  state.copyId = id;
  render();
  setTimeout(function() { state.copyId = null; render(); }, 1500);
}

async function handleInject(id) {
  const p=state.prompts.find(x=>x.id===id);if(!p)return;
  try {
    await sendMsg('INCREMENT_USAGE',{id});
    await sendMsg('INJECT_PROMPT',{promptText:p.finalPrompt});
    state.prompts=await sendMsg('GET_PROMPTS');render();
  } catch(e){alert('삽입 오류: '+e.message);}
}

async function handleDelete(id) {
  if(!confirm('이 프롬프트를 삭제할까요?'))return;
  await sendMsg('DELETE_PROMPT',{id});
  state.prompts=await sendMsg('GET_PROMPTS');render();
}

async function handleFav(id) {
  await sendMsg('TOGGLE_FAVORITE',{id});
  state.prompts=await sendMsg('GET_PROMPTS');render();
}

async function handleSaveSettings() {
  const payload={...state.settings};
  if(state.apiKeyInput&&!state.apiKeyInput.startsWith('•')) payload.apiKey=state.apiKeyInput;
  try {
    await sendMsg('SAVE_SETTINGS',payload);
    if(state.apiKeyInput&&!state.apiKeyInput.startsWith('•')) state.apiKeyInput='••••••••••••';
    state.saveOk=true;state.testResult=null;
  } catch(e){state.saveOk=false;state.saveError=e.message;}
  render();
}

async function handleTestConn() {
  const payload={...state.settings};
  if(state.apiKeyInput&&!state.apiKeyInput.startsWith('•')) payload.apiKey=state.apiKeyInput;
  try{await sendMsg('SAVE_SETTINGS',payload);}catch(e){}
  state.testResult=null;state.testLoading=true;render();
  try {
    const r=await sendMsg('TEST_CONNECTION');
    state.testResult=r;
    if(r.ok&&r.models) state.detectedModels=r.models;
  } catch(e){
    const msg=e.message.includes('Failed to fetch')
      ?'Ollama 서버가 실행되지 않았습니다.\n터미널에서 "ollama serve"를 실행해주세요.'
      :e.message;
    state.testResult={ok:false,error:msg};
  }
  state.testLoading=false;render();
}

// ── 엑셀 내보내기 (CSV + BOM, 외부 라이브러리 없음) ─────────────────────────
function handleExcelExport() {
  if(state.prompts.length===0){alert('저장된 프롬프트가 없습니다.');return;}
  const cols=['제목','카테고리','완성된 프롬프트','원본 요구사항','즐겨찾기','사용횟수','생성일'];
  const rows=state.prompts.map(p=>[
    p.title,
    CATEGORY_LABELS[p.category]||p.category,
    p.finalPrompt,
    p.rawInput,
    p.isFavorite?'예':'아니오',
    p.usageCount||0,
    new Date(p.createdAt).toLocaleDateString('ko-KR'),
  ]);
  const esc=v=>{const s=String(v==null?'':v).replace(/"/g,'""');return/[,"\n\r]/.test(s)?`"${s}"`:s;};
  const csv=[cols,...rows].map(r=>r.map(esc).join(',')).join('\r\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`PromptGenius_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── 엑셀 가져오기 (CSV 파싱) ────────────────────────────────────────────────
async function handleExcelImport(e) {
  const file=e.target.files[0];if(!file)return;
  e.target.value='';
  const text=await new Promise((res,rej)=>{
    const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;
    r.readAsText(file,'UTF-8');
  });
  const lines=text.replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n').filter(Boolean);
  if(lines.length<2){alert('올바른 CSV 파일이 아닙니다.');return;}
  const header=parseCSV(lines[0]);
  const tIdx=header.indexOf('제목'), pIdx=header.indexOf('완성된 프롬프트');
  const cIdx=header.indexOf('카테고리'), rIdx=header.indexOf('원본 요구사항');
  if(tIdx===-1||pIdx===-1){alert('PromptGenius에서 내보낸 CSV만 가져올 수 있습니다.\n(필수 열: 제목, 완성된 프롬프트)');return;}
  const catMap=Object.fromEntries(Object.entries(CATEGORY_LABELS).map(([k,v])=>[v,k]));
  let cnt=0;
  for(let i=1;i<lines.length;i++){
    const cells=parseCSV(lines[i]);
    if(!cells[tIdx]?.trim())continue;
    await sendMsg('SAVE_PROMPT',{
      id:`pg_import_${Date.now()}_${i}`,
      title:cells[tIdx]||'가져온 프롬프트',
      rawInput:rIdx>=0?cells[rIdx]||'':'',
      templateSuggestion:'',
      finalPrompt:cells[pIdx]||'',
      category:cIdx>=0?catMap[cells[cIdx]]||'custom':'custom',
      tags:[],createdAt:Date.now(),updatedAt:Date.now(),usageCount:0,isFavorite:false,
    });cnt++;
  }
  state.prompts=await sendMsg('GET_PROMPTS');render();
  alert(`${cnt}개의 프롬프트를 가져왔습니다.`);
}

function parseCSV(line) {
  const r=[];let cur='',inQ=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++;}else inQ=!inQ;}
    else if(c===','&&!inQ){r.push(cur);cur='';}
    else cur+=c;
  }
  r.push(cur);return r;
}

// ─── 초기화 ────────────────────────────────────────────────────────────────────
async function init() {
  try {
    state.settings=await sendMsg('GET_SETTINGS');
    if(state.settings.apiKey) state.apiKeyInput='••••••••••••';
    state.prompts=await sendMsg('GET_PROMPTS')||[];
  } catch(e){console.warn('초기화 오류:',e);}
  render();
}


// 에이전트 역할 아이콘 (popup용)
const AGENT_ROLE_TEMPLATES = {
  coding:   [{icon:'🏗️'},{icon:'💻'},{icon:'🔍'},{icon:'🧪'}],
  analysis: [{icon:'🔬'},{icon:'📊'},{icon:'⚖️'},{icon:'💡'}],
  writing:  [{icon:'📋'},{icon:'✍️'},{icon:'✂️'},{icon:'✅'}],
  business: [{icon:'🎯'},{icon:'🔍'},{icon:'⚡'},{icon:'📈'}],
  default:  [{icon:'🎭'},{icon:'🔧'},{icon:'🔨'},{icon:'✅'}],
};

// ══════════════════════════════════════════════════════════════════════════════
// 에이전트 뷰 렌더링
// ══════════════════════════════════════════════════════════════════════════════

function renderAgent() {
  const as = state.agentStep; // 'input' | 'analyzing' | 'confirm' | 'generating' | 'result'
  return '<div class="view">' +
    renderAgentProgress() +
    (state.agentError ? '<div class="error-box">⚠️ ' + escHtml(state.agentError) + '</div>' : '') +
    (as === 'input'      ? renderAgentInput()    : '') +
    (as === 'analyzing'  ? renderAgentLoading('요구사항 분석 중... 단일 vs 멀티 에이전트 판단') : '') +
    (as === 'confirm'    ? renderAgentConfirm()  : '') +
    (as === 'generating' ? renderAgentLoading('각 에이전트 프롬프트 생성 중... (' + state.agentGenProgress + '/' + (state.agentAnalysis && state.agentAnalysis.suggestedRoles ? state.agentAnalysis.suggestedRoles.length : '?') + ')') : '') +
    (as === 'result'     ? renderAgentResult()   : '') +
  '</div>';
}

function renderAgentProgress() {
  const steps = ['분석', '확인', '생성', '완료'];
  const idxMap = { input:0, analyzing:0, confirm:1, generating:2, result:3 };
  const idx = idxMap[state.agentStep] || 0;
  return '<div class="stepper">' +
    steps.map(function(l, i) {
      return '<div class="step ' + (i<=idx?'active ':'') + (i<idx?'done':'') + '">' +
        '<div class="step-dot">' + (i<idx?'✓':(i+1)) + '</div>' +
        '<span>' + l + '</span>' +
        (i<3?'<div class="step-line"></div>':'') +
      '</div>';
    }).join('') +
  '</div>';
}

function renderAgentInput() {
  return '<div class="card">' +
    '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<label class="field-label">요구사항 입력</label>' +
      '<span style="font-size:11px;color:var(--accent)">🤖 AI가 에이전트 필요 여부를 자동 판단합니다</span>' +
    '</div>' +
    '<textarea class="textarea" id="agentInput" rows="5" ' +
      'placeholder="예: 유튜브 영상을 분석해서 핵심 기술을 정리하고, 코드로 구현한 뒤 테스트까지 해줘&#10;예: 경쟁사 3곳을 조사하고 비교 분석해서 전략 보고서를 작성해줘">' +
      escHtml(state.agentInput || '') +
    '</textarea>' +
    '<div style="font-size:11px;color:var(--muted);text-align:right;margin-top:-4px">' + (state.agentInput||'').length + '자</div>' +
    '<div class="agent-examples">' +
      '<div class="field-label" style="margin-bottom:6px">💡 멀티 에이전트가 효과적인 예시</div>' +
      [
        { t:'🔬 리서치 + 분석 + 보고서', v:'경쟁사 3곳의 제품을 조사하고 장단점을 분석해서 우리 제품 개선을 위한 전략 보고서를 작성해줘' },
        { t:'💻 설계 + 구현 + 테스트',   v:'사용자 로그인 시스템을 설계하고, Node.js로 구현한 다음 단위 테스트 코드까지 작성해줘' },
        { t:'📝 기획 + 작성 + 검토',     v:'AI 스타트업 투자 제안서를 기획하고 작성한 뒤 투자자 관점에서 비판적으로 검토해줘' },
        { t:'📊 수집 + 분석 + 시각화',   v:'지난 1년간 AI 트렌드를 조사하고 핵심 인사이트를 분석해서 발표용 요약 자료를 만들어줘' },
      ].map(function(ex) {
        return '<button class="example-chip" data-agent-example="' + escHtml(ex.v) + '">' + ex.t + '</button>';
      }).join('') +
    '</div>' +
    '<button class="btn-primary" id="btnAnalyzeAgent">🤖 AI 분석 시작 →</button>' +
  '</div>';
}

function renderAgentLoading(msg) {
  var total = state.agentAnalysis && state.agentAnalysis.suggestedRoles
    ? state.agentAnalysis.suggestedRoles.length : 0;
  var cur = state.agentGenProgress || 0;
  var pct = total > 0 ? Math.round((cur / total) * 100) : 0;

  return '<div class="card" style="text-align:center;padding:28px 20px">' +
    '<div class="spinner large" style="margin:0 auto 12px"></div>' +
    '<div style="font-size:13px;color:var(--text);font-weight:600;margin-bottom:6px">' + escHtml(msg) + '</div>' +
    (total > 0 ? (
      '<div style="font-size:11px;color:var(--muted);margin-bottom:12px">Agent ' + cur + ' / ' + total + ' 처리 중</div>' +
      '<div style="background:var(--bg3);border-radius:20px;height:6px;overflow:hidden;margin:0 20px">' +
        '<div style="background:var(--accent);height:100%;border-radius:20px;width:' + pct + '%;transition:width .3s"></div>' +
      '</div>'
    ) : '') +
    '<div style="font-size:11px;color:var(--muted);margin-top:12px;line-height:1.7">' +
      '복잡한 요구사항일수록 시간이 걸릴 수 있습니다.<br>' +
      'JSON 파싱 실패 시 자동으로 재시도합니다.' +
    '</div>' +
  '</div>';
}

function renderAgentConfirm() {
  var a = state.agentAnalysis;
  if (!a) return '';

  if (!a.needsAgent) {
    return '<div class="card">' +
      '<div class="agent-single-notice">' +
        '<div style="font-size:15px;font-weight:600;margin-bottom:8px">✅ 단일 LLM으로 충분합니다</div>' +
        '<div style="font-size:12px;color:var(--muted);line-height:1.7">' + escHtml(a.reason || '') + '</div>' +
      '</div>' +
      '<div class="btn-row">' +
        '<button class="btn-ghost" id="btnAgentBack">← 다시 입력</button>' +
        '<button class="btn-primary" id="btnGoWorkflow">생성 탭에서 계속 →</button>' +
      '</div>' +
    '</div>';
  }

  var roles = a.suggestedRoles || [];
  var catTemplates = AGENT_ROLE_TEMPLATES[a.category] || AGENT_ROLE_TEMPLATES.default;

  return '<div class="card">' +
    '<div class="agent-confirm-header">' +
      '<div style="font-size:15px;font-weight:600">🤖 멀티 에이전트 구성 제안</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.6">' + escHtml(a.reason || '') + '</div>' +
    '</div>' +
    '<div class="agent-roles">' +
      roles.map(function(r, i) {
        var icon = catTemplates[i] ? catTemplates[i].icon : '🤖';
        return '<div class="agent-role-card">' +
          '<div class="agent-role-header">' +
            '<span class="agent-role-icon">' + icon + '</span>' +
            '<div>' +
              '<div class="agent-role-name">Agent ' + (i+1) + ': ' + escHtml(r.role) + '</div>' +
              '<div class="agent-role-desc">' + escHtml(r.desc) + '</div>' +
            '</div>' +
            '<span class="agent-role-num">' + (i+1) + '/' + roles.length + '</span>' +
          '</div>' +
          '<div class="agent-role-task">' + escHtml(r.task || '') + '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div class="agent-flow-hint">각 에이전트가 순서대로 작업을 이어받아 최종 결과물을 만듭니다.</div>' +
    '<div class="btn-row">' +
      '<button class="btn-ghost" id="btnAgentBack">← 다시 입력</button>' +
      '<button class="btn-primary" id="btnGenerateAgents">✨ 각 에이전트 프롬프트 생성 →</button>' +
    '</div>' +
  '</div>';
}

function renderAgentResult() {
  var prompts = state.agentPrompts || [];
  if (!prompts.length) return '<div class="empty">에이전트 프롬프트 생성 실패</div>';

  return '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<div class="agent-result-header">' +
      '<div style="font-size:14px;font-weight:600;color:var(--accent2)">✅ ' + prompts.length + '개 에이전트 프롬프트 완성</div>' +
      '<div style="font-size:11px;color:var(--muted);margin-top:2px">각 프롬프트를 순서대로 AI에게 사용하세요</div>' +
    '</div>' +
    prompts.map(function(p, i) {
      var copyId = 'agent_' + i;
      return '<div class="agent-result-card">' +
        '<div class="agent-result-header-row">' +
          '<span class="agent-result-icon">' + (p.icon||'🤖') + '</span>' +
          '<div style="flex:1">' +
            '<div class="agent-result-name">Agent ' + (i+1) + ': ' + escHtml(p.role) +
            (p.isFallback ? ' <span class="fallback-badge">자동생성</span>' : '') +
          '</div>' +
            '<div class="agent-result-desc">' + escHtml(p.desc) + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:4px">' +
            '<button class="act-btn" data-copy-agent="' + i + '">' + (state.copyId===copyId?'✓':'📋') + '</button>' +
            '<button class="act-btn inject" data-inject-agent="' + i + '">⚡ 삽입</button>' +
          '</div>' +
        '</div>' +
        (p.inputFormat ? '<div class="agent-io-row">📥 입력: <span>' + escHtml(p.inputFormat) + '</span></div>' : '') +
        '<div class="agent-prompt-preview">' + escHtml(p.prompt.slice(0, 200)) + (p.prompt.length > 200 ? '...' : '') + '</div>' +
        (p.outputFormat ? '<div class="agent-io-row">📤 출력: <span>' + escHtml(p.outputFormat) + '</span></div>' : '') +
      '</div>';
    }).join('') +
    '<div class="btn-row">' +
      '<button class="btn-ghost" id="btnAgentReset">← 새로 만들기</button>' +
      '<button class="btn-secondary" id="btnSaveAllAgents">💾 전체 저장</button>' +
    '</div>' +
  '</div>';
}


document.addEventListener('DOMContentLoaded',init);
