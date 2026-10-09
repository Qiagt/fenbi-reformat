// ============================================================
// 预览页 CSS 生成
// ============================================================

import { buildFontFaces, fontFamilyString } from './fonts.js';

export function buildCSS(settings, pageSize, pageSizes) {
  const sz = pageSizes[pageSize];
  const ff = fontFamilyString;
  const fontFaces = buildFontFaces();

  const isB5 = pageSize === 'B5';

  const lineXMm     = 15;
  const sealTextXMm = isB5 ? 10 : 8;
  const sealNameYMm = isB5 ? 62.5 : 74.25;
  const sealIdYMm   = isB5 ? 167.5 : 132.75;

  const sealLineX = lineXMm - settings.marginLeft;
  const sealTextX = sealTextXMm - settings.marginLeft;
  const sealNameY = sealNameYMm - settings.marginTop;
  const sealIdY   = sealIdYMm - settings.marginTop;

  const coverShiftMm = ((lineXMm - settings.marginLeft) / 2).toFixed(2);

  const sealFontSize      = isB5 ? 11 : 13;
  const coverTitleSize    = isB5 ? 14 : 16;
  const coverSubjectSize  = isB5 ? 22 : 26;
  const coverTipTitleSize = isB5 ? 12 : 14;
  const coverTipSize      = isB5 ? 10 : 12;
  const noticeTitleSize   = isB5 ? 22 : 26;
  const noticeBodySize    = isB5 ? 10 : 12;

  const sealNameWidthMm = (2 * sealFontSize * 0.3528 + 0.4 * sealFontSize * 0.3528 + 30).toFixed(2);
  const sealIdWidthMm   = (4 * sealFontSize * 0.3528 + 0.4 * sealFontSize * 0.3528 + 30).toFixed(2);

  const imgInlineOptionMH   = settings.imgInlineOptionMinHeight   != null ? settings.imgInlineOptionMinHeight   : 0.5;
  const imgInlineStemMH     = settings.imgInlineStemMinHeight     != null ? settings.imgInlineStemMinHeight     : 1;
  const imgInlineMaterialMH = settings.imgInlineMaterialMinHeight != null ? settings.imgInlineMaterialMinHeight : 4;
  const imgStandaloneOptionMH   = settings.imgStandaloneOptionMinHeight   != null ? settings.imgStandaloneOptionMinHeight   : 2;
  const imgStandaloneStemMH     = settings.imgStandaloneStemMinHeight     != null ? settings.imgStandaloneStemMinHeight     : 4;
  const imgStandaloneMaterialMH = settings.imgStandaloneMaterialMinHeight != null ? settings.imgStandaloneMaterialMinHeight : 4;

  return `
${fontFaces}

@page {
  size: ${sz.width}mm ${sz.height}mm;
  margin: 0;
}

@font-face {
  font-family: "TimesNR-EN";
  src: local("Times New Roman"), local("TimesNewRomanPSMT"), local("TimesNewRoman"), local("Times");
  unicode-range: U+0025, U+002E, U+0030-0039, U+0041-005A, U+0061-007A;
}

html, body {
  margin: 0; padding: 0; background: #e5e7eb;
  font-family: ${ff(settings.bodyFont)};
  font-size: ${settings.bodyFontSize}pt;
  line-height: ${settings.bodyLineHeight};
  color: #000;
  word-break: break-all;
  text-align: justify;
  text-justify: auto;
}

.fb-toolbar {
  position: fixed;
  top: 50%;
  right: 320px;
  transform: translateY(-50%);
  z-index: 1000;
}
.fb-toolbar button {
  writing-mode: vertical-rl;
  text-orientation: upright;
  padding: 16px 8px;
  background: #40C463;
  color: #fff;
  border: 1px solid #40C463;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 2px;
  cursor: pointer;
  font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
}
.fb-toolbar button:hover { background: #30A14E; border-color: #30A14E; }
.fb-toolbar button:active { background: #216E39; border-color: #216E39; }

#fb-output { display: flex; flex-direction: column; align-items: center; padding: 20px 0 40px 0; }
#fb-staging { position: absolute; left: -99999px; top: 0; visibility: hidden; }

.fb-page {
  position: relative;
  background: #fff;
  box-sizing: border-box;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  margin-bottom: 20px;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
  flex-shrink: 0;
}
.fb-page:last-child { page-break-after: auto; break-after: auto; margin-bottom: 0; }

.fb-page-content { position: relative; width: 100%; height: 100%; overflow: hidden; }

.fb-page-footer {
  position: absolute;
  text-align: center;
  font-family: ${ff(settings.bodyFont)};
  font-size: 10.5pt;
  color: #000;
}

.fb-chapter { margin-top: 15px; margin-bottom: 0; }
.fb-chapter h2 {
  font-family: ${ff(settings.chapterNameFont)};
  font-size: ${settings.chapterNameSize}pt;
  font-weight: normal;
  margin: 0 0 ${settings.chapterNameMarginBottom}px 0;
  text-align: ${settings.chapterCenterAlign ? 'center' : 'left'};
}
.fb-chapter-desc {
  font-family: ${ff(settings.chapterDescFont)};
  font-size: ${settings.chapterDescSize}pt;
  margin: 0 0 ${settings.chapterDescMarginBottom}px 0;
  text-indent: 2em;
}

.fb-material {
  font-family: ${ff(settings.materialFont)};
  font-size: ${settings.materialSize}pt;
  line-height: ${settings.materialLineHeight};
}
.fb-material-paragraph {
  margin: 0 0 ${settings.materialParaSpacing}px 0;
  text-indent: 2em;
}

.fb-question-stem { display: flex; align-items: flex-start; margin-bottom: 0; }
.fb-stem-continuation { display: flex; margin-top: ${settings.paraSpacing}em; margin-bottom: 0; }
.fb-stem-continuation .fb-stem-content {
  margin-left: calc(var(--fb-q-num-w, 1.6em) + 0.3em);
  flex: 1;
  min-width: 0;
}
.fb-q-num {
  flex-shrink: 0;
  width: var(--fb-q-num-w, 1.6em);
  min-width: var(--fb-q-num-w, 1.6em);
  text-align: right;
  margin-right: 0.3em;
  font-family: ${ff(settings.chapterNameFont)};
}
.fb-stem-content { flex: 1; min-width: 0; }
.fb-stem-first { margin: 0; }
.fb-stem-paragraph { margin: 0; }

.fb-options {
  margin-left: calc(var(--fb-q-num-w, 1.6em) + 0.3em);
  margin-top: ${settings.stemOptionGap}px;
  margin-bottom: ${settings.questionGap}px;
  display: grid;
  gap: 5px 20px;
  grid-template-columns: 1fr;
}
.fb-option { display: flex; align-items: flex-start; min-width: 0; }
.fb-option-label {
  flex-shrink: 0;
  margin-right: 5px;
  font-family: ${ff(settings.chapterNameFont)};
}
.fb-option-content { flex: 1; min-width: 0; text-align: left; word-break: break-word; }

/* ============ 图片 ============ */
/* 独立图 */
.fb-img-standalone-stem {
  max-height: 4cm;
  width: auto;
  display: block;
  margin: 5px auto;
  object-fit: contain;
  min-height: ${imgStandaloneStemMH}cm;
}
.fb-img-standalone-option {
  max-height: 2cm;
  max-width: 100%;
  width: auto;
  display: block;
  margin: 5px 0;
  object-fit: contain;
  min-height: ${imgStandaloneOptionMH}cm;
}
.fb-img-standalone-material {
  max-height: 4cm;
  width: auto;
  display: block;
  margin: 5px auto;
  object-fit: contain;
  min-height: ${imgStandaloneMaterialMH}cm;
}

/* 行内图 */
.fb-img-inline {
  max-height: 1cm;
  width: auto;
  vertical-align: middle;
  margin: 0 2px;
}
img.fb-img-inline[data-img-context="stem"] {
  min-height: ${imgInlineStemMH}cm;
}
img.fb-img-inline[data-img-context="option"] {
  min-height: ${imgInlineOptionMH}cm;
}
img.fb-img-inline[data-img-context="material"] {
  min-height: ${imgInlineMaterialMH}cm;
}
.fb-blank {
  text-decoration: underline;
  text-underline-offset: auto;
  text-decoration-skip-ink: none;
  white-space: pre;
  margin: 0 2px;
}

img.fb-img-selected {
  outline: 1px solid #dc2626;
  outline-offset: 2px;
}

/* ============ 封面 ============ */
.fb-cover {
  position: relative;
  width: 100%;
  min-height: 100%;
  font-family: ${ff('SimHei')};
  --seal-line-x: ${sealLineX}mm;
  --seal-text-x: ${sealTextX}mm;
  --seal-name-y: ${sealNameY}mm;
  --seal-id-y: ${sealIdY}mm;
  --seal-name-width: ${sealNameWidthMm}mm;
  --seal-id-width: ${sealIdWidthMm}mm;
  --paper-margin-top: ${settings.marginTop}mm;
  --paper-h: ${sz.height}mm;
}

.fb-seal-line {
  position: absolute;
  left: var(--seal-line-x);
  top: calc(-1 * var(--paper-margin-top));
  height: var(--paper-h);
  width: 0;
  border-left: 0.5pt dashed #000;
}

.fb-seal-item {
  position: absolute;
  left: var(--seal-text-x);
  font-family: ${ff('SimHei')};
  font-size: ${sealFontSize}pt;
  color: #000;
  white-space: nowrap;
  line-height: 1;
  transform-origin: top left;
  transform: rotate(-90deg);
}
.fb-seal-name { top: calc(var(--seal-name-y) + var(--seal-name-width) / 2); }
.fb-seal-id   { top: calc(var(--seal-id-y)   + var(--seal-id-width) / 2); }

.fb-seal-label { display: inline; }

.fb-seal-under {
  display: inline-block;
  width: 3cm;
  height: 0;
  border-top: 0.5pt solid #000;
  vertical-align: baseline;
  margin-left: 0.4em;
}

.fb-cover-body {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  transform: translateX(${coverShiftMm}mm);
}
.fb-cover-logo {
  display: block;
  width: 3cm;
  height: 3cm;
  object-fit: contain;
  margin: 0 auto 0.6em auto;
}
.fb-cover-title {
  text-align: center;
  font-family: ${ff('SimHei')};
  font-size: ${coverTitleSize}pt;
  letter-spacing: 0.05em;
  margin: 0;
}
.fb-cover-subject {
  text-align: center;
  font-family: ${ff('SimHei')};
  font-size: ${coverSubjectSize}pt;
  letter-spacing: 0.1em;
  margin: 0.5em 0 0 0;
}
.fb-cover-tips-title {
  font-family: ${ff('SimHei')};
  font-size: ${coverTipTitleSize}pt;
  margin-top: 3em;
  margin-bottom: 1em;
}
.fb-cover-tips {
  font-family: ${ff('FangSong')};
  font-size: ${coverTipSize}pt;
  line-height: 1.5;
  padding-left: 1.5em;
  margin: 0;
  flex: 1;
}
.fb-cover-tips li { margin-bottom: 2em; }
.fb-cover-footer {
  text-align: center;
  font-family: ${ff('SimHei')};
  font-size: ${coverTipSize}pt;
  margin-top: 3em;
  padding-bottom: 1em;
}

/* ============ 注意事项 ============ */
.fb-notice {
  position: relative;
  min-height: 100%;
  font-family: ${ff('SimHei')};
  display: flex;
  flex-direction: column;
}
.fb-notice-title {
  text-align: center;
  font-family: ${ff('SimHei')};
  font-size: ${noticeTitleSize}pt;
  letter-spacing: 0.58em;
  margin: 2em 0 2em 0;
  font-weight: normal;
}
.fb-notice-rules {
  font-family: ${ff('SimHei')};
  font-size: ${noticeBodySize}pt;
  line-height: 1.8;
  padding-left: 1.5em;
  margin: 0;
  flex: 1;
}
.fb-notice-rules li { margin-bottom: 1.2em; }
.fb-notice-warning {
  font-family: ${ff('SimHei')};
  width: 60%;
  margin: 2em auto;
  border: 1.5pt dashed #000;
  padding: 1.5em;
  text-align: center;
  font-size: ${noticeBodySize}pt;
  line-height: 1.8;
}

@media print {
  html, body { background: #fff; margin: 0; padding: 0; }
  .fb-toolbar { display: none !important; }
  #fb-staging { display: none !important; }
  #fb-output { padding: 0; display: block; }
  .fb-page { margin: 0; box-shadow: none; page-break-after: always; break-after: page; }
  .fb-page:last-child { page-break-after: auto; break-after: auto; }
}
`;
}