// ============================================================
// 内容解析：JSON → HTML 字符串
// - toChineseNum：阿拉伯数字 → 汉字数字（用于"第X部分"）
// - isCircleNumPara：判断某个段落是否以 ①②③ 等圆圈序号开头
// - parseContentToHTML：把 [文字|{img}] 数组转为 HTML 片段
// - buildBlocks：把整份 JSON 转为 block 数组（含元数据）
// ============================================================

/**
 * 阿拉伯数字转汉字数字（1 → 一，10 → 十，21 → 二十一）。
 * 试卷模块序号一般不超过几十，按中文习惯处理 1-99 即可。
 */
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

/**
 * 判断某个 stem / material 段落是否以圆圈序号（①-⑳）开头。
 * 段落格式：["字符串", {img}, ...]，只要第一个非空字符串以圆圈序号开头就算。
 */
export function isCircleNumPara(arr) {
    if (!Array.isArray(arr)) return false;
    for (let i = 0; i < arr.length; i++) {
        const el = arr[i];
        if (typeof el === 'string') {
            const t = el.replace(/^\s+/, '');
            if (t.length > 0) {
                // ① = U+2460, ⑳ = U+2473
                return /[\u2460-\u2473]/.test(t.charAt(0));
            }
        } else {
            // 遇到图片等非文本元素，直接判定不是圆圈序号段落
            return false;
        }
    }
    return false;
}

/**
 * 把 [文字|{img}] 数组转为 HTML 片段。
 * @param {Array} arr 内容数组
 * @param {String} type 'stem' | 'option' | 'material'
 */
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
            html += `<img src="${url}" class="${cls}" />`;
        }
    }
    return html;
}

/**
 * 把整份试卷 JSON 转成 block 数组。
 *
 * 每个 block 的结构：
 *   {
 *     html: String,        // 该块的 HTML 内容
 *     isChapter: Boolean,  // 是否是模块标题（第一个除外强制分页用）
 *     isHeader: Boolean,   // 是否是页头（已废弃，保留位）
 *     qGroup: Number|null, // 属于哪一题（用于 keepQuestionTogether 分组）
 *     sliceable: Boolean,  // 是否允许行级切分
 *     hasQNum: Boolean,    // 是否含题号（切分时需保留占位）
 *     isOptions: Boolean,  // 是否是选项块（需要在分页前拆行）
 *   }
 *
 * @param {Object} data 试卷 JSON
 * @param {Object} settings 当前页面大小的配置对象
 */
export function buildBlocks(data, settings, extras) {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const s = settings;
    const blocks = [];

    // ---- 封面 ----
    if (extras && extras.cover) {
        blocks.push({
            html: extras.cover,
            isChapter: false,
            qGroup: null,
            sliceable: false,
            isFullPage: true,
        });
    }
    // ---- 注意事项 ----
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
        // ---------- 模块标题 ----------
        if (item.type === 'chapter') {
            chapterIdx++;
            const prefix = s.chapterShowPartIndex
                ? `第${toChineseNum(chapterIdx)}部分 `
                : '';
            blocks.push({
                html: `<div class="fb-chapter"><h2>${prefix}${item.name}</h2>${item.desc ? `<p class="fb-chapter-desc">${item.desc}</p>` : ''
                    }</div>`,
                isChapter: true,
                qGroup: null,
                sliceable: false,
            });
            continue;
        }

        // ---------- 材料段落 ----------
        if (item.type === 'material') {
            const paras = item.paragraphs || [];
            const circleFlags = s.circleNumBlock ? paras.map(isCircleNumPara) : [];
            for (let mi = 0; mi < paras.length; mi++) {
                let noSlice = false;
                if (s.circleNumBlock && circleFlags[mi]) {
                    noSlice =
                        (mi > 0 && circleFlags[mi - 1]) ||
                        (mi < circleFlags.length - 1 && circleFlags[mi + 1]);
                }
                blocks.push({
                    html: `<div class="fb-material"><div class="fb-material-paragraph">${parseContentToHTML(
                        paras[mi],
                        'material'
                    )}</div></div>`,
                    isChapter: false,
                    qGroup: null,
                    sliceable: !noSlice,
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

            // 题干首段（含题号）
            blocks.push({
                html: `<div class="fb-question-stem"><span class="fb-q-num">${qNum}.</span><div class="fb-stem-content"><div class="fb-stem-first">${typeLabel}${stemParts[0] || ''
                    }</div></div></div>`,
                qGroup: qNum,
                isChapter: false,
                sliceable: !stemNoSlice(0),
                hasQNum: true,
            });

            // 题干续段
            for (let i = 1; i < stemParts.length; i++) {
                blocks.push({
                    html: `<div class="fb-stem-continuation"><div class="fb-stem-content"><div class="fb-stem-paragraph">${stemParts[i]}</div></div></div>`,
                    qGroup: qNum,
                    isChapter: false,
                    sliceable: !stemNoSlice(i),
                });
            }

            // 选项
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