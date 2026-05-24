const crypto = require("crypto");

const adminSessionCookieName = "veloura_admin_session";
const adminSessionTtlSeconds = Number(process.env.ADMIN_SESSION_TTL_SECONDS || 60 * 60 * 8);

function adminPassword() {
  if (process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD;
  }

  if (process.env.VERCEL) {
    return "";
  }

  return process.env.ADMIN_PASSWORD || "veloura-admin";
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || adminPassword();
}

function safeEqualText(left, right) {
  const leftHash = crypto.createHash("sha256").update(String(left || "")).digest();
  const rightHash = crypto.createHash("sha256").update(String(right || "")).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function isValidAdminPassword(value) {
  const password = adminPassword();
  return Boolean(password) && safeEqualText(value, password);
}

function signSessionPayload(encodedPayload) {
  const secret = sessionSecret();

  if (!secret) {
    return "";
  }

  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

function createAdminSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  const encodedPayload = Buffer.from(JSON.stringify({
    sub: "admin",
    iat: now,
    exp: now + adminSessionTtlSeconds
  })).toString("base64url");

  return `${encodedPayload}.${signSessionPayload(encodedPayload)}`;
}

function verifyAdminSessionToken(token) {
  if (!token || typeof token !== "string") {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  if (!safeEqualText(signature, signSessionPayload(encodedPayload))) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    return payload.sub === "admin" && Number(payload.exp) > now;
  } catch {
    return false;
  }
}

function parseCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) return cookies;

      const key = part.slice(0, separatorIndex);
      const value = part.slice(separatorIndex + 1);
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function secureCookieSuffix() {
  return process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function setAdminSessionCookie(response) {
  const token = createAdminSessionToken();
  response.setHeader(
    "Set-Cookie",
    `${adminSessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${adminSessionTtlSeconds}${secureCookieSuffix()}`
  );
}

function clearAdminSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    `${adminSessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookieSuffix()}`
  );
}

function isAuthorized(headers) {
  const cookies = parseCookies(headers.cookie);
  return verifyAdminSessionToken(cookies[adminSessionCookieName]);
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

function sendError(response, error) {
  sendJson(response, error.statusCode || 500, {
    error: error.message || "Server error"
  });
}

function readRequestBuffer(request, limit = 2_000_000) {
  if (Buffer.isBuffer(request.body)) {
    return Promise.resolve(request.body);
  }

  if (typeof request.body === "string") {
    return Promise.resolve(Buffer.from(request.body));
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let bodyLength = 0;

    request.on("data", (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bodyLength += buffer.length;

      if (bodyLength > limit) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }

      chunks.push(buffer);
    });

    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function readBody(request) {
  return (await readRequestBuffer(request)).toString("utf8");
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object" && !Buffer.isBuffer(request.body)) {
    return request.body;
  }

  const body = await readBody(request);
  return body ? JSON.parse(body) : {};
}

module.exports = {
  adminPassword,
  clearAdminSessionCookie,
  isValidAdminPassword,
  isAuthorized,
  readRequestBuffer,
  readJsonBody,
  sendError,
  sendJson,
  setAdminSessionCookie
};
