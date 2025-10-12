const STORAGE_KEY = 'contractorpro.projectCenter.v1';

const defaultState = {
  projects: [
    {
      id: 'project-1',
      name: 'فيلا الرياض الحديثة',
      client: 'محمد العبدالله',
      status: 'قيد التنفيذ',
      value: 850000,
      progress: 45,
      description: 'مشروع فيلا سكنية حديثة في شمال الرياض مع تشطيبات فاخرة.',
      city: 'الرياض',
      startDate: '2025-01-01',
      endDate: '2025-05-30',
      contractFile: null,
      phases: [
        { id: 'phase-1', name: 'أعمال الحفر', startDate: '2025-01-02', endDate: '2025-01-15', progress: 100, status: 'done', notes: '' },
        { id: 'phase-2', name: 'الأساسات', startDate: '2025-01-16', endDate: '2025-02-10', progress: 60, status: 'in_progress', notes: 'يتم تنفيذ الخرسانة حالياً' },
        { id: 'phase-3', name: 'الأعمال الهيكلية', startDate: '2025-02-11', endDate: '2025-03-20', progress: 10, status: 'planned', notes: '' }
      ],
      expenses: [
        { id: 'expense-1', category: 'مواد', description: 'شراء حديد تسليح', date: '2025-01-18', amount: 95000 },
        { id: 'expense-2', category: 'عمالة', description: 'أجور العمال للأسبوع الثاني', date: '2025-01-22', amount: 18000 }
      ],
      subcontracts: [
        { id: 'sub-1', contractor: 'مؤسسة ركائز للبناء', description: 'تنفيذ أعمال الخرسانة', value: 180000, status: 'نشط' }
      ],
      payments: [
        { id: 'pay-1', type: 'incoming', description: 'دفعة مقدمة من العميل', date: '2025-01-05', amount: 200000, status: 'paid' },
        { id: 'pay-2', type: 'outgoing', description: 'دفعة للمقاول الفرعي', date: '2025-01-25', amount: 65000, status: 'paid' }
      ],
      reports: [
        { id: 'rep-1', date: '2025-01-18', phaseId: 'phase-2', progress: 55, summary: 'تم صب ثلاثة قواعد إضافية وتجهيز حديد الأعمدة.' }
      ],
      photos: []
    },
    {
      id: 'project-2',
      name: 'تجديد برج العليا',
      client: 'شركة الأبراج المتحدة',
      status: 'قيد الإعداد',
      value: 4200000,
      progress: 12,
      description: 'مشروع إعادة تأهيل كامل لبرج إداري في حي العليا.',
      city: 'الرياض',
      startDate: '2025-02-01',
      endDate: '2025-11-30',
      contractFile: null,
      phases: [],
      expenses: [],
      subcontracts: [],
      payments: [],
      reports: [],
      photos: []
    }
  ]
};

if (typeof structuredClone !== 'function') {
  window.structuredClone = (value) => JSON.parse(JSON.stringify(value));
}


function ensureAuthenticated() {
  try {
    const stored = localStorage.getItem('contractorpro_user');
    if (!stored) {
      window.location.href = '../login.html';
      return false;
    }
    const parsed = JSON.parse(stored);
    return Boolean(parsed && parsed.email);
  } catch (error) {
    console.warn('ContractorPro: unable to read session information.', error);
    return false;
  }
}
let state = loadState();
let activeProjectId = state.projects.length ? state.projects[0].id : null;

const refs = {
  projectsList: document.getElementById('projectsList'),
  alert: document.getElementById('alert'),
  overview: document.getElementById('projectOverview'),
  description: document.getElementById('projectDescription'),
  meta: document.getElementById('projectMeta'),
  progress: document.getElementById('projectProgress'),
  value: document.getElementById('projectValue'),
  contractSection: document.getElementById('contractSection'),
  contractContainer: document.getElementById('contractContainer'),
  phasesSection: document.getElementById('phasesSection'),
  phasesBody: document.getElementById('phasesBody'),
  expensesSection: document.getElementById('expensesSection'),
  expensesBody: document.getElementById('expensesBody'),
  subcontractsSection: document.getElementById('subcontractsSection'),
  subcontractsBody: document.getElementById('subcontractsBody'),
  paymentsSection: document.getElementById('paymentsSection'),
  paymentsBody: document.getElementById('paymentsBody'),
  reportsSection: document.getElementById('reportsSection'),
  reportsBody: document.getElementById('reportsBody'),
  analyticsSection: document.getElementById('analyticsSection'),
  analyticsGrid: document.getElementById('analyticsGrid'),
  backToList: document.getElementById('btnBackToList'),
  exportProjects: document.getElementById('btnExportProjects'),
  uploadContract: document.getElementById('btnUploadContract'),
  addPhase: document.getElementById('btnAddPhase'),
  importPhases: document.getElementById('btnImportPhases'),
  phaseCsvInput: document.getElementById('inputPhaseCsv'),
  addExpense: document.getElementById('btnAddExpense'),
  addSubcontract: document.getElementById('btnAddSubcontract'),
  addPayment: document.getElementById('btnAddPayment'),
  importPayments: document.getElementById('btnImportPayments'),
  paymentsCsvInput: document.getElementById('inputPaymentsCsv'),
  addReport: document.getElementById('btnAddReport'),
  uploadPhotos: document.getElementById('btnUploadPhotos'),
  viewReports: document.getElementById('btnViewReports'),
  updateProgress: document.getElementById('btnUpdateProgress'),
  downloadPdf: document.getElementById('btnDownloadPdf'),
  downloadExcel: document.getElementById('btnDownloadExcel'),
  contractModal: document.getElementById('modalContract'),
  contractForm: document.getElementById('contractForm'),
  contractFile: document.getElementById('contractFile'),
  contractNotes: document.getElementById('contractNotes')
};

const isAuthorized = ensureAuthenticated();

function safeAddListener(element, event, handler) {
  if (!element) {
    console.warn('ContractorPro: missing element for event listener', event);
    return;
  }
  element.addEventListener(event, handler);
}

if (isAuthorized) {
  ensureDynamicModals();
  bindStaticEvents();
  renderProjectsList();
  if (activeProjectId) {
    selectProject(activeProjectId);
  } else {
    toggleSections(false);
    if (refs.backToList) {
      refs.backToList.style.display = 'none';
    }
  }
}


function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.projects)) return structuredClone(defaultState);
    return parsed;
  } catch (error) {
    console.warn('Fallback to default state due to parsing error.', error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureDynamicModals() {
  const templates = [
    {
      id: 'modalPhase',
      titleId: 'phaseModalTitle',
      title: 'إضافة مرحلة',
      content: `
        <form id="phaseForm">
          <input type="hidden" id="phaseId" />
          <div class="form-grid">
            <div><label for="phaseName">اسم المرحلة</label><input id="phaseName" required /></div>
            <div><label for="phaseStatus">الحالة</label><select id="phaseStatus"><option value="planned">مخططة</option><option value="in_progress">جارية</option><option value="done">منتهية</option></select></div>
            <div><label for="phaseStart">تاريخ البداية</label><input type="date" id="phaseStart" required /></div>
            <div><label for="phaseEnd">تاريخ النهاية</label><input type="date" id="phaseEnd" required /></div>
            <div><label for="phaseProgress">نسبة الإنجاز %</label><input type="number" id="phaseProgress" min="0" max="100" value="0" /></div>
          </div>
          <label for="phaseNotes">ملاحظات</label>
          <textarea id="phaseNotes" placeholder="تفاصيل إضافية"></textarea>
          <div class="modal-actions">
            <button type="button" class="btn light" data-close>إلغاء</button>
            <button type="submit" class="btn">حفظ</button>
          </div>
        </form>`
    },
    {
      id: 'modalExpense',
      titleId: 'expenseModalTitle',
      title: 'إضافة مصروف',
      content: `
        <form id="expenseForm">
          <input type="hidden" id="expenseId" />
          <div class="form-grid">
            <div><label for="expenseCategory">التصنيف</label><select id="expenseCategory"><option value="مواد">مواد</option><option value="عمالة">عمالة</option><option value="معدات">معدات</option><option value="أخرى">أخرى</option></select></div>
            <div><label for="expenseAmount">المبلغ</label><input type="number" id="expenseAmount" min="0" step="0.01" required /></div>
            <div><label for="expenseDate">التاريخ</label><input type="date" id="expenseDate" required /></div>
          </div>
          <label for="expenseDescription">الوصف</label>
          <textarea id="expenseDescription" placeholder="تفاصيل المصروف"></textarea>
          <div class="modal-actions">
            <button type="button" class="btn light" data-close>إلغاء</button>
            <button type="submit" class="btn">حفظ</button>
          </div>
        </form>`
    },
    {
      id: 'modalSubcontract',
      titleId: 'subcontractModalTitle',
      title: 'إضافة عقد باطن',
      content: `
        <form id="subcontractForm">
          <input type="hidden" id="subcontractId" />
          <div class="form-grid">
            <div><label for="subcontractContractor">اسم المقاول</label><input id="subcontractContractor" required /></div>
            <div><label for="subcontractValue">قيمة العقد</label><input type="number" id="subcontractValue" min="0" step="0.01" required /></div>
            <div><label for="subcontractStatus">الحالة</label><select id="subcontractStatus"><option value="نشط">نشط</option><option value="معلق">معلق</option><option value="منجز">منجز</option></select></div>
          </div>
          <label for="subcontractDescription">الوصف</label>
          <textarea id="subcontractDescription" placeholder="تفاصيل العقد"></textarea>
          <div class="modal-actions">
            <button type="button" class="btn light" data-close>إلغاء</button>
            <button type="submit" class="btn">حفظ</button>
          </div>
        </form>`
    },
    {
      id: 'modalPayment',
      titleId: 'paymentModalTitle',
      title: 'إضافة دفعة',
      content: `
        <form id="paymentForm">
          <input type="hidden" id="paymentId" />
          <div class="form-grid">
            <div><label for="paymentType">النوع</label><select id="paymentType"><option value="incoming">واردة</option><option value="outgoing">صادرة</option></select></div>
            <div><label for="paymentAmount">المبلغ</label><input type="number" id="paymentAmount" min="0" step="0.01" required /></div>
            <div><label for="paymentDate">التاريخ</label><input type="date" id="paymentDate" required /></div>
            <div><label for="paymentStatus">الحالة</label><select id="paymentStatus"><option value="paid">مدفوعة</option><option value="pending">مستحقة</option><option value="overdue">متأخرة</option></select></div>
          </div>
          <label for="paymentDescription">الوصف</label>
          <textarea id="paymentDescription" placeholder="تفاصيل الدفعة"></textarea>
          <div class="modal-actions">
            <button type="button" class="btn light" data-close>إلغاء</button>
            <button type="submit" class="btn">حفظ</button>
          </div>
        </form>`
    },
    {
      id: 'modalReport',
      titleId: 'reportModalTitle',
      title: 'إضافة تقرير يومي',
      content: `
        <form id="reportForm">
          <input type="hidden" id="reportId" />
          <div class="form-grid">
            <div><label for="reportDate">التاريخ</label><input type="date" id="reportDate" required /></div>
            <div><label for="reportPhase">المرحلة</label><select id="reportPhase"></select></div>
            <div><label for="reportProgress">التقدّم %</label><input type="number" id="reportProgress" min="0" max="100" value="0" /></div>
          </div>
          <label for="reportSummary">ملخص الأعمال</label>
          <textarea id="reportSummary" placeholder="تفاصيل الأعمال المنفذة"></textarea>
          <div class="modal-actions">
            <button type="button" class="btn light" data-close>إلغاء</button>
            <button type="submit" class="btn">حفظ</button>
          </div>
        </form>`
    },
    {
      id: 'modalPhotos',
      titleId: 'photosModalTitle',
      title: 'رفع صور اليوم',
      content: `
        <form id="photosForm">
          <label for="photosDate">التاريخ</label>
          <input type="date" id="photosDate" required />
          <label for="photosFiles">الصور</label>
          <input type="file" id="photosFiles" accept="image/*" multiple required />
          <div class="modal-actions">
            <button type="button" class="btn light" data-close>إلغاء</button>
            <button type="submit" class="btn">رفع</button>
          </div>
        </form>`
    },
    {
      id: 'modalPreviousReports',
      titleId: 'previousReportsTitle',
      title: 'التقارير السابقة',
      content: `
        <div id="previousReportsContainer" style="display:grid;gap:0.75rem;max-height:60vh;overflow-y:auto;"></div>
        <div class="modal-actions">
          <button type="button" class="btn light" data-close>إغلاق</button>
        </div>`
    }
  ];

  templates.forEach(({ id, titleId, title, content }) => {
    if (document.getElementById(id)) return;
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = id;
    backdrop.innerHTML = `<div class="modal"><h3 id="${titleId}">${title}</h3>${content}</div>`;
    document.body.appendChild(backdrop);
  });
}

function bindStaticEvents() {
  safeAddListener(refs.backToList, 'click', () => {
    activeProjectId = null;
    highlightActiveProject();
    toggleSections(false);
    refs.backToList.style.display = 'none';
  });

  safeAddListener(refs.exportProjects, 'click', exportProjectsData);
  safeAddListener(refs.uploadContract, 'click', () => openModal('modalContract'));
  safeAddListener(refs.addPhase, 'click', () => openPhaseModal());
  safeAddListener(refs.importPhases, 'click', () => refs.phaseCsvInput && refs.phaseCsvInput.click());
  safeAddListener(refs.phaseCsvInput, 'change', handlePhasesCsvImport);
  safeAddListener(refs.addExpense, 'click', () => openExpenseModal());
  safeAddListener(refs.addSubcontract, 'click', () => openSubcontractModal());
  safeAddListener(refs.addPayment, 'click', () => openPaymentModal());
  safeAddListener(refs.importPayments, 'click', () => refs.paymentsCsvInput && refs.paymentsCsvInput.click());
  safeAddListener(refs.paymentsCsvInput, 'change', handlePaymentsCsvImport);
  safeAddListener(refs.addReport, 'click', () => openReportModal());
  safeAddListener(refs.uploadPhotos, 'click', () => openModal('modalPhotos'));
  safeAddListener(refs.viewReports, 'click', showPreviousReports);
  safeAddListener(refs.updateProgress, 'click', () => updateCumulativeProgress());
  safeAddListener(refs.downloadPdf, 'click', downloadFinancialPdf);
  safeAddListener(refs.downloadExcel, 'click', downloadFinancialExcel);

  safeAddListener(refs.contractForm, 'submit', handleContractSubmit);

  const closeButtons = document.querySelectorAll('.modal [data-close]');
  closeButtons.forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal-backdrop').id)));
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) closeModal(backdrop.id);
    });
  });

  safeAddListener(document.getElementById('phaseForm'), 'submit', handlePhaseSubmit);
  safeAddListener(document.getElementById('expenseForm'), 'submit', handleExpenseSubmit);
  safeAddListener(document.getElementById('subcontractForm'), 'submit', handleSubcontractSubmit);
  safeAddListener(document.getElementById('paymentForm'), 'submit', handlePaymentSubmit);
  safeAddListener(document.getElementById('reportForm'), 'submit', handleReportSubmit);
  safeAddListener(document.getElementById('photosForm'), 'submit', handlePhotosSubmit);
}

function renderProjectsList() {
  refs.projectsList.innerHTML = '';
  state.projects.forEach(project => {
    const item = document.createElement('li');
    item.className = 'project-card';
    item.dataset.projectId = project.id;
    item.innerHTML = `
      <h3>${escapeHtml(project.name)}</h3>
      <small>${escapeHtml(project.client)}</small>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:0.5rem;">
        <span class="chip">${escapeHtml(project.status)}</span>
        <span style="color:var(--primary);font-weight:600;">${project.progress}%</span>
      </div>`;
    item.addEventListener('click', () => selectProject(project.id));
    refs.projectsList.appendChild(item);
  });
  highlightActiveProject();
  if (!activeProjectId && state.projects.length) {
    selectProject(state.projects[0].id);
  }
}

function selectProject(projectId) {
  activeProjectId = projectId;
  highlightActiveProject();
  renderActiveProject();
  toggleSections(true);
  refs.backToList.style.display = 'inline-flex';
}

function highlightActiveProject() {
  refs.projectsList.querySelectorAll('.project-card').forEach(card => {
    card.classList.toggle('active', card.dataset.projectId === activeProjectId);
  });
}

function toggleSections(visible) {
  const sections = [refs.overview, refs.contractSection, refs.phasesSection, refs.expensesSection, refs.subcontractsSection, refs.paymentsSection, refs.reportsSection, refs.analyticsSection];
  sections.forEach(section => {
    if (!section) return;
    section.hidden = !visible;
  });
}

function renderActiveProject() {
  const project = getActiveProject();
  if (!project) return;

  refs.description.textContent = project.description || 'لا يوجد وصف متاح لهذا المشروع.';
  refs.meta.innerHTML = '';
  [
    project.client && `العميل: ${project.client}`,
    project.city && `المدينة: ${project.city}`,
    project.startDate && project.endDate && `المدة: ${project.startDate} - ${project.endDate}`
  ].filter(Boolean).forEach(value => {
    const span = document.createElement('span');
    span.className = 'chip';
    span.textContent = value;
    refs.meta.appendChild(span);
  });

  refs.progress.textContent = `${project.progress || 0}%`;
  refs.value.textContent = formatCurrency(project.value || 0);

  renderContract(project);
  renderPhases(project);
  renderExpenses(project);
  renderSubcontracts(project);
  renderPayments(project);
  renderReports(project);
  renderAnalytics(project);
}

function getActiveProject() {
  return state.projects.find(project => project.id === activeProjectId) || null;
}

function renderContract(project) {
  if (!project.contractFile) {
    refs.contractContainer.className = 'empty-state';
    refs.contractContainer.textContent = 'لم يتم رفع عقد لهذا المشروع بعد.';
    return;
  }

  refs.contractContainer.className = '';
  refs.contractContainer.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between;">
      <div>
        <p style="margin:0;font-weight:600;">${escapeHtml(project.contractFile.name)}</p>
        <p style="margin:0.3rem 0 0;color:var(--muted);font-size:0.85rem;">${formatDate(project.contractFile.uploadedAt)} · ${formatBytes(project.contractFile.size)}</p>
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <a class="btn secondary" download="${escapeHtml(project.contractFile.name)}" href="${project.contractFile.dataUrl}"><i class="fas fa-download"></i> تنزيل</a>
        <button class="btn light" id="btnReplaceContract"><i class="fas fa-sync"></i> استبدال</button>
        <button class="btn danger" id="btnDeleteContract"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;

  document.getElementById('btnReplaceContract').addEventListener('click', () => openModal('modalContract'));
  document.getElementById('btnDeleteContract').addEventListener('click', () => {
    if (!confirm('هل أنت متأكد من حذف ملف العقد؟')) return;
    project.contractFile = null;
    saveState();
    renderContract(project);
    showAlert('تم حذف ملف العقد بنجاح.', true);
  });
}

function renderPhases(project) {
  if (!project.phases.length) {
    refs.phasesBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">لم يتم إضافة مراحل بعد.</div></td></tr>`;
    return;
  }

  refs.phasesBody.innerHTML = project.phases.map(phase => `
    <tr>
      <td>${escapeHtml(phase.name)}</td>
      <td>${phase.startDate || '-'}</td>
      <td>${phase.endDate || '-'}</td>
      <td>${phase.progress ?? 0}%</td>
      <td>${translatePhaseStatus(phase.status)}</td>
      <td>
        <div class="table-actions">
          <button class="action-icon" data-edit-phase="${phase.id}"><i class="fas fa-pen"></i></button>
          <button class="action-icon danger" data-delete-phase="${phase.id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');

  refs.phasesBody.querySelectorAll('[data-edit-phase]').forEach(btn => btn.addEventListener('click', () => openPhaseModal(btn.dataset.editPhase)));
  refs.phasesBody.querySelectorAll('[data-delete-phase]').forEach(btn => btn.addEventListener('click', () => deletePhase(btn.dataset.deletePhase)));
}

function renderExpenses(project) {
  if (!project.expenses.length) {
    refs.expensesBody.innerHTML = `<tr><td colspan="5"><div class="empty-state">لا توجد مصروفات مسجلة.</div></td></tr>`;
    return;
  }

  refs.expensesBody.innerHTML = project.expenses.map(expense => `
    <tr>
      <td>${escapeHtml(expense.category)}</td>
      <td>${escapeHtml(expense.description || '')}</td>
      <td>${expense.date || '-'}</td>
      <td>${formatCurrency(expense.amount)}</td>
      <td>
        <div class="table-actions">
          <button class="action-icon" data-edit-expense="${expense.id}"><i class="fas fa-pen"></i></button>
          <button class="action-icon danger" data-delete-expense="${expense.id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');

  refs.expensesBody.querySelectorAll('[data-edit-expense]').forEach(btn => btn.addEventListener('click', () => openExpenseModal(btn.dataset.editExpense)));
  refs.expensesBody.querySelectorAll('[data-delete-expense]').forEach(btn => btn.addEventListener('click', () => deleteExpense(btn.dataset.deleteExpense)));
}

function renderSubcontracts(project) {
  if (!project.subcontracts.length) {
    refs.subcontractsBody.innerHTML = `<tr><td colspan="5"><div class="empty-state">لا توجد عقود باطن مسجلة.</div></td></tr>`;
    return;
  }

  refs.subcontractsBody.innerHTML = project.subcontracts.map(contract => `
    <tr>
      <td>${escapeHtml(contract.contractor)}</td>
      <td>${escapeHtml(contract.description || '')}</td>
      <td>${formatCurrency(contract.value)}</td>
      <td>${escapeHtml(contract.status)}</td>
      <td>
        <div class="table-actions">
          <button class="action-icon" data-edit-subcontract="${contract.id}"><i class="fas fa-pen"></i></button>
          <button class="action-icon danger" data-delete-subcontract="${contract.id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');

  refs.subcontractsBody.querySelectorAll('[data-edit-subcontract]').forEach(btn => btn.addEventListener('click', () => openSubcontractModal(btn.dataset.editSubcontract)));
  refs.subcontractsBody.querySelectorAll('[data-delete-subcontract]').forEach(btn => btn.addEventListener('click', () => deleteSubcontract(btn.dataset.deleteSubcontract)));
}

function renderPayments(project) {
  if (!project.payments.length) {
    refs.paymentsBody.innerHTML = `<tr><td colspan="6"><div class="empty-state">لا توجد دفعات مسجلة.</div></td></tr>`;
    return;
  }

  refs.paymentsBody.innerHTML = project.payments.map(payment => `
    <tr>
      <td>${payment.type === 'incoming' ? 'واردة' : 'صادرة'}</td>
      <td>${escapeHtml(payment.description || '')}</td>
      <td>${payment.date || '-'}</td>
      <td>${formatCurrency(payment.amount)}</td>
      <td>${translatePaymentStatus(payment.status)}</td>
      <td>
        <div class="table-actions">
          <button class="action-icon" data-edit-payment="${payment.id}"><i class="fas fa-pen"></i></button>
          <button class="action-icon danger" data-delete-payment="${payment.id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');

  refs.paymentsBody.querySelectorAll('[data-edit-payment]').forEach(btn => btn.addEventListener('click', () => openPaymentModal(btn.dataset.editPayment)));
  refs.paymentsBody.querySelectorAll('[data-delete-payment]').forEach(btn => btn.addEventListener('click', () => deletePayment(btn.dataset.deletePayment)));
}

function renderReports(project) {
  if (!project.reports.length) {
    refs.reportsBody.innerHTML = `<tr><td colspan="5"><div class="empty-state">لا توجد تقارير يومية حتى الآن.</div></td></tr>`;
    return;
  }

  const phasesById = Object.fromEntries(project.phases.map(phase => [phase.id, phase.name]));
  refs.reportsBody.innerHTML = project.reports
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(report => `
      <tr>
        <td>${report.date}</td>
        <td>${escapeHtml(phasesById[report.phaseId] || 'غير محدد')}</td>
        <td>${escapeHtml(report.summary || '')}</td>
        <td>${report.progress ?? 0}%</td>
        <td>
          <div class="table-actions">
            <button class="action-icon" data-edit-report="${report.id}"><i class="fas fa-pen"></i></button>
            <button class="action-icon danger" data-delete-report="${report.id}"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('');

  refs.reportsBody.querySelectorAll('[data-edit-report]').forEach(btn => btn.addEventListener('click', () => openReportModal(btn.dataset.editReport)));
  refs.reportsBody.querySelectorAll('[data-delete-report]').forEach(btn => btn.addEventListener('click', () => deleteReport(btn.dataset.deleteReport)));
}

function renderAnalytics(project) {
  const incoming = project.payments.filter(p => p.type === 'incoming').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const outgoing = project.payments.filter(p => p.type === 'outgoing').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const expenses = project.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const net = incoming - (outgoing + expenses);
  const totalProgress = project.phases.length ? Math.round(project.phases.reduce((sum, phase) => sum + Number(phase.progress || 0), 0) / project.phases.length) : project.progress || 0;

  refs.analyticsGrid.innerHTML = `
    <div class="analytics-card"><span style="font-size:0.8rem;color:var(--muted);">إجمالي الدفعات الواردة</span><strong>${formatCurrency(incoming)}</strong></div>
    <div class="analytics-card"><span style="font-size:0.8rem;color:var(--muted);">المدفوعات والمصروفات</span><strong>${formatCurrency(outgoing + expenses)}</strong></div>
    <div class="analytics-card"><span style="font-size:0.8rem;color:var(--muted);">صافي التدفق النقدي</span><strong style="color:${net >= 0 ? 'var(--primary)' : 'var(--danger)'};">${formatCurrency(net)}</strong></div>
    <div class="analytics-card"><span style="font-size:0.8rem;color:var(--muted);">التقدّم التراكمي</span><strong>${totalProgress}%</strong></div>`;
}

function handleContractSubmit(event) {
  event.preventDefault();
  const project = getActiveProject();
  if (!project) {
    showAlert('يرجى اختيار مشروع أولاً.', false);
    return;
  }

  const file = refs.contractFile.files[0];
  if (!file) {
    showAlert('يرجى اختيار ملف PDF.', false);
    return;
  }

  if (file.type !== 'application/pdf') {
    showAlert('يجب أن يكون الملف بصيغة PDF.', false);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    project.contractFile = {
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      dataUrl: reader.result,
      notes: refs.contractNotes.value.trim()
    };
    saveState();
    renderContract(project);
    closeModal('modalContract');
    refs.contractForm.reset();
    showAlert('تم حفظ عقد المشروع بنجاح.', true);
  };
  reader.readAsDataURL(file);
}

function handlePhaseSubmit(event) {
  event.preventDefault();
  const project = getActiveProject();
  if (!project) return;

  const id = document.getElementById('phaseId').value || `phase-${Date.now()}`;
  const payload = {
    id,
    name: document.getElementById('phaseName').value.trim(),
    status: document.getElementById('phaseStatus').value,
    startDate: document.getElementById('phaseStart').value,
    endDate: document.getElementById('phaseEnd').value,
    progress: Number(document.getElementById('phaseProgress').value || 0),
    notes: document.getElementById('phaseNotes').value.trim()
  };

  const index = project.phases.findIndex(phase => phase.id === id);
  if (index >= 0) {
    project.phases[index] = payload;
  } else {
    project.phases.push(payload);
  }

  saveState();
  renderPhases(project);
  populateReportPhaseOptions();
  closeModal('modalPhase');
  document.getElementById('phaseForm').reset();
  showAlert('تم حفظ بيانات المرحلة بنجاح.', true);
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const project = getActiveProject();
  if (!project) return;

  const id = document.getElementById('expenseId').value || `expense-${Date.now()}`;
  const payload = {
    id,
    category: document.getElementById('expenseCategory').value,
    amount: Number(document.getElementById('expenseAmount').value || 0),
    date: document.getElementById('expenseDate').value,
    description: document.getElementById('expenseDescription').value.trim()
  };

  const index = project.expenses.findIndex(expense => expense.id === id);
  if (index >= 0) {
    project.expenses[index] = payload;
  } else {
    project.expenses.push(payload);
  }

  saveState();
  renderExpenses(project);
  renderAnalytics(project);
  closeModal('modalExpense');
  document.getElementById('expenseForm').reset();
  showAlert('تم حفظ المصروف بنجاح.', true);
}

function handleSubcontractSubmit(event) {
  event.preventDefault();
  const project = getActiveProject();
  if (!project) return;

  const id = document.getElementById('subcontractId').value || `sub-${Date.now()}`;
  const payload = {
    id,
    contractor: document.getElementById('subcontractContractor').value.trim(),
    value: Number(document.getElementById('subcontractValue').value || 0),
    status: document.getElementById('subcontractStatus').value,
    description: document.getElementById('subcontractDescription').value.trim()
  };

  const index = project.subcontracts.findIndex(contract => contract.id === id);
  if (index >= 0) {
    project.subcontracts[index] = payload;
  } else {
    project.subcontracts.push(payload);
  }

  saveState();
  renderSubcontracts(project);
  renderAnalytics(project);
  closeModal('modalSubcontract');
  document.getElementById('subcontractForm').reset();
  showAlert('تم حفظ عقد الباطن بنجاح.', true);
}

function handlePaymentSubmit(event) {
  event.preventDefault();
  const project = getActiveProject();
  if (!project) return;

  const id = document.getElementById('paymentId').value || `payment-${Date.now()}`;
  const payload = {
    id,
    type: document.getElementById('paymentType').value,
    amount: Number(document.getElementById('paymentAmount').value || 0),
    date: document.getElementById('paymentDate').value,
    status: document.getElementById('paymentStatus').value,
    description: document.getElementById('paymentDescription').value.trim()
  };

  const index = project.payments.findIndex(payment => payment.id === id);
  if (index >= 0) {
    project.payments[index] = payload;
  } else {
    project.payments.push(payload);
  }

  saveState();
  renderPayments(project);
  renderAnalytics(project);
  closeModal('modalPayment');
  document.getElementById('paymentForm').reset();
  showAlert('تم حفظ الدفعة بنجاح.', true);
}

function handleReportSubmit(event) {
  event.preventDefault();
  const project = getActiveProject();
  if (!project) return;

  const id = document.getElementById('reportId').value || `report-${Date.now()}`;
  const payload = {
    id,
    date: document.getElementById('reportDate').value,
    phaseId: document.getElementById('reportPhase').value,
    progress: Number(document.getElementById('reportProgress').value || 0),
    summary: document.getElementById('reportSummary').value.trim()
  };

  const index = project.reports.findIndex(report => report.id === id);
  if (index >= 0) {
    project.reports[index] = payload;
  } else {
    project.reports.push(payload);
  }

  saveState();
  renderReports(project);
  updateCumulativeProgress(false);
  closeModal('modalReport');
  document.getElementById('reportForm').reset();
  showAlert('تم حفظ التقرير اليومي بنجاح.', true);
}

function handlePhotosSubmit(event) {
  event.preventDefault();
  const project = getActiveProject();
  if (!project) return;

  const files = Array.from(document.getElementById('photosFiles').files || []);
  if (!files.length) {
    showAlert('يرجى اختيار صور للرفع.', false);
    return;
  }

  const date = document.getElementById('photosDate').value;
  const readers = files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ id: `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`, name: file.name, dataUrl: reader.result, size: file.size, type: file.type, date });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  }));

  Promise.all(readers).then(results => {
    project.photos.push(...results);
    saveState();
    closeModal('modalPhotos');
    document.getElementById('photosForm').reset();
    showAlert('تم حفظ الصور وارتباطها بالتقرير اليومي.', true);
  }).catch(() => showAlert('تعذّر رفع الصور، يرجى المحاولة مرة أخرى.', false));
}

function handlePhasesCsvImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const project = getActiveProject();
    if (!project) return;
    const rows = reader.result.split(/\r?\n/).map(row => row.trim()).filter(Boolean);
    const imported = [];
    rows.forEach(row => {
      const [name, startDate, endDate, progress] = row.split(',').map(col => col.trim());
      if (!name) return;
      imported.push({
        id: `phase-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        name,
        startDate: startDate || '',
        endDate: endDate || '',
        progress: Number(progress || 0),
        status: 'planned',
        notes: ''
      });
    });

    if (!imported.length) {
      showAlert('لم يتم العثور على بيانات صالحة في الملف.', false);
      return;
    }

    project.phases.push(...imported);
    saveState();
    renderPhases(project);
    populateReportPhaseOptions();
    showAlert(`تم استيراد ${imported.length} مرحلة بنجاح.`, true);
  };
  reader.readAsText(file, 'utf-8');
  event.target.value = '';
}

function handlePaymentsCsvImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const project = getActiveProject();
    if (!project) return;
    const rows = reader.result.split(/\r?\n/).map(row => row.trim()).filter(Boolean);
    const imported = [];
    rows.forEach(row => {
      const [type, description, date, amount, status] = row.split(',').map(col => col.trim());
      if (!type || !amount) return;
      imported.push({
        id: `payment-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        type: type === 'incoming' || type === 'واردة' ? 'incoming' : 'outgoing',
        description: description || '',
        date: date || '',
        amount: Number(amount || 0),
        status: normalizePaymentStatus(status)
      });
    });

    if (!imported.length) {
      showAlert('لم يتم العثور على دفعات صالحة في الملف.', false);
      return;
    }

    project.payments.push(...imported);
    saveState();
    renderPayments(project);
    renderAnalytics(project);
    showAlert(`تم استيراد ${imported.length} دفعة بنجاح.`, true);
  };
  reader.readAsText(file, 'utf-8');
  event.target.value = '';
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function openPhaseModal(phaseId) {
  const form = document.getElementById('phaseForm');
  form.reset();
  document.getElementById('phaseId').value = phaseId || '';
  document.getElementById('phaseModalTitle').textContent = phaseId ? 'تعديل مرحلة' : 'إضافة مرحلة';
  if (phaseId) {
    const phase = findPhase(phaseId);
    if (!phase) return;
    document.getElementById('phaseName').value = phase.name;
    document.getElementById('phaseStatus').value = phase.status || 'planned';
    document.getElementById('phaseStart').value = phase.startDate || '';
    document.getElementById('phaseEnd').value = phase.endDate || '';
    document.getElementById('phaseProgress').value = phase.progress ?? 0;
    document.getElementById('phaseNotes').value = phase.notes || '';
  }
  openModal('modalPhase');
}

function openExpenseModal(expenseId) {
  const form = document.getElementById('expenseForm');
  form.reset();
  document.getElementById('expenseId').value = expenseId || '';
  document.getElementById('expenseModalTitle').textContent = expenseId ? 'تعديل مصروف' : 'إضافة مصروف';
  if (expenseId) {
    const expense = findExpense(expenseId);
    if (!expense) return;
    document.getElementById('expenseCategory').value = expense.category;
    document.getElementById('expenseAmount').value = expense.amount;
    document.getElementById('expenseDate').value = expense.date || '';
    document.getElementById('expenseDescription').value = expense.description || '';
  }
  openModal('modalExpense');
}

function openSubcontractModal(subcontractId) {
  const form = document.getElementById('subcontractForm');
  form.reset();
  document.getElementById('subcontractId').value = subcontractId || '';
  document.getElementById('subcontractModalTitle').textContent = subcontractId ? 'تعديل عقد باطن' : 'إضافة عقد باطن';
  if (subcontractId) {
    const contract = findSubcontract(subcontractId);
    if (!contract) return;
    document.getElementById('subcontractContractor').value = contract.contractor;
    document.getElementById('subcontractValue').value = contract.value;
    document.getElementById('subcontractStatus').value = contract.status;
    document.getElementById('subcontractDescription').value = contract.description || '';
  }
  openModal('modalSubcontract');
}

function openPaymentModal(paymentId) {
  const form = document.getElementById('paymentForm');
  form.reset();
  document.getElementById('paymentId').value = paymentId || '';
  document.getElementById('paymentModalTitle').textContent = paymentId ? 'تعديل دفعة' : 'إضافة دفعة';
  if (paymentId) {
    const payment = findPayment(paymentId);
    if (!payment) return;
    document.getElementById('paymentType').value = payment.type;
    document.getElementById('paymentAmount').value = payment.amount;
    document.getElementById('paymentDate').value = payment.date || '';
    document.getElementById('paymentStatus').value = payment.status || 'pending';
    document.getElementById('paymentDescription').value = payment.description || '';
  }
  openModal('modalPayment');
}

function openReportModal(reportId) {
  const form = document.getElementById('reportForm');
  form.reset();
  document.getElementById('reportId').value = reportId || '';
  document.getElementById('reportModalTitle').textContent = reportId ? 'تعديل تقرير يومي' : 'إضافة تقرير يومي';
  populateReportPhaseOptions();
  if (reportId) {
    const report = findReport(reportId);
    if (!report) return;
    document.getElementById('reportDate').value = report.date || '';
    document.getElementById('reportPhase').value = report.phaseId || '';
    document.getElementById('reportProgress').value = report.progress ?? 0;
    document.getElementById('reportSummary').value = report.summary || '';
  }
  openModal('modalReport');
}

function populateReportPhaseOptions() {
  const select = document.getElementById('reportPhase');
  if (!select) return;
  const project = getActiveProject();
  const options = (project?.phases || []).map(phase => `<option value="${phase.id}">${escapeHtml(phase.name)}</option>`).join('');
  select.innerHTML = `<option value="">-- بدون ربط --</option>${options}`;
}

function deletePhase(phaseId) {
  if (!confirm('هل أنت متأكد من حذف هذه المرحلة؟')) return;
  const project = getActiveProject();
  if (!project) return;
  project.phases = project.phases.filter(phase => phase.id !== phaseId);
  saveState();
  renderPhases(project);
  populateReportPhaseOptions();
  showAlert('تم حذف المرحلة.', true);
}

function deleteExpense(expenseId) {
  if (!confirm('هل أنت متأكد من حذف المصروف؟')) return;
  const project = getActiveProject();
  if (!project) return;
  project.expenses = project.expenses.filter(expense => expense.id !== expenseId);
  saveState();
  renderExpenses(project);
  renderAnalytics(project);
  showAlert('تم حذف المصروف.', true);
}

function deleteSubcontract(subcontractId) {
  if (!confirm('هل أنت متأكد من حذف عقد الباطن؟')) return;
  const project = getActiveProject();
  if (!project) return;
  project.subcontracts = project.subcontracts.filter(contract => contract.id !== subcontractId);
  saveState();
  renderSubcontracts(project);
  renderAnalytics(project);
  showAlert('تم حذف عقد الباطن.', true);
}

function deletePayment(paymentId) {
  if (!confirm('هل أنت متأكد من حذف الدفعة؟')) return;
  const project = getActiveProject();
  if (!project) return;
  project.payments = project.payments.filter(payment => payment.id !== paymentId);
  saveState();
  renderPayments(project);
  renderAnalytics(project);
  showAlert('تم حذف الدفعة.', true);
}

function deleteReport(reportId) {
  if (!confirm('هل أنت متأكد من حذف التقرير اليومي؟')) return;
  const project = getActiveProject();
  if (!project) return;
  project.reports = project.reports.filter(report => report.id !== reportId);
  saveState();
  renderReports(project);
  updateCumulativeProgress(false);
  showAlert('تم حذف التقرير اليومي.', true);
}

function showPreviousReports() {
  const container = document.getElementById('previousReportsContainer');
  if (!container) return;
  const project = getActiveProject();
  if (!project) return;
  const phasesById = Object.fromEntries(project.phases.map(phase => [phase.id, phase.name]));
  if (!project.reports.length) {
    container.innerHTML = '<div class="empty-state">لا توجد تقارير مسجلة.</div>';
  } else {
    container.innerHTML = project.reports
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(report => `
        <article style="border:1px solid var(--border);border-radius:14px;padding:1rem;background:#fff;">
          <header style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
            <strong>${formatDate(report.date)}</strong>
            <span class="chip">${escapeHtml(phasesById[report.phaseId] || 'غير محدد')}</span>
          </header>
          <p style="margin:0.6rem 0 0;color:var(--muted);">${escapeHtml(report.summary || 'لا يوجد ملخص')}</p>
          <p style="margin:0.4rem 0 0;font-size:0.85rem;color:var(--muted);">التقدم: ${report.progress ?? 0}%</p>
        </article>`).join('');
  }
  openModal('modalPreviousReports');
}

function updateCumulativeProgress(showMessage = true) {
  const project = getActiveProject();
  if (!project) return;
  if (!project.phases.length) {
    if (showMessage) showAlert('لا توجد مراحل لحساب التقدّم.', false);
    return;
  }
  const average = Math.round(project.phases.reduce((sum, phase) => sum + Number(phase.progress || 0), 0) / project.phases.length);
  project.progress = average;
  saveState();
  refs.progress.textContent = `${average}%`;
  renderAnalytics(project);
  if (showMessage) showAlert('تم تحديث التقدّم التراكمي بناءً على المراحل.', true);
}

function exportProjectsData() {
  const payload = { generatedAt: new Date().toISOString(), projects: state.projects };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(`contractorpro-projects-${new Date().toISOString().slice(0, 10)}.json`, blob);
  showAlert('تم تصدير بيانات المشاريع بنجاح.', true);
}

function downloadFinancialPdf() {
  const project = getActiveProject();
  if (!project) {
    showAlert('يرجى اختيار مشروع أولاً.', false);
    return;
  }
  const incoming = project.payments.filter(p => p.type === 'incoming').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const outgoing = project.payments.filter(p => p.type === 'outgoing').reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const expenses = project.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const net = incoming - (outgoing + expenses);
  const text = `تقرير مالي لمشروع ${project.name}

إجمالي الدفعات الواردة: ${incoming}
إجمالي المدفوعات: ${outgoing}
إجمالي المصروفات: ${expenses}
صافي التدفق النقدي: ${net}`;
  const pdf = buildSimplePdf(text);
  downloadBlob(`financial-report-${project.id}.pdf`, new Blob([pdf], { type: 'application/pdf' }));
  showAlert('تم إنشاء تقرير PDF المالي.', true);
}

function downloadFinancialExcel() {
  const project = getActiveProject();
  if (!project) {
    showAlert('يرجى اختيار مشروع أولاً.', false);
    return;
  }
  const rows = [
    ['البند', 'القيمة'],
    ['إجمالي الدفعات الواردة', sumAmounts(project.payments.filter(p => p.type === 'incoming'))],
    ['إجمالي الدفعات الصادرة', sumAmounts(project.payments.filter(p => p.type === 'outgoing'))],
    ['إجمالي المصروفات', sumAmounts(project.expenses)],
    ['صافي التدفق النقدي', sumAmounts(project.payments.filter(p => p.type === 'incoming')) - sumAmounts(project.payments.filter(p => p.type === 'outgoing')) - sumAmounts(project.expenses)]
  ];
  const content = rows.map(row => row.join('	')).join('\n');
  const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
  downloadBlob(`financial-report-${project.id}.xls`, blob);
  showAlert('تم إنشاء ملف Excel المالي.', true);
}

function buildSimplePdf(text) {
  const content = text.replace(/\r?\n/g, '\n');
  const sanitized = content
    .replace(/\\/g, '\\')
    .replace(/\(/g, '\(')
    .replace(/\)/g, '\)');
  const stream = `BT /F1 12 Tf 50 750 Td (${sanitized}) Tj ET`;
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length ${stream.length}>>stream
${stream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000111 00000 n 
0000000224 00000 n 
0000000277 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
${277 + stream.length}
%%EOF`;
  return pdf;
}


function showAlert(message, success) {
  refs.alert.textContent = message;
  refs.alert.style.color = success ? 'var(--primary)' : 'var(--danger)';
  refs.alert.classList.add('show');
  clearTimeout(showAlert.timer);
  showAlert.timer = setTimeout(() => refs.alert.classList.remove('show'), 4000);
}

function escapeHtml(value) {
  return (value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString('ar-EG')} ر.س`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatBytes(bytes) {
  if (!bytes) return '0 بايت';
  const units = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = (bytes / Math.pow(1024, index)).toFixed(1);
  return `${value} ${units[index]}`;
}

function translatePhaseStatus(status) {
  return { planned: 'مخططة', in_progress: 'جارية', done: 'منتهية' }[status] || 'غير معروفة';
}

function translatePaymentStatus(status) {
  return { paid: 'مدفوعة', pending: 'مستحقة', overdue: 'متأخرة' }[status] || 'غير محدد';
}

function normalizePaymentStatus(status) {
  if (!status) return 'pending';
  const normalized = status.toLowerCase();
  if (['paid', 'مدفوعة'].includes(normalized)) return 'paid';
  if (['overdue', 'متأخرة'].includes(normalized)) return 'overdue';
  return 'pending';
}

function findPhase(id) {
  const project = getActiveProject();
  return project?.phases.find(phase => phase.id === id) || null;
}

function findExpense(id) {
  const project = getActiveProject();
  return project?.expenses.find(expense => expense.id === id) || null;
}

function findSubcontract(id) {
  const project = getActiveProject();
  return project?.subcontracts.find(contract => contract.id === id) || null;
}

function findPayment(id) {
  const project = getActiveProject();
  return project?.payments.find(payment => payment.id === id) || null;
}

function findReport(id) {
  const project = getActiveProject();
  return project?.reports.find(report => report.id === id) || null;
}

function sumAmounts(items) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
