import { initialProjects } from './projects-data.js';
import {
  ProjectStorage,
  formatCurrency,
  formatDate,
  generateProjectId
} from './projects-storage.js';

const DRAFT_KEY = 'contractorpro.projects.wizardDraft';

const selectors = {
  form: document.getElementById('projectWizardForm'),
  steps: Array.from(document.querySelectorAll('.wizard-step')),
  stepCards: Array.from(document.querySelectorAll('#wizardSteps .step-card')),
  nextStepBtn: document.getElementById('nextStepBtn'),
  backStepBtn: document.getElementById('backStepBtn'),
  nextStepLabel: document.getElementById('nextStepLabel'),
  progressBar: document.getElementById('wizardProgressBar'),
  progressLabel: document.getElementById('wizardProgressLabel'),
  projectPreview: document.getElementById('projectPreview'),
  previewTemplate: document.getElementById('previewTemplate'),
  reviewSummary: document.getElementById('reviewSummary'),
  resetWizardBtn: document.getElementById('resetWizardBtn')
};

const params = new URLSearchParams(window.location.search);
const editingProjectId = params.get('project');

const state = {
  currentStep: 1,
  totalSteps: 4,
  editing: Boolean(editingProjectId),
  formData: {},
  generatedId: editingProjectId || generateProjectId()
};

const parseTeams = (teamsText) => {
  if (!teamsText) {
    return {
      engineering: [],
      site: [],
      qa: []
    };
  }
  const lines = teamsText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const result = {
    engineering: [],
    site: [],
    qa: []
  };

  lines.forEach((line) => {
    const [teamKeyRaw, membersRaw] = line.split(':');
    if (!teamKeyRaw) return;
    const key = teamKeyRaw.trim().toLowerCase();
    const members = membersRaw ? membersRaw.split(',').map((item) => item.trim()).filter(Boolean) : [];
    if (key.includes('هندس')) result.engineering = members;
    else if (key.includes('موقع')) result.site = members;
    else if (key.includes('جودة') || key.includes('سلام')) result.qa = members;
    else result[key] = members;
  });

  return result;
};

const parseTags = (tagsText) =>
  tagsText
    ? tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

const saveDraft = () => {
  try {
    const data = new FormData(selectors.form);
    const draft = Object.fromEntries(data.entries());
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (error) {
    console.warn('Unable to save wizard draft', error);
  }
};

const loadDraft = () => {
  if (editingProjectId) return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};

const clearDraft = () => {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    console.warn('Unable to clear draft', error);
  }
};

const fillForm = (data = {}) => {
  Object.entries(data).forEach(([name, value]) => {
    const field = selectors.form.elements.namedItem(name);
    if (!field) return;
    if (field.type === 'date' && value) {
      field.value = value.slice(0, 10);
    } else if (field.type === 'textarea') {
      field.value = value;
    } else if (Array.isArray(field)) {
      Array.from(field).forEach((item) => {
        if (item.value === value) item.checked = true;
      });
    } else {
      field.value = value;
    }
  });
};

const updateStepVisibility = () => {
  selectors.steps.forEach((step) => {
    const stepNumber = Number(step.dataset.step);
    step.classList.toggle('hidden', stepNumber !== state.currentStep);
  });

  selectors.stepCards.forEach((card) => {
    const stepNumber = Number(card.dataset.step);
    if (stepNumber < state.currentStep) {
      card.classList.remove('bg-secondary-50', 'border-secondary-100');
      card.classList.add('bg-success-50', 'border-success-200', 'text-success');
    } else if (stepNumber === state.currentStep) {
      card.classList.add('bg-primary-50', 'border-primary-200');
      card.classList.remove('bg-secondary-50', 'border-secondary-100');
    } else {
      card.classList.add('bg-secondary-50', 'border-secondary-100');
      card.classList.remove('bg-primary-50', 'border-primary-200', 'bg-success-50', 'border-success-200', 'text-success');
    }
  });

  const progress = Math.round((state.currentStep / state.totalSteps) * 100);
  selectors.progressBar.style.width = `${progress}%`;
  selectors.progressLabel.textContent = `${progress}%`;
  selectors.backStepBtn.disabled = state.currentStep === 1;
  selectors.backStepBtn.classList.toggle('opacity-50', state.currentStep === 1);
  selectors.nextStepLabel.textContent = state.currentStep === state.totalSteps ? (state.editing ? 'تحديث المشروع' : 'إطلاق المشروع') : 'التالي';
};

const collectFormData = () => {
  const formData = new FormData(selectors.form);
  const data = Object.fromEntries(formData.entries());
  data.progress = Number(data.progress || 0);
  data.contractValue = Number(data.contractValue || 0);
  data.expectedCost = Number(data.expectedCost || 0);
  data.retained = Number(data.retained || 0);
  data.changeOrders = Number(data.changeOrders || 0);
  data.tags = parseTags(data.tags);
  data.teams = parseTeams(data.teams);
  return data;
};

const formatPreview = (data) => {
  const preview = selectors.previewTemplate.content.cloneNode(true);
  preview.querySelector('[data-field="id"]').textContent = data.id || 'سيتم توليده';
  preview.querySelector('[data-field="name"]').textContent = data.name || 'اسم المشروع';
  preview.querySelector('[data-field="client"]').textContent = data.client || 'الجهة المالكة';
  preview.querySelector('[data-field="status"]').textContent = data.statusLabel || 'غير محدد';
  preview.querySelector('[data-field="stage"]').textContent = data.stage || 'سيتم التحديد';
  preview.querySelector('[data-field="contractValue"]').textContent =
    data.contractValue ? formatCurrency(data.contractValue) : '0 ر.س';
  preview.querySelector('[data-field="startDate"]').textContent = data.startDate ? formatDate(data.startDate) : '-';
  preview.querySelector('[data-field="manager"]').textContent = data.manager || '-';
  preview.querySelector('[data-field="location"]').textContent = data.location || '-';
  preview.querySelector('[data-field="tags"]').textContent = data.tags?.length
    ? `الكلمات المفتاحية: ${data.tags.join('، ')}`
    : 'لم يتم تحديد كلمات مفتاحية بعد';
  return preview;
};

const statusLabel = (value) =>
  ({
    planning: 'قيد التخطيط',
    active: 'نشط',
    'on-hold': 'معلق',
    closed: 'منجز'
  }[value] || value || 'غير محدد');

const updatePreview = () => {
  const data = collectFormData();
  if (!data.id) {
    data.id = state.generatedId;
  }
  data.statusLabel = statusLabel(data.status);
  selectors.projectPreview.innerHTML = '';
  selectors.projectPreview.appendChild(formatPreview(data));
};

const buildDeliverables = (data) => {
  const today = new Date();
  const due1 = data.startDate ? new Date(data.startDate) : today;
  const due2 = data.plannedCompletion ? new Date(data.plannedCompletion) : today;
  const mid = new Date((due1.getTime() + due2.getTime()) / 2);
  return [
    {
      label: 'اعتماد المخططات التفصيلية',
      due: due1.toISOString().slice(0, 10),
      completed: false
    },
    {
      label: 'إنجاز المرحلة الوسطى',
      due: mid.toISOString().slice(0, 10),
      completed: false
    },
    {
      label: 'تسليم المشروع مبدئياً',
      due: due2.toISOString().slice(0, 10),
      completed: false
    }
  ];
};

const buildTimeline = (data) => {
  const start = data.startDate ? new Date(data.startDate) : new Date();
  const planned = data.plannedCompletion ? new Date(data.plannedCompletion) : new Date();
  const design = new Date(start);
  design.setMonth(design.getMonth() + 2);
  const execution = new Date(design);
  execution.setMonth(execution.getMonth() + 6);
  return [
    { title: 'إطلاق المشروع', date: start.toISOString().slice(0, 10), type: 'milestone' },
    { title: 'انتهاء التصميم التنفيذي', date: design.toISOString().slice(0, 10), type: 'checkpoint' },
    { title: 'تقرير تقدم منتصف المشروع', date: execution.toISOString().slice(0, 10), type: 'checkpoint' },
    { title: 'التسليم المستهدف', date: planned.toISOString().slice(0, 10), type: 'planned' }
  ];
};

const buildFinancials = (data) => {
  const periods = [];
  const start = data.startDate ? new Date(data.startDate) : new Date();
  const portion = Math.max(1, Math.min(4, Math.round(data.progress / 25) || 4));
  for (let index = 0; index < portion; index += 1) {
    const month = new Date(start);
    month.setMonth(start.getMonth() + index * 3);
    const value = Math.round((data.contractValue / portion) || 0);
    periods.push({ month: month.toISOString().slice(0, 7), value });
  }
  return {
    retained: data.retained || 0,
    changeOrders: data.changeOrders || 0,
    pendingInvoices: 0,
    cashFlow: periods
  };
};

const computeHealthIndex = (data) => {
  let base = 80;
  if (data.status === 'planning') base += 5;
  if (data.status === 'active') base += 3;
  if (data.status === 'on-hold') base -= 15;
  if (data.riskLevel === 'high') base -= 15;
  if (data.riskLevel === 'medium') base -= 5;
  base += Math.min(10, Math.floor((data.progress || 0) / 10));
  return Math.max(45, Math.min(98, base));
};

const buildProjectPayload = (formValues, existing = null) => {
  const id = existing?.id || state.generatedId;
  const profit = formValues.contractValue - formValues.expectedCost;
  const margin = formValues.contractValue
    ? Number((profit / formValues.contractValue).toFixed(2))
    : 0;

  const deliverables = existing?.deliverables?.length
    ? existing.deliverables
    : buildDeliverables(formValues);
  const timeline = existing?.timeline?.length
    ? existing.timeline
    : buildTimeline(formValues);
  const financials = existing?.financials
    ? {
        ...existing.financials,
        retained: formValues.retained ?? existing.financials.retained ?? 0,
        changeOrders: formValues.changeOrders ?? existing.financials.changeOrders ?? 0,
        cashFlow:
          existing.financials.cashFlow && existing.financials.cashFlow.length > 0
            ? existing.financials.cashFlow
            : buildFinancials(formValues).cashFlow,
        pendingInvoices: existing.financials.pendingInvoices ?? 0
      }
    : buildFinancials(formValues);
  const documents = existing?.documents?.length
    ? existing.documents
    : [
        { name: 'خطة إدارة المشروع', type: 'plan', version: 'v1.0' },
        { name: 'بيان نطاق العمل', type: 'scope', version: 'v1.0' }
      ];

  return {
    ...existing,
    id,
    name: formValues.name,
    client: formValues.client,
    sector: formValues.sector,
    status: formValues.status || existing?.status || 'planning',
    stage: formValues.stage || existing?.stage || 'إطلاق المشروع',
    manager: formValues.manager,
    startDate: formValues.startDate,
    plannedCompletion: formValues.plannedCompletion,
    actualCompletion: existing?.actualCompletion ?? null,
    contractValue: formValues.contractValue,
    invoicedValue: existing?.invoicedValue ?? 0,
    actualCost: formValues.expectedCost,
    profitMargin: margin,
    progress: formValues.progress || existing?.progress || 0,
    location: formValues.location,
    riskLevel: formValues.riskLevel || existing?.riskLevel || 'medium',
    healthIndex: computeHealthIndex(formValues),
    scheduleVariance: existing?.scheduleVariance ?? 0,
    budgetVariance: formValues.expectedCost
      ? Number(((profit / formValues.expectedCost) * 100).toFixed(1))
      : 0,
    tags: formValues.tags,
    teams: formValues.teams,
    deliverables,
    timeline,
    financials,
    documents,
    scopeSummary: formValues.scope,
    createdFromWizard: true
  };
};

const renderReview = () => {
  const data = collectFormData();
  const existing = editingProjectId ? ProjectStorage.getById(editingProjectId) : null;
  const project = buildProjectPayload(data, existing);
  selectors.reviewSummary.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-surface border border-border rounded-xl px-4 py-3">
        <p class="text-xs text-text-secondary">المشروع</p>
        <p class="text-sm font-semibold text-text-primary">${project.name}</p>
        <p class="text-xs text-text-secondary">${project.client} · ${project.sector}</p>
      </div>
      <div class="bg-surface border border-border rounded-xl px-4 py-3">
        <p class="text-xs text-text-secondary">القيمة المالية</p>
        <p class="text-sm font-semibold text-text-primary">${formatCurrency(project.contractValue)}</p>
        <p class="text-xs text-text-secondary">التكلفة المتوقعة: ${formatCurrency(project.actualCost)}</p>
      </div>
      <div class="bg-surface border border-border rounded-xl px-4 py-3">
        <p class="text-xs text-text-secondary">الجدول الزمني</p>
        <p class="text-sm font-semibold text-text-primary">${formatDate(project.startDate)} → ${formatDate(project.plannedCompletion)}</p>
        <p class="text-xs text-text-secondary">الإنجاز الحالي: ${project.progress}%</p>
      </div>
      <div class="bg-surface border border-border rounded-xl px-4 py-3">
        <p class="text-xs text-text-secondary">إدارة المخاطر</p>
        <p class="text-sm font-semibold text-text-primary">${statusLabel(project.status)} · ${project.riskLevel}</p>
        <p class="text-xs text-text-secondary">هامش الربح المتوقع: ${(project.profitMargin * 100).toFixed(1)}%</p>
      </div>
    </div>
  `;
};

const validateCurrentStep = () => {
  const stepElement = selectors.steps.find((step) => Number(step.dataset.step) === state.currentStep);
  if (!stepElement) return true;
  const inputs = Array.from(stepElement.querySelectorAll('input, select, textarea'));
  return inputs.every((input) => {
    if (!input.required) return true;
    if (input.value?.trim?.()) return true;
    input.reportValidity();
    input.classList.add('border-danger');
    return false;
  });
};

const handleNext = () => {
  if (!validateCurrentStep()) return;
  if (state.currentStep === state.totalSteps) {
    const data = collectFormData();
    const existing = state.editing ? ProjectStorage.getById(editingProjectId) : null;
    const payload = buildProjectPayload(data, existing);
    if (state.editing) {
      ProjectStorage.update(payload.id, payload);
    } else {
      ProjectStorage.add(payload);
    }
    clearDraft();
    const paramsOut = new URLSearchParams();
    paramsOut.set(state.editing ? 'project' : 'created', payload.id);
    window.location.href = `projects_management_center.html?${paramsOut.toString()}`;
    return;
  }
  state.currentStep += 1;
  updateStepVisibility();
  if (state.currentStep === state.totalSteps) {
    renderReview();
  }
};

const handleBack = () => {
  if (state.currentStep === 1) return;
  state.currentStep -= 1;
  updateStepVisibility();
};

const loadEditingProject = () => {
  if (!editingProjectId) return;
  const project = ProjectStorage.getById(editingProjectId);
  if (!project) return;
  fillForm({
    name: project.name,
    client: project.client,
    sector: project.sector,
    location: project.location,
    manager: project.manager,
    scope: project.scopeSummary || '',
    startDate: project.startDate,
    plannedCompletion: project.plannedCompletion,
    stage: project.stage,
    progress: project.progress,
    status: project.status,
    riskLevel: project.riskLevel,
    contractValue: project.contractValue,
    expectedCost: project.actualCost,
    retained: project.financials?.retained || 0,
    changeOrders: project.financials?.changeOrders || 0,
    teams: `هندسة: ${(project.teams?.engineering || []).join(', ')}\nالموقع: ${(project.teams?.site || []).join(', ')}\nالجودة: ${(project.teams?.qa || []).join(', ')}`,
    tags: project.tags?.join(', ') || ''
  });
};

const resetWizard = () => {
  selectors.form.reset();
  state.generatedId = editingProjectId || generateProjectId();
  state.currentStep = 1;
  clearDraft();
  updateStepVisibility();
  updatePreview();
};

const init = () => {
  ProjectStorage.initialize(initialProjects);
  const draft = loadDraft();
  if (draft) fillForm(draft);
  if (editingProjectId) loadEditingProject();
  updateStepVisibility();
  updatePreview();

  selectors.form.addEventListener('input', () => {
    if (!state.editing) saveDraft();
    updatePreview();
    if (state.currentStep === state.totalSteps) {
      renderReview();
    }
  });

  selectors.nextStepBtn.addEventListener('click', (event) => {
    event.preventDefault();
    handleNext();
  });

  selectors.backStepBtn.addEventListener('click', (event) => {
    event.preventDefault();
    handleBack();
  });

  selectors.resetWizardBtn.addEventListener('click', () => {
    if (confirm('هل ترغب في إعادة ضبط المعالج بالكامل؟')) {
      resetWizard();
    }
  });

  if (state.editing) {
    selectors.nextStepLabel.textContent = 'تحديث المشروع';
    selectors.nextStepBtn.classList.remove('bg-primary');
    selectors.nextStepBtn.classList.add('bg-success', 'hover:bg-success-600');
  }
};

init();
