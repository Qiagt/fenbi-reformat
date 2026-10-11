// ============================================================
// 配置系统
// ============================================================

const CONFIG_KEY = 'fb-pdf-config';
const DEFAULT_JSON = 'default.json';

export function defaultSettings() {
  return {
    // ---- 题目 ----
    bodyFont: 'FangSong',
    bodyFontSize: 12,
    bodyLineHeight: 1.5,
    paraSpacing: 0,
    stemOptionGap: 5,
    questionGap: 25,

    // ---- 模块 ----
    chapterPageBreak: false,
    chapterShowPartIndex: false,
    chapterCenterAlign: true,
    chapterNameFont: 'SimHei',
    chapterNameSize: 16,
    chapterNameMarginBottom: 5,
    chapterDescFont: 'SimHei',
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

    // ---- 图片尺寸 (cm) ----
    // 语义：0 = auto（不约束该维度）；正数 = 生效约束
    // 独立图
    imgStandaloneStemMinHeight: 0,
    imgStandaloneStemMaxHeight: 4,
    imgStandaloneStemMinWidth: 0,
    imgStandaloneStemMaxWidth: 16,
    imgStandaloneOptionMinHeight: 0,
    imgStandaloneOptionMaxHeight: 2,
    imgStandaloneOptionMinWidth: 0,
    imgStandaloneOptionMaxWidth: 16,
    imgStandaloneMaterialMinHeight: 0,
    imgStandaloneMaterialMaxHeight: 5,
    imgStandaloneMaterialMinWidth: 0,
    imgStandaloneMaterialMaxWidth: 16,
    // 行内图
    imgInlineStemMinHeight: 0,
    imgInlineStemMaxHeight: 1,
    imgInlineStemMinWidth: 0,
    imgInlineStemMaxWidth: 6,
    imgInlineOptionMinHeight: 0,
    imgInlineOptionMaxHeight: 1,
    imgInlineOptionMinWidth: 0,
    imgInlineOptionMaxWidth: 6,
    imgInlineMaterialMinHeight: 0,
    imgInlineMaterialMaxHeight: 4,
    imgInlineMaterialMinWidth: 0,
    imgInlineMaterialMaxWidth: 12,
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
    if (source[k] === undefined) continue;
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

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

let _config = null;
let _packagedDefault = null;

/**
 * 读取扩展目录下的 default.json 当默认值。
 * 支持两种写法：
 *   1) { shared: {...}, settings: { A4: {...}, B5: {...} } }  —— shared 为公共字段
 *   2) { settings: { A4: {...}, B5: {...} } }                 —— 直接写完整
 * 缺字段一律用硬编码 defaultConfig() 兜底。
 */
async function loadPackagedDefault() {
  if (_packagedDefault) return _packagedDefault;

  const base = defaultConfig();
  try {
    const url = chrome.runtime.getURL(DEFAULT_JSON);
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const raw = await res.json();

    if (!raw || typeof raw !== 'object') {
      _packagedDefault = base;
      return _packagedDefault;
    }

    const shared = (raw.shared && typeof raw.shared === 'object') ? raw.shared : null;
    const a4 = (raw.settings && raw.settings.A4) || {};
    const b5 = (raw.settings && raw.settings.B5) || {};

    const patch = {
      activePageSize: raw.activePageSize,
      pageSizes: raw.pageSizes,
      settings: {
        A4: shared ? { ...shared, ...a4 } : a4,
        B5: shared ? { ...shared, ...b5 } : b5,
      },
    };

    _packagedDefault = deepMerge(base, patch);
  } catch (e) {
    console.error('[fenbi-pdf] 读取 default.json 失败，使用硬编码默认值：', e);
    _packagedDefault = base;
  }
  return _packagedDefault;
}

export async function loadConfig() {
  if (_config) return _config;
  const packagedDefault = await loadPackagedDefault();
  try {
    const result = await chrome.storage.local.get(CONFIG_KEY);
    const stored = result[CONFIG_KEY];
    _config = stored
      ? deepMerge(clone(packagedDefault), stored)
      : clone(packagedDefault);
  } catch (e) {
    console.error('[fenbi-pdf] 配置加载失败，使用默认配置：', e);
    _config = clone(packagedDefault);
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
  const packagedDefault = _packagedDefault || defaultConfig();
  _config = deepMerge(clone(packagedDefault), imported);
  return _config;
}

/**
 * 恢复默认：清空 storage，把 _config 原地覆盖为 packagedDefault。
 * 原地修改以保证所有持有 getConfig() 引用的地方继续有效。
 */
export async function resetConfig() {
  const packagedDefault = await loadPackagedDefault();
  const fresh = clone(packagedDefault);
  if (_config) {
    for (const k in _config) delete _config[k];
    Object.assign(_config, fresh);
  } else {
    _config = fresh;
  }
  try {
    await chrome.storage.local.remove(CONFIG_KEY);
  } catch (e) {
    console.error('[fenbi-pdf] 配置重置失败：', e);
  }
  return _config;
}

export const CONFIG_STORAGE_KEY = CONFIG_KEY;