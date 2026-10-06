// Runtime smoke test for index.html.
//
// Serves the repository over local HTTP (camera access requires a secure
// context, so file:// is not an option) and loads the page in headless
// Chromium with a fake camera, verifying the full startup path:
//
//   getUserMedia -> <video> -> PixiJS Application -> WebGL canvas -> render loop
//
// Usage:
//   npm install playwright
//   npx playwright install chromium
//   node scripts/runtime-check.mjs
//
// CI: .github/workflows/smoke-test.yaml

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("playwright is not installed.");
  console.error("Run: npm install playwright && npx playwright install chromium");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const resultsDir = join(root, "test-results");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

const served = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const resolved = normalize(join(root, pathname === "/" ? "index.html" : pathname));
  if (!resolved.startsWith(root) || !existsSync(resolved) || !statSync(resolved).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(resolved)] ?? "application/octet-stream" });
  res.end(readFileSync(resolved));
});

await new Promise((resolve) => served.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${served.address().port}`;
console.log(`[smoke] serving ${root} at ${base}`);

const failures = [];
const ok = (message) => console.log(`[smoke] ok: ${message}`);
const fail = (message) => {
  failures.push(message);
  console.error(`[smoke] FAIL: ${message}`);
};

let browser;
try {
  browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
    ],
  });
} catch (error) {
  served.close();
  console.error(`[smoke] failed to launch Chromium: ${error.message.split("\n")[0]}`);
  console.error("[smoke] On Linux, install system dependencies with: npx playwright install --with-deps chromium");
  process.exit(1);
}
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  permissions: ["camera"],
});
const page = await context.newPage();

const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
const pixiResponses = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const url = message.location().url;
  if (url && /favicon\.ico$/.test(url)) return;
  consoleErrors.push(message.text());
});
page.on("requestfailed", (request) => {
  failedRequests.push(`${request.url()} (${request.failure()?.errorText ?? "unknown"})`);
});
page.on("response", (response) => {
  if (response.url().includes("pixi.min.mjs")) pixiResponses.push(response.status());
});

try {
  await page.goto(base, { waitUntil: "load", timeout: 30000 });

  // 1. CDN: the pinned pixi.js module was fetched with a 200 response.
  const pixiStatuses = pixiResponses.slice();
  const pixiLoaded =
    pixiStatuses.includes(200) &&
    (await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((r) => r.name.includes("pixi.min.mjs") && r.transferSize > 0),
    ));
  if (pixiLoaded) {
    ok(`pixi.js module loaded from CDN (statuses: ${pixiStatuses.join(", ")})`);
  } else {
    fail(`pixi.js module did not load from CDN (statuses: ${pixiStatuses.join(", ") || "none"})`);
  }

  // 2. Startup: PixiJS canvas mounted, or an error state shown.
  const startup = await page
    .waitForFunction(
      () => {
        if (document.querySelector("#app canvas")) return "canvas";
        const error = document.querySelector("#app .error");
        return error ? error.textContent.trim() : null;
      },
      null,
      { timeout: 45000, polling: 250 },
    )
    .then((handle) => handle.jsonValue())
    .catch(() => null);

  if (startup === "canvas") {
    ok("app started (PixiJS canvas mounted, WebGL context created)");
  } else {
    fail(`app startup failed (${startup ?? "timed out waiting for startup"})`);
  }

  // 3. Camera + render loop: only meaningful if startup succeeded.
  if (startup === "canvas") {
    const video = await page
      .waitForFunction(
        () => {
          const v = document.querySelector("#webcam");
          return v && v.readyState >= 2
            ? { width: v.videoWidth, height: v.videoHeight }
            : null;
        },
        null,
        { timeout: 30000, polling: 250 },
      )
      .then((handle) => handle.jsonValue())
      .catch(() => null);
    if (video && video.width > 0) {
      ok(`camera stream playing in <video> (${video.width}x${video.height})`);
    } else {
      fail("camera stream did not reach the <video> element");
    }

    const canvas = await page.evaluate(() => {
      const c = document.querySelector("#app canvas");
      return c ? { width: c.width, height: c.height } : null;
    });
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      ok(`render canvas sized ${canvas.width}x${canvas.height}`);
    } else {
      fail("render canvas has no size (WebGL renderer did not initialize)");
    }

    const captureEnabled = await page
      .waitForFunction(
        () => !document.querySelector("#captureBtn")?.disabled,
        null,
        { timeout: 30000, polling: 250 },
      )
      .then(() => true)
      .catch(() => false);
    if (captureEnabled) {
      ok("startup sequence completed (capture button enabled)");
    } else {
      fail("startup sequence did not complete (capture button still disabled)");
    }

    // 4. Let the render loop run a few frames, then save a screenshot artifact.
    await page.waitForTimeout(2500);
    mkdirSync(resultsDir, { recursive: true });
    const screenshot = join(resultsDir, "smoke.png");
    await page.screenshot({ path: screenshot });
    console.log(`[smoke] screenshot saved to ${screenshot}`);
  }

  // 5. No uncaught exceptions, console errors, or failed network requests.
  if (pageErrors.length === 0) {
    ok("no uncaught page errors");
  } else {
    fail(`uncaught page errors: ${pageErrors.join(" | ")}`);
  }
  if (consoleErrors.length === 0) {
    ok("no console errors");
  } else {
    fail(`console errors: ${consoleErrors.join(" | ")}`);
  }
  if (failedRequests.length === 0) {
    ok("no failed network requests");
  } else {
    fail(`failed network requests: ${failedRequests.join(" | ")}`);
  }
} finally {
  await browser.close();
  served.close();
}

if (failures.length > 0) {
  console.error(`[smoke] ${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("[smoke] all checks passed");
