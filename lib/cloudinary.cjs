const crypto = require("crypto");
const { Blob } = require("buffer");
const { readRequestBuffer } = require("./http.cjs");

const maxImageBytes = 10 * 1024 * 1024;

function createError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw createError("Cloudinary is not configured.", 500);
  }

  return { cloudName, apiKey, apiSecret };
}

function signCloudinaryParams(params, apiSecret) {
  const payload = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${payload}${apiSecret}`)
    .digest("hex");
}

function parseContentDisposition(value) {
  return String(value || "")
    .split(";")
    .map((part) => part.trim())
    .reduce((result, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) return result;

      const key = part.slice(0, separatorIndex).toLowerCase();
      const fieldValue = part.slice(separatorIndex + 1).replace(/^"|"$/g, "");
      result[key] = fieldValue;
      return result;
    }, {});
}

function parseMultipartParts(buffer, boundary) {
  const boundaryMarker = Buffer.from(`--${boundary}`);
  const headerSeparator = Buffer.from("\r\n\r\n");
  const nextBoundaryPrefix = Buffer.from(`\r\n--${boundary}`);
  const parts = [];
  let cursor = buffer.indexOf(boundaryMarker);

  while (cursor !== -1) {
    cursor += boundaryMarker.length;

    if (buffer[cursor] === 45 && buffer[cursor + 1] === 45) {
      break;
    }

    if (buffer[cursor] === 13 && buffer[cursor + 1] === 10) {
      cursor += 2;
    }

    const headersEnd = buffer.indexOf(headerSeparator, cursor);

    if (headersEnd === -1) {
      break;
    }

    const contentStart = headersEnd + headerSeparator.length;
    const contentEnd = buffer.indexOf(nextBoundaryPrefix, contentStart);

    if (contentEnd === -1) {
      break;
    }

    const headers = buffer
      .subarray(cursor, headersEnd)
      .toString("utf8")
      .split(/\r?\n/)
      .reduce((result, line) => {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) return result;

        const key = line.slice(0, separatorIndex).trim().toLowerCase();
        result[key] = line.slice(separatorIndex + 1).trim();
        return result;
      }, {});

    const disposition = parseContentDisposition(headers["content-disposition"]);
    parts.push({
      name: disposition.name,
      filename: disposition.filename,
      contentType: headers["content-type"] || "application/octet-stream",
      buffer: buffer.subarray(contentStart, contentEnd)
    });

    cursor = buffer.indexOf(boundaryMarker, contentEnd);
  }

  return parts;
}

async function readMultipartImage(request) {
  const contentType = request.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];

  if (!boundary) {
    throw createError("Expected multipart form data.");
  }

  const buffer = await readRequestBuffer(request, maxImageBytes + 256_000);
  const file = parseMultipartParts(buffer, boundary).find((part) => part.name === "file" && part.filename);

  if (!file) {
    throw createError("Image file is required.");
  }

  if (!file.contentType.startsWith("image/")) {
    throw createError("Only image uploads are supported.");
  }

  if (file.buffer.length > maxImageBytes) {
    throw createError("Image must be 10MB or smaller.");
  }

  return file;
}

async function uploadImageToCloudinary(file) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "veloura-spaces";
  const params = { folder, timestamp };
  const signature = signCloudinaryParams(params, apiSecret);
  const formData = new FormData();

  formData.append("file", new Blob([file.buffer], { type: file.contentType }), file.filename);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createError(payload.error?.message || "Cloudinary upload failed.", response.status);
  }

  return {
    url: payload.secure_url,
    publicId: payload.public_id,
    width: payload.width,
    height: payload.height,
    format: payload.format,
    bytes: payload.bytes
  };
}

async function uploadImageFromRequest(request) {
  return uploadImageToCloudinary(await readMultipartImage(request));
}

module.exports = {
  uploadImageFromRequest
};
