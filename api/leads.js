const { createLead, getLeads } = require("../lib/storage.cjs");
const { notifyLeadSafely } = require("../lib/email.cjs");
const { isAuthorized, readJsonBody, sendError, sendJson } = require("../lib/http.cjs");

module.exports = async function handler(request, response) {
  try {
    if (request.method === "POST") {
      const lead = await readJsonBody(request);
      const savedLead = await createLead(lead);
      await notifyLeadSafely(savedLead);
      sendJson(response, 201, { ok: true });
      return;
    }

    if (request.method === "GET") {
      if (!isAuthorized(request.headers)) {
        sendJson(response, 401, { error: "Unauthorized" });
        return;
      }

      sendJson(response, 200, await getLeads());
      return;
    }

    response.setHeader("Allow", "GET, POST");
    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendError(response, error);
  }
};
