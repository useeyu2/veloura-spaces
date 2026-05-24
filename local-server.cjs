const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
const adminPassword = process.env.ADMIN_PASSWORD || "veloura-admin";
const contentPath = path.join(root, "data", "content.json");
const leadsPath = path.join(root, "data", "leads.json");

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

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(text);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        request.destroy();
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function isAuthorized(request) {
  const token = request.headers["x-admin-token"] || "";
  return token === adminPassword;
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile(filePath, payload) {
  const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  await fsp.writeFile(tempPath, json, "utf8");
  await fsp.rename(tempPath, filePath);
}

function validateContent(content) {
  if (!content || typeof content !== "object") return "Content must be an object.";
  if (!content.brand || typeof content.brand.name !== "string") return "Brand name is required.";
  if (!Array.isArray(content.services)) return "Services must be an array.";
  if (!Array.isArray(content.projects)) return "Projects must be an array.";
  if (!Array.isArray(content.testimonials)) return "Testimonials must be an array.";

  const slugs = new Set();
  for (const project of content.projects) {
    if (!project.slug || typeof project.slug !== "string") return "Every project needs a slug.";
    if (slugs.has(project.slug)) return `Duplicate project slug: ${project.slug}`;
    slugs.add(project.slug);
  }

  return null;
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/content" && request.method === "GET") {
    const content = await readJsonFile(contentPath, {});
    sendJson(response, 200, content);
    return true;
  }

  if (url.pathname === "/api/content" && request.method === "PUT") {
    if (!isAuthorized(request)) {
      sendJson(response, 401, { error: "Unauthorized" });
      return true;
    }

    const body = await readRequestBody(request);
    const content = JSON.parse(body || "{}");
    const validationError = validateContent(content);

    if (validationError) {
      sendJson(response, 400, { error: validationError });
      return true;
    }

    await writeJsonFile(contentPath, content);
    sendJson(response, 200, { ok: true, content });
    return true;
  }

  if (url.pathname === "/api/leads" && request.method === "POST") {
    const body = await readRequestBody(request);
    const lead = JSON.parse(body || "{}");

    if (!lead.name || !lead.email || !lead.service || !lead.budget) {
      sendJson(response, 400, { error: "Name, email, service, and budget are required." });
      return true;
    }

    const leads = await readJsonFile(leadsPath, []);
    leads.unshift({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name: String(lead.name || "").trim(),
      email: String(lead.email || "").trim(),
      phone: String(lead.phone || "").trim(),
      service: String(lead.service || "").trim(),
      budget: String(lead.budget || "").trim(),
      message: String(lead.message || "").trim()
    });

    await writeJsonFile(leadsPath, leads);
    sendJson(response, 201, { ok: true });
    return true;
  }

  if (url.pathname === "/api/leads" && request.method === "GET") {
    if (!isAuthorized(request)) {
      sendJson(response, 401, { error: "Unauthorized" });
      return true;
    }

    const leads = await readJsonFile(leadsPath, []);
    sendJson(response, 200, leads);
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
    sendJson(response, 500, { error: error.message || "Server error" });
  }
});

server.listen(port, host, () => {
  console.log(`Local server running at http://${host}:${port}/`);
  console.log(`Admin panel running at http://${host}:${port}/admin/`);
  console.log(`Admin password: ${adminPassword}`);
});
