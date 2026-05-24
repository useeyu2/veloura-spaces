const { getContent, saveContent } = require("../lib/storage.cjs");
const { isAuthorized, readJsonBody, sendError, sendJson } = require("../lib/http.cjs");

module.exports = async function handler(request, response) {
  try {
    if (request.method === "GET") {
      sendJson(response, 200, await getContent());
      return;
    }

    if (request.method === "PUT") {
      if (!isAuthorized(request.headers)) {
        sendJson(response, 401, { error: "Unauthorized" });
        return;
      }

      const content = await readJsonBody(request);
      sendJson(response, 200, { ok: true, content: await saveContent(content) });
      return;
    }

    response.setHeader("Allow", "GET, PUT");
    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendError(response, error);
  }
};
