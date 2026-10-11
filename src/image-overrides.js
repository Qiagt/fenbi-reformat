// ============================================================
// 单张图片尺寸覆盖
// 语义：
//   - 键不存在 → 回落全局
//   - heightCm / widthCm = 0 → auto（自然尺寸，完全解除约束）
//   - heightCm / widthCm > 0 → 固定该值
//   - 任一维度被指定 → 该图完全接管，全局约束全部失效
// ============================================================

let overrides = {};

export function resetOverrides() {
  overrides = {};
}

export function setOverride(imgId, { heightCm, widthCm }) {
  if (heightCm == null && widthCm == null) {
    delete overrides[imgId];
    return;
  }
  overrides[imgId] = { heightCm, widthCm };
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

export function buildOverrideCSS() {
  const lines = [];
  for (const [id, o] of Object.entries(overrides)) {
    const hSet = o.heightCm != null;
    const wSet = o.widthCm != null;
    if (!hSet && !wSet) continue;

    const rules = [];

    // ---- 高度 ----
    if (hSet) {
      if (o.heightCm === 0) {
        rules.push(`height: auto !important;`);
      } else {
        rules.push(`height: ${o.heightCm}cm !important;`);
      }
      rules.push(`min-height: 0 !important;`);
      rules.push(`max-height: none !important;`);
    } else {
      // 未指定高度：清除全局高度约束
      rules.push(`height: auto !important;`);
      rules.push(`min-height: 0 !important;`);
      rules.push(`max-height: none !important;`);
    }

    // ---- 宽度 ----
    if (wSet) {
      if (o.widthCm === 0) {
        rules.push(`width: auto !important;`);
      } else {
        rules.push(`width: ${o.widthCm}cm !important;`);
      }
      rules.push(`min-width: 0 !important;`);
      rules.push(`max-width: none !important;`);
    } else {
      // 未指定宽度：清除全局宽度约束
      rules.push(`width: auto !important;`);
      rules.push(`min-width: 0 !important;`);
      rules.push(`max-width: none !important;`);
    }

    lines.push(`[data-img-id="${id}"] { ${rules.join(' ')} }`);
  }
  return lines.join('\n');
}