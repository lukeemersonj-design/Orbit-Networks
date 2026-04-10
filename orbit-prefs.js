(function () {
  const STORAGE_KEYS = {
    cloak: "orbit-cloak-preset",
    theme: "orbit-theme-preset",
  };

  const LEGACY_KEYS = {
    cloak: "orbit-movies-cloak",
    theme: "orbit-movies-theme",
  };

  // Official favicon URLs for each service
  const OFFICIAL_ICONS = {
    ixl: "https://www.ixl.com/favicon.ico",
    classroom: "https://ssl.gstatic.com/classroom/favicon.png",
    canvas: "https://canvas.instructure.com/favicon.ico",
    google: "https://www.google.com/favicon.ico",
    drive: "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico",
    docs: "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico",
    sheets:
      "https://ssl.gstatic.com/docs/spreadsheets/images/sheet-favicon5.ico",
    slides:
      "https://ssl.gstatic.com/docs/presentations/images/slides-favicon5.ico",
    gmail: "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico",
    kahoot: "https://kahoot.com/favicon.ico",
    quizlet: "https://quizlet.com/favicon.ico",
    desmos: "https://www.desmos.com/favicon.ico",
    geogebra: "https://www.geogebra.org/favicon.ico",
    canva: "https://www.canva.com/favicon.ico",
    zoom: "https://zoom.us/favicon.ico",
    schoology: "https://www.schoology.com/favicon.ico",
    powerschool: "https://www.powerschool.com/favicon.ico",
  };

  const CLOAK_PRESETS = {
    orbit: {
      title: "Orbit",
      label: "Orbit",
      desc: "Keep the Orbit identity.",
      icon: makeSvgIcon("OR", "#0f0f0f", "#f3f3f3", "#ffffff"),
    },
    ixl: {
      title: "IXL | Math and English Language Arts Practice",
      label: "IXL Learning",
      desc: "Blue learning portal style.",
      icon: OFFICIAL_ICONS.ixl,
    },
    classroom: {
      title: "Google Classroom",
      label: "Classroom",
      desc: "Clean classroom dashboard look.",
      icon: OFFICIAL_ICONS.classroom,
    },
    canvas: {
      title: "Canvas by Instructure | Login",
      label: "Canvas LMS",
      desc: "Simple course portal preset.",
      icon: OFFICIAL_ICONS.canvas,
    },
    google: {
      title: "Google",
      label: "Google Search",
      desc: "Classic Google search page.",
      icon: OFFICIAL_ICONS.google,
    },
    drive: {
      title: "Google Drive",
      label: "Google Drive",
      desc: "Cloud storage and file access.",
      icon: OFFICIAL_ICONS.drive,
    },
    docs: {
      title: "Google Docs",
      label: "Google Docs",
      desc: "Document editor.",
      icon: OFFICIAL_ICONS.docs,
    },
    sheets: {
      title: "Google Sheets",
      label: "Google Sheets",
      desc: "Spreadsheet editor.",
      icon: OFFICIAL_ICONS.sheets,
    },
    slides: {
      title: "Google Slides",
      label: "Google Slides",
      desc: "Presentation creator.",
      icon: OFFICIAL_ICONS.slides,
    },
    gmail: {
      title: "Gmail",
      label: "Gmail",
      desc: "Email by Google.",
      icon: OFFICIAL_ICONS.gmail,
    },
    kahoot: {
      title: "Kahoot! | Learning games",
      label: "Kahoot!",
      desc: "Game-based learning platform.",
      icon: OFFICIAL_ICONS.kahoot,
    },
    quizlet: {
      title: "Quizlet | Study Tools",
      label: "Quizlet",
      desc: "Flashcards and study games.",
      icon: OFFICIAL_ICONS.quizlet,
    },
    desmos: {
      title: "Desmos | Graphing Calculator",
      label: "Desmos",
      desc: "Advanced graphing calculator.",
      icon: OFFICIAL_ICONS.desmos,
    },
    geogebra: {
      title: "GeoGebra | Math Solver",
      label: "GeoGebra",
      desc: "Interactive math tools.",
      icon: OFFICIAL_ICONS.geogebra,
    },
    canva: {
      title: "Canva | Design Platform",
      label: "Canva",
      desc: "Graphic design tool.",
      icon: OFFICIAL_ICONS.canva,
    },
    zoom: {
      title: "Zoom | Video Conferencing",
      label: "Zoom",
      desc: "Video meeting platform.",
      icon: OFFICIAL_ICONS.zoom,
    },
    schoology: {
      title: "Schoology | Learning Management System",
      label: "Schoology",
      desc: "LMS for education.",
      icon: OFFICIAL_ICONS.schoology,
    },
    powerschool: {
      title: "PowerSchool | Student Information System",
      label: "PowerSchool",
      desc: "Student grade portal.",
      icon: OFFICIAL_ICONS.powerschool,
    },
  };

  const THEME_PRESETS = {
    midnight: {
      label: "Midnight",
      desc: "The classic deep space look.",
      vars: {
        "--bg": "#000000",
        "--accent": "#ffffff",
        "--text-main": "#ffffff",
        "--text-muted": "rgba(255, 255, 255, 0.5)",
        "--border": "rgba(255, 255, 255, 0.1)",
        "--panel-bg": "rgba(255, 255, 255, 0.05)",
      },
    },
    crimson: {
      label: "Crimson",
      desc: "A bold, nebula-red aesthetic.",
      vars: {
        "--bg": "#0a0000",
        "--accent": "#ff3b3b",
        "--text-main": "#ffffff",
        "--text-muted": "rgba(255, 100, 100, 0.6)",
        "--border": "rgba(255, 50, 50, 0.2)",
        "--panel-bg": "rgba(50, 0, 0, 0.4)",
      },
    },
    emerald: {
      label: "Emerald",
      desc: "Sleek matrix-inspired green.",
      vars: {
        "--bg": "#000a05",
        "--accent": "#00ff88",
        "--text-main": "#e0fff0",
        "--text-muted": "rgba(100, 255, 180, 0.5)",
        "--border": "rgba(0, 255, 136, 0.2)",
        "--panel-bg": "rgba(0, 30, 15, 0.5)",
      },
    },
    aurora: {
      label: "Aurora",
      desc: "Northern lights inspired theme.",
      vars: {
        "--bg": "#0a0a1a",
        "--accent": "#00d4ff",
        "--text-main": "#e8f4ff",
        "--text-muted": "rgba(100, 200, 255, 0.5)",
        "--border": "rgba(0, 180, 255, 0.2)",
        "--panel-bg": "rgba(0, 50, 80, 0.4)",
      },
    },
    amber: {
      label: "Amber",
      desc: "Warm sunset glow.",
      vars: {
        "--bg": "#1a0a00",
        "--accent": "#ffaa33",
        "--text-main": "#fff5e0",
        "--text-muted": "rgba(255, 180, 80, 0.5)",
        "--border": "rgba(255, 170, 51, 0.2)",
        "--panel-bg": "rgba(80, 40, 0, 0.4)",
      },
    },
  };

  const defaultTitle = document.title;
  const defaultFavicon = getFaviconHref() || "/logo.png";
  const disableCloak = !!document.querySelector(
    'meta[name="orbit-disable-cloak"]',
  );
  const disableTheme = !!document.querySelector(
    'meta[name="orbit-disable-theme"]',
  );

  function makeSvgIcon(text, bg, fg, outline) {
    const safeText = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="${bg}"/>
      <circle cx="32" cy="32" r="18" fill="none" stroke="${outline}" stroke-width="4" opacity=".9"/>
      <text x="32" y="39" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="${fg}">${safeText}</text>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function getFaviconHref() {
    const node = document.querySelector('link[rel~="icon"]');
    return node ? node.href : "";
  }

  function ensureFaviconNode() {
    let node = document.querySelector('link[rel~="icon"]');
    if (node) return node;
    node = document.createElement("link");
    node.rel = "icon";
    node.href = defaultFavicon;
    document.head.appendChild(node);
    return node;
  }

  function readStoredCloak() {
    return (
      localStorage.getItem(STORAGE_KEYS.cloak) ||
      localStorage.getItem(LEGACY_KEYS.cloak) ||
      ""
    );
  }

  function readStoredTheme() {
    return (
      localStorage.getItem(STORAGE_KEYS.theme) ||
      localStorage.getItem(LEGACY_KEYS.theme) ||
      "midnight"
    );
  }

  function setStoredCloak(key) {
    if (!key || key === "orbit") {
      localStorage.removeItem(STORAGE_KEYS.cloak);
      localStorage.removeItem(LEGACY_KEYS.cloak);
      return "";
    }

    localStorage.setItem(STORAGE_KEYS.cloak, key);
    localStorage.removeItem(LEGACY_KEYS.cloak);
    return key;
  }

  function setStoredTheme(key) {
    const next = key || "midnight";
    localStorage.setItem(STORAGE_KEYS.theme, next);
    localStorage.removeItem(LEGACY_KEYS.theme);
    return next;
  }

  function applyCloak(key) {
    if (disableCloak) return;
    const iconNode = ensureFaviconNode();
    const preset = CLOAK_PRESETS[key] || null;

    if (!preset || key === "orbit") {
      document.title = defaultTitle;
      iconNode.href = defaultFavicon;
      return;
    }

    document.title = preset.title;
    iconNode.href = preset.icon;
  }

  function applyTheme(key) {
    if (disableTheme) return;
    const preset = THEME_PRESETS[key] || THEME_PRESETS.midnight;
    for (const [name, value] of Object.entries(preset.vars)) {
      document.documentElement.style.setProperty(name, value);
    }
  }

  function saveCloak(key) {
    const next = setStoredCloak(key);
    applyCloak(next);
    return next;
  }

  function saveTheme(key) {
    const next = setStoredTheme(key);
    applyTheme(next);
    return next;
  }

  function getActiveCloak() {
    return readStoredCloak() || "orbit";
  }

  function getActiveTheme() {
    return readStoredTheme() || "midnight";
  }

  function init() {
    applyTheme(getActiveTheme());
    if (!disableCloak) {
      applyCloak(readStoredCloak());
    }
  }

  window.OrbitPrefs = {
    STORAGE_KEYS,
    CLOAK_PRESETS,
    THEME_PRESETS,
    getActiveCloak,
    getActiveTheme,
    saveCloak,
    saveTheme,
    applyCloak,
    applyTheme,
    init,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
