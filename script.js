const header = document.querySelector("[data-header]");
const menu = document.querySelector("[data-menu]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const filterButtons = document.querySelectorAll("[data-filter]");
const projectCards = document.querySelectorAll("[data-category]");
const leadForm = document.querySelector("[data-lead-form]");
const formStatus = document.querySelector("[data-form-status]");

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
  projectCards.forEach((card) => {
    const shouldShow = filter === "all" || card.dataset.category === filter;
    card.hidden = !shouldShow;
  });

  filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === filter);
  });
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

  return `mailto:hello@velouraspaces.com?subject=${encodeURIComponent("New consultation request")}&body=${encodeURIComponent(body)}`;
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

filterButtons.forEach((button) => {
  button.addEventListener("click", () => updateProjectFilter(button.dataset.filter));
});

if (leadForm) {
  leadForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(leadForm);

    if (!validateLeadForm(formData)) {
      if (formStatus) {
        formStatus.textContent = "Please complete the highlighted fields.";
      }
      return;
    }

    if (formStatus) {
      formStatus.textContent = "Opening your email client with the consultation request.";
    }

    window.location.href = buildConsultationEmail(formData);
    leadForm.reset();
  });
}
