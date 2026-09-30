$(".scroll").click(function (e) {
  e.preventDefault();
  var nameof = "." + $(this).attr("name");
  $("html, body").animate(
    {
      scrollTop: $(nameof).offset().top - 120,
    },
    1000
  );
});
$(".stopDefault").click(function (e) {
  e.preventDefault();
});

/* =========================================================================
   Contact forms (3 separate forms, one shared notification)
   - Contact      -> php/contact-form.php   (data-form-kind="contact")
   - Appointment  -> php/appointment.php     (data-form-kind="appointment")
   - Course/Kurs  -> php/kurs.php            (data-form-kind="kurs")
   ========================================================================= */

// Language: pages without "-en" in the file name are the Serbian versions.
var BD_LANG = /-en\.html?($|[?#])/i.test(location.pathname + location.search)
  ? "en"
  : "sr";

var BD_ENDPOINTS = {
  contact: "php/contact-form.php",
  appointment: "php/appointment.php",
  kurs: "php/kurs.php",
};

// Same notification text for all three forms (only the language changes).
var BD_MESSAGES = {
  sr: {
    successTitle: "Uspešno poslato!",
    successText:
      "Vaša poruka je uspešno poslata. Hvala Vam što ste nas kontaktirali.",
    errorTitle: "Greška pri slanju",
    errorText:
      "Nažalost, došlo je do greške prilikom slanja. Molimo Vas pokušajte ponovo.",
    note:
      "U slučaju da ne dobijete mejl sa potvrdom, možete nas kontaktirati na broj telefona sa sajta, odgovaramo i putem Viber-a ili WhatsApp-a.",
    close: "Zatvori",
    sending: "Slanje…",
  },
  en: {
    successTitle: "Successfully sent!",
    successText:
      "Your message has been sent successfully. Thank you for contacting us.",
    errorTitle: "Sending failed",
    errorText:
      "Unfortunately, something went wrong while sending. Please try again.",
    note:
      "If you do not receive a confirmation email, you can contact us on the phone number listed on the website — we also reply via Viber or WhatsApp.",
    close: "Close",
    sending: "Sending…",
  },
};

// ---- Notification modal ----------------------------------------------------
function bdInjectNotifyStyles() {
  if (document.getElementById("bd-notify-style")) return;
  var css =
    ".bd-notify-overlay{position:fixed;inset:0;top:0;left:0;right:0;bottom:0;" +
    "background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;" +
    "z-index:100000;padding:20px;opacity:0;transition:opacity .25s ease;}" +
    ".bd-notify-overlay.bd-show{opacity:1;}" +
    ".bd-notify-card{position:relative;background:#fff;color:#2c2c2c;max-width:440px;width:100%;" +
    "border-radius:8px;padding:38px 30px 30px;text-align:center;box-shadow:0 18px 60px rgba(0,0,0,.4);" +
    "transform:translateY(14px);transition:transform .25s ease;font-family:inherit;}" +
    ".bd-notify-overlay.bd-show .bd-notify-card{transform:translateY(0);}" +
    ".bd-notify-icon{width:66px;height:66px;line-height:66px;border-radius:50%;margin:0 auto 18px;" +
    "font-size:34px;font-weight:700;color:#fff;}" +
    ".bd-notify-success .bd-notify-icon{background:#37b24d;}" +
    ".bd-notify-error .bd-notify-icon{background:#e03131;}" +
    ".bd-notify-title{margin:0 0 10px;font-size:22px;line-height:1.25;color:#1a1a1a;}" +
    ".bd-notify-text{margin:0 0 16px;font-size:15px;line-height:1.5;color:#444;}" +
    ".bd-notify-note{margin:0 0 24px;font-size:13px;line-height:1.55;color:#666;" +
    "background:#f6f6f6;border-radius:6px;padding:12px 14px;}" +
    ".bd-notify-close{cursor:pointer;}" +
    ".bd-notify-x{position:absolute;top:10px;right:14px;border:0;background:none;" +
    "font-size:26px;line-height:1;color:#999;cursor:pointer;padding:4px;}" +
    ".bd-notify-x:hover{color:#333;}";
  var style = document.createElement("style");
  style.id = "bd-notify-style";
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}

function bdNotify(type) {
  bdInjectNotifyStyles();
  var m = BD_MESSAGES[BD_LANG];
  var isSuccess = type === "success";

  $("#bd-notify-overlay").remove();

  var $overlay = $(
    '<div id="bd-notify-overlay" class="bd-notify-overlay">' +
      '<div class="bd-notify-card bd-notify-' +
      (isSuccess ? "success" : "error") +
      '" role="dialog" aria-modal="true">' +
      '<button type="button" class="bd-notify-x" aria-label="' +
      m.close +
      '">&times;</button>' +
      '<div class="bd-notify-icon">' +
      (isSuccess ? "✓" : "!") +
      "</div>" +
      '<h3 class="bd-notify-title">' +
      (isSuccess ? m.successTitle : m.errorTitle) +
      "</h3>" +
      '<p class="bd-notify-text">' +
      (isSuccess ? m.successText : m.errorText) +
      "</p>" +
      '<p class="bd-notify-note">' +
      m.note +
      "</p>" +
      '<button type="button" class="button button-primary bd-notify-close">' +
      m.close +
      "</button>" +
      "</div>" +
      "</div>"
  );

  $("body").append($overlay);
  // force reflow then animate in
  $overlay[0].offsetWidth;
  $overlay.addClass("bd-show");

  function close() {
    $overlay.removeClass("bd-show");
    setTimeout(function () {
      $overlay.remove();
    }, 250);
  }

  $overlay.on("click", function (e) {
    if (e.target === $overlay[0]) close();
  });
  $overlay.find(".bd-notify-close, .bd-notify-x").on("click", close);
  $(document).on("keydown.bdNotify", function (e) {
    if (e.key === "Escape" || e.keyCode === 27) {
      close();
      $(document).off("keydown.bdNotify");
    }
  });
}

// ---- Helpers ---------------------------------------------------------------
function bdSelectedText($select) {
  if (!$select.length) return "";
  return $.trim($select.find("option:selected").text() || "");
}

function bdBuildPayload(kind, $form) {
  var payload = {
    name: $.trim($form.find(".contact-name").val() || ""),
    email: $.trim($form.find(".contact-email").val() || ""),
    phone: $.trim($form.find(".contact-phone").val() || ""),
    message: $.trim($form.find(".contact-message").val() || ""),
  };

  if (kind === "appointment") {
    payload.tattooplace = bdSelectedText($form.find(".tattoo-place"));
    payload.tattoocolor = bdSelectedText($form.find(".tattoo-color"));
    payload.tattoosize = $.trim($form.find(".contact-tattoo-size").val() || "");
  } else if (kind === "kurs") {
    // .tattoo-date is a text input (date picker), so read its value.
    payload.datum = $.trim($form.find(".tattoo-date").val() || "");
  }

  return payload;
}

function bdValidate($form) {
  var formEl = $form[0];
  if (formEl.checkValidity()) return true;

  $form.find("input, textarea").each(function () {
    if (!this.validity.valid) $(this).css("border", "1px solid red");
  });
  $form.find("select").each(function () {
    if (!this.validity.valid) {
      $(this).parent().find(".form-input").css("border", "1px solid red");
    }
  });
  return false;
}

// Returns { required: bool, ok: bool }. Fails open if reCAPTCHA never loaded
// so a blocked/unavailable captcha can never permanently break the form.
function bdCaptchaState($form) {
  var $widget = $form.find(".g-recaptcha");
  if (!$widget.length || typeof grecaptcha === "undefined") {
    return { required: false, ok: true };
  }
  try {
    var token = grecaptcha.getResponse();
    return { required: true, ok: !!(token && token.length) };
  } catch (err) {
    return { required: false, ok: true };
  }
}

function bdResetForm($form) {
  try {
    $form[0].reset();
  } catch (e) {}
  // Reset select2-enhanced selects so the visible widget clears too.
  $form.find("select.select-filter").each(function () {
    try {
      $(this).val("").trigger("change");
    } catch (e) {}
  });
  if (typeof grecaptcha !== "undefined") {
    try {
      grecaptcha.reset();
    } catch (e) {}
  }
}

// ---- Submit handler (one handler, all three forms) -------------------------
$(document).on("submit", ".js-mailform", function (e) {
  e.preventDefault();

  var $form = $(this);
  var kind = $form.attr("data-form-kind") || "contact";
  var m = BD_MESSAGES[BD_LANG];

  if (!bdValidate($form)) return;

  var captcha = bdCaptchaState($form);
  if (captcha.required && !captcha.ok) {
    // Highlight the (now visible) reCAPTCHA so the user knows to complete it.
    $form.find(".recap-div").addClass("recap-div_active");
    return;
  }

  var $btn = $form.find('button[type="submit"]');
  var originalLabel = $btn.html();
  $btn.prop("disabled", true).text(m.sending);

  $.ajax({
    type: "POST",
    url: BD_ENDPOINTS[kind] || BD_ENDPOINTS.contact,
    data: bdBuildPayload(kind, $form),
    dataType: "json",
  })
    .done(function (data) {
      if (data && data.status === "success") {
        bdNotify("success");
        bdResetForm($form);
      } else {
        bdNotify("error");
      }
    })
    .fail(function () {
      bdNotify("error");
    })
    .always(function () {
      $btn.prop("disabled", false).html(originalLabel);
    });
});

// ---- Live validation border reset ------------------------------------------
$(document).on("keyup", ".js-mailform input, .js-mailform textarea", function () {
  if (this.validity.valid) {
    $(this).css("border", $(this).hasClass("silver-border") ? "1px solid #a1a1a1" : "1px solid #fff");
  }
});
$(document).on("change", ".js-mailform select", function () {
  if (this.validity.valid) {
    $(this).parent().find(".form-input").css("border", "1px solid #fff");
  }
});

// Gallery nav: on desktop click goes to tattoos page; on mobile click opens dropdown (whole button)
$(document).on("click", ".rd-navbar-nav a[data-nav='gallery']", function (e) {
  if (window.innerWidth < 992) {
    e.preventDefault();
    var $toggle = $(this).siblings(".rd-navbar-submenu-toggle");
    if ($toggle.length) $toggle.trigger("click");
  }
});
