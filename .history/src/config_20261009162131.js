// ============================================================
// 配置系统
// - 默认值定义（defaultSettings / defaultConfig）
// - 深度合并（deepMerge）
// - 加载 / 保存 / 获取（chrome.storage.local）
// ============================================================

const CONFIG_KEY = 'fb-pdf-config';

/**
 * 单个页面大小下的排版设置默认值。
 * 所有页面大小（A4 / B5）各自持有一份独立的设置。
 */
export function defaultSettings() {
  return {
    // ---- 正文（题干、选项） ----
    bodyFont: 'SimSun',        // SimSun / FangSong / KaiTi / SimHei / 自定义字体名
    bodyFontSize: 12,          // pt
    bodyLineHeight: 1.5,
    paraSpacing: 0,            // em，段落之间的额外间距

    // ---- 间距 ----
    stemOptionGap: 5,          // px，题干与选项之间的距离
    questionGap: 10,           // px，题与题之间的距离

    // ---- 模块（大题）----
    chapterPageBreak: false,   // 每个模块开始前分页（第一个除外）
    chapterShowPartIndex: false, // 显示"第X部分"（X 为汉字数字）
    chapterCenterAlign: true,  // 模块名称居中
    chapterNameFont: 'SimHei',
    chapterNameSize: 12,       // pt
    chapterNameMarginBottom: 5, // px
    chapterDescFont: 'SimSun',
    chapterDescSize: 12,       // pt
    chapterDescMarginBottom: 10, // px

    // ---- 材料 ----
    materialFont: 'SimSun',
    materialSize: 12,          // pt
    materialLineHeight: 1.5,
    materialParaSpacing: 5,    // px
    materialMarginBottom: 15,  // px

    // ---- 页面 ----
    // 注意：marginBottom 已废弃，实际由 footerGap + 页脚高度 + footerTopMargin 自动推导。
    // 保留字段仅为兼容旧配置，UI 中不暴露。
    marginTop: 18,             // mm
    marginBottom: 18,          // mm（废弃字段）
    marginLeft: 18,            // mm
    marginRight: 18,           // mm

    // ---- 分页 ----
    keepQuestionTogether: false, // 题目不跨页（整题放不下则整题到下一页）

    // ---- 页脚 ----
    footerGap: 8,              // mm，页脚距纸张底边
    footerTopMargin: 6,        // mm，正文停靠线到页脚顶边的距离

    // ---- 开发者模式 ----
    circleNumBlock: false,     // 圆圈序号段落独立成块（①②③ 相邻段落不可切分）
  };
}

/**
 * 全局配置默认值。
 */
export function defaultConfig() {
  return {
    activePageSize: 'A4',
    pageSizes: {
      A4: { width: 210, height: 297 }, // mm
      B5: { width: 176, height: 250 }, // mm
    },
    // 每个页面大小各自维护一份 settings
    settings: {
      A4: defaultSettings(),
      B5: defaultSettings(),
    },
  };
}

/**
 * 深度合并：以 target 为底，用 source 覆盖。
 * 数组和基本类型直接覆盖；普通对象递归合并。
 */
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

// ---------------- 模块内部状态 ----------------

let _config = null;

/**
 * 从 chrome.storage.local 加载配置（只加载一次，后续调用返回缓存）。
 * 返回合并后的完整配置对象。
 */
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

/**
 * 获取当前配置对象（必须先 loadConfig）。
 * 注意：返回的是引用，修改后需要主动调用 saveConfig()。
 */
export function getConfig() {
  if (!_config) {
    throw new Error('[fenbi-pdf] 配置尚未加载，请先调用 loadConfig()');
  }
  return _config;
}

/**
 * 把当前配置对象写入 chrome.storage.local。
 */
export async function saveConfig() {
  if (!_config) return;
  try {
    await chrome.storage.local.set({ [CONFIG_KEY]: _config });
  } catch (e) {
    console.error('[fenbi-pdf] 配置保存失败：', e);
  }
}

/**
 * 用外部对象整体替换当前配置（用于导入配置文件）。
 * 会与默认值深度合并，补齐缺失字段。
 * @param {object} imported 从 JSON 读入的对象
 */
export function replaceConfig(imported) {
  _config = deepMerge(defaultConfig(), imported);
  return _config;
}

/**
 * 重置为默认配置（清除持久化的存储）。
 */
export async function resetConfig() {
  _config = defaultConfig();
  try {
    await chrome.storage.local.remove(CONFIG_KEY);
  } catch (e) {
    console.error('[fenbi-pdf] 配置重置失败：', e);
  }
  return _config;
}

/**
 * 配置的存储键名（供需要直接操作 storage 的模块使用）。
 */
export const CONFIG_STORAGE_KEY = CONFIG_KEY;