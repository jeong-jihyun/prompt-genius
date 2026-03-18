// roles.js 로드 (역할 데이터 중앙 관리 파일)
try { importScripts('roles.js'); } catch(e) { console.warn('roles.js 로드 실패:', e); }

// ── Edge / 구버전 브라우저 폴리필 ─────────────────────────────────────────────
// AbortSignal.timeout — Edge 95 이하 미지원 대응
if (typeof AbortSignal.timeout !== 'function') {
  AbortSignal.timeout = function(ms) {
    var ctrl = new AbortController();
    setTimeout(function() { ctrl.abort(new DOMException('TimeoutError', 'TimeoutError')); }, ms);
    return ctrl.signal;
  };
}
// ─────────────────────────────────────────────────────────────────────────────

// PromptGenius background.js v3.0
// 핵심 변경: 베스트 프랙티스 패턴을 코드에 내장 → AI는 패턴 선택 + 내용 채우기만 담당

// ══════════════════════════════════════════════════════════════════════════════
// 베스트 프랙티스 패턴 라이브러리 (코드에 고정)
// 모델 품질과 무관하게 항상 적용됨
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// LLM API 호출 함수들
// ══════════════════════════════════════════════════════════════════════════════
async function callClaude(apiKey, model, system, user) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    throw new Error(e.error?.message || 'Claude API 오류 ' + resp.status);
  }
  const data = await resp.json();
  return data.content?.find(b => b.type === 'text')?.text || '';
}

async function callOpenAICompat(baseUrl, model, system, user, apiKey) {
  const endpoint = (baseUrl || '').replace(/\/$/, '') + '/v1/chat/completions';
  // apiKey가 있으면 Bearer 토큰으로 전달, 없으면 로컬 서버용 더미 값 사용
  const authHeader = (apiKey && apiKey.trim()) ? ('Bearer ' + apiKey.trim()) : 'Bearer not-required';
  let resp;
  try {
    resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({
        model: model || 'default',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.3,
        max_tokens: 2048,
        stream: false,
      }),
    });
  } catch (e) {
    throw new Error(endpoint + ' 서버에 연결할 수 없습니다.\n서버가 실행 중인지 확인하세요.');
  }
  if (resp.status === 401) throw new Error('API 키가 올바르지 않습니다.\n설정에서 API 키를 다시 확인해주세요.');
  if (resp.status === 403) throw new Error('API 키 권한이 없습니다. 플랜을 확인해주세요.');
  if (resp.status === 429) throw new Error('요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({}));
    throw new Error('API 오류 ' + resp.status + (errBody.error?.message ? ': ' + errBody.error.message : ''));
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('응답에서 텍스트를 찾을 수 없습니다. 모델이 로드되었는지 확인하세요.');
  return content;
}

async function callOllama(baseUrl, model, system, user) {
  const url = (baseUrl || 'http://localhost:11434').replace(/\/$/, '') + '/api/chat';
  const mdl = model || 'qwen2.5:3b';
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: mdl,
        stream: false,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        options: { temperature: 0.3 },
      }),
    });
  } catch (e) {
    throw new Error('Ollama 서버에 연결할 수 없습니다.\nOllama 앱을 실행한 후 다시 시도해주세요.');
  }
  if (resp.status === 403) throw new Error('설정 탭 → 🔌 연결 테스트를 클릭하면 해결 방법을 안내해드립니다.');
  if (resp.status === 404) throw new Error('"' + mdl + '" 모델이 없습니다.\n터미널: ollama pull ' + mdl);
  if (resp.status === 500) throw new Error('설정 탭 → 🔌 연결 테스트를 클릭하면 해결 방법을 안내해드립니다.');
  if (!resp.ok) throw new Error('Ollama 오류 ' + resp.status);
  const data = await resp.json();
  if (data.error) throw new Error('Ollama: ' + data.error);
  return data.message?.content || '';
}

async function callLLM(settings, system, user) {
  const pt = settings.providerType || 'claude';

  switch (pt) {
    case 'claude':
      if (!settings.apiKey) throw new Error('Claude API 키가 설정되지 않았습니다.\n설정(⚙️) 탭에서 입력하세요.');
      return callClaude(settings.apiKey, settings.claudeModel, system, user);

    case 'ollama':
      return callOllama(settings.localBaseUrl, settings.localModel, system, user);

    case 'lmstudio':
      return callOpenAICompat(
        settings.localBaseUrl || 'http://localhost:1234',
        settings.localModel || 'local-model',
        system, user, ''
      );

    case 'jan':
      return callOpenAICompat(
        settings.localBaseUrl || 'http://localhost:1337',
        settings.localModel || 'mistral-7b-instruct',
        system, user, ''
      );

    case 'llamacpp':
      return callOpenAICompat(
        settings.localBaseUrl || 'http://localhost:8080',
        settings.localModel || 'default',
        system, user, ''
      );

    case 'custom':
      // custom은 customEndpoint/customModel/customApiKey를 우선 사용
      if (!settings.customEndpoint) throw new Error('커스텀 엔드포인트가 설정되지 않았습니다.\n설정(⚙️) 탭에서 URL을 입력하세요.');
      return callOpenAICompat(
        settings.customEndpoint,
        settings.customModel || 'default',
        system, user,
        settings.customApiKey || ''
      );

    default:
      // groq, openrouter 등 — customEndpoint/customApiKey 사용
      if (!settings.customEndpoint) throw new Error('엔드포인트가 설정되지 않았습니다.\n설정(⚙️) 탭에서 커스텀 프로바이더를 설정해주세요.');
      return callOpenAICompat(
        settings.customEndpoint,
        settings.customModel || 'default',
        system, user,
        settings.customApiKey || ''
      );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// JSON 파싱 헬퍼
// ══════════════════════════════════════════════════════════════════════════════
function parseJSON(raw) {
  var cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  var si = cleaned.indexOf('{');
  var ei = cleaned.lastIndexOf('}');
  if (si === -1 || ei === -1) {
    throw new Error('AI 응답이 JSON 형식이 아닙니다. 모델을 qwen2.5:3b 이상으로 변경해보세요.');
  }
  cleaned = cleaned.slice(si, ei + 1);

  try { return JSON.parse(cleaned); } catch(e1) {}

  try {
    var fixed = '';
    var inStr = false;
    var esc = false;
    for (var i = 0; i < cleaned.length; i++) {
      var ch = cleaned[i];
      var code = cleaned.charCodeAt(i);
      if (esc) { fixed += ch; esc = false; continue; }
      if (ch === '\\') { esc = true; fixed += ch; continue; }
      if (ch === '"') { inStr = !inStr; fixed += ch; continue; }
      if (inStr && code < 0x20) {
        if (code === 0x0a) fixed += '\\n';
        else if (code === 0x0d) fixed += '\\r';
        else if (code === 0x09) fixed += '\\t';
        else fixed += '\\u' + ('0000' + code.toString(16)).slice(-4);
        continue;
      }
      fixed += ch;
    }
    return JSON.parse(fixed);
  } catch(e2) {}

  function exStr(key) {
    var re = new RegExp('"' + key + '"\\s*:\\s*"((?:[^"\\\\]|\\\\[\\s\\S]*))"');
    var m = cleaned.match(re);
    return m ? m[1].replace(/\\\\n/g, '\n') : '';
  }
  function exArr(key) {
    var re = new RegExp('"' + key + '"\\s*:\\s*\\[([^\\]]*?)\\]');
    var m = cleaned.match(re);
    if (!m) return [];
    var it = m[1].match(/"([^"]*)"/g);
    return it ? it.map(function(x){ return x.slice(1,-1); }) : [];
  }
  var ts = exStr('templateSuggestion');
  var fp = exStr('finalPrompt');
  var ti = exStr('suggestedTitle') || exStr('title') || 'AI 생성';
  var ca = exStr('suggestedCategory') || 'productivity';
  if (ts) return { templateSuggestion: ts, suggestedTitle: ti, suggestedCategory: ca, keyComponents: exArr('keyComponents') };
  if (fp) return { finalPrompt: fp, improvements: exArr('improvements'), promptingTechniques: exArr('promptingTechniques') };
  throw new Error('AI 응답 파싱 실패. 더 큰 모델(qwen2.5:7b 이상)을 사용해보세요.');
}

// ══════════════════════════════════════════════════════════════════════════════
// 핵심 개선: 베스트 프랙티스 기반 2단계 프롬프트 생성
// ══════════════════════════════════════════════════════════════════════════════

// ── 1단계: 카테고리 + 패턴 분류 (AI 역할: 분류만) ──────────────────────────────
async function generateTemplate(settings, rawInput) {
  const lang = settings.language || 'ko';
  const langMap = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' };
  const langName = langMap[lang] || '한국어';

  const patternList = Object.entries(PROMPT_PATTERNS)
    .map(function(kv) { return '- ' + kv[0] + ': ' + kv[1].name + ' — ' + kv[1].desc; })
    .join('\n');

  const systemLines = [
    '⚠️ 반드시 ' + langName + '로만 답하세요.',
    '당신은 프롬프트 엔지니어링 전문가입니다.',
    '사용자 요구사항을 분석하여 최적의 카테고리, 패턴, 핵심 요소를 파악하세요.',
    '',
    '사용 가능한 패턴:',
    patternList,
    '',
    '반드시 JSON만 출력. 설명 금지.',
    '형식: {"suggestedTitle":"제목","suggestedCategory":"coding|writing|analysis|business|creative|education|productivity|custom","bestPattern":"패턴키","coreRole":"완성형 질문에서 AI에게 부여할 구체적 역할 (예: 10년 경력 시니어 백엔드 개발자)","coreContext":"배경 맥락 1-2문장","coreOutput":"원하는 출력 형식과 수준","keyPoints":["핵심요소1","핵심요소2","핵심요소3"]}',
  ];
  const system = systemLines.join('\n');

  const user = '다음 요구사항을 분석하여 JSON 출력:\n"""\n' + rawInput + '\n"""';

  const raw = await callLLM(settings, system, user);
  const analysis = parseJSON(raw);

  const patternKey = analysis.bestPattern || 'RCTF';
  const pattern = PROMPT_PATTERNS[patternKey] || PROMPT_PATTERNS['RCTF'];

  // 템플릿에 분석 결과를 미리 반영하여 2단계가 더 좋은 질문을 만들 수 있도록 힌트 제공
  const enrichedTemplate = [
    '## AI 역할',
    (analysis.coreRole || '[역할]'),
    '',
    pattern.template,
    '',
    '---',
    '## 참고 정보 (2단계에서 활용)',
    '- 핵심 목적: ' + (analysis.keyPoints || []).join(', '),
    '- 원하는 출력: ' + (analysis.coreOutput || ''),
    '- 배경: ' + (analysis.coreContext || ''),
  ].join('\n');

  return {
    suggestedTitle:     analysis.suggestedTitle || '새 프롬프트',
    suggestedCategory:  analysis.suggestedCategory || 'productivity',
    bestPattern:        patternKey,
    patternName:        pattern.name,
    patternDesc:        pattern.desc,
    keyPoints:          analysis.keyPoints || [],
    templateSuggestion: enrichedTemplate,
  };
}

// ── 2단계: 완성형 질문 생성 ───────────────────────────────────────────────────
// ── 2단계: 패턴 기반 탈고 (AI 역할: 템플릿 빈칸 채우기) ───────────────────────
async function generateDraft(settings, rawInput, templateSuggestion, category, patternKey) {
  const lang = settings.language || 'ko';
  const langMap = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' };
  const langName = langMap[lang] || '한국어';

  const pattern = PROMPT_PATTERNS[patternKey] || PROMPT_PATTERNS['RCTF'];

  const systemLines = [
    '⚠️ 반드시 ' + langName + '로만 답하세요.',
    '당신은 세계 최고의 프롬프트 엔지니어입니다.',
    '',
    '목표: 사용자가 AI(ChatGPT, Claude 등)에게 붙여넣으면',
    '즉시 최고 품질의 답변을 얻을 수 있는 완성형 질문을 작성하세요.',
    '',
    '적용 패턴: ' + pattern.name,
    '',
    '완성형 질문 작성 원칙:',
    '1. AI 역할을 구체적으로 지정 (단순 전문가가 아닌 세부 역할)',
    '2. 사용자 요구사항의 핵심 목적을 정확히 반영',
    '3. 원하는 답변 형식, 길이, 수준을 명시',
    '4. 예시나 참고 기준을 포함하여 모호함 제거',
    '5. 단계별 사고나 검토 과정을 유도',
    '6. 실제 사용자가 바로 붙여넣어 쓸 수 있도록 완결된 문장으로 작성',
    '',
    '하지 말 것: [대괄호] 같은 빈칸 남기기, 템플릿 구조 그대로 출력',
    '해야 할 것: 구체적 내용으로 완전히 채워진 실제 사용 가능한 질문 완성',
    '',
    '반드시 JSON만 출력. 설명 금지.',
    '형식: {"finalPrompt":"완성된 질문 전문","improvements":["개선점1","개선점2"],"promptingTechniques":["적용기법1","적용기법2"]}',
  ];
  const system = systemLines.join('\n');

  const userLines = [
    '사용자 요구사항:',
    rawInput,
    '',
    '참고 구조 (' + pattern.name + ' 패턴):',
    templateSuggestion,
    '',
    '위 요구사항을 충족하는, AI에게 바로 질문할 수 있는 완성형 프롬프트를 ' + langName + '로 JSON 출력.',
    '중요: [대괄호] 빈칸 없이 모든 내용을 구체적으로 채워주세요.',
  ];
  const user = userLines.join('\n');

  const raw = await callLLM(settings, system, user);
  return parseJSON(raw);
}


// ══════════════════════════════════════════════════════════════════════════════
// IndexedDB 스토리지
// ══════════════════════════════════════════════════════════════════════════════
const DB_NAME = 'PromptGeniusDB', STORE = 'prompts';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbPut(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(item);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function dbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function dbGet(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 설정 스토리지
// ══════════════════════════════════════════════════════════════════════════════
const DEFAULT_SETTINGS = {
  apiKey: '', providerType: 'claude', claudeModel: 'claude-sonnet-4-5',
  localBaseUrl: 'http://localhost:11434', localModel: 'qwen2.5:3b',
  customEndpoint: '', customApiKey: '', customModel: '',
  defaultCategory: 'productivity', language: 'ko',
};

function getSettings() {
  return new Promise(resolve => {
    chrome.storage.sync.get('settings', r => {
      resolve({ ...DEFAULT_SETTINGS, ...(r.settings || {}) });
    });
  });
}

function saveSettings(partial) {
  return new Promise(async (resolve, reject) => {
    const current = await getSettings();
    chrome.storage.sync.set({ settings: { ...current, ...partial } }, () => {
      chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve();
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 연결 테스트
// ══════════════════════════════════════════════════════════════════════════════
async function testConnection(settings) {
  const start = Date.now();
  const pt = settings.providerType || 'claude';
  try {
    if (pt === 'claude') {
      const t = await callClaude(settings.apiKey, settings.claudeModel, 'Reply only: pong', 'ping');
      return { ok: t.toLowerCase().includes('pong'), latencyMs: Date.now() - start };
    }
    if (pt === 'ollama') {
      const base = (settings.localBaseUrl || 'http://localhost:11434').replace(/\/$/, '');
      const mdl  = settings.localModel || 'qwen2.5:3b';

      // 1단계: GET /api/tags — 서버 실행 확인
      let models = [];
      try {
        const tr = await fetch(base + '/api/tags', { signal: AbortSignal.timeout(5000) });
        if (tr.ok) {
          const td = await tr.json().catch(() => ({}));
          models = (td.models || []).map(m => m.name);
        }
      } catch (e) {
        return { ok: false, error: 'Ollama 서버가 실행되지 않았습니다.\nOllama 앱을 실행한 후 다시 시도해주세요.' };
      }

      // 2단계: POST /api/chat — CORS + 모델 동작 확인
      let chatResp;
      try {
        chatResp = await fetch(base + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: mdl, stream: false,
            messages: [{ role: 'user', content: 'hi' }],
            options: { num_predict: 1 },
          }),
          signal: AbortSignal.timeout(30000),
        });
      } catch (e) {
        return { ok: false, error: 'Ollama 서버에 연결할 수 없습니다.\nOllama 앱을 실행한 후 다시 시도해주세요.' };
      }

      if (chatResp.status === 403) return { ok: false, cors: true, error: 'cors' };
      if (chatResp.status === 404) {
        return { ok: false, error: '"' + mdl + '" 모델이 설치되어 있지 않습니다.\n터미널에서 실행: ollama pull ' + mdl };
      }
      if (chatResp.status === 500) return { ok: false, oom: true, model: mdl, error: 'oom' };
      if (!chatResp.ok) return { ok: false, error: 'Ollama 오류 ' + chatResp.status };
      return { ok: true, latencyMs: Date.now() - start, models };
    }

    // OpenAI 호환 (lmstudio / jan / llamacpp / custom / groq / openrouter)
    // 프로바이더별로 올바른 baseUrl과 apiKey 선택
    let oaiBase, oaiKey;
    if (pt === 'lmstudio') {
      oaiBase = settings.localBaseUrl || 'http://localhost:1234';
      oaiKey  = '';
    } else if (pt === 'jan') {
      oaiBase = settings.localBaseUrl || 'http://localhost:1337';
      oaiKey  = '';
    } else if (pt === 'llamacpp') {
      oaiBase = settings.localBaseUrl || 'http://localhost:8080';
      oaiKey  = '';
    } else {
      // custom / groq / openrouter 등 — customEndpoint 우선
      oaiBase = settings.customEndpoint || settings.localBaseUrl || '';
      oaiKey  = settings.customApiKey || '';
    }
    if (!oaiBase) return { ok: false, error: '서버 주소(엔드포인트)가 설정되지 않았습니다.\n설정(⚙️) 탭에서 입력해주세요.' };

    const cleanBase = oaiBase.replace(/\/$/, '').replace(/\/v1\/chat\/completions$/, '');
    let testResp;
    try {
      testResp = await fetch(cleanBase + '/v1/models', {
        headers: { Authorization: 'Bearer ' + (oaiKey || 'not-required') },
        signal: AbortSignal.timeout(5000),
      });
    } catch (e) {
      return { ok: false, error: cleanBase + ' 에 연결할 수 없습니다.\n서버가 실행 중인지 확인하세요.' };
    }
    if (testResp.status === 401) return { ok: false, error: 'API 키가 올바르지 않습니다. 설정을 확인해주세요.' };
    if (!testResp.ok) return { ok: false, error: 'HTTP ' + testResp.status + ' — 서버 응답 오류' };
    const data = await testResp.json();
    return { ok: true, latencyMs: Date.now() - start, models: (data.data || []).map(m => m.id) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// AI Agent 멀티 역할 프롬프트 생성
// ══════════════════════════════════════════════════════════════════════════════

// 에이전트가 필요한지 판단하는 기준 키워드

async function analyzeForAgent(settings, rawInput) {
  const lang = settings.language || 'ko';
  const langMap = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' };
  const langName = langMap[lang] || '한국어';

  const systemLines = [
    '⚠️ 반드시 ' + langName + '로만 답하세요.',
    '당신은 AI 시스템 아키텍트입니다.',
    '사용자 요구사항을 분석하여 단일 LLM 또는 멀티 에이전트 중 최적을 판단하세요.',
    '',
    '[connections 구조 규칙]',
    '1. 분기(IF/Switch): 하나의 노드 output index 0,1,2...로 여러 노드에 연결 가능',
    '2. 병합: 여러 노드가 동일한 다음 노드를 가리킬 수 있음',
    '3. 루프: 조건 미충족 시 이전 노드로 되돌아가는 연결 허용',
    '4. 절대로 모든 노드를 1:1 직렬로만 연결하지 말 것',
    '',
    '[패턴 감지]',
    '- "조건에 따라" → IF 분기 (from: 역할A, to: [역할B, 역할C], outputIndex: [0,1])',
    '- "반복"/"재시도" → 루프백 연결',
    '- "동시에"/"각각" → 병렬 분기 (여러 to 노드)',
    '- "합쳐서"/"모아서" → Merge (여러 from → 하나의 to)',
    '',
    '⚠️ 핵심 규칙:',
    '- suggestedRoles 배열 순서 = 실제 작업 실행 순서 (시간 순서대로 나열)',
    '- 각 역할의 from(입력 제공자)과 to(출력 전달 대상)를 정확히 명시',
    '- 요구사항에 명시된 모든 역할/직책/팀을 포함 (최대 8개)',
    '',
    '반드시 JSON만 출력. 설명 금지.',
    '형식: {"needsAgent":true,"reason":"이유","agentCount":3,"category":"business","suggestedRoles":[{"role":"역할명","desc":"역할 설명","task":"구체적 작업","order":1,"from":["이전역할명또는START"],"to":["다음역할명또는END"]}]}',
  ];

  // 긴 요구사항은 핵심만 요약 (토큰 절약 + JSON 안정성 향상)
  var inputShort = rawInput.length > 500
    ? rawInput.slice(0, 480) + '...(이하 생략)'
    : rawInput;

  const user = '다음 요구사항을 분석하여 JSON 출력:\n"""\n' + inputShort + '\n"""';
  const raw = await callLLM(settings, systemLines.join('\n'), user);
  var result = parseJSON(raw);

  // agentCount 상한 보정 (너무 많으면 처리 불안정)
  if (result && result.suggestedRoles && result.suggestedRoles.length > 8) {
    result.suggestedRoles = result.suggestedRoles.slice(0, 8);
    result.agentCount = result.suggestedRoles.length;
  }
  return result;
}

// 단일 에이전트 프롬프트 생성 (SW 30초 제한 대응 — 역할 하나씩 처리)

// ── 에이전트 프롬프트 생성 v3 — GPU 부하 최적화 ──────────────────────────────
// 핵심 변경:
// 1. 시도 간 딜레이 추가 (GPU 과부하 방지)
// 2. 1회 성공 시 즉시 중단 (불필요한 추가 호출 제거)
// 3. max_tokens 에이전트 전용 제한 (512) — 응답 짧게 유도
// 4. 재시도는 최대 2회로 제한

// 딜레이 헬퍼
function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function generateSingleAgentPrompt(settings, rawInput, analysis, roleIndex) {
  const lang = settings.language || 'ko';
  const langMap = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' };
  const langName = langMap[lang] || '한국어';

  const roles = analysis.suggestedRoles || [];
  const agentPrompts = [];
  const startIdx = (typeof roleIndex === 'number') ? roleIndex : 0;
  const endIdx   = (typeof roleIndex === 'number') ? roleIndex + 1 : roles.length;

  // 입력 요약 — 토큰 절약
  var goalSummary = rawInput.length > 200
    ? rawInput.slice(0, 180) + '...'
    : rawInput;

  var roleListShort = roles.map(function(r, idx) {
    return (idx + 1) + '. ' + r.role;
  }).join(' / ');

  for (var i = startIdx; i < endIdx; i++) {
    var roleInfo = roles[i];

    // from/to 필드가 있으면 우선 사용 (관계 정확도 높음)
    // 없으면 배열 순서로 fallback
    var prevRole, nextRole;
    if (roleInfo.from && roleInfo.from.length > 0 && roleInfo.from[0] !== 'START') {
      prevRole = roleInfo.from[0];
    } else {
      prevRole = i > 0 ? roles[i-1].role : null;
    }
    if (roleInfo.to && roleInfo.to.length > 0 && roleInfo.to[0] !== 'END') {
      nextRole = roleInfo.to[0];
    } else {
      nextRole = i < roles.length - 1 ? roles[i+1].role : null;
    }
    var result = null;

    // ── 시도 1: 간결한 단일 프롬프트 (max_tokens 제한으로 GPU 부하 최소화) ──
    var sys1 = langName + '로만 답하세요. JSON만 출력하세요.\n' +
      '{"prompt":"역할 지시문","inputFormat":"입력 형태","outputFormat":"출력 형태"}\n' +
      'prompt는 구체적인 완성형 지시문, [대괄호] 빈칸 금지, 줄바꿈은 \\n으로';

    var fromList = (roleInfo.from && roleInfo.from.length > 0)
      ? roleInfo.from.filter(function(f){ return f !== 'START'; }).join(', ') || null
      : prevRole;
    var toList = (roleInfo.to && roleInfo.to.length > 0)
      ? roleInfo.to.filter(function(t){ return t !== 'END'; }).join(', ') || null
      : nextRole;
    var isParallelIn  = roleInfo.from && roleInfo.from.length > 1;
    var isParallelOut = roleInfo.to   && roleInfo.to.length   > 1;

    var usr1Parts = [
      '역할: ' + roleInfo.role + ' (' + roleInfo.desc + ')',
      '프로젝트: ' + goalSummary,
      '담당: ' + (roleInfo.task || roleInfo.desc),
      fromList ? ('입력 받는 곳: ' + fromList) : '첫 번째 담당 (초기 입력 수신)',
      toList   ? ('결과 전달 대상: ' + toList)  : '최종 담당 (결과물 완성)',
    ];
    if (isParallelIn)  usr1Parts.push('⚠️ 여러 에이전트 결과를 받아 병합 처리');
    if (isParallelOut) usr1Parts.push('⚠️ 여러 에이전트에 병렬로 결과 전달');
    usr1Parts.push('JSON:');
    var usr1 = usr1Parts.join('\n');

    try {
      // Ollama 전용: num_predict 제한으로 과도한 GPU 사용 방지
      var raw1 = await callLLMWithLimit(settings, sys1, usr1, 600);
      result = parseJSONSafe(raw1);
      if (result && isDummy(result.prompt)) result = null;
    } catch(e1) {}

    // ── 시도 2: 텍스트 직접 생성 (GPU 부하 최소) ──────────────────────
    // 딜레이: 이전 시도와 GPU 쿨다운
    if (!result) {
      await sleep(800);
      var sys2 = langName + '로만 답하세요. 짧고 간결하게.';
      var usr2 = roleInfo.role + ' 역할의 AI 지시문을 2-3문장으로 작성하세요.\n임무: ' +
        (roleInfo.task || roleInfo.desc);
      try {
        var raw2 = await callLLMWithLimit(settings, sys2, usr2, 400);
        var txt2 = raw2.trim().replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();
        // JSON으로 파싱 시도
        var parsed2 = parseJSONSafe(txt2);
        if (parsed2 && !isDummy(parsed2.prompt)) {
          result = parsed2;
        } else if (txt2.length > 20 && !isDummy(txt2)) {
          result = {
            prompt: txt2,
            inputFormat: prevRole ? prevRole + '의 결과물' : '초기 프로젝트 요구사항',
            outputFormat: nextRole ? nextRole + '에게 전달할 문서' : '최종 완성 결과물',
          };
        }
      } catch(e2) {}
    }

    // ── 폴백: 즉시 기본 구조 생성 (LLM 호출 없음) ──────────────────────
    if (!result || !result.prompt) {
      result = {
        prompt: '당신은 ' + roleInfo.role + ' 전문가입니다.\n\n' +
          '역할: ' + roleInfo.desc + '\n' +
          '업무: ' + (roleInfo.task || roleInfo.desc) + '\n\n' +
          (prevRole ? prevRole + '의 결과물을 받아 처리하고 ' : '') +
          (nextRole ? nextRole + '에게 전달할 수 있는 형태로 작성하세요.' : '최종 결과물을 완성하세요.'),
        inputFormat:  prevRole ? prevRole + '의 결과물' : '초기 프로젝트 요구사항',
        outputFormat: nextRole ? nextRole + '에게 전달할 문서' : '최종 완성 결과물',
        _fallback: true,
      };
    }

    agentPrompts.push({
      role:         roleInfo.role,
      desc:         roleInfo.desc,
      task:         roleInfo.task || '',
      prompt:       result.prompt || '',
      inputFormat:  result.inputFormat || '',
      outputFormat: result.outputFormat || '',
      icon:         roleInfo.icon || '🤖',
      isFallback:   !!result._fallback,
    });

    // 역할 간 딜레이 — GPU 쿨다운 (마지막 역할 제외)
    if (i < endIdx - 1) {
      await sleep(500);
    }
  }

  return agentPrompts;
}

// max_tokens/num_predict 제한을 걸어서 호출하는 래퍼
async function callLLMWithLimit(settings, system, user, maxTokens) {
  var pt = settings.providerType || 'claude';

  if (pt === 'ollama') {
    // Ollama 전용: num_predict로 토큰 제한
    var base = (settings.localBaseUrl || 'http://localhost:11434').replace(/\/$/, '');
    var mdl  = settings.localModel || 'qwen2.5:3b';
    var resp = await fetch(base + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: mdl, stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: user   },
        ],
        options: {
          temperature: 0.3,
          num_predict: maxTokens || 600,
          num_ctx: 3072,  // 진단용 시스템 프롬프트를 충분히 수용
        },
      }),
      signal: AbortSignal.timeout(45000),  // 진단은 시간이 더 걸릴 수 있음
    });
    if (resp.status === 403) throw new Error('cors');
    if (resp.status === 500) throw new Error('oom');
    if (!resp.ok) throw new Error('ollama_' + resp.status);
    var data = await resp.json();
    if (data.error) throw new Error(data.error);
    return data.message?.content || '';
  }

  // 기타 프로바이더는 기존 callLLM 사용 (max_tokens 이미 제한됨)
  return callLLM(settings, system, user);
}

// 더미값 판별
function isDummy(text) {
  if (!text || text.length < 15) return true;
  var dummies = ['에이전트 전용 프롬프트', '<여기에 역할 지시문>', '역할 지시문', 'inputFormat', 'outputFormat'];
  return dummies.some(function(d) { return text === d || text.trim() === d; });
}

// 하위 호환 — 전체 일괄 생성
async function generateAgentPrompts(settings, rawInput, analysis) {
  return generateSingleAgentPrompt(settings, rawInput, analysis);
}



// parseJSON 대신 범용 JSON 파서 — 어떤 키든 처리
function parseAnyJSON(raw) {
  if (!raw) throw new Error('빈 응답');
  var cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  var si = cleaned.indexOf('{'), ei = cleaned.lastIndexOf('}');
  if (si === -1 || ei === -1) throw new Error('JSON 없음');
  cleaned = cleaned.slice(si, ei + 1);
  // 1차: 직접 파싱
  try { return JSON.parse(cleaned); } catch(e1) {}
  // 2차: 제어문자 제거
  try {
    var fixed = '';
    var inS = false, esc = false;
    for (var i = 0; i < cleaned.length; i++) {
      var c = cleaned[i], code = cleaned.charCodeAt(i);
      if (esc) { fixed += c; esc = false; continue; }
      if (c === '\\') { esc = true; fixed += c; continue; }
      if (c === '"') { inS = !inS; fixed += c; continue; }
      if (inS && code < 0x20) {
        if (code === 10) fixed += '\\n';
        else if (code === 13) fixed += '\\r';
        else if (code === 9)  fixed += '\\t';
        else fixed += '\\u' + ('0000' + code.toString(16)).slice(-4);
        continue;
      }
      fixed += c;
    }
    return JSON.parse(fixed);
  } catch(e2) {}
  throw new Error('JSON 파싱 실패');
}


async function diagnoseBestPractice(settings, promptText, rawInput) {
  var lang = settings.language || 'ko';
  var langName = { ko:'한국어', en:'English', ja:'日本語', zh:'中文' }[lang] || '한국어';
  var inputText = (promptText || '').slice(0, 400);
  var user = langName + '로만 답하세요. JSON만 출력.\n분석:\n' + inputText + '\nJSON:';

  // 2번 시도 — 실패 시 기본값 반환
  for (var attempt = 0; attempt < 2; attempt++) {
    try {
      var raw = await callLLMWithLimit(settings, BP_RULES_SYSTEM, user, 500);
      var result = parseAnyJSON(raw);
      // 필수 필드 보정
      if (typeof result.score !== 'number') result.score = 60;
      if (!result.agentType) result.agentType = 'single';
      if (!Array.isArray(result.patterns)) result.patterns = [];
      if (!Array.isArray(result.issues)) result.issues = [];
      if (!Array.isArray(result.suggestions)) result.suggestions = [];
      // agents 우선, 없으면 nodes로 fallback (하위 호환)
      if (!Array.isArray(result.agents)) {
        result.agents = Array.isArray(result.nodes) ? result.nodes : [];
      }
      // agents에 from/to/connections 없으면 자동 보정
      var agentIds = result.agents.map(function(a){ return a.id || a.label; });
      result.agents = result.agents.map(function(a, i, arr) {
        if (!a.id)   a.id    = 'a' + (i + 1);
        if (!a.from) a.from  = i === 0 ? ['START'] : [arr[i-1].id || arr[i-1].label];
        if (!a.to)   a.to    = i === arr.length-1 ? ['END'] : [arr[i+1].id || arr[i+1].label];
        if (!a.type) a.type  = (a.to.includes('END') && a.from.includes('START')) ? 'process' :
                               a.from.includes('START') ? 'start' :
                               a.to.includes('END')     ? 'end'   :
                               (a.to.length > 1 || a.from.length > 1) ? 'condition' : 'process';
        // connections 자동 생성
        if (!a.connections || !a.connections.length) {
          a.connections = a.to.map(function(t, idx) {
            return { to: t, outputIndex: idx, label: '' };
          });
        }
        // from/to 정합성 검증 — 존재하지 않는 ID 참조 감지
        a.to.forEach(function(tid) {
          if (tid !== 'END' && !agentIds.includes(tid)) {
            result.issues = result.issues || [];
            result.issues.push('"' + (a.label||a.id) + '" → "' + tid + '" 연결: 존재하지 않는 에이전트 참조');
          }
        });
        return a;
      });
      result.nodes = result.agents; // 하위 호환
      return result;
    } catch(e) {
      if (attempt === 1) {
        // 2번 다 실패하면 기본 결과 반환 (타임아웃 포함)
        return {
          score: 50,
          agentType: 'single',
          patterns: [],
          issues: ['AI 모델이 분석을 완료하지 못했습니다. qwen2.5:7b 이상 모델을 권장합니다.'],
          suggestions: ['더 큰 모델을 사용하거나 잠시 후 다시 시도하세요.'],
          nodes: [
            { id:'n1', label:'시작', type:'start', connections:[{to:'n2',outputIndex:0,label:''}] },
            { id:'n2', label:promptText.slice(0,15)||'처리', type:'process', connections:[] },
          ],
        };
      }
    }
  }
}

async function rerequestPrompt(settings, modifiedPrompt, originalRawInput) {
  var lang = settings.language || 'ko';
  var langName = { ko:'한국어', en:'English', ja:'日本語', zh:'中文' }[lang] || '한국어';
  var system = langName + '로만 답하세요. JSON만 출력.\n' +
    '{"needsAgent":true,"reason":"이유","agentCount":3,"category":"business","suggestedRoles":[{"role":"역할","desc":"설명","task":"작업"}]}';
  var input = (modifiedPrompt || '').slice(0, 300) +
    (originalRawInput ? ('\n원본:' + originalRawInput.slice(0, 150)) : '');
  var user = '분석:\n' + input + '\nJSON:';

  for (var attempt = 0; attempt < 2; attempt++) {
    try {
      var raw = await callLLMWithLimit(settings, system, user, 500);
      var result = parseAnyJSON(raw);
      if (typeof result.needsAgent !== 'boolean') result.needsAgent = false;
      if (!result.reason) result.reason = '분석 완료';
      if (!Array.isArray(result.suggestedRoles)) result.suggestedRoles = [];
      return result;
    } catch(e) {
      if (attempt === 1) {
        return {
          needsAgent: false,
          reason: '모델 응답 파싱 실패. 더 큰 모델(qwen2.5:7b 이상)을 사용하거나 다시 시도해주세요.',
          agentCount: 0,
          category: 'default',
          suggestedRoles: [],
        };
      }
    }
  }
}

// Context Menu
// ══════════════════════════════════════════════════════════════════════════════
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'pg-inject', title: 'PromptGenius: 프롬프트 삽입', contexts: ['editable'] });

  // 사이드패널: 모든 탭에서 아이콘 클릭으로 열기 허용
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

// 아이콘 클릭 → 사이드패널 토글 (Chrome 116+, Edge 116+)
chrome.action.onClicked.addListener(async (tab) => {
  if (!chrome.sidePanel) return;
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch(e) {
    // 일부 특수 페이지(chrome://)에서는 열리지 않을 수 있음
    console.warn('사이드패널 열기 실패:', e.message);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 메시지 핸들러
// ══════════════════════════════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {

        case 'PING':
          sendResponse({ success: true, data: 'pong' }); break;

        case 'GET_PATTERNS':
          // 패턴 목록을 팝업에 전달
          sendResponse({ success: true, data: Object.entries(PROMPT_PATTERNS).map(([k, v]) => ({
            key: k, name: v.name, desc: v.desc,
          })) }); break;

        case 'GENERATE_TEMPLATE': {
          const s = await getSettings();
          const r = await generateTemplate(s, message.payload.rawInput);
          sendResponse({ success: true, data: r }); break;
        }

        case 'GENERATE_DRAFT': {
          const s = await getSettings();
          const r = await generateDraft(
            s,
            message.payload.rawInput,
            message.payload.templateSuggestion,
            message.payload.category,
            message.payload.patternKey || 'RCTF',
          );
          sendResponse({ success: true, data: r }); break;
        }

        case 'GET_PROMPTS':
          sendResponse({ success: true, data: await dbGetAll() }); break;

        case 'SAVE_PROMPT':
          await dbPut(message.payload); sendResponse({ success: true }); break;

        case 'DELETE_PROMPT':
          await dbDelete(message.payload.id); sendResponse({ success: true }); break;

        case 'TOGGLE_FAVORITE': {
          const p = await dbGet(message.payload.id);
          if (p) { p.isFavorite = !p.isFavorite; p.updatedAt = Date.now(); await dbPut(p); }
          sendResponse({ success: true }); break;
        }

        case 'INCREMENT_USAGE': {
          const p = await dbGet(message.payload.id);
          if (p) { p.usageCount = (p.usageCount || 0) + 1; p.updatedAt = Date.now(); await dbPut(p); }
          sendResponse({ success: true }); break;
        }

        case 'GET_SETTINGS':
          sendResponse({ success: true, data: await getSettings() }); break;

        case 'SAVE_SETTINGS':
          await saveSettings(message.payload); sendResponse({ success: true }); break;

        case 'ANALYZE_FOR_AGENT': {
          const s = await getSettings();
          const result = await analyzeForAgent(s, message.payload.rawInput);
          sendResponse({ success: true, data: result }); break;
        }

        case 'GENERATE_AGENT_PROMPTS': {
          const s = await getSettings();
          // roleIndex 지정 시 단일 역할만 처리 (SW 30초 제한 대응)
          const roleIndex = (typeof message.payload.roleIndex === 'number')
            ? message.payload.roleIndex : undefined;
          const result = await generateSingleAgentPrompt(
            s, message.payload.rawInput, message.payload.analysis, roleIndex
          );
          sendResponse({ success: true, data: result }); break;
        }

        case 'DIAGNOSE_PROMPT': {
          const s = await getSettings();
          const result = await diagnoseBestPractice(
            s, message.payload.promptText, message.payload.rawInput);
          sendResponse({ success: true, data: result }); break;
        }

        case 'REREQUEST_PROMPT': {
          const s = await getSettings();
          const result = await rerequestPrompt(
            s, message.payload.modifiedPrompt, message.payload.rawInput);
          sendResponse({ success: true, data: result }); break;
        }

        case 'COPY_TO_CLIPBOARD': {
          // popup에서 clipboard API 실패 시 service worker 경유
          try {
            // MV3 Service Worker는 직접 clipboard 접근 불가
            // → 대신 성공 응답만 반환 (popup의 방법1,2가 먼저 실행되므로 여기까지 오면 이미 실패)
            sendResponse({ success: false, error: 'SW clipboard 불가' });
          } catch(e) {
            sendResponse({ success: false, error: e.message });
          }
          break;
        }

        case 'TEST_CONNECTION': {
          const s = await getSettings();
          sendResponse({ success: true, data: await testConnection(s) }); break;
        }

        case 'INJECT_PROMPT': {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) throw new Error('활성 탭을 찾을 수 없습니다.');
          await chrome.tabs.sendMessage(tab.id, message);
          sendResponse({ success: true }); break;
        }

        default:
          sendResponse({ success: false, error: '알 수 없는 메시지: ' + message.type });
      }
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  })();
  return true;
});
