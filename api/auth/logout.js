const {
  clearAdminSessionCookie,
  sendError,
  sendJson
} = require("../../lib/http.cjs");

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    clearAdminSessionCookie(response);
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendError(response, error);
  }
};
