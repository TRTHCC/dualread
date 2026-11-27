'use strict';

const crypto = require('crypto');
const { marked } = require('marked');

marked.setOptions({ gfm: true, breaks: false });

function nonce() {
  return crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Markdown → HTML。渲染失败时退回转义后的纯文本，不让一个坏块弄垮整页。 */
function renderMarkdown(text) {
  try {
    return marked.parse(text);
  } catch {
    return `<pre>${escapeHtml(text)}</pre>`;
  }
}

/** 取标题块第一行的标题文字，去掉 # 标记和行尾的闭合 #。 */
function headingText(text) {
  const line = String(text).split('\n')[0] || '';
  return line.replace(/^\s{0,3}#{1,6}\s+/, '').replace(/\s+#+\s*$/, '');
}

/** ATX（# 标题）和 Setext（下一行 === / ---）的标题文字。 */
function headingSource(block) {
  if (block.kind === 'heading') return headingText(block.text);
  if (block.kind !== 'paragraph') return '';
  const lines = String(block.text).split('\n');
  if (lines.length >= 2 && /^\s{0,3}(?:=+|-+)\s*$/.test(lines[1])) return lines[0];
  return '';
}

/**
 * 按 GitHub 的习惯生成标题锚点：小写、去掉标点、空格换连字符。
 * 中文等非拉丁文字保留原样，不然 `#中文标题` 这类链接会失效。
 */
function anchorSlug(text) {
  const explicit = /\{#([^\s}]+)\}\s*$/.exec(String(text));
  if (explicit) return explicit[1];
  return String(text)
    .replace(/<[^>]*>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

const STYLE = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
  color: var(--vscode-foreground);
  background: var(--vscode-editor-background);
}
#bar {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; gap: 12px;
  padding: 8px 16px;
  background: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}
#bar .name { font-weight: 600; }
#bar .status { color: var(--vscode-descriptionForeground); font-size: 0.9em; flex: 1; }
#bar button {
  font: inherit; font-size: 0.9em;
  color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
  background: var(--vscode-button-secondaryBackground, transparent);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px; padding: 3px 10px; cursor: pointer;
}
#bar button:hover { background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground)); }
#err {
  display: none; margin: 12px 16px; padding: 10px 14px; border-radius: 4px;
  background: var(--vscode-inputValidation-errorBackground, rgba(255,0,0,.1));
  border: 1px solid var(--vscode-inputValidation-errorBorder, red);
  white-space: pre-wrap;
}
#err.show { display: block; }
/* 警告和报错分开：警告是「这么配跑不出好结果」，报错是「这次真的失败了」 */
#warn {
  display: none; margin: 12px 16px; padding: 10px 14px; border-radius: 4px;
  background: var(--vscode-inputValidation-warningBackground, rgba(255,180,0,.12));
  border: 1px solid var(--vscode-inputValidation-warningBorder, goldenrod);
  white-space: pre-wrap;
}
#warn.show { display: block; }
#doc { padding: 4px 16px 64px; }

.row { display: grid; gap: 0 32px; align-items: start; border-bottom: 1px solid transparent; scroll-margin-top: 52px; }
body.side-by-side .row { grid-template-columns: 1fr 1fr; }
body.stacked .row, body.translation-only .row { grid-template-columns: 1fr; }
body.stacked .row .t { padding-top: 0; }
body.translation-only .cell.original { display: none; }
body.translation-only .row[data-kind="frontmatter"],
body.translation-only .row[data-kind="linkdef"] { display: none; }
body.translation-only .cell.t { border-left: 0; padding-left: 0; margin-left: 0; }
.row.full { grid-template-columns: 1fr; }
.row:hover { background: var(--vscode-list-hoverBackground); }

.cell { min-width: 0; overflow-wrap: anywhere; }
.cell.t { color: var(--vscode-foreground); }
body.translation-only .jumpable .cell.t { cursor: pointer; }
body.translation-only .row.show-original .cell.original {
  display: block;
  padding: 0 0 10px;
  margin-bottom: 10px;
  border-bottom: 1px dashed var(--vscode-panel-border);
  color: var(--vscode-descriptionForeground);
}
body.translation-only .row.show-original .cell.original::before {
  content: "原文";
  display: block;
  font-size: 0.75em;
  letter-spacing: .05em;
  margin-bottom: 4px;
  color: var(--vscode-descriptionForeground);
}
body.side-by-side .cell.t { border-left: 1px solid var(--vscode-panel-border); padding-left: 32px; margin-left: -32px; }
.pending { color: var(--vscode-descriptionForeground); font-style: italic; opacity: .6; }
.failed { color: var(--vscode-descriptionForeground); font-style: italic; }

.cell :first-child { margin-top: .35em; }
.cell :last-child { margin-bottom: .35em; }
h1, h2, h3, h4, h5, h6 { line-height: 1.3; }
h1 { font-size: 1.7em; } h2 { font-size: 1.4em; } h3 { font-size: 1.15em; }
p, li { line-height: 1.65; }
a { color: var(--vscode-textLink-foreground); }
code {
  font-family: var(--vscode-editor-font-family); font-size: .92em;
  background: var(--vscode-textCodeBlock-background); padding: .15em .35em; border-radius: 3px;
}
pre {
  background: var(--vscode-textCodeBlock-background);
  padding: 12px 14px; border-radius: 4px; overflow-x: auto;
}
pre code { background: none; padding: 0; }
blockquote {
  margin: .5em 0; padding-left: 12px;
  border-left: 3px solid var(--vscode-textBlockQuote-border);
  color: var(--vscode-descriptionForeground);
}
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid var(--vscode-panel-border); padding: 5px 9px; text-align: left; }
hr { border: none; border-top: 1px solid var(--vscode-panel-border); margin: 1.2em 0; }
img { max-width: 100%; }
`;

const SCRIPT = `
const vscode = acquireVsCodeApi();
function scrollToAnchor(id) {
  if (!id) return;
  const target = document.getElementById(id);
  if (target) target.scrollIntoView({ block: 'start' });
}
window.addEventListener('message', (event) => {
  const msg = event.data;
  if (msg.type === 'translated') {
    const cell = document.getElementById('t' + msg.index);
    // 整个重设 class：失败过的格子重译成功后要把 failed 的灰斜体也摘掉
    if (cell) { cell.className = 'cell t'; cell.innerHTML = msg.html; }
  } else if (msg.type === 'failed') {
    const cell = document.getElementById('t' + msg.index);
    if (cell) { cell.className = 'cell t failed'; cell.textContent = msg.text; }
  } else if (msg.type === 'status') {
    document.getElementById('status').textContent = msg.text;
  } else if (msg.type === 'error') {
    const box = document.getElementById('err');
    box.textContent = msg.message;
    box.classList.add('show');
  } else if (msg.type === 'warning') {
    // 空字符串 = 这次没问题，把上一次的警告收起来
    const box = document.getElementById('warn');
    box.textContent = msg.message || '';
    box.classList.toggle('show', !!msg.message);
  } else if (msg.type === 'clearError') {
    document.getElementById('err').classList.remove('show');
  } else if (msg.type === 'layout') {
    document.body.className = msg.layout;
    document.querySelectorAll('.row.show-original').forEach(row => row.classList.remove('show-original'));
  } else if (msg.type === 'scrollToAnchor') {
    scrollToAnchor(msg.id);
  }
});
document.getElementById('refresh').addEventListener('click', () => vscode.postMessage({ type: 'refresh' }));
document.getElementById('toggle').addEventListener('click', () => vscode.postMessage({ type: 'toggleLayout' }));

// 标题锚点在本页滚动；点译文在面板内展开原文，不改动左侧编辑器。选区和链接优先。
document.getElementById('doc').addEventListener('click', (event) => {
  if (!event.target.closest) return;
  const link = event.target.closest('a');
  if (link) {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('#')) {
      event.preventDefault();
      if (href === '#') {
        window.scrollTo({ top: 0 });
        return;
      }
      let id = href.slice(1);
      try { id = decodeURIComponent(id); } catch {}
      scrollToAnchor(id);
      return;
    }
    // 相对 Markdown 链接（可带锚点）交给扩展端，在同一面板打开目标文档
    const pathPart = href.split(/[?#]/)[0].toLowerCase();
    const relative = !/^[a-z][a-z0-9+.-]*:/i.test(href) && !href.startsWith('//');
    if (relative && (pathPart.endsWith('.md') || pathPart.endsWith('.markdown'))) {
      event.preventDefault();
      vscode.postMessage({ type: 'openDocLink', href });
    }
    return;
  }
  if (window.getSelection && String(window.getSelection()).trim()) return;
  if (!document.body.classList.contains('translation-only')) return;
  const cell = event.target.closest('.cell.t');
  const row = cell && cell.closest('.row.jumpable');
  if (row) row.classList.toggle('show-original');
});

// 监听器已挂好，扩展端可以开始发消息了。
// 重新赋值 webview.html 会让这份文档整个重来，在新的监听器注册之前
// postMessage 的内容会被静默丢弃——所以必须等这一声再发。
vscode.postMessage({ type: 'ready' });
`;

/**
 * 构建整页骨架：原文立即可读，译文槽位先占位，翻译完成后逐块填入。
 */
function buildHtml({ cspSource, title, blocks, layout, targetLanguage }) {
  const n = nonce();
  const usedAnchors = new Set();
  const anchorOf = (block) => {
    const base = anchorSlug(headingSource(block));
    if (!base) return '';
    let slug = base;
    let n = 0;
    while (usedAnchors.has(slug)) slug = `${base}-${++n}`;
    usedAnchors.add(slug);
    return ` id="${escapeHtml(slug)}"`;
  };
  const rows = blocks.map(block => {
    const left = renderMarkdown(block.text);
    const anchor = anchorOf(block);
    if (!block.translatable) {
      return `<div class="row full"${anchor} data-kind="${block.kind}"><div class="cell original">${left}</div></div>`;
    }
    return `<div class="row jumpable"${anchor} data-kind="${block.kind}" data-index="${block.index}">` +
      `<div class="cell original">${left}</div>` +
      `<div class="cell t pending" id="t${block.index}" title="点击展开原文">翻译中…</div>` +
      `</div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource}; script-src 'nonce-${n}';">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body class="${escapeHtml(layout)}">
<div id="bar">
  <span class="name">${escapeHtml(title)}</span>
  <span class="status" id="status">准备翻译成${escapeHtml(targetLanguage)}…</span>
  <button id="toggle">切换布局</button>
  <button id="refresh">重新翻译</button>
</div>
<div id="warn"></div>
<div id="err"></div>
<div id="doc">
${rows}
</div>
<script nonce="${n}">${SCRIPT}</script>
</body>
</html>`;
}

module.exports = { buildHtml, renderMarkdown, escapeHtml };
