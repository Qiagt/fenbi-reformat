// ============================================================
// 配置系统
// ============================================================

const CONFIG_KEY = 'fb-pdf-config';

export function defaultSettings() {
  return {
    // ---- 题目 ----
    bodyFont: 'SimSun',
    bodyFontSize: 12,
    bodyLineHeight: 1.5,
    paraSpacing: 0,
    stemOptionGap: 5,
    questionGap: 10,
    keepQuestionTogether: false,

    // ---- 模块 ----
    chapterPageBreak: false,
    chapterShowPartIndex: false,
    chapterCenterAlign: true,
    chapterNameFont: 'SimHei',
    chapterNameSize: 12,
    chapterNameMarginBottom: 5,
    chapterDescFont: 'SimSun',
    chapterDescSize: 12,
    chapterDescMarginBottom: 10,

    // ---- 材料 ----
    materialFont: 'SimSun',
    materialSize: 12,
    materialLineHeight: 1.5,
    materialParaSpacing: 5,
    materialMarginBottom: 15,

    // ---- 偏好 ----
    paginationMode: 'fine',
    marginTop: 18,
    marginBottom: 18,
    marginLeft: 18,
    marginRight: 18,
    footerGap: 8,
    footerTopMargin: 6,

    // ---- 图片最小高度 (cm，0 = 不限制) ----
    imgInlineMinHeight: 0,
    imgStandaloneMinHeight: 0,
    imgMaterialStandaloneMinHeight: 0,
    imgMaterialInlineMinHeight: 0,

    // ---- 开发者 ----
    circleNumBlock: false,
  };
}

export function defaultConfig() {
  return {
    activePageSize: 'A4',
    pageSizes: {
      A4: { width: 210, height: 297 },
      B5: { width: 176, height: 250 },
    },
    settings: {
      A4: defaultSettings(),
      B5: defaultSettings(),
    },
  };
}

export function deepMerge(target, source) {
  const out = Array.isArray(target) ? [...target] : { ...target };
  for (const k in source) {
    if (
      source[k] &&
      typeof source[k] === 'object' &&
      !Array.isArray(source[k]) &&
      target[k] &&
      typeof target[k] === 'object' &&
      !Array.isArray(target[k])
    ) {
      out[k] = deepMerge(target[k], source[k]);
    } else {
      out[k] = source[k];
    }
  }
  return out;
}

let _config = null;

export async function loadConfig() {
  if (_config) return _config;
  try {
    const result = await chrome.storage.local.get(CONFIG_KEY);
    const stored = result[CONFIG_KEY];
    _config = stored ? deepMerge(defaultConfig(), stored) : defaultConfig();
  } catch (e) {
    console.error('[fenbi-pdf] 配置加载失败，使用默认配置：', e);
    _config = defaultConfig();
  }
  return _config;
}

export function getConfig() {
  if (!_config) {
    throw new Error('[fenbi-pdf] 配置尚未加载，请先调用 loadConfig()');
  }
  return _config;
}

export async function saveConfig() {
  if (!_config) return;
  try {
    await chrome.storage.local.set({ [CONFIG_KEY]: _config });
  } catch (e) {
    console.error('[fenbi-pdf] 配置保存失败：', e);
  }
}

export function replaceConfig(imported) {
  _config = deepMerge(defaultConfig(), imported);
  return _config;
}

export async function resetConfig() {
  _config = defaultConfig();
  try {
    await chrome.storage.local.remove(CONFIG_KEY);
  } catch (e) {
    console.error('[fenbi-pdf] 配置重置失败：', e);
  }
  return _config;
}

export const CONFIG_STORAGE_KEY = CONFIG_KEY;