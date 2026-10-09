// ============================================================
// 内容解析：JSON → HTML 字符串
// 三种分页模式：
//   'fine'     精细：题干分段 + 选项按视觉行拆 + 材料分段
//   'balanced' 平衡：题干整体 + 每个选项一个 block + 材料整体
//   'whole'    整题：一题一块 + 材料整体
// ============================================================

let _imgIdCounter = 0;
function resetImgIdCounter() {
  _imgIdCounter = 0;
}
function nextImgId() {
  return 'img-' + (++_imgIdCounter);
}

export function toChineseNum(n) {
  const cn = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n < 10) return cn[n];
  if (n === 10) return '十';
  if (n < 20) return '十' + cn[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return cn[t] + '十' + (o > 0 ? cn[o] : '');
  }
  return String(n);
}

export function isCircleNumPara(arr) {
  if (!Array.isArray(arr)) return false;
  for (let i = 0; i < arr.length; i++) {
    const el = arr[i];
    if (typeof el === 'string') {
      const t = el.replace(/^\s+/, '');
      if (t.length > 0) {
        return /[\u2460-\u2473]/.test(t.charAt(0));
      }
    } else {
      return false;
    }
  }
  return false;
}

export function parseContentToHTML(arr, type) {
  if (!Array.isArray(arr)) return '';
  const single = arr.length === 1 && typeof arr[0] === 'object' && arr[0].img;
  let html = '';
  for (const it of arr) {
    if (typeof it === 'string') {
      html += `<span>${it.replace(/#blank/g, '<span class="fb-blank">　　　</span>')}</span>`;
    } else if (it && it.img) {
      const url = it.img.startsWith('//') ? 'https:' + it.img : it.img;
      let cls = '';
      if (single) {
        if (type === 'stem') cls = 'fb-img-standalone-stem';
        else if (type === 'option') cls = 'fb-img-standalone-option';
        else cls = 'fb-img-standalone-material';
      } else {
        cls = 'fb-img-inline';
      }
      const imgId = nextImgId();
      html += `<img src="${url}" class="${cls}" data-img-id="${imgId}" />`;
    }
  }
  return html;
}

export function buildBlocks(data, settings, extras) {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const s = settings;
  const mode = s.paginationMode || 'fine';
  const blocks = [];

  resetImgIdCounter();

  if (extras && extras.cover) {
    blocks.push({
      html: extras.cover,
      isChapter: false,
      qGroup: null,
      sliceable: false,
      isFullPage: true,
    });
  }
  if (extras && extras.notice) {
    blocks.push({
      html: extras.notice,
      isChapter: false,
      qGroup: null,
      sliceable: false,
      isFullPage: true,
    });
  }

  let qNum = 1;
  let chapterIdx = 0;

  for (const item of data.items) {
    // ---------- 模块 ----------
    if (item.type === 'chapter') {
      chapterIdx++;
      const prefix = s.chapterShowPartIndex
        ? `第${toChineseNum(chapterIdx)}部分 `
        : '';
      blocks.push({
        html: `<div class="fb-chapter"><h2>${prefix}${item.name}</h2>${item.desc ? `<p class="fb-chapter-desc">${item.desc}</p>` : ''}</div>`,
        isChapter: true,
        qGroup: null,
        sliceable: false,
      });
      continue;
    }

    // ---------- 材料 ----------
    if (item.type === 'material') {
      const paras = item.paragraphs || [];

      if (mode === 'fine') {
        const circleFlags = s.circleNumBlock ? paras.map(isCircleNumPara) : [];
        for (let mi = 0; mi < paras.length; mi++) {
          let noSlice = false;
          if (s.circleNumBlock && circleFlags[mi]) {
            noSlice =
              (mi > 0 && circleFlags[mi - 1]) ||
              (mi < circleFlags.length - 1 && circleFlags[mi + 1]);
          }
          blocks.push({
            html: `<div class="fb-material"><div class="fb-material-paragraph">${parseContentToHTML(paras[mi], 'material')}</div></div>`,
            isChapter: false,
            qGroup: null,
            sliceable: !noSlice,
          });
        }
      } else {
        let inner = '';
        for (const p of paras) {
          inner += `<div class="fb-material-paragraph">${parseContentToHTML(p, 'material')}</div>`;
        }
        blocks.push({
          html: `<div class="fb-material">${inner}</div>`,
          isChapter: false,
          qGroup: null,
          sliceable: mode === 'balanced',
        });
      }
      continue;
    }

    // ---------- 题目 ----------
    if (item.type === 'question') {
      let typeLabel = '';
      if (item.questionType === '多选题') typeLabel = '<strong>（多选题）</strong>';
      else if (item.questionType === '判断题') typeLabel = '<strong>（判断题）</strong>';

      const stemParts = item.stem.map((p) => parseContentToHTML(p, 'stem'));

      // ---------- whole：整题一块 ----------
      if (mode === 'whole') {
        let html = `<div class="fb-question-whole">`;
        html += `<div class="fb-question-stem"><span class="fb-q-num">${qNum}.</span><div class="fb-stem-content"><div class="fb-stem-first">${typeLabel}${stemParts[0] || ''}</div>`;
        for (let i = 1; i < stemParts.length; i++) {
          html += `<div class="fb-stem-paragraph">${stemParts[i]}</div>`;
        }
        html += `</div></div>`;

        if (item.options && item.options.length > 0) {
          let optsHTML = '';
          for (let i = 0; i < item.options.length; i++) {
            const content = parseContentToHTML(item.options[i], 'option');
            optsHTML += `<div class="fb-option"><div class="fb-option-label">${labels[i]}.</div><div class="fb-option-content">${content}</div></div>`;
          }
          html += `<div class="fb-options">${optsHTML}</div>`;
        }
        html += `</div>`;

        blocks.push({
          html,
          qGroup: qNum,
          isChapter: false,
          sliceable: false,
          hasQNum: true,
        });
        qNum++;
        continue;
      }

      // ---------- balanced：题干整体一块 + 每选项一块 ----------
      if (mode === 'balanced') {
        let stemInner = `<div class="fb-stem-first">${typeLabel}${stemParts[0] || ''}</div>`;
        for (let i = 1; i < stemParts.length; i++) {
          stemInner += `<div class="fb-stem-paragraph">${stemParts[i]}</div>`;
        }
        blocks.push({
          html: `<div class="fb-question-stem"><span class="fb-q-num">${qNum}.</span><div class="fb-stem-content">${stemInner}</div></div>`,
          qGroup: qNum,
          isChapter: false,
          sliceable: false,
          hasQNum: true,
        });

        if (item.options && item.options.length > 0) {
          for (let i = 0; i < item.options.length; i++) {
            const content = parseContentToHTML(item.options[i], 'option');
            blocks.push({
              html: `<div class="fb-options single-option"><div class="fb-option"><div class="fb-option-label">${labels[i]}.</div><div class="fb-option-content">${content}</div></div></div>`,
              qGroup: qNum,
              isChapter: false,
              isOptions: true,
              sliceable: false,
            });
          }
        }
        qNum++;
        continue;
      }

      // ---------- fine：题干分段 + 选项块 ----------
      const stemCircleFlags = s.circleNumBlock
        ? item.stem.map(isCircleNumPara)
        : [];

      const stemNoSlice = (i) => {
        if (!s.circleNumBlock || !stemCircleFlags[i]) return false;
        return (
          (i > 0 && stemCircleFlags[i - 1]) ||
          (i < stemCircleFlags.length - 1 && stemCircleFlags[i + 1])
        );
      };

      blocks.push({
        html: `<div class="fb-question-stem"><span class="fb-q-num">${qNum}.</span><div class="fb-stem-content"><div class="fb-stem-first">${typeLabel}${stemParts[0] || ''}</div></div></div>`,
        qGroup: qNum,
        isChapter: false,
        sliceable: !stemNoSlice(0),
        hasQNum: true,
      });

      for (let i = 1; i < stemParts.length; i++) {
        blocks.push({
          html: `<div class="fb-stem-continuation"><div class="fb-stem-content"><div class="fb-stem-paragraph">${stemParts[i]}</div></div></div>`,
          qGroup: qNum,
          isChapter: false,
          sliceable: !stemNoSlice(i),
        });
      }

      if (item.options && item.options.length > 0) {
        let optsHTML = '';
        for (let i = 0; i < item.options.length; i++) {
          const content = parseContentToHTML(item.options[i], 'option');
          optsHTML += `<div class="fb-option"><div class="fb-option-label">${labels[i]}.</div><div class="fb-option-content">${content}</div></div>`;
        }
        blocks.push({
          html: `<div class="fb-options">${optsHTML}</div>`,
          qGroup: qNum,
          isChapter: false,
          isOptions: true,
          sliceable: false,
        });
      }

      qNum++;
    }
  }

  return blocks;
}