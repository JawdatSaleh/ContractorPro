import { projectStore } from './project_store.js';
import { phasesStore } from './phases_store.js';
import { expensesStore } from './expenses_store.js';
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
  calculateDuration,
} from './utils.js';

const page = document.body.dataset.page;

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

function ensureProjectContext() {
  const { projectId } = parseQueryParams();
  if (!projectId) {
    window.location.href = '../projects_management_center.html';
    return null;
  }
  return projectId;
}

async function renderSummaryCards() {
  const summary = await projectStore.summarize();
  const totalProjectsEl = document.querySelector('[data-total-projects]');
  const activeProjectsEl = document.querySelector('[data-active-projects]');
  const totalValueEl = document.querySelector('[data-total-value]');
  const completedProjectsEl = document.querySelector('[data-completed-projects]');
  if (totalProjectsEl) totalProjectsEl.textContent = summary.totalProjects;
  if (activeProjectsEl) activeProjectsEl.textContent = summary.activeCount;
  if (totalValueEl) totalValueEl.textContent = summary.totalValueFormatted;
  if (completedProjectsEl) completedProjectsEl.textContent = summary.completedCount;
}

function projectStatusBadge(status) {
  switch (status) {
    case 'completed':
      return '<span class="badge badge-success">مكتمل</span>';
    case 'on-hold':
      return '<span class="badge badge-warning">متوقف</span>';
    case 'cancelled':
      return '<span class="badge badge-danger">ملغي</span>';
    default:
      return '<span class="badge badge-success">نشط</span>';
  }
}

function buildProjectCard(project) {
  const expenses = formatCurrency(project.totalExpenses || 0);
  const revenueValue = project.revenue || project.contractValue || 0;
  const revenue = formatCurrency(revenueValue);
  const profitabilityValue = project.profitability || revenueValue - (project.totalExpenses || 0);
  const profitability = formatCurrency(profitabilityValue);
  const payments = formatCurrency(project.totalPayments || 0);
  const periodLabel = `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`;
  return `
    <article class="project-card" data-project-id="${project.id}">
      <div class="project-card__hero">
        <img data-src="${project.cover || '../assets/default-project.svg'}" alt="${project.name}" class="project-card__image" />
        <div class="project-card__status">${projectStatusBadge(project.status)}</div>
        <div class="project-card__progress">
          <i class="fas fa-chart-line"></i>
          <span>${formatPercent(project.progress || 0)}</span>
        </div>
      </div>
      <div class="project-card__content">
        <header class="project-card__header">
          <div>
            <h3>${project.name}</h3>
            <p class="project-card__client"><i class="fas fa-user-tie"></i> ${project.clientName}</p>
          </div>
          <div class="project-card__contract">
            <span>القيمة التعاقدية</span>
            <strong>${revenue}</strong>
          </div>
        </header>
        <div class="project-card__meta">
          <span><i class="fas fa-map-marker-alt"></i>${project.location || '—'}</span>
          <span><i class="fas fa-calendar"></i>${periodLabel}</span>
        </div>
        <dl class="project-card__stats">
          <div><dt>المصروفات</dt><dd>${expenses}</dd></div>
          <div><dt>المدفوعات</dt><dd>${payments}</dd></div>
          <div><dt>الربحية</dt><dd>${profitability}</dd></div>
        </dl>
        <div class="project-card__timeline">
          <div class="project-card__timeline-head">
            <span>شريط التقدم</span>
            <strong>${formatPercent(project.progress || 0)}</strong>
          </div>
          <div class="progress-bar progress-bar--accent"><div style="width:${project.progress || 0}%"></div></div>
        </div>
        <footer class="project-card__footer">
          <div class="project-card__quick-actions">
            <button class="btn btn-chip" data-action="view-info"><i class="fas fa-circle-info"></i> نظرة عامة</button>
            <button class="btn btn-chip" data-action="view-phases"><i class="fas fa-layer-group"></i> المراحل</button>
            <button class="btn btn-chip" data-action="view-expenses"><i class="fas fa-wallet"></i> المصاريف</button>
            <button class="btn btn-chip" data-action="view-payments"><i class="fas fa-money-check"></i> الدفعات</button>
            <button class="btn btn-chip" data-action="view-reports"><i class="fas fa-file-lines"></i> التقارير</button>
          </div>
          <div class="project-card__menu">
            <button class="btn btn-icon" data-action="toggle-menu"><i class="fas fa-ellipsis-h"></i></button>
            <div class="project-card__dropdown">
              <button data-action="edit"><i class="fas fa-pen"></i> تعديل</button>
              <button data-action="duplicate"><i class="fas fa-copy"></i> استنساخ</button>
              <button data-action="delete" class="danger"><i class="fas fa-trash"></i> حذف</button>
            </div>
          </div>
        </footer>
      </div>
    </article>
  `;
}

async function renderProjectsGrid() {
  const grid = document.querySelector('[data-projects-grid]');
  if (!grid) return;
  const projects = await projectStore.getAll();
  grid.innerHTML = projects.length
    ? projects.map((project) => buildProjectCard(project)).join('')
    : '<div class="empty-state">لا توجد مشاريع حالياً. ابدأ بإنشاء مشروع جديد.</div>';
  const observer = lazyImageObserver();
  grid.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img));
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
        const searchable = [project.id, project.name, project.clientName, project.location, project.manager]
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
          <span class="text-xs text-text-secondary">${project.location || 'غير محدد'}</span>
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
  if (detailLocation) detailLocation.textContent = project.location || '—';

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
  await renderSummaryCards();
  await renderProjectsGrid();
  document.querySelector('[data-projects-grid]')?.addEventListener('click', handleProjectAction);
  document.querySelector('[data-create-project]')?.addEventListener('click', () => {
    window.location.href = 'project_creation_wizard.html';
  });

  onDataEvent('projects-updated', () => {
    renderSummaryCards();
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

  const periodEl = document.querySelector('[data-project-period]');
  if (periodEl) periodEl.textContent = `${formatDate(project.startDate)} - ${formatDate(project.endDate)}`;

  const locationEl = document.querySelector('[data-project-location]');
  if (locationEl) locationEl.textContent = project.location || '—';

  const managerEl = document.querySelector('[data-project-manager]');
  if (managerEl) managerEl.textContent = project.manager || '—';

  const contractEl = document.querySelector('[data-project-contract]');
  if (contractEl) contractEl.textContent = formatCurrency(project.contractValue || project.revenue || 0);

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

async function renderPhases(projectId) {
  const list = document.querySelector('[data-phases-list]');
  if (!list) return;
  const phases = await phasesStore.all(projectId);
  list.innerHTML = phases.length
    ? phases
        .map(
          (phase) => `
      <div class="phase-row" data-phase-id="${phase.id}">
        <div class="phase-row__info">
          <h4>${phase.name}</h4>
          <p>${phase.description || ''}</p>
          <span>${formatDate(phase.startDate)} → ${formatDate(phase.endDate)}</span>
        </div>
        <div class="phase-row__meta">
          <span>${formatPercent(phase.progress || 0)}</span>
          <div class="progress-bar"><div style="width:${phase.progress || 0}%"></div></div>
          <button class="btn btn-light" data-action="edit-phase">تعديل</button>
          <button class="btn btn-text danger" data-action="delete-phase">حذف</button>
        </div>
      </div>`
        )
        .join('')
    : '<div class="empty-state">لا توجد مراحل مسجلة.</div>';

  const { totalDuration, overallProgress } = await phasesStore.timeline(projectId);
  const phasesDurationEl = document.querySelector('[data-phases-duration]');
  if (phasesDurationEl) phasesDurationEl.textContent = `${totalDuration} يوم`;

  const phasesProgressEl = document.querySelector('[data-phases-progress]');
  if (phasesProgressEl) phasesProgressEl.textContent = formatPercent(overallProgress);
  const timelineBar = document.querySelector('[data-phases-progress-bar]');
  if (timelineBar) timelineBar.style.width = `${overallProgress}%`;
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

  const tbody = document.getElementById('expensesTableBody');
  if (tbody) {
    tbody.innerHTML = sorted
      .map((expense) => {
        const vatPercent = safeNumber(expense.vatPercent);
        const totalWithVat = expenseTotalWithVat(expense);
        return `
      <tr data-expense-id="${expense.id}">
        <td class="text-right p-4 border-b border-border text-sm">${expense.category || '—'}</td>
        <td class="text-right p-4 border-b border-border text-sm">${expense.title || '—'}</td>
        <td class="text-center p-4 border-b border-border text-sm">${formatDate(expense.date)}</td>
        <td class="text-center p-4 border-b border-border text-sm">${formatCurrency(expense.amount)}</td>
        <td class="text-center p-4 border-b border-border text-sm">${vatPercent.toFixed(2)}</td>
        <td class="text-center p-4 border-b border-border text-sm">${formatCurrency(totalWithVat)}</td>
        <td class="text-center p-4 border-b border-border text-sm">${expense.paymentMethod || '—'}</td>
        <td class="text-right p-4 border-b border-border text-sm">${expense.notes || '—'}</td>
        <td class="text-center p-4 border-b border-border text-sm">
          <div class="flex items-center justify-center gap-2">
            <button type="button" class="btn btn-text" data-expense-action="edit">تعديل</button>
            <button type="button" class="btn btn-text danger" data-expense-action="delete">حذف</button>
          </div>
        </td>
      </tr>`;
      })
      .join('');
  }

  const emptyState = document.getElementById('expensesEmptyState');
  if (emptyState) emptyState.classList.toggle('hidden', sorted.length > 0);

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
        <td class="text-right p-4 border-b border-border text-sm">${contract.contractorName || '—'}</td>
        <td class="text-right p-4 border-b border-border text-sm">${contract.contractTitle || '—'}</td>
        <td class="text-center p-4 border-b border-border text-sm">${formatCurrency(contract.value)}</td>
        <td class="text-center p-4 border-b border-border text-sm">${formatDate(contract.startDate)}</td>
        <td class="text-center p-4 border-b border-border text-sm">${formatDate(contract.endDate)}</td>
        <td class="text-center p-4 border-b border-border text-sm">${formatCurrency(contract.paidAmount)}</td>
        <td class="text-center p-4 border-b border-border text-sm">${formatCurrency(remaining)}</td>
        <td class="text-center p-4 border-b border-border text-sm">${translateContractStatus(contract.status)}</td>
        <td class="text-center p-4 border-b border-border text-sm">
          <div class="flex items-center justify-center gap-2">
            <button type="button" class="btn btn-text" data-subcontract-action="edit">تعديل</button>
            <button type="button" class="btn btn-text danger" data-subcontract-action="delete">حذف</button>
          </div>
        </td>
      </tr>`;
      })
      .join('');
  }

  const emptyState = document.getElementById('subcontractsEmptyState');
  if (emptyState) emptyState.classList.toggle('hidden', sorted.length > 0);

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

function ensureChartInstance(chartKey, canvasId, configFactory) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const config = typeof configFactory === 'function' ? configFactory(context) : configFactory;
  if (!config) return;
  if (unifiedFinancialState.charts[chartKey]) {
    unifiedFinancialState.charts[chartKey].destroy();
  }
  unifiedFinancialState.charts[chartKey] = new Chart(context, config);
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
          labels: { font: { family: 'Tajawal, sans-serif' } },
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
          labels: { font: { family: 'Tajawal, sans-serif' } },
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
          labels: { font: { family: 'Tajawal, sans-serif' } },
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
}

async function renderPayments(projectId) {
  const list = document.querySelector('[data-payments-list]');
  if (!list) return;
  const payments = await paymentsStore.all(projectId);
  list.innerHTML = payments.length
    ? payments
        .map(
          (item) => `
      <div class="payment-card" data-payment-id="${item.id}">
        <div class="payment-card__header">
          <h4>${item.title}</h4>
          <span class="badge badge-outline">${item.status === 'paid' ? 'مدفوعة' : item.status === 'overdue' ? 'متأخرة' : 'مجدولة'}</span>
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

  const totals = await paymentsStore.totals(projectId);
  const paymentsTotalEl = document.querySelector('[data-payments-total]');
  if (paymentsTotalEl) paymentsTotalEl.textContent = formatCurrency(totals.totalScheduled);

  const paymentsPaidEl = document.querySelector('[data-payments-paid]');
  if (paymentsPaidEl) paymentsPaidEl.textContent = formatCurrency(totals.totalPaid);

  const paymentsOverdueEl = document.querySelector('[data-payments-overdue]');
  if (paymentsOverdueEl) paymentsOverdueEl.textContent = totals.overdue;
  const paymentsCountEl = document.querySelector('[data-payments-count]');
  if (paymentsCountEl) paymentsCountEl.textContent = totals.count;
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
  const container = document.querySelector('[data-phases-list]');
  if (!container || container.dataset.bound) return;
  container.dataset.bound = 'true';
  container.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) return;
    const row = actionButton.closest('[data-phase-id]');
    if (!row) return;
    const { action } = actionButton.dataset;
    const phaseId = row.dataset.phaseId;

    if (action === 'delete-phase') {
      if (!confirm('هل ترغب في حذف هذه المرحلة؟')) return;
      await phasesStore.remove(projectId, phaseId);
    }

    if (action === 'edit-phase') {
      const phases = await phasesStore.all(projectId);
      const current = phases.find((phase) => phase.id === phaseId);
      if (!current) return;
      const newProgress = Number(prompt('نسبة الإنجاز الحالية', current.progress ?? 0));
      if (Number.isNaN(newProgress)) return;
      await phasesStore.update(projectId, phaseId, { progress: Math.max(0, Math.min(100, newProgress)) });
    }

    const progress = await phasesStore.completion(projectId);
    await projectStore.updateProgress(projectId, progress);
    await renderPhases(projectId);
    await renderProjectSummary(projectId);
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
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function hideModal(modal) {
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function openAddExpenseModal(expense = null) {
  const modal = document.getElementById('expenseModal');
  const form = document.getElementById('expenseModalForm');
  const titleEl = document.getElementById('expenseModalTitle');
  if (!modal || !form) return;

  form.reset();
  unifiedFinancialState.editingExpenseId = expense?.id || null;
  if (titleEl) titleEl.textContent = expense ? 'تعديل مصروف' : 'إضافة مصروف';

  if (expense) {
    form.category.value = expense.category || '';
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
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      category: formData.get('category')?.toString().trim() || 'عام',
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
    content.classList.toggle('hidden', content.id !== subtabId);
  });
  section.querySelectorAll('.unified-subtab-button').forEach((button) => {
    const isActive = button.dataset.subtab === subtabId;
    button.classList.toggle('active', isActive);
    if (isActive) {
      button.classList.add('border-primary', 'text-primary');
      button.classList.remove('border-transparent', 'text-text-secondary');
    } else {
      button.classList.remove('border-primary', 'text-primary');
      button.classList.add('border-transparent', 'text-text-secondary');
    }
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
      progress: safeNumber(getFormValue(formData, 'progress')),
    };
    await phasesStore.create(projectId, payload);
    await phasesStore.completion(projectId).then((progress) => projectStore.updateProgress(projectId, progress));
    await renderPhases(projectId);
    await renderProjectSummary(projectId);
    createToast('تمت إضافة المرحلة بنجاح');
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

function handlePaymentsForm(projectId) {
  const form = document.querySelector('#paymentForm');
  if (!form) return;
  bindFormSubmit(form, async (formData) => {
    const payload = {
      title: getFormValue(formData, 'title'),
      amount: safeNumber(getFormValue(formData, 'amount')),
      dueDate: getFormValue(formData, 'dueDate'),
      status: getFormValue(formData, 'status'),
    };
    await paymentsStore.create(projectId, payload);
    await renderPayments(projectId);
    const totals = await paymentsStore.totals(projectId);
    const expenses = await expensesStore.totals(projectId);
    await projectStore.updateFinancials(projectId, {
      expensesTotal: expenses.expensesTotal,
      paymentsTotal: totals.totalPaid,
      revenue: expenses.revenueTotal,
    });
    await renderProjectSummary(projectId);
    createToast('تمت إضافة الدفعة بنجاح');
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
  buildBreadcrumb([
    { label: 'المشاريع', href: '../projects_management_center.html' },
    { label: 'مراحل المشروع', href: `project_phases.html?projectId=${projectId}` },
  ]);
  configureProjectNavigation(projectId, 'phases');
  await renderProjectSummary(projectId);
  await renderPhases(projectId);
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
  await renderSubcontracts(projectId);
  bindExpensesActions(projectId);
  bindSubcontractActions(projectId);
  bindExpenseModalForm(projectId);
  bindSubcontractModalForm(projectId);
}

async function setupPaymentsPage() {
  const projectId = ensureProjectContext();
  if (!projectId) return;
  buildBreadcrumb([
    { label: 'المشاريع', href: '../projects_management_center.html' },
    { label: 'دفعات المشروع', href: `project_payments.html?projectId=${projectId}` },
  ]);
  configureProjectNavigation(projectId, 'payments');
  await renderProjectSummary(projectId);
  await renderPayments(projectId);
  handlePaymentsForm(projectId);
  bindPaymentsActions(projectId);
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
  openAddExpenseModal,
  closeExpenseModal,
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
});

window.contractorpro = window.contractorpro || {};
window.contractorpro.projectsMain = { renderProjectsGrid };
