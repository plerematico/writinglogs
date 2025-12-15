const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

let wordCount;
let saveStatus;
let zoom;
let titleInput;
let pageStack;
let newDocBtn;
let downloadDocxBtn;
let downloadPdfBtn;

const getEditors = () => Array.from(document.querySelectorAll('.editor'));

const disableCheckers = (nodes) => {
  const attributes = [
    ['spellcheck', 'false'],
    ['autocorrect', 'off'],
    ['autocapitalize', 'off'],
    ['data-enable-grammarly', 'false'],
    ['data-gramm_editor', 'false'],
    ['data-gramm', 'false'],
    ['data-lt-active', 'false'],
  ];
  nodes.forEach((node) => {
    attributes.forEach(([attr, value]) => node.setAttribute(attr, value));
    if ('spellcheck' in node) node.spellcheck = false;
    if ('autocorrect' in node) node.autocorrect = 'off';
    if ('autocapitalize' in node) node.autocapitalize = 'off';
  });
};

const activeEditor = () => {
  const selection = document.getSelection();
  const anchor = selection && selection.anchorNode;
  if (anchor) {
    const target = anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor;
    const editor = target ? target.closest('.editor') : null;
    if (editor) return editor;
  }
  return getEditors()[getEditors().length - 1];
};

const updateWordCount = () => {
  const text = getEditors()
    .map((ed) => ed.innerText.trim())
    .filter(Boolean)
    .join(' ');
  const count = text ? text.split(/\s+/).length : 0;
  wordCount.textContent = `${count} word${count === 1 ? '' : 's'}`;
};

const flashSaved = (message = 'Saved just now') => {
  saveStatus.textContent = message;
  saveStatus.classList.add('pulse');
  setTimeout(() => saveStatus.classList.remove('pulse'), 800);
};

const placeCaretAtEnd = (element) => {
  const range = document.createRange();
  const selection = window.getSelection();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  element.focus();
};

const setZoom = (factor) => {
  Array.from(document.querySelectorAll('.page')).forEach((page) => {
    page.style.transform = `scale(${factor})`;
    page.style.width = `${A4_WIDTH}px`;
    page.style.height = `${A4_HEIGHT}px`;
  });
  zoom.value = String(factor);
};

const createPage = (initialHTML = '<p><br /></p>') => {
  const pageCount = document.querySelectorAll('.page').length + 1;
  const page = document.createElement('div');
  page.className = 'page';
  page.dataset.page = pageCount;

  const editor = document.createElement('div');
  editor.className = 'editor';
  editor.contentEditable = 'true';
  editor.innerHTML = initialHTML;

  page.append(editor);
  pageStack.append(page);

  disableCheckers([document.body, titleInput, editor]);
  bindEditor(editor);
  return editor;
};

const trimExtraPages = () => {
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
    page.dataset.page = index + 1;
  });
};

const ensurePlaceholder = (editor) => {
  if (!editor.innerText.trim()) {
    editor.innerHTML = '<p><br /></p>';
  }
};

const splitOverflow = (editor) => {
  const maxHeight = editor.clientHeight;
  let current = editor;
  while (current.scrollHeight > maxHeight + 2) {
    if (current.childNodes.length <= 1) {
      const loneNode = current.firstChild;
      if (!loneNode) break;
      const newEditor = createPage();
      newEditor.appendChild(loneNode);
      ensurePlaceholder(current);
      current = newEditor;
      break;
    }
    const lastNode = current.lastChild;
    if (!lastNode) break;
    const newEditor = createPage();
    newEditor.insertBefore(lastNode, newEditor.firstChild);
    ensurePlaceholder(current);
    current = newEditor;
  }
  return current;
};

const handleEditorInput = (event) => {
  const editor = event.currentTarget;
  const finalEditor = splitOverflow(editor);
  trimExtraPages();
  flashSaved('Saved');
  updateWordCount();
  if (finalEditor !== editor) placeCaretAtEnd(finalEditor);
};

const isNearBottom = (editor) => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;
  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getBoundingClientRect();
  const hostRect = editor.getBoundingClientRect();
  return rect.bottom >= hostRect.bottom - 36;
};

const handleEditorKeydown = (event) => {
  const editor = event.currentTarget;
  if (!event.ctrlKey && event.key === 'Enter' && isNearBottom(editor)) {
    event.preventDefault();
    const newEditor = createPage();
    placeCaretAtEnd(newEditor);
    updateWordCount();
    return;
  }
  if (event.ctrlKey && event.key === 'Enter') {
    event.preventDefault();
    const newEditor = createPage('<p><br /></p>');
    placeCaretAtEnd(newEditor);
  }
};

const bindEditor = (editor) => {
  editor.addEventListener('input', handleEditorInput);
  editor.addEventListener('keyup', updateWordCount);
  editor.addEventListener('keydown', handleEditorKeydown);
};

const exec = (command) => {
  const editor = activeEditor();
  document.execCommand(command, false, null);
  editor.focus();
  flashSaved();
  updateWordCount();
  document.querySelectorAll('.menu-panel').forEach((panel) => (panel.style.display = 'none'));
  document.querySelectorAll('.menu-trigger').forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
};

const bindToolbar = () => {
  document.querySelectorAll('[data-command]').forEach((btn) => {
    btn.addEventListener('click', () => exec(btn.dataset.command));
  });
};

const bindZoom = () => {
  zoom.addEventListener('change', (event) => {
    const factor = Number(event.target.value);
    setZoom(factor);
  });
};

const bindTitle = () => {
  let timeout;
  titleInput.addEventListener('input', () => {
    clearTimeout(timeout);
    document.title = titleInput.value || 'Untitled document';
    saveStatus.textContent = 'Saving…';
    timeout = setTimeout(() => flashSaved('Saved just now'), 600);
  });
};

const resetDocument = () => {
  pageStack.innerHTML = '';
  createPage();
  titleInput.value = 'Untitled document';
  document.title = titleInput.value;
  setZoom(1);
  updateWordCount();
  flashSaved('Cleared');
  placeCaretAtEnd(activeEditor());
};

const exportDocx = () => {
  const content = getEditors()
    .map((editor) => `<div style="page-break-after: always;">${editor.innerHTML}</div>`)
    .join('');
  const converted = window.htmlDocx.asBlob(
    `<html><head><meta charset="utf-8"></head><body>${content}</body></html>`
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(converted);
  a.download = `${titleInput.value || 'document'}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
};

const exportPdf = async () => {
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
};

const bindMenus = () => {
  const menuButtons = document.querySelectorAll('.menu-trigger');
  const panels = document.querySelectorAll('.menu-panel');

  const closeMenus = () => {
    panels.forEach((panel) => (panel.style.display = 'none'));
    menuButtons.forEach((btn) => btn.setAttribute('aria-expanded', 'false'));
  };

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
};

const bindActions = () => {
  newDocBtn.addEventListener('click', resetDocument);
  downloadDocxBtn.addEventListener('click', exportDocx);
  downloadPdfBtn.addEventListener('click', exportPdf);
};

const init = () => {
  wordCount = document.getElementById('word-count');
  saveStatus = document.getElementById('save-status');
  zoom = document.getElementById('page-zoom');
  titleInput = document.getElementById('doc-title');
  pageStack = document.getElementById('page-stack');
  newDocBtn = document.getElementById('new-doc');
  downloadDocxBtn = document.getElementById('download-docx');
  downloadPdfBtn = document.getElementById('download-pdf');

  disableCheckers([document.documentElement, document.body, titleInput, ...getEditors()]);
  bindToolbar();
  bindZoom();
  bindMenus();
  bindTitle();
  bindActions();
  getEditors().forEach(bindEditor);
  updateWordCount();
  setZoom(1);
  placeCaretAtEnd(activeEditor());
  setInterval(updateWordCount, 1000);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
