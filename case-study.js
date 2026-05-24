const header = document.querySelector("[data-header]");
const menu = document.querySelector("[data-menu]");
const menuToggle = document.querySelector("[data-menu-toggle]");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value || "";
}

function renderBrand(content) {
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

function splitFact(fact) {
  const index = fact.indexOf(":");
  if (index === -1) {
    return ["Fact", fact];
  }
  return [fact.slice(0, index).trim(), fact.slice(index + 1).trim()];
}

function renderProject(content, project) {
  document.title = `${project.title} | ${content.brand.name}`;
  const metaDescription = document.querySelector("meta[name='description']");
  if (metaDescription) {
    metaDescription.setAttribute("content", project.caseSummary || project.summary || content.seo.description);
  }

  renderBrand(content);

  const hero = document.querySelector("[data-case-hero-media]");
  if (hero) {
    hero.style.backgroundImage = `url("${project.heroImage || project.image}")`;
  }

  setText("[data-case-label]", project.label);
  setText("[data-case-title]", project.title);
  setText("[data-case-summary]", project.caseSummary || project.summary);
  setText("[data-case-brief]", project.brief);
  setText("[data-case-execution]", project.execution);

  const meta = document.querySelector("[data-case-meta]");
  if (meta) {
    meta.innerHTML = [
      ["Scope", project.scope],
      ["Timeline", project.timeline],
      ["Role", project.role],
      ["Sector", project.sector]
    ].map(([label, value]) => `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value)}</dd>
      </div>
    `).join("");
  }

  const facts = document.querySelector("[data-case-facts]");
  if (facts) {
    facts.innerHTML = (project.facts || []).map((fact) => {
      const [label, value] = splitFact(fact);
      return `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(value)}</dd>
        </div>
      `;
    }).join("");
  }

  const outcomes = document.querySelector("[data-case-outcomes]");
  if (outcomes) {
    outcomes.innerHTML = (project.outcomes || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  const details = document.querySelector("[data-case-details]");
  if (details) {
    details.innerHTML = (project.details || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  const gallery = document.querySelector("[data-case-gallery]");
  if (gallery) {
    gallery.innerHTML = (project.gallery || []).map((image, index) => `
      <img src="${escapeHtml(image)}" alt="${escapeHtml(project.title)} gallery image ${index + 1}">
    `).join("");
  }
}

async function loadCaseStudy() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("id");

  try {
    const response = await fetch("/api/content", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Content API unavailable.");

    const content = await response.json();
    const project = content.projects.find((item) => item.slug === slug) || content.projects[0];

    if (!project) {
      throw new Error("No projects are available.");
    }

    renderProject(content, project);
  } catch {
    const main = document.querySelector("[data-case-main]");
    if (main) {
      main.innerHTML = `
        <section class="section">
          <div class="section-inner">
            <h1>Case study unavailable</h1>
            <p>This dynamic case study needs the backend server running. Start it with node local-server.cjs.</p>
            <p><a href="index.html#projects">Return to projects</a></p>
          </div>
        </section>
      `;
    }
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

loadCaseStudy();
