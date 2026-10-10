let overrides = {};

export function resetOverrides() {
  overrides = {};
}

export function setOverride(imgId, { maxHeightCm, maxWidthCm }) {
  if (maxHeightCm == null && maxWidthCm == null) {
    delete overrides[imgId];
    return;
  }
  overrides[imgId] = { maxHeightCm, maxWidthCm };
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
    const rules = [];
    if (o.maxHeightCm != null) {
      rules.push(`max-height: ${o.maxHeightCm}cm !important;`);
    }
    if (o.maxWidthCm != null) {
      rules.push(`max-width: ${o.maxWidthCm}cm !important;`);
      rules.push(`width: auto !important;`);
    }
    if (rules.length === 0) continue;
    rules.push(`min-height: 0 !important;`);
    lines.push(`[data-img-id="${id}"] { ${rules.join(' ')} }`);
  }
  return lines.join('\n');
}