import { projectStore } from './project_store.js';
import { phasesStore } from './phases_store.js';
import { expensesStore } from './expenses_store.js';
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
} from './utils.js';

const page = document.body.dataset.page;

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
  const revenue = formatCurrency(project.revenue || project.contractValue || 0);
  const profitability = formatCurrency(project.profitability || (project.revenue || 0) - (project.totalExpenses || 0));
  return `
    <article class="project-card" data-project-id="${project.id}">
      <div class="project-card__hero">
        <img data-src="${project.cover || '../assets/default-project.svg'}" alt="${project.name}" class="project-card__image" />
        <div class="project-card__status">${projectStatusBadge(project.status)}</div>
        <div class="project-card__progress">
          <span>${formatPercent(project.progress || 0)}</span>
          <div class="progress-bar"><div style="width:${project.progress || 0}%"></div></div>
        </div>
      </div>
      <div class="project-card__content">
        <header>
          <h3>${project.name}</h3>
          <p class="project-card__client"><i class="fas fa-user-tie"></i> ${project.clientName}</p>
          <p class="project-card__location"><i class="fas fa-map-marker-alt"></i> ${project.location || '—'}</p>
        </header>
        <dl class="project-card__stats">
          <div><dt>القيمة</dt><dd>${revenue}</dd></div>
          <div><dt>المصروفات</dt><dd>${expenses}</dd></div>
          <div><dt>الربحية</dt><dd>${profitability}</dd></div>
        </dl>
        <footer class="project-card__actions">
          <button class="btn btn-light" data-action="view-info">عرض المعلومات</button>
          <button class="btn btn-light" data-action="view-phases">المراحل</button>
          <button class="btn btn-light" data-action="view-expenses">المصاريف</button>
          <button class="btn btn-light" data-action="view-payments">الدفعات</button>
          <button class="btn btn-light" data-action="view-reports">التقارير</button>
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
  const button = event.target.closest('button');
  if (!button) return;
  const card = event.target.closest('.project-card');
  if (!card) return;
  const projectId = card.dataset.projectId;
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

async function setupManagementPage() {
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
  const list = document.querySelector('[data-expenses-list]');
  if (!list) return;
  const expenses = await expensesStore.all(projectId);
  list.innerHTML = expenses.length
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

  const totals = await expensesStore.totals(projectId);
  const expensesTotalEl = document.querySelector('[data-expenses-total]');
  if (expensesTotalEl) expensesTotalEl.textContent = formatCurrency(totals.expensesTotal);

  const expensesRevenueEl = document.querySelector('[data-expenses-revenue]');
  if (expensesRevenueEl) expensesRevenueEl.textContent = formatCurrency(totals.revenueTotal);
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
  const container = document.querySelector('[data-expenses-list]');
  if (!container || container.dataset.bound) return;
  container.dataset.bound = 'true';
  container.addEventListener('click', async (event) => {
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
  await renderProjectSummary(projectId);
  await renderExpenses(projectId);
  handleExpensesForm(projectId);
  bindExpensesActions(projectId);
}

async function setupPaymentsPage() {
  const projectId = ensureProjectContext();
  if (!projectId) return;
  buildBreadcrumb([
    { label: 'المشاريع', href: '../projects_management_center.html' },
    { label: 'دفعات المشروع', href: `project_payments.html?projectId=${projectId}` },
  ]);
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

window.contractorpro = window.contractorpro || {};
window.contractorpro.projectsMain = { renderProjectsGrid };
