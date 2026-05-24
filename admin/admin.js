let content = null;
let adminToken = localStorage.getItem("velouraAdminToken") || "";

const loginPanel = document.querySelector("[data-login-panel]");
const workspace = document.querySelector("[data-workspace]");
const statusNode = document.querySelector("[data-status]");
const loginStatus = document.querySelector("[data-login-status]");
const tokenInput = document.querySelector("[data-admin-token]");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `project-${Date.now()}`;
}

function getPath(path) {
  return path.split(".").reduce((current, key) => current?.[key], content);
}

function setPath(path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  const target = parts.reduce((current, key) => current[key], content);
  target[last] = value;
}

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle("is-error", isError);
}

function field(path, label, options = {}) {
  const value = getPath(path);
  const type = options.type || "text";
  const wide = options.wide ? " field-wide" : "";
  const array = options.array ? " data-array=\"true\"" : "";

  if (type === "textarea") {
    const textareaValue = options.array ? (Array.isArray(value) ? value.join("\n") : "") : value;
    return `
      <label class="${wide.trim()}">
        ${escapeHtml(label)}
        <textarea data-path="${path}"${array}>${escapeHtml(textareaValue)}</textarea>
      </label>
    `;
  }

  if (type === "select") {
    const optionsHtml = (options.choices || [])
      .map((choice) => `<option value="${escapeHtml(choice)}"${choice === value ? " selected" : ""}>${escapeHtml(choice)}</option>`)
      .join("");
    return `
      <label class="${wide.trim()}">
        ${escapeHtml(label)}
        <select data-path="${path}">${optionsHtml}</select>
      </label>
    `;
  }

  if (type === "checkbox") {
    return `
      <label class="${wide.trim()}">
        ${escapeHtml(label)}
        <input type="checkbox" data-path="${path}"${value ? " checked" : ""}>
      </label>
    `;
  }

  return `
    <label class="${wide.trim()}">
      ${escapeHtml(label)}
      <input type="${type}" value="${escapeHtml(value)}" data-path="${path}">
    </label>
  `;
}

function renderSiteFields() {
  const target = document.querySelector("[data-site-fields]");
  target.innerHTML = `
    ${field("brand.name", "Brand name")}
    ${field("brand.initials", "Brand initials")}
    ${field("brand.email", "Email")}
    ${field("brand.phone", "Phone display")}
    ${field("brand.phoneHref", "Phone href value")}
    ${field("brand.tagline", "Footer tagline", { type: "textarea", wide: true })}
    ${field("seo.title", "SEO title", { wide: true })}
    ${field("seo.description", "SEO description", { type: "textarea", wide: true })}
    ${field("seo.ogImage", "Social preview image URL", { wide: true })}
    ${field("hero.eyebrow", "Hero eyebrow")}
    ${field("hero.title", "Hero title")}
    ${field("hero.copy", "Hero copy", { type: "textarea", wide: true })}
    ${field("hero.primaryCta", "Primary CTA")}
    ${field("hero.secondaryCta", "Secondary CTA")}
    ${field("hero.image", "Hero image URL", { wide: true })}
    ${field("hero.metrics.0.value", "Metric 1 value")}
    ${field("hero.metrics.0.label", "Metric 1 label")}
    ${field("hero.metrics.1.value", "Metric 2 value")}
    ${field("hero.metrics.1.label", "Metric 2 label")}
    ${field("hero.metrics.2.value", "Metric 3 value")}
    ${field("hero.metrics.2.label", "Metric 3 label")}
    ${field("vision.kicker", "Vision kicker")}
    ${field("vision.title", "Vision title", { wide: true })}
    ${field("vision.body", "Vision body", { type: "textarea", wide: true })}
    ${field("vision.panel", "Vision side panel", { type: "textarea", wide: true })}
    ${field("servicesIntro.eyebrow", "Services eyebrow")}
    ${field("servicesIntro.title", "Services title")}
    ${field("servicesIntro.copy", "Services intro copy", { type: "textarea", wide: true })}
    ${field("projectsIntro.eyebrow", "Projects eyebrow")}
    ${field("projectsIntro.title", "Projects title")}
    ${field("testimonialsIntro.eyebrow", "Testimonials eyebrow")}
    ${field("testimonialsIntro.title", "Testimonials title")}
    ${field("contact.eyebrow", "Contact eyebrow")}
    ${field("contact.title", "Contact title")}
    ${field("contact.copy", "Contact copy", { type: "textarea", wide: true })}
  `;
}

function renderServices() {
  const target = document.querySelector("[data-services-list]");
  target.innerHTML = content.services.map((service, index) => `
    <article class="item-card">
      <div class="item-header">
        <h3>${escapeHtml(service.title || `Service ${index + 1}`)}</h3>
        <div class="item-actions">
          <button type="button" class="secondary" data-action="move-service-up" data-index="${index}">Up</button>
          <button type="button" class="secondary" data-action="move-service-down" data-index="${index}">Down</button>
          <button type="button" class="danger" data-action="remove-service" data-index="${index}">Remove</button>
        </div>
      </div>
      <div class="inline-grid">
        ${field(`services.${index}.title`, "Title")}
        ${field(`services.${index}.cta`, "CTA")}
      </div>
      ${field(`services.${index}.copy`, "Copy", { type: "textarea", wide: true })}
    </article>
  `).join("");
}

function renderProjects() {
  const target = document.querySelector("[data-projects-list]");
  target.innerHTML = content.projects.map((project, index) => `
    <article class="item-card">
      <div class="item-header">
        <h3>${escapeHtml(project.title || `Project ${index + 1}`)}</h3>
        <div class="item-actions">
          <button type="button" class="secondary" data-action="move-project-up" data-index="${index}">Up</button>
          <button type="button" class="secondary" data-action="move-project-down" data-index="${index}">Down</button>
          <button type="button" class="danger" data-action="remove-project" data-index="${index}">Remove</button>
        </div>
      </div>
      <div class="inline-grid">
        ${field(`projects.${index}.title`, "Title")}
        ${field(`projects.${index}.slug`, "Slug")}
        ${field(`projects.${index}.category`, "Category", {
          type: "select",
          choices: ["residential", "interior", "commercial"]
        })}
        ${field(`projects.${index}.label`, "Card label")}
        ${field(`projects.${index}.scope`, "Scope")}
        ${field(`projects.${index}.timeline`, "Timeline")}
        ${field(`projects.${index}.role`, "Role")}
        ${field(`projects.${index}.sector`, "Sector")}
      </div>
      ${field(`projects.${index}.summary`, "Card summary", { type: "textarea", wide: true })}
      ${field(`projects.${index}.caseSummary`, "Case study summary", { type: "textarea", wide: true })}
      ${field(`projects.${index}.image`, "Card image URL", { wide: true })}
      ${field(`projects.${index}.heroImage`, "Case hero image URL", { wide: true })}
      ${field(`projects.${index}.alt`, "Image alt text", { wide: true })}
      ${field(`projects.${index}.brief`, "Brief", { type: "textarea", wide: true })}
      ${field(`projects.${index}.execution`, "Execution", { type: "textarea", wide: true })}
      ${field(`projects.${index}.facts`, "Facts, one per line", { type: "textarea", wide: true, array: true })}
      ${field(`projects.${index}.details`, "Selected details, one per line", { type: "textarea", wide: true, array: true })}
      ${field(`projects.${index}.outcomes`, "Outcomes, one per line", { type: "textarea", wide: true, array: true })}
      ${field(`projects.${index}.gallery`, "Gallery image URLs, one per line", { type: "textarea", wide: true, array: true })}
    </article>
  `).join("");
}

function renderTestimonials() {
  const target = document.querySelector("[data-testimonials-list]");
  target.innerHTML = content.testimonials.map((testimonial, index) => `
    <article class="item-card">
      <div class="item-header">
        <h3>${escapeHtml(testimonial.name || `Testimonial ${index + 1}`)}</h3>
        <div class="item-actions">
          <button type="button" class="secondary" data-action="move-testimonial-up" data-index="${index}">Up</button>
          <button type="button" class="secondary" data-action="move-testimonial-down" data-index="${index}">Down</button>
          <button type="button" class="danger" data-action="remove-testimonial" data-index="${index}">Remove</button>
        </div>
      </div>
      <div class="inline-grid">
        ${field(`testimonials.${index}.name`, "Name")}
        ${field(`testimonials.${index}.role`, "Role")}
      </div>
      ${field(`testimonials.${index}.quote`, "Quote", { type: "textarea", wide: true })}
      ${field(`testimonials.${index}.dark`, "Use dark card", { type: "checkbox" })}
    </article>
  `).join("");
}

function renderAll() {
  renderSiteFields();
  renderServices();
  renderProjects();
  renderTestimonials();
}

function swapItem(list, index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= list.length) return;
  [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
}

async function loadContent() {
  const response = await fetch("/api/content");
  if (!response.ok) throw new Error("Unable to load content.");
  content = await response.json();
  renderAll();
}

async function saveContent() {
  setStatus("Saving changes...");
  const response = await fetch("/api/content", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": adminToken
    },
    body: JSON.stringify(content)
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    setStatus(payload.error || "Unable to save changes.", true);
    return;
  }

  content = payload.content;
  setStatus("Saved. Refresh the public site to see the latest content.");
}

async function loadLeads() {
  const target = document.querySelector("[data-leads-list]");
  target.innerHTML = "<p>Loading leads...</p>";

  const response = await fetch("/api/leads", {
    headers: { "x-admin-token": adminToken }
  });

  if (!response.ok) {
    target.innerHTML = "<p>Unable to load leads. Check the admin password.</p>";
    return;
  }

  const leads = await response.json();
  target.innerHTML = leads.length ? leads.map((lead) => `
    <article class="lead-card">
      <time>${escapeHtml(new Date(lead.createdAt).toLocaleString())}</time>
      <h3>${escapeHtml(lead.name)}</h3>
      <p><strong>Email:</strong> ${escapeHtml(lead.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(lead.phone || "Not provided")}</p>
      <p><strong>Project:</strong> ${escapeHtml(lead.service)} | ${escapeHtml(lead.budget)}</p>
      <p>${escapeHtml(lead.message || "No project notes provided.")}</p>
    </article>
  `).join("") : "<p>No leads captured yet.</p>";
}

function unlock() {
  adminToken = tokenInput.value.trim();
  localStorage.setItem("velouraAdminToken", adminToken);
  loginPanel.hidden = true;
  workspace.hidden = false;
  setStatus("Admin unlocked.");
  loadContent().catch((error) => setStatus(error.message, true));
}

document.addEventListener("input", (event) => {
  const target = event.target;
  const path = target.dataset.path;
  if (!path || !content) return;

  if (target.type === "checkbox") {
    setPath(path, target.checked);
    return;
  }

  if (target.dataset.array === "true") {
    const lines = target.value.split("\n").map((item) => item.trim()).filter(Boolean);
    setPath(path, lines);
    return;
  }

  setPath(path, target.value);
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.matches("[data-unlock]")) {
    unlock();
    return;
  }

  if (button.matches("[data-save]")) {
    saveContent();
    return;
  }

  if (button.matches("[data-refresh-leads]")) {
    loadLeads();
    return;
  }

  if (button.dataset.tab) {
    document.querySelectorAll("[data-tab]").forEach((tab) => {
      tab.classList.toggle("is-active", tab === button);
    });
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === button.dataset.tab);
    });
    if (button.dataset.tab === "leads") loadLeads();
    return;
  }

  if (!content) return;

  if (button.matches("[data-add-service]")) {
    content.services.push({ title: "New Service", copy: "Describe this service.", cta: "Start here" });
    renderServices();
    return;
  }

  if (button.matches("[data-add-project]")) {
    content.projects.push({
      slug: slugify("New Project"),
      category: "residential",
      label: "Project category",
      title: "New Project",
      summary: "Short homepage summary.",
      image: "",
      heroImage: "",
      alt: "",
      scope: "",
      timeline: "",
      role: "",
      sector: "",
      caseSummary: "",
      facts: [],
      brief: "",
      execution: "",
      details: [],
      outcomes: [],
      gallery: []
    });
    renderProjects();
    return;
  }

  if (button.matches("[data-add-testimonial]")) {
    content.testimonials.push({ quote: "Client quote.", name: "Client Name", role: "Client role", dark: false });
    renderTestimonials();
    return;
  }

  const index = Number(button.dataset.index);
  const action = button.dataset.action;

  if (action === "remove-service") content.services.splice(index, 1);
  if (action === "move-service-up") swapItem(content.services, index, -1);
  if (action === "move-service-down") swapItem(content.services, index, 1);
  if (action?.includes("service")) renderServices();

  if (action === "remove-project") content.projects.splice(index, 1);
  if (action === "move-project-up") swapItem(content.projects, index, -1);
  if (action === "move-project-down") swapItem(content.projects, index, 1);
  if (action?.includes("project")) renderProjects();

  if (action === "remove-testimonial") content.testimonials.splice(index, 1);
  if (action === "move-testimonial-up") swapItem(content.testimonials, index, -1);
  if (action === "move-testimonial-down") swapItem(content.testimonials, index, 1);
  if (action?.includes("testimonial")) renderTestimonials();
});

if (adminToken) {
  tokenInput.value = adminToken;
}
