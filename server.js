// ============================================================
// RepostShield — local dev/preview server (zero dependencies)
//   node server.js   →  http://localhost:3000
// Serves static files AND /api/generate using the same logic
// that runs on Vercel. Loads .env if present (no library needed).
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const generate = require("./api/generate.js");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// tiny .env loader (optional convenience)
try {
  const envFile = path.join(ROOT, ".env");
  if (fs.existsSync(envFile)) {
    fs.readFileSync(envFile, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      });
    console.log("[server] Loaded .env");
  }
} catch (_) { /* ignore */ }

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".md": "text/plain; charset=utf-8",
};

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(buf);
  });
}

// Express-like adapter so the Vercel-style handler
// (res.status().json()) also works with Node's raw http res.
function wrapRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    const body = JSON.stringify(obj);
    res.writeHead(res.statusCode || 200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(body);
  };
  return res;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/generate" && req.method === "POST") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        req.body = raw ? JSON.parse(raw) : {};
      } catch (_) {
        req.body = null;
      }
      generate(req, wrapRes(res));
    });
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`✅ RepostShield is running at http://localhost:${PORT}`);
  console.log(`   (POST /api/generate is active; add your OPENROUTER_API_KEY in .env to enable AI)`);
});
