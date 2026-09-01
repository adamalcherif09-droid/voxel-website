(function () {
  "use strict";

  /* One-time branded intro (markup in index.html): the CSS fades and
     hides it on its own schedule; this just removes the dead node a
     beat later. Runs for everyone, including reduced-motion users
     (whose CSS hides the overlay instantly). */
  setTimeout(function () {
    var intro = document.getElementById("voxel-intro");
    if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
  }, 2600);

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  /* ---------- SVG distortion filter (real refraction, Stage 2) ----------
     Injected once, referenced from CSS via backdrop-filter: url(#...).
     Browsers that don't support a filter reference inside backdrop-filter
     just never match the @supports check in styles.css and fall back to
     plain blur — this element is harmless either way. */
  function injectDistortionFilter() {
    if (document.getElementById("voxel-glass-distortion")) return;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.style.overflow = "hidden";
    svg.innerHTML =
      '<filter id="voxel-glass-distortion" x="-20%" y="-20%" width="140%" height="140%">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="17" result="noise"/>' +
      '<feGaussianBlur in="noise" stdDeviation="3" result="blurredNoise"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="9" xChannelSelector="R" yChannelSelector="G"/>' +
      "</filter>";
    document.body.appendChild(svg);
  }

  /* ---------- Specular highlight tracking (single delegated listener) ---------- */
  function initSpecularTracking() {
    document.addEventListener("pointermove", function (e) {
      var el = e.target.closest && e.target.closest(".liquid-glass, .glass-accent");
      if (!el) return;
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      var mx = ((e.clientX - rect.left) / rect.width) * 100;
      var my = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", mx + "%");
      el.style.setProperty("--my", my + "%");
    }, { passive: true });
  }

  /* Cursor-only effects (magnetic pull) don't belong on touch —
     touch fires the same pointermove events during a normal scroll drag,
     which would make buttons visibly wobble as a finger passes over them
     and can leave them stuck half-shifted after the scroll ends. Gate it
     behind an actual hover-capable pointer (mouse/trackpad). */
  var hasFinePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Magnetic buttons ----------
     Continuous rAF loop per button: lerps its transform toward the
     cursor offset while hovered, and back toward (0,0) once the
     pointer leaves — interruptible at any point since it just keeps
     reading the current target each frame rather than committing to
     a fixed-duration animation. */
  function initMagneticButtons() {
    if (!hasFinePointer) return;
    var MAX_PULL = 10;
    var LERP = 0.18;
    document.querySelectorAll(".voxel-magnetic").forEach(function (btn) {
      if (btn.dataset.voxelMagnetic) return;
      btn.dataset.voxelMagnetic = "1";
      var target = { x: 0, y: 0 };
      var current = { x: 0, y: 0 };
      var hovering = false;

      btn.addEventListener("pointerenter", function () { hovering = true; });
      btn.addEventListener("pointermove", function (e) {
        var rect = btn.getBoundingClientRect();
        var relX = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        var relY = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        target.x = Math.max(-1, Math.min(1, relX)) * MAX_PULL;
        target.y = Math.max(-1, Math.min(1, relY)) * MAX_PULL;
      });
      btn.addEventListener("pointerleave", function () {
        hovering = false;
        target.x = 0;
        target.y = 0;
      });

      function tick() {
        current.x += (target.x - current.x) * LERP;
        current.y += (target.y - current.y) * LERP;
        if (Math.abs(current.x) > 0.05 || Math.abs(current.y) > 0.05 || hovering) {
          btn.style.transform = "translate(" + current.x.toFixed(2) + "px," + current.y.toFixed(2) + "px)";
        } else {
          btn.style.transform = "";
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Draggable swipe-to-dismiss modal ----------
     Adds a grab handle to any detected modal panel. Drag down to
     dismiss (1:1 tracking, velocity-based fling), drag up gets
     rubber-band resistance. Dismissal replays the overlay's own
     click handler (its onClick is the real React onClose), so this
     never touches React state directly. */
  function initModalDrag(overlay) {
    var panel = overlay.firstElementChild;
    if (!panel || panel.dataset.voxelDragInit) return;
    panel.dataset.voxelDragInit = "1";

    var handle = document.createElement("div");
    handle.className = "voxel-drag-handle";
    panel.insertBefore(handle, panel.firstChild);

    var dragging = false, startY = 0, currentY = 0, velocity = 0, lastY = 0, lastTime = 0;
    var DISMISS_DISTANCE = 120, DISMISS_VELOCITY = 0.6;

    function onDown(e) {
      dragging = true;
      startY = e.clientY;
      lastY = e.clientY;
      lastTime = performance.now();
      velocity = 0;
      panel.style.transition = "none";
      if (handle.setPointerCapture) {
        try { handle.setPointerCapture(e.pointerId); } catch (err) {}
      }
    }
    function onMove(e) {
      if (!dragging) return;
      var dy = e.clientY - startY;
      var now = performance.now();
      var dt = now - lastTime;
      if (dt > 4) {
        velocity = (e.clientY - lastY) / dt;
        lastY = e.clientY;
        lastTime = now;
      }
      if (dy < 0) dy = dy / 3; // rubber-band resistance dragging up
      currentY = dy;
      panel.style.transform = "translateY(" + Math.max(dy, -40) + "px)";
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      panel.style.transition = "";
      var shouldDismiss = currentY > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY;
      if (shouldDismiss) {
        panel.style.transition = "transform 0.25s cubic-bezier(.2,.7,.2,1), opacity 0.25s ease";
        panel.style.transform = "translateY(100%)";
        panel.style.opacity = "0";
        setTimeout(function () { overlay.click(); }, 220);
      } else {
        panel.style.transform = "";
      }
      velocity = 0;
      currentY = 0;
    }

    handle.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // The overlay can also close via the X button or a backdrop click,
    // not just a drag-dismiss — either way, stop tracking it so these
    // window-level listeners don't pile up every time a modal opens.
    var parentToWatch = overlay.parentNode;
    if (parentToWatch) {
      var detachObserver = new MutationObserver(function () {
        if (!document.body.contains(overlay)) {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          detachObserver.disconnect();
        }
      });
      detachObserver.observe(parentToWatch, { childList: true });
    }
  }

  var boundHeader = null;

  function initHeaderGlass() {
    var header = document.querySelector("header");
    if (!header || header === boundHeader) return;
    boundHeader = header;
    var ticking = false;
    function update() {
      if (window.scrollY > 8) header.classList.add("voxel-glass");
      else header.classList.remove("voxel-glass");
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  function splitHeroWords(h1) {
    if (!h1) return;
    currentHeroEl = h1;
    h1.classList.add("voxel-parallax");
    if (h1.dataset.voxelSplit) return;
    h1.dataset.voxelSplit = "1";
    // Walk the heading's ORIGINAL children so an explicit <br> between
    // headline lines survives the split (using textContent alone merged
    // both of the owner's headline fields into one continuous line).
    var segments = [{ text: "" }];
    Array.prototype.forEach.call(h1.childNodes, function (n) {
      if (n.nodeType === 3) {
        segments[segments.length - 1].text += n.textContent;
      } else if (n.tagName === "BR") {
        segments.push({ text: "" });
      } else if (n.textContent) {
        segments[segments.length - 1].text += n.textContent;
      }
    });
    while (segments.length > 1 && segments[segments.length - 1].text.trim() === "") segments.pop();
    h1.innerHTML = "";
    var delay = 0;
    segments.forEach(function (seg, si) {
      if (si > 0) h1.appendChild(document.createElement("br"));
      var parts = seg.text.split(/(\s+)/);
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          h1.appendChild(document.createTextNode(part));
          return;
        }
        var outer = document.createElement("span");
        outer.className = "voxel-word";
        var inner = document.createElement("span");
        inner.className = "voxel-word-inner";
        inner.textContent = part;
        inner.style.animationDelay = delay.toFixed(2) + "s";
        delay += 0.05;
        outer.appendChild(inner);
        h1.appendChild(outer);
      });
    });
  }

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("voxel-in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: "0px 0px 160px 0px" });

  var currentHeroEl = null;

  function markForReveal(el, index) {
    if (el.dataset.voxelObserved) return;
    el.dataset.voxelObserved = "1";
    el.classList.add("voxel-observe");
    if (typeof index === "number") {
      el.style.setProperty("--stagger", Math.min(index * 60, 480) + "ms");
    }
    revealObserver.observe(el);
  }

  function scanForReveals(root) {
    if (!root || !root.querySelectorAll) return;
    // Model cards stay fully visible while you scroll — hiding them until
    // they intersect makes the masonry look empty/ended at the bottom.
    // Only section headers and category tiles get the scroll-triggered reveal.
    root.querySelectorAll(".grid.grid-cols-2 > *").forEach(function (el, i) { markForReveal(el, i); });
  }

  /* ---------- Hero parallax ---------- */
  function initHeroParallax() {
    var ticking = false;
    function update() {
      if (currentHeroEl && document.body.contains(currentHeroEl)) {
        var shift = Math.min(window.scrollY * 0.15, 40);
        currentHeroEl.style.setProperty("--hero-shift", shift + "px");
      }
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  /* ---------- Image blur-up on load ---------- */
  function initImageBlurUp(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll(".voxel-masonry-item img, .voxel-modal-overlay img").forEach(function (img) {
      if (img.dataset.voxelBlur) return;
      img.dataset.voxelBlur = "1";
      img.classList.add("voxel-img-blur");
      function markLoaded() { img.classList.add("voxel-img-loaded"); }
      if (img.complete && img.naturalWidth > 0) {
        requestAnimationFrame(markLoaded);
      } else {
        img.addEventListener("load", markLoaded, { once: true });
        img.addEventListener("error", markLoaded, { once: true });
      }
    });
  }

  /* ---------- Copy-to-clipboard success flash ---------- */
  function initCopyFlash(root) {
    if (!root) return;
    var copyMo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        var el = m.target.nodeType === 3 ? m.target.parentElement : m.target;
        if (el && el.tagName === "BUTTON") {
          var copied = /copied/i.test(el.textContent || "");
          if (copied) {
            el.classList.remove("voxel-success-flash");
            void el.offsetWidth;
            el.classList.add("voxel-success-flash");
            // Draw-on checkmark rides along with the flash; removed
            // again the moment the label resets to its normal text.
            if (!el.querySelector(".voxel-check")) {
              var check = document.createElement("span");
              check.className = "voxel-check";
              check.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>';
              el.appendChild(check);
            }
          } else {
            var old = el.querySelector(".voxel-check");
            if (old && old.parentNode === el) el.removeChild(old);
          }
        }
      });
    });
    copyMo.observe(root, { childList: true, subtree: true, characterData: true });
  }

  /* =========================================================
     STAGE 3 — MOTION GRAPHICS
     Shared rules: transform/opacity only, everything pauses when
     offscreen or the tab is hidden, and reduced-motion users never
     reach any of this code (early return at the top).
     ========================================================= */

  // MutationObserver hands us whatever node React happened to insert —
  // sometimes an ancestor containing our targets, sometimes the target
  // itself. querySelectorAll can't match the node it's called on, so
  // every scanner uses this to check self + descendants together.
  function collect(node, selector) {
    var out = [];
    if (!node) return out;
    if (node.matches && node.matches(selector)) out.push(node);
    if (node.querySelectorAll) {
      var found = node.querySelectorAll(selector);
      for (var i = 0; i < found.length; i++) out.push(found[i]);
    }
    return out;
  }

  /* --- Floating voxel field behind the hero ---
     Deliberately NOT random: voxels sit in an orderly lattice and
     breathe bottom-to-top in a fixed sequence, echoing how a 3D print
     builds layer by layer. Every position, size, and timing is derived
     from simple index math, so the composition is identical on every
     visit — calm, rhythmic, and clearly designed. Pauses whenever the
     hero scrolls away or the tab hides. */
  function hexToRgbTriplet(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || "").trim());
    return m ? parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16) : "181,135,99";
  }

  function scanHeroParticles(root) {
    collect(root, ".voxel-hero-fx").forEach(function (host) {
      if (host.dataset.voxelfxInit) return;
      host.dataset.voxelfxInit = "1";
      if (navigator.deviceMemory && navigator.deviceMemory < 4) return; // low-end device: keep it calm

      var canvas = document.createElement("canvas");
      host.appendChild(canvas);
      var ctx = canvas.getContext("2d");
      if (!ctx) return;

      var hostStyle = window.getComputedStyle(host);
      var brassRGB = hexToRgbTriplet(hostStyle.getPropertyValue("--brass"));
      var tealRGB = hexToRgbTriplet(hostStyle.getPropertyValue("--teal") || "#0f212b");
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var W = 0, H = 0, voxels = [];
      var running = false, visible = true, inView = false, rafId = 0, lastT = 0;

      function resize() {
        var rect = host.getBoundingClientRect();
        W = Math.max(1, Math.round(rect.width));
        H = Math.max(1, Math.round(rect.height));
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        seed();
      }
      // Lattice layout: roomy fixed cells, capped total. Row-major
      // ordering means the breathing wave always travels bottom-to-top
      // (rows counted from the bottom), exactly like deposited layers.
      function seed() {
        voxels = [];
        var cellW = 78, cellH = 92;
        var cols = Math.max(3, Math.floor(W / cellW));
        var rows = Math.max(2, Math.floor(H / cellH));
        while (cols * rows > 26 && cellW < 220) { cellW *= 1.18; cellH *= 1.18; cols = Math.max(3, Math.floor(W / cellW)); rows = Math.max(2, Math.floor(H / cellH)); }
        var size = 5;
        for (var r = 0; r < rows; r++) {
          for (var c = 0; c < cols; c++) {
            var x = ((c + 0.5) / cols) * W;
            var y = H - ((r + 0.5) / rows) * H; // row 0 sits at the bottom = print bed
            voxels.push({
              x: Math.round(x - size / 2),
              y: Math.round(y - size / 2),
              s: size,
              offset: r * 520 + c * 140,           // ms — fixed wave order, no jitter
              period: 7200,                        // ms — one full breath
              teal: (r * cols + c) % 9 === 4,      // a fixed, symmetric accent pattern
            });
          }
        }
      }
      function frame(t) {
        if (!running) return;
        // Home view unmounted — stop the loop and detach every listener
        // so navigating away leaves nothing running or leaking behind.
        if (!document.body.contains(canvas)) { teardown(); return; }
        var dt = Math.min(48, (t - lastT) || 16);
        lastT = t;
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < voxels.length; i++) {
          var v = voxels[i];
          var k = (((t + v.offset) % v.period) + v.period) % v.period / v.period; // 0..1 life position
          var bell = Math.sin(Math.PI * k);      // smooth 0 -> 1 -> 0
          var alpha = 0.2 * bell * bell;         // ease toward the edges of the breath
          if (alpha < 0.008) continue;
          var lift = -7 * bell;                  // rises slightly mid-breath, settles back
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "rgb(" + (v.teal ? tealRGB : brassRGB) + ")";
          ctx.fillRect(v.x, Math.round(v.y + lift), v.s, v.s);
        }
        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(frame);
      }
      function setRunning(on) {
        if (on && !running) { running = true; lastT = 0; rafId = requestAnimationFrame(frame); }
        else if (!on && running) { running = false; cancelAnimationFrame(rafId); }
      }
      function update() { setRunning(visible && inView); }
      function teardown() {
        setRunning(false);
        if (resizeObserver) resizeObserver.disconnect();
        if (viewObserver) viewObserver.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
      }
      function onVisibility() { visible = !document.hidden; update(); }

      var resizeObserver = null;
      if (typeof ResizeObserver !== "undefined") { resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); }
      else window.addEventListener("resize", resize);
      var viewObserver = null;
      if (typeof IntersectionObserver !== "undefined") {
        viewObserver = new IntersectionObserver(function (entries) {
          inView = entries[0].isIntersecting;
          update();
        }, { threshold: 0 });
        viewObserver.observe(host);
      } else { inView = true; }
      document.addEventListener("visibilitychange", onVisibility);

      resize();
      update();
    });
  }

  /* --- Eyebrow underline draw-on-scroll --- */
  var eyebrowObserver = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("voxel-drawn");
        eyebrowObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 }) : null;

  function scanEyebrows(root) {
    if (!eyebrowObserver) return;
    collect(root, ".voxel-eyebrow").forEach(function (el) {
      if (el.dataset.voxelEyebrow) return;
      el.dataset.voxelEyebrow = "1";
      eyebrowObserver.observe(el);
    });
  }

  /* --- Count-up on the All Designs tile --- */
  var countupObserver = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      countupObserver.unobserve(entry.target);
      var el = entry.target;
      if (el.dataset.voxelCounted) return;
      el.dataset.voxelCounted = "1";
      var text = el.textContent || "";
      var match = text.match(/\d+/);
      if (!match) return;
      var final = parseInt(match[0], 10);
      if (final <= 0 || final > 999) return;
      var startTs = null, DURATION = 800;
      function step(ts) {
        if (startTs === null) startTs = ts;
        var k = Math.min(1, (ts - startTs) / DURATION);
        var eased = 1 - Math.pow(1 - k, 3);
        el.textContent = text.replace(/\d+/, String(Math.round(final * eased)));
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 }) : null;

  function scanCountups(root) {
    if (!countupObserver) return;
    collect(root, "[data-countup]").forEach(function (el) {
      if (el.dataset.voxelCountupInit) return;
      el.dataset.voxelCountupInit = "1";
      countupObserver.observe(el);
    });
  }

  /* --- Scroll-driven print film (frame-sequence engine) ---
      A fixed, translucent Bambu Lab printer time-lapse behind all
      content (genuine in-chamber firmware footage — source: Borillion,
      bambu-timelapse-dataset, CC BY 4.0; credit also lives in the repo
      README). The footage is pre-extracted into 64 JPEG frames; the
      scroll position picks a frame and the canvas paints it in a single
      GPU draw call. Seeking a <video> on every scroll was inherently
      laggy — mobile browsers serialize and throttle video seeks — while
      image swaps cannot stutter, on any device. Frames stream in
      progressively (every 8th first so coarse scrubbing works
      immediately, the rest right after); until a frame arrives, the
      nearest loaded one paints instead. Reduced-motion users never
      reach this code, and CSS hides the layer regardless. */
  var FILM_FRAMES = 64;

  function scanScrollFilm(node) {
    // .voxel-root is often the inserted node ITSELF (React mounts the
    // whole app as one child of #root) — collect() matches it where
    // querySelectorAll alone silently missed it.
    collect(node, ".voxel-root").forEach(function (rootEl) {
      if (rootEl.dataset.voxelfilmInit) return;
      rootEl.dataset.voxelfilmInit = "1";

      var wrap = document.createElement("div");
      wrap.className = "voxel-scrollfilm";
      wrap.setAttribute("aria-hidden", "true");
      var canvas = document.createElement("canvas");
      wrap.appendChild(canvas);
      rootEl.insertBefore(wrap, rootEl.firstChild);

      var ctx = canvas.getContext("2d");
      var frames = new Array(FILM_FRAMES);
      var current = 0, lastDrawn = -1, rafId = 0;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      function resize() {
        canvas.width = Math.round(window.innerWidth * dpr);
        canvas.height = Math.round(window.innerHeight * dpr);
        // Frames are cover-scaled up to 4x on hi-dpi screens; the canvas
        // default ("low") smoothing turns that upscale into chunky pixels.
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        draw();
      }

      // Cover-fit (like object-fit: cover) with the same 58% horizontal
      // crop bias the video had, so the printer stays centered-left.
      function draw() {
        if (!ctx) return;
        var img = nearestLoaded(current);
        if (!img) return;
        var cw = canvas.width, ch = canvas.height;
        if (!cw || !ch) return;
        var iw = img.naturalWidth, ih = img.naturalHeight;
        var s = Math.max(cw / iw, ch / ih);
        var dw = iw * s, dh = ih * s;
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(img, (cw - dw) * 0.58, (ch - dh) * 0.5, dw, dh);
        lastDrawn = current;
      }

      function nearestLoaded(i) {
        i = Math.max(0, Math.min(FILM_FRAMES - 1, Math.round(i)));
        var step = 0;
        while (step < FILM_FRAMES) {
          var a = i - step, b = i + step;
          if (a >= 0 && frames[a] && frames[a].complete && frames[a].naturalWidth) return frames[a];
          if (b < FILM_FRAMES && frames[b] && frames[b].complete && frames[b].naturalWidth) return frames[b];
          step++;
        }
        return null;
      }

      // Unclamped scroll fraction — scrolling PAST one full page height
      // wraps back around, so an eager scroller simply re-watches the
      // print build all over again instead of hitting a frozen last frame.
      function pageProgress() {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        if (max <= 0) return 0;
        var k = window.scrollY / max;
        // iOS rubber-band overscroll reports negative scrollY at the
        // top; without clamping, the wrap-around below made the film
        // jump to its final frame.
        if (k <= 0) return 0;
        k = k - Math.floor(k); // past one full page height: wrap and replay
        return k;
      }

      function tick() {
        rafId = 0;
        var want = pageProgress() * (FILM_FRAMES - 1);
        var delta = want - current;
        if (Math.abs(delta) > FILM_FRAMES * 0.25) {
          current = want; // long fling: snap instead of chasing
        } else {
          current += delta * 0.35; // buttery catch-up toward the scroll target
          if (Math.abs(want - current) < 0.25) current = want;
        }
        ensureNear(want); // prefetch the band the scrub is heading into
        if (Math.round(current) !== Math.round(lastDrawn)) draw();
        if (Math.abs(want - current) >= 0.25) rafId = requestAnimationFrame(tick);
      }
      function scheduleTick() {
        if (!rafId) rafId = requestAnimationFrame(tick);
      }

      function pad(n) { return n < 10 ? "0" + n : "" + n; }
      function load(i) {
        if (i < 0 || i >= FILM_FRAMES || frames[i]) return;
        var img = new Image();
        img.onload = function () { scheduleTick(); }; // newly arrived frame may be the one on screen
        // The frame files are f01.webp .. f64.webp; index 0 maps to f01,
        // index 63 to f64 — the frames were named starting at f01, so
        // loading "f" + i would have burned index 0 on a 404 and never
        // shown the final frame. WebP halves the page weight vs the JPG
        // set (the .jpg originals stay on disk for the download-all ZIP).
        img.src = "/media/film/f" + pad(i + 1) + ".webp";
        frames[i] = img;
      }
      var i, fine = [];
      for (i = 0; i < FILM_FRAMES; i += 8) load(i); // coarse pass: instant full-range scrubbing
      for (i = 0; i < FILM_FRAMES; i++) if (!frames[i]) fine.push(i);
      // The wide pass (all 56 remaining frames) used to fire all at once,
      // competing with the fonts/CSS/text for the single server's round
      // trips on first paint. Fill it in tiny throttled batches AFTER the
      // page is interactive, and prefetch only the band around wherever
      // the scrub actually is. Saves nothing overall, but the film paints
      // within a frame or two instead of waiting on the whole 8MB set.
      var fineIdx = 0, filling = false;
      function fillFine() {
        if (filling) return;
        filling = true;
        var step = function () {
          var tries = 0;
          while (fineIdx < fine.length && tries < 2) { load(fine[fineIdx++]); tries++; }
          if (fineIdx < fine.length) setTimeout(step, 120);
          else filling = false;
        };
        step();
      }
      function ensureNear(i) {
        var k = Math.max(1, Math.min(6, Math.round(window.innerWidth * 0.006)));
        var a = Math.max(0, Math.round(i) - k), b = Math.min(FILM_FRAMES - 1, Math.round(i) + k);
        for (var n = a; n <= b; n++) load(n);
      }
      if (document.readyState === "complete") fillFine();
      else window.addEventListener("load", fillFine, { once: true });

      window.addEventListener("scroll", scheduleTick, { passive: true });
      window.addEventListener("resize", function () { resize(); scheduleTick(); }, { passive: true });
      resize();
    });
  }

  /* --- Adaptive hero text color is handled purely in CSS now
     (mix-blend-mode: difference on .voxel-hero text) — every glyph
     pixel inverts against what's behind it, no sampling needed. */

  function scanMotionGraphics(node) {
    scanHeroParticles(node);
    scanEyebrows(node);
    scanCountups(node);
    scanScrollFilm(node);
    // The owner dashboard is a work area, not a storefront — no film
    // behind the forms. Toggled on every view change so it comes back
    // the moment they leave the dashboard.
    var film = document.querySelector(".voxel-scrollfilm");
    if (film) {
      film.classList.toggle("voxel-film-hidden", !!document.querySelector(".voxel-admin-view"));
    }
  }

  /* --- Tap bloom on glass buttons ---
     Delegated pointerdown: anchors the bloom at the exact tap point
     (same --mx/--my variables the hover specular uses) and replays a
     one-shot animation. Class re-trigger trick keeps rapid taps lively. */
  function initTapBloom() {
    document.addEventListener("pointerdown", function (e) {
      var el = e.target.closest && e.target.closest(".liquid-glass, .glass-accent");
      if (!el || el.disabled) return;
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      el.style.setProperty("--mx", (((e.clientX - rect.left) / rect.width) * 100) + "%");
      el.style.setProperty("--my", (((e.clientY - rect.top) / rect.height) * 100) + "%");
      el.classList.remove("voxel-tap");
      void el.offsetWidth;
      el.classList.add("voxel-tap");
    }, { passive: true });
  }

  /* --- Featured-star pop (owner dashboard) --- */
  function initStarPop() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest(".voxel-star-btn");
      if (!btn) return;
      btn.classList.remove("voxel-pop");
      void btn.offsetWidth;
      btn.classList.add("voxel-pop");
    });
  }

  function isModalOverlay(node) {
    if (!(node instanceof HTMLElement)) return false;
    var cs = window.getComputedStyle(node);
    if (cs.position !== "fixed") return false;
    // Backdrop layers like the scroll film are fixed + inset-0 too, but
    // they can't receive pointer events — a drag handle on one would be
    // unclickable decoration painted over the page. Real modals accept
    // clicks, so this cleanly separates the two.
    if (cs.pointerEvents === "none") return false;
    return parseFloat(cs.top) === 0 && parseFloat(cs.left) === 0 && parseFloat(cs.right) === 0 && parseFloat(cs.bottom) === 0;
  }

  // Classifies `node` itself — or any modal overlays nested inside it.
  // The nested scan matters: React's initial mount arrives as one big
  // .voxel-root insertion, so a deep-link popup present at first paint
  // is a descendant, never the added node itself.
  function classifyOverlays(node) {
    if (!node || !node.querySelectorAll) return;
    if (isModalOverlay(node)) {
      node.classList.add("voxel-modal-overlay");
      initModalDrag(node);
      return;
    }
    Array.prototype.forEach.call(node.querySelectorAll("div"), function (el) {
      if (isModalOverlay(el)) {
        el.classList.add("voxel-modal-overlay");
        initModalDrag(el);
      }
    });
  }

  function initRootWatcher() {
    var root = document.getElementById("root");
    if (!root) return;

    initHeaderGlass();
    scanForReveals(root);
    initImageBlurUp(root);
    splitHeroWords(root.querySelector("h1.voxel-reveal"));
    scanMotionGraphics(root);

    // If React mounted before this script ran (warm cache, fast device),
    // a deep-link popup can already be in the DOM — the observer below
    // only sees insertions from now on, so classify existing modals too.
    classifyOverlays(root);

    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (!(node instanceof HTMLElement)) return;

          initHeaderGlass();

          classifyOverlays(node);

          var newH1 = node.matches && node.matches("h1.voxel-reveal")
            ? node
            : (node.querySelector ? node.querySelector("h1.voxel-reveal") : null);
          if (newH1) splitHeroWords(newH1);

          scanForReveals(node);
          initImageBlurUp(node);
          initMagneticButtons();
          scanMotionGraphics(node);

          if (node.parentElement && node.parentElement.tagName === "MAIN") {
            var hasBack = node.querySelectorAll
              ? Array.prototype.some.call(node.querySelectorAll("button"), function (b) {
                  return /back/i.test(b.textContent || "");
                })
              : false;
            node.classList.add(hasBack ? "voxel-page-push" : "voxel-page-pop");
          }
        });
      });
    });
    mo.observe(root, { childList: true, subtree: true });
  }

  function init() {
    injectDistortionFilter();
    initSpecularTracking();
    initHeroParallax();
    initTapBloom();
    initStarPop();
    initRootWatcher();
    initMagneticButtons();
    var root = document.getElementById("root");
    initCopyFlash(root);
    // Belt and braces for the film: React's mount timing varies, so a
    // few delayed retries guarantee the layer exists no matter how the
    // first commits landed (the dataset guard prevents doubles).
    [200, 900, 2500].forEach(function (delay) {
      setTimeout(function () {
        var rootEl = document.querySelector(".voxel-root");
        if (rootEl) scanScrollFilm(rootEl);
      }, delay);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
