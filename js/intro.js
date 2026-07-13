/* This file controls the website intro only. */

(() => {
  "use strict";

  // =========================
  // INTRO CONFIGURATION
  // =========================
  const SWDM_INTRO_CONFIG = {
    introEnabled: true,
    showOncePerSession: true,
    soundEnabled: false,
    sessionKey: "swdmEvolutionIntroSeen",
    introSource: "intro.html",
    timings: {
      totalDuration: 9000,
      exitDuration: 550
    },
    services: [
      "Design",
      "Development",
      "Machining"
    ]
  };

  const state = {
    root: null,
    overlay: null,
    endTimer: null,
    ending: false
  };

  const revealHomepage = () => {
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
    markIntroSeen();
    window.clearTimeout(state.endTimer);

    if (!state.overlay) {
      revealHomepage();
      return;
    }

    state.overlay.classList.add("is-ending");
    window.setTimeout(revealHomepage, SWDM_INTRO_CONFIG.timings.exitDuration);
  };

  const activateIntro = (overlay) => {
    state.overlay = overlay;
    if (!state.overlay) {
      revealHomepage();
      return;
    }

    document.body.classList.add("swdm-intro-active");
    state.overlay.querySelector(".swdm-intro__skip")?.addEventListener("click", endIntro, { once: true });
    state.endTimer = window.setTimeout(endIntro, SWDM_INTRO_CONFIG.timings.totalDuration);
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

  const loadIntro = async () => {
    if (!SWDM_INTRO_CONFIG.introEnabled || hasReducedMotion() || sessionHasSeenIntro()) {
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
    end: endIntro
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadIntro, { once: true });
  } else {
    loadIntro();
  }
})();
