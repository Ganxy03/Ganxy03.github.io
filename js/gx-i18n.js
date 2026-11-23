/* 站点双语切换：英文默认（服务端渲染），中文由前端词典替换
   只替换界面文案与文章元信息（标题 / 摘要），正文始终保留中文原文 */
(function () {
  var KEY = 'gx-lang';
  var DATA = window.GX_I18N_DATA || { site: { en: "Ganxy's Notes", zh: '小站' }, posts: {} };

  var ZH = {
    'Home': '首页',
    'Message': '留言',
    'Articles': '文章',
    'Tags': '标签',
    'Categories': '分类',
    'Announcement': '公告',
    'Recent Post': '最新文章',
    'Archives': '归档',
    'Info': '网站资讯',
    'Contents': '目录',
    'Created': '发表于',
    'Updated': '更新于',
    'Comment': '评论',
    'Previous': '上一篇',
    'Next': '下一篇',
    'Author': '作者',
    'Link': '链接',
    'Copyright Notice': '版权声明',
    'Follow Me': '关注我',
    'Notes on servers, networks and building this site': '记录折腾过的服务器、网络与建站笔记'
  };

  var ZH_NOTICE = '本站所有文章除特别声明外，均采用 CC BY-NC-SA 4.0 许可协议。';
  var EN_NOTICE = 'All articles in this blog are licensed under CC BY-NC-SA 4.0 unless stating additionally.';

  function current() {
    // 支持 ?lang=zh 直接指定（也便于分享与验证），否则读本地偏好，默认英文
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q === 'zh' || q === 'en') {
        try { localStorage.setItem(KEY, q); } catch (e) {}
        return q;
      }
    } catch (e) {}
    try { return localStorage.getItem(KEY) === 'zh' ? 'zh' : 'en'; } catch (e) { return 'en'; }
  }

  function trim(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  // 把 href 归一化为 /posts/<id>/ 形式
  function pathOf(href) {
    if (!href) return '';
    href = String(href).replace(/^https?:\/\/[^/]+/, '').split('#')[0].split('?')[0];
    return href;
  }

  function remember(el) {
    if (el.dataset.gxEn === undefined) el.dataset.gxEn = trim(el.textContent);
    return el.dataset.gxEn;
  }

  function setText(el, en, zh) {
    el.textContent = (current() === 'zh' ? zh : en);
  }

  function applySimpleText(lang) {
    var sel = [
      '.site-data .headline',
      '.item-headline span',
      '.comment-headline span',
      '.article-meta-label',
      '.post-meta-label',
      '.prev-post .label',
      '.next-post .label',
      '.post-copyright-meta',
      '.author-info__description'
    ];
    sel.forEach(function (s) {
      Array.prototype.forEach.call(document.querySelectorAll(s), function (el) {
        var en = remember(el);
        if (s === '.post-copyright-meta') {
          // 形如 "Author: " / "Link: " / "Copyright Notice: "
          var key = en.replace(/:\s*$/, '');
          if (ZH[key]) {
            var colon = /:\s*$/.test(en) ? ': ' : '';
            el.textContent = (lang === 'zh' ? ZH[key] : key) + colon;
          }
          return;
        }
        if (s === '.author-info__description') {
          el.textContent = lang === 'zh' ? ZH[en] || en : en;
          return;
        }
        el.textContent = lang === 'zh' ? (ZH[en] || en) : en;
      });
    });

    // 归档页头部：Articles - 39 / Tags - N / Categories - N
    Array.prototype.forEach.call(document.querySelectorAll('.article-sort-title'), function (el) {
      var en = remember(el);
      var zh = en.replace(/^Articles\b/, '文章').replace(/^Tags\b/, '标签').replace(/^Categories\b/, '分类');
      el.textContent = lang === 'zh' ? zh : en;
    });

    // 站点名（导航与首页横幅大标题）
    Array.prototype.forEach.call(document.querySelectorAll('#nav .site-name, #site-title'), function (el) {
      el.textContent = lang === 'zh' ? DATA.site.zh : DATA.site.en;
    });

    // 页面大标题：Archives / Tag: xxx / Category: xxx 及普通短语
    Array.prototype.forEach.call(document.querySelectorAll('.page-title, #page h1'), function (el) {
      var en = remember(el);
      if (lang !== 'zh') { el.textContent = en; return; }
      if (/^Tag:\s*/i.test(en)) el.textContent = en.replace(/^Tag:\s*/i, '标签: ');
      else if (/^Category:\s*/i.test(en)) el.textContent = en.replace(/^Category:\s*/i, '分类: ');
      else el.textContent = ZH[en] || en;
    });

    // 菜单项（主题用 <span> 包裹，含前导空格）
    Array.prototype.forEach.call(document.querySelectorAll('#nav .menus_item a'), function (a) {
      var span = a.querySelector('span');
      if (!span) return;
      var en = remember(span);
      span.textContent = ' ' + (lang === 'zh' ? (ZH[en] || en) : en);
    });

    // 日期 tooltip：title 中的 Created / Updated 前缀
    Array.prototype.forEach.call(document.querySelectorAll('time[title]'), function (el) {
      var t = el.getAttribute('title');
      var m = /^(Created|Updated)\b/.exec(t);
      if (!m) return;
      if (!el.dataset.gxTitle) el.dataset.gxTitle = t;
      var zh = m[1] === 'Created' ? '发表于' : '更新于';
      el.setAttribute('title', lang === 'zh' ? zh + t.slice(m[1].length) : el.dataset.gxTitle);
    });

    // 版权说明句（保留许可证链接）
    var notice = document.querySelector('.post-copyright__notice .post-copyright-info');
    if (notice && /All articles in this blog/.test(notice.textContent)) {
      if (!notice.dataset.gxEnHtml) notice.dataset.gxEnHtml = notice.innerHTML;
      notice.innerHTML = lang === 'zh'
        ? '本站所有文章除特别声明外，均采用 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" rel="noopener" target="_blank">CC BY-NC-SA 4.0</a> 许可协议。'
        : notice.dataset.gxEnHtml;
    }
  }

  function applyPosts(lang) {
    var posts = DATA.posts || {};

    // 列表 / 归档 / 上下篇：文本等于标题的才替换，避免误伤链接地址
    Array.prototype.forEach.call(document.querySelectorAll('a[href], .prev_info, .next_info, .post-title'), function (el) {
      var t = trim(el.textContent);
      if (!t) return;
      var href = el.getAttribute ? el.getAttribute('href') : '';
      if (!href && el.closest) {
        var host = el.closest('a');
        href = host ? host.getAttribute('href') : '';
      }
      var d = posts[pathOf(href)];
      if (!d && el.classList && el.classList.contains('post-title')) {
        var self = pathOf(location.pathname);
        d = posts[self] || posts[self.replace(/index\.html$/, '')];
      }
      if (!d) return;
      if (t !== trim(d.en) && t !== trim(d.zh)) return;
      el.textContent = lang === 'zh' ? d.zh : d.en;
      if (el.hasAttribute && el.hasAttribute('title')) el.setAttribute('title', lang === 'zh' ? d.zh : d.en);
    });

    // 首页列表摘要：英文用 description，中文还原原文
    Array.prototype.forEach.call(document.querySelectorAll('.recent-post-info .content'), function (el) {
      if (el.dataset.gxZhContent === undefined) el.dataset.gxZhContent = el.textContent;
      var a = el.parentElement && el.parentElement.querySelector('a[href^="/posts/"], a[href*="/posts/"]');
      var d = a ? posts[pathOf(a.getAttribute('href'))] : null;
      if (d && d.desc) el.textContent = lang === 'zh' ? el.dataset.gxZhContent : d.desc;
      else el.textContent = el.dataset.gxZhContent;
    });

    // 浏览器标签标题
    applyDocTitle(lang);
  }

  var baseTitle = '';
  function applyDocTitle(lang) {
    var posts = DATA.posts || {};
    var self = posts[pathOf(location.pathname)] || posts[pathOf(location.pathname).replace(/index\.html$/, '')];
    if (self) {
      document.title = lang === 'zh'
        ? self.zh + ' | ' + DATA.site.zh
        : self.en + ' | ' + DATA.site.en;
      return;
    }
    var t = baseTitle || document.title;
    if (lang === 'zh') {
      var isHome = pathOf(location.pathname) === '/' || /^\/page\/\d+\//.test(pathOf(location.pathname));
      if (isHome) {
        document.title = DATA.site.zh + ' - ' + (DATA.site.zhSub || '');
        return;
      }
      document.title = t
        .replace(/^Archives\b/, '归档')
        .replace(/^Tags\b/, '标签')
        .replace(/^Categories\b/, '分类')
        .replace(/^Message\b/, '留言')
        .replace(/^Tag:\s*/, '标签: ')
        .replace(/^Category:\s*/, '分类: ')
        .replace(DATA.site.en, DATA.site.zh);
    } else {
      document.title = t;
    }
  }

  function markSwitch(lang) {
    Array.prototype.forEach.call(document.querySelectorAll('.gx-lang a'), function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-lang') === lang);
    });
  }

  function buildSwitch() {
    if (document.querySelector('.gx-lang')) return;
    var info = document.querySelector('#blog-info');
    if (!info) return;
    var box = document.createElement('span');
    box.className = 'gx-lang';
    box.innerHTML = '<a data-lang="en" role="button" tabindex="0">EN</a><i>/</i><a data-lang="zh" role="button" tabindex="0">中文</a>';
    info.appendChild(box);
    box.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-lang]');
      if (!a) return;
      var lang = a.getAttribute('data-lang');
      try { localStorage.setItem(KEY, lang); } catch (err) {}
      apply(lang);
    });
  }

  function apply(lang) {
    lang = lang === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    applySimpleText(lang);
    applyPosts(lang);
    markSwitch(lang);
  }

  function boot() {
    baseTitle = document.title;   // 每次渲染（含 pjax）都先记下服务端给的英文标题
    buildSwitch();
    apply(current());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('pjax:complete', boot);
})();
