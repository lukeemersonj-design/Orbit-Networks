const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = 5000;
const CINEBY_BASE = "https://www.cineby.xyz";
const CINEBY_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
};
const CINEBY_CACHE_TTL = 1000 * 60 * 20;
const movieCache = {
    sections: null,
    catalog: [],
    expiresAt: 0,
    details: new Map(),
};
const MOVIE_FEEDS = {
    featured: [
        "/movies/genre/science-fiction?sort=popular",
        "/movies/genre/adventure?sort=popular",
    ],
    popular: [
        "/movies/genre/action?sort=popular",
        "/movies/genre/drama?sort=popular",
        "/movies/genre/comedy?sort=popular",
    ],
    top: [
        "/movies/genre/action?sort=rating",
        "/movies/genre/drama?sort=rating",
        "/movies/genre/science-fiction?sort=rating",
    ],
    latest: [
        "/movies/genre/action/year/2026",
        "/movies/genre/adventure/year/2025",
    ],
};

/* =========================
   STATIC FILES (YOUR HTML)
========================= */
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   BASIC HEADER FIX
========================= */
function encodeBase64URL(str) {
    return Buffer.from(str, "utf-8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function decodeBase64URL(str) {
    let clean = str.replace(/-/g, "+").replace(/_/g, "/");
    while (clean.length % 4) clean += "=";
    return Buffer.from(clean, "base64").toString("utf-8");
}

function cleanHeaders(headers) {
    let newHeaders = {};

    for (let [key, value] of Object.entries(headers)) {
        key = key.toLowerCase();

        if (
            key === "content-security-policy" ||
            key === "x-frame-options" ||
            key === "content-encoding" ||
            key === "transfer-encoding" ||
            key === "content-length"
        )
            continue;

        newHeaders[key] = value;
    }

    return newHeaders;
}

function absoluteCinebyUrl(url = "") {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("//")) return "https:" + url;
    return `${CINEBY_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function decodeHtml(value = "") {
    return value
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
            String.fromCharCode(parseInt(code, 16)),
        )
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"')
        .replace(/&hellip;/g, "...")
        .replace(/&mdash;/g, "-")
        .replace(/&ndash;/g, "-")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&copy;/g, "©");
}

function stripTags(value = "") {
    return decodeHtml(value.replace(/<[^>]*>/g, " "))
        .replace(/\s+/g, " ")
        .trim();
}

function readMatch(text, regex) {
    const match = text.match(regex);
    return match ? match[1].trim() : "";
}

function toSlug(url = "") {
    return url
        .replace(/^https?:\/\/[^/]+/i, "")
        .replace(/^\/+/, "")
        .replace(/[?#].*$/, "");
}

function pickUnique(list, limit) {
    const seen = new Set();
    const picked = [];

    for (const item of list) {
        if (!item || !item.path || seen.has(item.path)) continue;
        seen.add(item.path);
        picked.push(item);
        if (picked.length >= limit) break;
    }

    return picked;
}

function parseMovieCards(html) {
    const cards = [
        ...html.matchAll(/<article class="content-card"[\s\S]*?<\/article>/gi),
    ];
    return cards
        .map((match) => {
            const card = match[0];
            const href = readMatch(card, /<a href="([^"]+\/movie\/[^"]+)"/i);
            const path = toSlug(href);

            if (!path) return null;

            const title =
                stripTags(readMatch(card, /title="([^"]+)"/i)) ||
                stripTags(
                    readMatch(
                        card,
                        /<h3 class="card-title"[^>]*>([\s\S]*?)<\/h3>/i,
                    ),
                );

            const poster = absoluteCinebyUrl(
                readMatch(card, /<img src="([^"]+)"/i),
            );
            const year = stripTags(
                readMatch(
                    card,
                    /<time class="card-year"[^>]*>([\s\S]*?)<\/time>/i,
                ),
            );
            const rating = stripTags(
                readMatch(
                    card,
                    /<span class="rating-badge">[\s\S]*?([0-9.]+)\s*<\/span>/i,
                ),
            );
            const quality = stripTags(
                readMatch(
                    card,
                    /<span class="quality-badge">([\s\S]*?)<\/span>/i,
                ),
            );

            return {
                id: path,
                path,
                title: title || "Untitled",
                poster,
                year,
                rating,
                quality,
            };
        })
        .filter(Boolean);
}

async function fetchCineby(path) {
    const response = await fetch(absoluteCinebyUrl(path), {
        headers: CINEBY_HEADERS,
        redirect: "follow",
        timeout: 15000,
    });

    if (!response.ok) {
        throw new Error(`Cineby request failed (${response.status})`);
    }

    return response.text();
}

async function buildMovieCatalog() {
    if (movieCache.sections && movieCache.expiresAt > Date.now()) {
        return movieCache.sections;
    }

    const sections = {};
    const combined = [];

    for (const [sectionName, paths] of Object.entries(MOVIE_FEEDS)) {
        const sectionItems = [];

        for (const path of paths) {
            try {
                const html = await fetchCineby(path);
                sectionItems.push(...parseMovieCards(html));
            } catch (error) {
                console.error(
                    `Cineby catalog fetch failed for ${path}:`,
                    error.message,
                );
            }
        }

        sections[sectionName] = pickUnique(sectionItems, 24);
        combined.push(...sections[sectionName]);
    }

    movieCache.sections = sections;
    movieCache.catalog = pickUnique(combined, 120);
    movieCache.expiresAt = Date.now() + CINEBY_CACHE_TTL;

    return sections;
}

async function fetchMovieDetail(path) {
    const slug = toSlug(path);
    const cached = movieCache.details.get(slug);

    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    const html = await fetchCineby(slug);
    const title =
        stripTags(
            readMatch(html, /<meta property="og:title" content="([^"]+)"/i),
        ) || stripTags(readMatch(html, /<title>([^<]+)<\/title>/i));
    const description = stripTags(
        readMatch(html, /<meta name="description" content="([^"]+)"/i),
    );
    const poster = absoluteCinebyUrl(
        readMatch(html, /<meta property="og:image" content="([^"]+)"/i) ||
            readMatch(
                html,
                /<img src="([^"]+\/images\/posters\/movies\/[^"]+)"/i,
            ),
    );
    const backdrop = absoluteCinebyUrl(
        readMatch(html, /<meta property="og:image" content="([^"]+)"/i),
    );
    const year =
        stripTags(
            readMatch(html, /<span class="meta-year">([\s\S]*?)<\/span>/i),
        ) ||
        stripTags(readMatch(html, /<time[^>]*datetime="([^"]+)"/i)).slice(0, 4);
    const rating =
        stripTags(
            readMatch(html, /<span class="rating-value">([\s\S]*?)<\/span>/i),
        ) ||
        stripTags(
            readMatch(
                html,
                /<span class="rating-badge">[\s\S]*?([0-9.]+)\s*<\/span>/i,
            ),
        );
    const runtime = stripTags(
        readMatch(html, /<span class="meta-runtime">([\s\S]*?)<\/span>/i),
    );
    const genres = [
        ...html.matchAll(/\/movies\/genre\/[^"]+">([\s\S]*?)<\/a>/gi),
    ]
        .map((match) => stripTags(match[1]))
        .filter(Boolean)
        .slice(0, 4);
    const sourceMatches = [
        ...html.matchAll(
            /class="server-tab[^"]*" data-url="([^"]+)">([\s\S]*?)<\/button>/gi,
        ),
    ];
    const sources = sourceMatches
        .map((match) => ({
            name: stripTags(match[2]) || "Server",
            url: absoluteCinebyUrl(match[1]),
        }))
        .filter((source) => source.url);

    const preferredSource =
        sources.find(
            (source) =>
                /vidking/i.test(source.url) || /alternative/i.test(source.name),
        ) ||
        sources[0] ||
        null;

    const value = {
        id: slug,
        path: slug,
        title,
        description,
        poster,
        backdrop,
        year,
        rating,
        runtime,
        genres,
        sources,
        preferredSource,
    };

    movieCache.details.set(slug, {
        value,
        expiresAt: Date.now() + CINEBY_CACHE_TTL,
    });

    return value;
}

/* =========================
   ERROR PAGE HELPER
========================= */
const ERROR_PAGE = (msg) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Orbit — Error</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #0d0d1a; color: #eee;
           display: flex; flex-direction: column; align-items: center;
           justify-content: center; min-height: 100vh; text-align: center; padding: 20px; }
    h1 { font-size: 2rem; color: #f06060; margin-bottom: 0.5rem; }
    p { color: #aaa; margin-bottom: 1rem; }
    code { display: inline-block; background: #1e1e2e; padding: 6px 12px;
           border-radius: 4px; color: #f06060; font-size: 0.9rem; margin-bottom: 1.5rem; word-break: break-all; max-width: 600px; }
    a { color: #7c6af7; text-decoration: none; font-size: 1rem; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Could not reach that site</h1>
  <p>Orbit was unable to connect to the requested URL.</p>
  <code>${msg}</code>
  <a href="/">Go back to Orbit</a>
</body>
</html>`;

const ORBIT_GUARD_SCRIPT = `<script>
(function(){
  var safeConfirm = function(message){
    try { return window.confirm(message); } catch (_) { return false; }
  };

  var blockedOpen = function(url){
    if (!url) return null;
    try {
      if (safeConfirm('Leave Orbit and open this page in a new tab?')) {
        window.location.href = url;
      }
    } catch (_) {}
    return null;
  };

  try {
    window.open = function(url){ return blockedOpen(url); };
  } catch (_) {}

  document.addEventListener('click', function(event){
    var link = event.target && event.target.closest ? event.target.closest('a') : null;
    if (!link) return;

    var href = link.getAttribute('href') || '';
    var target = (link.getAttribute('target') || '').toLowerCase();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    if (target === '_blank') {
      event.preventDefault();
      blockedOpen(link.href || href);
      return;
    }

    try {
      var next = new URL(link.href, location.href);
      if (next.origin !== location.origin && !safeConfirm('Leave this Orbit page?')) {
        event.preventDefault();
      }
    } catch (_) {}
  }, true);

  document.addEventListener('submit', function(event){
    var form = event.target;
    if (!form || !form.action) return;
    try {
      var next = new URL(form.action, location.href);
      if (next.origin !== location.origin && !safeConfirm('Leave this Orbit page?')) {
        event.preventDefault();
      }
    } catch (_) {}
  }, true);

  var _proxy = new Proxy({}, { get: function(){ return function(){}; } });
  window.onerror = function(){ return true; };
  window.onunhandledrejection = function(){ return true; };
  ['solveSimpleChallenge','botguard','recaptcha','_gaq','ga','gtag','dataLayer'].forEach(function(k){
    if(typeof window[k] === 'undefined') window[k] = _proxy;
  });
  if(!Array.isArray(window.dataLayer)) window.dataLayer = [];

  try {
    var originalAssign = window.location.assign.bind(window.location);
    window.location.assign = function(url){
      if (!safeConfirm('Leave this Orbit page?')) return;
      return originalAssign(url);
    };
  } catch (_) {}

  try {
    var originalReplace = window.location.replace.bind(window.location);
    window.location.replace = function(url){
      if (!safeConfirm('Leave this Orbit page?')) return;
      return originalReplace(url);
    };
  } catch (_) {}

  // AUDIO DETECTION REMOVED
})();
</script>`;

app.get("/api/cineby/movies", async (req, res) => {
    try {
        const sections = await buildMovieCatalog();
        const query = String(req.query.q || "")
            .trim()
            .toLowerCase();

        if (query) {
            return res.json({
                query,
                results: movieCache.catalog
                    .filter((item) => {
                        const haystack =
                            `${item.title} ${item.year} ${item.quality}`.toLowerCase();
                        return haystack.includes(query);
                    })
                    .slice(0, 36),
            });
        }

        res.json(sections);
    } catch (error) {
        res.status(502).json({ error: error.message });
    }
});

app.get("/api/cineby/movie", async (req, res) => {
    try {
        const path = String(req.query.path || "").trim();

        if (!path) {
            return res.status(400).json({ error: "Missing movie path." });
        }

        const detail = await fetchMovieDetail(path);
        res.json(detail);
    } catch (error) {
        res.status(502).json({ error: error.message });
    }
});

/* =========================
   SCRAMJET ROUTE
========================= */
app.get("/scramjet/*", async (req, res) => {
    let target = "(unknown)";
    try {
        const encoded = req.params[0];

        if (!encoded) {
            return res.status(400).send(ERROR_PAGE("No URL provided."));
        }

        target = decodeBase64URL(encoded).replace(/[`'"]/g, "").trim();

        // validate it looks like a URL
        new URL(target);

        // append any query params (e.g. from GET form submissions like ?q=search)
        const qs = new URLSearchParams(req.query).toString();
        if (qs) {
            target += (target.includes("?") ? "&" : "?") + qs;
        }

        console.log("[Scramjet] Proxying:", target);

        const response = await fetch(target, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
                Referer: new URL(target).origin,
                Origin: new URL(target).origin,
            },
            redirect: "follow",
            timeout: 15000,
        });

        const contentType = (
            response.headers.get("content-type") || ""
        ).toLowerCase();
        const cleanedHeaders = cleanHeaders(
            Object.fromEntries(response.headers.entries()),
        );

        // CRITICAL FIX: WAY MORE RELIABLE HTML DETECTION
        const isHtmlPage =
            contentType.includes("text/html") ||
            contentType.includes("application/xhtml+xml") ||
            target.toLowerCase().endsWith(".html") ||
            target.endsWith("/");

        if (isHtmlPage) {
            console.log(
                `[Scramjet] Processing as HTML: ${target} (${contentType})`,
            );
            const text = await response.text();
            const origin = new URL(target).origin;
            const targetDir = target.substring(0, target.lastIndexOf("/") + 1);

            const rewritten = text.replace(
                /(href|src|action)=["'](.*?)["']/gi,
                (match, attr, url) => {
                    if (
                        !url ||
                        url.startsWith("#") ||
                        url.startsWith("/scramjet/") // Already rewritten
                    ) {
                        return match;
                    }

                    // Clean the captured URL of any injected backticks
                    const cleanUrl = url.replace(/[`'"]/g, "").trim();

                    let absolute;
                    try {
                        if (cleanUrl.startsWith("http")) {
                            absolute = cleanUrl;
                        } else if (cleanUrl.startsWith("//")) {
                            absolute = "https:" + cleanUrl;
                        } else if (cleanUrl.startsWith("/")) {
                            absolute = origin + cleanUrl;
                        } else {
                            // Relative to the current page directory
                            absolute = new URL(cleanUrl, targetDir).href;
                        }

                        // 🔥 THE ACTUAL FIX (proxy EVERYTHING except safe inline stuff)
                        if (
                            absolute.startsWith("data:") ||
                            absolute.startsWith("blob:") ||
                            absolute.startsWith("javascript:")
                        ) {
                            return match;
                        }

                        // ALWAYS proxy everything else
                        return `${attr}="/scramjet/${encodeBase64URL(absolute)}"`;
                    } catch (e) {
                        return match;
                    }
                },
            );

            const finalHtml = rewritten.replace(
                /(<head[^>]*>)/i,
                "$1" + ORBIT_GUARD_SCRIPT,
            );

            // FORCE HTML HEADER HARD and remove the line that can re-add bad headers
            res.set("Content-Type", "text/html; charset=utf-8");
            res.removeHeader("content-security-policy");
            res.send(finalHtml);
        } else {
            const buffer = await response.buffer();
            res.set(cleanedHeaders);
            res.send(buffer);
        }
    } catch (err) {
        console.error("[Scramjet] Proxy error for", target, ":", err.message);
        if (!res.headersSent) {
            res.status(502).send(ERROR_PAGE(err.message));
        }
    }
});

/* =========================
   MEDIA PROXY (modular)
   Attempts to resolve media pages using driver adapters (ultraviolet, wisp, whisper).
   Drivers live in ./media-drivers/*. If none resolve, falls back to /scramjet redirect.
========================= */
try {
    const mediaProxy = require("./media-proxy");
    app.get("/proxy", mediaProxy.handleProxy);
} catch (err) {
    console.error("Failed to load media-proxy module:", err.message);
    app.get("/proxy", (req, res) => {
        const url = String(req.query.url || "").trim();
        if (!url)
            return res.status(400).send(ERROR_PAGE("Missing url parameter."));
        try {
            new URL(url);
        } catch (e) {
            return res.status(400).send(ERROR_PAGE("Invalid url parameter."));
        }
        const encoded = encodeBase64URL(url);
        return res.redirect(302, `/scramjet/${encoded}`);
    });
}

/* =========================
   KEEP SERVER ALIVE ON ERRORS
========================= */
process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err.message);
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
});

/* =========================
   START SERVER
========================= */
module.exports = { ERROR_PAGE, ORBIT_GUARD_SCRIPT };

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running at http://0.0.0.0:" + PORT);
});
