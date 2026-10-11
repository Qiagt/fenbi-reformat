// ============================================================
// 设置表单（共享模块）
// 分组：题目 / 模块与材料 / 偏好设置
// ============================================================

/**
 * 图片 tab 相关的 CSS。由使用方拼接到自己的样式字符串后面。
 * 类名统一带 fb-img- / fb-range- 前缀，避免冲突。
 */
export const SETTINGS_FORM_CSS = `
.fb-img-kind-tabs,
.fb-img-ctx-tabs {
  display: flex;
  margin: 0 8px;
}
.fb-img-kind-tabs { margin-top: 8px; }
.fb-img-ctx-tabs { margin-top: 6px; }

.fb-img-tab {
  flex: 1;
  padding: 4px 8px;
  font-size: 12px;
  font-family: inherit;
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-right: none;
  color: #57606a;
  cursor: pointer;
  white-space: nowrap;
}
.fb-img-tab:first-child {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}
.fb-img-tab:last-child {
  border-right: 1px solid #d0d7de;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}
.fb-img-tab:hover { background: #eaeef2; }
.fb-img-tab.active {
  background: #40C463;
  color: #fff;
  border-color: #40C463;
}
.fb-img-tab.active + .fb-img-tab { border-left-color: #40C463; }

.fb-img-panel {
  margin: 8px 8px 0;
}

.fb-range-row {
  display: grid;
  grid-template-columns: auto 1fr auto 1fr auto;
  gap: 4px;
  align-items: end;
  margin-bottom: 8px;
}
.fb-range-label {
  font-size: 12px;
  color: #57606a;
  padding-bottom: 5px;
  white-space: nowrap;
}
.fb-range-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.fb-range-minmax {
  font-size: 10px;
  color: #8b949e;
  line-height: 1;
}
.fb-range-cell input {
  width: 100%;
  padding: 3px 6px;
  font-size: 12px;
  color: #1f2328;
  background: #fff;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  box-sizing: border-box;
}
.fb-range-cell input:focus {
  border-color: #40C463;
  outline: none;
  box-shadow: 0 0 0 2px rgba(64,196,99,.2);
}
.fb-range-sep {
  color: #8b949e;
  padding-bottom: 5px;
  font-size: 12px;
}
.fb-range-unit {
  font-size: 11px;
  color: #8b949e;
  padding-bottom: 5px;
}
.fb-img-hint {
  font-size: 11px;
  color: #8b949e;
  margin: 2px 0 10px;
  line-height: 1.5;
}
`;

function buildImgPanel(kind, ctx) {
  const K = kind === 'standalone' ? 'Standalone' : 'Inline';
  const C = ctx === 'stem' ? 'Stem' : ctx === 'option' ? 'Option' : 'Material';
  const p = `img${K}${C}`;
  return `
    <div class="fb-img-panel" data-img-panel="${kind}-${ctx}" style="display:none;">
      <div class="fb-range-row">
        <span class="fb-range-label">高度</span>
        <div class="fb-range-cell">
          <span class="fb-range-minmax">最小</span>
          <input type="number" min="0" max="40" step="0.1" data-cfg="${p}MinHeight">
        </div>
        <span class="fb-range-sep">~</span>
        <div class="fb-range-cell">
          <span class="fb-range-minmax">最大</span>
          <input type="number" min="0" max="40" step="0.1" data-cfg="${p}MaxHeight">
        </div>
        <span class="fb-range-unit">cm</span>
      </div>
      <div class="fb-range-row">
        <span class="fb-range-label">宽度</span>
        <div class="fb-range-cell">
          <span class="fb-range-minmax">最小</span>
          <input type="number" min="0" max="40" step="0.1" data-cfg="${p}MinWidth">
        </div>
        <span class="fb-range-sep">~</span>
        <div class="fb-range-cell">
          <span class="fb-range-minmax">最大</span>
          <input type="number" min="0" max="40" step="0.1" data-cfg="${p}MaxWidth">
        </div>
        <span class="fb-range-unit">cm</span>
      </div>
      <p class="fb-img-hint">0 = auto（不约束）</p>
    </div>
  `;
}

export function buildSettingsFormHTML(fontOptions, config) {
  const s = config.settings[config.activePageSize];
  const ps = config.activePageSize;
  const mode = s.paginationMode || 'fine';
  const fo = fontOptions
    .map((f) => `<option value="${f.value}">${f.label}</option>`)
    .join('');

  return `
    <details open>
      <summary>题目</summary>
      <div class="fb-form-group"><label>字体</label>
        <div class="fb-row"><select data-cfg="bodyFont">${fo}</select><button class="fb-mini-btn" data-upload-font="bodyFont">上传</button></div>
      </div>
      <div class="fb-form-group"><label>字号 (pt)</label><input type="number" data-cfg="bodyFontSize" min="6" max="36" step="0.5"></div>
      <div class="fb-form-group"><label>行距</label><input type="number" data-cfg="bodyLineHeight" min="1" max="3" step="0.1"></div>
      <div class="fb-form-group"><label>段间距 (em)</label><input type="number" data-cfg="paraSpacing" min="0" max="3" step="0.1"></div>
      <div class="fb-form-group"><label>题干与选项距离 (px)</label><input type="number" data-cfg="stemOptionGap" min="0" max="50" step="1"></div>
      <div class="fb-form-group"><label>题与题距离 (px)</label><input type="number" data-cfg="questionGap" min="0" max="50" step="1"></div>
    </details>

    <details open>
      <summary>模块与材料</summary>

      <div class="fb-form-group"><label class="fb-checkbox"><input type="checkbox" data-cfg="chapterPageBreak">模块开始前分页（第一个除外）</label></div>
      <div class="fb-form-group"><label class="fb-checkbox"><input type="checkbox" data-cfg="chapterShowPartIndex">显示科目序号</label></div>
      <div class="fb-form-group"><label class="fb-checkbox"><input type="checkbox" data-cfg="chapterCenterAlign">模块名称居中</label></div>
      <div class="fb-form-group"><label>模块名称字体</label>
        <div class="fb-row"><select data-cfg="chapterNameFont">${fo}</select><button class="fb-mini-btn" data-upload-font="chapterNameFont">上传</button></div>
      </div>
      <div class="fb-form-group"><label>模块名称字号 (pt)</label><input type="number" data-cfg="chapterNameSize" min="6" max="36" step="0.5"></div>
      <div class="fb-form-group"><label>模块名称下边距 (px)</label><input type="number" data-cfg="chapterNameMarginBottom" min="0" max="50" step="1"></div>
      <div class="fb-form-group"><label>模块描述字体</label>
        <div class="fb-row"><select data-cfg="chapterDescFont">${fo}</select><button class="fb-mini-btn" data-upload-font="chapterDescFont">上传</button></div>
      </div>
      <div class="fb-form-group"><label>模块描述字号 (pt)</label><input type="number" data-cfg="chapterDescSize" min="6" max="36" step="0.5"></div>
      <div class="fb-form-group"><label>模块描述下边距 (px)</label><input type="number" data-cfg="chapterDescMarginBottom" min="0" max="50" step="1"></div>

      <div class="fb-form-group"><label>材料字体</label>
        <div class="fb-row"><select data-cfg="materialFont">${fo}</select><button class="fb-mini-btn" data-upload-font="materialFont">上传</button></div>
      </div>
      <div class="fb-form-group"><label>材料字号 (pt)</label><input type="number" data-cfg="materialSize" min="6" max="36" step="0.5"></div>
      <div class="fb-form-group"><label>材料行距</label><input type="number" data-cfg="materialLineHeight" min="1" max="3" step="0.1"></div>
      <div class="fb-form-group"><label>材料段间距 (px)</label><input type="number" data-cfg="materialParaSpacing" min="0" max="50" step="1"></div>
      <div class="fb-form-group"><label>材料下边距 (px)</label><input type="number" data-cfg="materialMarginBottom" min="0" max="50" step="1"></div>
    </details>

    <details open>
      <summary>偏好设置</summary>

      <div class="fb-form-group"><label>分页模式</label>
        <select data-cfg="paginationMode">
          <option value="balanced" ${mode === 'balanced' ? 'selected' : ''}>平衡</option>
          <option value="fine" ${mode === 'fine' ? 'selected' : ''}>精细</option>
          <option value="whole" ${mode === 'whole' ? 'selected' : ''}>整题</option>
        </select>
      </div>

      <div class="fb-form-group"><label>页面大小</label>
        <select data-cfg="activePageSize">
          <option value="A4" ${ps === 'A4' ? 'selected' : ''}>A4 (210 × 297 mm)</option>
          <option value="B5" ${ps === 'B5' ? 'selected' : ''}>B5 (176 × 250 mm)</option>
        </select>
      </div>

      <div class="fb-margin-row">
        <div class="fb-form-group"><label>上边距 (mm)</label><input type="number" data-cfg="marginTop" min="0" max="60" step="1"></div>
        <div class="fb-form-group"><label>左边距 (mm)</label><input type="number" data-cfg="marginLeft" min="0" max="60" step="1"></div>
        <div class="fb-form-group"><label>右边距 (mm)</label><input type="number" data-cfg="marginRight" min="0" max="60" step="1"></div>
        <div class="fb-form-group"><label>页脚距底边 (mm)</label><input type="number" data-cfg="footerGap" min="0" max="60" step="1"></div>
      </div>
      <div class="fb-form-group"><label>页脚上边距 (mm)</label>
        <input type="number" data-cfg="footerTopMargin" min="0" max="60" step="1">
      </div>
    </details>

    <details>
      <summary>图片尺寸（全局）</summary>
      <div class="fb-img-kind-tabs">
        <button type="button" class="fb-img-tab active" data-img-kind="standalone">独立图</button>
        <button type="button" class="fb-img-tab" data-img-kind="inline">行内图</button>
      </div>
      <div class="fb-img-ctx-tabs">
        <button type="button" class="fb-img-tab active" data-img-ctx="stem">题干</button>
        <button type="button" class="fb-img-tab" data-img-ctx="option">选项</button>
        <button type="button" class="fb-img-tab" data-img-ctx="material">材料</button>
      </div>
      ${buildImgPanel('standalone', 'stem')}
      ${buildImgPanel('standalone', 'option')}
      ${buildImgPanel('standalone', 'material')}
      ${buildImgPanel('inline', 'stem')}
      ${buildImgPanel('inline', 'option')}
      ${buildImgPanel('inline', 'material')}
    </details>
  `;
}

export function applyFormValues(root, config) {
  const s = config.settings[config.activePageSize];
  root.querySelectorAll('[data-cfg]').forEach((el) => {
    const k = el.dataset.cfg;
    if (k === 'activePageSize') {
      el.value = config.activePageSize;
      return;
    }
    if (el.type === 'checkbox') el.checked = !!s[k];
    else el.value = s[k];
  });
}

function setupImageTabs(root) {
  const panels = root.querySelectorAll('[data-img-panel]');
  if (panels.length === 0) return;
  const kindBtns = root.querySelectorAll('[data-img-kind]');
  const ctxBtns = root.querySelectorAll('[data-img-ctx]');
  let curKind = 'standalone';
  let curCtx = 'stem';

  function refresh() {
    kindBtns.forEach((b) => b.classList.toggle('active', b.dataset.imgKind === curKind));
    ctxBtns.forEach((b) => b.classList.toggle('active', b.dataset.imgCtx === curCtx));
    panels.forEach((p) => {
      p.style.display = p.dataset.imgPanel === curKind + '-' + curCtx ? '' : 'none';
    });
  }

  kindBtns.forEach((b) =>
    b.addEventListener('click', () => { curKind = b.dataset.imgKind; refresh(); })
  );
  ctxBtns.forEach((b) =>
    b.addEventListener('click', () => { curCtx = b.dataset.imgCtx; refresh(); })
  );
  refresh();
}

export function attachSettingsFormHandlers(opts) {
  const { root, config, onChange } = opts;

  function readValue(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'number') return parseFloat(el.value);
    return el.value;
  }

  function handle(e) {
    const el = e.target;
    const k = el.dataset.cfg;
    if (!k) return;

    if (k === 'activePageSize') {
      config.activePageSize = el.value;
      onChange(k, el.value, { isPageSize: true });
      return;
    }

    const v = readValue(el);
    if (typeof v === 'number' && Number.isNaN(v)) return;

    // 图片 min/max 校验（0 视为 auto，不参与比较）
    if (k.endsWith('MinHeight') || k.endsWith('MaxHeight')
      || k.endsWith('MinWidth') || k.endsWith('MaxWidth')) {
      const isMin = k.endsWith('MinHeight') || k.endsWith('MinWidth');
      const unit = k.endsWith('MinHeight') || k.endsWith('MaxHeight') ? 'Height' : 'Width';
      const minKey = isMin ? k : k.replace(/Max(Height|Width)$/, 'Min$1');
      const maxKey = isMin ? k.replace(/Min(Height|Width)$/, 'Max$1') : k;

      const minV = k === minKey ? v : config.settings[config.activePageSize][minKey];
      const maxV = k === maxKey ? v : config.settings[config.activePageSize][maxKey];

      if (minV > 0 && maxV > 0 && minV > maxV) {
        alert('最大值不能小于最小值');
        el.value = config.settings[config.activePageSize][k];
        return;
      }
    }

    config.settings[config.activePageSize][k] = v;
    onChange(k, v, { isPageSize: false });
  }

  root.addEventListener('change', handle);
  root.addEventListener('input', (e) => {
    if (e.target.type === 'number') handle(e);
  });

  setupImageTabs(root);
}