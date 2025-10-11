"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const log = (message) => console.warn(`\u2705 ${message}`);
  const info = (message) => console.info(`\u2705 ${message}`);

  // Ensure the projects grid exists so dynamic rendering logic has a target.
  let projectsGrid = document.querySelector("#projectsGrid");
  if (!projectsGrid) {
    const fallbackGrid = document.createElement("div");
    fallbackGrid.id = "projectsGrid";
    fallbackGrid.className = "projects-grid";
    fallbackGrid.innerHTML = `
      <div class="project-card">
        <h3>مشروع جديد</h3>
        <p>سيتم تحميل المشاريع المسجلة وعرضها هنا تلقائياً.</p>
      </div>
    `;
    document.body.appendChild(fallbackGrid);
    projectsGrid = fallbackGrid;
    log("تم إنشاء حاوية بديلة لعرض بطاقات المشاريع");
  }

  // Ensure wrapper container for legacy scripts if needed.
  let projectsContainer = document.querySelector("#projects-container");
  if (!projectsContainer) {
    projectsContainer = document.createElement("div");
    projectsContainer.id = "projects-container";

    if (projectsGrid?.parentElement) {
      projectsContainer.style.display = "contents";
      projectsGrid.parentElement.insertBefore(projectsContainer, projectsGrid);
      projectsContainer.appendChild(projectsGrid);
    } else {
      projectsContainer.className = "projects-grid-wrapper";
      projectsContainer.appendChild(projectsGrid);
      document.body.appendChild(projectsContainer);
    }

    log("تم إنشاء غلاف لحاوية بطاقات المشاريع");
  }

  const tabsConfig = [
    { id: "project-information", label: "معلومات المشروع" },
    { id: "project-phases", label: "مراحل المشروع" },
    { id: "expenses-and-contracts", label: "مصاريف المشروع" },
    { id: "project-payments", label: "دفعات المشروع" },
    { id: "daily-reports", label: "التقارير اليومية" },
    { id: "financial-analysis", label: "التحليل المالي" }
  ];

  let tabsContainer = document.querySelector(".project-tabs-grid");
  if (!tabsContainer) {
    tabsContainer = document.createElement("div");
    tabsContainer.className = "project-tabs-grid";
    tabsContainer.setAttribute("role", "tablist");
    tabsContainer.innerHTML = tabsConfig.map((tab, index) => `
      <button class="tab-button${index === 0 ? " active" : ""}" data-tab="${tab.id}">
        ${tab.label}
      </button>
    `).join("");
    document.body.prepend(tabsContainer);
    log("تمت إعادة إنشاء تبويبات المشروع");
  }

  const tabSections = {};
  tabsConfig.forEach((tab, index) => {
    let section = document.querySelector(`#${tab.id}`);
    if (!section) {
      section = document.createElement("div");
      section.id = tab.id;
      section.className = "tab-content" + (index === 0 ? "" : " hidden");
      section.innerHTML = `
        <h2>${tab.label}</h2>
        <p>محتوى ${tab.label} سيظهر هنا.</p>
      `;
      document.body.appendChild(section);
    }
    tabSections[tab.id] = section;
  });

  tabsContainer.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");

      tabsContainer.querySelectorAll(".tab-button").forEach((button) => button.classList.remove("active"));
      btn.classList.add("active");

      Object.values(tabSections).forEach((section) => section.classList.add("hidden"));
      tabSections[tabId]?.classList.remove("hidden");
    });
  });

  if (!document.getElementById("project-ui-recovery-styles")) {
    const style = document.createElement("style");
    style.id = "project-ui-recovery-styles";
    style.textContent = `
      .project-tabs-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        background: #f8f9fa;
        padding: 10px;
        border-bottom: 1px solid #ddd;
      }
      .tab-button {
        padding: 8px 16px;
        border: none;
        background: #e9ecef;
        cursor: pointer;
        border-radius: 6px;
        font-weight: bold;
      }
      .tab-button.active {
        background: #007bff;
        color: #fff;
      }
      .tab-content {
        display: none;
        padding: 15px;
        background: #fff;
      }
      .tab-content:not(.hidden) {
        display: block;
      }
      .projects-grid-wrapper {
        margin: 20px;
      }
      .projects-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 12px;
      }
      .project-card {
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        padding: 10px;
      }
    `;
    document.head.appendChild(style);
  }

  info("تم التحقق من سلامة واجهة مركز إدارة المشاريع");
});
