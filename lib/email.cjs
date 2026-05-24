const { getContent } = require("./storage.cjs");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildLeadEmail(lead, content) {
  const brandName = content?.brand?.name || "Veloura Spaces";
  const rows = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone || "Not provided"],
    ["Project type", lead.service],
    ["Estimated budget", lead.budget],
    ["Project notes", lead.message || "Not provided"],
    ["Submitted", lead.createdAt]
  ];

  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e6e1d7;color:#68716c;font-weight:700;">${escapeHtml(label)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e6e1d7;color:#0d1110;">${escapeHtml(value)}</td>
    </tr>
  `).join("");

  const textContent = rows.map(([label, value]) => `${label}: ${value}`).join("\n");

  return {
    subject: `New consultation request from ${lead.name}`,
    textContent,
    htmlContent: `
      <html>
        <body style="margin:0;background:#f7f5f0;font-family:Arial,sans-serif;color:#0d1110;">
          <div style="max-width:680px;margin:0 auto;padding:32px;">
            <p style="margin:0 0 8px;color:#9b6a3a;font-weight:700;text-transform:uppercase;">${escapeHtml(brandName)}</p>
            <h1 style="margin:0 0 18px;font-family:Georgia,serif;font-weight:500;">New consultation request</h1>
            <table role="presentation" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #d8d2c4;">
              ${htmlRows}
            </table>
          </div>
        </body>
      </html>
    `
  };
}

async function sendLeadNotification(lead) {
  if (!process.env.BREVO_API_KEY) {
    return { status: "skipped", reason: "BREVO_API_KEY is not configured." };
  }

  const content = await getContent();
  const senderEmail = process.env.BREVO_SENDER_EMAIL || content?.brand?.email;
  const senderName = process.env.BREVO_SENDER_NAME || content?.brand?.name || "Veloura Spaces";
  const notifyEmail = process.env.LEAD_NOTIFY_EMAIL || content?.brand?.email;

  if (!senderEmail || !notifyEmail) {
    return { status: "skipped", reason: "Sender or notification email is not configured." };
  }

  const email = buildLeadEmail(lead, content);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: notifyEmail,
          name: senderName
        }
      ],
      replyTo: {
        email: lead.email,
        name: lead.name
      },
      subject: email.subject,
      htmlContent: email.htmlContent,
      textContent: email.textContent
    })
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Brevo email failed with ${response.status}: ${body}`);
    error.statusCode = response.status;
    throw error;
  }

  return { status: "sent", response: await response.json().catch(() => ({})) };
}

async function notifyLeadSafely(lead) {
  try {
    return await sendLeadNotification(lead);
  } catch (error) {
    console.error(error.message);
    return { status: "failed" };
  }
}

module.exports = {
  notifyLeadSafely,
  sendLeadNotification
};
