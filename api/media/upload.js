const { uploadImageFromRequest } = require("../../lib/cloudinary.cjs");
const { isAuthorized, sendError, sendJson } = require("../../lib/http.cjs");

module.exports = async function handler(request, response) {
  try {
    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    if (!isAuthorized(request.headers)) {
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }

    sendJson(response, 201, await uploadImageFromRequest(request));
  } catch (error) {
    sendError(response, error);
  }
};
