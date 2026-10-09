// ============================================================
// 图片尺寸覆盖表
// 只覆盖 max-height / max-width，绝不改 width / height / object-fit
// - { imgId: { maxHeightCm } } 单位 cm
// ============================================================

let overrides = {};

export function resetOverrides() {
  overrides = {};
}

export function setOverride(imgId, { maxHeightCm }) {
  if (maxHeightCm == null || maxHeightCm <= 0) {
    delete overrides[imgId];
    return;
  }
  overrides[imgId] = { maxHeightCm };
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
 * 生成覆盖 CSS。只改 max-height，其他属性不动。
 */
export function buildOverrideCSS() {
  const lines = [];
  for (const [id, o] of Object.entries(overrides)) {
    if (o.maxHeightCm == null) continue;
    lines.push(`[data-img-id="${id}"] { max-height: ${o.maxHeightCm}cm !important; }`);
  }
  return lines.join('\n');
}