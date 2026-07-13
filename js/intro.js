/* This file controls the website intro only. */

(() => {
  "use strict";

  // =========================
  // INTRO CONFIGURATION
  // =========================
  const SWDM_INTRO_CONFIG = {
    introEnabled: true,
    showOncePerSession: false,
    soundEnabled: false,
    sessionKey: "swdmEvolutionIntroSeen",
    introSource: "intro.html",
    timings: {
      totalDuration: 20000,
      exitDuration: 550
    },
    services: [
      "CAD model rotating",
      "Engineer working",
      "Blueprints",
      "Digital wireframe",
      "Prototype assembly",
      "Measuring instruments",
      "Testing",
      "Product validation",
      "Real Haas CNC machining",
      "Coolant spraying",
      "Tool changing",
      "Chips flying",
      "Close-up cutting",
      "Finished precision part"
    ]
  };

  const state = {
    root: null,
    overlay: null,
    endTimer: null,
    ending: false,
    paused: false,
    startedAt: 0,
    remaining: 0
  };

  const revealHomepage = () => {
    document.documentElement.classList.remove("swdm-intro-pending");
    document.documentElement.classList.add("swdm-homepage-ready");
    document.body?.classList.remove("swdm-intro-active");
    if (state.root && !document.body.classList.contains("swdm-intro-standalone")) {
      state.root.replaceChildren();
    }
  };

  const hasReducedMotion = () => {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  };

  const sessionHasSeenIntro = () => {
    if (!SWDM_INTRO_CONFIG.showOncePerSession) return false;
    try {
      return sessionStorage.getItem(SWDM_INTRO_CONFIG.sessionKey) === "true";
    } catch {
      return false;
    }
  };

  const markIntroSeen = () => {
    if (!SWDM_INTRO_CONFIG.showOncePerSession) return;
    try {
      sessionStorage.setItem(SWDM_INTRO_CONFIG.sessionKey, "true");
    } catch {
      // sessionStorage can be unavailable in restricted browser contexts.
    }
  };

  const endIntro = () => {
    if (state.ending) return;
    state.ending = true;
    state.paused = false;
    markIntroSeen();
    window.clearTimeout(state.endTimer);

    if (!state.overlay) {
      revealHomepage();
      return;
    }

    state.overlay.classList.remove("is-paused");
    state.overlay.classList.add("is-ending");
    window.setTimeout(revealHomepage, SWDM_INTRO_CONFIG.timings.exitDuration);
  };

  const startEndTimer = (duration = SWDM_INTRO_CONFIG.timings.totalDuration) => {
    window.clearTimeout(state.endTimer);
    state.remaining = duration;
    state.startedAt = performance.now();
    state.endTimer = window.setTimeout(endIntro, duration);
  };

  const pauseIntro = () => {
    if (!state.overlay || state.ending || state.paused) return;
    state.paused = true;
    const elapsed = performance.now() - state.startedAt;
    state.remaining = Math.max(0, state.remaining - elapsed);
    window.clearTimeout(state.endTimer);
    state.overlay.classList.add("is-paused");
  };

  const resumeIntro = () => {
    if (!state.overlay || state.ending || !state.paused) return;
    state.paused = false;
    state.overlay.classList.remove("is-paused");
    startEndTimer(Math.max(120, state.remaining));
  };

  const togglePause = () => {
    if (state.paused) {
      resumeIntro();
      return;
    }
    pauseIntro();
  };

  const activateIntro = (overlay) => {
    state.ending = false;
    state.paused = false;
    state.overlay = overlay;
    if (!state.overlay) {
      revealHomepage();
      return;
    }

    document.body.classList.add("swdm-intro-active");
    document.documentElement.classList.remove("swdm-intro-pending");
    state.overlay.classList.remove("is-paused", "is-ending");
    state.overlay.querySelector(".swdm-intro__skip")?.addEventListener("click", (event) => {
      event.stopPropagation();
      endIntro();
    }, { once: true });
    state.overlay.addEventListener("click", (event) => {
      if (event.target.closest(".swdm-intro__skip")) return;
      togglePause();
    });
    startEndTimer();
  };

  const mountIntro = (html) => {
    state.root = document.getElementById("swdm-intro-root");
    if (!state.root) {
      state.root = document.createElement("div");
      state.root.id = "swdm-intro-root";
      document.body.prepend(state.root);
    }

    const parsed = new DOMParser().parseFromString(html, "text/html");
    const introMarkup = parsed.querySelector(".swdm-intro");
    if (!introMarkup) {
      revealHomepage();
      return;
    }

    state.root.replaceChildren(introMarkup);
    activateIntro(introMarkup);
  };

  const loadIntro = async ({ force = false } = {}) => {
    if (!SWDM_INTRO_CONFIG.introEnabled || hasReducedMotion() || (!force && sessionHasSeenIntro())) {
      revealHomepage();
      return;
    }

    const standaloneIntro = document.querySelector(".swdm-intro");
    if (standaloneIntro && document.body.classList.contains("swdm-intro-standalone")) {
      activateIntro(standaloneIntro);
      return;
    }

    try {
      const root = document.getElementById("swdm-intro-root");
      const source = root?.dataset.introSource || SWDM_INTRO_CONFIG.introSource;
      const response = await fetch(source, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Intro failed to load: ${response.status}`);
      mountIntro(await response.text());
    } catch {
      revealHomepage();
    }
  };

  const replayIntro = () => {
    window.clearTimeout(state.endTimer);
    state.ending = false;
    state.paused = false;
    loadIntro({ force: true });
  };

  const bindReplayButtons = () => {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-swdm-intro-replay]");
      if (!trigger) return;
      event.preventDefault();
      replayIntro();
    });
  };

  window.SWDMIntro = {
    config: SWDM_INTRO_CONFIG,
    enable() {
      SWDM_INTRO_CONFIG.introEnabled = true;
    },
    disable() {
      SWDM_INTRO_CONFIG.introEnabled = false;
      endIntro();
    },
    resetSession() {
      try {
        sessionStorage.removeItem(SWDM_INTRO_CONFIG.sessionKey);
      } catch {
        // sessionStorage can be unavailable in restricted browser contexts.
      }
    },
    play: replayIntro,
    pause: pauseIntro,
    resume: resumeIntro,
    end: endIntro
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindReplayButtons();
      loadIntro();
    }, { once: true });
  } else {
    bindReplayButtons();
    loadIntro();
  }
})();
