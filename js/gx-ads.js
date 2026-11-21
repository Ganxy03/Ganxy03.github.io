/**
 * 手动广告位注入（复用主站 ganxy03.cn 已审核通过的 AdSense 广告单元）
 *
 * 文章页：标题下横幅 / 文中（第 2 个小节前）/ 长文再加一个（第 4 个小节前）
 *        / 文末 / 评论区之后
 * 列表页：顶部 / 第 3 篇前 / 第 7 篇前 / 分页前
 * 归档页：标题下 / 列表底部
 * 独立页：顶部
 * 侧栏：两个 300x250（移动端隐藏）
 *
 * 兼容 Butterfly 的 pjax：每次 pjax:complete 重新判断，已存在的 key 直接跳过。
 */
(function () {
  'use strict';

  var CLIENT = 'ca-pub-1590308046926280';
  var SLOTS = {
    top: '9036869413',
    list: '3057889626',
    article: '7125127145',
    articleMid: '7125127145',
    sidebar: '3925967364'
  };

  function make(tag, cls) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  function buildAd(key, slotKey, style, format) {
    var wrap = make('div', 'gx-ad gx-ad-' + key);
    wrap.setAttribute('data-gx-ad', key);

    var note = make('div', 'gx-ad-note');
    note.textContent = 'Advertisement';
    wrap.appendChild(note);

    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.cssText = style;
    ins.setAttribute('data-ad-client', CLIENT);
    ins.setAttribute('data-ad-slot', SLOTS[slotKey] || SLOTS.list);

    if (format === 'in-article') {
      ins.setAttribute('data-ad-format', 'fluid');
      ins.setAttribute('data-ad-layout', 'in-article');
    } else if (format === 'rectangle') {
      ins.setAttribute('data-ad-format', 'rectangle');
    } else {
      ins.setAttribute('data-ad-format', 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
    }

    wrap.appendChild(ins);
    return wrap;
  }

  function push(wrap) {
    var ins = wrap.querySelector('ins.adsbygoogle');
    if (!ins || ins.getAttribute('data-adsbygoogle-status')) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) { /* 广告脚本未就绪时静默失败 */ }
  }

  function exists(key) {
    return !!document.querySelector('[data-gx-ad="' + key + '"]');
  }

  function injectPost() {
    // 只认真正的文章页：留言页也有空的 #article-container 但没有 .post-title
    if (!document.querySelector('.post-title')) return false;
    var art = document.getElementById('article-container');
    if (!art) return false;

    // 1) 标题与正文之间
    if (!exists('top')) {
      var box = art.closest('.post-content') || art;
      var top = buildAd('top', 'top', 'display:block;min-height:90px', 'auto');
      if (box.parentNode) box.parentNode.insertBefore(top, box);
      push(top);
    }

    var h2 = art.querySelectorAll('h2');

    // 2) 正文中：第一、二个小节之间
    if (!exists('articleMid')) {
      var mid = buildAd('articleMid', 'articleMid', 'display:block', 'in-article');
      if (h2.length >= 2) {
        h2[1].parentNode.insertBefore(mid, h2[1]);
      } else {
        var ps = art.querySelectorAll('p');
        if (ps.length > 4) ps[4].parentNode.insertBefore(mid, ps[4].nextSibling);
        else art.appendChild(mid);
      }
      push(mid);
    }

    // 3) 长文再加一个：第三、四个小节之间（只对 h2 >= 6 的正文，避免短文过密）
    if (!exists('articleMid2') && h2.length >= 5) {
      var mid2 = buildAd('articleMid2', 'articleMid', 'display:block', 'in-article');
      h2[3].parentNode.insertBefore(mid2, h2[3]);
      push(mid2);
    }

    // 4) 文末、评论之上
    if (!exists('article')) {
      var bottom = buildAd('article', 'article', 'display:block;min-height:120px', 'auto');
      var comment = document.getElementById('post-comment');
      if (comment && comment.parentNode) comment.parentNode.insertBefore(bottom, comment);
      else if (art.parentNode) art.parentNode.insertBefore(bottom, art.nextSibling);
      push(bottom);
    }

    // 5) 评论区之后
    if (!exists('commentBottom')) {
      var after = buildAd('commentBottom', 'list', 'display:block;min-height:120px', 'auto');
      var c = document.getElementById('post-comment');
      if (c && c.parentNode) c.parentNode.insertBefore(after, c.nextSibling);
      push(after);
    }

    return true;
  }

  function injectIndex() {
    var list = document.getElementById('recent-posts');
    if (!list) return false;
    var items = list.querySelectorAll('.recent-post-item');
    if (!items.length) return false;

    if (!exists('top')) {
      var top = buildAd('top', 'top', 'display:block;min-height:90px', 'auto');
      list.insertBefore(top, list.firstChild);
      push(top);
    }

    // 第 3 篇前
    if (!exists('listEarly') && items.length >= 3) {
      var early = buildAd('listEarly', 'list', 'display:block;min-height:120px', 'auto');
      items[2].parentNode.insertBefore(early, items[2]);
      push(early);
    }

    // 第 7 篇前
    if (!exists('listMid') && items.length >= 7) {
      var mid = buildAd('listMid', 'list', 'display:block;min-height:120px', 'auto');
      items[6].parentNode.insertBefore(mid, items[6]);
      push(mid);
    }

    if (!exists('list')) {
      var bottom = buildAd('list', 'list', 'display:block;min-height:120px', 'auto');
      var pag = document.getElementById('pagination');
      if (pag && pag.parentNode) pag.parentNode.insertBefore(bottom, pag);
      else list.appendChild(bottom);
      push(bottom);
    }
    return true;
  }

  // 归档、留言等独立页：#content-inner 是 flex 容器，广告必须插在左列容器内
  function injectPages() {
    var box = document.getElementById('archive') || document.getElementById('page');
    if (!box) return false;

    if (!exists('top')) {
      var top = buildAd('top', 'top', 'display:block;min-height:90px', 'auto');
      var ref = box.querySelector('.article-sort') || box.firstChild;
      box.insertBefore(top, ref);
      push(top);
    }

    // 留言页：评论区之后再放一个
    if (box.id === 'page' && !exists('commentBottom')) {
      var c = document.getElementById('post-comment');
      if (c && c.parentNode) {
        var after = buildAd('commentBottom', 'list', 'display:block;min-height:120px', 'auto');
        c.parentNode.insertBefore(after, c.nextSibling);
        push(after);
      }
    }

    if (box.id === 'archive' && !exists('list')) {
      var bottom = buildAd('list', 'list', 'display:block;min-height:120px', 'auto');
      var pag = document.getElementById('pagination');
      if (pag && pag.parentNode) pag.parentNode.insertBefore(bottom, pag);
      else box.appendChild(bottom);
      push(bottom);
    }
    return true;
  }

  function injectAside() {
    var aside = document.getElementById('aside-content');
    if (!aside) return !!aside;

    if (!exists('sidebar')) {
      var one = buildAd('sidebar', 'sidebar', 'display:inline-block;width:300px;height:250px', 'rectangle');
      one.classList.add('gx-ad-sidebar');
      aside.appendChild(one);
      push(one);
    }

    if (!exists('sidebar2')) {
      var two = buildAd('sidebar2', 'sidebar', 'display:inline-block;width:300px;height:250px', 'rectangle');
      two.classList.add('gx-ad-sidebar');
      aside.appendChild(two);
      push(two);
    }
    return true;
  }

  function run() {
    try {
      if (!injectPost()) {
        if (!injectIndex()) injectPages();
      }
      injectAside();
    } catch (e) { /* 广告异常不影响正文 */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  document.addEventListener('pjax:complete', run);
  window.addEventListener('load', run);
})();
