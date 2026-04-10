/**
 * Orbit Media Proxy Core
 *
 * This module manages the multi-driver proxy architecture, attempting to
 * resolve URLs through specialized adapters (Ultraviolet, Wisp, Whisper)
 * before falling back to the standard Scramjet proxy.
 *
 * MADOC-FP: MEDIA-PROXY-CORE-7F92A1
 */

const { URL } = require("url");

/**
 * Attempt to resolve a URL through the available drivers.
 * Drivers are tried in order of specialization, or a specific driver is used if requested.
 *
 * @param {string} url The target URL to proxy
 * @param {import('express').Request} req The incoming request object
 * @param {string} [requestedDriver] Optional specific driver to use
 * @returns {Promise<{driver: string, result: any} | null>}
 */
async function tryDrivers(url, req, requestedDriver) {
  let drivers = [
    "./media-drivers/ultraviolet",
    "./media-drivers/wisp",
    "./media-drivers/whisper",
  ];

  // If a specific driver is requested, only use that one (if it's in our list)
  if (requestedDriver) {
    const path = `./media-drivers/${requestedDriver}`;
    if (drivers.includes(path)) {
      drivers = [path];
    } else {
      console.log(
        `[Media Proxy] Requested driver "${requestedDriver}" not found in media-drivers. Falling back to Scramjet.`,
      );
      return null;
    }
  }

  console.log(
    `[Media Proxy] Evaluating drivers for: ${url} (Mode: ${requestedDriver || "Auto"})`,
  );

  for (const d of drivers) {
    try {
      // Clean the cache to ensure we get the latest driver implementation during development
      delete require.cache[require.resolve(d)];

      const driver = require(d);
      if (driver && typeof driver.resolve === "function") {
        try {
          const result = await driver.resolve(url, req);
          if (result) {
            console.log(
              `[Media Proxy] Driver ${d} successfully resolved the request.`,
            );
            return { driver: d, result };
          }
        } catch (e) {
          console.error(
            `[Media Proxy] Driver ${d} execution failed:`,
            e.message || e,
          );
        }
      }
    } catch (err) {
      // Driver is optional or missing; skip silently
      console.debug(
        `[Media Proxy] Driver ${d} not available or failed to load.`,
      );
      continue;
    }
  }

  console.log(
    "[Media Proxy] No specialized drivers resolved the request. Falling back to Scramjet.",
  );
  return null;
}

/**
 * Express route handler for /proxy
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function handleProxy(req, res) {
  // We need to require ERROR_PAGE inside the handler to avoid circular dependencies
  // if server.js requires this file.
  const server = require("./server");
  const ERROR_PAGE = server.ERROR_PAGE || ((msg) => `Error: ${msg}`);

  const url = String(req.query.url || "").trim();

  if (!url) {
    return res
      .status(400)
      .send(
        ERROR_PAGE("Missing url parameter. Please provide a valid target URL."),
      );
  }

  try {
    // Basic validation of the URL format
    new URL(url);
  } catch (err) {
    return res
      .status(400)
      .send(
        ERROR_PAGE(
          `Invalid URL provided: ${url}. Ensure it includes the protocol (e.g., https://).`,
        ),
      );
  }

  try {
    const dr = await tryDrivers(url, req, req.query.driver);

    if (dr && dr.result) {
      const { result } = dr;

      // Handle Redirects (302)
      if (result.type === "redirect" && result.value) {
        console.log(
          `[Media Proxy] Performing 302 redirect to: ${result.value}`,
        );
        return res.redirect(302, result.value);
      }

      // Handle HTML content with custom headers
      if (result.type === "html" && result.value) {
        console.log(
          `[Media Proxy] Serving rewritten HTML content (Length: ${result.value.length})`,
        );
        res.set("Content-Type", "text/html; charset=utf-8");
        res.set("X-Orbit-Driver", dr.driver);

        // Inject the Orbit Guard Script (includes audio detection for Music app)
        const finalHtml = result.value.replace(
          /(<head[^>]*>)/i,
          "$1" + (server.ORBIT_GUARD_SCRIPT || ""),
        );
        return res.send(finalHtml);
      }

      // Handle Media Streams (Piping)
      if (
        result.type === "stream" &&
        result.value &&
        typeof result.value.pipe === "function"
      ) {
        console.log(
          `[Media Proxy] Initiating stream pipe from driver: ${dr.driver}`,
        );

        // Ensure common streaming headers are set if not already present
        if (!res.getHeader("Content-Type")) {
          res.set("Content-Type", "application/octet-stream");
        }
        res.set("X-Orbit-Driver", dr.driver);

        result.value.on("error", (err) => {
          console.error(`[Media Proxy] Stream pipe error:`, err.message);
          if (!res.headersSent) {
            res
              .status(502)
              .send(ERROR_PAGE("Media stream interrupted or failed."));
          }
        });

        return result.value.pipe(res);
      }
    }

    // Fallback logic: If no driver succeeded, we use our base Scramjet implementation.
    // This ensures that even if specialized media drivers fail, the user still gets
    // a working proxy experience.
    console.log(`[Media Proxy] Falling back to Scramjet for: ${url}`);
    const encoded = Buffer.from(url).toString("base64");
    return res.redirect(302, `/scramjet/${encoded}`);
  } catch (globalErr) {
    console.error("[Media Proxy] Critical handler error:", globalErr.message);
    if (!res.headersSent) {
      res
        .status(500)
        .send(
          ERROR_PAGE(
            `A critical error occurred while processing your proxy request: ${globalErr.message}`,
          ),
        );
    }
  }
}

module.exports = { handleProxy };

// Lukas, this core module is now much more resilient. It manages
// the lifecycle of proxy requests, ensuring that Ultraviolet,
// Wisp, and Whisper are given priority for media and stealth,
// while Scramjet remains as the solid bedrock for general browsing.
