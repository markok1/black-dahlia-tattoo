/* =========================================================================
   Kurs / Course page interactions — vanilla JS, no dependencies.
   - Serbian date picker: wraps the template plugin call so the picker opens
     with a Serbian calendar and labels (only on the Serbian page)
   - Accordions (curriculum modules + FAQ), one open per group, ARIA-synced
   - Technique showcase: stage on desktop, accordion on phones, pausable autoplay
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

  /* ---- Technique showcase ------------------------------------------------ */
  // Desktop: the list sits beside a stage and each technique swaps the photo
  // on it (click or mouse hover). Phones: the same photos are moved under
  // their own technique, so the list behaves like an accordion.
  // Autoplay steps through the techniques while the block is on screen,
  // pauses while the list is hovered or focused, and stops for good once
  // someone picks a technique or presses pause. None for reduced motion.
  each(doc.querySelectorAll("[data-tech]"), function (box) {
    var tablist = box.querySelector(".k-tech-tabs");
    var items = box.querySelectorAll(".k-tech-item");
    var tabs = box.querySelectorAll(".k-tech-tab");
    var wells = box.querySelectorAll(".k-tech-well");
    var shots = box.querySelectorAll(".k-tech-shot");
    var frame = box.querySelector(".k-tech-frame");
    var ui = box.querySelector(".k-tech-ui");
    var count = box.querySelector(".k-tech-count b");
    var toggle = box.querySelector(".k-tech-play");
    var phone = window.matchMedia ? window.matchMedia("(max-width: 767.98px)") : null;
    var stacked = false;
    var current = 0;
    var hoverTimer = null;
    var scrollTimer = null;
    var hold = { hover: false, focus: false, away: true, hidden: false };

    function select(i) {
      if (i === current) return;
      current = i;
      each(items, function (item, k) {
        item.classList.toggle("is-active", k === i);
        tabs[k].setAttribute("aria-expanded", k === i ? "true" : "false");
      });
      each(shots, function (shot, k) {
        shot.classList.toggle("is-active", k === i);
        if (k === i) shot.removeAttribute("aria-hidden");
        else shot.setAttribute("aria-hidden", "true");
      });
      if (count) count.textContent = (i < 9 ? "0" : "") + (i + 1);
      if (stacked && ui && wells[i]) wells[i].appendChild(ui);
    }

    // Move the photos between the desktop stage and the phone accordion.
    function layout() {
      var next = !!(phone && phone.matches && wells.length === shots.length && frame);
      if (next === stacked) return;
      stacked = next;
      box.classList.toggle("is-stacked", stacked);
      each(shots, function (shot, k) {
        if (stacked) wells[k].appendChild(shot);
        else frame.insertBefore(shot, ui);
      });
      if (ui) (stacked ? wells[current] : frame).appendChild(ui);
    }

    // After a tap on a phone the rows above may collapse; bring the opened
    // technique back into view once the accordion has settled.
    function keepInView(k) {
      if (!stacked) return;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(function () {
        var top = tabs[k].getBoundingClientRect().top;
        var vh = window.innerHeight || root.clientHeight;
        if (top < 70 || top > vh * 0.55) {
          window.scrollTo({ top: window.pageYOffset + top - 84, behavior: reduceMotion ? "auto" : "smooth" });
        }
      }, reduceMotion ? 0 : 820);
    }

    function syncHold() {
      box.classList.toggle("is-paused", hold.hover || hold.focus || hold.away || hold.hidden);
    }

    function setAuto(on) {
      box.classList.toggle("is-auto", on);
      if (!toggle) return;
      toggle.classList.toggle("is-stopped", !on);
      toggle.setAttribute("aria-label", toggle.getAttribute(on ? "data-label-pause" : "data-label-play"));
    }

    each(tabs, function (tab, k) {
      tab.addEventListener("click", function () {
        setAuto(false);
        select(k);
        keepInView(k);
      });
      tab.addEventListener("pointerenter", function (e) {
        if (e.pointerType !== "mouse" || stacked) return;
        window.clearTimeout(hoverTimer);
        hoverTimer = window.setTimeout(function () {
          select(k);
        }, 60);
      });
      tab.addEventListener("pointerleave", function () {
        window.clearTimeout(hoverTimer);
      });
      // The active row's progress bar finishing is what advances autoplay.
      var bar = tab.querySelector(".k-tech-bar");
      if (bar) {
        bar.addEventListener("animationend", function () {
          if (k === current && box.classList.contains("is-auto")) select((current + 1) % tabs.length);
        });
      }
    });

    layout();
    if (phone) {
      if (phone.addEventListener) phone.addEventListener("change", layout);
      else if (phone.addListener) phone.addListener(layout);
    }

    if (reduceMotion || !toggle || !tablist) return;

    toggle.hidden = false;
    toggle.addEventListener("click", function () {
      setAuto(!box.classList.contains("is-auto"));
    });
    tablist.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse") return;
      hold.hover = true;
      syncHold();
    });
    tablist.addEventListener("pointerleave", function () {
      hold.hover = false;
      syncHold();
    });
    tablist.addEventListener("focusin", function (e) {
      // On phones the pause button sits inside the list; focusing it must not hold autoplay.
      if (toggle.contains(e.target)) return;
      hold.focus = true;
      syncHold();
    });
    tablist.addEventListener("focusout", function () {
      hold.focus = false;
      syncHold();
    });
    doc.addEventListener("visibilitychange", function () {
      hold.hidden = doc.hidden;
      syncHold();
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          hold.away = !entries[0].isIntersecting;
          syncHold();
        },
        { threshold: 0.35 }
      ).observe(box);
    } else {
      hold.away = false;
    }
    syncHold();
    setAuto(true);
  });

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
