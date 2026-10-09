// ============================================================
// 预览页右侧设置侧栏
// ============================================================

import {
  buildSettingsFormHTML,
  applyFormValues,
  attachSettingsFormHandlers,
} from './settings-form.js';
import { getOverride as getOverrideForSidebar } from './image-overrides.js';

const SIDEBAR_CSS = `
.fb-sidebar {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 320px;
  background: #fff;
  border-left: 1px solid #ccc;
  box-shadow: -1px 0 4px rgba(0,0,0,.06);
  z-index: 100;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  color: #222;
  transition: transform .15s ease;
}
.fb-sidebar.collapsed { transform: translateX(320px); }

.fb-sidebar-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px;
  background: #333; color: #eee;
  font-size: 13px;
}
.fb-sidebar-toggle {
  cursor: pointer; user-select: none;
  padding: 0 4px;
  font-size: 14px; line-height: 1;
  color: #ccc;
}
.fb-sidebar-toggle:hover { color: #fff; }

.fb-sidebar-body {
  flex: 1; overflow-y: auto;
  padding: 10px 12px;
}

.fb-sidebar-handle {
  position: fixed;
  top: 50%; right: 0;
  transform: translateY(-50%);
  width: 24px; height: 56px;
  background: #333;
  color: #eee;
  border-top-left-radius: 2px;
  border-bottom-left-radius: 2px;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  z-index: 101;
}
.fb-sidebar.collapsed ~ .fb-sidebar-handle { display: flex; }

/* ---- 表单：左标签 右输入 ---- */
.fb-sidebar .fb-form-group {
  display: grid;
  grid-template-columns: 130px 1fr;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.fb-sidebar .fb-form-group > label {
  font-size: 12px;
  color: #555;
  margin: 0;
}
.fb-sidebar .fb-form-group input[type="number"],
.fb-sidebar .fb-form-group input[type="text"],
.fb-sidebar .fb-form-group select {
  width: 100%;
  padding: 3px 6px;
  font-size: 12px;
  color: #222;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 2px;
  box-sizing: border-box;
}
.fb-sidebar .fb-form-group input:focus,
.fb-sidebar .fb-form-group select:focus {
  border-color: #666;
  outline: none;
}

.fb-sidebar .fb-row { display: flex; gap: 4px; }
.fb-sidebar .fb-row select { flex: 1; }

.fb-sidebar .fb-mini-btn {
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
.fb-sidebar .fb-mini-btn:hover { background: #e0e0e0; }
.fb-sidebar .fb-mini-btn:active { background: #d0d0d0; }

.fb-sidebar .fb-checkbox {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px;
  color: #222;
  cursor: pointer;
  grid-column: 1 / -1;
}
.fb-sidebar .fb-checkbox input[type="checkbox"] {
  width: 13px; height: 13px;
  margin: 0;
}

.fb-sidebar .fb-margin-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.fb-sidebar .fb-margin-row .fb-form-group {
  display: block;
  margin-bottom: 0;
}
.fb-sidebar .fb-margin-row .fb-form-group > label {
  display: block;
  margin-bottom: 3px;
}

/* ---- details ---- */
.fb-sidebar details {
  border: 1px solid #e0e0e0;
  border-radius: 2px;
  padding: 0;
  margin-bottom: 8px;
}
.fb-sidebar details summary {
  cursor: pointer;
  font-size: 12px;
  color: #222;
  padding: 5px 8px;
  list-style: none;
  user-select: none;
  background: #fafafa;
  border-left: 3px solid #bbb;
}
.fb-sidebar details summary:hover { background: #f0f0f0; }
.fb-sidebar details summary::-webkit-details-marker { display: none; }
.fb-sidebar details[open] summary {
  border-bottom: 1px solid #e0e0e0;
  border-left-color: #333;
}
.fb-sidebar details > *:not(summary) {
  padding: 0 8px;
}
.fb-sidebar details > *:first-of-type:not(summary) { padding-top: 8px; }
.fb-sidebar details > *:last-child { padding-bottom: 8px; }

body.fb-sidebar-open #fb-output {
  margin-right: 320px;
  transition: margin-right .15s ease;
}
`;

export function buildPreviewSidebar(opts) {
  const { config, fontOptions, onChange, onUploadFont, onExport, onImport,
    onImageOverrideChange } = opts;

  const styleEl = document.createElement('style');
  styleEl.textContent = SIDEBAR_CSS;
  document.head.appendChild(styleEl);

  const root = document.createElement('div');
  root.innerHTML = `
    <div class="fb-sidebar" id="fb-sidebar">
      <div class="fb-sidebar-header">
        <span>排版设置</span>
        <span class="fb-sidebar-toggle" id="fb-sidebar-toggle">›</span>
      </div>
      <div class="fb-sidebar-body" id="fb-sidebar-body">
        <div id="fb-sidebar-page-panel"></div>
        <div id="fb-sidebar-image-panel" style="display:none;"></div>
        <div style="display:flex;gap:6px;margin-top:10px;position:sticky;bottom:0;background:#fff;padding-top:8px;border-top:1px solid #eee;">
          <button class="fb-mini-btn" id="fb-sidebar-export" style="flex:1;">导出配置</button>
          <button class="fb-mini-btn" id="fb-sidebar-import" style="flex:1;">导入配置</button>
        </div>
      </div>
    </div>
    <div class="fb-sidebar-handle" id="fb-sidebar-handle">‹</div>
  `;
  document.body.appendChild(root);

  const sidebar = document.getElementById('fb-sidebar');
  const pagePanel = document.getElementById('fb-sidebar-page-panel');
  const imagePanel = document.getElementById('fb-sidebar-image-panel');
  const toggleBtn = document.getElementById('fb-sidebar-toggle');
  const handleBtn = document.getElementById('fb-sidebar-handle');

  function rebuildPageForm() {
    pagePanel.innerHTML = buildSettingsFormHTML(fontOptions, config);
    applyFormValues(pagePanel, config);
    attachSettingsFormHandlers({
      root: pagePanel,
      config,
      onChange: (k, v, meta) => {
        onChange(k, v, meta);
        if (meta.isPageSize) rebuildPageForm();
      },
    });
  }
  rebuildPageForm();

  pagePanel.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-upload-font]');
    if (!btn) return;
    const key = btn.dataset.uploadFont;
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.ttf,.otf,.woff,.woff2';
    inp.onchange = async () => {
      const file = inp.files[0];
      if (!file) return;
      try {
        await onUploadFont(key, file);
        rebuildPageForm();
      } catch (err) {
        alert('字体保存失败：' + err.message);
      }
    };
    inp.click();
  });

  let collapsed = false;
  function setCollapsed(v) {
    collapsed = v;
    sidebar.classList.toggle('collapsed', collapsed);
    document.body.classList.toggle('fb-sidebar-open', !collapsed);
    toggleBtn.textContent = collapsed ? '‹' : '›';
  }
  setCollapsed(false);
  toggleBtn.addEventListener('click', () => setCollapsed(true));
  handleBtn.addEventListener('click', () => setCollapsed(false));

  document.getElementById('fb-sidebar-export').addEventListener('click', onExport);
  document.getElementById('fb-sidebar-import').addEventListener('click', onImport);

  function setImagePanel(imgEl) {
    pagePanel.style.display = 'none';
    imagePanel.style.display = 'block';

    const imgId = imgEl.getAttribute('data-img-id') || '(未命名)';
    const src = imgEl.getAttribute('src') || '';
    const naturalW = imgEl.naturalWidth || '';
    const naturalH = imgEl.naturalHeight || '';

    const rect = imgEl.getBoundingClientRect();
    const currentCm = (rect.height / (96 / 2.54)).toFixed(2);

    imagePanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="font-size:12px;color:#222;">图片设置</strong>
        <button class="fb-mini-btn" id="fb-img-close">返回</button>
      </div>
      <div style="border:1px solid #ccc;border-radius:2px;padding:6px;margin-bottom:10px;background:#fafafa;">
        <div style="font-size:11px;color:#333;margin-bottom:4px;font-weight:bold;">
          当前选中：${imgId}
        </div>
        <img src="${src}" style="max-width:100%;max-height:120px;display:block;margin:0 auto;object-fit:contain;">
      </div>
      <div style="font-size:11px;color:#666;margin-bottom:10px;">
        原始: ${naturalW}×${naturalH}<br>当前显示高度: ${currentCm} cm
      </div>
      <div class="fb-form-group"><label>最大高度 (cm，留空 = 使用默认)</label>
        <input type="number" id="fb-img-h-cm" min="0.1" step="0.1" placeholder="如 4">
      </div>
      <p style="font-size:11px;color:#888;margin-top:6px;line-height:1.5;">
        只改图片的最大高度上限，宽度仍按原规则自适应。
      </p>
    `;

    const hInput = imagePanel.querySelector('#fb-img-h-cm');
    const cur = getOverrideForSidebar(imgId);
    if (cur && cur.maxHeightCm != null) hInput.value = cur.maxHeightCm;

    hInput.addEventListener('input', () => {
      const v = hInput.value ? parseFloat(hInput.value) : null;
      onImageOverrideChange(imgId, { maxHeightCm: v });
    });

    imagePanel.querySelector('#fb-img-close').addEventListener('click', clearImagePanel);
  }

  function clearImagePanel() {
    imagePanel.style.display = 'none';
    pagePanel.style.display = 'block';
  }

  return {
    setImagePanel,
    clearImagePanel,
    rebuildPageForm,
    setCollapsed,
  };
}