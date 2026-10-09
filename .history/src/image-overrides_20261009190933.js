// ============================================================
// 图片尺寸覆盖表
// - 维护 { imgId: { width, height } } 映射
// - 生成对应的 CSS 规则
// ============================================================

let overrides = {};

export function resetOverrides() {
  overrides = {};
}

export function setOverride(imgId, { width, height }) {
  if (width == null && height == null) {
    delete overrides[imgId];
    return;
  }
  overrides[imgId] = { width, height };
}

export function getOverride(imgId) {
  return overrides[imgId] || null;
}

export function getAllOverrides() {
  return { ...overrides };
}

export function loadOverrides(obj) {
  overrides = obj ? { ...obj } : {};
}

/**
 * 生成图片覆盖的 CSS。空表返回空字符串。
 */
export function buildOverrideCSS() {
  const lines = [];
  for (const [id, o] of Object.entries(overrides)) {
    const rules = [];
    rules.push(`width: ${o.width != null ? o.width + 'px' : 'auto'} !important;`);
    rules.push(`height: ${o.height != null ? o.height + 'px' : 'auto'} !important;`);
    rules.push(`max-width: none !important;`);
    rules.push(`max-height: none !important;`);
    lines.push(`[data-img-id="${id}"] { ${rules.join(' ')} }`);
  }
  return lines.join('\n');
}