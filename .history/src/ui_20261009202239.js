// ============================================================
// 悬浮面板 UI（内容脚本侧）
// ============================================================

import { saveConfig } from './config.js';
import { getAllFontOptions, saveCustomFont, readFontFile } from './fonts.js';
import { extractFromPage } from './extractor.js';
import {
  buildSettingsFormHTML,
  applyFormValues,
  attachSettingsFormHandlers,
} from './settings-form.js';

const PANEL_CSS = `
.fb-panel {
  position: fixed; top: 16px; right: 16px; width: 360px;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 2px;
  box-shadow: 0 2px 6px rgba(0,0,0,.12);
  z-index: 999999;
  font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  color: #222;
  display: flex; flex-direction: column;
  max-height: calc(100vh - 32px);
  overflow: hidden;
}
.fb-panel.dragging { cursor: move; }

.fb-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 10px;
  background: #333; color: #eee;
  font-size: 13px;
  cursor: move; user-select: none;
}
.fb-panel-minimize {
  cursor: pointer; font-size: 14px; line-height: 1;
  padding: 0 4px; color: #ccc;
}
.fb-panel-minimize:hover { color: #fff; }

.fb-panel-tabs {
  display: flex;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}
.fb-tab {
  flex: 1; text-align: center;
  padding: 6px 10px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.fb-tab:hover { color: #000; }
.fb-tab.active {
  color: #000;
  border-bottom-color: #333;
  background: #fff;
}

.fb-panel-body { overflow: hidden; display: flex; flex-direction: column; }
.fb-panel.minimized .fb-panel-body,
.fb-panel.minimized .fb-panel-tabs { display: none; }
.fb-tab-content { display: none; padding: 10px; overflow-y: auto; }
.fb-tab-content.active { display: block; }
.fb-tab-content[data-content="settings"] { max-height: 70vh; }

#fb-generate-btn {
  display: block; width: 100%;
  padding: 6px 12px;
  font-size: 13px;
  color: #fff;
  background: #333;
  border: 1px solid #333;
  border-radius: 2px;
  cursor: pointer;
}
#fb-generate-btn:hover { background: #000; border-color: #000; }
#fb-generate-btn:active { background: #000; }

.fb-settings-actions {
  display: flex; gap: 6px;
  padding: 8px 0 0 0;
  background: #fff;
  position: sticky; bottom: 0;
  border-top: 1px solid #eee;
}
.fb-settings-actions .fb-mini-btn { flex: 1; }

.fb-form-group { margin-bottom: 8px; }
.fb-form-group > label {
  display: block;
  font-size: 12px;
  color: #555;
  margin-bottom: 3px;
}
.fb-form-group input[type="number"],
.fb-form-group input[type="text"],
.fb-form-group select {
  display: block;
  width: 100%;
  padding: 3px 6px;
  font-size: 12px;
  color: #222;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 2px;
  box-sizing: border-box;
}
.fb-form-group input:focus,
.fb-form-group select:focus {
  border-color: #666;
  outline: none;
}

.fb-row { display: flex; gap: 4px; }
.fb-row select { flex: 1; }

.fb-mini-btn {
  display: inline-block;
  padding: 3px 8px;
  font-size: 12px;
  color: #222;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 2px;
  cursor: pointer;
  white-space: nowrap;
}
.fb-mini-btn:hover { background: #e0e0e0; }
.fb-mini-btn:active { background: #d0d0d0; }

.fb-checkbox {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px;
  color: #222;
  cursor: pointer;
}
.fb-checkbox input[type="checkbox"] {
  width: 13px; height: 13px;
  margin: 0;
}

.fb-margin-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.fb-panel details {
  border: 1px solid #e0e0e0;
  border-radius: 2px;
  padding: 0;
  margin-bottom: 8px;
  background: #fff;
}
.fb-panel details summary {
  cursor: pointer;
  font-size: 12px;
  color: #222;
  padding: 5px 8px;
  list-style: none;
  user-select: none;
  background: #fafafa;
  border-left: 3px solid #bbb;
}
.fb-panel details summary:hover { background: #f0f0f0; }
.fb-panel details summary::-webkit-details-marker { display: none; }
.fb-panel details[open] summary {
  border-bottom: 1px solid #e0e0e0;
  border-left-color: #333;
}
.fb-panel details > *:not(summary) {
  padding: 0 8px;
}
.fb-panel details > *:first-of-type:not(summary) { padding-top: 8px; }
.fb-panel details > *:last-child { padding-bottom: 8px; }
`;

const PANEL_HTML = `
<div id="fb-pdf-panel" class="fb-panel">
  <div class="fb-panel-header" id="fb-panel-drag">
    <span>粉笔试卷导出</span>
    <span class="fb-panel-minimize" id="fb-panel-minimize">—</span>
  </div>
  <div class="fb-panel-tabs">
    <div class="fb-tab active" data-tab="input">输入</div>
    <div class="fb-tab" data-tab="settings">设置</div>
  </div>
  <div class="fb-panel-body">
    <div class="fb-tab-content active" data-content="input">
      <button id="fb-generate-btn">重新排版本试卷</button>
    </div>
    <div class="fb-tab-content" data-content="settings">
      <div class="fb-settings-scroll" id="fb-settings-scroll"></div>
    </div>
  </div>
</div>
`;

export function injectPanel(opts) {
  const { config, onGenerate } = opts;

  const styleEl = document.createElement('style');
  styleEl.textContent = PANEL_CSS;
  document.head.appendChild(styleEl);

  const wrap = document.createElement('div');
  wrap.innerHTML = PANEL_HTML;
  document.body.appendChild(wrap.firstElementChild);

  const panel = document.getElementById('fb-pdf-panel');

  (function setupDrag() {
    const dragHandle = document.getElementById('fb-panel-drag');
    let dragging = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    dragHandle.addEventListener('mousedown', (e) => {
      if (e.target.id === 'fb-panel-minimize') return;
      e.preventDefault();
      const rect = panel.getBoundingClientRect();
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.right = 'auto';

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      panel.classList.add('dragging');
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      let newLeft = startLeft + (e.clientX - startX);
      let newTop = startTop + (e.clientY - startY);
      const rect = panel.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width;
      const maxTop = window.innerHeight - rect.height;
      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      panel.classList.remove('dragging');
      document.body.style.userSelect = '';
    });
  })();

  let isMinimized = false;
  document.getElementById('fb-panel-minimize').addEventListener('click', () => {
    isMinimized = !isMinimized;
    panel.classList.toggle('minimized', isMinimized);
    document.getElementById('fb-panel-minimize').textContent = isMinimized ? '+' : '—';
  });

  document.querySelectorAll('.fb-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.fb-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.fb-tab-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.querySelector(`.fb-tab-content[data-content="${tab.dataset.tab}"]`);
      if (target) target.classList.add('active');
    });
  });

  const settingsScroll = document.getElementById('fb-settings-scroll');

  function rebuildSettingsForm() {
    settingsScroll.innerHTML = buildSettingsFormHTML(getAllFontOptions(), config);
    applyFormValues(settingsScroll, config);
    attachSettingsFormHandlers({
      root: settingsScroll,
      config,
      onChange: async (k, v, meta) => {
        await saveConfig();
        if (meta.isPageSize) rebuildSettingsForm();
      },
    });
  }

  settingsScroll.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-upload-font]');
    if (!btn) return;
    const key = btn.dataset.uploadFont;
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.ttf,.otf,.woff,.woff2';
    inp.onchange = async () => {
      const file = inp.files[0];
      if (!file) return;
      const name = file.name.replace(/\.[^.]+$/, '');
      try {
        const dataUrl = await readFontFile(file);
        await saveCustomFont(name, dataUrl);
        config.settings[config.activePageSize][key] = name;
        await saveConfig();
        rebuildSettingsForm();
      } catch (err) {
        alert('字体保存失败：' + err.message);
      }
    };
    inp.click();
  });

  rebuildSettingsForm();

  document.getElementById('fb-generate-btn').addEventListener('click', () => {
    let data;
    try {
      data = extractFromPage();
    } catch (e) {
      console.error('[fenbi-pdf] 提取失败：', e);
      alert('提取失败：' + e.message);
      return;
    }
    if (!data.items || data.items.length === 0) {
      alert('当前页面未提取到任何题目，请确认你在粉笔做题页。');
      return;
    }
    console.log('[fenbi-pdf] 已提取 ' + data.items.length + ' 条 item');
    onGenerate(JSON.stringify(data));
  });

  return { rebuildSettingsForm };
}