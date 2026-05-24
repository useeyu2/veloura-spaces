function adminPassword() {
  return process.env.ADMIN_PASSWORD || "veloura-admin";
}

function isAuthorized(headers) {
  return headers["x-admin-token"] === adminPassword();
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

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  const body = await readBody(request);
  return body ? JSON.parse(body) : {};
}

module.exports = {
  adminPassword,
  isAuthorized,
  readJsonBody,
  sendError,
  sendJson
};
