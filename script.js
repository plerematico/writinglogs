const editor = document.getElementById('editor');
const wordCount = document.getElementById('word-count');
const saveStatus = document.getElementById('save-status');
const zoom = document.getElementById('page-zoom');
const page = document.getElementById('page');
const titleInput = document.getElementById('doc-title');

function updateWordCount() {
  const text = editor.innerText.trim();
  const count = text ? text.split(/\s+/).length : 0;
  wordCount.textContent = `${count} word${count === 1 ? '' : 's'}`;
}

function flashSaved() {
  saveStatus.textContent = 'Saved just now';
  saveStatus.classList.add('pulse');
  setTimeout(() => saveStatus.classList.remove('pulse'), 800);
}

function exec(command) {
  document.execCommand(command, false, null);
  editor.focus();
  flashSaved();
  updateWordCount();
}

function bindToolbar() {
  document.querySelectorAll('[data-command]').forEach((btn) => {
    btn.addEventListener('click', () => exec(btn.dataset.command));
  });
}

function bindZoom() {
  zoom.addEventListener('change', (event) => {
    const factor = Number(event.target.value);
    page.style.transform = `scale(${factor})`;
    page.style.width = `${816 / factor}px`;
  });
}

function bindTitle() {
  let timeout;
  titleInput.addEventListener('input', () => {
    clearTimeout(timeout);
    saveStatus.textContent = 'Saving…';
    timeout = setTimeout(flashSaved, 600);
  });
}

function disableCheckers() {
  const attributes = ['spellcheck', 'autocorrect', 'autocapitalize', 'data-enable-grammarly', 'data-gramm_editor'];
  [document.body, editor, titleInput].forEach((node) => {
    attributes.forEach((attr) => node.setAttribute(attr, attr === 'data-gramm_editor' ? 'false' : 'off'));
  });
}

function init() {
  bindToolbar();
  bindZoom();
  bindTitle();
  disableCheckers();
  updateWordCount();
  editor.focus();
}

init();
