const wordCount = document.getElementById('word-count');
const saveStatus = document.getElementById('save-status');
const zoom = document.getElementById('page-zoom');
const titleInput = document.getElementById('doc-title');
const pageStack = document.getElementById('page-stack');
const newDocBtn = document.getElementById('new-doc');
const downloadDocxBtn = document.getElementById('download-docx');
const downloadPdfBtn = document.getElementById('download-pdf');

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

function getEditors() {
  return Array.from(document.querySelectorAll('.editor'));
}

function activeEditor() {
  const selection = document.getSelection();
  const node = selection && selection.anchorNode ? selection.anchorNode : null;
  if (node) {
    const target = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const editor = target ? target.closest('.editor') : null;
    if (editor) return editor;
  }
  return getEditors()[0];
}

function updateWordCount() {
  const text = getEditors()
    .map((ed) => ed.innerText.trim())
    .filter(Boolean)
    .join(' ');
  const count = text ? text.split(/\s+/).length : 0;
  wordCount.textContent = `${count} word${count === 1 ? '' : 's'}`;
}

function flashSaved(message = 'Saved just now') {
  saveStatus.textContent = message;
  saveStatus.classList.add('pulse');
  setTimeout(() => saveStatus.classList.remove('pulse'), 800);
}

function exec(command) {
  const editor = activeEditor();
  document.execCommand(command, false, null);
  editor.focus();
  flashSaved();
  updateWordCount();
  document.querySelectorAll('.menu-panel').forEach((panel) => (panel.style.display = 'none'));
  document.querySelectorAll('.menu-trigger').forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
}

function bindToolbar() {
  document.querySelectorAll('[data-command]').forEach((btn) => {
    btn.addEventListener('click', () => exec(btn.dataset.command));
  });
}

function setZoom(factor) {
  Array.from(document.querySelectorAll('.page')).forEach((page) => {
    page.style.transform = `scale(${factor})`;
    page.style.width = `${A4_WIDTH / factor}px`;
    page.style.height = `${A4_HEIGHT / factor}px`;
  });
  zoom.value = String(factor);
}

function bindZoom() {
  zoom.addEventListener('change', (event) => {
    const factor = Number(event.target.value);
    setZoom(factor);
  });
}

function bindTitle() {
  let timeout;
  titleInput.addEventListener('input', () => {
    clearTimeout(timeout);
    document.title = titleInput.value || 'Untitled document';
    saveStatus.textContent = 'Saving…';
    timeout = setTimeout(() => flashSaved('Saved just now'), 600);
  });
}

function disableCheckers(nodeList) {
  const attributes = [
    ['spellcheck', 'false'],
    ['autocorrect', 'off'],
    ['autocapitalize', 'off'],
    ['data-enable-grammarly', 'false'],
    ['data-gramm_editor', 'false'],
    ['data-gramm', 'false'],
    ['data-lt-active', 'false'],
  ];
  nodeList.forEach((node) => {
    attributes.forEach(([attr, value]) => node.setAttribute(attr, value));
    if (Object.prototype.hasOwnProperty.call(node, 'spellcheck')) node.spellcheck = false;
    if (Object.prototype.hasOwnProperty.call(node, 'autocorrect')) node.autocorrect = 'off';
    if (Object.prototype.hasOwnProperty.call(node, 'autocapitalize')) node.autocapitalize = 'off';
  });
}

function createPage(initialHTML = '<p><br /></p>') {
  const pageCount = document.querySelectorAll('.page').length + 1;
  const page = document.createElement('div');
  page.className = 'page';
  page.dataset.page = pageCount;

  const meta = document.createElement('div');
  meta.className = 'page-meta';
  meta.textContent = `Page ${pageCount} — 👁️ Editing`;

  const editor = document.createElement('div');
  editor.className = 'editor';
  editor.contentEditable = 'true';
  editor.innerHTML = initialHTML;

  page.append(meta, editor);
  pageStack.append(page);

  bindEditor(editor);
  disableCheckers([document.body, titleInput, editor]);
  return editor;
}

function trimExtraPages() {
  const pages = Array.from(document.querySelectorAll('.page'));
  for (let i = pages.length - 1; i > 0; i -= 1) {
    const editor = pages[i].querySelector('.editor');
    const prevEditor = pages[i - 1].querySelector('.editor');
    if (!editor.innerText.trim() && !prevEditor.innerText.trim()) {
      pages[i].remove();
    } else {
      break;
    }
  }
  Array.from(document.querySelectorAll('.page')).forEach((page, index) => {
    const meta = page.querySelector('.page-meta');
    meta.textContent = `Page ${index + 1} — 👁️ Editing`;
    page.dataset.page = index + 1;
  });
}

function splitOverflow(editor) {
  const maxHeight = editor.clientHeight;
  while (editor.scrollHeight > maxHeight + 2) {
    const lastNode = editor.lastChild;
    if (!lastNode) break;
    const newEditor = createPage('');
    newEditor.prepend(lastNode);
    editor = newEditor;
  }
}

function handleEditorInput(event) {
  const editor = event.currentTarget;
  splitOverflow(editor);
  trimExtraPages();
  flashSaved('Saved');
  updateWordCount();
}

function handleEditorKeydown(event) {
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    const newEditor = createPage('');
    newEditor.focus();
  }
}

function bindEditor(editor) {
  editor.addEventListener('input', handleEditorInput);
  editor.addEventListener('keydown', handleEditorKeydown);
}

function resetDocument() {
  pageStack.innerHTML = '';
  createPage('');
  titleInput.value = 'Untitled document';
  document.title = titleInput.value;
  setZoom(1);
  updateWordCount();
  flashSaved('Cleared');
  activeEditor().focus();
}

function exportDocx() {
  const content = getEditors()
    .map((editor) => `<div style="page-break-after: always;">${editor.innerHTML}</div>`)
    .join('');
  const converted = window.htmlDocx.asBlob(`<html><head><meta charset="utf-8"></head><body>${content}</body></html>`);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(converted);
  a.download = `${titleInput.value || 'document'}.docx`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'px', format: [A4_WIDTH, A4_HEIGHT] });
  const editors = getEditors();

  for (let i = 0; i < editors.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await doc.html(editors[i], {
      x: 40,
      y: 40,
      html2canvas: { scale: 0.8 },
    });
    if (i < editors.length - 1) {
      doc.addPage([A4_WIDTH, A4_HEIGHT], 'p');
    }
  }

  doc.save(`${titleInput.value || 'document'}.pdf`);
}

function bindMenus() {
  const menuButtons = document.querySelectorAll('.menu-trigger');
  const panels = document.querySelectorAll('.menu-panel');

  function closeMenus() {
    panels.forEach((panel) => (panel.style.display = 'none'));
    menuButtons.forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
  }

  menuButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const menuId = `menu-${button.dataset.menu}`;
      const panel = document.getElementById(menuId);
      const isOpen = panel.style.display === 'block';
      closeMenus();
      panel.style.display = isOpen ? 'none' : 'block';
      button.setAttribute('aria-expanded', (!isOpen).toString());
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.menu')) closeMenus();
  });

  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'new-doc') resetDocument();
      if (action === 'download-docx') exportDocx();
      if (action === 'download-pdf') exportPdf();
      if (action === 'zoom-90') setZoom(0.9);
      if (action === 'zoom-100') setZoom(1);
      if (action === 'zoom-110') setZoom(1.1);
      closeMenus();
    });
  });
}

function bindActions() {
  newDocBtn.addEventListener('click', resetDocument);
  downloadDocxBtn.addEventListener('click', exportDocx);
  downloadPdfBtn.addEventListener('click', exportPdf);
}

function init() {
  disableCheckers([document.documentElement, document.body, titleInput, ...getEditors()]);
  bindToolbar();
  bindZoom();
  bindMenus();
  bindTitle();
  bindActions();
  getEditors().forEach(bindEditor);
  updateWordCount();
  setZoom(1);
  activeEditor().focus();
}

init();
