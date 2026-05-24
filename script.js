const header = document.querySelector("[data-header]");
const menu = document.querySelector("[data-menu]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const leadForm = document.querySelector("[data-lead-form]");
const formStatus = document.querySelector("[data-form-status]");

let siteContent = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node && value !== undefined) {
    node.textContent = value;
  }
}

function setHeaderState() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 18);
}

function closeMenu() {
  if (!menu || !menuToggle || !header) return;
  menu.classList.remove("is-open");
  header.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

function toggleMenu() {
  if (!menu || !menuToggle || !header) return;
  const isOpen = menu.classList.toggle("is-open");
  header.classList.toggle("is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
}

function updateProjectFilter(filter) {
  document.querySelectorAll("[data-category]").forEach((card) => {
    const shouldShow = filter === "all" || card.dataset.category === filter;
    card.hidden = !shouldShow;
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === filter);
  });
}

function bindProjectFilters() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => updateProjectFilter(button.dataset.filter));
  });
}

function renderBrand(content) {
  document.title = content.seo?.title || content.brand.name;
  document.querySelectorAll(".brand-mark").forEach((brand) => {
    const symbol = brand.querySelector(".brand-symbol");
    const label = brand.querySelector("span:last-child");
    if (symbol) symbol.textContent = content.brand.initials;
    if (label) label.textContent = content.brand.name;
  });
  document.querySelectorAll(".footer-grid p").forEach((node) => {
    node.textContent = content.brand.tagline;
  });
}

function renderHero(content) {
  setText(".hero .eyebrow", content.hero.eyebrow);
  setText("#hero-title", content.hero.title);
  setText(".hero-copy", content.hero.copy);
  setText(".hero-actions .button-primary", content.hero.primaryCta);
  setText(".hero-actions .button-secondary", content.hero.secondaryCta);

  const media = document.querySelector(".hero-media");
  if (media && content.hero.image) {
    media.style.backgroundImage = `url("${content.hero.image}")`;
  }

  const metrics = document.querySelector(".hero-metrics");
  if (metrics) {
    metrics.innerHTML = (content.hero.metrics || []).map((metric) => `
      <div>
        <strong>${escapeHtml(metric.value)}</strong>
        <span>${escapeHtml(metric.label)}</span>
      </div>
    `).join("");
  }
}

function renderVision(content) {
  setText(".vision-grid .section-kicker", content.vision.kicker);
  setText("#vision-title", content.vision.title);
  const body = document.querySelector(".vision-grid > div:nth-child(2) p");
  const panel = document.querySelector(".vision-panel p");
  if (body) body.textContent = content.vision.body;
  if (panel) panel.textContent = content.vision.panel;
}

function renderServices(content) {
  setText(".services-section .eyebrow", content.servicesIntro.eyebrow);
  setText("#services-title", content.servicesIntro.title);
  const intro = document.querySelector(".services-section .section-heading > p");
  if (intro) intro.textContent = content.servicesIntro.copy;

  const grid = document.querySelector(".service-grid");
  if (!grid) return;

  grid.innerHTML = content.services.map((service, index) => `
    <article class="service-card">
      <span class="service-index">${String(index + 1).padStart(2, "0")}</span>
      <h3>${escapeHtml(service.title)}</h3>
      <p>${escapeHtml(service.copy)}</p>
      <a href="#contact">${escapeHtml(service.cta)}</a>
    </article>
  `).join("");
}

function renderProjects(content) {
  setText(".projects-section .eyebrow", content.projectsIntro.eyebrow);
  setText("#projects-title", content.projectsIntro.title);

  const grid = document.querySelector("[data-project-grid]");
  if (!grid) return;

  grid.innerHTML = content.projects.map((project) => `
    <a class="project-card" href="case-study.html?id=${encodeURIComponent(project.slug)}" data-category="${escapeHtml(project.category)}">
      <img src="${escapeHtml(project.image)}" alt="${escapeHtml(project.alt || project.title)}">
      <div>
        <p>${escapeHtml(project.label)}</p>
        <h3>${escapeHtml(project.title)}</h3>
        <span>${escapeHtml(project.summary)}</span>
        <span class="project-link">View case study</span>
      </div>
    </a>
  `).join("");

  updateProjectFilter("all");
}

function renderProcess(content) {
  const list = document.querySelector(".process-list");
  if (!list || !Array.isArray(content.process)) return;

  list.innerHTML = content.process.map((step, index) => `
    <div>
      <span>${String(index + 1).padStart(2, "0")}</span>
      <h3>${escapeHtml(step.title)}</h3>
      <p>${escapeHtml(step.copy)}</p>
    </div>
  `).join("");
}

function renderTestimonials(content) {
  setText(".testimonials-section .eyebrow", content.testimonialsIntro.eyebrow);
  setText("#testimonials-title", content.testimonialsIntro.title);

  const stack = document.querySelector(".testimonial-stack");
  if (!stack) return;

  stack.innerHTML = content.testimonials.map((item) => `
    <figure class="quote-card${item.dark ? " quote-card-dark" : ""}">
      <blockquote>${escapeHtml(item.quote)}</blockquote>
      <figcaption>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.role)}</span>
      </figcaption>
    </figure>
  `).join("");
}

function renderContact(content) {
  setText(".contact-section .eyebrow", content.contact.eyebrow);
  setText("#contact-title", content.contact.title);
  const copy = document.querySelector(".contact-copy > p:not(.eyebrow)");
  if (copy) copy.textContent = content.contact.copy;

  const email = document.querySelector(".contact-details a[href^='mailto:']");
  const phone = document.querySelector(".contact-details a[href^='tel:']");
  if (email) {
    email.textContent = content.brand.email;
    email.href = `mailto:${content.brand.email}`;
  }
  if (phone) {
    phone.textContent = content.brand.phone;
    phone.href = `tel:${content.brand.phoneHref}`;
  }
}

function renderContent(content) {
  siteContent = content;
  renderBrand(content);
  renderHero(content);
  renderVision(content);
  renderServices(content);
  renderProjects(content);
  renderProcess(content);
  renderTestimonials(content);
  renderContact(content);
}

async function loadContent() {
  try {
    const response = await fetch("/api/content", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const content = await response.json();
    renderContent(content);
  } catch {
    // Static deployment fallback keeps the hard-coded HTML visible.
  }
}

function setFieldError(fieldName, message) {
  const errorNode = document.querySelector(`[data-error-for="${fieldName}"]`);
  if (errorNode) {
    errorNode.textContent = message;
  }
}

function validateLeadForm(formData) {
  const email = String(formData.get("email") || "").trim();
  const requiredFields = ["name", "email", "service", "budget"];
  let isValid = true;

  requiredFields.forEach((field) => {
    const value = String(formData.get(field) || "").trim();
    const message = value ? "" : "This field is required.";
    setFieldError(field, message);
    if (!value) isValid = false;
  });

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setFieldError("email", "Enter a valid email address.");
    isValid = false;
  }

  return isValid;
}

function buildConsultationEmail(formData) {
  const fields = [
    ["Name", formData.get("name")],
    ["Email", formData.get("email")],
    ["Phone", formData.get("phone")],
    ["Project type", formData.get("service")],
    ["Estimated budget", formData.get("budget")],
    ["Project notes", formData.get("message")]
  ];

  const body = fields
    .map(([label, value]) => `${label}: ${String(value || "").trim() || "Not provided"}`)
    .join("\n");
  const email = siteContent?.brand?.email || "hello@velouraspaces.com";

  return `mailto:${email}?subject=${encodeURIComponent("New consultation request")}&body=${encodeURIComponent(body)}`;
}

async function submitLead(formData) {
  const payload = Object.fromEntries(formData.entries());
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Lead API unavailable.");
  }
}

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

if (menuToggle) {
  menuToggle.addEventListener("click", toggleMenu);
}

if (menu) {
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

bindProjectFilters();
loadContent();

if (leadForm) {
  leadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(leadForm);

    if (!validateLeadForm(formData)) {
      if (formStatus) {
        formStatus.textContent = "Please complete the highlighted fields.";
      }
      return;
    }

    try {
      await submitLead(formData);
      if (formStatus) {
        formStatus.textContent = "Your consultation request has been received.";
      }
      leadForm.reset();
    } catch {
      if (formStatus) {
        formStatus.textContent = "Opening your email client with the consultation request.";
      }
      window.location.href = buildConsultationEmail(formData);
      leadForm.reset();
    }
  });
}
