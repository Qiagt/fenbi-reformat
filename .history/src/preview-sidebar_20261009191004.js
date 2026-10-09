// ============================================================
// 预览页右侧设置侧栏
// ============================================================

import {
  buildSettingsFormHTML,
  applyFormValues,
  attachSettingsFormHandlers,
} from './settings-form.js';

const SIDEBAR_CSS = `
.fb-sidebar {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 300px;
  background: #fff;
  border-left: 1px solid #e5e7eb;
  box-shadow: -4px 0 12px rgba(0,0,0,0.06);
  z-index: 100;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  transition: transform 0.2s ease;
}
.fb-sidebar.collapsed { transform: translateX(300px); }

.fb-sidebar-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 15px;
  background: #4f46e5; color: #fff;
  font-weight: bold; font-size: 14px;
}
.fb-sidebar-toggle {
  cursor: pointer; user-select: none;
  padding: 0 6px; font-size: 18px; line-height: 1;
}

.fb-sidebar-body {
  flex: 1; overflow-y: auto;
  padding: 12px 15px;
}

.fb-sidebar-handle {
  position: fixed;
  top: 50%; right: 0;
  transform: translateY(-50%);
  width: 24px; height: 60px;
  background: #4f46e5;
  color: #fff;
  border-radius: 4px 0 0 4px;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  z-index: 101;
}
.fb-sidebar.collapsed ~ .fb-sidebar-handle { display: flex; }

.fb-sidebar .fb-form-group { margin-bottom: 10px; }
.fb-sidebar .fb-form-group > label {
  display: block; font-size: 12px; color: #374151; margin-bottom: 4px;
}
.fb-sidebar .fb-form-group input[type="number"],
.fb-sidebar .fb-form-group select {
  width: 100%; padding: 5px 8px;
  border: 1px solid #d1d5db; border-radius: 4px;
  font-size: 13px; box-sizing: border-box;
}
.fb-sidebar .fb-row { display: flex; gap: 6px; }
.fb-sidebar .fb-row select { flex: 1; }
.fb-sidebar .fb-mini-btn {
  padding: 5px 10px; background: #6b7280; color: #fff;
  border: none; border-radius: 4px; cursor: pointer;
  font-size: 12px; white-space: nowrap;
}
.fb-sidebar .fb-mini-btn:hover { background: #4b5563; }
.fb-sidebar .fb-checkbox { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.fb-sidebar .fb-margin-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.fb-sidebar details {
  margin-bottom: 12px;
  border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px;
}
.fb-sidebar details summary {
  cursor: pointer; font-size: 13px; font-weight: bold;
  color: #4f46e5; padding: 2px 0;
}
.fb-sidebar details[open] summary {
  margin-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 6px;
}

body.fb-sidebar-open #fb-output {
  margin-right: 300px;
  transition: margin-right 0.2s ease;
}
`;

/**
 * @param {Object} opts
 *   - config: 配置对象引用
 *   - fontOptions: 字体下拉框选项
 *   - onChange: (key, value, {isPageSize}) => void
 *   - onUploadFont: async (fontKey, file) => void
 *   - onExport: () => void
 *   - onImport: () => void
 *   - onImageOverrideChange: (imgId, {width, height}) => void
 */
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
        <div style="display:flex;gap:8px;margin-top:12px;position:sticky;bottom:0;background:#fff;padding-top:10px;">
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
    const naturalW = imgEl.naturalWidth || '';
    const naturalH = imgEl.naturalHeight || '';

    imagePanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong style="font-size:13px;">图片设置</strong>
        <button class="fb-mini-btn" id="fb-img-close">返回</button>
      </div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:10px;">
        ID: ${imgId}<br>原始尺寸: ${naturalW} × ${naturalH}
      </div>
      <div class="fb-form-group"><label>宽度 (px)</label>
        <input type="number" id="fb-img-w" min="1" step="1" placeholder="留空 = auto">
      </div>
      <div class="fb-form-group"><label>高度 (px)</label>
        <input type="number" id="fb-img-h" min="1" step="1" placeholder="留空 = auto">
      </div>
      <p style="font-size:11px;color:#6b7280;margin-top:8px;">
        只填一个时，另一个自动。
      </p>
    `;

    const wInput = imagePanel.querySelector('#fb-img-w');
    const hInput = imagePanel.querySelector('#fb-img-h');

    // 回填当前值
    const curW = parseFloat(imgEl.style.width) || '';
    const curH = parseFloat(imgEl.style.height) || '';
    if (curW) wInput.value = curW;
    if (curH) hInput.value = curH;

    function fire() {
      const w = wInput.value ? parseInt(wInput.value, 10) : null;
      const h = hInput.value ? parseInt(hInput.value, 10) : null;
      onImageOverrideChange(imgId, { width: w, height: h });
    }
    wInput.addEventListener('input', fire);
    hInput.addEventListener('input', fire);

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