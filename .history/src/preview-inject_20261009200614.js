// ============================================================
// 分页引擎（模块函数版）
// - runPagination({ settings, page, bodyFF })
// - 页面里需已存在：#fb-measure、#fb-staging、#fb-output
// ============================================================

export function runPagination(deps) {
  var SETTINGS = deps.settings;
  var PAGE = deps.page;
  var BODY_FF = deps.bodyFF;

  var mmCache = null;
  function mmToPx(mm) {
    if (mmCache === null) {
      var d = document.createElement('div');
      d.style.cssText = 'width:100mm;position:absolute;visibility:hidden;';
      document.body.appendChild(d);
      mmCache = d.getBoundingClientRect().width / 100;
      document.body.removeChild(d);
    }
    return mm * mmCache;
  }

  function waitForAssets() {
    return new Promise(function (resolve) {
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(resolve).catch(resolve);
        } else resolve();
      };
      var to = setTimeout(finish, 12000);
      var imgs = Array.from(document.querySelectorAll('#fb-measure img'));
      var pending = imgs.filter(function (i) { return !i.complete; });
      if (pending.length === 0) { clearTimeout(to); return finish(); }
      var remain = pending.length;
      pending.forEach(function (img) {
        var step = function () { remain--; if (remain === 0) { clearTimeout(to); finish(); } };
        img.addEventListener('load', step, { once: true });
        img.addEventListener('error', step, { once: true });
      });
    });
  }

  function applyAdaptiveGrid() {
    document.querySelectorAll('#fb-measure .fb-options').forEach(function (container) {
      var options = Array.from(container.querySelectorAll('.fb-option'));
      if (options.length === 0) return;
      var gap = 20, cw = container.clientWidth;
      var mb = document.createElement('div');
      mb.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-99999px;top:0;pointer-events:none;';
      container.appendChild(mb);
      var maxW = 0;
      options.forEach(function (opt) {
        var clone = opt.cloneNode(true);
        clone.style.cssText = 'display:inline-flex;white-space:nowrap;width:auto;max-width:none;';
        mb.appendChild(clone);
        var w = clone.getBoundingClientRect().width;
        if (w > maxW) maxW = w;
        mb.removeChild(clone);
      });
      container.removeChild(mb);
      var cols = 1;
      if (options.length === 4) {
        if (maxW * 4 + gap * 3 <= cw) cols = 4;
        else if (maxW * 2 + gap <= cw) cols = 2;
      } else if (options.length === 2) {
        if (maxW * 2 + gap <= cw) cols = 2;
      }
      // balanced 模式的 single-option 只含 1 个选项，不参与网格，强制 1 列
      if (container.classList.contains('single-option')) {
        cols = 1;
      }
      container.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
    });
  }

  function explodeOptionsIntoRows(measure) {
    function getRowGap(cs) {
      var g = cs.rowGap;
      if (g === 'normal' || !g) return '5px';
      return g;
    }
    var optionsEls = Array.from(measure.querySelectorAll('.fb-options'));
    optionsEls.forEach(function (el) {
      var opts = Array.from(el.querySelectorAll('.fb-option'));
      if (opts.length === 0) return;

      var groups = [];
      var lastTop = null, cur = [];
      opts.forEach(function (opt) {
        var top = opt.offsetTop;
        if (lastTop === null || Math.abs(top - lastTop) < 2) {
          cur.push(opt);
        } else {
          groups.push(cur);
          cur = [opt];
        }
        lastTop = top;
      });
      if (cur.length > 0) groups.push(cur);
      if (groups.length <= 1) return;

      var blockWrapper = el.closest('.fb-block');
      if (!blockWrapper) return;

      var cs = getComputedStyle(el);
      var parent = blockWrapper.parentNode;

      var newBlocks = groups.map(function (group, idx) {
        var newBlock = document.createElement('div');
        newBlock.className = 'fb-block';
        var attrs = blockWrapper.attributes;
        for (var ai = 0; ai < attrs.length; ai++) {
          var a = attrs[ai];
          if (a.name.indexOf('data-') === 0) newBlock.setAttribute(a.name, a.value);
        }
        var newOptions = document.createElement('div');
        newOptions.className = 'fb-options';
        newOptions.style.gridTemplateColumns = cs.gridTemplateColumns;
        newOptions.style.columnGap = cs.columnGap;
        newOptions.style.rowGap = cs.rowGap;
        newOptions.style.marginTop = (idx === 0 ? cs.marginTop : getRowGap(cs));
        newOptions.style.marginBottom = (idx === groups.length - 1 ? cs.marginBottom : '0');
        group.forEach(function (opt) {
          newOptions.appendChild(opt.cloneNode(true));
        });
        newBlock.appendChild(newOptions);
        return newBlock;
      });

      newBlocks.forEach(function (nb) { parent.insertBefore(nb, blockWrapper); });
      parent.removeChild(blockWrapper);
    });
  }

  function measureFooterHeight(fontFamily, fontSize) {
    var d = document.createElement('div');
    d.style.cssText = 'position:absolute;visibility:hidden;font-family:' + fontFamily + ';font-size:' + fontSize + ';';
    d.textContent = '第 1 页 共 1 页';
    document.body.appendChild(d);
    var h = d.getBoundingClientRect().height;
    document.body.removeChild(d);
    return h;
  }

  function getAllTextNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [], n;
    while (n = walker.nextNode()) nodes.push(n);
    return nodes;
  }

  function findCutPoint(el, cutY) {
    var atomics = el.querySelectorAll('img, .fb-img-standalone-stem, .fb-img-standalone-option, .fb-img-standalone-material');
    var effective = cutY;
    for (var a = 0; a < atomics.length; a++) {
      var ar = atomics[a].getBoundingClientRect();
      if (ar.top < cutY && ar.bottom > cutY) {
        if (ar.top < effective) effective = ar.top;
      }
    }

    var textNodes = getAllTextNodes(el);
    for (var ni = 0; ni < textNodes.length; ni++) {
      var node = textNodes[ni];
      var text = node.data;
      if (!text) continue;

      var nr = document.createRange();
      nr.selectNodeContents(node);
      var nrects = nr.getClientRects();
      var exceeds = false;
      for (var r = 0; r < nrects.length; r++) {
        if (nrects[r].bottom > effective) { exceeds = true; break; }
      }
      if (!exceeds) continue;

      for (var i = 0; i < text.length; i++) {
        var cr = document.createRange();
        cr.setStart(node, i);
        cr.setEnd(node, i + 1);
        var crects = cr.getClientRects();
        if (crects.length === 0) continue;
        if (crects[0].bottom > effective) {
          return { node: node, offset: i };
        }
      }
      return { node: node, offset: text.length };
    }
    return null;
  }

  function markCutPoint(el, cut) {
    var node = cut.node;
    var offset = cut.offset;
    var marker = document.createElement('span');
    marker.className = '__fb-cut-marker__';
    marker.style.display = 'none';
    var parent = node.parentNode;
    if (!parent) return null;
    if (offset <= 0) {
      parent.insertBefore(marker, node);
    } else if (offset >= node.data.length) {
      if (node.nextSibling) parent.insertBefore(marker, node.nextSibling);
      else parent.appendChild(marker);
    } else {
      var right = node.splitText(offset);
      parent.insertBefore(marker, right);
    }
    return marker;
  }

  function processHead(cloneEl) {
    var marker = cloneEl.querySelector('.__fb-cut-marker__');
    if (!marker) return;

    var range = document.createRange();
    range.setStartAfter(marker);
    if (cloneEl.childNodes.length > 0) {
      range.setEnd(cloneEl, cloneEl.childNodes.length);
    } else {
      range.setEndAfter(marker);
    }
    range.deleteContents();

    if (marker.parentNode) marker.parentNode.removeChild(marker);
  }

  function processTail(cloneEl, hasQNum) {
    var marker = cloneEl.querySelector('.__fb-cut-marker__');
    if (!marker) return;

    var oldQNum = hasQNum ? cloneEl.querySelector('.fb-q-num') : null;
    var qnumParent = null, qnumNext = null;
    if (oldQNum && oldQNum.parentNode) {
      qnumParent = oldQNum.parentNode;
      qnumNext = oldQNum.nextSibling;
      qnumParent.removeChild(oldQNum);
    }

    var range = document.createRange();
    if (cloneEl.childNodes.length > 0) {
      range.setStart(cloneEl, 0);
    } else {
      range.setStartBefore(marker);
    }
    range.setEndBefore(marker);
    range.deleteContents();

    if (marker.parentNode) marker.parentNode.removeChild(marker);

    if (oldQNum && qnumParent) {
      oldQNum.style.visibility = 'hidden';
      if (qnumNext && qnumNext.parentNode === qnumParent) {
        qnumParent.insertBefore(oldQNum, qnumNext);
      } else {
        qnumParent.insertBefore(oldQNum, qnumParent.firstChild);
      }
    }
  }

  function paginate() {
    var measure = document.getElementById('fb-measure');
    var staging = document.getElementById('fb-staging');
    var output = document.getElementById('fb-output');

    var mode = SETTINGS.paginationMode || 'fine';

    if (mode === 'fine') {
      explodeOptionsIntoRows(measure);
    }

    // 统一题号宽度
    (function () {
      var numEls = measure.querySelectorAll('.fb-q-num');
      if (numEls.length === 0) return;
      var probe = document.createElement('div');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:-99999px;top:0;width:auto;';
      measure.appendChild(probe);
      var maxW = 0;
      numEls.forEach(function (el) {
        var c = el.cloneNode(true);
        c.style.width = 'auto';
        c.style.minWidth = '0';
        c.style.flexShrink = '0';
        probe.appendChild(c);
        var w = c.getBoundingClientRect().width;
        if (w > maxW) maxW = w;
        probe.removeChild(c);
      });
      measure.removeChild(probe);
      if (maxW > 0) {
        document.documentElement.style.setProperty('--fb-q-num-w', maxW + 'px');
      }
    })();

    var blockEls = Array.from(measure.children).filter(function (el) {
      return el.classList && el.classList.contains('fb-block');
    });

    var footerH_px = measureFooterHeight(BODY_FF, '10.5pt');
    var footerH_mm = footerH_px / mmToPx(1);

    var padBottom = SETTINGS.footerGap + footerH_mm + SETTINGS.footerTopMargin;

    function createPage() {
      var el = document.createElement('div');
      el.className = 'fb-page';
      el.style.width = PAGE.width + 'mm';
      el.style.height = PAGE.height + 'mm';
      el.style.paddingTop = SETTINGS.marginTop + 'mm';
      el.style.paddingBottom = padBottom + 'mm';
      el.style.paddingLeft = SETTINGS.marginLeft + 'mm';
      el.style.paddingRight = SETTINGS.marginRight + 'mm';

      var content = document.createElement('div');
      content.className = 'fb-page-content';

      var footer = document.createElement('div');
      footer.className = 'fb-page-footer';
      footer.textContent = '第 1 页 共 1 页';
      footer.style.bottom = SETTINGS.footerGap + 'mm';
      footer.style.left = SETTINGS.marginLeft + 'mm';
      footer.style.right = SETTINGS.marginRight + 'mm';

      el.appendChild(content);
      el.appendChild(footer);
      staging.appendChild(el);
      return { el: el, content: content, footer: footer };
    }

    function contentBottom(page) {
      var footerTop = page.footer.getBoundingClientRect().top;
      return footerTop - mmToPx(SETTINGS.footerTopMargin);
    }

    var rawQueue = blockEls.map(function (el) {
      return {
        el: el,
        meta: {
          qGroup: el.dataset.qgroup !== '' ? parseFloat(el.dataset.qgroup) : null,
          isChapter: el.dataset.ischapter === '1',
          sliceable: el.dataset.sliceable === '1',
          hasQNum: el.dataset.hasqnum === '1',
          isFullPage: el.dataset.fullpage === '1',
        },
        isTail: false,
      };
    });

    var queue;
    var needGroup = SETTINGS.keepQuestionTogether || mode === 'whole';
    if (needGroup) {
      queue = [];
      var qi = 0;
      while (qi < rawQueue.length) {
        var it = rawQueue[qi];
        if (it.meta.qGroup != null && !Number.isNaN(it.meta.qGroup)) {
          var gid = it.meta.qGroup;
          var group = [];
          while (qi < rawQueue.length && rawQueue[qi].meta.qGroup === gid) {
            group.push(rawQueue[qi]);
            qi++;
          }
          queue.push({ isGroup: true, items: group });
        } else {
          queue.push({ isGroup: false, items: [it] });
          qi++;
        }
      }
    } else {
      queue = rawQueue.map(function (it) { return { isGroup: false, items: [it] }; });
    }

    var pages = [];
    var curPage = createPage();
    var chapterSeen = 0;
    var guard = 0;
    var MAX_GUARD = 200000;

    while (queue.length > 0) {
      if (guard++ > MAX_GUARD) { console.error('[fenbi-pdf] 分页死循环保护触发'); break; }

      var entry = queue.shift();

      if (!entry.isGroup && entry.items[0].meta.isChapter) {
        chapterSeen++;
        if (SETTINGS.chapterPageBreak && chapterSeen > 1 && curPage.content.children.length > 0) {
          pages.push(curPage);
          curPage = createPage();
        }
      }

      // fullpage（封面 / 注意事项）
      if (!entry.isGroup && entry.items[0].meta.isFullPage) {
        if (curPage.content.children.length > 0) {
          pages.push(curPage);
          curPage = createPage();
        }
        var fpClone = entry.items[0].el.cloneNode(true);
        curPage.content.appendChild(fpClone);
        void curPage.content.offsetHeight;

        if (fpClone.querySelector('.fb-cover')) {
          curPage.content.style.overflow = 'visible';
        }

        pages.push(curPage);
        curPage = createPage();
        continue;
      }

      // ---------- 分组模式 ----------
      if (entry.isGroup) {
        var clones = entry.items.map(function (it) {
          var c = it.el.cloneNode(true);
          if (it.isTail) {
            c.style.marginTop = '0';
            var fp = c.querySelector('.fb-material-paragraph, .fb-stem-first, .fb-stem-paragraph');
            if (fp) fp.style.textIndent = '0';
          }
          return c;
        });

        for (var ci = 0; ci < clones.length; ci++) curPage.content.appendChild(clones[ci]);
        void curPage.content.offsetHeight;
        var lastR = clones[clones.length - 1].getBoundingClientRect();
        if (lastR.bottom <= contentBottom(curPage)) continue;

        for (var ci2 = 0; ci2 < clones.length; ci2++) curPage.content.removeChild(clones[ci2]);

        if (curPage.content.children.length > 0) {
          pages.push(curPage);
          curPage = createPage();
        }

        for (var ci3 = 0; ci3 < clones.length; ci3++) curPage.content.appendChild(clones[ci3]);
        void curPage.content.offsetHeight;
        var lastR2 = clones[clones.length - 1].getBoundingClientRect();
        if (lastR2.bottom <= contentBottom(curPage)) continue;

        for (var ci4 = 0; ci4 < clones.length; ci4++) curPage.content.removeChild(clones[ci4]);
        for (var rr = entry.items.length - 1; rr >= 0; rr--) {
          queue.unshift({ isGroup: false, items: [entry.items[rr]] });
        }
        continue;
      }

      // ---------- 单单元 ----------
      var unit = entry.items[0];
      var unitEl = unit.el;

      var clone = unitEl.cloneNode(true);
      if (unit.isTail) {
        clone.style.marginTop = '0';
        var firstPara = clone.querySelector('.fb-material-paragraph, .fb-stem-first, .fb-stem-paragraph');
        if (firstPara) firstPara.style.textIndent = '0';
      }

      curPage.content.appendChild(clone);
      void curPage.content.offsetHeight;
      var rect = clone.getBoundingClientRect();
      var cb = contentBottom(curPage);

      if (rect.bottom <= cb) continue;

      if (unit.meta.sliceable) {
        var cut = findCutPoint(clone, cb);
        if (cut) {
          markCutPoint(clone, cut);

          var head = clone.cloneNode(true);
          var tail = clone.cloneNode(true);
          processHead(head);
          processTail(tail, unit.meta.hasQNum);

          var qnumEl = head.querySelector('.fb-q-num');
          var qnumText = qnumEl ? qnumEl.textContent : '';
          var realText = head.textContent.replace(qnumText, '').trim();
          var headHasContent = realText.length > 0 || head.querySelector('img');

          if (headHasContent) {
            curPage.content.replaceChild(head, clone);
            void head.offsetHeight;

            pages.push(curPage);
            curPage = createPage();

            var wrapper = document.createElement('div');
            wrapper.className = 'fb-block';
            var attrs = unitEl.attributes;
            for (var ai = 0; ai < attrs.length; ai++) {
              var a2 = attrs[ai];
              if (a2.name.indexOf('data-') === 0) wrapper.setAttribute(a2.name, a2.value);
            }
            wrapper.appendChild(tail);
            queue.unshift({ isGroup: false, items: [{ el: wrapper, meta: unit.meta, isTail: true }] });
            continue;
          }
        }
      }

      curPage.content.removeChild(clone);
      if (curPage.content.children.length > 0) {
        pages.push(curPage);
        curPage = createPage();
      }
      var clone2 = unitEl.cloneNode(true);
      if (unit.isTail) clone2.style.marginTop = '0';
      curPage.content.appendChild(clone2);
      void curPage.content.offsetHeight;
    }

    if (curPage.content.children.length > 0) pages.push(curPage);

    pages.forEach(function (p) {
      var last = p.content.lastElementChild;
      if (last) last.style.marginBottom = '0';
    });

    var bodyPages = [];
    pages.forEach(function (p) {
      var isCover = p.content.querySelector('.fb-cover') !== null;
      var isNotice = p.content.querySelector('.fb-notice') !== null;
      if (isCover || isNotice) {
        p.footer.textContent = '';
      } else {
        bodyPages.push(p);
      }
    });
    var totalBody = bodyPages.length;
    bodyPages.forEach(function (p, idx) {
      p.footer.textContent = '第 ' + (idx + 1) + ' 页 共 ' + totalBody + ' 页';
    });

    output.innerHTML = '';
    pages.forEach(function (p) {
      staging.removeChild(p.el);
      output.appendChild(p.el);
    });
  }

  return waitForAssets().then(function () {
    applyAdaptiveGrid();
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          try { paginate(); }
          catch (e) {
            console.error('[fenbi-pdf] 分页失败：', e);
            var out = document.getElementById('fb-output');
            if (out) out.innerHTML = '<pre>' + (e.stack || e.message) + '</pre>';
          }
          resolve();
        });
      });
    });
  });
}