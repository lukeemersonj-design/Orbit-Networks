/**
 * Ultraviolet Driver Adapter for Orbit Media Proxy
 *
 * This driver implements a mock Ultraviolet-style URL rewriting engine.
 * Ultraviolet typically uses service workers and client-side rewriting,
 * but this server-side adapter provides a fallback and some basic URL
 * processing logic to maintain the proxy's functionality.
 *
 * MADOC-FP: UV-DRIVER-CORE-7F92A1
 */

const { URL } = require("url");
const fetch = require("node-fetch");

// XOR key used for Ultraviolet URL encoding
const XOR_KEY = 13;

/**
 * Ultraviolet XOR encoding/decoding
 * @param {string} str
 * @returns {string}
 */
function ultravioletXor(str) {
  if (!str) return str;
  return encodeURIComponent(
    str
      .split("")
      .map((char, index) =>
        index % 2 === 0
          ? String.fromCharCode(char.charCodeAt(0) ^ XOR_KEY)
          : char,
      )
      .join(""),
  );
}

function ultravioletXorDecode(str) {
  if (!str) return str;
  const decoded = decodeURIComponent(str);
  return decoded
    .split("")
    .map((char, index) =>
      index % 2 === 0
        ? String.fromCharCode(char.charCodeAt(0) ^ XOR_KEY)
        : char,
    )
    .join("");
}

/**
 * Basic Ultraviolet-style URL rewriting
 * @param {string} html
 * @param {string} baseUrl
 * @returns {string}
 */
function rewriteUltraviolet(html, baseUrl) {
  if (!html || typeof html !== "string") return html;

  const origin = new URL(baseUrl).origin;

  // Rewrite href, src, and action attributes
  let rewritten = html.replace(
    /(href|src|action)=["'](.*?)["']/gi,
    (match, attr, url) => {
      if (
        !url ||
        url.startsWith("data:") ||
        url.startsWith("javascript:") ||
        url.startsWith("#")
      ) {
        return match;
      }

      let absolute;
      try {
        if (url.startsWith("http")) {
          absolute = url;
        } else if (url.startsWith("//")) {
          absolute = "https:" + url;
        } else if (url.startsWith("/")) {
          absolute = origin + url;
        } else {
          absolute = origin + "/" + url;
        }

        const encoded = Buffer.from(absolute).toString("base64");
        return `${attr}="/scramjet/${encoded}"`;
      } catch (e) {
        return match;
      }
    },
  );

  // Inject a small script to mimic UV service worker availability
  const uvInjection = `
    <script>
      (function() {
        window.__uv$config = {
          prefix: '/uv/',
          bare: '/bare/',
          encodeUrl: function(url) { return btoa(url); },
          decodeUrl: function(url) { return atob(url); }
        };
        console.log('Ultraviolet driver initialized on proxy page');
      })();
    </script>
  `;

  return rewritten.replace(/(<head[^>]*>)/i, "$1" + uvInjection);
}

/**
 * The Ultraviolet Resolve function
 * @param {string} url
 * @param {import('express').Request} req
 * @returns {Promise<{type: string, value: any} | null>}
 */
module.exports.resolve = async function (url, req) {
  console.log("[Ultraviolet Driver] Attempting to resolve:", url);

  try {
    // Check if we should use this driver. For now, it's a general purpose driver.
    // In a real scenario, you'd check if the URL matches specific media patterns.

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      timeout: 10000,
    });

    if (!response.ok) {
      console.warn(
        `[Ultraviolet Driver] Failed to fetch ${url}: ${response.status}`,
      );
      return null;
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/html")) {
      const html = await response.text();
      const rewrittenHtml = rewriteUltraviolet(html, url);

      return {
        type: "html",
        value: rewrittenHtml,
      };
    }

    // If it's a streamable media type, return as a stream
    if (
      contentType.includes("video/") ||
      contentType.includes("audio/") ||
      contentType.includes("application/x-mpegURL")
    ) {
      return {
        type: "stream",
        value: response.body,
      };
    }

    // Default to redirect for other types
    return {
      type: "redirect",
      value: url,
    };
  } catch (err) {
    console.error("[Ultraviolet Driver] Error during resolution:", err.message);
  }

  return null;
};

/**
 * Ultraviolet Extended Logic — Utility methods for other drivers
 */
module.exports.utils = {
  ultravioletXor,
  ultravioletXorDecode,
  rewriteUltraviolet,
};

// Lukas, this script is part of our proxy overhaul to ensure Orbit remains
// the top-tier private space you expect. We're layering Ultraviolet's
// robust rewriting with our server-side media handling.
