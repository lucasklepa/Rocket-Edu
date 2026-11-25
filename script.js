(function () {
  "use strict";

  var PRODUCT_LABELS = {
    orbit: "Orbit",
    "rocket-chair": "Rocket-Chair",
    "rocket-table": "Rocket-Table",
    "lift-chair": "Lift-Chair"
  };
  var PRODUCT_IDS = Object.keys(PRODUCT_LABELS);
  var DEFAULT_PRODUCT = "rocket-table";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".product-nav a"));
  var sections = Array.prototype.slice.call(document.querySelectorAll(".product"));
  var frames = Array.prototype.slice.call(document.querySelectorAll(".media-frame"));
  var players = [];
  var playerByVideo = new Map();
  var activeProduct = DEFAULT_PRODUCT;

  var ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8L19 12 8 5.6Z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="3.4" height="14" rx="1" fill="currentColor"/><rect x="13.6" y="5" width="3.4" height="14" rx="1" fill="currentColor"/></svg>',
    soundOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" stroke="none"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M17.8 6.5a8 8 0 0 1 0 11"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" stroke="none"/><path d="m15.5 9.5 5 5"/><path d="m20.5 9.5-5 5"/></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5V9"/><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9"/><path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  /* ---------- Build custom video controls ---------- */

  frames.forEach(function (frame) {
    var video = frame.querySelector("video.media");
    if (!video) return;

    var controls = document.createElement("div");
    controls.className = "media-ui";
    controls.innerHTML =
      '<button type="button" class="vbtn vbtn-toggle" aria-label="Pause video">' +
      '<span class="icon-pause">' + ICONS.pause + "</span>" +
      '<span class="icon-play">' + ICONS.play + "</span>" +
      "</button>" +
      '<button type="button" class="vbtn vbtn-mute" aria-label="Unmute video" data-muted="true">' +
      '<span class="icon-sound-off">' + ICONS.soundOff + "</span>" +
      '<span class="icon-sound-on">' + ICONS.soundOn + "</span>" +
      "</button>" +
      '<button type="button" class="vbtn vbtn-expand" aria-label="Expand video">' +
      ICONS.expand +
      "</button>";

    var overlay = document.createElement("div");
    overlay.className = "media-overlay";
    overlay.innerHTML =
      '<button type="button" class="vbtn vbtn-overlay" aria-label="Play video">' +
      ICONS.play +
      "</button>";

    frame.appendChild(controls);
    frame.appendChild(overlay);

    var player = {
      video: video,
      frame: frame,
      overlay: overlay,
      toggleButton: controls.querySelector(".vbtn-toggle"),
      muteButton: controls.querySelector(".vbtn-mute"),
      expandButton: controls.querySelector(".vbtn-expand"),
      overlayButton: overlay.querySelector(".vbtn-overlay"),
      playButtons: [
        controls.querySelector(".vbtn-toggle"),
        overlay.querySelector(".vbtn-overlay")
      ]
    };

    players.push(player);
    playerByVideo.set(video, player);

    video.addEventListener("play", function () {
      syncPlaybackUI(player);
    });
    video.addEventListener("pause", function () {
      syncPlaybackUI(player);
    });
    video.addEventListener("volumechange", syncMuteButtons);

    frame.addEventListener("click", function (event) {
      if (event.target.closest("button")) return;
      if (video.paused) {
        playVideo(video);
      } else {
        video.pause();
      }
    });

    player.toggleButton.addEventListener("click", function () {
      if (video.paused) {
        playVideo(video);
      } else {
        video.pause();
      }
    });

    player.overlayButton.addEventListener("click", function () {
      playVideo(video);
    });

    player.muteButton.addEventListener("click", function () {
      var nextMuted = !video.muted;
      video.muted = nextMuted;
      if (!nextMuted) {
        players.forEach(function (other) {
          if (other.video !== video) other.video.muted = true;
        });
      }
      syncMuteButtons();
    });

    player.expandButton.addEventListener("click", function () {
      openLightbox(player);
    });

    syncPlaybackUI(player);
    syncMuteButtons();
  });

  function syncPlaybackUI(player) {
    var paused = player.video.paused;
    player.frame.classList.toggle("is-paused", paused);
    player.playButtons.forEach(function (button) {
      button.setAttribute("aria-label", paused ? "Play video" : "Pause video");
    });
    player.overlay.inert = !paused;
    player.overlay.setAttribute("aria-hidden", paused ? "false" : "true");
  }

  function syncMuteButtons() {
    players.forEach(function (player) {
      var muted = player.video.muted || player.video.volume === 0;
      player.muteButton.dataset.muted = muted ? "true" : "false";
      player.muteButton.setAttribute("aria-label", muted ? "Unmute video" : "Mute video");
    });
  }

  function playVideo(video) {
    var player = playerByVideo.get(video);
    var src = video.dataset.src;
    if (src && !video.getAttribute("src")) {
      video.src = src;
    }
    video.muted = true;
    syncMuteButtons();
    var promise = video.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(function () {
        if (player) syncPlaybackUI(player);
      });
    }
  }

  function playMuted(video) {
    if (reducedMotion.matches) return;
    playVideo(video);
  }

  function videoIsNearViewport(video, margin) {
    var rect = video.getBoundingClientRect();
    return rect.bottom > -margin && rect.top < window.innerHeight + margin;
  }

  function refreshSectionPlayback(section) {
    if (!section || section.hidden) return;
    section.querySelectorAll("video.media").forEach(function (video) {
      if (reducedMotion.matches) {
        video.pause();
      } else if (videoIsNearViewport(video, 200)) {
        playMuted(video);
      } else {
        video.pause();
      }
    });
  }

  var visibilityObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              var video = entry.target;
              var section = video.closest(".product");
              if (!section || section.hidden) {
                video.pause();
                return;
              }
              if (entry.isIntersecting) {
                playMuted(video);
              } else {
                video.pause();
              }
            });
          },
          { rootMargin: "240px 0px", threshold: 0 }
        )
      : null;

  if (visibilityObserver) {
    players.forEach(function (player) {
      visibilityObserver.observe(player.video);
    });
  }

  /* ---------- Product switching ---------- */

  function productFromHash() {
    var id = window.location.hash.replace(/^#/, "");
    return PRODUCT_IDS.indexOf(id) !== -1 ? id : DEFAULT_PRODUCT;
  }

  function activateProduct(id) {
    var target = PRODUCT_IDS.indexOf(id) !== -1 ? id : DEFAULT_PRODUCT;
    activeProduct = target;

    sections.forEach(function (section) {
      var isActive = section.dataset.product === target;
      section.hidden = !isActive;
      if (!isActive) {
        section.querySelectorAll("video.media").forEach(function (video) {
          video.pause();
          video.muted = true;
        });
      }
    });

    navLinks.forEach(function (link) {
      if (link.getAttribute("href") === "#" + target) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    document.title = "Rocket Edu — " + PRODUCT_LABELS[target] + " · Website Videos";
    syncMuteButtons();

    var activeSection = document.querySelector('.product[data-product="' + target + '"]');
    refreshSectionPlayback(activeSection);
  }

  window.addEventListener("hashchange", function () {
    var product = productFromHash();
    activateProduct(product);
    if (window.location.hash.replace(/^#/, "") !== product) {
      history.replaceState(null, "", "#" + product);
    }
  });

  var initialProduct = productFromHash();
  activateProduct(initialProduct);
  if (window.location.hash.replace(/^#/, "") !== initialProduct) {
    history.replaceState(null, "", "#" + initialProduct);
  }

  /* ---------- Lightbox ---------- */

  var lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.hidden = true;
  lightbox.innerHTML =
    '<button type="button" class="lb-close" aria-label="Close video">' + ICONS.close + "</button>" +
    '<div class="lightbox-inner">' +
    '<video class="lightbox-video" playsinline controls></video>' +
    '<p class="lightbox-caption"></p>' +
    "</div>";
  document.body.appendChild(lightbox);

  var lightboxVideo = lightbox.querySelector(".lightbox-video");
  var lightboxCaption = lightbox.querySelector(".lightbox-caption");
  var lightboxClose = lightbox.querySelector(".lb-close");
  var lastFocusedElement = null;
  var resumePlayer = null;

  function openLightbox(player) {
    var video = player.video;
    var section = video.closest(".product");
    var label = (section && PRODUCT_LABELS[section.dataset.product]) || "Rocket Edu";
    var feature = video.closest(".feature");
    var title = feature ? feature.querySelector(".feature-title") : null;
    var caption = title ? title.textContent.trim() : label + " — Hero video";

    lastFocusedElement = document.activeElement;
    resumePlayer = video.paused ? null : player;

    video.pause();
    lightboxVideo.src = video.currentSrc || video.getAttribute("src") || video.dataset.src;
    lightboxVideo.poster = video.poster || "";
    lightboxCaption.textContent = caption;
    lightboxVideo.setAttribute("aria-label", caption);
    lightboxVideo.muted = false;
    lightboxVideo.volume = 1;
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");

    var promise = lightboxVideo.play();
    if (promise && typeof promise.catch === "function") promise.catch(function () {});
    lightboxClose.focus();
  }

  function closeLightbox() {
    if (lightbox.hidden) return;
    lightboxVideo.pause();
    lightboxVideo.removeAttribute("src");
    lightboxVideo.load();
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");

    if (resumePlayer && !reducedMotion.matches) {
      playVideo(resumePlayer.video);
    }
    resumePlayer = null;

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  lightboxClose.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
  });

  /* ---------- Track visibility changes (tab/scroll handled by observer) ---------- */

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      players.forEach(function (player) {
        player.video.pause();
      });
    } else {
      refreshSectionPlayback(document.querySelector('.product[data-product="' + activeProduct + '"]'));
    }
  });

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", function (event) {
      if (event.matches) {
        players.forEach(function (player) {
          player.video.pause();
        });
      } else {
        refreshSectionPlayback(document.querySelector('.product[data-product="' + activeProduct + '"]'));
      }
    });
  }
})();
