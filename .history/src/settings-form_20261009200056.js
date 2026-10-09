// ============================================================
// 设置表单（共享模块）
// 分组：题目 / 模块与材料 / 偏好设置
// ============================================================

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
      <div class="fb-form-group"><label class="fb-checkbox"><input type="checkbox" data-cfg="keepQuestionTogether">题目不跨页</label></div>
    </details>

    <details open>
      <summary>模块与材料</summary>

      <div style="font-size:12px;font-weight:bold;color:#374151;margin:6px 0 4px;">模块</div>
      <div class="fb-form-group"><label class="fb-checkbox"><input type="checkbox" data-cfg="chapterPageBreak">每个模块开始前分页（第一个除外）</label></div>
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

      <div style="font-size:12px;font-weight:bold;color:#374151;margin:10px 0 4px;">材料</div>
      <div class="fb-form-group"><label>字体</label>
        <div class="fb-row"><select data-cfg="materialFont">${fo}</select><button class="fb-mini-btn" data-upload-font="materialFont">上传</button></div>
      </div>
      <div class="fb-form-group"><label>字号 (pt)</label><input type="number" data-cfg="materialSize" min="6" max="36" step="0.5"></div>
      <div class="fb-form-group"><label>行距</label><input type="number" data-cfg="materialLineHeight" min="1" max="3" step="0.1"></div>
      <div class="fb-form-group"><label>段间距 (px)</label><input type="number" data-cfg="materialParaSpacing" min="0" max="50" step="1"></div>
      <div class="fb-form-group"><label>下边距 (px)</label><input type="number" data-cfg="materialMarginBottom" min="0" max="50" step="1"></div>
    </details>

    <details open>
      <summary>偏好设置</summary>

      <div class="fb-form-group"><label>分页模式</label>
        <select data-cfg="paginationMode">
          <option value="balanced" ${mode === 'balanced' ? 'selected' : ''}>平衡（选项整体，材料整体）</option>
          <option value="fine" ${mode === 'fine' ? 'selected' : ''}>精细（选项按行拆，材料分段）</option>
          <option value="whole" ${mode === 'whole' ? 'selected' : ''}>整题（一题一块）</option>
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
        <div class="fb-form-group"><label>页脚距纸张底边 (mm)</label><input type="number" data-cfg="footerGap" min="0" max="60" step="1"></div>
      </div>
      <div class="fb-form-group"><label>页脚上边距 (mm)</label>
        <input type="number" data-cfg="footerTopMargin" min="0" max="60" step="1">
      </div>

      <div class="fb-form-group"><label class="fb-checkbox"><input type="checkbox" data-cfg="circleNumBlock">圆圈序号段落独立成块（开发者）</label></div>
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
    config.settings[config.activePageSize][k] = v;
    onChange(k, v, { isPageSize: false });
  }

  root.addEventListener('change', handle);
  root.addEventListener('input', (e) => {
    if (e.target.type === 'number') handle(e);
  });
}