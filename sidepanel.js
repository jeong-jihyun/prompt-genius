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










// 무료 서비스 상세
// 무료 서비스 상세 가이드




// ─── 상태 ─────────────────────────────────────────────────────────────────────
let state = {
  view:'workflow', step:'listen',
  rawInput:'', templateSuggestion:'', finalPrompt:'',
  title:'', category:'productivity',
  isLoading:false, error:null,
  prompts:[], filterCat:'all',
  selectedAgentRoles:{},  // { index: true } — 에이전트 확인 단계 체크박스
  expandedGroups:{},  // { rawInputHash: true } — 그룹 펼침
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
  editingId: null,
  editingPrompt: '',
  editingTitle: '',
  editingRaw: '',
  diagnosing: null,
  diagResults: {},   // { promptId: diagResult } — 카드별 항시 표시
  diagResult: null,
  rerequesting: null,
  rerequestResults: {},  // { promptId: result } — 카드별 재요청 결과
  agentPrompts:[], agentError:null, agentGenProgress:0, agentCurrentRole:'', patternKey:'RCTF', patternName:'', patternDesc:'', patternReason:'', keyPoints:[], osTab:'windows',
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
var _saveTimer = null;
function render() {
  // 사이드패널: 헤더와 콘텐츠 분리 렌더링
  var spHeader = document.getElementById('sp-header');
  var root = document.getElementById('root');

  if (spHeader) {
    // 헤더는 sp-header에 고정 렌더링 (스크롤 영역 밖)
    spHeader.innerHTML = renderHeader();
  }

  if (root) {
    // 콘텐츠만 root에 렌더링 (스크롤 영역)
    root.innerHTML =
      (state.view==='workflow'?renderWorkflow():'') +
      (state.view==='agent'   ?renderAgent()   :'') +
      (state.view==='library' ?renderLibrary() :'') +
      (state.view==='settings'?renderSettings():'');
  }

  bindEvents();

  // 스크롤 위치 보존 (render 후 튀는 현상 방지)
  // 새 뷰 전환 시에만 맨 위로
  if (root && root._lastView !== state.view) {
    root.scrollTop = 0;
    root._lastView = state.view;
  }
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
// 원본 요구사항 해시 (그룹 키)
function groupKey(raw) {
  var s = (raw||'').trim().slice(0, 60);
  return s || '__no_raw__';
}

function renderLibrary() {
  const filtered = state.prompts.filter(p =>
    state.filterCat==='all'?true:state.filterCat==='favorites'?p.isFavorite:p.category===state.filterCat
  );

  // 원본 요구사항 기준으로 그룹화
  var groups = {};
  filtered.forEach(function(p) {
    var k = groupKey(p.rawInput);
    if (!groups[k]) groups[k] = { raw: p.rawInput||'', items:[] };
    groups[k].items.push(p);
  });

  return '<div class="view">' +
    '<div class="filter-bar">' +
    ['all','favorites',...Object.keys(CATEGORY_LABELS)].map(function(cat) {
      return '<button class="filter-btn ' + (state.filterCat===cat?'active':'') + '" data-cat="' + cat + '">' +
        (cat==='all'?'전체':cat==='favorites'?'⭐ 즐겨찾기':CATEGORY_LABELS[cat]) + '</button>';
    }).join('') +
    '</div>' +
    '<div class="excel-bar">' +
      '<span style="font-size:11px;color:var(--muted)">' + state.prompts.length + '개 저장됨</span>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        '<button class="act-btn" id="btnExcelDown">📥 내보내기</button>' +
        '<label class="act-btn" style="cursor:pointer;margin:0">📤 가져오기<input type="file" id="excelUpload" accept=".csv" style="display:none"></label>' +
      '</div>' +
    '</div>' +
    (filtered.length === 0
      ? '<div class="empty">저장된 프롬프트가 없습니다.</div>'
      : Object.keys(groups).map(function(k) {
          return renderGroup(k, groups[k]);
        }).join('')
    ) +
  '</div>';
}

function renderGroup(key, group) {
  var isExpanded = state.expandedGroups[key] !== false; // 기본 펼침
  var items = group.items;
  var rawPreview = (group.raw||'').slice(0, 50) || '원본 요구사항 없음';
  var hasMultiple = items.length > 1;

  return '<div class="prompt-group">' +
    // 그룹 헤더
    '<div class="group-header" data-group-toggle="' + escHtml(key) + '">' +
      '<span class="group-arrow">' + (isExpanded?'▼':'▶') + '</span>' +
      '<span class="group-title">' + escHtml(rawPreview) + (group.raw && group.raw.length > 50 ? '...' : '') + '</span>' +
      '<span class="group-count">' + items.length + '개</span>' +
    '</div>' +
    // 그룹 내 카드 목록
    (isExpanded
      ? '<div class="group-body">' + items.map(function(p){ return renderCard(p); }).join('') + '</div>'
      : '') +
  '</div>';
}

function renderCard(p) {
  const date = new Date(p.createdAt).toLocaleDateString('ko-KR',{month:'short',day:'numeric'});
  const isEditing   = state.editingId === p.id;
  const isDiagnosing= state.diagnosing === p.id;
  const diagResult  = state.diagResults[p.id] || null;
  const hideActions = isEditing; // 편집 중엔 액션 버튼 숨김

  return `<div class="prompt-card ${isEditing?'editing':''}">
    <div class="prompt-header">
      <span class="cat-badge" style="margin-left:6px">${CATEGORY_LABELS[p.category]||p.category}</span>
      <span style="font-size:10px;color:var(--muted);flex:1;margin-left:6px">${date}</span>
      <button class="fav-btn ${p.isFavorite?'on':''}" data-fav="${p.id}">★</button>
    </div>
    <div class="prompt-title">${escHtml(p.title)}</div>

    ${isEditing ? `
    <div class="edit-panel">
      <label class="field-label">제목</label>
      <input class="input edit-title" data-edit-id="${p.id}" value="${escHtml(state.editingTitle||p.title)}" />
      <label class="field-label" style="margin-top:8px">프롬프트 수정</label>
      <textarea class="textarea edit-prompt" data-edit-id="${p.id}" rows="6">${escHtml(state.editingPrompt||p.finalPrompt||'')}</textarea>
      <label class="field-label" style="margin-top:8px">원본 요구사항</label>
      <textarea class="textarea edit-raw" data-edit-id="${p.id}" rows="3">${escHtml(state.editingRaw||p.rawInput||'')}</textarea>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn-ghost" data-cancel-edit="${p.id}">취소</button>
        <button class="act-btn" data-rerequest="${p.id}" ${state.rerequesting===p.id?'disabled':''}>
          ${state.rerequesting===p.id
            ?'<span class="spinner" style="width:12px;height:12px;border-width:2px"></span> 분석 중...'
            :(state.rerequestResults[p.id]?'🔄 재분석':'🔄 재요청')}
        </button>
        <button class="btn-primary" data-save-edit="${p.id}">💾 저장</button>
      </div>
      ${state.rerequestResults[p.id] ? `
      <div class="rerequest-result">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span class="field-label">🔄 재요청 결과</span>
          <button class="act-btn" style="font-size:10px" data-clear-rr="${p.id}">✕ 닫기</button>
        </div>
        ${renderRerequestResult(state.rerequestResults[p.id])}
        ${renderRerequestAgents(state.rerequestResults[p.id], p.id)}
      </div>` : ''}
    </div>` : `
    <div class="prompt-preview">${escHtml((p.finalPrompt||'').slice(0,100))}...</div>`}

    ${diagResult ? renderDiagResult(diagResult) : ''}

    ${!hideActions ? `
    <div class="prompt-actions">
      <span class="usage">사용 ${p.usageCount||0}회</span>
      <button class="act-btn" data-copy="${p.id}" title="복사">${state.copyId===p.id?'✓':'📋'}</button>
      <button class="act-btn inject" data-inject="${p.id}" title="삽입">⚡</button>
      <button class="act-btn edit-btn" data-edit="${p.id}" title="수정 (클릭시 다른 버튼 숨김)">✏️</button>
      <button class="act-btn diag-btn" data-diagnose="${p.id}"
        title="${diagResult?'재진단':'베스트 프랙티스 진단'}"
        ${isDiagnosing?'disabled':''}>
        ${isDiagnosing
          ?'<span class="spinner" style="width:12px;height:12px;border-width:2px"></span>'
          :(diagResult?'🔄':'📊')}
      </button>
      <button class="act-btn" data-del="${p.id}" title="삭제"
        style="color:var(--danger);font-size:11px;font-weight:600">삭제</button>
    </div>` : `
    <div class="prompt-actions">
      <span style="font-size:11px;color:var(--accent)">✏️ 수정 중</span>
      <button class="btn-ghost" style="font-size:11px;padding:3px 8px" data-cancel-edit="${p.id}">✕ 취소</button>
    </div>`}
  </div>`;
}

function renderRerequestResult(res) {
  if (!res) return '';
  if (res.needsAgent) {
    var roles = (res.suggestedRoles||[]);
    return '<div style="font-size:12px;color:var(--accent);font-weight:600;margin-bottom:4px">🤖 멀티 에이전트 권장</div>' +
      '<div style="font-size:11px;color:var(--muted);margin-bottom:6px">' + escHtml(res.reason||'') + '</div>' +
      '<div style="font-size:11px;color:var(--text);margin-bottom:4px">제안 에이전트 (' + roles.length + '개)</div>' +
      roles.map(function(r, i) {
        return '<div style="font-size:11px;padding:4px 8px;background:rgba(127,119,221,.08);border-radius:5px;margin-bottom:3px">' +
          '<span style="color:var(--accent)">Agent ' + (i+1) + ': ' + escHtml(r.role) + '</span>' +
          '<div style="color:var(--muted);margin-top:1px">' + escHtml(r.desc||'') + '</div>' +
          (r.task ? '<div style="color:var(--muted);font-size:10px;margin-top:1px">↳ ' + escHtml(r.task) + '</div>' : '') +
          '</div>';
      }).join('');
  }
  return '<div style="font-size:12px;color:var(--accent2);font-weight:600">✅ 단일 LLM으로 충분</div>' +
    '<div style="font-size:11px;color:var(--muted);margin-top:4px">' + escHtml(res.reason||'') + '</div>';
}

function renderRerequestAgents(res, promptId) {
  if (!res || !res.needsAgent || !res.suggestedRoles || !res.suggestedRoles.length) return '';
  return '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">' +
    '<button class="btn-primary" style="width:100%;font-size:11px" data-goto-agent="' + promptId + '">' +
      '🤖 이 구성으로 에이전트 탭에서 프롬프트 생성하기 →' +
    '</button></div>';
}

function renderDiagResult(res) {
  if (!res) return '';
  var score = res.score || 0;
  var scoreColor = score >= 80 ? 'var(--accent2)' : score >= 50 ? 'var(--warn)' : 'var(--danger)';
  var patterns = res.patterns || [];
  var issues = res.issues || [];
  var suggestions = res.suggestions || [];

  return `<div class="diag-panel">
    <div class="diag-header">
      <span class="field-label">📊 베스트 프랙티스 진단</span>
      <span class="diag-score" style="color:${scoreColor}">${score}점</span>
    </div>

    <div class="diag-patterns">
      ${patterns.map(pt => `
        <span class="diag-badge ${pt.detected?'detected':'missing'}" title="${escHtml(pt.reason||'')}">
          ${pt.detected?'✓':'○'} ${escHtml(pt.type)}
        </span>`).join('')}
    </div>

    ${issues.length ? `
    <div class="diag-issues">
      <div class="field-label" style="margin-bottom:4px">발견된 문제</div>
      ${issues.map(i=>`<div class="diag-issue">⚠️ ${escHtml(i)}</div>`).join('')}
    </div>` : ''}

    ${suggestions.length ? `
    <div class="diag-suggestions">
      <div class="field-label" style="margin-bottom:4px">개선 제안</div>
      ${suggestions.map(s=>`<div class="diag-suggest">💡 ${escHtml(s)}</div>`).join('')}
    </div>` : ''}

    ${(res.agents && res.agents.length) ? renderDiagDiagram(res.agents) : (res.nodes && res.nodes.length ? renderDiagDiagram(res.nodes) : '')}


  </div>`;
}

function renderDiagDiagram(nodes) {
  if (!nodes || !nodes.length) return '';

  var TYPE_COLOR = {
    start: '#5DCAA5', end: '#5DCAA5',
    condition: '#EF9F27', merge: '#A78BFA', process: '#7F77DD',
  };
  var NODE_W = 120, NODE_H = 36, PAD_X = 30, PAD_Y = 44;

  // id/label 양쪽으로 nodeMap 구성
  var nodeMap = {};
  nodes.forEach(function(n) {
    n.id = n.id || n.label || ('a' + Math.random());
    nodeMap[n.id]    = n;
    if (n.label) nodeMap[n.label] = n;
  });

  // from/to 기반 레벨 할당
  var levels = {}; var visited = {};
  function assignLevel(id, lv) {
    var n = nodeMap[id];
    if (!n || visited[n.id]) return;
    visited[n.id] = true;
    levels[n.id] = Math.max(levels[n.id] || 0, lv);
    var nexts = [];
    if (n.to && n.to.length) {
      nexts = n.to.filter(function(t){ return t !== 'END'; });
    } else if (n.connections && n.connections.length) {
      nexts = n.connections.map(function(c){ return c.to; }).filter(function(t){ return t !== 'END'; });
    }
    nexts.forEach(function(t) { assignLevel(t, lv + 1); });
  }

  nodes.forEach(function(n) {
    if (!n.from || n.from.includes('START') || n.type === 'start') {
      assignLevel(n.id, 0);
    }
  });
  nodes.forEach(function(n) {
    if (levels[n.id] === undefined) assignLevel(n.id, 0);
  });

  var levelGroups = {};
  nodes.forEach(function(n) {
    var lv = levels[n.id] || 0;
    if (!levelGroups[lv]) levelGroups[lv] = [];
    if (!levelGroups[lv].find(function(x){ return x.id === n.id; })) {
      levelGroups[lv].push(n);
    }
  });

  var maxLevel = Math.max.apply(null, Object.keys(levelGroups).map(Number));
  var maxPerRow = Math.max.apply(null, Object.values(levelGroups).map(function(g){ return g.length; }));
  var SVG_W = Math.max(300, maxPerRow * (NODE_W + PAD_X * 2));
  var SVG_H = (maxLevel + 1) * (NODE_H + PAD_Y) + 60;

  // 좌표 계산
  var coords = {};
  Object.keys(levelGroups).sort(function(a,b){return a-b;}).forEach(function(lv) {
    var group = levelGroups[lv];
    var totalW = group.length * NODE_W + (group.length - 1) * PAD_X;
    var startX = (SVG_W - totalW) / 2;
    group.forEach(function(n, i) {
      coords[n.id] = {
        x: startX + i * (NODE_W + PAD_X),
        y: Number(lv) * (NODE_H + PAD_Y) + 20,
      };
    });
  });

  // 노드 렌더링
  var rects = nodes.map(function(n) {
    var c = coords[n.id]; if (!c) return '';
    var fill = TYPE_COLOR[n.type] || '#7F77DD';
    var label = (n.label || n.id || '').slice(0, 14);
    var cx = c.x + NODE_W / 2, cy = c.y + NODE_H / 2;

    // 조건 노드: 마름모
    if (n.type === 'condition') {
      var hw = NODE_W / 2, hh = NODE_H / 2 + 4;
      var pts = cx+','+(cy-hh)+' '+(cx+hw)+','+cy+' '+cx+','+(cy+hh)+' '+(cx-hw)+','+cy;
      return '<g>' +
        '<polygon points="'+pts+'" fill="'+fill+'" fill-opacity="0.18" stroke="'+fill+'" stroke-width="1.5"/>' +
        '<text x="'+cx+'" y="'+cy+'" text-anchor="middle" dominant-baseline="central"' +
        ' style="font-size:10px;fill:'+fill+';font-family:sans-serif;font-weight:600">'+escHtml(label)+'</text>' +
      '</g>';
    }
    // 병합 노드: 육각형
    if (n.type === 'merge') {
      var hw2 = NODE_W/2, hh2 = NODE_H/2, off = 12;
      var pts2 = (cx-hw2+off)+','+(cy-hh2)+' '+(cx+hw2-off)+','+(cy-hh2)+' '+(cx+hw2)+','+cy+' '+(cx+hw2-off)+','+(cy+hh2)+' '+(cx-hw2+off)+','+(cy+hh2)+' '+(cx-hw2)+','+cy;
      return '<g>' +
        '<polygon points="'+pts2+'" fill="'+fill+'" fill-opacity="0.18" stroke="'+fill+'" stroke-width="1.5"/>' +
        '<text x="'+cx+'" y="'+cy+'" text-anchor="middle" dominant-baseline="central"' +
        ' style="font-size:10px;fill:'+fill+';font-family:sans-serif">'+escHtml(label)+'</text>' +
      '</g>';
    }
    // 일반/시작/끝 노드: 둥근 사각형
    var rx = (n.type === 'start' || n.type === 'end') ? 18 : 6;
    return '<g>' +
      '<rect x="'+c.x+'" y="'+c.y+'" width="'+NODE_W+'" height="'+NODE_H+'" rx="'+rx+'"' +
      ' fill="'+fill+'" fill-opacity="0.15" stroke="'+fill+'" stroke-width="1.5"/>' +
      '<text x="'+cx+'" y="'+cy+'" text-anchor="middle" dominant-baseline="central"' +
      ' style="font-size:11px;fill:'+fill+';font-family:sans-serif">'+escHtml(label)+'</text>' +
      (n.dataRef ? '<text x="'+cx+'" y="'+(c.y+NODE_H+11)+'" text-anchor="middle"' +
        ' style="font-size:9px;fill:#8888aa;font-family:monospace">'+escHtml(n.dataRef.slice(0,22))+'</text>' : '') +
    '</g>';
  }).join('');

  // 화살표 — connections > to 순으로
  var arrows = []; var drawnPairs = new Set();
  nodes.forEach(function(n) {
    var src = coords[n.id]; if (!src) return;
    var x1 = src.x + NODE_W / 2, y1b = src.y + NODE_H;

    var connList = (n.connections && n.connections.length)
      ? n.connections
      : (n.to || []).map(function(t, idx){ return { to: t, outputIndex: idx, label: '' }; });

    connList.forEach(function(conn) {
      if (!conn.to || conn.to === 'END') return;
      var key = n.id + '->' + conn.to;
      if (drawnPairs.has(key)) return;
      drawnPairs.add(key);

      var dstNode = nodeMap[conn.to];
      if (!dstNode) return;
      var dst = coords[dstNode.id]; if (!dst) return;
      var x2 = dst.x + NODE_W / 2, y2t = dst.y;

      var strokeColor = conn.outputIndex === 0 ? '#5DCAA5' :
                        conn.outputIndex === 1 ? '#EF9F27' : '#A78BFA';
      var isLoop = y2t <= y1b;
      var path = isLoop
        ? 'M'+x1+' '+y1b+' C'+(x1+60)+' '+(y1b+40)+' '+(x2+60)+' '+(y2t-40)+' '+x2+' '+y2t
        : 'M'+x1+' '+y1b+' L'+x2+' '+y2t;

      arrows.push('<path d="'+path+'" fill="none" stroke="'+strokeColor+'"' +
        ' stroke-width="1.5" marker-end="url(#diag-arrow)"' +
        ' stroke-dasharray="'+(isLoop?'5 3':'none')+'"/>');

      if (conn.label) {
        var mx = (x1+x2)/2 + (isLoop?35:0), my = (y1b+y2t)/2;
        var lw = Math.min(conn.label.length * 5 + 10, 90);
        arrows.push(
          '<rect x="'+(mx-lw/2)+'" y="'+(my-8)+'" width="'+lw+'" height="13" fill="var(--bg3,#18181f)" rx="3"/>'+
          '<text x="'+mx+'" y="'+my+'" text-anchor="middle" dominant-baseline="central"' +
          ' style="font-size:9px;fill:'+strokeColor+';font-family:sans-serif">'+escHtml(conn.label.slice(0,14))+'</text>'
        );
      }
    });
  });

  return '<div class="diag-diagram">' +
    '<svg width="100%" viewBox="0 0 '+SVG_W+' '+SVG_H+'" style="overflow:visible;min-height:100px">' +
    '<defs><marker id="diag-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
    '<path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round"/></marker></defs>' +
    arrows.join('') + rects +
    '</svg></div>';
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
  // 사이드패널: 헤더가 #sp-header에 있으므로 document 전체에서 탐색
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

  // 에이전트 역할 체크박스
  var chkAll = document.getElementById('chkAllAgents');
  if (chkAll) chkAll.addEventListener('change', function() {
    var roles = state.agentAnalysis && state.agentAnalysis.suggestedRoles || [];
    roles.forEach(function(r, i) {
      state.selectedAgentRoles[i] = chkAll.checked;
    });
    render();
  });

  document.querySelectorAll('.agent-role-chk').forEach(function(chk) {
    chk.addEventListener('change', function() {
      var idx = parseInt(chk.dataset.roleIdx);
      state.selectedAgentRoles[idx] = chk.checked;
      render();
    });
  });

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

  // 그룹 토글
  document.querySelectorAll('[data-group-toggle]').forEach(function(el) {
    el.addEventListener('click', function() {
      var k = el.dataset.groupToggle;
      state.expandedGroups[k] = !( state.expandedGroups[k] !== false );
      render();
    });
  });


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
  // 수정 버튼
  document.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>{
    var p = state.prompts.find(x=>x.id===btn.dataset.edit);
    if (!p) return;
    if (state.editingId === p.id) {
      state.editingId = null;
    } else {
      state.editingId = p.id;
      state.editingPrompt = p.finalPrompt || '';
      state.editingTitle  = p.title || '';
      state.editingRaw    = p.rawInput || '';
    }
    render();
  }));

  // 편집 취소
  document.querySelectorAll('[data-cancel-edit]').forEach(btn=>btn.addEventListener('click',()=>{
    state.editingId = null; render();
  }));

  // 편집 필드 동기
  document.querySelectorAll('.edit-title').forEach(el=>el.addEventListener('input',e=>{
    state.editingTitle = e.target.value;
  }));
  document.querySelectorAll('.edit-prompt').forEach(el=>el.addEventListener('input',e=>{
    state.editingPrompt = e.target.value;
  }));
  document.querySelectorAll('.edit-raw').forEach(el=>el.addEventListener('input',e=>{
    state.editingRaw = e.target.value;
  }));

  // 저장
  document.querySelectorAll('[data-save-edit]').forEach(btn=>btn.addEventListener('click',async()=>{
    var id = btn.dataset.saveEdit;
    var p = state.prompts.find(x=>x.id===id);
    if (!p) return;
    var updated = Object.assign({}, p, {
      title:       state.editingTitle || p.title,
      finalPrompt: state.editingPrompt || p.finalPrompt,
      rawInput:    state.editingRaw || p.rawInput,
      updatedAt:   Date.now(),
    });
    await sendMsg('SAVE_PROMPT', updated);
    state.prompts = await sendMsg('GET_PROMPTS');
    state.editingId = null;
    render();
  }));

  // 재요청
  document.querySelectorAll('[data-rerequest]').forEach(btn=>btn.addEventListener('click',async()=>{
    var id = btn.dataset.rerequest;
    state.rerequesting = id;
    render();
    try {
      var res = await sendMsg('REREQUEST_PROMPT', {
        modifiedPrompt: state.editingPrompt || '',
        rawInput:       state.editingRaw    || '',
      });
      state.rerequestResults[id] = res;
    } catch(e) {
      state.rerequestResults[id] = {
        needsAgent: false,
        reason: '재요청 실패: ' + e.message,
        suggestedRoles: [],
      };
    }
    state.rerequesting = null;
    render();
  }));

  // 재요청 결과 닫기
  document.querySelectorAll('[data-clear-rr]').forEach(btn=>btn.addEventListener('click',()=>{
    delete state.rerequestResults[btn.dataset.clearRr];
    render();
  }));

  // 에이전트 탭으로 이동하여 생성
  document.querySelectorAll('[data-goto-agent]').forEach(btn=>btn.addEventListener('click',()=>{
    var id = btn.dataset.gotoAgent;
    var res = state.rerequestResults[id];
    var p   = state.prompts.find(x=>x.id===id);
    if (!res || !p) return;
    // 에이전트 탭으로 전환하고 분석 결과 주입
    state.view = 'agent';
    state.agentStep = 'confirm';
    state.agentInput = p.rawInput || p.finalPrompt || '';
    state.agentAnalysis = res;
    state.agentPrompts = [];
    state.editingId = null;
    render();
  }));

  // 진단
  document.querySelectorAll('[data-diagnose]').forEach(btn=>btn.addEventListener('click',async()=>{
    var id = btn.dataset.diagnose;
    var p = state.prompts.find(x=>x.id===id);
    if (!p) return;
    state.diagnosing = id;
    render();
    try {
      var res = await sendMsg('DIAGNOSE_PROMPT', {
        promptText: p.finalPrompt,
        rawInput:   p.rawInput,
      });
      res.id = id;
      // 카드별로 결과 저장 — 항시 표시
      state.diagResults[id] = res;
    } catch(e) {
      state.diagResults[id] = {
        id: id, score: 0,
        issues: ['진단 실패: ' + e.message],
        suggestions: [], patterns: [], nodes: []
      };
    }
    state.diagnosing = null;
    render();
  }));

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

  // 사이드패널: 입력·상태 변경 시 자동 저장 (debounce 300ms)
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(saveUIState, 300);
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
  state.agentCurrentRole = '';
  state.agentPrompts = [];
  state.agentError = null;
  render();

  // 선택된 역할만 필터링 — 체크박스 반영
  var selectedRoles = roles.filter(function(r, i) {
    return state.selectedAgentRoles[i] !== false;
  });
  var filteredAnalysis = Object.assign({}, state.agentAnalysis, { suggestedRoles: selectedRoles });

  try {
    for (var i = 0; i < selectedRoles.length; i++) {
      state.agentGenProgress = i + 1;
      state.agentCurrentRole = selectedRoles[i].role;
      render();

      var result = await sendMsg('GENERATE_AGENT_PROMPTS', {
        rawInput:  state.agentInput,
        analysis:  filteredAnalysis,
        roleIndex: i,
      });

      if (result && result.length > 0) {
        state.agentPrompts.push(result[0]);
      }

      if (i < selectedRoles.length - 1) {
        await new Promise(function(r){ setTimeout(r, 200); });
      }
    }
    state.agentStep = 'result';
    state.agentCurrentRole = '';
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
    state.settings = await sendMsg('GET_SETTINGS');
    if (state.settings.apiKey) state.apiKeyInput = '••••••••••••';
    state.prompts = await sendMsg('GET_PROMPTS') || [];

    // 사이드패널 전용: 이전 UI 상태 복원 (탭 이동 후 돌아와도 유지)
    var saved = await restoreUIState();
    if (saved) {
      if (saved.view)          state.view          = saved.view;
      if (saved.step)          state.step          = saved.step;
      if (saved.rawInput)      state.rawInput      = saved.rawInput;
      if (saved.templateSuggestion) state.templateSuggestion = saved.templateSuggestion;
      if (saved.finalPrompt)   state.finalPrompt   = saved.finalPrompt;
      if (saved.title)         state.title         = saved.title;
      if (saved.category)      state.category      = saved.category;
      if (saved.agentInput)    state.agentInput    = saved.agentInput;
      if (saved.agentStep)     state.agentStep     = saved.agentStep;
      if (saved.agentAnalysis) state.agentAnalysis = saved.agentAnalysis;
      if (saved.agentPrompts)  state.agentPrompts  = saved.agentPrompts;
      if (saved.filterCat)     state.filterCat     = saved.filterCat;
    }
  } catch(e) { console.warn('초기화 오류:', e); }
  render();
}

// ── 사이드패널 상태 저장/복원 ──────────────────────────────────────────────
function saveUIState() {
  try {
    var snapshot = {
      view: state.view, step: state.step,
      rawInput: state.rawInput,
      templateSuggestion: state.templateSuggestion,
      finalPrompt: state.finalPrompt,
      title: state.title, category: state.category,
      agentInput: state.agentInput, agentStep: state.agentStep,
      agentAnalysis: state.agentAnalysis, agentPrompts: state.agentPrompts,
      filterCat: state.filterCat,
    };
    chrome.storage.session.set({ pgUIState: snapshot });
  } catch(e) {}
}

function restoreUIState() {
  return new Promise(function(resolve) {
    try {
      chrome.storage.session.get('pgUIState', function(r) {
        resolve(r && r.pgUIState ? r.pgUIState : null);
      });
    } catch(e) { resolve(null); }
  });
}



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
  var curRole = state.agentCurrentRole || '';

  return '<div class="card" style="text-align:center;padding:28px 20px">' +
    '<div class="spinner large" style="margin:0 auto 12px"></div>' +
    '<div style="font-size:13px;color:var(--text);font-weight:600;margin-bottom:4px">에이전트 프롬프트 생성 중...</div>' +
    (curRole ? '<div style="font-size:12px;color:var(--accent);margin-bottom:8px">현재: ' + escHtml(curRole) + '</div>' : '') +
    (total > 0 ? (
      '<div style="font-size:11px;color:var(--muted);margin-bottom:10px">Agent ' + cur + ' / ' + total + '</div>' +
      '<div style="background:var(--bg3);border-radius:20px;height:8px;overflow:hidden;margin:0 20px 12px">' +
        '<div style="background:var(--accent);height:100%;border-radius:20px;width:' + pct + '%;transition:width .4s ease"></div>' +
      '</div>' +
      // 이미 완료된 에이전트 목록
      (state.agentPrompts.length > 0 ? (
        '<div style="text-align:left;margin-top:8px;border-top:1px solid var(--border);padding-top:8px">' +
        state.agentPrompts.map(function(p, idx) {
          return '<div style="font-size:11px;color:var(--accent2);padding:2px 0">✓ Agent ' + (idx+1) + ': ' + escHtml(p.role) + '</div>';
        }).join('') +
        '</div>'
      ) : '')
    ) : '') +
    '<div style="font-size:11px;color:var(--muted);margin-top:10px;line-height:1.7">' +
      'GPU 부하를 줄이기 위해 역할별로 순차 처리합니다.' +
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

  // 기본값: 모두 선택
  roles.forEach(function(r, i) {
    if (state.selectedAgentRoles[i] === undefined) {
      state.selectedAgentRoles[i] = true;
    }
  });

  var selectedCount = roles.filter(function(r, i) {
    return state.selectedAgentRoles[i] !== false;
  }).length;

  return '<div class="card">' +
    '<div class="agent-confirm-header">' +
      '<div style="font-size:15px;font-weight:600">🤖 멀티 에이전트 구성 제안</div>' +
      '<div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.6">' + escHtml(a.reason || '') + '</div>' +
    '</div>' +
    // 전체선택/해제 컨트롤
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:6px 0;border-bottom:1px solid var(--border)">' +
      '<input type="checkbox" id="chkAllAgents" ' + (selectedCount === roles.length ? 'checked' : '') + ' style="width:14px;height:14px;accent-color:var(--accent);cursor:pointer">' +
      '<label for="chkAllAgents" style="font-size:12px;color:var(--muted);cursor:pointer">전체 선택</label>' +
      '<span style="font-size:11px;color:var(--accent);margin-left:auto">' + selectedCount + ' / ' + roles.length + '개 선택됨</span>' +
    '</div>' +
    '<div class="agent-roles">' +
      roles.map(function(r, i) {
        var icon = catTemplates[i] ? catTemplates[i].icon : '🤖';
        var isChecked = state.selectedAgentRoles[i] !== false;
        return '<div class="agent-role-card ' + (isChecked ? '' : 'agent-role-unchecked') + '">' +
          '<div class="agent-role-header">' +
            '<input type="checkbox" class="agent-role-chk" data-role-idx="' + i + '" ' +
              (isChecked ? 'checked' : '') +
              ' style="width:14px;height:14px;flex-shrink:0;accent-color:var(--accent);cursor:pointer">' +
            '<span class="agent-role-icon">' + icon + '</span>' +
            '<div style="flex:1">' +
              '<div class="agent-role-name">Agent ' + (i+1) + ': ' + escHtml(r.role) + '</div>' +
              '<div class="agent-role-desc">' + escHtml(r.desc) + '</div>' +
            '</div>' +
            '<span class="agent-role-num">' + (i+1) + '/' + roles.length + '</span>' +
          '</div>' +
          '<div class="agent-role-task">' + escHtml(r.task || '') + '</div>' +
          ((r.from && r.from.length > 0 && r.from[0] !== 'START') || (r.to && r.to.length > 0 && r.to[0] !== 'END')
            ? '<div style="font-size:10px;color:var(--muted);margin-top:4px;display:flex;gap:8px">' +
                (r.from && r.from[0] !== 'START' ? '<span>📥 ' + escHtml(r.from.join(', ')) + '</span>' : '<span>📥 시작</span>') +
                '<span>→</span>' +
                (r.to && r.to[0] !== 'END' ? '<span>📤 ' + escHtml(r.to.join(', ')) + '</span>' : '<span>📤 완료</span>') +
              '</div>'
            : '') +
        '</div>';
      }).join('') +
    '</div>' +
    '<div class="agent-flow-hint">체크된 에이전트만 프롬프트가 생성됩니다.</div>' +
    '<div class="btn-row">' +
      '<button class="btn-ghost" id="btnAgentBack">← 다시 입력</button>' +
      '<button class="btn-primary" id="btnGenerateAgents" ' + (selectedCount === 0 ? 'disabled' : '') + '>✨ 프롬프트 생성 (' + selectedCount + '개) →</button>' +
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
