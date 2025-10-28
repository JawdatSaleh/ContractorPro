import { initialProjects } from './projects-data.js';
import {
  ProjectStorage,
  formatCurrency,
  formatDate,
  computeDuration
} from './projects-storage.js';

const selectors = {
  summaryCards: document.getElementById('summaryCards'),
  lastSyncLabel: document.getElementById('lastSyncLabel'),
  statusFilter: document.getElementById('statusFilter'),
  riskFilter: document.getElementById('riskFilter'),
  managerFilter: document.getElementById('managerFilter'),
  timelineFilter: document.getElementById('timelineFilter'),
  projectSearch: document.getElementById('projectSearch'),
  projectsTableBody: document.getElementById('projectsTableBody'),
  projectsCount: document.getElementById('projectsCount'),
  projectsEmptyState: document.getElementById('projectsEmptyState'),
  projectDetailPanel: document.getElementById('projectDetailPanel'),
  detailName: document.getElementById('detailName'),
  detailStatus: document.getElementById('detailStatus'),
  detailRisk: document.getElementById('detailRisk'),
  detailClient: document.getElementById('detailClient'),
  detailLocation: document.getElementById('detailLocation'),
  detailMetrics: document.getElementById('detailMetrics'),
  detailDeliverables: document.getElementById('detailDeliverables'),
  detailTimeline: document.getElementById('detailTimeline'),
  detailTeams: document.getElementById('detailTeams'),
  detailDocuments: document.getElementById('detailDocuments'),
  openInWizardBtn: document.getElementById('openInWizardBtn'),
  downloadProjectBtn: document.getElementById('downloadProjectBtn'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  exportProjectsBtn: document.getElementById('exportProjectsBtn'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  toggleViewBtn: document.getElementById('toggleViewBtn'),
  toggleViewLabel: document.getElementById('toggleViewLabel'),
  projectsDataSection: document.getElementById('projectsDataSection'),
  projectsPipelineSection: document.getElementById('projectsPipelineSection'),
  pipelineBoard: document.getElementById('pipelineBoard'),
  activeCountBadge: document.getElementById('activeCountBadge'),
  pipelineValueBadge: document.getElementById('pipelineValueBadge')
};

const statusLabels = {
  active: { label: 'نشط', className: 'success' },
  planning: { label: 'قيد التخطيط', className: 'neutral' },
  'on-hold': { label: 'معلق', className: 'warning' },
  closed: { label: 'مكتمل', className: 'success' }
};

const riskLabels = {
  low: { label: 'مخاطر منخفضة', className: 'success' },
  medium: { label: 'مخاطر متوسطة', className: 'warning' },
  high: { label: 'مخاطر مرتفعة', className: 'danger' }
};

const viewModes = {
  table: {
    label: 'عرض لوحة البيانات',
    icon: 'fa-table'
  },
  kanban: {
    label: 'عودة إلى عرض الجدول',
    icon: 'fa-border-all'
  }
};

const state = {
  viewMode: 'table',
  selectedProjectId: null,
  filters: {
    status: 'all',
    risk: 'all',
    manager: 'all',
    timeline: 'all',
    search: ''
  }
};

const formatPercentage = (value) => `${Math.round(value)}%`;

const detectHealthClass = (project) => {
  if (!project) return 'neutral';
  if (project.healthIndex >= 85 && project.scheduleVariance >= 0) return 'success';
  if (project.healthIndex <= 60 || project.scheduleVariance < -20) return 'danger';
  return 'warning';
};

const hydrateManagers = () => {
  const managers = new Set(ProjectStorage.getAll().map((project) => project.manager));
  selectors.managerFilter.innerHTML = '<option value="all">جميع المدراء</option>';
  Array.from(managers)
    .sort((a, b) => a.localeCompare(b, 'ar'))
    .forEach((manager) => {
      const option = document.createElement('option');
      option.value = manager;
      option.textContent = manager;
      selectors.managerFilter.appendChild(option);
    });
};

const applyFilters = (projects) => {
  const today = new Date();
  return projects
    .filter((project) => {
      if (state.filters.status !== 'all' && project.status !== state.filters.status) return false;
      if (state.filters.risk !== 'all' && project.riskLevel !== state.filters.risk) return false;
      if (state.filters.manager !== 'all' && project.manager !== state.filters.manager) return false;
      if (state.filters.search) {
        const term = state.filters.search.toLowerCase();
        const searchable = [
          project.id,
          project.name,
          project.client,
          project.location,
          project.sector,
          project.stage
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      if (state.filters.timeline !== 'all') {
        if (!project.plannedCompletion) return false;
        const planned = new Date(project.plannedCompletion);
        const diff = Math.round((planned - today) / (1000 * 60 * 60 * 24));
        if (state.filters.timeline === 'lt90' && diff >= 90) return false;
        if (state.filters.timeline === 'lt180' && diff >= 180) return false;
        if (state.filters.timeline === 'gt180' && diff <= 180) return false;
      }
      return true;
    })
    .sort((a, b) => b.progress - a.progress);
};

const renderSummaryCards = () => {
  const metrics = ProjectStorage.getMetrics();
  selectors.summaryCards.innerHTML = `
    <article class="projects-summary-card bg-surface border border-border rounded-2xl p-6 flex flex-col gap-3">
        <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary font-semibold">إجمالي المشاريع</span>
            <i class="fas fa-layer-group text-primary"></i>
        </div>
        <p class="text-3xl font-extrabold text-text-primary">${metrics.total}</p>
        <p class="text-xs text-text-secondary">${metrics.active} نشط · ${metrics.closed} منجز · ${metrics.planning} قيد التخطيط</p>
    </article>
    <article class="projects-summary-card bg-surface border border-border rounded-2xl p-6 flex flex-col gap-3">
        <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary font-semibold">القيمة التعاقدية</span>
            <i class="fas fa-sack-dollar text-success"></i>
        </div>
        <p class="text-3xl font-extrabold text-text-primary">${formatCurrency(metrics.totalValue)}</p>
        <p class="text-xs text-text-secondary">تم إصدار فواتير بقيمة ${formatCurrency(metrics.invoicedValue)}</p>
    </article>
    <article class="projects-summary-card bg-surface border border-border rounded-2xl p-6 flex flex-col gap-3">
        <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary font-semibold">متوسط هامش الربح</span>
            <i class="fas fa-chart-line text-warning"></i>
        </div>
        <p class="text-3xl font-extrabold text-text-primary">${Math.round(metrics.averageMargin * 100)}%</p>
        <p class="text-xs text-text-secondary">تدفقات نقدية متوقعة خلال 90 يوم: ${formatCurrency(metrics.cashFlowNext90)}</p>
    </article>
    <article class="projects-summary-card bg-surface border border-border rounded-2xl p-6 flex flex-col gap-3">
        <div class="flex items-center justify-between">
            <span class="text-xs text-text-secondary font-semibold">توزيع المخاطر</span>
            <i class="fas fa-shield-halved text-danger"></i>
        </div>
        <div class="flex flex-col gap-2 text-xs text-text-secondary">
            <div class="flex items-center justify-between"><span>منخفض</span><strong class="text-success">${metrics.riskDistribution.low}</strong></div>
            <div class="flex items-center justify-between"><span>متوسط</span><strong class="text-warning">${metrics.riskDistribution.medium}</strong></div>
            <div class="flex items-center justify-between"><span>مرتفع</span><strong class="text-danger">${metrics.riskDistribution.high}</strong></div>
        </div>
    </article>
  `;
};

const renderProjectsTable = () => {
  const allProjects = ProjectStorage.getAll();
  const filtered = applyFilters(allProjects);
  selectors.projectsCount.textContent = filtered.length;
  selectors.projectsEmptyState.classList.toggle('hidden', filtered.length > 0);
  selectors.projectsTableBody.innerHTML = '';

  filtered.forEach((project) => {
    const row = document.createElement('tr');
    row.dataset.projectId = project.id;
    const status = statusLabels[project.status] || { label: project.status, className: 'neutral' };
    const risk = riskLabels[project.riskLevel] || { label: project.riskLevel, className: 'neutral' };
    const healthClass = detectHealthClass(project);

    row.innerHTML = `
      <td class="pr-6">
        <div class="flex flex-col gap-1">
          <span class="font-semibold text-text-primary">${project.name}</span>
          <span class="text-xs text-text-secondary">${project.id} · ${project.stage || 'مرحلة غير محددة'}</span>
        </div>
      </td>
      <td>
        <div class="flex flex-col gap-1 text-sm">
          <span class="font-medium text-text-primary">${project.client}</span>
          <span class="text-xs text-text-secondary">${project.location || 'غير محدد'}</span>
        </div>
      </td>
      <td>
        <div class="flex flex-col gap-1 text-sm">
          <span class="font-bold text-text-primary">${formatCurrency(project.contractValue)}</span>
          <span class="text-xs text-text-secondary">فاتورة: ${formatCurrency(project.invoicedValue || 0)}</span>
        </div>
      </td>
      <td>
        <div class="flex flex-col gap-1">
          <div class="project-progress-bar"><span style="width: ${project.progress}%"></span></div>
          <div class="text-xs text-text-secondary flex items-center gap-2">
            <span>${formatPercentage(project.progress)}</span>
            <span class="metric-pill ${healthClass}">
              <i class="fas fa-heart-pulse"></i>
              ${project.healthIndex || 0}
            </span>
          </div>
        </div>
      </td>
      <td>
        <div class="flex flex-col gap-1 text-sm">
          <span class="font-medium text-text-primary">${project.manager}</span>
          <span class="text-xs text-text-secondary">${project.teams?.engineering?.length || 0} مهندسين</span>
        </div>
      </td>
      <td>
        <span class="projects-tag ${risk.className}">
          <i class="fas fa-triangle-exclamation"></i>
          ${risk.label || 'غير محدد'}
        </span>
      </td>
      <td>
        <span class="projects-tag ${status.className}">
          <i class="fas fa-circle"></i>
          ${status.label}
        </span>
      </td>
    `;

    row.addEventListener('click', () => selectProject(project.id));
    selectors.projectsTableBody.appendChild(row);
  });

  if (filtered.length > 0) {
    const selectedId = state.selectedProjectId && filtered.some((p) => p.id === state.selectedProjectId)
      ? state.selectedProjectId
      : filtered[0].id;
    selectProject(selectedId, { preserveScroll: true });
  } else {
    state.selectedProjectId = null;
    selectors.projectDetailPanel.classList.add('hidden');
  }
};

const renderDeliverables = (deliverables = []) => {
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
};

const renderTimeline = (timeline = []) => {
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
        risk: 'fa-bolt text-danger'
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
};

const renderTeams = (teams = {}) => {
  if (!Object.keys(teams).length) {
    return '<p class="text-xs text-text-secondary">لم يتم تعيين فرق حتى الآن.</p>';
  }
  return Object.entries(teams)
    .map(([team, members]) => {
      const label = {
        engineering: 'هندسة وإدارة تصميم',
        site: 'فرق الموقع',
        qa: 'الجودة والسلامة'
      }[team] || team;
      return `
        <div class="bg-secondary-50 border border-secondary-100 rounded-xl px-4 py-3">
          <p class="text-xs text-text-secondary">${label}</p>
          <p class="font-semibold text-text-primary">${members.join('، ')}</p>
        </div>
      `;
    })
    .join('');
};

const renderDocuments = (documents = []) => {
  if (!documents.length) {
    return '<li class="text-xs text-text-secondary">لا توجد وثائق مسجلة</li>';
  }
  return documents
    .map((document) => `
      <li class="flex items-center gap-2">
        <i class="fas fa-file-lines text-primary"></i>
        <span class="font-medium text-text-primary">${document.name}</span>
        <span class="text-xs text-text-secondary">(${document.type}) · ${document.version || 'v1.0'}</span>
      </li>
    `)
    .join('');
};

const renderMetricsGrid = (project) => {
  const duration = computeDuration(project.startDate, project.plannedCompletion);
  const metrics = [
    {
      label: 'تاريخ البدء',
      value: formatDate(project.startDate)
    },
    {
      label: 'موعد التسليم المستهدف',
      value: formatDate(project.plannedCompletion)
    },
    {
      label: 'قيمة العقد',
      value: formatCurrency(project.contractValue)
    },
    {
      label: 'التكلفة الفعلية',
      value: formatCurrency(project.actualCost || 0)
    },
    {
      label: 'نسبة الإنجاز',
      value: formatPercentage(project.progress)
    },
    {
      label: 'مدة المشروع (يوم)',
      value: duration ? duration.toLocaleString('ar-EG') : 'غير محدد'
    },
    {
      label: 'انحراف الجدول الزمني',
      value: `${project.scheduleVariance || 0} يوم`
    },
    {
      label: 'انحراف الميزانية',
      value: `${project.budgetVariance || 0}%`
    }
  ];

  selectors.detailMetrics.innerHTML = metrics
    .map(
      (metric) => `
        <div class="bg-surface border border-border rounded-xl px-4 py-3">
          <p class="text-xs text-text-secondary">${metric.label}</p>
          <p class="text-sm font-semibold text-text-primary">${metric.value}</p>
        </div>
      `
    )
    .join('');
};

const selectProject = (projectId, options = {}) => {
  if (!projectId) return;
  const project = ProjectStorage.getById(projectId);
  if (!project) return;
  state.selectedProjectId = projectId;

  const status = statusLabels[project.status] || { label: project.status, className: 'neutral' };
  const risk = riskLabels[project.riskLevel] || { label: project.riskLevel, className: 'neutral' };

  selectors.detailName.textContent = project.name;
  selectors.detailClient.textContent = `${project.client} · ${project.sector || 'قطاع غير محدد'}`;
  selectors.detailLocation.textContent = project.location || 'الموقع غير متوفر';

  selectors.detailStatus.textContent = status.label;
  selectors.detailStatus.className = `projects-tag ${status.className}`;

  selectors.detailRisk.textContent = risk.label || 'غير محدد';
  selectors.detailRisk.className = `projects-tag ${risk.className}`;

  renderMetricsGrid(project);
  selectors.detailDeliverables.innerHTML = renderDeliverables(project.deliverables);
  selectors.detailTimeline.innerHTML = renderTimeline(project.timeline);
  selectors.detailTeams.innerHTML = renderTeams(project.teams);
  selectors.detailDocuments.innerHTML = renderDocuments(project.documents);

  selectors.projectDetailPanel.classList.remove('hidden');

  selectors.openInWizardBtn.onclick = () => {
    window.location.href = `project_creation_wizard.html?project=${encodeURIComponent(project.id)}`;
  };

  selectors.downloadProjectBtn.onclick = () => {
    const projectBlob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(projectBlob);
    link.download = `${project.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!options.preserveScroll) {
    selectors.projectDetailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

const renderPipelineBoard = () => {
  const projects = ProjectStorage.getAll();
  const lanes = {
    planning: [],
    active: [],
    'on-hold': [],
    closed: []
  };

  projects.forEach((project) => {
    if (!lanes[project.status]) {
      lanes[project.status] = [];
    }
    lanes[project.status].push(project);
  });

  selectors.pipelineBoard.innerHTML = Object.entries(lanes)
    .map(([statusKey, laneProjects]) => {
      const status = statusLabels[statusKey] || { label: statusKey, className: 'neutral' };
      const totalValue = laneProjects.reduce((sum, project) => sum + (project.contractValue || 0), 0);
      return `
        <div class="projects-kanban-column">
          <header>
            <span>${status.label}</span>
            <span class="text-xs text-text-secondary">${laneProjects.length} · ${formatCurrency(totalValue)}</span>
          </header>
          <div class="flex flex-col gap-3">
            ${laneProjects
              .map(
                (project) => `
                  <article class="projects-kanban-card" data-project-id="${project.id}">
                    <div class="flex items-center justify-between text-xs text-text-secondary">
                      <span>${project.id}</span>
                      <span>${formatPercentage(project.progress)}</span>
                    </div>
                    <h3 class="text-sm font-semibold text-text-primary">${project.name}</h3>
                    <p class="text-xs text-text-secondary">${project.client} · ${project.stage || 'مرحلة غير محددة'}</p>
                    <div class="flex items-center gap-2 text-xs">
                      <span class="projects-tag ${detectHealthClass(project)}">صحة ${project.healthIndex}</span>
                      <span class="projects-tag ${riskLabels[project.riskLevel]?.className || 'neutral'}">${
                  riskLabels[project.riskLevel]?.label || 'مخاطر غير محددة'
                }</span>
                    </div>
                  </article>
                `
              )
              .join('') || '<p class="text-xs text-text-secondary">لا توجد مشاريع</p>'}
          </div>
        </div>
      `;
    })
    .join('');

  selectors.pipelineBoard.querySelectorAll('[data-project-id]').forEach((card) => {
    card.addEventListener('click', () => selectProject(card.dataset.projectId));
  });
};

const updateBadges = () => {
  const metrics = ProjectStorage.getMetrics();
  selectors.activeCountBadge.textContent = `${metrics.active} مشاريع نشطة`;
  selectors.pipelineValueBadge.textContent = `قيمة العقود ${formatCurrency(metrics.totalValue)}`;
};

const exportProjectsData = () => {
  const projects = ProjectStorage.getAll();
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `contractorpro-projects-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const resetFilters = () => {
  state.filters = {
    status: 'all',
    risk: 'all',
    manager: 'all',
    timeline: 'all',
    search: ''
  };
  selectors.statusFilter.value = 'all';
  selectors.riskFilter.value = 'all';
  selectors.managerFilter.value = 'all';
  selectors.timelineFilter.value = 'all';
  selectors.projectSearch.value = '';
  renderProjectsTable();
};

const toggleView = () => {
  state.viewMode = state.viewMode === 'table' ? 'kanban' : 'table';
  const config = viewModes[state.viewMode];
  selectors.toggleViewLabel.textContent = config.label;
  selectors.toggleViewBtn.querySelector('i').className = `fas ${config.icon}`;
  selectors.projectsDataSection.style.display = state.viewMode === 'kanban' ? 'none' : '';
  selectors.projectsPipelineSection.style.display = state.viewMode === 'kanban' ? '' : 'none';

  if (state.viewMode === 'kanban') {
    selectors.projectsPipelineSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    selectors.projectsDataSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const handleQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  const createdId = params.get('created');
  const projectId = params.get('project');

  if (createdId) {
    state.selectedProjectId = createdId;
    params.delete('created');
    window.history.replaceState({}, document.title, `${window.location.pathname}?${params.toString()}`);
  }

  if (projectId) {
    state.selectedProjectId = projectId;
  }
};

const updateSyncLabel = () => {
  const history = ProjectStorage.getHistory();
  if (!history.length) {
    selectors.lastSyncLabel.textContent = 'جارٍ التهيئة';
    return;
  }
  const last = history[history.length - 1];
  const date = new Date(last.date);
  selectors.lastSyncLabel.textContent = new Intl.DateTimeFormat('ar-SA', {
    hour: 'numeric',
    minute: 'numeric',
    day: 'numeric',
    month: 'short'
  }).format(date);
};

const bindEvents = () => {
  selectors.statusFilter.addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    renderProjectsTable();
  });

  selectors.riskFilter.addEventListener('change', (event) => {
    state.filters.risk = event.target.value;
    renderProjectsTable();
  });

  selectors.managerFilter.addEventListener('change', (event) => {
    state.filters.manager = event.target.value;
    renderProjectsTable();
  });

  selectors.timelineFilter.addEventListener('change', (event) => {
    state.filters.timeline = event.target.value;
    renderProjectsTable();
  });

  selectors.projectSearch.addEventListener('input', (event) => {
    state.filters.search = event.target.value.trim();
    renderProjectsTable();
  });

  selectors.resetFiltersBtn.addEventListener('click', resetFilters);
  selectors.toggleViewBtn.addEventListener('click', toggleView);
  selectors.exportProjectsBtn.addEventListener('click', exportProjectsData);

  selectors.newProjectBtn.addEventListener('click', () => {
    window.location.href = 'project_creation_wizard.html';
  });
};

const initialize = () => {
  ProjectStorage.initialize(initialProjects);
  handleQueryParams();
  hydrateManagers();
  renderSummaryCards();
  renderProjectsTable();
  renderPipelineBoard();
  updateBadges();
  updateSyncLabel();
  bindEvents();
  selectors.projectsPipelineSection.style.display = 'none';

  ProjectStorage.subscribe(() => {
    hydrateManagers();
    renderSummaryCards();
    renderProjectsTable();
    renderPipelineBoard();
    updateBadges();
    updateSyncLabel();
  });
};

initialize();
