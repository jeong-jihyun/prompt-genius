# PromptGenius

**평범한 요구사항을 전문가 수준의 AI 프롬프트로 바꿔 주는 크롬(Edge) 확장 프로그램**입니다. 완성한 프롬프트는 저장해 두었다가 웹페이지의 입력란에 바로 넣을 수 있어요. 빌드 과정이 없는 순수 JavaScript(Manifest V3)입니다.

## 할 수 있는 것

| 기능 | 설명 |
| --- | --- |
| 프롬프트 생성 | 요구사항을 입력하면 AI가 카테고리·패턴·역할을 정하고 초안을 만듦 |
| 패턴 내장 | RCTF, COT(단계적 사고), FEW_SHOT, STRUCTURED, ITERATIVE, CONSTRAINT 6종 (`roles.js`). AI는 패턴을 고르고 내용만 채움 |
| 멀티 에이전트 | 요구사항을 분석해 역할별 프롬프트를 한 역할씩 만듦 |
| 진단·재요청 | 만든 프롬프트를 점검하거나, 직접 고친 프롬프트로 다시 생성 |
| 저장·관리 | 즐겨찾기, 사용 횟수 기록, 삭제 (브라우저 IndexedDB에 저장) |
| 입력란 삽입 | 우클릭 메뉴 "PromptGenius: 프롬프트 삽입" 또는 패널의 삽입 버튼으로 현재 페이지 입력란에 넣음 |
| 언어 | 결과 언어 한국어/영어/일본어/중국어 선택 |

## 지원하는 AI 연결

| 방식 | 기본 주소 | 비고 |
| --- | --- | --- |
| Claude API | `https://api.anthropic.com` | API 키 필요 |
| Ollama | `http://localhost:11434` | 기본 모델 `qwen2.5:3b`, 연결 테스트 버튼 있음 |
| LM Studio | `http://localhost:1234` | OpenAI 호환 |
| Jan | `http://localhost:1337` | OpenAI 호환 |
| llama.cpp | `http://localhost:8080` | OpenAI 호환 |
| 커스텀 (Groq, OpenRouter, Together 등) | 직접 입력 | OpenAI 호환 `/v1/chat/completions`, API 키 입력 |

## 설치 방법 (개발자 모드)

1. 이 저장소를 내려받습니다.
2. 크롬 주소창에 `chrome://extensions` (Edge는 `edge://extensions`) 입력
3. 우측 상단 **개발자 모드** 켜기
4. **압축해제된 확장 프로그램을 로드합니다** → 이 폴더 선택
5. 툴바 아이콘을 누르면 사이드 패널이 열립니다. 설정 탭에서 연결 방식을 고르세요. (사이드 패널은 Chrome/Edge 116 이상)

## 폴더 구조

```
prompt-genius/
├── manifest.json     # 확장 프로그램 설정 (v2.9.1, 권한 목록)
├── background.js     # 서비스 워커: AI 호출, 저장소(IndexedDB), 메시지 처리, 우클릭 메뉴
├── content.js        # 웹페이지 입력란에 프롬프트 삽입
├── roles.js          # 카테고리·패턴·역할·모델·연결 안내 데이터 (여기만 고치면 전체 반영)
├── sidepanel.html/js # 메인 화면 (사이드 패널)
├── popup.html/js     # 예전 팝업 화면 (현재 manifest에 연결되지 않음)
└── icons/            # 아이콘 16/32/48/128
```

## 권한

| 권한 | 용도 |
| --- | --- |
| `storage` | 설정 저장 (`chrome.storage.sync`) |
| `contextMenus`, `activeTab`, `scripting` | 우클릭 삽입 |
| `clipboardWrite`, `clipboardRead` | 복사 |
| `sidePanel` | 사이드 패널 |
| 호스트 권한 | Anthropic, Groq, OpenRouter, Together, 로컬(localhost/127.0.0.1) |
| 콘텐츠 스크립트 | 모든 페이지(`<all_urls>`)에 `content.js` 로드 |

## 검증 상태

| 항목 | 결과 |
| --- | --- |
| JS 5개 파일 문법, `manifest.json` 형식 | 통과 |
| 화면이 보내는 메시지 17종 ↔ `background.js` 처리부 | 모두 대응 |
| `GENERATE_TEMPLATE` (Ollama 응답을 가짜로 대체) | 정상 응답, 패턴 6종 로드 확인 |
| 크롬에 실제 설치해 화면·삽입 동작 | **미확인** (이 환경에는 확장 프로그램을 올릴 크롬 UI가 없음) |
| 실제 Claude·Groq 등 외부 API 호출 | **미확인** (키 없음) |
| 저장소 안 비밀키 검색 | 없음 (API 키는 사용자가 설정 화면에서 입력) |

## 알아둘 점

- API 키는 `chrome.storage.sync`에 저장되어 로그인한 브라우저 계정으로 동기화될 수 있습니다.
- `popup.html`/`popup.js`는 manifest에서 쓰이지 않습니다. 사이드 패널만 쓸 거라면 정리해도 됩니다.
- 호스트 권한의 `https://openai.com/*`는 OpenAI API 주소(`api.openai.com`)와 달라서, OpenAI를 커스텀으로 붙이려면 `https://api.openai.com/*`를 추가해야 합니다.
- `background.js` 머리 주석은 v3.0, `manifest.json`은 2.9.1로 표기가 다릅니다.
