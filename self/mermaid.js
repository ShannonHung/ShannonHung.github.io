// Mermaid diagram loader — injected via config-butterfly-zh.yml `inject.bottom`.
// Kept out of the theme source so `git pull` on the Butterfly theme never conflicts.
// Pairs with `hexo-filter-mermaid-diagrams`, which turns ```mermaid blocks into
// <pre class="mermaid">…</pre> at build time.
(function () {
  var MERMAID_SRC = 'https://unpkg.com/mermaid@10/dist/mermaid.esm.min.mjs';
  var PANZOOM_SRC = 'https://unpkg.com/svg-pan-zoom@3.6.2/dist/svg-pan-zoom.min.js';
  // Butterfly built-in theme names: default / forest / dark / neutral
  var THEME = { dark: 'dark', light: 'default' };

  // Magnifier icon markup, reused for the per-diagram button and lightbox close.
  var ZOOM_ICON =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
    '<line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>';

  function hasDiagrams() {
    return document.querySelector('pre.mermaid, .mermaid') !== null;
  }

  function currentMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  // Stash each diagram's source once so we can re-render on theme toggle.
  function stash() {
    document.querySelectorAll('pre.mermaid, .mermaid').forEach(function (el) {
      if (!el.dataset.mermaidSrc) el.dataset.mermaidSrc = el.textContent;
    });
  }

  // ---- Lightbox ---------------------------------------------------------

  var panZoomLib = null; // cached svg-pan-zoom loader promise

  function loadPanZoom() {
    if (panZoomLib) return panZoomLib;
    panZoomLib = new Promise(function (resolve, reject) {
      if (window.svgPanZoom) return resolve(window.svgPanZoom);
      var s = document.createElement('script');
      s.src = PANZOOM_SRC;
      s.onload = function () { resolve(window.svgPanZoom); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return panZoomLib;
  }

  function closeLightbox() {
    var overlay = document.getElementById('mermaid-lightbox');
    if (overlay) overlay.remove();
    document.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closeLightbox();
  }

  // Build custom +/−/reset controls wired to the svg-pan-zoom instance.
  function buildControls(container, pz) {
    var buttons = [
      { label: '+', title: 'Zoom in', fn: function () { pz.zoomIn(); } },
      { label: '−', title: 'Zoom out', fn: function () { pz.zoomOut(); } },
      { label: '↺', title: 'Reset', fn: function () { pz.resetZoom(); pz.center(); pz.fit(); } }
    ];
    buttons.forEach(function (b) {
      var btn = document.createElement('button');
      btn.textContent = b.label;
      btn.title = b.title;
      btn.setAttribute('aria-label', b.title);
      btn.addEventListener('click', b.fn);
      container.appendChild(btn);
    });
  }

  function openLightbox(sourceSvg) {
    closeLightbox(); // never stack two overlays

    var overlay = document.createElement('div');
    overlay.id = 'mermaid-lightbox';

    // A framed white (or dark) card holds the diagram so it reads clearly
    // against the backdrop instead of blending into the page behind it.
    var stage = document.createElement('div');
    stage.className = 'mermaid-lightbox-stage';

    // Clone so the in-page diagram is never mutated by pan/zoom.
    var svg = sourceSvg.cloneNode(true);
    svg.removeAttribute('style'); // drop max-width so it can fill the stage
    svg.style.width = '100%';
    svg.style.height = '100%';
    stage.appendChild(svg);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'mermaid-lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', closeLightbox);

    // Custom zoom controls styled to match the site (replaces svg-pan-zoom's
    // built-in control icons, which look out of place).
    var controls = document.createElement('div');
    controls.className = 'mermaid-lightbox-controls';

    overlay.appendChild(stage);
    overlay.appendChild(closeBtn);
    overlay.appendChild(controls);
    // Click on the backdrop (not the diagram) closes.
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target === stage) closeLightbox();
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown);

    loadPanZoom().then(function (svgPanZoom) {
      if (!document.getElementById('mermaid-lightbox')) return; // closed already
      var pz = svgPanZoom(svg, {
        zoomEnabled: true,
        controlIconsEnabled: false, // we render our own, prettier controls
        fit: true,
        center: true,
        minZoom: 0.3,
        maxZoom: 20,
        zoomScaleSensitivity: 0.3
      });
      buildControls(controls, pz);
    }).catch(function () {
      // CDN unreachable: lightbox still shows the (fitted) diagram, just no pan/zoom.
      console.warn('[mermaid] svg-pan-zoom failed to load; zoom/pan disabled.');
      controls.remove();
    });
  }

  // Wrap each rendered diagram and drop a magnifier button in its corner.
  function decorate() {
    document.querySelectorAll('pre.mermaid').forEach(function (pre) {
      var svg = pre.querySelector('svg');
      if (!svg || pre.dataset.zoomReady) return;
      pre.dataset.zoomReady = '1';
      pre.classList.add('mermaid-has-zoom');

      var btn = document.createElement('button');
      btn.className = 'mermaid-zoom-btn';
      btn.setAttribute('aria-label', 'Zoom diagram');
      btn.innerHTML = ZOOM_ICON;
      btn.addEventListener('click', function () { openLightbox(svg); });
      pre.appendChild(btn);
    });
  }

  function boot() {
    if (!hasDiagrams()) return;
    stash();

    import(MERMAID_SRC).then(function (m) {
      var mermaid = m.default;

      function render() {
        closeLightbox(); // avoid a stale overlay pointing at an old SVG
        mermaid.initialize({ startOnLoad: false, theme: THEME[currentMode()] });
        var nodes = document.querySelectorAll('pre.mermaid, .mermaid');
        nodes.forEach(function (el) {
          el.removeAttribute('data-processed');
          delete el.dataset.zoomReady; // will re-decorate the fresh SVG
          el.innerHTML = el.dataset.mermaidSrc;
        });
        if (!nodes.length) return;
        mermaid.run({ nodes: nodes }).then(decorate);
      }

      render();

      // Re-render when Butterfly toggles light/dark.
      window.globalFn = window.globalFn || {};
      window.globalFn.themeChange = window.globalFn.themeChange || {};
      window.globalFn.themeChange.mermaid = render;
    });
  }

  boot();
})();
