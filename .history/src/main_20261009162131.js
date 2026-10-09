// ============================================================
// 主入口：组装所有模块
// 职责：
//   1. 加载配置与自定义字体
//   2. 注入 UI 面板
//   3. 绑定"生成"按钮 → 调起预览
//   4. 顶层错误兜底
// ============================================================

import { loadConfig, getConfig } from './config.js';
import { loadAllFonts, getCustomFonts } from './fonts.js';
import { injectPanel } from './ui.js';
import { openPreview } from './pagination.js';

export async function main() {
  // 防重复注入（如页面内被反复执行 content script）
  if (window.__fbPdfInjected__) return;
  window.__fbPdfInjected__ = true;

  try {
    // 1. 并行加载配置与字体（两者互不依赖）
    await Promise.all([loadConfig(), loadAllFonts()]);

    const config = getConfig();
    const customFonts = getCustomFonts();

    // 2. 注入悬浮面板，并拿到面板里的主要交互句柄
    const panel = injectPanel({
      config,
      customFonts,
      onGenerate: handleGenerate,
    });

    // 3. 生成按钮的统一入口
    function handleGenerate(jsonText) {
      let jsonData;
      try {
        jsonData = JSON.parse(jsonText);
      } catch (err) {
        alert('JSON 解析失败：\n' + err.message);
        return;
      }

      try {
        openPreview(jsonData, {
          config,
          customFonts,
        });
      } catch (err) {
        console.error('[fenbi-pdf] 生成预览失败：', err);
        alert('生成预览失败：' + err.message);
      }
    }

    console.log('[fenbi-pdf] 已就绪');
  } catch (err) {
    console.error('[fenbi-pdf] 初始化失败：', err);
  }
}