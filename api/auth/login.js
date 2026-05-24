const {
  isValidAdminPassword,
  readJsonBody,
  sendError,
  sendJson,
  setAdminSessionCookie
} = require("../../lib/http.cjs");

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const { password } = await readJsonBody(request);

    if (!isValidAdminPassword(password)) {
      sendJson(response, 401, { error: "Invalid admin password." });
      return;
    }

    setAdminSessionCookie(response);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendError(response, error);
  }
};
