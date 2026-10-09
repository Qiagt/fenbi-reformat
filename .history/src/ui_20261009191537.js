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
  position: fixed; top: 20px; right: 20px; width: 380px;
  background: #fff; border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
  z-index: 999999;
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden; display: flex; flex-direction: column;
  max-height: calc(100vh - 40px);
}
.fb-panel.dragging { cursor: move; }
.fb-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 15px; background: #4f46e5; color: #fff;
  font-size: 14px; font-weight: bold;
  cursor: move; user-select: none;
}
.fb-panel-minimize {
  cursor: pointer; font-size: 18px; line-height: 1; user-select: none;
}
.fb-panel-tabs {
  display: flex; background: #f3f4f6; border-bottom: 1px solid #e5e7eb;
}
.fb-tab {
  flex: 1; text-align: center; padding: 8px; font-size: 13px;
  cursor: pointer; color: #6b7280;
}
.fb-tab.active {
  background: #fff; color: #4f46e5; font-weight: bold;
  border-bottom: 2px solid #4f46e5;
}
.fb-panel-body { overflow: hidden; display: flex; flex-direction: column; }
.fb-panel.minimized .fb-panel-body,
.fb-panel.minimized .fb-panel-tabs { display: none; }
.fb-tab-content { display: none; padding: 12px 15px; overflow-y: auto; }
.fb-tab-content.active { display: block; }
.fb-tab-content[data-content="settings"] { max-height: 70vh; padding-bottom: 0; }

#fb-generate-btn, .fb-settings-actions button {
  width: 100%; padding: 8px 12px;
  background: #4f46e5; color: #fff; border: none; border-radius: 4px;
  cursor: pointer; font-size: 14px; font-weight: bold;
}
#fb-generate-btn:hover, .fb-settings-actions button:hover { background: #4338ca; }
.fb-settings-actions {
  display: flex; gap: 8px; padding: 10px 0;
  background: #fff; position: sticky; bottom: 0;
}
.fb-settings-actions button { background: #6b7280; }
.fb-settings-actions button:hover { background: #4b5563; }
.fb-form-group { margin-bottom: 10px; }
.fb-form-group > label {
  display: block; font-size: 12px; color: #374151; margin-bottom: 4px;
}
.fb-form-group input[type="number"],
.fb-form-group select {
  width: 100%; padding: 5px 8px;
  border: 1px solid #d1d5db; border-radius: 4px;
  font-size: 13px; box-sizing: border-box;
}
.fb-row { display: flex; gap: 6px; }
.fb-row select { flex: 1; }
.fb-mini-btn {
  padding: 5px 10px; background: #6b7280; color: #fff;
  border: none; border-radius: 4px; cursor: pointer;
  font-size: 12px; white-space: nowrap;
}
.fb-mini-btn:hover { background: #4b5563; }
.fb-checkbox { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.fb-margin-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.fb-panel details {
  margin-bottom: 12px;
  border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px;
}
.fb-panel details summary {
  cursor: pointer; font-size: 13px; font-weight: bold;
  color: #4f46e5; padding: 2px 0;
}
.fb-panel details[open] summary {
  margin-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 6px;
}
`;

const PANEL_HTML = `
<div id="fb-pdf-panel" class="fb-panel">
  <div class="fb-panel-header" id="fb-panel-drag">
    <span>📄 粉笔试卷导出</span>
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

  // 拖拽
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

  // 折叠
  let isMinimized = false;
  document.getElementById('fb-panel-minimize').addEventListener('click', () => {
    isMinimized = !isMinimized;
    panel.classList.toggle('minimized', isMinimized);
    document.getElementById('fb-panel-minimize').textContent = isMinimized ? '+' : '—';
  });

  // tab 切换
  document.querySelectorAll('.fb-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.fb-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.fb-tab-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.querySelector(`.fb-tab-content[data-content="${tab.dataset.tab}"]`);
      if (target) target.classList.add('active');
    });
  });

  // 设置表单
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

  // 生成按钮
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