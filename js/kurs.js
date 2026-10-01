/* =========================================================================
   Kurs / Course page interactions — vanilla JS, no dependencies.
   - Serbian date picker: wraps the template plugin call so the picker opens
     with a Serbian calendar and labels (only on the Serbian page)
   - Accordions (curriculum modules + FAQ), one open per group, ARIA-synced
   - Scroll reveal: content is visible by default; JS opts in only when
     IntersectionObserver exists, with a polling fallback so nothing can stay hidden
   - Intro video: plays only while on screen, never on save-data / reduced motion
   - Smooth in-page anchors
   ========================================================================= */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var each = function (list, fn) {
    Array.prototype.forEach.call(list, fn);
  };
  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Pages without "-en" in the file name are the Serbian versions (same rule as main.js).
  var isSerbian = !/-en\.html?($|[?#])/i.test(location.pathname + location.search);

  /* ---- Serbian date picker (must run before script.js initialises it) ---- */
  if (isSerbian && window.jQuery && window.moment && jQuery.fn.bootstrapMaterialDatePicker) {
    try {
      moment.defineLocale("sr", {
        months: "januar_februar_mart_april_maj_jun_jul_avgust_septembar_oktobar_novembar_decembar".split("_"),
        monthsShort: "jan._feb._mar._apr._maj_jun_jul_avg._sep._okt._nov._dec.".split("_"),
        weekdays: "nedelja_ponedeljak_utorak_sreda_četvrtak_petak_subota".split("_"),
        weekdaysShort: "ned._pon._uto._sre._čet._pet._sub.".split("_"),
        weekdaysMin: "ne_po_ut_sr_če_pe_su".split("_"),
        week: { dow: 1, doy: 7 },
      });
      moment.locale("sr");
      var originalPicker = jQuery.fn.bootstrapMaterialDatePicker;
      jQuery.fn.bootstrapMaterialDatePicker = function (options, arg) {
        if (options && typeof options === "object") {
          options = jQuery.extend({}, options, {
            lang: "sr",
            weekStart: 1,
            okText: "Potvrdi",
            cancelText: "Otkaži",
            format: "dddd, DD. MMMM YYYY.",
          });
        }
        return originalPicker.call(this, options, arg);
      };
    } catch (err) {
      /* fall back to the template's English picker */
    }
  }

  /* ---- Accordions -------------------------------------------------------- */
  function initAccordion(groupSel, itemSel, btnSel) {
    each(doc.querySelectorAll(groupSel), function (group) {
      var items = group.querySelectorAll(itemSel);
      each(items, function (item) {
        var btn = item.querySelector(btnSel);
        if (!btn) return;
        btn.setAttribute("aria-expanded", item.classList.contains("is-open") ? "true" : "false");
        btn.addEventListener("click", function () {
          var wasOpen = item.classList.contains("is-open");
          each(items, function (other) {
            if (other === item) return;
            other.classList.remove("is-open");
            var ob = other.querySelector(btnSel);
            if (ob) ob.setAttribute("aria-expanded", "false");
          });
          item.classList.toggle("is-open", !wasOpen);
          btn.setAttribute("aria-expanded", wasOpen ? "false" : "true");
        });
      });
    });
  }
  initAccordion(".k-modules", ".k-module", ".k-module-btn");
  initAccordion(".k-faq", ".k-faq-item", ".k-faq-q");

  /* ---- Intro video ------------------------------------------------------- */
  var video = doc.getElementById("intro");
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var videoAllowed = !!video && !saveData && !reduceMotion;

  function playVideo() {
    if (!videoAllowed || !video.paused) return;
    var p = video.play();
    if (p && typeof p.catch === "function") p.catch(function () {});
  }
  function videoInView() {
    if (!video) return false;
    var r = video.getBoundingClientRect();
    var vh = window.innerHeight || root.clientHeight;
    return r.bottom > vh * 0.15 && r.top < vh * 0.85;
  }
  if (video && "IntersectionObserver" in window) {
    var vio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) playVideo();
          else video.pause();
        });
      },
      { threshold: 0.15 }
    );
    vio.observe(video);
  }

  /* ---- Scroll reveal ----------------------------------------------------- */
  var revealEls = doc.querySelectorAll(".k-reveal");
  if (revealEls.length && "IntersectionObserver" in window && !reduceMotion) {
    root.classList.add("k-io");

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("k-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    each(revealEls, function (el) {
      io.observe(el);
    });

    // Fallback for environments where the observer never fires: reveal
    // whatever is inside the viewport on scroll/resize and on a cheap timer.
    var revealVisible = function () {
      var vh = window.innerHeight || root.clientHeight;
      each(revealEls, function (el) {
        if (el.classList.contains("k-in")) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.96 && r.bottom > 0) el.classList.add("k-in");
      });
      if (videoInView()) playVideo();
    };
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        revealVisible();
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.setTimeout(revealVisible, 500);

    var poll = null;
    var startPoll = function () {
      if (poll) return;
      poll = window.setInterval(function () {
        revealVisible();
        if (!doc.querySelectorAll(".k-reveal:not(.k-in)").length) {
          window.clearInterval(poll);
          poll = null;
        }
      }, 300);
    };
    var stopPoll = function () {
      if (poll) window.clearInterval(poll);
      poll = null;
    };
    startPoll();
    doc.addEventListener("visibilitychange", function () {
      if (doc.hidden) stopPoll();
      else if (doc.querySelectorAll(".k-reveal:not(.k-in)").length) startPoll();
    });
  } else if (video) {
    playVideo();
  }

  /* ---- Smooth in-page anchors ------------------------------------------- */
  each(doc.querySelectorAll('a[href^="#"]:not([href="#"])'), function (link) {
    link.addEventListener("click", function (e) {
      var target = doc.getElementById(link.getAttribute("href").slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      if (window.history && window.history.pushState) {
        window.history.pushState(null, "", link.getAttribute("href"));
      }
    });
  });
})();
