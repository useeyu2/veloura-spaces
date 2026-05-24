const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const contentPath = path.join(root, "data", "content.json");
const leadsPath = path.join(root, "data", "leads.json");

let mongoClientPromise = null;

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile(filePath, payload) {
  const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  await fsp.writeFile(tempPath, json, "utf8");
  await fsp.rename(tempPath, filePath);
}

async function getInitialContent() {
  return readJsonFile(contentPath, {});
}

function validateContent(content) {
  if (!content || typeof content !== "object") return "Content must be an object.";
  if (!content.brand || typeof content.brand.name !== "string") return "Brand name is required.";
  if (!Array.isArray(content.services)) return "Services must be an array.";
  if (!Array.isArray(content.projects)) return "Projects must be an array.";
  if (!Array.isArray(content.testimonials)) return "Testimonials must be an array.";

  const slugs = new Set();
  for (const project of content.projects) {
    if (!project.slug || typeof project.slug !== "string") return "Every project needs a slug.";
    if (slugs.has(project.slug)) return `Duplicate project slug: ${project.slug}`;
    slugs.add(project.slug);
  }

  return null;
}

async function getMongoDb() {
  if (!process.env.MONGODB_URI) {
    return null;
  }

  if (!mongoClientPromise) {
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(process.env.MONGODB_URI);
    mongoClientPromise = client.connect();
  }

  const client = await mongoClientPromise;
  return client.db(process.env.MONGODB_DB || "veloura_spaces");
}

async function getContent() {
  const db = await getMongoDb();

  if (!db) {
    return getInitialContent();
  }

  const document = await db.collection("content").findOne({ _id: "site" });

  if (document?.content) {
    return document.content;
  }

  const initialContent = await getInitialContent();
  await db.collection("content").updateOne(
    { _id: "site" },
    { $set: { content: initialContent, updatedAt: new Date() } },
    { upsert: true }
  );
  return initialContent;
}

async function saveContent(content) {
  const validationError = validateContent(content);
  if (validationError) {
    const error = new Error(validationError);
    error.statusCode = 400;
    throw error;
  }

  const db = await getMongoDb();

  if (!db) {
    await writeJsonFile(contentPath, content);
    return content;
  }

  await db.collection("content").updateOne(
    { _id: "site" },
    { $set: { content, updatedAt: new Date() } },
    { upsert: true }
  );
  return content;
}

function normalizeLead(lead) {
  if (!lead.name || !lead.email || !lead.service || !lead.budget) {
    const error = new Error("Name, email, service, and budget are required.");
    error.statusCode = 400;
    throw error;
  }

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: String(lead.name || "").trim(),
    email: String(lead.email || "").trim(),
    phone: String(lead.phone || "").trim(),
    service: String(lead.service || "").trim(),
    budget: String(lead.budget || "").trim(),
    message: String(lead.message || "").trim()
  };
}

async function createLead(lead) {
  const normalizedLead = normalizeLead(lead);
  const db = await getMongoDb();

  if (!db) {
    const leads = await readJsonFile(leadsPath, []);
    leads.unshift(normalizedLead);
    await writeJsonFile(leadsPath, leads);
    return normalizedLead;
  }

  await db.collection("leads").insertOne(normalizedLead);
  return normalizedLead;
}

async function getLeads() {
  const db = await getMongoDb();

  if (!db) {
    return readJsonFile(leadsPath, []);
  }

  return db.collection("leads")
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(250)
    .toArray();
}

module.exports = {
  createLead,
  getContent,
  getLeads,
  saveContent,
  validateContent
};
