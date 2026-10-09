// 入口：动态加载主模块
(async () => {
  try {
    const src = chrome.runtime.getURL('src/main.js');
    const mod = await import(src);
    if (typeof mod.main === 'function') {
      mod.main();
    } else {
      console.error('[fenbi-pdf] src/main.js 未导出 main()');
    }
  } catch (e) {
    console.error('[fenbi-pdf] 加载主模块失败：', e);
  }
})();