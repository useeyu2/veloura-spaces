const {
  isAuthorized,
  sendError,
  sendJson
} = require("../../lib/http.cjs");

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    sendJson(response, 200, { authenticated: isAuthorized(request.headers) });
  } catch (error) {
    sendError(response, error);
  }
};
