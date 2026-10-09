// ============================================================
// 悬浮面板 UI
// - injectPanel({ config, onGenerate })
// - 面板 HTML/CSS 注入、tab 切换、折叠
// - 设置表单生成与事件绑定（配置修改、字体上传、导入导出）
// - "生成试卷预览"按钮 → 回调 onGenerate(jsonText)
// ============================================================

import { saveConfig, defaultConfig, deepMerge } from './config.js';
import { getAllFontOptions, saveCustomFont, readFontFile } from './fonts.js';
import { extractFromPage } from './extractor.js';
const PANEL_CSS = `
.fb-panel {
  position: fixed; top: 20px; left: 20px; width: 380px;
  background: #fff; border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
  z-index: 999999;
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden; display: flex; flex-direction: column;
  max-height: calc(100vh - 40px);
}
.fb-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 15px; background: #4f46e5; color: #fff;
  font-size: 14px; font-weight: bold;
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
  cursor: pointer; font-size: 14px; font-weight: bold; margin-top: 10px;
}
#fb-generate-btn:hover, .fb-settings-actions button:hover { background: #4338ca; }
.fb-settings-actions {
  display: flex; gap: 8px; padding: 10px 0;
  background: #fff; position: sticky; bottom: 0;
}
.fb-settings-actions button { margin-top: 0; background: #6b7280; }
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
  <div class="fb-panel-header">
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
      <p style="font-size:12px;color:#6b7280;margin:10px 0 0 0;line-height:1.5;">
        点击后从当前页面提取题目并生成预览。<br>
        若提取不到内容，请确认已打开粉笔做题页。
      </p>
    </div>
    <div class="fb-tab-content" data-content="settings">
      <div class="fb-settings-scroll" id="fb-settings-scroll"></div>
      <div class="fb-settings-actions">
        <button id="fb-export-config">导出配置</button>
        <button id="fb-import-config">导入配置</button>
      </div>
    </div>
  </div>
</div>
`;

/**
 * 注入面板。
 * @param {Object} opts
 *   - config: 配置对象（引用稳定，导入配置时原地修改）
 *   - onGenerate: (jsonText: string) => void
 */
export function injectPanel(opts) {
  const { config, onGenerate } = opts;

  // 1. 注入样式
  const styleEl = document.createElement('style');
  styleEl.textContent = PANEL_CSS;
  document.head.appendChild(styleEl);

  // 2. 注入 DOM
  const wrap = document.createElement('div');
  wrap.innerHTML = PANEL_HTML;
  document.body.appendChild(wrap.firstElementChild);

  const panel = document.getElementById('fb-pdf-panel');

  // 3. 折叠
  let isMinimized = false;
  document.getElementById('fb-panel-minimize').addEventListener('click', () => {
    isMinimized = !isMinimized;
    panel.classList.toggle('minimized', isMinimized);
    document.getElementById('fb-panel-minimize').textContent = isMinimized ? '+' : '—';
  });

  // 4. tab 切换
  document.querySelectorAll('.fb-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.fb-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.fb-tab-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.querySelector(
        `.fb-tab-content[data-content="${tab.dataset.tab}"]`
      );
      if (target) target.classList.add('active');
    });
  });

  // 5. 设置表单
  const settingsScroll = document.getElementById('fb-settings-scroll');

  function buildSettingsForm() {
    const s = config.settings[config.activePageSize];
    const ps = config.activePageSize;
    const fo = getAllFontOptions()
      .map((f) => `<option value="${f.value}">${f.label}</option>`)
      .join('');

    settingsScroll.innerHTML = `
      <div class="fb-form-group">
        <label>页面大小</label>
        <select data-cfg="activePageSize">
          <option value="A4" ${ps === 'A4' ? 'selected' : ''}>A4 (210 × 297 mm)</option>
          <option value="B5" ${ps === 'B5' ? 'selected' : ''}>B5 (176 × 250 mm)</option>
        </select>
      </div>
      <details open>
        <summary>页面边距 (mm)</summary>
        <div class="fb-margin-row">
          <div class="fb-form-group"><label>上</label><input type="number" data-cfg="marginTop" min="0" max="60" step="1"></div>
          <div class="fb-form-group"><label>左</label><input type="number" data-cfg="marginLeft" min="0" max="60" step="1"></div>
          <div class="fb-form-group"><label>右</label><input type="number" data-cfg="marginRight" min="0" max="60" step="1"></div>
          <div class="fb-form-group"><label>页脚距纸张底边</label><input type="number" data-cfg="footerGap" min="0" max="60" step="1"></div>
        </div>
        <div class="fb-form-group"><label>页脚上边距 (mm) —— 正文停靠线到页脚顶边的距离</label>
          <input type="number" data-cfg="footerTopMargin" min="0" max="60" step="1">
        </div>
        <p style="font-size:11px;color:#6b7280;margin:4px 0 0 0;">正文停靠线 = 页脚距纸张底边 + 页脚高度 + 页脚上边距</p>
      </details>
      <details open>
        <summary>分页</summary>
        <div class="fb-form-group"><label class="fb-checkbox"><input type="checkbox" data-cfg="keepQuestionTogether">题目不跨页（整题放不下则整题到下一页）</label></div>
      </details>
      <details open>
        <summary>正文（题干与选项）</summary>
        <div class="fb-form-group"><label>字体</label>
          <div class="fb-row"><select data-cfg="bodyFont">${fo}</select><button class="fb-mini-btn" data-upload-font="bodyFont">上传</button></div>
        </div>
        <div class="fb-form-group"><label>字号 (pt)</label><input type="number" data-cfg="bodyFontSize" min="6" max="36" step="0.5"></div>
        <div class="fb-form-group"><label>行距</label><input type="number" data-cfg="bodyLineHeight" min="1" max="3" step="0.1"></div>
        <div class="fb-form-group"><label>段间距 (em)</label><input type="number" data-cfg="paraSpacing" min="0" max="3" step="0.1"></div>
      </details>
      <details open>
        <summary>间距</summary>
        <div class="fb-form-group"><label>题干与选项距离 (px)</label><input type="number" data-cfg="stemOptionGap" min="0" max="50" step="1"></div>
        <div class="fb-form-group"><label>题与题距离 (px)</label><input type="number" data-cfg="questionGap" min="0" max="50" step="1"></div>
      </details>
      <details>
        <summary>模块</summary>
        <div class="fb-form-group"><label class="fb-checkbox"><input type="checkbox" data-cfg="chapterPageBreak">每个模块开始前分页（第一个除外）</label></div>
        <div class="fb-form-group"><label class="fb-checkbox"><input type="checkbox" data-cfg="chapterShowPartIndex">显示科目序号（自动加"第X部分"）</label></div>
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
      </details>
      <details>
        <summary>材料</summary>
        <div class="fb-form-group"><label>字体</label>
          <div class="fb-row"><select data-cfg="materialFont">${fo}</select><button class="fb-mini-btn" data-upload-font="materialFont">上传</button></div>
        </div>
        <div class="fb-form-group"><label>字号 (pt)</label><input type="number" data-cfg="materialSize" min="6" max="36" step="0.5"></div>
        <div class="fb-form-group"><label>行距</label><input type="number" data-cfg="materialLineHeight" min="1" max="3" step="0.1"></div>
        <div class="fb-form-group"><label>段间距 (px)</label><input type="number" data-cfg="materialParaSpacing" min="0" max="50" step="1"></div>
        <div class="fb-form-group"><label>下边距 (px)</label><input type="number" data-cfg="materialMarginBottom" min="0" max="50" step="1"></div>
      </details>
      <details>
        <summary>开发者模式</summary>
        <div class="fb-form-group"><label class="fb-checkbox"><input type="checkbox" data-cfg="circleNumBlock">圆圈序号段落独立成块（①②③ 相邻段落不可切分）</label></div>
      </details>
    `;

    // 回填值
    settingsScroll.querySelectorAll('[data-cfg]').forEach((el) => {
      const k = el.dataset.cfg;
      if (k === 'activePageSize') {
        el.value = config.activePageSize;
        return;
      }
      if (el.type === 'checkbox') el.checked = !!s[k];
      else el.value = s[k];
    });
  }

  // 6. 表单变更
  settingsScroll.addEventListener('change', async (e) => {
    const el = e.target;
    const k = el.dataset.cfg;
    if (!k) return;

    if (k === 'activePageSize') {
      config.activePageSize = el.value;
      await saveConfig();
      buildSettingsForm();
      return;
    }

    const ps = config.activePageSize;
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.type === 'number') v = parseFloat(el.value);
    else v = el.value;
    if (Number.isNaN(v)) return;
    config.settings[ps][k] = v;
    await saveConfig();
  });

  // 7. 字体上传
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
        buildSettingsForm();
      } catch (err) {
        alert('字体保存失败：' + err.message);
      }
    };
    inp.click();
  });
  // 7.5 从页面提取

    // 生成按钮：从当前页面提取 + 直接生成
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

  // 9. 导出配置
  document.getElementById('fb-export-config').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fenbi-pdf-config.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // 10. 导入配置
  document.getElementById('fb-import-config').addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json';
    inp.onchange = async () => {
      const file = inp.files[0];
      if (!file) return;
      let imported;
      try {
        imported = JSON.parse(await file.text());
      } catch (err) {
        alert('配置文件格式错误：' + err.message);
        return;
      }
      const mode = await showImportDialog();
      if (mode === 'cancel') return;

      const newCfg = deepMerge(defaultConfig(), imported);
      // 保持 config 引用稳定：清空旧对象后把新值拷进去
      for (const k in config) delete config[k];
      Object.assign(config, newCfg);

      if (mode === 'overwrite') await saveConfig();
      buildSettingsForm();
      alert('配置已应用。');
    };
    inp.click();
  });

  // 初始化表单
  buildSettingsForm();

  return {
    rebuildSettingsForm: buildSettingsForm,
  };
}

// ============================================================
// 导入配置时的三选一对话框
// ============================================================
function showImportDialog() {
  return new Promise((resolve) => {
    const d = document.createElement('div');
    d.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;">
        <div style="background:#fff;padding:20px 24px;border-radius:10px;max-width:380px;box-shadow:0 10px 40px rgba(0,0,0,0.2);">
          <h3 style="margin:0 0 8px;font-size:16px;">导入配置</h3>
          <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">请选择导入方式：</p>
          <div style="display:flex;gap:10px;flex-direction:column;">
            <button data-mode="once" style="padding:10px;background:#4f46e5;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:bold;">仅本次使用</button>
            <button data-mode="overwrite" style="padding:10px;background:#dc2626;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:bold;">覆盖习惯设置（永久保存）</button>
            <button data-mode="cancel" style="padding:10px;background:#e5e7eb;color:#333;border:none;border-radius:6px;cursor:pointer;font-size:14px;">取消</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(d);
    d.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-mode]');
      if (b) {
        document.body.removeChild(d);
        resolve(b.dataset.mode);
      }
    });
  });
}