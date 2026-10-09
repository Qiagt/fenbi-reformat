// ============================================================
// 字体系统
// - 内置字体预设（宋体 / 仿宋GB2312 / 楷体 / 黑体）
// - 用户上传的自定义字体（IndexedDB 存储，dataURL 形式）
// - 字体栈拼接（Times New Roman 接管字母数字，用户字体接管其余字符）
// ============================================================

const FONT_DB = 'fb-pdf-fonts-db';
const FONT_DB_VERSION = 1;
const FONT_STORE = 'fonts';

/**
 * 内置字体预设。
 */
const FONT_PRESETS = [
  { value: 'SimSun',   label: '宋体' },
  { value: 'FangSong', label: '仿宋GB2312' },
  { value: 'KaiTi',    label: '楷体' },
  { value: 'SimHei',   label: '黑体' },
];

// 模块内部状态：{ 字体名: dataURL }
let customFonts = {};

// ---------------- IndexedDB ----------------

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FONT_DB, FONT_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(FONT_STORE)) {
        db.createObjectStore(FONT_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, 'readonly');
    const store = tx.objectStore(FONT_STORE);
    const r1 = store.getAll();
    const r2 = store.getAllKeys();
    Promise.all([
      new Promise((r) => (r1.onsuccess = () => r(r1.result))),
      new Promise((r) => (r2.onsuccess = () => r(r2.result))),
    ])
      .then(([vals, keys]) => {
        const out = {};
        keys.forEach((k, i) => (out[k] = vals[i]));
        resolve(out);
      })
      .catch(reject);
  });
}

async function idbPut(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, 'readwrite');
    tx.objectStore(FONT_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, 'readwrite');
    tx.objectStore(FONT_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------- 对外 API ----------------

/**
 * 启动时调用一次，从 IndexedDB 加载所有自定义字体到内存缓存。
 */
export async function loadAllFonts() {
  try {
    customFonts = await idbGetAll();
  } catch (e) {
    console.error('[fenbi-pdf] 自定义字体加载失败：', e);
    customFonts = {};
  }
  return customFonts;
}

/**
 * 返回当前内存中的自定义字体字典 { 字体名: dataURL }。
 */
export function getCustomFonts() {
  return customFonts;
}

/**
 * 保存一份自定义字体，并刷新内存缓存。
 * @param {string} name 字体名（不含扩展名）
 * @param {string} dataUrl dataURL 形式的字体二进制
 */
export async function saveCustomFont(name, dataUrl) {
  await idbPut(name, dataUrl);
  customFonts[name] = dataUrl;
}

/**
 * 删除自定义字体。
 */
export async function removeCustomFont(name) {
  await idbDelete(name);
  delete customFonts[name];
}

/**
 * 从 File 对象读取为 dataURL。
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFontFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * 所有可选的字体（内置 + 自定义），供下拉框使用。
 */
export function getAllFontOptions() {
  const out = [...FONT_PRESETS];
  for (const name in customFonts) {
    out.push({ value: name, label: `[自定义] ${name}` });
  }
  return out;
}

/**
 * 返回某个字体名对应的基础字体栈（不含 TimesNR-EN 前缀）。
 */
function baseFont(name) {
  if (name === 'SimSun')   return `"SimSun", "宋体", "Songti SC", serif`;
  if (name === 'FangSong') return `"FangSong_GB2312", "仿宋_GB2312", "FangSong", "仿宋", serif`;
  if (name === 'KaiTi')    return `"KaiTi", "楷体", "STKaiti", serif`;
  if (name === 'SimHei')   return `"SimHei", "黑体", sans-serif`;
  // 自定义字体：优先使用它，其余字符回落到宋体
  return `"${name}", "SimSun", "宋体", serif`;
}

/**
 * 完整的字体栈字符串。
 * 前缀 "TimesNR-EN" 由 @font-face 定义，只接管 [0-9A-Za-z%.] 等字符，
 * 其余字符（含中文标点、引号、破折号）交给用户选择的字体。
 */
export function fontFamilyString(name) {
  return `"TimesNR-EN", ${baseFont(name)}`;
}

/**
 * 生成所有 @font-face 声明（供 styles.js 拼进预览页 CSS）。
 * 只包含自定义字体。
 */
export function buildFontFaces() {
  return Object.entries(customFonts)
    .map(
      ([name, url]) =>
        `@font-face { font-family: "${name}"; src: url("${url}"); }`
    )
    .join('\n');
}

/**
 * 内置字体的名称集合（用于在 UI 中判断某个字体是否可删除）。
 */
export function isBuiltinFont(name) {
  return FONT_PRESETS.some((f) => f.value === name);
}