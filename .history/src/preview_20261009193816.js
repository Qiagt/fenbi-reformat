// ============================================================
// 预览页入口（扩展页面）
// ============================================================

import { runPagination } from './preview-inject.js';
import { buildPreviewSidebar } from './preview-sidebar.js';
import { loadConfig, getConfig, saveConfig, defaultConfig, deepMerge } from './config.js';
import { getAllFontOptions, saveCustomFont, readFontFile } from './fonts.js';
import { buildCSS } from './styles.js';
import {
  resetOverrides,
  setOverride,
  getAllOverrides,
  loadOverrides,
  buildOverrideCSS,
} from './image-overrides.js';

(async function () {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { document.body.textContent = '缺少 id 参数'; return; }

  let payload;
  try {
    const result = await chrome.storage.local.get(id);
    payload = result[id];
  } catch (e) {
    document.body.textContent = '读取预览数据失败：' + e.message;
    return;
  }
  if (!payload) { document.body.textContent = '预览数据已过期'; return; }
  chrome.storage.local.remove(id).catch(() => {});

  document.title = payload.title + ' - 预览';

  const styleEl = document.createElement('style');
  styleEl.id = 'fb-preview-style';
  document.head.appendChild(styleEl);

  document.body.innerHTML = payload.bodyHTML;

  await loadConfig();
  const config = getConfig();
  resetOverrides();

  function rebuildAllCSS() {
    const settings = config.settings[config.activePageSize];
    const baseCSS = buildCSS(settings, config.activePageSize, config.pageSizes);
    styleEl.textContent = baseCSS + '\n' + buildOverrideCSS();
  }

  function rerender() {
    // 记录滚动锚点
    const pages = Array.from(document.querySelectorAll('#fb-output .fb-page'));
    let anchor = null;
    for (let i = 0; i < pages.length; i++) {
      const r = pages[i].getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        anchor = { pageIndex: i, offset: r.top };
        break;
      }
    }

    const output = document.getElementById('fb-output');
    const staging = document.getElementById('fb-staging');
    if (!output || !staging) return;
    output.innerHTML = '';
    staging.innerHTML = '';

    rebuildAllCSS();

    // 强制 reflow，确保样式应用到 #fb-measure
    void document.getElementById('fb-measure').offsetHeight;

    runPagination({
      settings: config.settings[config.activePageSize],
      page: config.pageSizes[config.activePageSize],
      bodyFF: payload.bodyFF,
    }).then(() => {
      if (anchor) {
        const newPages = document.querySelectorAll('#fb-output .fb-page');
        const target = newPages[anchor.pageIndex];
        if (target) {
          const r = target.getBoundingClientRect();
          window.scrollBy(0, r.top - anchor.offset);
        }
      }
    });
  }

  // 首次渲染
  rebuildAllCSS();
  await runPagination({
    settings: config.settings[config.activePageSize],
    page: config.pageSizes[config.activePageSize],
    bodyFF: payload.bodyFF,
  });

  function debounce(fn, wait) {
    let t = null;
    return function (...args) {
      if (t) clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  const sidebar = buildPreviewSidebar({
    config,
    fontOptions: getAllFontOptions(),
    onChange: debounce(() => {
      saveConfig();
      rerender();
    }, 500),
    onUploadFont: async (fontKey, file) => {
      const name = file.name.replace(/\.[^.]+$/, '');
      const dataUrl = await readFontFile(file);
      await saveCustomFont(name, dataUrl);
      config.settings[config.activePageSize][fontKey] = name;
      await saveConfig();
    },
    onExport: () => {
      const wantImages = window.confirm(
        '是否同时导出图片尺寸设置？\n\n确定 = 包含图片设置\n取消 = 只导出排版设置'
      );
      const out = JSON.parse(JSON.stringify(config));
      if (wantImages) out.imageOverrides = getAllOverrides();
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fenbi-pdf-config.json';
      a.click();
      URL.revokeObjectURL(url);
    },
    onImport: () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json';
      inp.onchange = async () => {
        const file = inp.files[0];
        if (!file) return;
        let imported;
        try {
          imported = JSON.parse(await file.text());
        } catch (e) {
          alert('JSON 错误：' + e.message);
          return;
        }
        let applyImages = false;
        if (imported.imageOverrides) {
          applyImages = window.confirm(
            '配置文件包含图片尺寸设置。\n\n确定 = 全部应用\n取消 = 只应用排版设置'
          );
        }
        const newCfg = deepMerge(defaultConfig(), imported);
        for (const k in config) delete config[k];
        Object.assign(config, newCfg);
        await saveConfig();
        if (applyImages && imported.imageOverrides) {
          loadOverrides(imported.imageOverrides);
        } else {
          resetOverrides();
        }
        sidebar.rebuildPageForm();
        rerender();
      };
      inp.click();
    },
    onImageOverrideChange: debounce((imgId, dims) => {
      setOverride(imgId, dims);
      rerender();
    }, 400),
  });

  // 点击图片 → 图片面板
  document.addEventListener('click', (e) => {
    const img = e.target.closest('img[data-img-id]');
    if (img) {
      document.querySelectorAll('img.fb-img-selected').forEach((i) => i.classList.remove('fb-img-selected'));
      img.classList.add('fb-img-selected');
      sidebar.setImagePanel(img);
    }
  });
})();