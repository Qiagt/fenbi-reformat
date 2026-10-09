// ============================================================
// 预览与分页
// - 组装预览页的完整 HTML（CSS + 内容块 + 注入脚本）
// - 打开 about:blank 新窗口并写入
// ============================================================

import { buildCSS } from './styles.js';
import { PREVIEW_SCRIPT } from './preview-inject.js';
import { fontFamilyString } from './fonts.js';
import { buildBlocks, toChineseNum } from './parser.js';
/**
 * 打开预览页。
 * @param {Object} jsonData 试卷 JSON
 * @param {Object} deps
 *   - config: 完整配置对象（含 activePageSize、pageSizes、settings）
 *   - customFonts: { 字体名: dataURL }
 */
export function openPreview(jsonData, deps) {
  const { config, customFonts } = deps;
  const pageSize = config.activePageSize;
  const sz = config.pageSizes[pageSize];
  const settings = config.settings[pageSize];

  // 1. 生成 block 数组
  const coverHTML = buildCoverHTML(jsonData);
  const noticeHTML = buildNoticeHTML(jsonData);
  const blocks = buildBlocks(jsonData, settings, {
    cover: coverHTML,
    notice: noticeHTML,
  });
  // 2. 拼每个 block 的 HTML
  const blocksHTML = blocks
    .map(
      (b, i) =>
        `<div class="fb-block" data-idx="${i}" data-qgroup="${
          b.qGroup != null ? b.qGroup : ''
        }" data-ischapter="${b.isChapter ? '1' : ''}" data-sliceable="${
          b.sliceable ? '1' : ''
        }" data-hasqnum="${b.hasQNum ? '1' : ''}" data-fullpage="${
          b.isFullPage ? '1' : ''
        }">${b.html}</div>`
    )
    .join('');

  // 3. 生成 CSS
  const css = buildCSS(settings, pageSize, config.pageSizes);

  // 4. 传给预览页的全局变量
  const bodyFF = fontFamilyString(settings.bodyFont);

  // 5. 拼完整 HTML
  const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(jsonData.exam.name)} - 预览</title>
  <style>${css}</style>
</head>
<body>
  <div class="fb-toolbar">
    <button onclick="window.print()">🖨️ 导出 PDF / 打印</button>
  </div>

  <div id="fb-measure" style="position:absolute;visibility:hidden;left:-99999px;top:0;
       width:${sz.width - settings.marginLeft - settings.marginRight}mm;
       font-family:${bodyFF};
       font-size:${settings.bodyFontSize}pt;
       line-height:${settings.bodyLineHeight};
       color:#000;">${blocksHTML}</div>

  <div id="fb-staging"></div>
  <div id="fb-output"></div>

  <script>
    window.__FB_SETTINGS__ = ${JSON.stringify(settings)};
    window.__FB_PAGE__ = { width: ${sz.width}, height: ${sz.height} };
    window.__FB_BODY_FONT__ = ${JSON.stringify(bodyFF)};
  <\/script>
  <script>
    ${PREVIEW_SCRIPT}
  <\/script>
</body>
</html>`;

  // 6. 打开新窗口
  const blob = new Blob([fullHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) {
    alert('浏览器拦截了新窗口，请允许弹出窗口！');
    URL.revokeObjectURL(url);
    return;
  }
  // 30 秒后释放 URL（页面已加载完，不再需要它）
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}


/**
 * 简单 HTML 转义（用于 title 等文本位置）。
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// ============================================================
// 封面 / 注意事项页 HTML 构造
// ============================================================

function buildCoverHTML(jsonData) {
  const examName = jsonData.exam && jsonData.exam.name ? jsonData.exam.name : '';

  let routecs = '';
  try {
    const u = new URL(jsonData.url || '');
    routecs = u.searchParams.get('routecs') || '';
  } catch (e) {}
  const subject = routecs === 'xingce' ? '行政职业能力测验' : '';

  return `<div class="fb-cover">
    <div class="fb-seal-line" aria-hidden="true"></div>
    <div class="fb-seal-item fb-seal-name">
      <span class="fb-seal-label">姓名</span>
      <span class="fb-seal-under"></span>
    </div>
    <div class="fb-seal-item fb-seal-id">
      <span class="fb-seal-label">准考证号</span>
      <span class="fb-seal-under"></span>
    </div>
    <div class="fb-cover-body">
      <img class="fb-cover-logo" src="${chrome.runtime.getURL('static/fenbi.png')}" alt="粉笔">
            ${examName ? `<div class="fb-cover-title">${escapeHtml(examName)}</div>` : ''}
      ${subject ? `<div class="fb-cover-subject">${escapeHtml(subject)}</div>` : ''}
      <div class="fb-cover-tips-title">重要提示：</div>
      <ol class="fb-cover-tips">
        <li>为维护考生的个人权益，确保公务员考试的公平公正。请您协助我们监督考试实施工作。本场考试规定：监考人员要向本考场全体考生展示题本密封情况，并邀请2名考生代表验封签字后，方能开启试卷袋。如果您发现本考场监考人员存在违规启用试卷袋的情况，请向人力资源和社会保障部人事考试中心（公务员考试测评中心）举报。举报电话：000-12345678。</li>
        <li>在阅卷过程中发现报考者之间同一科目作答内容雷同，并经阅卷专家组确认的，考试机构将给予其该科目（场次）考试成绩为零分的处理，录用程序终止。报考者之间同一科目作答内容雷同，并有其他相关证据证明其作弊行为成立的，中央公务员主管部门将视具体情形给予取消本次考试资格并五年内限制报考公务员或者取消本次考试资格并终身限制报考公务员的处理。请您妥善看护好自己的考试试卷和答题信息，防止被他人抄袭。</li>
      </ol>
      <div class="fb-cover-footer">
        <div>本试卷由 fenbi-reformator 插件生成</div>
        <div>版权归属为粉笔公司，请勿侵权</div>
      </div>
          </div>
  </div>`;
}
function buildNoticeHTML(jsonData) {
  // 统计模块数与题目数
  let chapterCount = 0;
  let questionCount = 0;
  for (const item of jsonData.items || []) {
    if (item.type === 'chapter') chapterCount++;
    else if (item.type === 'question') questionCount++;
  }
  const timeLimit = questionCount < 100 ? 90 : 120;
  const chapterCn = toChineseNum(chapterCount);

  return `<div class="fb-notice">
    <div class="fb-notice-title">注意事项</div>
    <ol class="fb-notice-rules">
      <li>本测验共有${chapterCn}个部分，${questionCount} 道题，总时限为 ${timeLimit} 分钟。各部分不分别计时，但都给出了参考时限，供答题时参考。</li>
      <li>请在题本、答题卡指定位置上用黑色字迹的钢笔或签字笔填写自己的姓名和准考证号，并用 2B 铅笔在准考证号对应的数字上填涂。</li>
      <li>题目应在答题卡上作答，在题本上作答的一律无效。</li>
      <li>待监考人员宣布考试开始后，你才可以开始答题。</li>
      <li>监考人员宣布考试结束时，你应立即停止作答，将题本、答题卡和草稿纸都翻过来放在桌上，待监考人员确认数量无误、发出离开指令后方可离开考场。</li>
      <li>试题答错不倒扣分。</li>
      <li>严禁折叠答题卡！</li>
    </ol>
    <div class="fb-notice-warning">
      <div>停！请不要往下翻！听候监考老师的指示。</div>
      <div>否则，会影响你的成绩。</div>
    </div>
  </div>`;
}