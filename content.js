// PromptGenius content.js — DOM 주입 스크립트 (빌드 불필요)

function findActiveInput() {
  const focused = document.activeElement;
  if (focused instanceof HTMLTextAreaElement) return focused;
  if (focused instanceof HTMLInputElement && ['text','search','email','url'].includes(focused.type)) return focused;
  if (focused instanceof HTMLElement && focused.isContentEditable) return focused;
  return (
    document.querySelector('textarea:not([disabled]):not([readonly])') ||
    document.querySelector('[contenteditable="true"]') ||
    document.querySelector('[role="textbox"]') ||
    document.querySelector('input[type="text"]:not([disabled])')
  );
}

function injectText(target, text) {
  target.focus();
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const start = target.selectionStart ?? target.value.length;
    const end   = target.selectionEnd   ?? target.value.length;
    target.value = target.value.slice(0, start) + text + target.value.slice(end);
    const setter = Object.getOwnPropertyDescriptor(
      target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'
    )?.set;
    if (setter) setter.call(target, target.value);
    target.dispatchEvent(new InputEvent('input', { bubbles:true, cancelable:true }));
    target.dispatchEvent(new Event('change', { bubbles:true }));
    target.setSelectionRange(start + text.length, start + text.length);
    return true;
  }
  if (target.isContentEditable) {
    const sel = window.getSelection();
    if (sel?.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    } else {
      target.textContent += text;
    }
    target.dispatchEvent(new InputEvent('input', { bubbles:true }));
    return true;
  }
  return false;
}

function showToast(msg, type = 'success') {
  document.getElementById('pg-toast')?.remove();
  const t = document.createElement('div');
  t.id = 'pg-toast';
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:2147483647;padding:12px 20px;
    border-radius:10px;font-family:-apple-system,sans-serif;font-size:13px;font-weight:500;
    color:#fff;background:${type==='success'?'#1D9E75':'#E24B4A'};
    box-shadow:0 4px 16px rgba(0,0,0,.18);transition:opacity .3s;pointer-events:none;max-width:320px;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 2500);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'INJECT_PROMPT') return false;
  const { promptText, targetSelector } = message.payload;
  const target = (targetSelector && document.querySelector(targetSelector)) || findActiveInput();
  if (!target) {
    showToast('❌ 입력란을 찾을 수 없습니다. 먼저 텍스트 입력란을 클릭하세요.', 'error');
    sendResponse({ success:false, error:'입력란 없음' });
    return false;
  }
  const ok = injectText(target, promptText);
  if (ok) {
    showToast('✅ 프롬프트가 삽입되었습니다!');
    sendResponse({ success:true });
  } else {
    showToast('❌ 삽입 실패', 'error');
    sendResponse({ success:false, error:'삽입 실패' });
  }
  return false;
});
