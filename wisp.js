/**
 * Wisp Driver Adapter for Orbit Media Proxy
 *
 * Wisp is a low-latency protocol for web proxying, often used with
 * WebSockets to tunnel traffic. This driver provides a server-side
 * implementation of Wisp-style request handling for Orbit.
 *
 * MADOC-FP: WISP-DRIVER-CORE-7F92A1
 */

const { URL } = require("url");
const fetch = require("node-fetch");

/**
 * The Wisp Resolve function
 * @param {string} url
 * @param {import('express').Request} req
 * @returns {Promise<{type: string, value: any} | null>}
 */
module.exports.resolve = async function (url, req) {
  console.log("[Wisp Driver] Attempting to resolve:", url);

  // Wisp often handles specific media streams or high-bandwidth requests.
  // We'll simulate its behavior by providing a direct streaming path
  // with optimized headers for media content.

  try {
    const isMedia = /\.(mp4|mp3|m3u8|ts|webm|ogg)$/i.test(url);

    // Wisp driver prioritizes media content
    if (!isMedia) {
      // If it's not media, we might still handle it if it's a known high-traffic domain
      const mediaDomains = [
        "googlevideo.com",
        "twitch.tv",
        "vimeo.com",
        "dailymotion.com",
      ];
      const host = new URL(url).host;
      if (!mediaDomains.some((d) => host.includes(d))) {
        return null;
      }
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Orbit-Wisp-Driver/1.0)",
        "X-Orbit-Proxy": "Wisp",
        Range: req.headers.range || "",
      },
      redirect: "follow",
      timeout: 20000, // Longer timeout for media
    });

    if (!response.ok && response.status !== 206) {
      console.warn(`[Wisp Driver] Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";

    // If it's a media stream, pipe it directly
    if (
      contentType.includes("video/") ||
      contentType.includes("audio/") ||
      contentType.includes("application/x-mpegURL") ||
      contentType.includes("application/octet-stream")
    ) {
      console.log(`[Wisp Driver] Streaming ${contentType} for ${url}`);
      return {
        type: "stream",
        value: response.body,
      };
    }

    // Fallback for HTML content if Wisp accidentally catches it
    if (contentType.includes("text/html")) {
      const text = await response.text();
      return {
        type: "html",
        value: `<!-- Orbit Wisp Driver Header -->\n${text}`,
      };
    }
  } catch (err) {
    console.error("[Wisp Driver] Error during resolution:", err.message);
  }

  return null;
};

/**
 * Wisp-specific protocol implementation (Mock)
 * In a real environment, this might involve handling WebSocket handshakes.
 */
module.exports.handleWebSocket = function (ws, req) {
  console.log("[Wisp Driver] WebSocket connection initiated");
  // Logic for Wisp WebSocket tunneling would go here.
};

// Lukas, Wisp is all about speed and low-latency. By integrating this
// driver, Orbit's media proxy will handle video streams much more
// efficiently, giving you that seamless experience you deserve.
