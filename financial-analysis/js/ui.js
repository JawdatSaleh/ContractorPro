import { availableLanguages, getDictionary } from "./i18n.js";

export function renderKpiCards({ container, kpis, currency, lang }) {
  if (!container) return;
  container.innerHTML = "";
  const dictionary = getDictionary(lang);
  const labels = {
    bac: dictionary?.tooltips?.budget,
    ac: dictionary?.tooltips?.ac,
    pv: dictionary?.tooltips?.pv,
    ev: dictionary?.tooltips?.ev,
    cv: dictionary?.tooltips?.cv,
    sv: dictionary?.tooltips?.sv,
    cpi: dictionary?.tooltips?.cpi,
    spi: dictionary?.tooltips?.spi,
    eac: dictionary?.tooltips?.eac,
    etc: dictionary?.tooltips?.etc,
    vac: dictionary?.tooltips?.vac,
    burnRate: dictionary?.tooltips?.burnRate,
    netCashFlow: dictionary?.tooltips?.netCashFlow,
  };

  Object.entries(kpis).forEach(([key, value]) => {
    const template = document.getElementById("kpiCardTemplate");
    if (!template) return;
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".kpi-card");
    const labelEl = node.querySelector(".kpi-label");
    const valueEl = node.querySelector(".kpi-value");
    const deltaEl = node.querySelector(".kpi-delta");
    labelEl.textContent = labels[key] || key.toUpperCase();
    const formatted = formatValue(key, value, currency, lang);
    valueEl.textContent = formatted.value;
    if (formatted.delta) {
      deltaEl.textContent = formatted.delta;
    } else {
      deltaEl.remove();
    }

    const infoBtn = node.querySelector(".info");
    infoBtn.title = labels[key] || key;
    infoBtn.addEventListener("click", () => {
      showToast(`${labels[key] || key}: ${formatted.value}`);
    });

    container.appendChild(node);
  });
}

function formatValue(key, rawValue, currency, lang) {
  const numberFormatter = new Intl.NumberFormat(lang === "ar" ? "ar-SA" : undefined, {
    style: ["cpi", "spi", "burnRate"].includes(key) ? "decimal" : "currency",
    currency: currency || "USD",
    maximumFractionDigits: ["cpi", "spi"].includes(key) ? 2 : 0,
  });

  if (["cpi", "spi"].includes(key)) {
    return { value: numberFormatter.format(rawValue || 0) };
  }

  if (key === "burnRate") {
    return { value: numberFormatter.format(rawValue || 0), delta: "per period" };
  }

  return { value: numberFormatter.format(rawValue || 0) };
}

export function showToast(message, duration = 3200) {
  const container = getToastContainer();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("is-leaving");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    toast.remove();
  }, duration);
}

function getToastContainer() {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

export function bindModal(modalId = "drilldownModal") {
  const modal = document.getElementById(modalId);
  if (!modal) return () => {};
  const closeBtn = modal.querySelector(".modal-close");
  const close = () => {
    modal.setAttribute("aria-hidden", "true");
    modal.querySelector("#drilldownContent").innerHTML = "";
  };
  closeBtn?.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      close();
    }
  });
  return ({ title, content }) => {
    modal.querySelector("[data-i18n='modal.title']").textContent = title;
    modal.querySelector("#drilldownContent").innerHTML = content;
    modal.setAttribute("aria-hidden", "false");
  };
}

export function buildList(items, dictionary) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p>${dictionary?.tables?.empty ?? "No data"}</p>`;
  }
  const rows = items
    .map((item) => `<li><strong>${item.label || item.reference || item.phase}</strong> – ${item.value ?? item.amount}</li>`)
    .join("");
  return `<ul>${rows}</ul>`;
}

export function setupLanguageButtons({ currentLang, onChange }) {
  document.querySelectorAll(".lang-btn").forEach((button) => {
    if (button.dataset.lang === currentLang) {
      button.classList.add("is-active");
    }
    button.addEventListener("click", () => {
      document.querySelectorAll(".lang-btn").forEach((btn) => btn.classList.remove("is-active"));
      button.classList.add("is-active");
      onChange(button.dataset.lang);
    });
  });
}

export { availableLanguages };
