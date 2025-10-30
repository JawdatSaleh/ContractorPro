import { projectStore } from './project_store.js';
import { phasesStore } from './phases_store.js';
import { expensesStore } from './expenses_store.js';
import { categoriesStore } from './categories_store.js';
import { subcontractsStore } from './subcontracts_store.js';
import { paymentsStore } from './payments_store.js';
import { reportsStore } from './reports_store.js';
import {
  onDataEvent,
  parseQueryParams,
  formatCurrency,
  formatPercent,
  formatDate,
  createToast,
  consumeSessionFlag,
  lazyImageObserver,
  bindFormSubmit,
  safeNumber,
  buildBreadcrumb,
  percentage,
  calculateDuration,
  readFromStorage,
  writeToStorage,
  removeFromStorage,
  average,
} from './utils.js';

const page = document.body.dataset.page;

const phasesUIState = {
  projectId: null,
  phases: [],
  filters: { status: '', assignee: '', period: '' },
  sort: { key: 'startDate', direction: 'asc' },
  ganttScale: 1,
  logs: [],
  csvInput: null,
  editingPhaseId: null,
};

const unifiedFinancialState = {
  projectId: null,
  expenses: [],
  subcontracts: [],
  expenseFilters: { category: '', paymentMethod: '', dateFrom: '', dateTo: '' },
  expenseSearch: '',
  expenseSort: { key: 'date', direction: 'desc' },
  subcontractFilters: { contractor: '', status: '', startDate: '', endDate: '' },
  subcontractSort: { key: 'startDate', direction: 'desc' },
  timelineView: 'monthly',
  charts: { monthlyComparison: null, expenseVsContracts: null, timeline: null },
  editingExpenseId: null,
  editingSubcontractId: null,
};

const paymentsUIState = {
  projectId: null,
  projectValue: 0,
  payments: [],
  filters: { type: '', status: '', period: '' },
  sort: { key: 'dueDate', direction: 'asc' },
  timelineView: 'monthly',
  charts: {},
  editingPaymentId: null,
  csvInput: null,
};

const categoriesUIState = {
  categories: [],
  editingId: null,
};

function ensureProjectContext() {
  const { projectId } = parseQueryParams();
  if (!projectId) {
    window.location.href = '../projects_management_center.html';
    return null;
  }
  return projectId;
}

async function renderSummaryCards(projectsOverride = null) {
  let summary;
  if (Array.isArray(projectsOverride)) {
    const totalValue = projectsOverride.reduce(
      (total, project) =>
        total +
        safeNumber(
          project.revenue ?? project.contractValue ?? project.budget ?? project.totalValue ?? 0
        ),
      0
    );
    summary = {
      totalProjects: projectsOverride.length,
      activeCount: projectsOverride.filter((project) => project.status === 'active').length,
      completedCount: projectsOverride.filter((project) => project.status === 'completed').length,
      totalValue,
      totalValueFormatted: formatCurrency(totalValue || 0),
    };
  } else {
    summary = await projectStore.summarize();
  }

  const totalProjectsEl = document.querySelector('[data-total-projects]');
  const activeProjectsEl = document.querySelector('[data-active-projects]');
  const totalValueEl = document.querySelector('[data-total-value]');
  const completedProjectsEl = document.querySelector('[data-completed-projects]');

  if (totalProjectsEl) totalProjectsEl.textContent = summary.totalProjects ?? 0;
  if (activeProjectsEl) activeProjectsEl.textContent = summary.activeCount ?? 0;
  if (totalValueEl) totalValueEl.textContent = summary.totalValueFormatted || formatCurrency(summary.totalValue || 0);
  if (completedProjectsEl) completedProjectsEl.textContent = summary.completedCount ?? 0;
}

function projectStatusBadge(status) {
  switch (status) {
    case 'completed':
      return '<span class="status-pill status-pill--success">مكتمل</span>';
    case 'on-hold':
      return '<span class="status-pill status-pill--warning">متوقف</span>';
    case 'cancelled':
      return '<span class="status-pill status-pill--danger">ملغي</span>';
    default:
      return '<span class="status-pill status-pill--active">نشط</span>';
  }
}

function buildProjectCard(project) {
  const expenses = formatCurrency(project.totalExpenses || 0);
  const revenueValue = project.revenue || project.contractValue || project.budget?.contractValue || 0;
  const revenue = formatCurrency(revenueValue);
  const profitabilityValue = project.profitability || revenueValue - (project.totalExpenses || 0);
  const profitability = formatCurrency(profitabilityValue);
  const payments = formatCurrency(project.totalPayments || 0);
  const periodLabel = `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`;
  const locationLabel = normalizeLocationLabel(project);
  return `
    <article class="project-card project-card--modern" data-project-id="${project.id}">
      <div class="project-card__header">
        <div>
          ${projectStatusBadge(project.status)}
          <h3>${project.name}</h3>
          <p class="project-card__client"><i class="fas fa-user-tie"></i> ${project.clientName || '—'}</p>
        </div>
        <div class="project-card__progress-circle">
          <span>${formatPercent(project.progress || 0)}</span>
          <small>نسبة الإنجاز</small>
        </div>
      </div>
      <div class="project-card__body">
        <div class="project-card__meta">
          <span><i class="fas fa-map-marker-alt"></i>${locationLabel}</span>
          <span><i class="fas fa-calendar"></i>${periodLabel}</span>
        </div>
        <div class="project-card__grid">
          <div class="project-card__metric">
            <span>القيمة التعاقدية</span>
            <strong>${revenue}</strong>
          </div>
          <div class="project-card__metric">
            <span>المصاريف</span>
            <strong>${expenses}</strong>
          </div>
          <div class="project-card__metric">
            <span>المدفوعات</span>
            <strong>${payments}</strong>
          </div>
          <div class="project-card__metric">
            <span>الربحية</span>
            <strong>${profitability}</strong>
          </div>
        </div>
        <div class="project-card__footer">
          <div class="project-card__actions">
            <button class="project-card__chip" data-action="view-info"><i class="fas fa-circle-info"></i> نظرة عامة</button>
            <button class="project-card__chip" data-action="view-phases"><i class="fas fa-layer-group"></i> المراحل</button>
            <button class="project-card__chip" data-action="view-expenses"><i class="fas fa-wallet"></i> المصاريف</button>
            <button class="project-card__chip" data-action="view-payments"><i class="fas fa-money-check"></i> الدفعات</button>
            <button class="project-card__chip" data-action="view-reports"><i class="fas fa-file-lines"></i> التقارير</button>
          </div>
          <div class="project-card__menu">
            <button class="project-card__icon" data-action="toggle-menu"><i class="fas fa-ellipsis-h"></i></button>
            <div class="project-card__dropdown">
              <button data-action="edit"><i class="fas fa-pen"></i> تعديل</button>
              <button data-action="duplicate"><i class="fas fa-copy"></i> استنساخ</button>
              <button data-action="delete" class="danger"><i class="fas fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function normalizeLocationLabel(project) {
  if (!project) return '—';
  if (typeof project.location === 'string' && project.location) {
    return project.location;
  }
  const location = project.location || {};
  const parts = [location.cityLabel || location.city, location.district, location.address]
    .map((value) => (value || '').trim())
    .filter(Boolean);
  return parts.length ? parts.join(' - ') : '—';
}

function updateProjectsGridSummary(projects) {
  const container = document.getElementById('projectsGridSummary');
  if (!container) return;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const hideSummary = !projects.length;
  container.classList.toggle('hidden', hideSummary);

  if (!projects.length) {
    setText('projectsGridSummaryCount', '0');
    setText('projectsGridSummaryContract', formatCurrency(0));
    setText('projectsGridSummaryExpenses', formatCurrency(0));
    setText('projectsGridSummaryProfit', formatCurrency(0));
    setText('projectsGridSummaryProgress', formatPercent(0));
    setText('projectsGridSummaryActive', '0');
    setText('projectsGridSummaryCompleted', '0');
    return;
  }

  const totals = projects.reduce(
    (acc, project) => {
      const contractValue = safeNumber(
        project.contractValue ?? project.revenue ?? project.budget ?? project.totalValue ?? 0
      );
      const expensesValue = safeNumber(project.totalExpenses ?? project.expensesTotal ?? 0);
      const revenueValue = safeNumber(project.revenue ?? contractValue);
      const profitability =
        project.profitability != null
          ? safeNumber(project.profitability)
          : revenueValue - expensesValue;

      acc.contract += contractValue;
      acc.expenses += expensesValue;
      acc.profit += profitability;
      acc.progress += safeNumber(project.progress ?? 0);
      if (project.status === 'active') acc.active += 1;
      if (project.status === 'completed') acc.completed += 1;
      return acc;
    },
    { contract: 0, expenses: 0, profit: 0, progress: 0, active: 0, completed: 0 }
  );

  const averageProgress = projects.length ? totals.progress / projects.length : 0;

  setText('projectsGridSummaryCount', projects.length.toString());
  setText('projectsGridSummaryContract', formatCurrency(totals.contract));
  setText('projectsGridSummaryExpenses', formatCurrency(totals.expenses));
  setText('projectsGridSummaryProfit', formatCurrency(totals.profit));
  setText('projectsGridSummaryProgress', formatPercent(averageProgress));
  setText('projectsGridSummaryActive', totals.active.toString());
  setText('projectsGridSummaryCompleted', totals.completed.toString());
}

async function renderProjectsGrid() {
  const grid = document.querySelector('[data-projects-grid]');
  if (!grid) return;
  const emptyState = document.getElementById('projectsEmptyState');
  const countEl = document.getElementById('projectsCount');

  const projects = await projectStore.getAll();
  legacyProjectsCache = projects;
  legacyHydrateManagers(projects);

  const filtered = legacyApplyFilters(projects);
  if (countEl) countEl.textContent = filtered.length.toString();

  updateProjectsGridSummary(filtered);
  await renderSummaryCards(filtered);

  if (!filtered.length) {
    grid.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  grid.innerHTML = filtered.map((project) => buildProjectCard(project)).join('');
  const observer = lazyImageObserver();
  grid.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img));
}

function bindProjectsGridFilters() {
  if (!document.querySelector('[data-projects-grid]')) return;

  const filterHandlers = [
    ['statusFilter', 'status'],
    ['riskFilter', 'risk'],
    ['managerFilter', 'manager'],
    ['timelineFilter', 'timeline'],
  ];

  filterHandlers.forEach(([selector, key]) => {
    const element = legacySelectors[selector]?.();
    if (element && !element.dataset.gridBound) {
      element.dataset.gridBound = 'true';
      element.addEventListener('change', (event) => {
        legacyState.filters[key] = event.target.value;
        renderProjectsGrid();
      });
    }
  });

  const searchInput = legacySelectors.projectSearch?.();
  if (searchInput && !searchInput.dataset.gridBound) {
    searchInput.dataset.gridBound = 'true';
    searchInput.addEventListener('input', (event) => {
      legacyState.filters.search = event.target.value;
      renderProjectsGrid();
    });
  }

  const resetButton = legacySelectors.resetFiltersBtn?.();
  if (resetButton && !resetButton.dataset.gridBound) {
    resetButton.dataset.gridBound = 'true';
    resetButton.addEventListener('click', () => {
      legacyState.filters = { status: 'all', risk: 'all', manager: 'all', timeline: 'all', search: '' };
      filterHandlers.forEach(([selector]) => {
        const element = legacySelectors[selector]?.();
        if (element) element.value = 'all';
      });
      if (searchInput) searchInput.value = '';
      renderProjectsGrid();
    });
  }
}

function handleProjectAction(event) {
  const card = event.target.closest('.project-card');
  if (!card) return;
  const projectId = card.dataset.projectId;
  const button = event.target.closest('button');

  if (!button) {
    window.location.href = `pages/project_info.html?projectId=${projectId}`;
    return;
  }

  event.stopPropagation();
  const action = button.dataset.action;

  if (action === 'toggle-menu') {
    card.querySelector('.project-card__dropdown').classList.toggle('visible');
    return;
  }

  const routes = {
    'view-info': `pages/project_info.html?projectId=${projectId}`,
    'view-phases': `pages/project_phases.html?projectId=${projectId}`,
    'view-expenses': `pages/project_expenses.html?projectId=${projectId}`,
    'view-payments': `pages/project_payments.html?projectId=${projectId}`,
    'view-reports': `pages/project_reports.html?projectId=${projectId}`,
    edit: `project_creation_wizard.html?projectId=${projectId}`,
  };

  if (routes[action]) {
    window.location.href = routes[action];
    return;
  }

  if (action === 'delete') {
    if (confirm('هل أنت متأكد من حذف هذا المشروع؟')) {
      projectStore.delete(projectId).then(renderProjectsGrid);
    }
    return;
  }

  if (action === 'duplicate') {
    projectStore.getById(projectId).then((project) => {
      if (!project) return;
      const copy = { ...project, id: undefined, name: `${project.name} (نسخة)` };
      projectStore.create(copy).then(renderProjectsGrid);
    });
  }
}

function configureProjectNavigation(projectId, activeKey = 'overview') {
  const nav = document.querySelector('[data-project-nav]');
  if (!nav) return;
  const routes = {
    overview: `project_info.html?projectId=${projectId}`,
    phases: `project_phases.html?projectId=${projectId}`,
    expenses: `project_expenses.html?projectId=${projectId}`,
    payments: `project_payments.html?projectId=${projectId}`,
    reports: `project_reports.html?projectId=${projectId}`,
  };

  nav.querySelectorAll('[data-nav]').forEach((link) => {
    const key = link.dataset.nav;
    if (routes[key]) link.setAttribute('href', routes[key]);
    link.classList.toggle('is-active', key === activeKey);
  });
}

const legacyStatusMap = {
  active: { label: 'نشط', className: 'success' },
  planning: { label: 'قيد التخطيط', className: 'neutral' },
  'on-hold': { label: 'معلق', className: 'warning' },
  completed: { label: 'مكتمل', className: 'success' },
  cancelled: { label: 'ملغي', className: 'danger' },
};

const legacyRiskMap = {
  low: { label: 'مخاطر منخفضة', className: 'success' },
  medium: { label: 'مخاطر متوسطة', className: 'warning' },
  high: { label: 'مخاطر مرتفعة', className: 'danger' },
};

const legacyViewModes = {
  table: { label: 'عرض لوحة البيانات', icon: 'fa-table' },
  kanban: { label: 'عودة إلى عرض الجدول', icon: 'fa-border-all' },
};

const legacySelectors = {
  summaryCards: () => document.getElementById('summaryCards'),
  lastSyncLabel: () => document.getElementById('lastSyncLabel'),
  statusFilter: () => document.getElementById('statusFilter'),
  riskFilter: () => document.getElementById('riskFilter'),
  managerFilter: () => document.getElementById('managerFilter'),
  timelineFilter: () => document.getElementById('timelineFilter'),
  projectSearch: () => document.getElementById('projectSearch'),
  projectsTableBody: () => document.getElementById('projectsTableBody'),
  projectsCount: () => document.getElementById('projectsCount'),
  projectsEmptyState: () => document.getElementById('projectsEmptyState'),
  projectDetailPanel: () => document.getElementById('projectDetailPanel'),
  detailName: () => document.getElementById('detailName'),
  detailStatus: () => document.getElementById('detailStatus'),
  detailRisk: () => document.getElementById('detailRisk'),
  detailClient: () => document.getElementById('detailClient'),
  detailLocation: () => document.getElementById('detailLocation'),
  detailMetrics: () => document.getElementById('detailMetrics'),
  detailDeliverables: () => document.getElementById('detailDeliverables'),
  detailTimeline: () => document.getElementById('detailTimeline'),
  detailTeams: () => document.getElementById('detailTeams'),
  detailDocuments: () => document.getElementById('detailDocuments'),
  openInWizardBtn: () => document.getElementById('openInWizardBtn'),
  downloadProjectBtn: () => document.getElementById('downloadProjectBtn'),
  openOverviewBtn: () => document.getElementById('openOverviewBtn'),
  newProjectBtn: () => document.getElementById('newProjectBtn'),
  exportProjectsBtn: () => document.getElementById('exportProjectsBtn'),
  resetFiltersBtn: () => document.getElementById('resetFiltersBtn'),
  toggleViewBtn: () => document.getElementById('toggleViewBtn'),
  toggleViewLabel: () => document.getElementById('toggleViewLabel'),
  projectsDataSection: () => document.getElementById('projectsDataSection'),
  projectsPipelineSection: () => document.getElementById('projectsPipelineSection'),
  pipelineBoard: () => document.getElementById('pipelineBoard'),
  activeCountBadge: () => document.getElementById('activeCountBadge'),
  pipelineValueBadge: () => document.getElementById('pipelineValueBadge'),
};

const legacyState = {
  viewMode: 'table',
  selectedProjectId: null,
  filters: {
    status: 'all',
    risk: 'all',
    manager: 'all',
    timeline: 'all',
    search: '',
  },
};

let legacyProjectsCache = [];

function legacyFormatPercentage(value) {
  return `${Math.round(value)}%`;
}

function legacyRiskLevel(project) {
  if (project.riskLevel) return project.riskLevel;
  if (project.profitability < 0) return 'high';
  if (project.scheduleVariance <= -15) return 'high';
  if (project.progress < 35) return 'medium';
  return 'low';
}

function legacyHealthClass(project) {
  if (!project) return 'neutral';
  if (project.healthIndex >= 85 && project.scheduleVariance >= 0) return 'success';
  if (project.healthIndex <= 60 || project.scheduleVariance < -20) return 'danger';
  return 'warning';
}

function legacyComputeTimelineBucket(project) {
  const today = new Date();
  if (!project.endDate) return 'all';
  const planned = new Date(project.endDate);
  const diff = Math.round((planned - today) / (1000 * 60 * 60 * 24));
  if (diff < 90) return 'lt90';
  if (diff < 180) return 'lt180';
  if (diff > 180) return 'gt180';
  return 'all';
}

function legacyHydrateManagers(projects) {
  const select = legacySelectors.managerFilter();
  if (!select) return;
  const managers = new Set(projects.map((project) => project.manager).filter(Boolean));
  select.innerHTML = '<option value="all">جميع المدراء</option>';
  Array.from(managers)
    .sort((a, b) => a.localeCompare(b, 'ar'))
    .forEach((manager) => {
      const option = document.createElement('option');
      option.value = manager;
      option.textContent = manager;
      select.appendChild(option);
    });
  const current = legacyState?.filters?.manager;
  if (current && current !== 'all') {
    const hasOption = Array.from(select.options).some((option) => option.value === current);
    if (hasOption) {
      select.value = current;
    } else {
      legacyState.filters.manager = 'all';
      select.value = 'all';
    }
  }
}

function legacyApplyFilters(projects) {
  return projects
    .filter((project) => {
      const { status, risk, manager, timeline, search } = legacyState.filters;
      if (status !== 'all' && project.status !== status) return false;
      if (risk !== 'all' && project.riskLevel !== risk) return false;
      if (manager !== 'all' && project.manager !== manager) return false;
      if (timeline !== 'all' && legacyComputeTimelineBucket(project) !== timeline) return false;
      if (search) {
        const term = search.toLowerCase();
        const searchable = [project.id, project.name, project.clientName, normalizeLocationLabel(project), project.manager]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      return true;
    })
    .sort((a, b) => b.progress - a.progress);
}

function legacyRenderSummaryCards(projects) {
  const container = legacySelectors.summaryCards();
  if (!container) return;
  const totalValue = projects.reduce((total, project) => total + safeNumber(project.contractValue), 0);
  const active = projects.filter((project) => project.status === 'active').length;
  const closed = projects.filter((project) => project.status === 'completed').length;
  const onHold = projects.filter((project) => project.status === 'on-hold').length;
  const averageProgress = projects.length
    ? Math.round(projects.reduce((total, project) => total + (project.progress || 0), 0) / projects.length)
    : 0;

  container.innerHTML = `
    <article class="projects-summary-card bg-surface border border-border rounded-2xl p-6 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs text-text-secondary font-semibold">إجمالي المشاريع</span>
        <i class="fas fa-layer-group text-primary"></i>
      </div>
      <p class="text-3xl font-extrabold text-text-primary">${projects.length}</p>
      <p class="text-xs text-text-secondary">${active} نشط · ${closed} منجز · ${onHold} متوقف</p>
    </article>
    <article class="projects-summary-card bg-surface border border-border rounded-2xl p-6 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs text-text-secondary font-semibold">القيمة التعاقدية</span>
        <i class="fas fa-sack-dollar text-success"></i>
      </div>
      <p class="text-3xl font-extrabold text-text-primary">${formatCurrency(totalValue)}</p>
      <p class="text-xs text-text-secondary">متوسط التقدم ${legacyFormatPercentage(averageProgress)}</p>
    </article>
    <article class="projects-summary-card bg-surface border border-border rounded-2xl p-6 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs text-text-secondary font-semibold">إجمالي الربحية</span>
        <i class="fas fa-chart-line text-warning"></i>
      </div>
      <p class="text-3xl font-extrabold text-text-primary">${formatCurrency(projects.reduce((total, project) => total + safeNumber(project.profitability), 0))}</p>
      <p class="text-xs text-text-secondary">صحة المحفظة ${legacyFormatPercentage(projects.length ? Math.round(projects.reduce((total, project) => total + project.healthIndex, 0) / projects.length) : 0)}</p>
    </article>
    <article class="projects-summary-card bg-surface border border-border rounded-2xl p-6 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-xs text-text-secondary font-semibold">تقارير الأسبوع</span>
        <i class="fas fa-calendar-week text-primary"></i>
      </div>
      <p class="text-3xl font-extrabold text-text-primary">${projects.reduce((total, project) => total + (project.reportsStats?.reportsCount || 0), 0)}</p>
      <p class="text-xs text-text-secondary">متوسط التقدم الأسبوعي ${legacyFormatPercentage(projects.length ? Math.round(projects.reduce((total, project) => total + (project.reportsStats?.progressAverage || 0), 0) / projects.length) : 0)}</p>
    </article>
  `;
}

function legacyRenderProjectsTable(projects) {
  const tbody = legacySelectors.projectsTableBody();
  const emptyState = legacySelectors.projectsEmptyState();
  const count = legacySelectors.projectsCount();
  if (!tbody || !emptyState || !count) return;

  tbody.innerHTML = '';
  const filtered = legacyApplyFilters(projects);
  count.textContent = filtered.length;
  emptyState.classList.toggle('hidden', filtered.length > 0);

  filtered.forEach((project) => {
    const status = legacyStatusMap[project.status] || legacyStatusMap.active;
    const risk = legacyRiskMap[project.riskLevel] || legacyRiskMap.low;
    const row = document.createElement('tr');
    row.dataset.projectId = project.id;
    row.innerHTML = `
      <td>
        <div class="flex flex-col gap-1">
          <span class="text-sm font-semibold text-text-primary">${project.name}</span>
          <span class="text-xs text-text-secondary">${project.id}</span>
        </div>
      </td>
      <td>
        <div class="flex flex-col gap-1 text-sm">
          <span class="font-medium text-text-primary">${project.clientName || 'غير محدد'}</span>
          <span class="text-xs text-text-secondary">${normalizeLocationLabel(project)}</span>
        </div>
      </td>
      <td>
        <div class="flex flex-col gap-1 text-sm">
          <span class="font-bold text-text-primary">${formatCurrency(project.contractValue)}</span>
          <span class="text-xs text-text-secondary">مدفوع: ${formatCurrency(project.paymentsTotals?.totalPaid || 0)}</span>
        </div>
      </td>
      <td>
        <div class="flex flex-col gap-1">
          <div class="project-progress-bar"><span style="width: ${project.progress}%"></span></div>
          <div class="text-xs text-text-secondary flex items-center gap-2">
            <span>${legacyFormatPercentage(project.progress)}</span>
            <span class="metric-pill ${legacyHealthClass(project)}">
              <i class="fas fa-heart-pulse"></i>
              ${project.healthIndex}
            </span>
          </div>
        </div>
      </td>
      <td>
        <div class="flex flex-col gap-1 text-sm">
          <span class="font-medium text-text-primary">${project.manager || 'غير محدد'}</span>
          <span class="text-xs text-text-secondary">${project.teamSize || 0} أعضاء</span>
        </div>
      </td>
      <td>
        <span class="projects-tag ${risk.className}">
          <i class="fas fa-triangle-exclamation"></i>
          ${risk.label}
        </span>
      </td>
      <td>
        <span class="projects-tag ${status.className}">
          <i class="fas fa-circle"></i>
          ${status.label}
        </span>
      </td>
    `;
    row.addEventListener('click', () => legacySelectProject(project.id));
    tbody.appendChild(row);
  });

  if (filtered.length > 0) {
    const selectedId = filtered.some((project) => project.id === legacyState.selectedProjectId)
      ? legacyState.selectedProjectId
      : filtered[0].id;
    legacySelectProject(selectedId);
  } else {
    legacyState.selectedProjectId = null;
    const panel = legacySelectors.projectDetailPanel();
    if (panel) panel.classList.add('hidden');
  }
}

function legacyRenderDeliverables(deliverables = []) {
  if (!deliverables.length) {
    return '<li class="text-xs text-text-secondary">لا توجد مهام مسجلة</li>';
  }
  return deliverables
    .map((deliverable) => {
      const statusClass = deliverable.completed ? 'text-success' : 'text-warning';
      const icon = deliverable.completed ? 'fa-circle-check' : 'fa-hourglass-half';
      return `
        <li class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <i class="fas ${icon} ${statusClass}"></i>
            <div>
              <p class="font-medium text-text-primary">${deliverable.label}</p>
              <p class="text-xs text-text-secondary">موعد التسليم: ${formatDate(deliverable.due)}</p>
            </div>
          </div>
          ${deliverable.completed ? '<span class="metric-pill positive">منجز</span>' : ''}
        </li>
      `;
    })
    .join('');
}

function legacyRenderTimeline(timeline = []) {
  if (!timeline.length) {
    return '<li class="text-xs text-text-secondary">لم يتم تسجيل أحداث بعد</li>';
  }
  return timeline
    .map((item) => {
      const icons = {
        milestone: 'fa-flag-checkered text-primary',
        checkpoint: 'fa-location-dot text-success',
        approval: 'fa-stamp text-warning',
        planned: 'fa-calendar text-text-secondary',
        risk: 'fa-bolt text-danger',
      };
      const icon = icons[item.type] || 'fa-calendar';
      return `
        <li>
          <div class="flex items-center gap-3">
            <i class="fas ${icon}"></i>
            <div>
              <p class="font-medium text-text-primary">${item.title}</p>
              <p class="text-xs text-text-secondary">${formatDate(item.date)}</p>
            </div>
          </div>
        </li>
      `;
    })
    .join('');
}

function legacyRenderTeams(teams = {}) {
  if (!Object.keys(teams).length) {
    return '<p class="text-xs text-text-secondary">لم يتم تعيين فرق حتى الآن.</p>';
  }
  return Object.entries(teams)
    .map(([team, members]) => {
      const label = {
        engineering: 'هندسة وإدارة تصميم',
        site: 'فرق الموقع',
        qa: 'الجودة والسلامة',
      }[team] || team;
      return `
        <div class="bg-secondary-50 border border-secondary-100 rounded-xl px-4 py-3">
          <p class="text-xs text-text-secondary">${label}</p>
          <p class="font-semibold text-text-primary">${members.join('، ')}</p>
        </div>
      `;
    })
    .join('');
}

function legacyRenderDocuments(documents = []) {
  if (!documents.length) {
    return '<li class="text-xs text-text-secondary">لا توجد وثائق مسجلة</li>';
  }
  return documents
    .map(
      (document) => `
      <li class="flex items-center gap-2">
        <i class="fas fa-file-lines text-primary"></i>
        <span class="font-medium text-text-primary">${document.name}</span>
        <span class="text-xs text-text-secondary">(${document.type}) · ${document.version || 'v1.0'}</span>
      </li>`
    )
    .join('');
}

function legacyRenderMetricsGrid(project) {
  const metrics = [
    { label: 'تاريخ البدء', value: formatDate(project.startDate) },
    { label: 'موعد التسليم', value: formatDate(project.endDate) },
    { label: 'قيمة العقد', value: formatCurrency(project.contractValue) },
    { label: 'التكلفة الفعلية', value: formatCurrency(project.expensesTotal) },
    { label: 'نسبة الإنجاز', value: legacyFormatPercentage(project.progress) },
    { label: 'هامش الربح', value: formatCurrency(project.profitability) },
    { label: 'انحراف الجدول', value: `${project.scheduleVariance} يوم` },
    { label: 'التقارير المسجلة', value: `${project.reportsStats?.reportsCount || 0} تقرير` },
  ];
  const container = legacySelectors.detailMetrics();
  if (!container) return;
  container.innerHTML = metrics
    .map(
      (metric) => `
      <div class="bg-surface border border-border rounded-xl px-4 py-3">
        <p class="text-xs text-text-secondary">${metric.label}</p>
        <p class="text-sm font-semibold text-text-primary">${metric.value}</p>
      </div>`
    )
    .join('');
}

function legacySelectProject(projectId) {
  if (!projectId) return;
  const project = legacyProjectsCache.find((item) => item.id === projectId);
  if (!project) return;
  legacyState.selectedProjectId = projectId;

  document.querySelectorAll('#projectsTableBody tr').forEach((row) => {
    row.classList.toggle('bg-secondary-100', row.dataset.projectId === projectId);
  });

  const panel = legacySelectors.projectDetailPanel();
  if (!panel) return;
  panel.classList.remove('hidden');

  const status = legacyStatusMap[project.status] || legacyStatusMap.active;
  const risk = legacyRiskMap[project.riskLevel] || legacyRiskMap.low;

  const detailName = legacySelectors.detailName();
  if (detailName) detailName.textContent = project.name;
  const detailStatus = legacySelectors.detailStatus();
  if (detailStatus) {
    detailStatus.className = `projects-tag ${status.className}`;
    detailStatus.innerHTML = `<i class="fas fa-circle"></i>${status.label}`;
  }
  const detailRisk = legacySelectors.detailRisk();
  if (detailRisk) {
    detailRisk.className = `projects-tag ${risk.className}`;
    detailRisk.innerHTML = `<i class="fas fa-triangle-exclamation"></i>${risk.label}`;
  }

  const detailClient = legacySelectors.detailClient();
  if (detailClient) detailClient.textContent = `${project.clientName || 'غير محدد'} · ${project.manager || '—'}`;
  const detailLocation = legacySelectors.detailLocation();
  if (detailLocation) detailLocation.textContent = normalizeLocationLabel(project);

  const detailDeliverables = legacySelectors.detailDeliverables();
  if (detailDeliverables) detailDeliverables.innerHTML = legacyRenderDeliverables(project.deliverables);

  const detailTimeline = legacySelectors.detailTimeline();
  if (detailTimeline) detailTimeline.innerHTML = legacyRenderTimeline(project.timelineEvents);

  const detailTeams = legacySelectors.detailTeams();
  if (detailTeams) detailTeams.innerHTML = legacyRenderTeams(project.teams);

  const detailDocuments = legacySelectors.detailDocuments();
  if (detailDocuments) detailDocuments.innerHTML = legacyRenderDocuments(project.documents);

  legacyRenderMetricsGrid(project);

  const wizardBtn = legacySelectors.openInWizardBtn();
  if (wizardBtn) {
    wizardBtn.onclick = () => {
      window.location.href = `project_creation_wizard.html?projectId=${project.id}`;
    };
  }

  const downloadBtn = legacySelectors.downloadProjectBtn();
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const payload = {
        id: project.id,
        name: project.name,
        client: project.clientName,
        manager: project.manager,
        contractValue: project.contractValue,
        expensesTotal: project.expensesTotal,
        profitability: project.profitability,
        progress: project.progress,
        payments: project.paymentsTotals,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${project.id}-summary.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    };
  }

  const overviewBtn = legacySelectors.openOverviewBtn();
  if (overviewBtn) {
    overviewBtn.onclick = () => {
      window.location.href = `pages/project_info.html?projectId=${project.id}`;
    };
  }
}

function legacyRenderPipeline(projects) {
  const board = legacySelectors.pipelineBoard();
  const activeBadge = legacySelectors.activeCountBadge();
  const valueBadge = legacySelectors.pipelineValueBadge();
  if (!board || !activeBadge || !valueBadge) return;

  const columns = {
    planning: [],
    active: [],
    'on-hold': [],
    completed: [],
  };

  projects.forEach((project) => {
    const column = columns[project.status] || columns.active;
    column.push(project);
  });

  const totalActive = columns.active.length;
  const totalValue = formatCurrency(projects.reduce((sum, project) => sum + safeNumber(project.contractValue), 0));
  activeBadge.textContent = `${totalActive} مشاريع نشطة`;
  valueBadge.textContent = `قيمة العقود ${totalValue}`;

  board.innerHTML = Object.entries(columns)
    .map(([key, items]) => {
      const status = legacyStatusMap[key] || legacyStatusMap.active;
      return `
        <div class="projects-kanban-column">
          <header>
            <span>${status.label}</span>
            <strong>${items.length} مشروع</strong>
          </header>
          <ul>
            ${
              items.length
                ? items
                    .map(
                      (item) => `
                <li class="projects-kanban-card">
                  <div class="flex items-center justify-between gap-2">
                    <strong>${item.name}</strong>
                    <span class="projects-tag ${legacyRiskMap[item.riskLevel || 'low']?.className || 'neutral'}">${legacyFormatPercentage(item.progress)}</span>
                  </div>
                  <p class="text-xs text-text-secondary">${item.clientName || 'عميل'}</p>
                  <footer>
                    <span><i class="fas fa-coins"></i> ${formatCurrency(item.profitability)}</span>
                    <button class="text-primary" data-project-id="${item.id}" data-action="open">التفاصيل</button>
                  </footer>
                </li>`
                    )
                    .join('')
                : '<li class="text-xs text-text-secondary">لا مشاريع في هذه القائمة</li>'
            }
          </ul>
        </div>
      `;
    })
    .join('');

  board.querySelectorAll('[data-action="open"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const { projectId } = event.currentTarget.dataset;
      legacySelectProject(projectId);
      legacyState.viewMode = 'table';
      legacyToggleView();
    });
  });
}

function legacyToggleView() {
  const dataSection = legacySelectors.projectsDataSection();
  const pipelineSection = legacySelectors.projectsPipelineSection();
  const toggleBtn = legacySelectors.toggleViewBtn();
  const toggleLabel = legacySelectors.toggleViewLabel();
  if (!dataSection || !pipelineSection || !toggleBtn || !toggleLabel) return;

  const config = legacyViewModes[legacyState.viewMode];
  toggleLabel.textContent = config.label;
  const icon = toggleBtn.querySelector('i');
  if (icon) {
    icon.className = `fas ${config.icon}`;
  }

  if (legacyState.viewMode === 'kanban') {
    dataSection.style.display = 'none';
    pipelineSection.style.display = '';
    pipelineSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    dataSection.style.display = '';
    pipelineSection.style.display = 'none';
    dataSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function legacyRefreshProjects() {
  const projects = await projectStore.getAll();
  await Promise.all([
    phasesStore.ensureReady(),
    expensesStore.ensureReady(),
    paymentsStore.ensureReady(),
    reportsStore.ensureReady(),
  ]);

  legacyProjectsCache = await Promise.all(
    projects.map(async (project) => {
      const [phases, timeline, expenseTotals, paymentTotals, reportsStats] = await Promise.all([
        phasesStore.all(project.id),
        phasesStore.timeline(project.id),
        expensesStore.totals(project.id),
        paymentsStore.totals(project.id),
        reportsStore.weeklyProgress(project.id),
      ]);
      const phasesProgress = phases.length
        ? Math.round(phases.reduce((total, phase) => total + (phase.progress || 0), 0) / phases.length)
        : project.progress || 0;
      const progress = phasesProgress || project.progress || 0;
      const contractValue = safeNumber(project.contractValue || project.revenue || project.budget || 0);
      const expensesTotal = safeNumber(expenseTotals.expensesTotal || project.totalExpenses || 0);
      const profitability = safeNumber(project.profitability ?? contractValue - expensesTotal);
      const today = new Date();
      const totalDuration = calculateDuration(project.startDate, project.endDate);
      const startDate = project.startDate ? new Date(project.startDate) : null;
      const elapsed = startDate
        ? Math.max(0, Math.min(totalDuration, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24))))
        : 0;
      const expectedProgress = totalDuration ? Math.round((elapsed / (totalDuration || 1)) * 100) : progress;
      const scheduleVariance = progress - expectedProgress;
      const riskLevel = legacyRiskLevel({ ...project, profitability, scheduleVariance, progress });
      const healthIndex = Math.max(
        40,
        Math.min(
          100,
          Math.round((progress + (reportsStats.progressAverage || progress) + Math.max(scheduleVariance, 0)) / 3)
        )
      );

      const deliverables = phases.slice(0, 4).map((phase) => ({
        label: phase.name,
        due: phase.endDate || phase.startDate,
        completed: (phase.progress || 0) >= 95,
      }));

      const timelineEvents = phases.map((phase) => ({
        type: phase.progress >= 95 ? 'milestone' : 'planned',
        title: phase.name,
        date: phase.endDate || phase.startDate,
      }));

      const teams = project.teams || {
        engineering: project.manager ? [project.manager] : [],
        site: (phases[0]?.crew || []).slice(0, 3),
      };

      return {
        ...project,
        contractValue,
        expensesTotal,
        profitability,
        progress,
        scheduleVariance,
        riskLevel,
        healthIndex,
        paymentsTotals: paymentTotals,
        reportsStats,
        phases,
        timeline,
        deliverables,
        timelineEvents,
        teams,
        teamSize: Object.values(teams).reduce((total, members) => total + (members?.length || 0), 0),
        documents: project.documents || [],
      };
    })
  );

  legacyHydrateManagers(legacyProjectsCache);
  legacyRenderSummaryCards(legacyProjectsCache);
  legacyRenderProjectsTable(legacyProjectsCache);
  legacyRenderPipeline(legacyProjectsCache);

  const syncLabel = legacySelectors.lastSyncLabel();
  if (syncLabel) {
    syncLabel.textContent = new Date().toLocaleString('ar-SA');
  }
}

function legacyBindFilters() {
  const handlers = [
    ['statusFilter', 'status'],
    ['riskFilter', 'risk'],
    ['managerFilter', 'manager'],
    ['timelineFilter', 'timeline'],
  ];
  handlers.forEach(([selector, key]) => {
    const element = legacySelectors[selector]();
    if (element) {
      element.addEventListener('change', (event) => {
        legacyState.filters[key] = event.target.value;
        legacyRenderProjectsTable(legacyProjectsCache);
      });
    }
  });

  const search = legacySelectors.projectSearch();
  if (search) {
    search.addEventListener('input', (event) => {
      legacyState.filters.search = event.target.value;
      legacyRenderProjectsTable(legacyProjectsCache);
    });
  }

  const reset = legacySelectors.resetFiltersBtn();
  if (reset) {
    reset.addEventListener('click', () => {
      legacyState.filters = { status: 'all', risk: 'all', manager: 'all', timeline: 'all', search: '' };
      if (search) search.value = '';
      handlers.forEach(([selector]) => {
        const element = legacySelectors[selector]();
        if (element) element.value = 'all';
      });
      legacyRenderProjectsTable(legacyProjectsCache);
    });
  }

  const toggle = legacySelectors.toggleViewBtn();
  if (toggle) {
    toggle.addEventListener('click', () => {
      legacyState.viewMode = legacyState.viewMode === 'table' ? 'kanban' : 'table';
      legacyToggleView();
    });
  }
}

function legacyBindActions() {
  const newBtn = legacySelectors.newProjectBtn();
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      window.location.href = 'project_creation_wizard.html';
    });
  }
  const exportBtn = legacySelectors.exportProjectsBtn();
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const filtered = legacyApplyFilters(legacyProjectsCache);
      const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'projects-export.json';
      link.click();
      URL.revokeObjectURL(link.href);
      createToast('تم تصدير المشاريع المحددة');
    });
  }
}

async function setupLegacyManagementPage() {
  const tableBody = legacySelectors.projectsTableBody();
  if (!tableBody) return false;
  await legacyRefreshProjects();
  legacyBindFilters();
  legacyBindActions();

  onDataEvent('projects-updated', legacyRefreshProjects);
  onDataEvent('phases-updated', legacyRefreshProjects);
  onDataEvent('expenses-updated', legacyRefreshProjects);
  onDataEvent('payments-updated', legacyRefreshProjects);
  onDataEvent('reports-updated', legacyRefreshProjects);

  legacyToggleView();
  if (consumeSessionFlag('projects:updated')) {
    createToast('تم تحديث قائمة المشاريع', 'success');
  }
  return true;
}

async function setupManagementPage() {
  const handled = await setupLegacyManagementPage();
  if (handled) return;
  await renderProjectsGrid();
  bindProjectsGridFilters();
  document.querySelector('[data-projects-grid]')?.addEventListener('click', handleProjectAction);
  document.querySelector('[data-create-project]')?.addEventListener('click', () => {
    window.location.href = 'project_creation_wizard.html';
  });

  onDataEvent('projects-updated', () => {
    renderProjectsGrid();
  });

  if (consumeSessionFlag('projects:updated')) {
    createToast('تم تحديث قائمة المشاريع', 'success');
  }
}

function getFormValue(formData, field) {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : value;
}

async function setupWizardPage() {
  const { projectId } = parseQueryParams();
  const mode = projectId ? 'edit' : 'create';
  const form = document.querySelector('#projectForm');
  const titleEl = document.querySelector('[data-wizard-title]');
  const submitEl = document.querySelector('[data-wizard-submit]');

  if (titleEl) titleEl.textContent = mode === 'edit' ? 'تعديل بيانات المشروع' : 'إنشاء مشروع جديد';
  if (submitEl) submitEl.textContent = mode === 'edit' ? 'حفظ التعديلات' : 'إنشاء المشروع';

  if (mode === 'edit') {
    const project = await projectStore.getById(projectId);
    if (!project) {
      createToast('المشروع غير موجود', 'error');
      window.location.href = 'projects_management_center.html';
      return;
    }
    populateWizard(form, project);
  }

  bindFormSubmit(form, async (formData) => {
    const payload = collectProjectPayload(formData);
    if (mode === 'edit') {
      await projectStore.update(projectId, payload);
    } else {
      await projectStore.create(payload);
    }
    window.location.href = 'projects_management_center.html';
  });
}

function populateWizard(form, project) {
  Object.entries(project).forEach(([key, value]) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (!field) return;
    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else {
      field.value = value;
    }
  });
}

function collectProjectPayload(formData) {
  const payload = {
    name: getFormValue(formData, 'name'),
    clientName: getFormValue(formData, 'clientName'),
    contractValue: safeNumber(getFormValue(formData, 'contractValue')),
    budget: safeNumber(getFormValue(formData, 'budget')),
    startDate: getFormValue(formData, 'startDate'),
    endDate: getFormValue(formData, 'endDate'),
    location: getFormValue(formData, 'location'),
    manager: getFormValue(formData, 'manager'),
    status: getFormValue(formData, 'status') || 'active',
    description: getFormValue(formData, 'description'),
    cover: getFormValue(formData, 'cover'),
  };

  if (!payload.name) throw new Error('يرجى إدخال اسم المشروع');
  if (!payload.clientName) throw new Error('يرجى إدخال اسم العميل');
  return payload;
}

async function renderProjectSummary(projectId) {
  const project = await projectStore.getById(projectId);
  if (!project) {
    document.querySelector('[data-project-summary]').innerHTML = '<div class="empty-state">المشروع غير موجود</div>';
    return;
  }

  const nameEl = document.querySelector('[data-project-name]');
  if (nameEl) nameEl.textContent = project.name;

  const clientEl = document.querySelector('[data-project-client]');
  if (clientEl) clientEl.textContent = project.clientName;

  const statusEl = document.querySelector('[data-project-status]');
  if (statusEl) statusEl.innerHTML = projectStatusBadge(project.status);

  const typePill = document.getElementById('projectTypePill');
  if (typePill) typePill.textContent = project.typeLabel || project.type || 'نوع المشروع';

  const descriptionEl = document.querySelector('[data-project-description]');
  if (descriptionEl) descriptionEl.textContent = project.description || 'لم يتم إدخال وصف تفصيلي للمشروع.';

  const periodEl = document.querySelector('[data-project-period]');
  if (periodEl) periodEl.textContent = `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`;

  const locationEl = document.querySelector('[data-project-location]');
  if (locationEl) locationEl.textContent = normalizeLocationLabel(project);

  const managerEl = document.querySelector('[data-project-manager]');
  if (managerEl) managerEl.textContent = project.manager || project.team?.manager?.name || '—';

  const contractEl = document.querySelector('[data-project-contract]');
  if (contractEl) {
    const contractValue = project.contractValue || project.revenue || project.budget?.contractValue || project.value || 0;
    contractEl.textContent = formatCurrency(contractValue);
  }

  const expensesEl = document.querySelector('[data-project-expenses]');
  if (expensesEl) expensesEl.textContent = formatCurrency(project.totalExpenses || 0);

  const profitEl = document.querySelector('[data-project-profit]');
  if (profitEl) profitEl.textContent = formatCurrency(project.profitability || 0);

  const progressEl = document.querySelector('[data-project-progress]');
  if (progressEl) progressEl.textContent = formatPercent(project.progress || 0);

  const progressBar = document.querySelector('[data-project-progress-bar]');
  if (progressBar) progressBar.style.width = `${project.progress || 0}%`;

  const cashflowEl = document.querySelector('[data-insight-cashflow]');
  if (cashflowEl) cashflowEl.textContent = formatCurrency(project.profitability || 0);

  const contractValue = safeNumber(project.contractValue || project.revenue || 0);
  const marginEl = document.querySelector('[data-insight-margin]');
  if (marginEl) {
    const marginPercent = contractValue ? ((safeNumber(project.profitability) / contractValue) * 100) : 0;
    marginEl.textContent = formatPercent(marginPercent);
  }

  const outstandingEl = document.querySelector('[data-insight-outstanding]');
  if (outstandingEl) {
    const outstanding = contractValue - safeNumber(project.totalPayments || 0);
    outstandingEl.textContent = formatCurrency(Math.max(0, outstanding));
  }

  const totalDays = calculateDuration(project.startDate, project.endDate);
  const today = new Date();
  const start = project.startDate ? new Date(project.startDate) : null;
  let daysElapsed = 0;
  if (start && !Number.isNaN(start)) {
    daysElapsed = Math.max(0, Math.min(totalDays, Math.ceil((today - start) / (1000 * 60 * 60 * 24))));
  }
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const daysRemainingEl = document.querySelector('[data-insight-days-remaining]');
  if (daysRemainingEl) {
    daysRemainingEl.textContent = totalDays ? `${daysRemaining} يوم` : '—';
  }
  const daysTotalEl = document.querySelector('[data-insight-days-total]');
  if (daysTotalEl) {
    daysTotalEl.textContent = totalDays ? `إجمالي المدة ${totalDays} يوم` : 'مدة المشروع';
  }

  const phasesCountEl = document.querySelector('[data-insight-phases-count]');
  const phasesProgressEl = document.querySelector('[data-insight-phases-progress]');
  if (phasesCountEl || phasesProgressEl) {
    const [phases, timeline] = await Promise.all([
      phasesStore.all(projectId),
      phasesStore.timeline(projectId),
    ]);
    if (phasesCountEl) phasesCountEl.textContent = `${phases.length} مرحلة`;
    if (phasesProgressEl) phasesProgressEl.textContent = `متوسط التقدم ${formatPercent(timeline.overallProgress)}`;
  }

  document.querySelectorAll('[data-edit-project]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.href = `../project_creation_wizard.html?projectId=${projectId}`;
    });
  });
}

const STATUS_LABELS = {
  planned: 'مخططة',
  in_progress: 'جارية',
  delayed: 'متأخرة',
  done: 'منتهية',
};

const STATUS_COLORS = {
  planned: '#2563eb',
  in_progress: '#0ea5e9',
  delayed: '#f97316',
  done: '#22c55e',
};

const STATUS_ORDER = ['planned', 'in_progress', 'delayed', 'done'];

function normalizePhaseDependencies(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferPhaseStatus(phase) {
  if (phase.status && STATUS_ORDER.includes(phase.status)) return phase.status;
  const progress = Number(phase.progress) || 0;
  if (progress >= 100) return 'done';
  const today = new Date();
  const start = phase.startDateObj;
  const end = phase.endDateObj;
  if (end && today > end && progress < 100) return 'delayed';
  if (start && today < start) return 'planned';
  return 'in_progress';
}

function phaseStatusLabel(status) {
  return STATUS_LABELS[status] || 'غير محددة';
}

function phaseStatusClass(status) {
  const normalized = STATUS_ORDER.includes(status) ? status : 'planned';
  return `phase-status phase-status--${normalized}`;
}

function enrichPhase(phase) {
  const startDateObj = phase.startDate ? new Date(phase.startDate) : null;
  const endDateObj = phase.endDate ? new Date(phase.endDate) : null;
  const durationDays = phase.duration || calculateDuration(phase.startDate, phase.endDate) || 0;
  const progress = Math.max(0, Math.min(100, safeNumber(phase.progress)));
  const status = inferPhaseStatus({ ...phase, startDateObj, endDateObj, progress });
  const dependencies = normalizePhaseDependencies(phase.dependencies);
  const assignee = phase.assignee ? String(phase.assignee).trim() : '';
  return {
    ...phase,
    startDateObj,
    endDateObj,
    durationDays,
    progress,
    status,
    dependencies,
    assignee,
  };
}

function getPeriodRange(periodKey) {
  if (!periodKey) return null;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  let end = new Date(start);

  if (periodKey === 'this-week') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (periodKey === 'this-month') {
    start.setDate(1);
    end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (periodKey === 'next-month') {
    start.setDate(1);
    start.setMonth(start.getMonth() + 1);
    end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  return null;
}

function phaseMatchesFilters(phase) {
  const { filters } = phasesUIState;
  if (filters.status && phase.status !== filters.status) return false;
  if (filters.assignee && phase.assignee !== filters.assignee) return false;
  if (filters.period) {
    const range = getPeriodRange(filters.period);
    if (!range) return true;
    const phaseStart = phase.startDateObj || phase.endDateObj;
    const phaseEnd = phase.endDateObj || phase.startDateObj;
    if (!phaseStart || !phaseEnd) return false;
    if (phaseEnd < range.start || phaseStart > range.end) return false;
  }
  return true;
}

function sortPhasesList(phases) {
  const { key, direction } = phasesUIState.sort;
  const factor = direction === 'desc' ? -1 : 1;
  const sorted = [...phases].sort((a, b) => {
    let value = 0;
    if (key === 'name' || key === 'assignee') {
      value = a[key].localeCompare(b[key], 'ar');
    } else if (key === 'status') {
      value = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    } else if (key === 'progress' || key === 'durationDays') {
      value = safeNumber(a[key]) - safeNumber(b[key]);
    } else if (key === 'startDate' || key === 'endDate') {
      const aDate = key === 'startDate' ? a.startDateObj : a.endDateObj;
      const bDate = key === 'startDate' ? b.startDateObj : b.endDateObj;
      value = (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
    } else {
      value = a.name.localeCompare(b.name, 'ar');
    }
    return value * factor;
  });
  return sorted;
}

function getVisiblePhases() {
  return sortPhasesList(phasesUIState.phases.filter((phase) => phaseMatchesFilters(phase)));
}

function updateAssigneeFilterOptions() {
  const select = document.getElementById('filterAssignee');
  if (!select) return;
  const currentValue = phasesUIState.filters.assignee || '';
  const options = [''];
  phasesUIState.phases.forEach((phase) => {
    if (phase.assignee && !options.includes(phase.assignee)) {
      options.push(phase.assignee);
    }
  });
  select.innerHTML = ['<option value="">جميع المسؤولين</option>']
    .concat(options.filter(Boolean).map((name) => `<option value="${name}">${name}</option>`))
    .join('');
  select.value = currentValue;
}

function renderPhaseTable() {
  const tbody = document.getElementById('phasesTableBody');
  if (!tbody) return;
  const phases = getVisiblePhases();
  if (!phases.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">لا توجد مراحل مطابقة للفلاتر الحالية.</td></tr>';
  } else {
    tbody.innerHTML = phases
      .map(
        (phase) => `
        <tr data-phase-id="${phase.id}">
          <td>
            <div>
              <strong>${phase.name}</strong>
              <div class="text-muted">${phase.description || '—'}</div>
            </div>
          </td>
          <td>${formatDate(phase.startDate)}</td>
          <td>${formatDate(phase.endDate)}</td>
          <td>${phase.durationDays}</td>
          <td>
            <div>
              <div>${formatPercent(phase.progress)}</div>
              <div class="progress-bar"><div style="width:${phase.progress}%"></div></div>
            </div>
          </td>
          <td><span class="${phaseStatusClass(phase.status)}">${phaseStatusLabel(phase.status)}</span></td>
          <td>${phase.assignee || '—'}</td>
          <td>${phase.dependencies.length ? phase.dependencies.join('<br>') : '—'}</td>
          <td>
            <div class="phase-actions">
              <button class="btn btn-light" data-action="edit-phase">تعديل</button>
              <button class="btn btn-text danger" data-action="delete-phase">حذف</button>
            </div>
          </td>
        </tr>`
      )
      .join('');
  }

  const totals = phases.reduce(
    (acc, phase) => {
      acc.count += 1;
      acc.duration += safeNumber(phase.durationDays);
      acc.progress += safeNumber(phase.progress);
      if (phase.status === 'delayed') acc.delayed += 1;
      return acc;
    },
    { count: 0, duration: 0, progress: 0, delayed: 0 }
  );
  const averageProgress = totals.count ? totals.progress / totals.count : 0;
  const setFooterText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setFooterText('phasesTableTotalCount', totals.count.toLocaleString('ar-SA'));
  setFooterText('phasesTableTotalDuration', `${totals.duration.toLocaleString('ar-SA')} يوم`);
  setFooterText('phasesTableAverageProgress', `${averageProgress.toFixed(0)}%`);
  setFooterText('phasesTableDelayedCount', totals.delayed.toLocaleString('ar-SA'));

  document
    .querySelectorAll('#tblPhases thead th[data-sort]')
    .forEach((th) => {
      const isActive = th.dataset.sort === phasesUIState.sort.key;
      th.classList.toggle('is-sorted', isActive);
      th.dataset.direction = isActive ? phasesUIState.sort.direction : '';
    });
}

function getStatusColor(status) {
  return STATUS_COLORS[status] || '#475569';
}

function renderGanttChart() {
  const container = document.getElementById('ganttContainer');
  if (!container) return;
  const phases = getVisiblePhases();
  if (!phases.length) {
    container.innerHTML = '<div class="empty-state">لا توجد مراحل لعرضها.</div>';
    return;
  }
  const valid = phases.filter((phase) => phase.startDateObj && phase.endDateObj);
  if (!valid.length) {
    container.innerHTML = '<div class="empty-state">الرجاء تحديد تواريخ البدء والانتهاء لكل مرحلة.</div>';
    return;
  }
  const minDate = new Date(Math.min(...valid.map((phase) => phase.startDateObj.getTime())));
  const maxDate = new Date(Math.max(...valid.map((phase) => phase.endDateObj.getTime())));
  const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);
  const pixelsPerDay = 18 * phasesUIState.ganttScale;
  const chartWidth = Math.max(container.clientWidth, totalDays * pixelsPerDay + 200);

  const rows = phases
    .map((phase) => {
      const start = phase.startDateObj || minDate;
      const end = phase.endDateObj || start;
      const offsetDays = Math.max(0, Math.round((start - minDate) / (1000 * 60 * 60 * 24)));
      const duration = Math.max(1, phase.durationDays || Math.round((end - start) / (1000 * 60 * 60 * 24)) || 1);
      const offset = offsetDays * pixelsPerDay;
      const width = duration * pixelsPerDay;
      return `
        <div class="phase-gantt__row">
          <div>
            <strong>${phase.name}</strong>
            <div class="text-muted">${formatDate(phase.startDate)} → ${formatDate(phase.endDate)}</div>
          </div>
          <div class="phase-gantt__bar-wrapper">
            <div class="phase-gantt__bar" style="width:${width}px; inset-inline-start:${offset}px; background:${getStatusColor(
              phase.status,
            )}" data-progress="${formatPercent(phase.progress)}"></div>
          </div>
        </div>`;
    })
    .join('');

  container.innerHTML = `<div class="phase-gantt__grid" style="min-width:${chartWidth}px">${rows}</div>`;
}

function generateWeeklySeries(phases) {
  if (!phases.length) return [];
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);
  const series = [];
  for (let index = 5; index >= 0; index -= 1) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() - index * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const relevant = phases.filter((phase) => phase.endDateObj && phase.endDateObj <= end);
    const value = relevant.length ? Math.round(average(relevant.map((item) => item.progress))) : 0;
    const label = new Intl.DateTimeFormat('ar-SA', { month: 'short', day: 'numeric' }).format(end);
    series.push({ label, value });
  }
  return series;
}

function drawLineChart(canvas, data) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  if (!data.length) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Cairo';
    ctx.textAlign = 'center';
    ctx.fillText('لا تتوفر بيانات لعرضها', width / 2, height / 2);
    return;
  }
  const padding = 32;
  const maxValue = Math.max(100, ...data.map((point) => point.value));
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  ctx.beginPath();
  data.forEach((point, index) => {
    const x = padding + stepX * index;
    const y = height - padding - (point.value / maxValue) * (height - padding * 2);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2563eb';
  ctx.stroke();

  ctx.lineTo(padding + stepX * (data.length - 1), height - padding);
  ctx.lineTo(padding, height - padding);
  ctx.closePath();
  ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
  ctx.fill();

  ctx.fillStyle = '#2563eb';
  ctx.font = '12px Cairo';
  ctx.textAlign = 'center';
  data.forEach((point, index) => {
    const x = padding + stepX * index;
    const y = height - padding - (point.value / maxValue) * (height - padding * 2);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`${point.value}%`, x, y - 10);
    ctx.fillStyle = '#475569';
    ctx.fillText(point.label, x, height - padding + 18);
    ctx.fillStyle = '#2563eb';
  });
}

function drawBarChart(canvas, data) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  if (!data.length) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Cairo';
    ctx.textAlign = 'center';
    ctx.fillText('لا تتوفر بيانات لعرضها', width / 2, height / 2);
    return;
  }
  const padding = 32;
  const barWidth = (width - padding * 2) / data.length - 12;
  const maxValue = Math.max(1, ...data.map((point) => point.value));
  ctx.font = '12px Cairo';
  data.forEach((point, index) => {
    const x = padding + index * (barWidth + 12);
    const barHeight = ((height - padding * 2) * point.value) / maxValue;
    const y = height - padding - barHeight;
    ctx.fillStyle = point.color;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#1f2937';
    ctx.fillText(point.label, x + barWidth / 2, height - padding + 18);
    ctx.fillText(point.value.toString(), x + barWidth / 2, y - 6);
  });
}

async function renderPhaseAnalytics() {
  const { projectId, phases } = phasesUIState;
  const totalPhasesEl = document.getElementById('totalPhases');
  if (totalPhasesEl) totalPhasesEl.textContent = phases.length;

  const statusCount = phases.reduce(
    (acc, phase) => ({ ...acc, [phase.status]: (acc[phase.status] || 0) + 1 }),
    {},
  );
  const inProgressEl = document.getElementById('inProgressPhases');
  if (inProgressEl) inProgressEl.textContent = statusCount.in_progress || 0;
  const delayedEl = document.getElementById('delayedPhases');
  if (delayedEl) delayedEl.textContent = statusCount.delayed || 0;
  const completedEl = document.getElementById('completedPhases');
  if (completedEl) completedEl.textContent = statusCount.done || 0;

  const timeline = projectId ? await phasesStore.timeline(projectId) : { totalDuration: 0, completedDuration: 0, overallProgress: 0 };
  const phasesDurationEl = document.querySelector('[data-phases-duration]');
  if (phasesDurationEl) phasesDurationEl.textContent = `${timeline.totalDuration || 0} يوم`;
  const phasesProgressEl = document.querySelector('[data-phases-progress]');
  if (phasesProgressEl) phasesProgressEl.textContent = formatPercent(timeline.overallProgress || 0);
  const timelineBar = document.querySelector('[data-phases-progress-bar]');
  if (timelineBar) timelineBar.style.width = `${timeline.overallProgress || 0}%`;

  const overallProgressEl = document.getElementById('overallProgressPercent');
  if (overallProgressEl) overallProgressEl.textContent = formatPercent(timeline.overallProgress || 0);
  const overallProgressBar = document.getElementById('overallProgressBar');
  if (overallProgressBar) overallProgressBar.style.width = `${timeline.overallProgress || 0}%`;

  const completedDurationEl = document.getElementById('completedDuration');
  if (completedDurationEl) completedDurationEl.textContent = `${Math.round(timeline.completedDuration || 0)} يوم`;
  const totalDurationEl = document.getElementById('totalDuration');
  if (totalDurationEl) totalDurationEl.textContent = `${Math.round(timeline.totalDuration || 0)} يوم`;
  const remainingDurationEl = document.getElementById('remainingDuration');
  if (remainingDurationEl) {
    const remaining = Math.max(0, Math.round((timeline.totalDuration || 0) - (timeline.completedDuration || 0)));
    remainingDurationEl.textContent = `${remaining} يوم`;
  }

  const weeklySeries = generateWeeklySeries(phases);
  drawLineChart(document.getElementById('weeklyProgressChart'), weeklySeries);

  const statusData = STATUS_ORDER.map((status) => ({
    label: phaseStatusLabel(status),
    value: statusCount[status] || 0,
    color: getStatusColor(status),
  }));
  drawBarChart(document.getElementById('phaseStatusChart'), statusData);
}

function phaseLogsStorageKey(projectId) {
  return `phase-logs:${projectId}`;
}

function loadPhaseLogs(projectId) {
  if (!projectId) return;
  const stored = readFromStorage(phaseLogsStorageKey(projectId), []);
  phasesUIState.logs = Array.isArray(stored)
    ? stored
        .map((entry) => ({ ...entry }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];
}

function savePhaseLogs(projectId) {
  if (!projectId) return;
  writeToStorage(phaseLogsStorageKey(projectId), phasesUIState.logs.slice(0, 200));
}

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function renderPhaseLogs() {
  const criticalPhases = phasesUIState.phases.filter(
    (phase) => phase.status === 'delayed' || (phase.status === 'in_progress' && phase.progress < 40)
  );
  const alertsContainer = document.getElementById('alertsContainer');
  if (alertsContainer) {
    const alerts = criticalPhases
      .slice(0, 5)
      .map(
        (phase) => `
        <div class="phase-alert">
          <strong>${phase.name}</strong>
          <span>الحالة الحالية: ${phaseStatusLabel(phase.status)}</span>
          <span>نسبة التقدم ${formatPercent(phase.progress)} · تاريخ التسليم ${formatDate(phase.endDate)}</span>
        </div>`
      );
    alertsContainer.innerHTML = alerts.length ? alerts.join('') : '<div class="phase-alert">لا توجد تنبيهات حالياً.</div>';
  }

  const alertsCountEl = document.getElementById('phaseLogsAlerts');
  if (alertsCountEl) alertsCountEl.textContent = criticalPhases.length.toString();

  const logsTableBody = document.getElementById('logsTableBody');
  if (logsTableBody) {
    if (!phasesUIState.logs.length) {
      logsTableBody.innerHTML = '<tr class="empty-row"><td colspan="5">لا توجد سجلات بعد.</td></tr>';
    } else {
      logsTableBody.innerHTML = phasesUIState.logs
        .slice(0, 100)
        .map(
          (log) => `
          <tr>
            <td><time datetime="${log.timestamp}">${formatDateTime(log.timestamp)}</time></td>
            <td>${log.user || 'النظام'}</td>
            <td>${log.action}</td>
            <td>${log.phaseName || '—'}</td>
            <td>${log.details || '—'}</td>
          </tr>`
        )
        .join('');
    }

    const logsCountEl = document.getElementById('phaseLogsCount');
    if (logsCountEl) logsCountEl.textContent = phasesUIState.logs.length.toString();

    const latestLogEl = document.getElementById('phaseLogsLatest');
    if (latestLogEl) {
      const latestLog = phasesUIState.logs[0];
      latestLogEl.textContent = latestLog ? formatDateTime(latestLog.timestamp) : '—';
    }
  }
}

function pushPhaseLog(entry) {
  const { projectId } = phasesUIState;
  if (!projectId) return;
  const log = {
    id: entry.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    user: entry.user || 'مدير المشروع',
    action: entry.action || 'تحديث مرحلة',
    phaseName: entry.phaseName || '—',
    details: entry.details || '',
  };
  phasesUIState.logs = [log, ...phasesUIState.logs].slice(0, 200);
  savePhaseLogs(projectId);
  renderPhaseLogs();
}

function resetPhaseForm(form) {
  form.reset();
  if (form.elements.status) form.elements.status.value = 'planned';
  if (form.elements.progress) form.elements.progress.value = form.elements.progress.defaultValue || 0;
}

async function renderPhases(projectId) {
  const projectChanged = phasesUIState.projectId !== projectId;
  phasesUIState.projectId = projectId;
  if (projectChanged) {
    loadPhaseLogs(projectId);
  }
  const phases = await phasesStore.all(projectId);
  phasesUIState.phases = phases.map(enrichPhase);
  updateAssigneeFilterOptions();
  renderPhaseTable();
  renderGanttChart();
  await renderPhaseAnalytics();
  renderPhaseLogs();
}

function applyPhaseFilters() {
  const statusEl = document.getElementById('filterStatus');
  const assigneeEl = document.getElementById('filterAssignee');
  const periodEl = document.getElementById('filterPeriod');
  phasesUIState.filters = {
    status: statusEl ? statusEl.value : '',
    assignee: assigneeEl ? assigneeEl.value : '',
    period: periodEl ? periodEl.value : '',
  };
  renderPhaseTable();
  renderGanttChart();
}

function clearPhaseFilters() {
  phasesUIState.filters = { status: '', assignee: '', period: '' };
  ['filterStatus', 'filterAssignee', 'filterPeriod'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });
  renderPhaseTable();
  renderGanttChart();
}

function sortPhaseTable(key) {
  if (phasesUIState.sort.key === key) {
    phasesUIState.sort.direction = phasesUIState.sort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    phasesUIState.sort.key = key;
    phasesUIState.sort.direction = key === 'progress' || key === 'durationDays' ? 'desc' : 'asc';
  }
  renderPhaseTable();
  renderGanttChart();
}

function zoomGanttIn() {
  phasesUIState.ganttScale = Math.min(3, phasesUIState.ganttScale + 0.25);
  renderGanttChart();
}

function zoomGanttOut() {
  phasesUIState.ganttScale = Math.max(0.5, phasesUIState.ganttScale - 0.25);
  renderGanttChart();
}

function refreshGantt() {
  renderGanttChart();
}

function switchPhaseSubTab(subtabId) {
  document.querySelectorAll('.phase-subtab-button').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.subtab === subtabId);
  });
  document.querySelectorAll('.phase-subtab-content').forEach((content) => {
    content.classList.toggle('is-hidden', content.id !== subtabId);
  });
}

function openAddPhaseModal(phaseId = null) {
  const modal = document.getElementById('phaseModal');
  const form = document.getElementById('phaseForm');
  if (!modal || !form) return;
  const titleEl = modal.querySelector('[data-phase-modal-title]');
  const submitLabel = modal.querySelector('[data-phase-submit-label]');
  resetPhaseForm(form);
  phasesUIState.editingPhaseId = phaseId;

  if (phaseId) {
    const phase = phasesUIState.phases.find((item) => item.id === phaseId);
    if (phase) {
      if (form.elements.name) form.elements.name.value = phase.name || '';
      if (form.elements.startDate) form.elements.startDate.value = phase.startDate || '';
      if (form.elements.endDate) form.elements.endDate.value = phase.endDate || '';
      if (form.elements.progress) form.elements.progress.value = phase.progress;
      if (form.elements.status) form.elements.status.value = phase.status || 'planned';
      if (form.elements.assignee) form.elements.assignee.value = phase.assignee || '';
      if (form.elements.description) form.elements.description.value = phase.description || '';
      if (form.elements.dependencies)
        form.elements.dependencies.value = phase.dependencies.join('\n');
    }
    if (titleEl) titleEl.textContent = 'تعديل المرحلة';
    if (submitLabel) submitLabel.textContent = 'حفظ المرحلة';
  } else {
    if (titleEl) titleEl.textContent = 'إضافة مرحلة جديدة';
    if (submitLabel) submitLabel.textContent = 'إضافة المرحلة';
  }

  modal.classList.add('is-visible');
}

function closePhaseModal() {
  const modal = document.getElementById('phaseModal');
  const form = document.getElementById('phaseForm');
  if (form) resetPhaseForm(form);
  phasesUIState.editingPhaseId = null;
  modal?.classList.remove('is-visible');
}

function downloadFile(filename, content, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 0);
}

async function importPhasesCSV() {
  const { projectId } = phasesUIState;
  if (!projectId) return;
  if (!phasesUIState.csvInput) {
    const input = document.getElementById('phaseCsvInput');
    if (!input) return;
    phasesUIState.csvInput = input;
    input.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const rows = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const cells = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i += 1) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            if (current !== '') cells.push(current.trim());
            return cells;
          });
        if (!rows.length) {
          createToast('ملف CSV فارغ', 'error');
          return;
        }
        const header = rows[0].map((cell) => cell.toLowerCase());
        const isHeader = header.some((cell) => ['name', 'startdate', 'start_date', 'اسم المرحلة'].includes(cell));
        const dataRows = isHeader ? rows.slice(1) : rows;
        let created = 0;
        for (const cells of dataRows) {
          const record = isHeader
            ? Object.fromEntries(header.map((key, index) => [key, cells[index] || '']))
            : {};
          const name = record.name || record['اسم المرحلة'] || cells[0];
          if (!name) continue;
          const startDate = record.startdate || record.start_date || record['start date'] || cells[1] || '';
          const endDate = record.enddate || record.end_date || record['end date'] || cells[2] || '';
          const progress = safeNumber(record.progress || cells[3] || 0);
          const status = (record.status || cells[4] || '').trim();
          const assignee = record.assignee || cells[5] || '';
          const dependencies = normalizePhaseDependencies(record.dependencies || cells[6] || '');
          const description = record.description || cells[7] || '';
          await phasesStore.create(projectId, {
            name,
            startDate,
            endDate,
            progress,
            status,
            assignee,
            dependencies,
            description,
          });
          pushPhaseLog({ action: 'استيراد مرحلة', phaseName: name, details: 'تم الاستيراد من ملف CSV' });
          created += 1;
        }
        if (created) {
          createToast(`تم استيراد ${created} مرحلة بنجاح`);
          await renderPhases(projectId);
          await renderProjectSummary(projectId);
        } else {
          createToast('لم يتم العثور على سجلات صالحة للاستيراد', 'error');
        }
      } catch (error) {
        console.error('فشل استيراد مراحل من CSV', error);
        createToast('تعذر استيراد الملف. يرجى التحقق من التنسيق.', 'error');
      } finally {
        event.target.value = '';
      }
    });
  }
  phasesUIState.csvInput.value = '';
  phasesUIState.csvInput.click();
}

function exportLogs() {
  const { projectId, logs } = phasesUIState;
  if (!projectId || !logs.length) {
    createToast('لا توجد سجلات لتصديرها', 'error');
    return;
  }
  const header = ['timestamp', 'user', 'action', 'phase', 'details'];
  const rows = logs.map((log) => [log.timestamp, log.user, log.action, log.phaseName, log.details]);
  const csv = [header.join(','), ...rows.map((row) => row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join('\n');
  downloadFile(`phase-logs-${projectId}.csv`, csv);
}

function clearLogs() {
  const { projectId } = phasesUIState;
  if (!projectId) return;
  if (!confirm('هل أنت متأكد من مسح السجل؟')) return;
  phasesUIState.logs = [];
  removeFromStorage(phaseLogsStorageKey(projectId));
  renderPhaseLogs();
  createToast('تم مسح سجل المراحل بنجاح');
}

async function renderExpenses(projectId) {
  const expenses = await expensesStore.all(projectId);
  unifiedFinancialState.projectId = projectId;
  unifiedFinancialState.expenses = expenses;

  const legacyList = document.querySelector('[data-expenses-list]');
  if (legacyList) {
    legacyList.innerHTML = expenses.length
      ? expenses
          .map(
            (item) => `
      <div class="expense-row" data-expense-id="${item.id}">
        <div>
          <h4>${item.title}</h4>
          <p>${item.category || 'عام'} · ${formatDate(item.date)}</p>
        </div>
        <div>
          <span class="amount ${item.type === 'revenue' ? 'positive' : 'negative'}">${formatCurrency(item.amount)}</span>
          <button class="btn btn-text" data-action="edit-expense">تعديل</button>
          <button class="btn btn-text danger" data-action="delete-expense">حذف</button>
        </div>
      </div>`
          )
          .join('')
      : '<div class="empty-state">لا توجد مصاريف حتى الآن.</div>';
  }

  const totals = await expensesStore.totals(projectId);
  const expensesTotalEl = document.querySelector('[data-expenses-total]');
  if (expensesTotalEl) expensesTotalEl.textContent = formatCurrency(totals.expensesTotal);

  const expensesRevenueEl = document.querySelector('[data-expenses-revenue]');
  if (expensesRevenueEl) expensesRevenueEl.textContent = formatCurrency(totals.revenueTotal);

  renderUnifiedExpensesUI(projectId);
  return expenses;
}

function parseDateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function expenseTotalWithVat(expense) {
  const amount = safeNumber(expense.amount);
  const vatPercent = safeNumber(expense.vatPercent);
  return amount + (amount * vatPercent) / 100;
}

function normalizedString(value) {
  return (value || '').toString().toLowerCase().trim();
}

function normalizeCategoryName(name) {
  return normalizedString(name || '');
}

function getCategoryMeta(name) {
  const generalKey = normalizeCategoryName('مصروفات عامة');
  const legacyGeneralKey = normalizeCategoryName('عام');
  const normalized = normalizeCategoryName(name);
  const effectiveKey = normalized && normalized !== legacyGeneralKey ? normalized : generalKey;
  const category = categoriesUIState.categories.find(
    (item) => normalizeCategoryName(item.name) === effectiveKey
  );
  if (category) {
    return { ...category };
  }
  if (effectiveKey === generalKey) {
    return { id: 'cat-general-fallback', name: 'مصروفات عامة', color: '#64748b', protected: true };
  }
  return { id: '', name: name || 'مصروفات عامة', color: '#94a3b8', protected: false };
}

function renderExpenseCategoryOptions() {
  const fallback = { id: 'cat-general-fallback', name: 'مصروفات عامة', color: '#64748b', protected: true };
  const categories = categoriesUIState.categories.length ? [...categoriesUIState.categories] : [fallback];
  const seen = new Set(categories.map((category) => normalizeCategoryName(category.name)));
  const extras = [];
  unifiedFinancialState.expenses.forEach((expense) => {
    const meta = getCategoryMeta(expense.category);
    const key = normalizeCategoryName(meta.name);
    if (!seen.has(key)) {
      extras.push({ id: `dynamic-${key}`, name: meta.name, color: meta.color, protected: false });
      seen.add(key);
    }
  });
  const combined = [...categories, ...extras].sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  const filterSelect = document.getElementById('filterExpenseCategory');
  if (filterSelect) {
    const current = unifiedFinancialState.expenseFilters.category || '';
    filterSelect.innerHTML = ['<option value>جميع التصنيفات</option>']
      .concat(combined.map((category) => `<option value="${category.name}">${category.name}</option>`))
      .join('');
    filterSelect.value = current || '';
  }

  const modalSelect = document.getElementById('expenseModalCategory');
  if (modalSelect) {
    const desired = modalSelect.dataset.selected || '';
    modalSelect.innerHTML = combined
      .map((category) => `<option value="${category.name}">${category.name}</option>`)
      .join('');
    if (desired && combined.some((category) => category.name === desired)) {
      modalSelect.value = desired;
    } else if (combined.length) {
      modalSelect.value = combined[0].name;
      modalSelect.dataset.selected = combined[0].name;
    }
  }
}

function renderCategoryManagerList() {
  const list = document.getElementById('categoryManagerList');
  const emptyState = document.getElementById('categoryManagerEmpty');
  if (!list) return;

  const usageMap = new Map();
  const generalKey = normalizeCategoryName('مصروفات عامة');
  const legacyGeneralKey = normalizeCategoryName('عام');
  unifiedFinancialState.expenses.forEach((expense) => {
    const rawName = expense.category || 'مصروفات عامة';
    const normalized = normalizeCategoryName(rawName);
    const effectiveKey = normalized && normalized !== legacyGeneralKey ? normalized : generalKey;
    const displayName = effectiveKey === generalKey ? 'مصروفات عامة' : rawName;
    const entry = usageMap.get(effectiveKey) || { name: displayName, count: 0 };
    entry.count += 1;
    usageMap.set(effectiveKey, entry);
  });

  const storedKeys = new Set(categoriesUIState.categories.map((category) => normalizeCategoryName(category.name)));
  const storedItems = categoriesUIState.categories.map((category) => {
    const key = normalizeCategoryName(category.name);
    const usage = usageMap.get(key);
    const countLabel = usage ? `${usage.count.toLocaleString('ar-SA')} عملية` : 'لا يوجد سجلات';
    const tagMarkup = category.protected ? '<span class="category-manager__tag">افتراضي</span>' : '';
    const deleteDisabled = category.protected ? ' disabled' : '';
    return `
      <li class="category-manager__item" data-category-id="${category.id}">
        <span class="category-pill" style="--category-color:${category.color}">
          <span class="category-pill__dot"></span>${category.name}
        </span>
        <div class="category-manager__meta"><span>${countLabel}</span>${tagMarkup}</div>
        <div class="category-manager__actions">
          <button type="button" data-category-action="edit">تعديل</button>
          <button type="button" data-category-action="delete" class="danger"${deleteDisabled}>حذف</button>
        </div>
      </li>`;
  });

  const missingItems = [];
  usageMap.forEach((usage, key) => {
    if (!storedKeys.has(key)) {
      missingItems.push(`
        <li class="category-manager__item category-manager__item--missing" data-missing-name="${usage.name}">
          <span class="category-pill" data-missing="true" style="--category-color:#94a3b8">
            <span class="category-pill__dot"></span>${usage.name}
          </span>
          <div class="category-manager__meta">${usage.count.toLocaleString('ar-SA')} عملية</div>
          <div class="category-manager__actions">
            <button type="button" data-category-action="adopt">إضافة للتصنيفات</button>
          </div>
        </li>`);
    }
  });

  const markup = [...storedItems, ...missingItems].join('');
  list.innerHTML = markup;
  if (emptyState) emptyState.classList.toggle('is-hidden', markup.length > 0);
}

function resetCategoryManagerForm() {
  const form = document.getElementById('categoryManagerForm');
  if (!form) return;
  form.reset();
  form.dataset.mode = 'create';
  form.dataset.categoryId = '';
  const title = document.getElementById('categoryManagerFormTitle');
  if (title) title.textContent = 'إضافة تصنيف جديد';
}

function startCategoryEdit(categoryId) {
  const form = document.getElementById('categoryManagerForm');
  if (!form) return;
  const category = categoriesUIState.categories.find((item) => item.id === categoryId);
  if (!category) return;
  form.dataset.mode = 'edit';
  form.dataset.categoryId = category.id;
  form.name.value = category.name;
  form.color.value = category.color;
  const title = document.getElementById('categoryManagerFormTitle');
  if (title) title.textContent = 'تعديل التصنيف';
}

function openCategoryManager(categoryId = null, prefillName = null) {
  const modal = document.getElementById('categoryManagerModal');
  if (!modal) return;
  resetCategoryManagerForm();
  if (categoryId) {
    startCategoryEdit(categoryId);
  } else if (prefillName) {
    const form = document.getElementById('categoryManagerForm');
    if (form) {
      form.name.value = prefillName;
      form.dataset.mode = 'create';
    }
  }
  showModal(modal);
}

function closeCategoryManager() {
  const modal = document.getElementById('categoryManagerModal');
  if (!modal) return;
  hideModal(modal);
  resetCategoryManagerForm();
}

async function deleteCategory(categoryId) {
  const category = categoriesUIState.categories.find((item) => item.id === categoryId);
  if (!category) return;
  const normalized = normalizeCategoryName(category.name);
  const isUsed = unifiedFinancialState.expenses.some(
    (expense) => normalizeCategoryName(expense.category || 'مصروفات عامة') === normalized
  );
  if (isUsed) {
    createToast('لا يمكن حذف التصنيف أثناء استخدامه في سجلات المصاريف', 'warning');
    return;
  }
  try {
    await categoriesStore.remove(categoryId);
    createToast('تم حذف التصنيف بنجاح', 'success');
    await loadExpenseCategories(true);
  } catch (error) {
    createToast(error?.message || 'تعذر حذف التصنيف', 'error');
  }
}

function bindCategoryManagerControls() {
  const manageButtons = document.querySelectorAll('[data-action="manage-expense-categories"]');
  manageButtons.forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = 'true';
    button.addEventListener('click', () => openCategoryManager());
  });

  const modal = document.getElementById('categoryManagerModal');
  if (modal && !modal.dataset.bound) {
    modal.dataset.bound = 'true';
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeCategoryManager();
      }
    });
  }

  const list = document.getElementById('categoryManagerList');
  if (list && !list.dataset.bound) {
    list.dataset.bound = 'true';
    list.addEventListener('click', (event) => {
      const actionButton = event.target.closest('button[data-category-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.categoryAction;
      if (action === 'edit') {
        const categoryId = actionButton.closest('[data-category-id]')?.dataset.categoryId;
        if (categoryId) openCategoryManager(categoryId);
        return;
      }
      if (action === 'delete') {
        if (actionButton.disabled) return;
        const categoryId = actionButton.closest('[data-category-id]')?.dataset.categoryId;
        if (categoryId) deleteCategory(categoryId);
        return;
      }
      if (action === 'adopt') {
        const name = actionButton.closest('[data-missing-name]')?.dataset.missingName;
        openCategoryManager(null, name || '');
      }
    });
  }

  const form = document.getElementById('categoryManagerForm');
  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const name = formData.get('name')?.toString().trim();
      const color = formData.get('color')?.toString() || '#6366f1';
      if (!name) {
        createToast('يرجى إدخال اسم التصنيف', 'error');
        return;
      }
      try {
        if (form.dataset.mode === 'edit' && form.dataset.categoryId) {
          await categoriesStore.update(form.dataset.categoryId, { name, color });
          createToast('تم تحديث التصنيف بنجاح', 'success');
        } else {
          await categoriesStore.create({ name, color });
          createToast('تمت إضافة التصنيف بنجاح', 'success');
        }
        await loadExpenseCategories(true);
        closeCategoryManager();
      } catch (error) {
        createToast(error?.message || 'تعذر حفظ التصنيف', 'error');
      }
    });
  }
}

async function loadExpenseCategories(shouldRefresh = false) {
  if (document.body.dataset.page !== 'project-expenses') return;
  const categories = await categoriesStore.list();
  categoriesUIState.categories = categories;
  renderExpenseCategoryOptions();
  renderCategoryManagerList();
  if (shouldRefresh && unifiedFinancialState.projectId) {
    renderUnifiedExpensesUI(unifiedFinancialState.projectId);
  }
}

function renderUnifiedExpensesUI(projectId) {
  const section = document.getElementById('expenses-contracts-section');
  if (!section) return;

  unifiedFinancialState.projectId = projectId;
  const { expenseFilters, expenseSearch, expenseSort } = unifiedFinancialState;
  const expenses = unifiedFinancialState.expenses.filter((item) => item.type !== 'revenue');
  const now = new Date();

  const filtered = expenses.filter((expense) => {
    if (expenseFilters.category && normalizedString(expense.category) !== normalizedString(expenseFilters.category)) {
      return false;
    }
    if (
      expenseFilters.paymentMethod &&
      normalizedString(expense.paymentMethod) !== normalizedString(expenseFilters.paymentMethod)
    ) {
      return false;
    }

    const expenseDate = parseDateValue(expense.date);
    const fromDate = parseDateValue(expenseFilters.dateFrom);
    const toDate = parseDateValue(expenseFilters.dateTo);
    if (fromDate && expenseDate && expenseDate < fromDate) return false;
    if (toDate && expenseDate && expenseDate > toDate) return false;

    if (expenseSearch) {
      const haystack = [expense.title, expense.category, expense.paymentMethod, expense.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(expenseSearch.toLowerCase())) return false;
    }
    return true;
  });

  const valueExtractors = {
    category: (expense) => normalizedString(expense.category),
    title: (expense) => normalizedString(expense.title),
    date: (expense) => parseDateValue(expense.date)?.getTime() || 0,
    amount: (expense) => safeNumber(expense.amount),
    vatPercent: (expense) => safeNumber(expense.vatPercent),
    totalWithVat: (expense) => expenseTotalWithVat(expense),
    paymentMethod: (expense) => normalizedString(expense.paymentMethod),
  };

  const sorted = [...filtered].sort((a, b) => {
    const extractor = valueExtractors[expenseSort.key] || valueExtractors.date;
    const aValue = extractor(a);
    const bValue = extractor(b);
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue, 'ar');
    }
    return aValue - bValue;
  });
  if (expenseSort.direction === 'desc') sorted.reverse();

  const totalAmount = expenses.reduce((sum, item) => sum + safeNumber(item.amount), 0);
  const monthlyAmount = expenses.reduce((sum, item) => {
    const expenseDate = parseDateValue(item.date);
    if (!expenseDate) return sum;
    if (expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()) {
      return sum + safeNumber(item.amount);
    }
    return sum;
  }, 0);
  const averageAmount = expenses.length ? totalAmount / expenses.length : 0;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('expensesTotalAmount', formatCurrency(totalAmount));
  setText('expensesMonthlyAmount', formatCurrency(monthlyAmount));
  setText('expensesCount', expenses.length.toString());
  setText('expensesAverage', formatCurrency(averageAmount));

  const categoryUsage = new Map();
  const filteredTotals = { count: 0, amount: 0, vat: 0, total: 0 };

  sorted.forEach((expense) => {
    const amount = safeNumber(expense.amount);
    const vatPercent = safeNumber(expense.vatPercent);
    const vatValue = (amount * vatPercent) / 100;
    filteredTotals.count += 1;
    filteredTotals.amount += amount;
    filteredTotals.vat += vatValue;
    filteredTotals.total += amount + vatValue;
    const meta = getCategoryMeta(expense.category);
    const key = normalizeCategoryName(meta.name);
    const entry = categoryUsage.get(key) || { name: meta.name, color: meta.color, count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += amount;
    categoryUsage.set(key, entry);
  });

  const tbody = document.getElementById('expensesTableBody');
  if (tbody) {
    tbody.innerHTML = sorted
      .map((expense) => {
        const vatPercent = safeNumber(expense.vatPercent);
        const totalWithVat = expenseTotalWithVat(expense);
        const meta = getCategoryMeta(expense.category);
        return `
      <tr data-expense-id="${expense.id}">
        <td>
          <span class="category-pill" style="--category-color:${meta.color}">
            <span class="category-pill__dot"></span>${meta.name}
          </span>
        </td>
        <td>${expense.title || '—'}</td>
        <td class="text-center">${formatDate(expense.date)}</td>
        <td class="text-center text-nowrap">${formatCurrency(expense.amount)}</td>
        <td class="text-center">${vatPercent.toFixed(2)}</td>
        <td class="text-center text-nowrap">${formatCurrency(totalWithVat)}</td>
        <td class="text-center">${expense.paymentMethod || '—'}</td>
        <td>${expense.notes || '—'}</td>
        <td class="text-center">
          <div class="table-actions">
            <button type="button" data-expense-action="edit">تعديل</button>
            <button type="button" class="table-actions__danger" data-expense-action="delete">حذف</button>
          </div>
        </td>
      </tr>`;
      })
      .join('');
  }

  const totalCountEl = document.getElementById('expensesTableTotalCount');
  if (totalCountEl) totalCountEl.textContent = filteredTotals.count.toLocaleString('ar-SA');
  const totalAmountEl = document.getElementById('expensesTableAmount');
  if (totalAmountEl) totalAmountEl.textContent = formatCurrency(filteredTotals.amount);
  const vatEl = document.getElementById('expensesTableVat');
  if (vatEl) vatEl.textContent = formatCurrency(filteredTotals.vat);
  const grandTotalEl = document.getElementById('expensesTableGrandTotal');
  if (grandTotalEl) grandTotalEl.textContent = formatCurrency(filteredTotals.total);

  const summaryList = document.getElementById('expenseCategorySummary');
  const summaryEmpty = document.getElementById('expenseCategorySummaryEmpty');
  if (summaryList) {
    const summaryItems = Array.from(categoryUsage.values()).sort((a, b) => b.amount - a.amount);
    if (summaryItems.length) {
      summaryList.innerHTML = summaryItems
        .map(
          (item) => `
        <li class="category-summary__item">
          <div class="category-summary__item-info">
            <span class="category-pill" style="--category-color:${item.color}">
              <span class="category-pill__dot"></span>${item.name}
            </span>
            <span class="category-summary__item-meta">${item.count.toLocaleString('ar-SA')} عملية</span>
          </div>
          <div class="category-summary__item-value">${formatCurrency(item.amount)}</div>
        </li>`
        )
        .join('');
      if (summaryEmpty) summaryEmpty.classList.add('is-hidden');
    } else {
      summaryList.innerHTML = '';
      if (summaryEmpty) summaryEmpty.classList.remove('is-hidden');
    }
    const totalLabel = document.getElementById('expenseCategorySummaryTotal');
    if (totalLabel) {
      totalLabel.textContent = `${filteredTotals.count.toLocaleString('ar-SA')} عملية`;
    }
  }

  renderCategoryManagerList();

  const emptyState = document.getElementById('expensesEmptyState');
  if (emptyState) emptyState.classList.toggle('is-hidden', sorted.length > 0);

  const categorySelect = document.getElementById('filterExpenseCategory');
  if (categorySelect && categorySelect.value !== (expenseFilters.category || '')) {
    categorySelect.value = expenseFilters.category || '';
  }
  const paymentSelect = document.getElementById('filterPaymentMethod');
  if (paymentSelect && paymentSelect.value !== (expenseFilters.paymentMethod || '')) {
    paymentSelect.value = expenseFilters.paymentMethod || '';
  }
  const fromInput = document.getElementById('filterDateFrom');
  if (fromInput && fromInput.value !== (expenseFilters.dateFrom || '')) {
    fromInput.value = expenseFilters.dateFrom || '';
  }
  const toInput = document.getElementById('filterDateTo');
  if (toInput && toInput.value !== (expenseFilters.dateTo || '')) {
    toInput.value = expenseFilters.dateTo || '';
  }
  const searchInput = document.getElementById('searchExpenses');
  if (searchInput && searchInput.value !== expenseSearch) {
    searchInput.value = expenseSearch;
  }

  renderCombinedAnalyticsUI();
}

async function renderSubcontracts(projectId) {
  const subcontracts = await subcontractsStore.all(projectId);
  unifiedFinancialState.subcontracts = subcontracts;
  renderSubcontractsUI(projectId);
}

function translateContractStatus(status) {
  switch (status) {
    case 'completed':
      return 'مكتمل';
    case 'pending':
      return 'معلق';
    case 'cancelled':
      return 'ملغي';
    case 'active':
    default:
      return 'نشط';
  }
}

function renderSubcontractsUI(projectId) {
  const section = document.getElementById('subcontracts-main');
  if (!section) return;

  unifiedFinancialState.projectId = projectId;
  const { subcontracts } = unifiedFinancialState;
  const { contractor, status, startDate, endDate } = unifiedFinancialState.subcontractFilters;
  const sortState = unifiedFinancialState.subcontractSort;

  const totals = subcontracts.reduce(
    (acc, item) => {
      const value = safeNumber(item.value);
      const paid = safeNumber(item.paidAmount);
      acc.count += 1;
      acc.totalValue += value;
      acc.paidAmount += paid;
      acc.remainingAmount += Math.max(0, value - paid);
      return acc;
    },
    { count: 0, totalValue: 0, paidAmount: 0, remainingAmount: 0 }
  );

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('subcontractsCount', totals.count.toString());
  setText('subcontractsTotalValue', formatCurrency(totals.totalValue));
  setText('subcontractsPaidAmount', formatCurrency(totals.paidAmount));
  setText('subcontractsRemainingAmount', formatCurrency(totals.remainingAmount));

  const contractorSelect = document.getElementById('filterContractor');
  if (contractorSelect) {
    const uniqueContractors = Array.from(
      new Set(subcontracts.map((item) => item.contractorName).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'ar'));
    contractorSelect.innerHTML = ['<option value>جميع المقاولين</option>', ...uniqueContractors.map((name) => `<option value="${name}">${name}</option>`)].join('');
    contractorSelect.value = contractor || '';
  }

  const statusSelect = document.getElementById('filterContractStatus');
  if (statusSelect) statusSelect.value = status || '';

  const startInput = document.getElementById('filterContractStartDate');
  if (startInput && startInput.value !== (startDate || '')) startInput.value = startDate || '';
  const endInput = document.getElementById('filterContractEndDate');
  if (endInput && endInput.value !== (endDate || '')) endInput.value = endDate || '';

  let filtered = [...subcontracts];
  if (contractor) {
    filtered = filtered.filter((item) => normalizedString(item.contractorName) === normalizedString(contractor));
  }
  if (status) {
    filtered = filtered.filter((item) => item.status === status);
  }
  const startBoundary = parseDateValue(startDate);
  const endBoundary = parseDateValue(endDate);
  if (startBoundary) {
    filtered = filtered.filter((item) => {
      const itemStart = parseDateValue(item.startDate);
      return !itemStart || itemStart >= startBoundary;
    });
  }
  if (endBoundary) {
    filtered = filtered.filter((item) => {
      const itemEnd = parseDateValue(item.endDate || item.startDate);
      return !itemEnd || itemEnd <= endBoundary;
    });
  }

  const valueExtractors = {
    contractorName: (item) => normalizedString(item.contractorName),
    contractTitle: (item) => normalizedString(item.contractTitle),
    value: (item) => safeNumber(item.value),
    startDate: (item) => parseDateValue(item.startDate)?.getTime() || 0,
    endDate: (item) => parseDateValue(item.endDate)?.getTime() || 0,
    paidAmount: (item) => safeNumber(item.paidAmount),
    remainingAmount: (item) => Math.max(0, safeNumber(item.value) - safeNumber(item.paidAmount)),
    status: (item) => normalizedString(item.status),
  };

  const sorted = filtered.sort((a, b) => {
    const extractor = valueExtractors[sortState.key] || valueExtractors.startDate;
    const aValue = extractor(a);
    const bValue = extractor(b);
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue, 'ar');
    }
    return aValue - bValue;
  });
  if (sortState.direction === 'desc') sorted.reverse();

  const tbody = document.getElementById('subcontractsTableBody');
  if (tbody) {
    tbody.innerHTML = sorted
      .map((contract) => {
        const remaining = Math.max(0, safeNumber(contract.value) - safeNumber(contract.paidAmount));
        return `
      <tr data-subcontract-id="${contract.id}">
        <td>${contract.contractorName || '—'}</td>
        <td>${contract.contractTitle || '—'}</td>
        <td class="text-center text-nowrap">${formatCurrency(contract.value)}</td>
        <td class="text-center">${formatDate(contract.startDate)}</td>
        <td class="text-center">${formatDate(contract.endDate)}</td>
        <td class="text-center text-nowrap">${formatCurrency(contract.paidAmount)}</td>
        <td class="text-center text-nowrap">${formatCurrency(remaining)}</td>
        <td class="text-center">${translateContractStatus(contract.status)}</td>
        <td class="text-center">
          <div class="table-actions">
            <button type="button" data-subcontract-action="edit">تعديل</button>
            <button type="button" class="table-actions__danger" data-subcontract-action="delete">حذف</button>
          </div>
        </td>
      </tr>`;
      })
      .join('');
  }

  const filteredSummary = sorted.reduce(
    (acc, contract) => {
      const value = safeNumber(contract.value);
      const paid = safeNumber(contract.paidAmount);
      acc.count += 1;
      acc.total += value;
      acc.paid += paid;
      acc.remaining += Math.max(0, value - paid);
      return acc;
    },
    { count: 0, total: 0, paid: 0, remaining: 0 }
  );
  const setFooterValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setFooterValue('subcontractsTableCount', filteredSummary.count.toLocaleString('ar-SA'));
  setFooterValue('subcontractsTableValue', formatCurrency(filteredSummary.total));
  setFooterValue('subcontractsTablePaid', formatCurrency(filteredSummary.paid));
  setFooterValue('subcontractsTableRemaining', formatCurrency(filteredSummary.remaining));

  const emptyState = document.getElementById('subcontractsEmptyState');
  if (emptyState) emptyState.classList.toggle('is-hidden', sorted.length > 0);

  renderCombinedAnalyticsUI();
}

function aggregateByMonth(items, dateField, amountField) {
  const buckets = new Map();
  items.forEach((item) => {
    const date = parseDateValue(item[dateField]);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, (buckets.get(key) || 0) + safeNumber(item[amountField]));
  });
  return buckets;
}

function formatMonthKey(key) {
  const [year, month] = key.split('-').map((part) => Number(part));
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' });
}

function toQuarterKey(monthKey) {
  const [year, month] = monthKey.split('-').map((part) => Number(part));
  const quarter = Math.floor((month - 1) / 3) + 1;
  return `${year}-Q${quarter}`;
}

function formatQuarterKey(key) {
  const [yearPart, quarterPart] = key.split('-Q');
  const labels = ['الأول', 'الثاني', 'الثالث', 'الرابع'];
  const quarterIndex = Number(quarterPart) - 1;
  const quarterLabel = labels[quarterIndex] || quarterPart;
  return `الربع ${quarterLabel} ${yearPart}`;
}

function buildTimelineSeries(view, monthlyExpenses, monthlyContracts) {
  if (view === 'quarterly') {
    const expenseBuckets = new Map();
    monthlyExpenses.forEach((value, key) => {
      const quarterKey = toQuarterKey(key);
      expenseBuckets.set(quarterKey, (expenseBuckets.get(quarterKey) || 0) + value);
    });
    const contractBuckets = new Map();
    monthlyContracts.forEach((value, key) => {
      const quarterKey = toQuarterKey(key);
      contractBuckets.set(quarterKey, (contractBuckets.get(quarterKey) || 0) + value);
    });
    const keys = Array.from(new Set([...expenseBuckets.keys(), ...contractBuckets.keys()])).sort();
    const limited = keys.slice(-4);
    return {
      labels: limited.map((key) => formatQuarterKey(key)),
      expenses: limited.map((key) => expenseBuckets.get(key) || 0),
      contracts: limited.map((key) => contractBuckets.get(key) || 0),
    };
  }

  const keys = Array.from(new Set([...monthlyExpenses.keys(), ...monthlyContracts.keys()])).sort();
  const limited = keys.slice(-6);
  return {
    labels: limited.map((key) => formatMonthKey(key)),
    expenses: limited.map((key) => monthlyExpenses.get(key) || 0),
    contracts: limited.map((key) => monthlyContracts.get(key) || 0),
  };
}

function ensureChartInstance(chartKey, canvasId, configFactory, registry = unifiedFinancialState.charts) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const config = typeof configFactory === 'function' ? configFactory(context) : configFactory;
  if (!config) return;
  if (registry[chartKey]) {
    registry[chartKey].destroy();
  }
  registry[chartKey] = new Chart(context, config);
}

function updateMonthlyComparisonChart(labels, expensesData, contractsData) {
  ensureChartInstance('monthlyComparison', 'monthlyComparisonChart', () => ({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'المصاريف',
          data: expensesData,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderRadius: 8,
        },
        {
          label: 'عقود الباطن',
          data: contractsData,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Cairo, sans-serif' } },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#f1f5f9' } },
      },
    },
  }));
}

function updateExpenseVsContractsChart(expenseTotal, contractTotal) {
  ensureChartInstance('expenseVsContracts', 'expenseVsContractsPieChart', () => ({
    type: 'doughnut',
    data: {
      labels: ['المصاريف', 'عقود الباطن'],
      datasets: [
        {
          data: [expenseTotal, contractTotal],
          backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(59, 130, 246, 0.8)'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Cairo, sans-serif' } },
        },
      },
    },
  }));
}

function updateTimelineChart(labels, expensesData, contractsData) {
  ensureChartInstance('timeline', 'timelineChart', () => ({
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'المصاريف',
          data: expensesData,
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          tension: 0.4,
          fill: true,
          pointRadius: 3,
        },
        {
          label: 'عقود الباطن',
          data: contractsData,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          tension: 0.4,
          fill: true,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Cairo, sans-serif' } },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#f1f5f9' } },
      },
    },
  }));
}

function renderCombinedAnalyticsUI() {
  const analyticsSection = document.getElementById('combined-analytics');
  if (!analyticsSection) return;

  const expenses = unifiedFinancialState.expenses.filter((item) => item.type !== 'revenue');
  const subcontracts = unifiedFinancialState.subcontracts;

  const expensesTotal = expenses.reduce((sum, item) => sum + safeNumber(item.amount), 0);
  const contractsTotal = subcontracts.reduce((sum, item) => sum + safeNumber(item.value), 0);
  const contractsPaid = subcontracts.reduce((sum, item) => sum + safeNumber(item.paidAmount), 0);
  const ratioValue = expensesTotal ? (contractsTotal / expensesTotal) * 100 : 0;
  const totalSpend = expensesTotal + contractsPaid;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('combinedExpensesTotal', formatCurrency(expensesTotal));
  setText('combinedContractsTotal', formatCurrency(contractsTotal));
  setText('combinedRatio', formatPercent(ratioValue));
  setText('combinedTotalSpend', formatCurrency(totalSpend));

  const monthlyExpenses = aggregateByMonth(expenses, 'date', 'amount');
  const monthlyContracts = aggregateByMonth(subcontracts, 'startDate', 'value');
  const monthKeys = Array.from(new Set([...monthlyExpenses.keys(), ...monthlyContracts.keys()])).sort();
  const limitedMonthKeys = monthKeys.slice(-6);
  const monthlyLabels = limitedMonthKeys.map((key) => formatMonthKey(key));
  const monthlyExpenseSeries = limitedMonthKeys.map((key) => monthlyExpenses.get(key) || 0);
  const monthlyContractSeries = limitedMonthKeys.map((key) => monthlyContracts.get(key) || 0);

  updateMonthlyComparisonChart(monthlyLabels, monthlyExpenseSeries, monthlyContractSeries);
  updateExpenseVsContractsChart(expensesTotal, contractsTotal);

  const timeline = buildTimelineSeries(unifiedFinancialState.timelineView, monthlyExpenses, monthlyContracts);
  updateTimelineChart(timeline.labels, timeline.expenses, timeline.contracts);

  analyticsSection.querySelectorAll('[data-timeline-view]').forEach((button) => {
    const isActive = button.dataset.timelineView === unifiedFinancialState.timelineView;
    button.classList.toggle('btn-secondary', isActive);
    button.classList.toggle('btn-ghost', !isActive);
  });
}

async function renderPayments(projectId) {
  const [payments, project] = await Promise.all([
    paymentsStore.all(projectId),
    projectStore.getById(projectId),
  ]);

  paymentsUIState.projectId = projectId;
  paymentsUIState.payments = payments;
  paymentsUIState.projectValue = safeNumber(project?.contractValue || project?.budget || project?.revenue || 0);

  renderLegacyPaymentsList(payments);
  renderPaymentsDashboardUI();

  const totals = await paymentsStore.totals(projectId);
  const paymentsTotalEl = document.querySelector('[data-payments-total]');
  if (paymentsTotalEl) paymentsTotalEl.textContent = formatCurrency(totals.totalScheduled);

  const paymentsPaidEl = document.querySelector('[data-payments-paid]');
  if (paymentsPaidEl) paymentsPaidEl.textContent = formatCurrency(totals.totalPaid);

  const paymentsOverdueEl = document.querySelector('[data-payments-overdue]');
  if (paymentsOverdueEl) paymentsOverdueEl.textContent = totals.overdue;
  const paymentsCountEl = document.querySelector('[data-payments-count]');
  if (paymentsCountEl) paymentsCountEl.textContent = totals.count;

  return payments;
}

function renderLegacyPaymentsList(payments) {
  const list = document.querySelector('[data-payments-list]');
  if (!list) return;
  list.innerHTML = payments.length
    ? payments
        .map(
          (item) => `
      <div class="payment-card" data-payment-id="${item.id}">
        <div class="payment-card__header">
          <h4>${item.title}</h4>
          <span class="badge badge-outline">${getPaymentStatusLabel(item.status)}</span>
        </div>
        <div class="payment-card__meta">
          <span><i class="fas fa-calendar"></i> ${formatDate(item.dueDate)}</span>
          <span><i class="fas fa-sack-dollar"></i> ${formatCurrency(item.amount)}</span>
        </div>
        <div class="payment-card__actions">
          <button class="btn btn-text" data-action="mark-paid">تحديد كمدفوع</button>
          <button class="btn btn-text danger" data-action="delete-payment">حذف</button>
        </div>
      </div>`
        )
        .join('')
    : '<div class="empty-state">لا توجد دفعات مسجلة.</div>';
}

function renderPaymentsDashboardUI() {
  const section = document.getElementById('payments-management-section');
  if (!section) return;

  const filtered = getFilteredPayments();
  const sorted = sortPaymentsByState(filtered);
  const overallMetrics = computePaymentMetrics(paymentsUIState.payments);
  const filteredMetrics = computePaymentMetrics(filtered);

  renderPaymentsKPIs(overallMetrics);
  renderPaymentsProgress(overallMetrics);
  renderPaymentsTable(sorted, overallMetrics);
  updatePaymentsTimelineButtons();
  renderPaymentsTimeline(sorted);
  updatePaymentsCharts(filtered, filteredMetrics);
}

function getFilteredPayments() {
  const { filters, payments } = paymentsUIState;
  return payments.filter((payment) => {
    const type = normalizePaymentType(payment);
    const status = payment.status || 'scheduled';
    if (filters.type && filters.type !== type) return false;
    if (filters.status && filters.status !== status) return false;
    if (filters.period && !matchesPaymentPeriod(payment, filters.period)) return false;
    return true;
  });
}

function sortPaymentsByState(payments) {
  const { sort } = paymentsUIState;
  const sorted = [...payments];
  sorted.sort((a, b) => {
    const aValue = getPaymentSortValue(a, sort.key);
    const bValue = getPaymentSortValue(b, sort.key);
    if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
}

function getPaymentSortValue(payment, key) {
  switch (key) {
    case 'paymentNumber':
      return normalizedString(payment.paymentNumber || payment.id);
    case 'party':
      return normalizedString(payment.party);
    case 'dueDate': {
      const date = parseDateValue(getPaymentDateValue(payment));
      return date ? date.getTime() : 0;
    }
    case 'status':
      return normalizedString(payment.status || 'scheduled');
    case 'amount':
    default:
      return safeNumber(payment.amount);
  }
}

function matchesPaymentPeriod(payment, period) {
  const date = parseDateValue(getPaymentDateValue(payment));
  if (!date) return false;
  const now = new Date();
  if (period === 'this-month') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }
  if (period === 'this-year') {
    return date.getFullYear() === now.getFullYear();
  }
  if (period === 'this-quarter') {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const paymentQuarter = Math.floor(date.getMonth() / 3);
    return date.getFullYear() === now.getFullYear() && paymentQuarter === currentQuarter;
  }
  return true;
}

function getPaymentDateValue(payment) {
  return payment.dueDate || payment.paidAt || payment.createdAt;
}

function normalizePaymentType(payment) {
  return (payment.type || 'incoming').toLowerCase() === 'outgoing' ? 'outgoing' : 'incoming';
}

function computePaymentMetrics(payments) {
  const metrics = {
    incomingTotal: 0,
    incomingPaid: 0,
    incomingPending: 0,
    outgoingTotal: 0,
    totalPaid: 0,
    statusTotals: { paid: 0, scheduled: 0, overdue: 0 },
  };

  payments.forEach((payment) => {
    const amount = safeNumber(payment.amount);
    const status = payment.status || 'scheduled';
    const type = normalizePaymentType(payment);
    metrics.statusTotals[status] = (metrics.statusTotals[status] || 0) + amount;
    if (status === 'paid') {
      metrics.totalPaid += amount;
    }
    if (type === 'incoming') {
      metrics.incomingTotal += amount;
      if (status === 'paid') {
        metrics.incomingPaid += amount;
      }
    } else {
      metrics.outgoingTotal += amount;
    }
  });

  metrics.incomingPending = Math.max(metrics.incomingTotal - metrics.incomingPaid, 0);
  const targetAmount = paymentsUIState.projectValue || metrics.incomingTotal;
  metrics.targetAmount = targetAmount;
  metrics.remainingToTarget = Math.max(targetAmount - metrics.incomingPaid, 0);
  metrics.collectionRatio = metrics.incomingTotal ? percentage(metrics.incomingPaid, metrics.incomingTotal) : 0;
  metrics.progressPercent = targetAmount ? percentage(metrics.incomingPaid, targetAmount) : 0;
  return metrics;
}

function renderPaymentsKPIs(metrics) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('kpiReceivedPaymentsTotal', formatCurrency(metrics.incomingPaid));
  setText('kpiRemainingPayments', formatCurrency(metrics.incomingPending));
  setText('kpiSubcontractorPayments', formatCurrency(metrics.outgoingTotal));
  setText('kpiCollectionRatio', formatPercent(metrics.collectionRatio));
}

function renderPaymentsProgress(metrics) {
  const percentLabel = formatPercent(metrics.progressPercent);
  const percentValue = `${metrics.progressPercent}%`;
  const percentEl = document.getElementById('financialProgressPercent');
  if (percentEl) percentEl.textContent = percentLabel;
  const barEl = document.getElementById('financialProgressBar');
  if (barEl) barEl.style.width = percentValue;
  const barText = document.getElementById('financialProgressText');
  if (barText) barText.textContent = percentLabel;
  const totalValueEl = document.getElementById('totalProjectValue');
  if (totalValueEl) totalValueEl.textContent = formatCurrency(metrics.targetAmount);
  const collectedEl = document.getElementById('collectedAmount');
  if (collectedEl) collectedEl.textContent = formatCurrency(metrics.incomingPaid);
  const remainingEl = document.getElementById('remainingCollectionAmount');
  if (remainingEl) remainingEl.textContent = formatCurrency(metrics.remainingToTarget);
}

function getPaymentStatusLabel(status) {
  switch (status) {
    case 'paid':
      return 'مستلمة';
    case 'overdue':
      return 'متأخرة';
    default:
      return 'مستحقة';
  }
}

function getPaymentStatusBadge(status) {
  const label = getPaymentStatusLabel(status);
  if (status === 'paid') {
    return '<span class="badge badge-success">' + label + '</span>';
  }
  if (status === 'overdue') {
    return '<span class="badge badge-danger">' + label + '</span>';
  }
  return '<span class="badge badge-warning">' + label + '</span>';
}

function renderPaymentsTable(payments, metrics) {
  const body = document.getElementById('paymentsTableBody');
  const emptyState = document.getElementById('paymentsEmptyState');
  if (!body) return;

  if (!payments.length) {
    body.innerHTML = '';
    if (emptyState) emptyState.classList.remove('is-hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('is-hidden');
  const targetAmount = metrics.targetAmount || 0;

  body.innerHTML = payments
    .map((payment) => {
      const paymentNumber = payment.paymentNumber || payment.id;
      const party = payment.party || '—';
      const paymentDate = formatDate(getPaymentDateValue(payment));
      const amount = formatCurrency(payment.amount);
      const statusBadge = getPaymentStatusBadge(payment.status || 'scheduled');
      const percent = targetAmount ? formatPercent(percentage(safeNumber(payment.amount), targetAmount)) : '0%';
      const attachment = payment.attachmentUrl
        ? `<a href="${payment.attachmentUrl}" target="_blank" rel="noopener" class="text-link">عرض</a>`
        : '—';
      const notes = [];
      if (payment.notes) notes.push(`<div>${payment.notes}</div>`);
      if (payment.paymentMethod) {
        notes.push(`<div class="table-subtext text-muted">وسيلة الدفع: ${payment.paymentMethod}</div>`);
      }
      const notesCell = notes.length ? notes.join('') : '—';
      const type = normalizePaymentType(payment);
      const typeBadgeLabel = type === 'incoming' ? 'من العميل' : 'لمقاول باطن';
      const typeBadge = `<span class="badge ${type === 'incoming' ? 'badge-success' : 'badge-primary'}">${typeBadgeLabel}</span>`;
      const actions = [
        '<button type="button" data-payment-action="edit">تعديل</button>',
        payment.status === 'paid'
          ? ''
          : '<button type="button" data-payment-action="mark-paid">تحصيل</button>',
        '<button type="button" class="table-actions__danger" data-payment-action="delete">حذف</button>',
      ].filter(Boolean);

      return `
      <tr data-payment-id="${payment.id}">
        <td>${paymentNumber}</td>
        <td>
          <div>${party}</div>
          <div class="table-subtext text-muted">${typeBadge}</div>
        </td>
        <td class="text-center">${paymentDate}</td>
        <td class="text-center text-nowrap">${amount}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center">${percent}</td>
        <td class="text-center">${attachment}</td>
        <td>${notesCell}</td>
        <td class="text-center">
          <div class="table-actions">${actions.join('')}</div>
        </td>
      </tr>`;
    })
    .join('');

  const summary = payments.reduce(
    (acc, payment) => {
      const amount = safeNumber(payment.amount);
      acc.count += 1;
      acc.total += amount;
      if ((payment.status || 'scheduled') === 'paid') {
        acc.paid += amount;
      }
      return acc;
    },
    { count: 0, total: 0, paid: 0 }
  );
  const pending = Math.max(0, summary.total - summary.paid);
  const setFooterValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setFooterValue('paymentsTableCount', summary.count.toLocaleString('ar-SA'));
  setFooterValue('paymentsTableTotalAmount', formatCurrency(summary.total));
  setFooterValue('paymentsTablePaidAmount', formatCurrency(summary.paid));
  setFooterValue('paymentsTablePendingAmount', formatCurrency(pending));
}

function paymentStatusColor(status) {
  if (status === 'paid') return 'var(--success)';
  if (status === 'overdue') return 'var(--danger)';
  return 'var(--warning)';
}

function renderPaymentsTimeline(payments) {
  const container = document.getElementById('paymentsTimeline');
  if (!container) return;
  if (!payments.length) {
    container.innerHTML = '<div class="text-center text-muted">لا توجد دفعات ضمن المرشحات الحالية.</div>';
    return;
  }

  const view = paymentsUIState.timelineView;
  const groups = new Map();

  payments.forEach((payment) => {
    const date = parseDateValue(getPaymentDateValue(payment));
    if (!date) return;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const key = view === 'quarterly' ? toQuarterKey(monthKey) : monthKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(payment);
  });

  const sortedKeys = Array.from(groups.keys()).sort();
  const limit = view === 'quarterly' ? 4 : 6;
  const visibleKeys = sortedKeys.slice(-limit);

  container.innerHTML = visibleKeys
    .map((key) => {
      const paymentsInGroup = groups.get(key) || [];
      paymentsInGroup.sort((a, b) => getPaymentSortValue(a, 'dueDate') - getPaymentSortValue(b, 'dueDate'));
      const groupTotal = paymentsInGroup.reduce((sum, payment) => sum + safeNumber(payment.amount), 0);
      const label = view === 'quarterly' ? formatQuarterKey(key) : formatMonthKey(key);
      const items = paymentsInGroup
        .map((payment) => {
          const status = payment.status || 'scheduled';
          const dotColor = paymentStatusColor(status);
          return `
        <div class="timeline-item">
          <div class="timeline-item__meta">
            <span class="timeline-item__dot" style="background:${dotColor};"></span>
            <div class="timeline-item__details">
              <p>${payment.title || payment.paymentNumber || 'دفعة'}</p>
              <p class="table-subtext text-muted">${formatDate(getPaymentDateValue(payment))} · ${payment.party || '—'}</p>
            </div>
          </div>
          <div class="timeline-item__amount">${formatCurrency(payment.amount)}</div>
        </div>`;
        })
        .join('');
      return `
      <article class="timeline-group">
        <div class="timeline-group__header">
          <div>
            <h4>${label}</h4>
            <span class="table-subtext text-muted">إجمالي المجموعة ${formatCurrency(groupTotal)}</span>
          </div>
        </div>
        <div class="timeline-stack">${items}</div>
      </article>`;
    })
    .join('');
}

function updatePaymentsCharts(payments, metrics) {
  const monthlyBuckets = aggregateByMonth(payments, 'dueDate', 'amount');
  const monthKeys = Array.from(monthlyBuckets.keys()).sort();
  const limitedKeys = monthKeys.slice(-6);
  const labels = limitedKeys.map((key) => formatMonthKey(key));
  const values = limitedKeys.map((key) => monthlyBuckets.get(key) || 0);

  ensureChartInstance(
    'paymentsMonthly',
    'monthlyPaymentsChart',
    () => ({
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'قيمة الدفعات',
            data: values,
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: '#f1f5f9' } },
        },
      },
    }),
    paymentsUIState.charts
  );

  const statusOrder = ['paid', 'scheduled', 'overdue'];
  const statusLabels = statusOrder.map((status) => getPaymentStatusLabel(status));
  const statusData = statusOrder.map((status) => metrics.statusTotals[status] || 0);

  ensureChartInstance(
    'paymentsStatus',
    'paymentStatusChart',
    () => ({
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [
          {
            data: statusData,
            backgroundColor: ['rgba(34, 197, 94, 0.85)', 'rgba(250, 204, 21, 0.85)', 'rgba(239, 68, 68, 0.85)'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Cairo, sans-serif' } },
          },
        },
      },
    }),
    paymentsUIState.charts
  );
}

function applyPaymentFilters() {
  const typeSelect = document.getElementById('filterPaymentType');
  const statusSelect = document.getElementById('filterPaymentStatus');
  const periodSelect = document.getElementById('filterPaymentPeriod');
  paymentsUIState.filters = {
    type: typeSelect?.value || '',
    status: statusSelect?.value || '',
    period: periodSelect?.value || '',
  };
  renderPaymentsDashboardUI();
}

function clearPaymentFilters() {
  paymentsUIState.filters = { type: '', status: '', period: '' };
  const typeSelect = document.getElementById('filterPaymentType');
  const statusSelect = document.getElementById('filterPaymentStatus');
  const periodSelect = document.getElementById('filterPaymentPeriod');
  if (typeSelect) typeSelect.value = '';
  if (statusSelect) statusSelect.value = '';
  if (periodSelect) periodSelect.value = '';
  renderPaymentsDashboardUI();
}

function sortPaymentTable(key) {
  if (paymentsUIState.sort.key === key) {
    paymentsUIState.sort.direction = paymentsUIState.sort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    paymentsUIState.sort.key = key;
    paymentsUIState.sort.direction = key === 'amount' || key === 'dueDate' ? 'desc' : 'asc';
  }
  renderPaymentsDashboardUI();
}

function updatePaymentsTimelineButtons() {
  const buttons = document.querySelectorAll('[data-payments-timeline]');
  buttons.forEach((button) => {
    const isActive = button.dataset.paymentsTimeline === paymentsUIState.timelineView;
    button.classList.toggle('btn-secondary', isActive);
    button.classList.toggle('btn-ghost', !isActive);
  });
}

function switchPaymentsTimelineView(view) {
  paymentsUIState.timelineView = view;
  updatePaymentsTimelineButtons();
  renderPaymentsTimeline(sortPaymentsByState(getFilteredPayments()));
}

function refreshPaymentsTimeline() {
  renderPaymentsTimeline(sortPaymentsByState(getFilteredPayments()));
  createToast('تم تحديث التحليل الزمني للدفعات', 'success');
}

function exportFinancialReport() {
  createToast('ميزة تصدير التقرير قيد التطوير حالياً', 'warning');
}

function openAddPaymentModal(payment = null) {
  const modal = document.getElementById('paymentModal');
  const form = document.getElementById('paymentModalForm');
  const titleEl = document.getElementById('paymentModalTitle');
  if (!modal || !form) return;

  form.reset();
  paymentsUIState.editingPaymentId = payment?.id || null;
  if (titleEl) titleEl.textContent = payment ? 'تعديل الدفعة' : 'إضافة دفعة';

  if (payment) {
    if (form.paymentNumber) form.paymentNumber.value = payment.paymentNumber || '';
    if (form.title) form.title.value = payment.title || '';
    if (form.party) form.party.value = payment.party || '';
    if (form.type) form.type.value = normalizePaymentType(payment);
    if (form.amount) form.amount.value = safeNumber(payment.amount);
    if (form.dueDate) form.dueDate.value = payment.dueDate ? payment.dueDate.slice(0, 10) : '';
    if (form.status) form.status.value = payment.status || 'scheduled';
    if (form.paymentMethod) form.paymentMethod.value = payment.paymentMethod || 'تحويل بنكي';
    if (form.attachmentUrl) form.attachmentUrl.value = payment.attachmentUrl || '';
    if (form.notes) form.notes.value = payment.notes || '';
  }

  showModal(modal);
}

function closePaymentModal() {
  paymentsUIState.editingPaymentId = null;
  const modal = document.getElementById('paymentModal');
  const form = document.getElementById('paymentModalForm');
  if (form) form.reset();
  hideModal(modal);
}

function bindPaymentModalForm(projectId) {
  const form = document.getElementById('paymentModalForm');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      paymentNumber: formData.get('paymentNumber')?.toString().trim() || '',
      title: formData.get('title')?.toString().trim() || 'دفعة',
      party: formData.get('party')?.toString().trim() || '',
      type: mapPaymentTypeValue(formData.get('type')),
      amount: safeNumber(formData.get('amount')),
      dueDate: formData.get('dueDate')?.toString() || '',
      status: mapPaymentStatusValue(formData.get('status')),
      paymentMethod: formData.get('paymentMethod')?.toString().trim() || 'تحويل بنكي',
      attachmentUrl: formData.get('attachmentUrl')?.toString().trim() || '',
      notes: formData.get('notes')?.toString().trim() || '',
    };

    if (paymentsUIState.editingPaymentId) {
      await paymentsStore.update(projectId, paymentsUIState.editingPaymentId, payload);
      createToast('تم تحديث بيانات الدفعة', 'success');
    } else {
      await paymentsStore.create(projectId, payload);
      createToast('تمت إضافة الدفعة بنجاح', 'success');
    }

    closePaymentModal();
    await renderPayments(projectId);
    const totals = await paymentsStore.totals(projectId);
    const expenses = await expensesStore.totals(projectId);
    await projectStore.updateFinancials(projectId, {
      expensesTotal: expenses.expensesTotal,
      paymentsTotal: totals.totalPaid,
      revenue: expenses.revenueTotal,
    });
    await renderProjectSummary(projectId);
  });
}

function bindPaymentsTableActions(projectId) {
  const tableBody = document.getElementById('paymentsTableBody');
  if (!tableBody || tableBody.dataset.bound) return;
  tableBody.dataset.bound = 'true';
  tableBody.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('button[data-payment-action]');
    if (!actionButton) return;
    const row = actionButton.closest('tr[data-payment-id]');
    if (!row) return;
    const paymentId = row.dataset.paymentId;
    const action = actionButton.dataset.paymentAction;

    if (action === 'edit') {
      const payment = paymentsUIState.payments.find((item) => item.id === paymentId);
      if (!payment) return;
      openAddPaymentModal(payment);
      return;
    }

    if (action === 'mark-paid') {
      await paymentsStore.update(projectId, paymentId, { status: 'paid', paidAt: new Date().toISOString() });
      createToast('تم تحديد الدفعة كمستلمة', 'success');
    }

    if (action === 'delete') {
      if (!confirm('هل ترغب في حذف هذه الدفعة؟')) return;
      await paymentsStore.remove(projectId, paymentId);
      createToast('تم حذف الدفعة بنجاح', 'success');
    }

    await renderPayments(projectId);
    const totals = await paymentsStore.totals(projectId);
    const expenses = await expensesStore.totals(projectId);
    await projectStore.updateFinancials(projectId, {
      expensesTotal: expenses.expensesTotal,
      paymentsTotal: totals.totalPaid,
      revenue: expenses.revenueTotal,
    });
    await renderProjectSummary(projectId);
  });
}

function importPaymentsCSV() {
  const { projectId } = paymentsUIState;
  if (!projectId) {
    createToast('لم يتم تحديد مشروع نشط', 'warning');
    return;
  }

  if (!paymentsUIState.csvInput) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.classList.add('hidden');
    input.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await importPaymentsFromCSVText(projectId, text);
        createToast('تم استيراد الدفعات من الملف', 'success');
      } catch (error) {
        console.error(error);
        if (error?.message === 'no-records') {
          createToast('لم يتم العثور على بيانات صالحة في الملف', 'warning');
        } else {
          createToast('تعذر استيراد الملف. يرجى التحقق من الصيغة.', 'error');
        }
      } finally {
        event.target.value = '';
      }
    });
    document.body.appendChild(input);
    paymentsUIState.csvInput = input;
  }

  paymentsUIState.csvInput.value = '';
  paymentsUIState.csvInput.click();
}

async function importPaymentsFromCSVText(projectId, csvText) {
  const rows = csvText
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (rows.length <= 1) {
    throw new Error('no-records');
  }

  const headers = parseCSVLine(rows[0]).map((header) => normalizedString(header).replace(/\s+/g, ''));

  const created = [];
  for (let i = 1; i < rows.length; i += 1) {
    const values = parseCSVLine(rows[i]);
    if (!values.some((value) => value && value.trim())) continue;

    const getValue = (key, fallbackKey) => {
      const normalizedKey = normalizedString(key).replace(/\s+/g, '');
      const normalizedFallback = fallbackKey ? normalizedString(fallbackKey).replace(/\s+/g, '') : '';
      const index = headers.indexOf(normalizedKey);
      const fallbackIndex = fallbackKey ? headers.indexOf(normalizedFallback) : -1;
      const valueIndex = index !== -1 ? index : fallbackIndex;
      if (valueIndex === -1) return '';
      return values[valueIndex]?.trim() || '';
    };

    const payload = {
      paymentNumber: getValue('paymentnumber', 'رقم الدفعة'),
      title: getValue('title', 'العنوان') || 'دفعة',
      party: getValue('party', 'الجهة'),
      type: mapPaymentTypeValue(getValue('type', 'النوع')),
      amount: safeNumber(getValue('amount', 'القيمة')),
      dueDate: getValue('duedate', 'تاريخ الاستحقاق'),
      status: mapPaymentStatusValue(getValue('status', 'الحالة')),
      paymentMethod: getValue('paymentmethod', 'وسيلة الدفع') || 'تحويل بنكي',
      notes: getValue('notes', 'ملاحظات'),
      attachmentUrl: getValue('attachment', 'المرفق'),
    };

    if (!payload.amount && !payload.title) continue;

    await paymentsStore.create(projectId, payload);
    created.push(payload);
  }

  if (!created.length) {
    throw new Error('no-records');
  }

  await renderPayments(projectId);
  const totals = await paymentsStore.totals(projectId);
  const expenses = await expensesStore.totals(projectId);
  await projectStore.updateFinancials(projectId, {
    expensesTotal: expenses.expensesTotal,
    paymentsTotal: totals.totalPaid,
    revenue: expenses.revenueTotal,
  });
  await renderProjectSummary(projectId);
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function mapPaymentStatusValue(value) {
  const normalized = normalizedString(value);
  if (!normalized) return 'scheduled';
  if (
    normalized.includes('paid') ||
    normalized.includes('استلم') ||
    normalized.includes('مدفوع') ||
    normalized.includes('received')
  )
    return 'paid';
  if (normalized.includes('overdue') || normalized.includes('متأخ')) return 'overdue';
  if (normalized.includes('pending') || normalized.includes('معلق')) return 'scheduled';
  return 'scheduled';
}

function mapPaymentTypeValue(value) {
  const normalized = normalizedString(value);
  if (normalized.includes('out') || normalized.includes('باطن') || normalized.includes('مقاول')) return 'outgoing';
  return 'incoming';
}

async function renderReports(projectId) {
  const list = document.querySelector('[data-reports-list]');
  if (!list) return;
  const reports = await reportsStore.all(projectId);
  const observer = lazyImageObserver();
  list.innerHTML = reports.length
    ? reports
        .map(
          (report) => `
      <article class="report-card" data-report-id="${report.id}">
        <header>
          <h4>${report.title}</h4>
          <span>${formatDate(report.date)}</span>
        </header>
        <p>${report.summary || ''}</p>
        <footer>
          <span>${formatPercent(report.progress || 0)}</span>
          <div class="report-gallery">
            ${(report.photos || [])
              .map((photo) => `<img data-src="${photo}" alt="${report.title}" class="report-photo" loading="lazy" />`)
              .join('')}
          </div>
          <div class="report-actions">
            <button class="btn btn-text" data-action="edit-report">تعديل</button>
            <button class="btn btn-text danger" data-action="delete-report">حذف</button>
          </div>
        </footer>
      </article>`
        )
        .join('')
    : '<div class="empty-state">لم يتم إضافة تقارير بعد.</div>';

  list.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img));

  const weekly = await reportsStore.weeklyProgress(projectId);
  const reportsCountEl = document.querySelector('[data-reports-count]');
  if (reportsCountEl) reportsCountEl.textContent = weekly.reportsCount;

  const reportsWeeklyEl = document.querySelector('[data-reports-weekly-progress]');
  if (reportsWeeklyEl) reportsWeeklyEl.textContent = formatPercent(weekly.progressAverage);
}

function bindPhaseActions(projectId) {
  const tableBody = document.getElementById('phasesTableBody');
  if (!tableBody || tableBody.dataset.bound) return;
  tableBody.dataset.bound = 'true';
  tableBody.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) return;
    const row = actionButton.closest('tr[data-phase-id]');
    if (!row) return;
    const { action } = actionButton.dataset;
    const phaseId = row.dataset.phaseId;

    if (action === 'delete-phase') {
      const phase = phasesUIState.phases.find((item) => item.id === phaseId);
      if (!confirm('هل ترغب في حذف هذه المرحلة؟')) return;
      await phasesStore.remove(projectId, phaseId);
      await phasesStore.completion(projectId).then((progress) => projectStore.updateProgress(projectId, progress));
      pushPhaseLog({ action: 'حذف مرحلة', phaseName: phase?.name, details: 'تم حذف المرحلة من خطة التنفيذ' });
      createToast('تم حذف المرحلة بنجاح', 'success');
      await renderPhases(projectId);
      await renderProjectSummary(projectId);
      return;
    }

    if (action === 'edit-phase') {
      openAddPhaseModal(phaseId);
    }
  });
}

function bindExpensesActions(projectId) {
  const legacyContainer = document.querySelector('[data-expenses-list]');
  if (legacyContainer && !legacyContainer.dataset.bound) {
    legacyContainer.dataset.bound = 'true';
    legacyContainer.addEventListener('click', async (event) => {
      const actionButton = event.target.closest('button[data-action]');
      if (!actionButton) return;
      const row = actionButton.closest('[data-expense-id]');
      if (!row) return;
      const { action } = actionButton.dataset;
      const expenseId = row.dataset.expenseId;

      if (action === 'delete-expense') {
        if (!confirm('هل ترغب في حذف هذا السجل المالي؟')) return;
        await expensesStore.remove(projectId, expenseId);
      }

      if (action === 'edit-expense') {
        const expenses = await expensesStore.all(projectId);
        const current = expenses.find((expense) => expense.id === expenseId);
        if (!current) return;
        const newAmount = Number(prompt('قيمة المبلغ', current.amount ?? 0));
        if (Number.isNaN(newAmount)) return;
        await expensesStore.update(projectId, expenseId, { amount: newAmount });
      }

      await renderExpenses(projectId);
      const totals = await expensesStore.totals(projectId);
      const payments = await paymentsStore.totals(projectId);
      await projectStore.updateFinancials(projectId, {
        expensesTotal: totals.expensesTotal,
        paymentsTotal: payments.totalPaid,
        revenue: totals.revenueTotal,
      });
      await renderProjectSummary(projectId);
    });
  }

  const tableBody = document.getElementById('expensesTableBody');
  if (tableBody && !tableBody.dataset.bound) {
    tableBody.dataset.bound = 'true';
    tableBody.addEventListener('click', async (event) => {
      const actionButton = event.target.closest('button[data-expense-action]');
      if (!actionButton) return;
      const row = actionButton.closest('tr[data-expense-id]');
      if (!row) return;
      const expenseId = row.dataset.expenseId;
      const action = actionButton.dataset.expenseAction;

      if (action === 'delete') {
        if (!confirm('هل ترغب في حذف هذا السجل المالي؟')) return;
        await expensesStore.remove(projectId, expenseId);
        await renderExpenses(projectId);
        const totals = await expensesStore.totals(projectId);
        const payments = await paymentsStore.totals(projectId);
        await projectStore.updateFinancials(projectId, {
          expensesTotal: totals.expensesTotal,
          paymentsTotal: payments.totalPaid,
          revenue: totals.revenueTotal,
        });
        await renderProjectSummary(projectId);
        createToast('تم حذف المصروف', 'success');
        return;
      }

      if (action === 'edit') {
        const expenses = await expensesStore.all(projectId);
        const current = expenses.find((expense) => expense.id === expenseId);
        if (!current) return;
        unifiedFinancialState.editingExpenseId = expenseId;
        openAddExpenseModal(current);
      }
    });
  }

  const searchInput = document.getElementById('searchExpenses');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', (event) => {
      unifiedFinancialState.expenseSearch = event.target.value.trim();
      renderUnifiedExpensesUI(projectId);
    });
  }
}

function bindSubcontractActions(projectId) {
  const tableBody = document.getElementById('subcontractsTableBody');
  if (tableBody && !tableBody.dataset.bound) {
    tableBody.dataset.bound = 'true';
    tableBody.addEventListener('click', async (event) => {
      const actionButton = event.target.closest('button[data-subcontract-action]');
      if (!actionButton) return;
      const row = actionButton.closest('tr[data-subcontract-id]');
      if (!row) return;
      const subcontractId = row.dataset.subcontractId;
      const action = actionButton.dataset.subcontractAction;

      if (action === 'delete') {
        if (!confirm('هل ترغب في حذف عقد الباطن هذا؟')) return;
        await subcontractsStore.remove(projectId, subcontractId);
        await renderSubcontracts(projectId);
        createToast('تم حذف عقد الباطن', 'success');
        return;
      }

      if (action === 'edit') {
        const contracts = await subcontractsStore.all(projectId);
        const current = contracts.find((contract) => contract.id === subcontractId);
        if (!current) return;
        unifiedFinancialState.editingSubcontractId = subcontractId;
        openAddSubcontractModal(current);
      }
    });
  }
}

function showModal(modal) {
  if (!modal) return;
  modal.classList.add('is-visible');
  modal.classList.remove('is-hidden');
}

function hideModal(modal) {
  if (!modal) return;
  modal.classList.remove('is-visible');
  modal.classList.add('is-hidden');
}

function openAddExpenseModal(expense = null) {
  const modal = document.getElementById('expenseModal');
  const form = document.getElementById('expenseModalForm');
  const titleEl = document.getElementById('expenseModalTitle');
  if (!modal || !form) return;

  form.reset();
  unifiedFinancialState.editingExpenseId = expense?.id || null;
  if (titleEl) titleEl.textContent = expense ? 'تعديل مصروف' : 'إضافة مصروف';

  const categorySelect = document.getElementById('expenseModalCategory');
  if (categorySelect) {
    categorySelect.dataset.selected = expense?.category || '';
    renderExpenseCategoryOptions();
    if (expense?.category) {
      categorySelect.value = expense.category;
    }
  } else {
    renderExpenseCategoryOptions();
  }

  if (expense) {
    form.title.value = expense.title || '';
    form.date.value = expense.date ? expense.date.slice(0, 10) : '';
    form.amount.value = safeNumber(expense.amount);
    form.vatPercent.value = expense.vatPercent ?? '';
    form.paymentMethod.value = expense.paymentMethod || 'نقدي';
    form.notes.value = expense.notes || '';
  }

  showModal(modal);
}

function closeExpenseModal() {
  unifiedFinancialState.editingExpenseId = null;
  const modal = document.getElementById('expenseModal');
  const form = document.getElementById('expenseModalForm');
  if (form) form.reset();
  hideModal(modal);
}

function bindExpenseModalForm(projectId) {
  const form = document.getElementById('expenseModalForm');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = 'true';
  const categorySelect = form.querySelector('#expenseModalCategory');
  if (categorySelect && !categorySelect.dataset.bound) {
    categorySelect.dataset.bound = 'true';
    categorySelect.addEventListener('change', () => {
      categorySelect.dataset.selected = categorySelect.value;
    });
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      category: formData.get('category')?.toString().trim() || 'مصروفات عامة',
      title: formData.get('title')?.toString().trim() || 'مصروف',
      date: formData.get('date'),
      amount: safeNumber(formData.get('amount')), 
      vatPercent: safeNumber(formData.get('vatPercent')), 
      paymentMethod: formData.get('paymentMethod')?.toString().trim() || 'نقدي',
      notes: formData.get('notes')?.toString().trim() || '',
      type: 'expense',
    };

    if (unifiedFinancialState.editingExpenseId) {
      await expensesStore.update(projectId, unifiedFinancialState.editingExpenseId, payload);
      createToast('تم تحديث المصروف بنجاح', 'success');
    } else {
      await expensesStore.create(projectId, payload);
      createToast('تمت إضافة المصروف بنجاح', 'success');
    }

    closeExpenseModal();
    await renderExpenses(projectId);
    const totals = await expensesStore.totals(projectId);
    const payments = await paymentsStore.totals(projectId);
    await projectStore.updateFinancials(projectId, {
      expensesTotal: totals.expensesTotal,
      paymentsTotal: payments.totalPaid,
      revenue: totals.revenueTotal,
    });
    await renderProjectSummary(projectId);
  });
}

function openAddSubcontractModal(contract = null) {
  const modal = document.getElementById('subcontractModal');
  const form = document.getElementById('subcontractModalForm');
  const titleEl = document.getElementById('subcontractModalTitle');
  if (!modal || !form) return;

  form.reset();
  unifiedFinancialState.editingSubcontractId = contract?.id || null;
  if (titleEl) titleEl.textContent = contract ? 'تعديل عقد باطن' : 'إضافة عقد باطن';

  if (contract) {
    form.contractorName.value = contract.contractorName || '';
    form.contractTitle.value = contract.contractTitle || '';
    form.startDate.value = contract.startDate ? contract.startDate.slice(0, 10) : '';
    form.endDate.value = contract.endDate ? contract.endDate.slice(0, 10) : '';
    form.value.value = safeNumber(contract.value);
    form.paidAmount.value = safeNumber(contract.paidAmount);
    form.status.value = contract.status || 'active';
    form.notes.value = contract.notes || '';
  }

  showModal(modal);
}

function closeSubcontractModal() {
  unifiedFinancialState.editingSubcontractId = null;
  const modal = document.getElementById('subcontractModal');
  const form = document.getElementById('subcontractModalForm');
  if (form) form.reset();
  hideModal(modal);
}

function bindSubcontractModalForm(projectId) {
  const form = document.getElementById('subcontractModalForm');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      contractorName: formData.get('contractorName')?.toString().trim() || '',
      contractTitle: formData.get('contractTitle')?.toString().trim() || '',
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate') || '',
      value: safeNumber(formData.get('value')),
      paidAmount: safeNumber(formData.get('paidAmount')),
      status: formData.get('status')?.toString() || 'active',
      notes: formData.get('notes')?.toString().trim() || '',
    };

    if (unifiedFinancialState.editingSubcontractId) {
      await subcontractsStore.update(projectId, unifiedFinancialState.editingSubcontractId, payload);
      createToast('تم تحديث عقد الباطن', 'success');
    } else {
      await subcontractsStore.create(projectId, payload);
      createToast('تم إنشاء عقد الباطن', 'success');
    }

    closeSubcontractModal();
    await renderSubcontracts(projectId);
  });
}

function applyExpenseFilters() {
  const category = document.getElementById('filterExpenseCategory')?.value || '';
  const paymentMethod = document.getElementById('filterPaymentMethod')?.value || '';
  const dateFrom = document.getElementById('filterDateFrom')?.value || '';
  const dateTo = document.getElementById('filterDateTo')?.value || '';
  unifiedFinancialState.expenseFilters = { category, paymentMethod, dateFrom, dateTo };
  renderUnifiedExpensesUI(unifiedFinancialState.projectId);
}

function clearExpenseFilters() {
  unifiedFinancialState.expenseFilters = { category: '', paymentMethod: '', dateFrom: '', dateTo: '' };
  const category = document.getElementById('filterExpenseCategory');
  const payment = document.getElementById('filterPaymentMethod');
  const dateFrom = document.getElementById('filterDateFrom');
  const dateTo = document.getElementById('filterDateTo');
  if (category) category.value = '';
  if (payment) payment.value = '';
  if (dateFrom) dateFrom.value = '';
  if (dateTo) dateTo.value = '';
  renderUnifiedExpensesUI(unifiedFinancialState.projectId);
}

function sortExpenseTable(key) {
  if (unifiedFinancialState.expenseSort.key === key) {
    unifiedFinancialState.expenseSort.direction = unifiedFinancialState.expenseSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    unifiedFinancialState.expenseSort.key = key;
    unifiedFinancialState.expenseSort.direction = 'asc';
  }
  renderUnifiedExpensesUI(unifiedFinancialState.projectId);
}

function applySubcontractFilters() {
  const contractor = document.getElementById('filterContractor')?.value || '';
  const status = document.getElementById('filterContractStatus')?.value || '';
  const startDate = document.getElementById('filterContractStartDate')?.value || '';
  const endDate = document.getElementById('filterContractEndDate')?.value || '';
  unifiedFinancialState.subcontractFilters = { contractor, status, startDate, endDate };
  renderSubcontractsUI(unifiedFinancialState.projectId);
}

function clearSubcontractFilters() {
  unifiedFinancialState.subcontractFilters = { contractor: '', status: '', startDate: '', endDate: '' };
  const contractor = document.getElementById('filterContractor');
  const status = document.getElementById('filterContractStatus');
  const startDate = document.getElementById('filterContractStartDate');
  const endDate = document.getElementById('filterContractEndDate');
  if (contractor) contractor.value = '';
  if (status) status.value = '';
  if (startDate) startDate.value = '';
  if (endDate) endDate.value = '';
  renderSubcontractsUI(unifiedFinancialState.projectId);
}

function sortSubcontractTable(key) {
  if (unifiedFinancialState.subcontractSort.key === key) {
    unifiedFinancialState.subcontractSort.direction =
      unifiedFinancialState.subcontractSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    unifiedFinancialState.subcontractSort.key = key;
    unifiedFinancialState.subcontractSort.direction = 'asc';
  }
  renderSubcontractsUI(unifiedFinancialState.projectId);
}

function switchUnifiedSubTab(subtabId) {
  const section = document.getElementById('expenses-contracts-section');
  if (!section) return;
  section.querySelectorAll('.unified-subtab-content').forEach((content) => {
    content.classList.toggle('is-hidden', content.id !== subtabId);
  });
  section.querySelectorAll('[data-subtab]').forEach((button) => {
    const isActive = button.dataset.subtab === subtabId;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function switchTimelineView(view) {
  unifiedFinancialState.timelineView = view;
  renderCombinedAnalyticsUI();
}

function exportUnifiedData() {
  const projectId = unifiedFinancialState.projectId || 'project';
  const expenses = unifiedFinancialState.expenses.filter((item) => item.type !== 'revenue');
  const subcontracts = unifiedFinancialState.subcontracts;
  if (!expenses.length && !subcontracts.length) {
    createToast('لا توجد بيانات للتصدير حالياً', 'warning');
    return;
  }

  const rows = [
    ['نوع السجل', 'التاريخ', 'البيان', 'القيمة', 'وسيلة الدفع / الحالة', 'ملاحظات'],
    ...expenses.map((expense) => [
      'مصروف',
      formatDate(expense.date),
      expense.title || expense.category || 'مصروف',
      formatCurrency(expense.amount),
      expense.paymentMethod || '—',
      expense.notes || '',
    ]),
    ...subcontracts.map((contract) => [
      'عقد باطن',
      formatDate(contract.startDate),
      contract.contractTitle || contract.contractorName || 'عقد',
      formatCurrency(contract.value),
      translateContractStatus(contract.status),
      contract.notes || '',
    ]),
  ];

  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectId}-financial-export.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  createToast('تم تصدير البيانات بنجاح', 'success');
}

function bindPaymentsActions(projectId) {
  const container = document.querySelector('[data-payments-list]');
  if (!container || container.dataset.bound) return;
  container.dataset.bound = 'true';
  container.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) return;
    const card = actionButton.closest('[data-payment-id]');
    if (!card) return;
    const { action } = actionButton.dataset;
    const paymentId = card.dataset.paymentId;

    if (action === 'delete-payment') {
      if (!confirm('هل ترغب في حذف هذه الدفعة؟')) return;
      await paymentsStore.remove(projectId, paymentId);
    }

    if (action === 'mark-paid') {
      await paymentsStore.update(projectId, paymentId, { status: 'paid', paidAt: new Date().toISOString() });
    }

    await renderPayments(projectId);
    const totals = await paymentsStore.totals(projectId);
    const expenses = await expensesStore.totals(projectId);
    await projectStore.updateFinancials(projectId, {
      expensesTotal: expenses.expensesTotal,
      paymentsTotal: totals.totalPaid,
      revenue: expenses.revenueTotal,
    });
    await renderProjectSummary(projectId);
  });
}

function bindReportsActions(projectId) {
  const container = document.querySelector('[data-reports-list]');
  if (!container || container.dataset.bound) return;
  container.dataset.bound = 'true';
  container.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) return;
    const card = actionButton.closest('[data-report-id]');
    if (!card) return;
    const { action } = actionButton.dataset;
    const reportId = card.dataset.reportId;

    if (action === 'delete-report') {
      if (!confirm('هل ترغب في حذف هذا التقرير؟')) return;
      await reportsStore.remove(projectId, reportId);
    }

    if (action === 'edit-report') {
      const reports = await reportsStore.all(projectId);
      const current = reports.find((report) => report.id === reportId);
      if (!current) return;
      const newSummary = prompt('ملخص التقرير', current.summary || '');
      if (newSummary === null) return;
      await reportsStore.update(projectId, reportId, { summary: newSummary });
    }

    await renderReports(projectId);
  });
}

function handlePhasesForm(projectId) {
  const form = document.querySelector('#phaseForm');
  if (!form) return;
  bindFormSubmit(form, async (formData) => {
    const payload = {
      name: getFormValue(formData, 'name'),
      description: getFormValue(formData, 'description'),
      startDate: getFormValue(formData, 'startDate'),
      endDate: getFormValue(formData, 'endDate'),
      progress: Math.max(0, Math.min(100, safeNumber(getFormValue(formData, 'progress')))),
      status: getFormValue(formData, 'status'),
      assignee: getFormValue(formData, 'assignee'),
      dependencies: normalizePhaseDependencies(getFormValue(formData, 'dependencies')),
    };
    if (phasesUIState.editingPhaseId) {
      const phaseId = phasesUIState.editingPhaseId;
      const current = phasesUIState.phases.find((phase) => phase.id === phaseId);
      await phasesStore.update(projectId, phaseId, payload);
      await phasesStore.completion(projectId).then((progress) => projectStore.updateProgress(projectId, progress));
      pushPhaseLog({
        action: 'تعديل مرحلة',
        phaseName: payload.name || current?.name,
        details: 'تم تحديث تفاصيل المرحلة',
      });
      createToast('تم تحديث بيانات المرحلة', 'success');
    } else {
      const created = await phasesStore.create(projectId, payload);
      await phasesStore.completion(projectId).then((progress) => projectStore.updateProgress(projectId, progress));
      pushPhaseLog({ action: 'إضافة مرحلة', phaseName: created.name, details: 'تم إنشاء مرحلة جديدة' });
      createToast('تمت إضافة المرحلة بنجاح');
    }
    closePhaseModal();
    await renderPhases(projectId);
    await renderProjectSummary(projectId);
  });
}

function handleExpensesForm(projectId) {
  const form = document.querySelector('#expenseForm');
  if (!form) return;
  bindFormSubmit(form, async (formData) => {
    const payload = {
      title: getFormValue(formData, 'title'),
      category: getFormValue(formData, 'category'),
      type: getFormValue(formData, 'type'),
      amount: safeNumber(getFormValue(formData, 'amount')),
      date: getFormValue(formData, 'date'),
    };
    await expensesStore.create(projectId, payload);
    await renderExpenses(projectId);
    const totals = await expensesStore.totals(projectId);
    const payments = await paymentsStore.totals(projectId);
    await projectStore.updateFinancials(projectId, {
      expensesTotal: totals.expensesTotal,
      paymentsTotal: payments.totalPaid,
      revenue: totals.revenueTotal,
    });
    await renderProjectSummary(projectId);
    createToast('تمت إضافة المصروف بنجاح');
  });
}

function handleReportsForm(projectId) {
  const form = document.querySelector('#reportForm');
  if (!form) return;
  bindFormSubmit(form, async (formData) => {
    const payload = {
      title: getFormValue(formData, 'title'),
      summary: getFormValue(formData, 'summary'),
      date: getFormValue(formData, 'date'),
      progress: safeNumber(getFormValue(formData, 'progress')),
      photos: (getFormValue(formData, 'photos') || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    };
    await reportsStore.create(projectId, payload);
    await renderReports(projectId);
    createToast('تم إضافة التقرير اليومي');
  });
}

async function setupInfoPage() {
  const projectId = ensureProjectContext();
  if (!projectId) return;
  buildBreadcrumb([
    { label: 'المشاريع', href: '../projects_management_center.html' },
    { label: 'معلومات المشروع', href: `project_info.html?projectId=${projectId}` },
  ]);
  configureProjectNavigation(projectId, 'overview');
  await renderProjectSummary(projectId);
  await renderPayments(projectId);
  await renderExpenses(projectId);
  await renderReports(projectId);
  bindPaymentsActions(projectId);
  bindExpensesActions(projectId);
  bindReportsActions(projectId);
}

async function setupPhasesPage() {
  const projectId = ensureProjectContext();
  if (!projectId) return;
  phasesUIState.filters = { status: '', assignee: '', period: '' };
  phasesUIState.sort = { key: 'startDate', direction: 'asc' };
  phasesUIState.ganttScale = 1;
  phasesUIState.editingPhaseId = null;
  phasesUIState.csvInput = null;
  buildBreadcrumb([
    { label: 'المشاريع', href: '../projects_management_center.html' },
    { label: 'مراحل المشروع', href: `project_phases.html?projectId=${projectId}` },
  ]);
  configureProjectNavigation(projectId, 'phases');
  await renderProjectSummary(projectId);
  await renderPhases(projectId);
  ['filterStatus', 'filterAssignee', 'filterPeriod'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });
  handlePhasesForm(projectId);
  bindPhaseActions(projectId);
}

async function setupExpensesPage() {
  const projectId = ensureProjectContext();
  if (!projectId) return;
  buildBreadcrumb([
    { label: 'المشاريع', href: '../projects_management_center.html' },
    { label: 'مصاريف المشروع', href: `project_expenses.html?projectId=${projectId}` },
  ]);
  configureProjectNavigation(projectId, 'expenses');
  await renderProjectSummary(projectId);
  await renderExpenses(projectId);
  await loadExpenseCategories(true);
  await renderSubcontracts(projectId);
  bindExpensesActions(projectId);
  bindSubcontractActions(projectId);
  bindExpenseModalForm(projectId);
  bindSubcontractModalForm(projectId);
  bindCategoryManagerControls();
}

async function setupPaymentsPage() {
  const projectId = ensureProjectContext();
  if (!projectId) return;
  paymentsUIState.filters = { type: '', status: '', period: '' };
  paymentsUIState.sort = { key: 'dueDate', direction: 'asc' };
  paymentsUIState.timelineView = 'monthly';
  paymentsUIState.charts = {};
  buildBreadcrumb([
    { label: 'المشاريع', href: '../projects_management_center.html' },
    { label: 'دفعات المشروع', href: `project_payments.html?projectId=${projectId}` },
  ]);
  configureProjectNavigation(projectId, 'payments');
  await renderProjectSummary(projectId);
  await renderPayments(projectId);
  bindPaymentsActions(projectId);
  bindPaymentsTableActions(projectId);
  bindPaymentModalForm(projectId);
  switchPaymentsTimelineView(paymentsUIState.timelineView);
}

async function setupReportsPage() {
  const projectId = ensureProjectContext();
  if (!projectId) return;
  buildBreadcrumb([
    { label: 'المشاريع', href: '../projects_management_center.html' },
    { label: 'التقارير اليومية', href: `project_reports.html?projectId=${projectId}` },
  ]);
  configureProjectNavigation(projectId, 'reports');
  await renderProjectSummary(projectId);
  await renderReports(projectId);
  handleReportsForm(projectId);
  bindReportsActions(projectId);
}

onDataEvent('expense-categories-updated', () => loadExpenseCategories(true));

const pageInitializers = {
  'projects-management': setupManagementPage,
  'project-wizard': setupWizardPage,
  'project-info': setupInfoPage,
  'project-phases': setupPhasesPage,
  'project-expenses': setupExpensesPage,
  'project-payments': setupPaymentsPage,
  'project-reports': setupReportsPage,
};

if (pageInitializers[page]) {
  pageInitializers[page]();
}

Object.assign(window, {
  openAddPhaseModal,
  closePhaseModal,
  applyPhaseFilters,
  clearPhaseFilters,
  sortPhaseTable,
  switchPhaseSubTab,
  zoomGanttIn,
  zoomGanttOut,
  refreshGantt,
  importPhasesCSV,
  exportLogs,
  clearLogs,
  openAddExpenseModal,
  closeExpenseModal,
  openCategoryManager,
  closeCategoryManager,
  resetCategoryManagerForm,
  openAddSubcontractModal,
  closeSubcontractModal,
  applyExpenseFilters,
  clearExpenseFilters,
  sortExpenseTable,
  applySubcontractFilters,
  clearSubcontractFilters,
  sortSubcontractTable,
  switchUnifiedSubTab,
  switchTimelineView,
  exportUnifiedData,
  openAddPaymentModal,
  closePaymentModal,
  applyPaymentFilters,
  clearPaymentFilters,
  sortPaymentTable,
  switchPaymentsTimelineView,
  refreshPaymentsTimeline,
  exportFinancialReport,
  importPaymentsCSV,
});

window.contractorpro = window.contractorpro || {};
window.contractorpro.projectsMain = { renderProjectsGrid };
