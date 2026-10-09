// ============================================================
// 主入口
// ============================================================

import { loadConfig, getConfig } from './config.js';
import { loadAllFonts, getCustomFonts } from './fonts.js';
import { injectPanel } from './ui.js';
import { buildPreviewPayload } from './pagination.js';

export async function main() {
  if (window.__fbPdfInjected__) return;
  window.__fbPdfInjected__ = true;

  try {
    await Promise.all([loadConfig(), loadAllFonts()]);

    const config = getConfig();
    const customFonts = getCustomFonts();

    injectPanel({
      config,
      customFonts,
      onGenerate: handleGenerate,
    });

    function handleGenerate(jsonText) {
      let jsonData;
      try {
        jsonData = JSON.parse(jsonText);
      } catch (err) {
        alert('JSON 解析失败：\n' + err.message);
        return;
      }

      let payload;
      try {
        payload = buildPreviewPayload(jsonData, { config, customFonts });
      } catch (err) {
        console.error('[fenbi-pdf] 生成预览数据失败：', err);
        alert('生成预览失败：' + err.message);
        return;
      }

      const id = 'fb-preview-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      chrome.storage.local.set({ [id]: payload })
        .then(() => {
          const url = chrome.runtime.getURL('src/preview.html') + '?id=' + encodeURIComponent(id);
          window.open(url, '_blank');
        })
        .catch((e) => {
          alert('写入预览数据失败：' + e.message);
        });
    }

    console.log('[fenbi-pdf] 已就绪');
  } catch (err) {
    console.error('[fenbi-pdf] 初始化失败：', err);
  }
}