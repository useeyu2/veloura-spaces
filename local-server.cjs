const http = require("http");
const fs = require("fs");
const path = require("path");
const { createLead, getContent, getLeads, saveContent } = require("./lib/storage.cjs");
const { notifyLeadSafely } = require("./lib/email.cjs");
const { uploadImageFromRequest } = require("./lib/cloudinary.cjs");
const {
  adminPassword,
  clearAdminSessionCookie,
  isAuthorized,
  isValidAdminPassword,
  readJsonBody,
  sendError,
  sendJson,
  setAdminSessionCookie
} = require("./lib/http.cjs");

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

async function loadLocalEnv() {
  const envPath = path.join(root, ".env");

  try {
    const raw = await fs.promises.readFile(envPath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) return;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(text);
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/auth/session" && request.method === "GET") {
    sendJson(response, 200, { authenticated: isAuthorized(request.headers) });
    return true;
  }

  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    const { password } = await readJsonBody(request);

    if (!isValidAdminPassword(password)) {
      sendJson(response, 401, { error: "Invalid admin password." });
      return true;
    }

    setAdminSessionCookie(response);
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    clearAdminSessionCookie(response);
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/media/upload" && request.method === "POST") {
    if (!isAuthorized(request.headers)) {
      sendJson(response, 401, { error: "Unauthorized" });
      return true;
    }

    sendJson(response, 201, await uploadImageFromRequest(request));
    return true;
  }

  if (url.pathname === "/api/content" && request.method === "GET") {
    sendJson(response, 200, await getContent());
    return true;
  }

  if (url.pathname === "/api/content" && request.method === "PUT") {
    if (!isAuthorized(request.headers)) {
      sendJson(response, 401, { error: "Unauthorized" });
      return true;
    }

    const content = await readJsonBody(request);
    sendJson(response, 200, { ok: true, content: await saveContent(content) });
    return true;
  }

  if (url.pathname === "/api/leads" && request.method === "POST") {
    const savedLead = await createLead(await readJsonBody(request));
    await notifyLeadSafely(savedLead);
    sendJson(response, 201, { ok: true });
    return true;
  }

  if (url.pathname === "/api/leads" && request.method === "GET") {
    if (!isAuthorized(request.headers)) {
      sendJson(response, 401, { error: "Unauthorized" });
      return true;
    }

    sendJson(response, 200, await getLeads());
    return true;
  }

  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "API route not found." });
    return true;
  }

  return false;
}

function resolveStaticPath(urlPathname) {
  let requestedPath = decodeURIComponent(urlPathname);

  if (requestedPath === "/") {
    requestedPath = "/index.html";
  }

  let filePath = path.normalize(path.join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    return null;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  } else if (!path.extname(filePath) && fs.existsSync(`${filePath}.html`)) {
    filePath = `${filePath}.html`;
  }

  return filePath;
}

async function handleStatic(request, response, url) {
  if (url.pathname.startsWith("/data/")) {
    sendText(response, 403, "Forbidden");
    return;
  }

  const filePath = resolveStaticPath(url.pathname);

  if (!filePath) {
    sendText(response, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendText(response, 404, "Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${host}:${port}`);

  try {
    if (await handleApi(request, response, url)) {
      return;
    }

    await handleStatic(request, response, url);
  } catch (error) {
    sendError(response, error);
  }
});

loadLocalEnv().then(() => {
  server.listen(port, host, () => {
    console.log(`Local server running at http://${host}:${port}/`);
    console.log(`Admin panel running at http://${host}:${port}/admin/`);
    console.log(`Admin password: ${adminPassword()}`);
    console.log(`Storage: ${process.env.MONGODB_URI ? "MongoDB" : "local JSON"}`);
  });
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
