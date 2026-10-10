// ============================================================
// 内容解析：JSON → HTML 字符串
// 三种分页模式：
//   'fine'     精细：题干分段 + 选项按视觉行拆 + 材料分段，块内可切
//   'balanced' 平衡：题干分段 + 选项按视觉行拆 + 材料整体一块，块内不可切
//   'whole'    整题：题干 + 选项合成一块 + 材料整体一块，块内不可切
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
      let ctx = '';
      if (single) {
        if (type === 'stem') { cls = 'fb-img-standalone-stem'; ctx = 'stem'; }
        else if (type === 'option') { cls = 'fb-img-standalone-option'; ctx = 'option'; }
        else { cls = 'fb-img-standalone-material'; ctx = 'material'; }
      } else {
        cls = 'fb-img-inline';
        ctx = type;   // stem / option / material
      }
      const imgId = nextImgId();
      html += `<img src="${url}" class="${cls}" data-img-id="${imgId}" data-img-context="${ctx}" />`;
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
        // 精细：每段一块，块内可切
        for (const p of paras) {
          blocks.push({
            html: `<div class="fb-material"><div class="fb-material-paragraph">${parseContentToHTML(p, 'material')}</div></div>`,
            isChapter: false,
            qGroup: null,
            sliceable: true,
          });
        }
      } else {
        // balanced / whole：整体一块，块内不可切
        let inner = '';
        for (const p of paras) {
          inner += `<div class="fb-material-paragraph">${parseContentToHTML(p, 'material')}</div>`;
        }
        blocks.push({
          html: `<div class="fb-material">${inner}</div>`,
          isChapter: false,
          qGroup: null,
          sliceable: false,
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

      // ---------- balanced：题干分段，每段一块；选项一个块；块内不可切 ----------
      if (mode === 'balanced') {
        blocks.push({
          html: `<div class="fb-question-stem"><span class="fb-q-num">${qNum}.</span><div class="fb-stem-content"><div class="fb-stem-first">${typeLabel}${stemParts[0] || ''}</div></div></div>`,
          qGroup: qNum,
          isChapter: false,
          sliceable: false,
          hasQNum: true,
        });

        for (let i = 1; i < stemParts.length; i++) {
          blocks.push({
            html: `<div class="fb-stem-continuation"><div class="fb-stem-content"><div class="fb-stem-paragraph">${stemParts[i]}</div></div></div>`,
            qGroup: qNum,
            isChapter: false,
            sliceable: false,
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
        continue;
      }

      // ---------- fine：题干分段 + 选项块，块内可切 ----------
      blocks.push({
        html: `<div class="fb-question-stem"><span class="fb-q-num">${qNum}.</span><div class="fb-stem-content"><div class="fb-stem-first">${typeLabel}${stemParts[0] || ''}</div></div></div>`,
        qGroup: qNum,
        isChapter: false,
        sliceable: true,
        hasQNum: true,
      });

      for (let i = 1; i < stemParts.length; i++) {
        blocks.push({
          html: `<div class="fb-stem-continuation"><div class="fb-stem-content"><div class="fb-stem-paragraph">${stemParts[i]}</div></div></div>`,
          qGroup: qNum,
          isChapter: false,
          sliceable: true,
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