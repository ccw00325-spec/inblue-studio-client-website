/* ============================================================
   PT & Pilates IN BLUE — common.js
   nav / reveal / tabs / lightbox / parallax / counter / store
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- Fixed desktop composition ---------------- */
  function initViewportScale() {
    if (/admin\.html$/i.test(location.pathname)) return;

    var DESIGN_WIDTH = 1280;
    var responsiveRules = [];
    var fixedLayoutStyle = document.createElement('style');

    fixedLayoutStyle.textContent =
      'html.is-fixed-layout{--pad-x:64px;--nav-h:96px;--nav-h-sm:68px}' +
      'html.is-fixed-layout .nav{width:1280px;right:auto!important}' +
      'html.is-fixed-layout .nav__menu{display:flex!important}' +
      'html.is-fixed-layout .nav__cta{display:inline-flex!important}' +
      'html.is-fixed-layout .nav__burger{display:none!important}' +
      'html.is-fixed-layout .foot__top{grid-template-columns:1.25fr 1fr 1fr!important}' +
      'html.is-fixed-layout .tabbar__meta{display:block!important}' +
      'html.is-fixed-layout .hero__inner{gap:51px!important}' +
      'html.is-fixed-layout .hero__title .l1,html.is-fixed-layout .hero__title .l2{font-size:95px!important}';
    document.head.appendChild(fixedLayoutStyle);

    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      var rules;
      try { rules = sheet.cssRules; } catch (e) { return; }
      if (!rules) return;

      Array.prototype.forEach.call(rules, function (rule) {
        if (rule.type !== 4 || !/max-width\s*:/i.test(rule.conditionText || '')) return;
        responsiveRules.push({ rule: rule, query: rule.conditionText });
      });
    });

    function setResponsiveRules(enabled) {
      responsiveRules.forEach(function (item) {
        item.rule.media.mediaText = enabled ? item.query : 'not all';
      });
    }

    function applyScale() {
      var viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      var shouldScale = viewportWidth < DESIGN_WIDTH;

      setResponsiveRules(!shouldScale);
      document.documentElement.classList.toggle('is-fixed-layout', shouldScale);

      if (!shouldScale) {
        document.documentElement.style.zoom = '';
        document.body.style.width = '';
        document.body.style.transform = '';
        document.body.style.transformOrigin = '';
        return;
      }

      var requestedScale = viewportWidth / DESIGN_WIDTH;
      var browserZoom = Math.max(requestedScale, 0.5);

      document.body.style.width = DESIGN_WIDTH + 'px';
      document.documentElement.style.zoom = String(browserZoom);
      document.body.style.transformOrigin = 'top left';
      document.body.style.transform = requestedScale < 0.5
        ? 'scale(' + String(requestedScale / browserZoom) + ')'
        : '';
    }

    applyScale();
    window.addEventListener('resize', applyScale, { passive: true });
  }

  /* ---------------- Navigation ---------------- */
  function initNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    var onScroll = function () {
      nav.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var burger = document.querySelector('.nav__burger');
    if (burger) {
      burger.addEventListener('click', function () {
        document.body.classList.toggle('menu-open');
      });
    }
    document.querySelectorAll('.drawer__link').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('menu-open');
      });
    });

    // active page marking
    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav__link, .drawer__link').forEach(function (a) {
      var href = (a.getAttribute('href') || '').toLowerCase();
      if (href === here) a.classList.add('is-active');
    });
  }

  /* ---------------- Scroll reveal ---------------- */
  function initReveal() {
    var targets = document.querySelectorAll('[data-reveal], .fig');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* Re-scan (for content injected after load / tab panels) */
  function rescanReveal(scope) {
    (scope || document).querySelectorAll('[data-reveal], .fig').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.94) el.classList.add('is-in');
    });
  }

  /* ---------------- Parallax ---------------- */
  function initParallax() {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!items.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ticking = false;

    function update() {
      var vh = window.innerHeight;
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.12;
        var progress = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = 'translate3d(0,' + (-progress * speed * 100).toFixed(2) + 'px,0)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------------- Tabs ---------------- */
  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (group) {
      var name = group.getAttribute('data-tabs');
      var tabs = group.querySelectorAll('.tab');
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          var key = tab.getAttribute('data-tab');
          tabs.forEach(function (t) { t.classList.toggle('is-on', t === tab); });
          document.querySelectorAll('[data-panel-group="' + name + '"] .panel').forEach(function (p) {
            var on = p.getAttribute('data-panel') === key;
            p.classList.toggle('is-on', on);
            if (on) setTimeout(function () { rescanReveal(p); }, 30);
          });
          try { history.replaceState(null, '', '#' + key); } catch (e) {}
        });
      });

      // deep link (#jangan / #seongnae)
      var hash = (location.hash || '').replace('#', '');
      if (hash) {
        var found = group.querySelector('.tab[data-tab="' + hash + '"]');
        if (found) found.click();
      }
    });
  }

  /* ---------------- Lightbox ---------------- */
  function initLightbox() {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-lb]'));
    if (!items.length) return;

    var box = document.createElement('div');
    box.className = 'lb';
    box.innerHTML =
      '<button class="lb__x" aria-label="닫기">' + icon('x') + '</button>' +
      '<button class="lb__nav lb__nav--prev" aria-label="이전">' + icon('left') + '</button>' +
      '<button class="lb__nav lb__nav--next" aria-label="다음">' + icon('right') + '</button>' +
      '<img alt=""><p class="lb__cap"></p>';
    document.body.appendChild(box);

    var img = box.querySelector('img');
    var cap = box.querySelector('.lb__cap');
    var idx = 0;
    var pool = items;

    function show(i) {
      pool = items.filter(function (el) { return el.offsetParent !== null; });
      if (!pool.length) pool = items;
      idx = (i + pool.length) % pool.length;
      var el = pool[idx];
      var src = el.getAttribute('data-lb') || (el.querySelector('img') && el.querySelector('img').src);
      img.src = src;
      cap.textContent = el.getAttribute('data-cap') || '';
    }
    function open(el) {
      pool = items.filter(function (x) { return x.offsetParent !== null; });
      if (!pool.length) pool = items;
      show(pool.indexOf(el));
      box.classList.add('is-on');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      box.classList.remove('is-on');
      document.body.style.overflow = '';
    }

    items.forEach(function (el) {
      el.style.cursor = 'zoom-in';
      el.addEventListener('click', function () { open(el); });
    });
    box.querySelector('.lb__x').addEventListener('click', close);
    box.querySelector('.lb__nav--prev').addEventListener('click', function (e) { e.stopPropagation(); show(idx - 1); });
    box.querySelector('.lb__nav--next').addEventListener('click', function (e) { e.stopPropagation(); show(idx + 1); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target === img) close(); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-on')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---------------- Number counter ---------------- */
  function initCounter() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var to = parseFloat(el.getAttribute('data-count'));
        var dur = 1500, t0 = performance.now();
        (function step(now) {
          var p = Math.min((now - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * eased).toLocaleString('ko-KR');
          if (p < 1) requestAnimationFrame(step);
        })(t0);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Drag-scroll strips ---------------- */
  function initDragScroll() {
    document.querySelectorAll('[data-drag]').forEach(function (el) {
      var down = false, sx = 0, sl = 0;
      el.addEventListener('pointerdown', function (e) {
        down = true; sx = e.pageX; sl = el.scrollLeft; el.classList.add('is-drag');
      });
      window.addEventListener('pointerup', function () { down = false; el.classList.remove('is-drag'); });
      el.addEventListener('pointermove', function (e) {
        if (!down) return;
        e.preventDefault();
        el.scrollLeft = sl - (e.pageX - sx) * 1.25;
      });
    });
  }

  /* ---------------- Before/After slider ---------------- */
  function initBASlider() {
    document.querySelectorAll('[data-ba]').forEach(function (el) {
      var handle = el.querySelector('.ba__handle');
      var after = el.querySelector('.ba__after');
      if (!handle || !after) return;
      var dragging = false;

      function setPos(clientX) {
        var r = el.getBoundingClientRect();
        var p = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
        after.style.clipPath = 'inset(0 0 0 ' + (p * 100) + '%)';
        handle.style.left = (p * 100) + '%';
      }
      el.addEventListener('pointerdown', function (e) { dragging = true; setPos(e.clientX); });
      window.addEventListener('pointerup', function () { dragging = false; });
      el.addEventListener('pointermove', function (e) {
        if (dragging) { e.preventDefault(); setPos(e.clientX); }
      });
      el.addEventListener('pointerleave', function () { dragging = false; });
    });
  }

  /* ---------------- Icons ---------------- */
  function icon(name) {
    var s = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">';
    var paths = {
      x: '<path d="M18 6 6 18M6 6l12 12"/>',
      left: '<path d="M15 18l-6-6 6-6"/>',
      right: '<path d="M9 18l6-6-6-6"/>'
    };
    return s + (paths[name] || '') + '</svg>';
  }

  /* ============================================================
     INQUIRY STORE  (reservation  ->  admin)
     ============================================================ */
  var KEY = 'inblue_inquiries_v1';
  var CH = null;
  try { CH = new BroadcastChannel('inblue'); } catch (e) { CH = null; }

  var Store = {
    all: function () {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
      catch (e) { return []; }
    },
    save: function (list) {
      localStorage.setItem(KEY, JSON.stringify(list));
      if (CH) { try { CH.postMessage({ type: 'sync' }); } catch (e) {} }
    },
    add: function (data) {
      var list = Store.all();
      var row = Object.assign({
        id: 'IB' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100),
        createdAt: new Date().toISOString(),
        status: 'new',
        read: false
      }, data);
      list.unshift(row);
      Store.save(list);
      return row;
    },
    update: function (id, patch) {
      var list = Store.all().map(function (r) { return r.id === id ? Object.assign(r, patch) : r; });
      Store.save(list);
    },
    remove: function (id) {
      Store.save(Store.all().filter(function (r) { return r.id !== id; }));
    },
    todayCount: function () {
      var d = new Date(); d.setHours(0, 0, 0, 0);
      return Store.all().filter(function (r) { return new Date(r.createdAt) >= d; }).length;
    },
    unreadCount: function () {
      return Store.all().filter(function (r) { return !r.read; }).length;
    },
    onChange: function (fn) {
      window.addEventListener('storage', function (e) { if (e.key === KEY) fn(); });
      if (CH) CH.onmessage = function () { fn(); };
    }
  };

  /* ---------------- Helpers ---------------- */
  var Util = {
    badge: function (n) { return n > 99 ? '99+' : String(n); },
    phone: function (tail) {
      var t = String(tail || '').replace(/\D/g, '');
      return t.length === 8 ? '010-' + t.slice(0, 4) + '-' + t.slice(4) : '010-' + t;
    },
    dt: function (iso) {
      var d = new Date(iso);
      var p = function (n) { return String(n).padStart(2, '0'); };
      return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    },
    isToday: function (iso) {
      var d = new Date(iso), n = new Date();
      return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
    },
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
  };

  window.INBLUE = { store: Store, util: Util, rescanReveal: rescanReveal };

  /* ---------------- Boot ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initViewportScale();
    initNav();
    initReveal();
    initParallax();
    initTabs();
    initLightbox();
    initCounter();
    initDragScroll();
    initBASlider();
    setTimeout(function () { rescanReveal(document); }, 120);
  });
})();
