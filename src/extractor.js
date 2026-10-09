// ============================================================
// 从粉笔做题页 DOM 提取题目 JSON
// 原用户脚本逻辑，去掉油猴头，改为导出函数
// ============================================================

const CHAPTER_SEL  = 'div.chapter-container';
const MATERIAL_SEL = '[class="material-content ng-star-inserted"]';
const TI_SEL       = 'div.ti-container';

function localIsoTime() {
  const d = new Date();
  const pad = (n, w = 2) => String(Math.abs(n)).padStart(w, '0');
  const tz = -d.getTimezoneOffset();
  const sign = tz >= 0 ? '+' : '-';
  const th = pad(Math.floor(Math.abs(tz) / 60));
  const tm = pad(Math.abs(tz) % 60);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T`
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
       + `${sign}${th}:${tm}`;
}

function inlineOf(node) {
  const raw = [];
  const walk = (n) => {
    if (n.nodeType === 3) {
      const s = (n.nodeValue ?? '').replace(/[\u00a0\u3000]/g, ' ');
      if (s) raw.push(s);
      return;
    }
    if (n.nodeType !== 1) return;
    const tag = n.tagName.toLowerCase();
    if (tag === 'img') {
      const src = n.getAttribute('src') || n.src || '';
      if (src) raw.push({ img: src });
      return;
    }
    if (tag === 'u') {
      raw.push('#blank ');
      return;
    }
    if (tag === 'br') {
      raw.push('\n\n');
      return;
    }
    for (const c of n.childNodes) walk(c);
  };
  for (const c of node.childNodes) walk(c);

  const merged = [];
  for (const x of raw) {
    if (typeof x === 'string') {
      if (x.length === 0) continue;
      const last = merged[merged.length - 1];
      if (typeof last === 'string') merged[merged.length - 1] = last + x;
      else merged.push(x);
    } else {
      merged.push(x);
    }
  }
  return merged;
}

function getExamName() {
  const el = document.querySelector('.header-title');
  if (!el) return null;
  const t = (el.getAttribute('title') || el.textContent || '').trim();
  return t || null;
}

function extractChapter(node) {
  const name = (node.querySelector('.chapter-name')?.textContent || '').trim() || null;
  const desc = (node.querySelector('.chapter-desc')?.textContent || '').trim() || null;
  return { type: 'chapter', name, desc };
}

function extractMaterial(node) {
  const paragraphs = [];
  node.querySelectorAll('p').forEach((p) => {
    const inl = inlineOf(p);
    if (inl.length) paragraphs.push(inl);
  });
  return { type: 'material', paragraphs };
}

function extractQuestion(node) {
  const typeEl = node.querySelector('.title-type-name');
  const questionType = (typeEl?.textContent || '').trim() || null;

  const qc = node.querySelector('div.question-choice-container');
  if (!qc) {
    return { type: 'question', questionType, stem: [], options: [] };
  }

  const allPs = Array.from(qc.querySelectorAll('p'));
  const stemPs = allPs.filter((p) => !p.closest('li'));
  const optPs  = allPs.filter((p) =>  p.closest('li'));

  const stem = [];
  stemPs.forEach((p) => {
    const inl = inlineOf(p);
    if (inl.length) stem.push(inl);
  });

  const options = [];
  optPs.forEach((p) => {
    const inl = inlineOf(p);
    if (inl.length) options.push(inl);
  });

  return { type: 'question', questionType, stem, options };
}

/**
 * 从当前粉笔做题页提取试卷 JSON。
 * @returns {Object} JSON 对象（可直接 JSON.stringify 后喂给预览）
 */
export function extractFromPage() {
  const nodes = Array.from(document.querySelectorAll(
    [CHAPTER_SEL, MATERIAL_SEL, TI_SEL].join(', ')
  ));

  const filtered = nodes.filter((n) => {
    if (n.matches(MATERIAL_SEL)) {
      return !n.parentElement?.closest(MATERIAL_SEL);
    }
    return true;
  });

  const items = [];
  filtered.forEach((node) => {
    if (node.matches(CHAPTER_SEL))       items.push(extractChapter(node));
    else if (node.matches(MATERIAL_SEL)) items.push(extractMaterial(node));
    else if (node.matches(TI_SEL))       items.push(extractQuestion(node));
  });

  return {
    url: location.href,
    create_time: localIsoTime(),
    exam: { name: getExamName() },
    items,
  };
}