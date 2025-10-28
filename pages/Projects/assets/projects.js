(function () {
  'use strict';

  const STORAGE_KEYS = [
    'contractorpro.projects.v2',
    'contractorPro.projects',
    'contractorProjects',
    'projects'
  ];

  const DAILY_REPORT_TEMPLATES = [
    {
      summary: 'تقدم ممتاز في الأعمال الإنشائية، اكتمال صب الخرسانة للدور الأرضي.',
      progress: 12,
      blockers: 'لا توجد معوقات جوهرية، تم طلب المزيد من مواد التشطيب المبكر.',
      nextSteps: 'بدء أعمال الأعمدة والطوابق العلوية مع فريق السلامة يوم الأحد.'
    },
    {
      summary: 'تركيب شبكات التكييف الرئيسية بنسبة 60%، وتم اختبار جميع التوصيلات.',
      progress: 8,
      blockers: 'التنسيق مع المورد الخارجي لتسليم وحدات التحكم الرقمية.',
      nextSteps: 'إتمام العزل الحراري والبدء في مرحلة الاختبارات الفنية.'
    }
  ];

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'p-' + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  function formatCurrency(amount, currency = 'SAR') {
    if (!amount && amount !== 0) {
      return '—';
    }
    try {
      return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
      }).format(Number(amount));
    } catch (error) {
      return `${Number(amount).toLocaleString('ar-EG')} ${currency}`;
    }
  }

  function formatDate(date) {
    if (!date) {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(date));
    } catch (error) {
      return date;
    }
  }

  function calculateProjectProgress(project) {
    if (!project || !project.phases || project.phases.length === 0) {
      return 0;
    }
    const total = project.phases.reduce((acc, phase) => acc + (Number(phase.progress || 0)), 0);
    return Math.round(total / project.phases.length);
  }

  function normalizeLegacyProject(legacyProject) {
    if (!legacyProject) {
      return null;
    }

    const baseInfo = legacyProject.basicInformation || legacyProject;

    const phases = (legacyProject.phases || []).map((phase, index) => ({
      id: phase.id || uuid(),
      name: phase.name || phase.title || `مرحلة ${index + 1}`,
      startDate: phase.startDate || '',
      endDate: phase.endDate || '',
      progress: Number(phase.progress || phase.completion || 0),
      status: phase.status || 'planned',
      notes: phase.notes || ''
    }));

    const expenses = (legacyProject.expenses || []).map((expense) => ({
      id: expense.id || uuid(),
      category: expense.category || 'تكاليف عامة',
      amount: Number(expense.amount || 0),
      vendor: expense.vendor || expense.supplier || '',
      contractRef: expense.contractRef || '',
      date: expense.date || '',
      notes: expense.notes || ''
    }));

    const payments = (legacyProject.payments || []).map((payment) => ({
      id: payment.id || uuid(),
      title: payment.title || payment.name || 'دفعة',
      amount: Number(payment.amount || 0),
      dueDate: payment.dueDate || '',
      paidDate: payment.paidDate || '',
      status: payment.status || 'pending',
      method: payment.method || 'bank-transfer',
      notes: payment.notes || ''
    }));

    const reports = (legacyProject.dailyReports || []).map((report) => ({
      id: report.id || uuid(),
      date: report.date || report.day || '',
      summary: report.summary || report.description || '',
      progress: Number(report.progress || 0),
      blockers: report.blockers || '',
      nextSteps: report.nextSteps || report.plan || ''
    }));

    return {
      id: legacyProject.id || uuid(),
      code: baseInfo.code || `PRJ-${Math.floor(Math.random() * 9000 + 1000)}`,
      name: baseInfo.name || 'مشروع غير مسمى',
      client: baseInfo.client || 'عميل غير محدد',
      sector: baseInfo.sector || 'سكني',
      status: legacyProject.status || 'active',
      startDate: baseInfo.startDate || '',
      endDate: baseInfo.endDate || '',
      location: baseInfo.location || '',
      contractValue: Number(baseInfo.contractValue || baseInfo.budget || 0),
      currency: baseInfo.currency || 'SAR',
      manager: baseInfo.manager || baseInfo.projectManager || 'غير محدد',
      team: baseInfo.team || [],
      description: baseInfo.description || '',
      phases,
      expenses,
      payments,
      dailyReports: reports,
      documents: legacyProject.documents || [],
      createdAt: legacyProject.createdAt || new Date().toISOString(),
      updatedAt: legacyProject.updatedAt || new Date().toISOString()
    };
  }

  const seedProjects = [
    {
      id: uuid(),
      code: 'PRJ-2451',
      name: 'برج الواحة الإداري',
      client: 'مجموعة الواحة القابضة',
      sector: 'تجاري',
      status: 'active',
      startDate: '2024-01-15',
      endDate: '2025-08-30',
      location: 'الرياض - حي العقيق',
      contractValue: 18750000,
      currency: 'SAR',
      manager: 'م. أحمد المالك',
      team: ['م. سارة الشريف', 'م. عبدالعزيز الفهد', 'م. علي السالم'],
      description: 'تصميم وتنفيذ برج إداري متكامل مكون من 18 طابقاً مع مرافق ذكية ومواقف متعددة.',
      phases: [
        {
          id: uuid(),
          name: 'إعداد الموقع والخرائط',
          startDate: '2024-01-15',
          endDate: '2024-03-20',
          progress: 100,
          status: 'completed',
          notes: 'تم الاعتماد من أمانة الرياض وجاري إقفال الملفات.'
        },
        {
          id: uuid(),
          name: 'الهياكل الخرسانية',
          startDate: '2024-03-25',
          endDate: '2024-11-10',
          progress: 68,
          status: 'active',
          notes: 'تم صب 12 طابقاً، جاري التنسيق مع فريق MEP.'
        },
        {
          id: uuid(),
          name: 'الأعمال الكهربائية والميكانيكية',
          startDate: '2024-07-01',
          endDate: '2025-02-25',
          progress: 41,
          status: 'planned',
          notes: 'تم حجز الموارد والبدء في طلب المواد.'
        }
      ],
      expenses: [
        {
          id: uuid(),
          category: 'مواد البناء',
          amount: 2450000,
          vendor: 'الشركة الوطنية لمواد البناء',
          contractRef: 'CNT-9912',
          date: '2024-04-12',
          notes: 'دفعة ثانية من الخرسانة الجاهزة والأخشاب.'
        },
        {
          id: uuid(),
          category: 'معدات وتأجير',
          amount: 420000,
          vendor: 'تأجير الخليج للمعدات',
          contractRef: 'RNT-553',
          date: '2024-05-03',
          notes: 'تأجير رافعات برجية لمدة 4 أشهر.'
        }
      ],
      payments: [
        {
          id: uuid(),
          title: 'دفعة تشغيلية أولى',
          amount: 3500000,
          dueDate: '2024-03-15',
          paidDate: '2024-03-18',
          status: 'paid',
          method: 'bank-transfer',
          notes: 'تم التحويل عبر بنك الراجحي.'
        },
        {
          id: uuid(),
          title: 'دفعة ميدانية',
          amount: 2750000,
          dueDate: '2024-07-01',
          paidDate: '',
          status: 'pending',
          method: 'bank-transfer',
          notes: 'مجدولة بعد اعتماد الأعمال الخرسانية.'
        }
      ],
      dailyReports: [
        {
          id: uuid(),
          date: '2024-06-02',
          summary: 'إنجاز صب أعمدة الدور العاشر بنسبة إنجاز 15%.',
          progress: 15,
          blockers: 'تأخر توريد أنظمة المصاعد من المورد الأوروبي.',
          nextSteps: 'متابعة مع المورد وتسريع إجراءات التخليص الجمركي.'
        }
      ],
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuid(),
      code: 'PRJ-8824',
      name: 'مجمع حدائق النخيل السكني',
      client: 'هيئة الإسكان التنموي',
      sector: 'سكني',
      status: 'planning',
      startDate: '2024-09-10',
      endDate: '2026-03-18',
      location: 'الدمام - حي الريان',
      contractValue: 29800000,
      currency: 'SAR',
      manager: 'م. لمياء السويلم',
      team: ['م. نورة الهاجري', 'م. فيصل الشهري'],
      description: 'مجمع سكني يضم 12 مبنى بمتوسط 8 طوابق مع حدائق ومسطحات خضراء ومرافق مجتمعية متكاملة.',
      phases: [
        {
          id: uuid(),
          name: 'التصميم التفصيلي',
          startDate: '2024-09-10',
          endDate: '2025-01-15',
          progress: 32,
          status: 'active',
          notes: 'تم اعتماد المخططات الأولية وجاري نمذجة BIM.'
        }
      ],
      expenses: [],
      payments: [],
      dailyReports: [],
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const ProjectDataStore = {
    loadProjects() {
      for (const key of STORAGE_KEYS) {
        const raw = localStorage.getItem(key);
        if (!raw) {
          continue;
        }
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            const normalized = parsed.map((project) => normalizeLegacyProject(project) || null).filter(Boolean);
            if (normalized.length) {
              this.saveProjects(normalized);
              return normalized;
            }
          }
        } catch (error) {
          console.warn('تعذر قراءة بيانات المشاريع القديمة.', error);
        }
      }

      const fresh = localStorage.getItem(STORAGE_KEYS[0]);
      if (fresh) {
        try {
          const parsed = JSON.parse(fresh);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (error) {
          console.warn('تعذر قراءة بيانات المشاريع الحديثة.', error);
        }
      }

      this.saveProjects(seedProjects);
      return [...seedProjects];
    },

    saveProjects(projects) {
      localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(projects));
    },

    getProjects() {
      if (!this._projects) {
        this._projects = this.loadProjects();
      }
      return this._projects;
    },

    setProjects(projects) {
      this._projects = projects;
      this.saveProjects(projects);
    },

    getProjectById(projectId) {
      return this.getProjects().find((project) => project.id === projectId) || null;
    },

    upsertProject(project) {
      const projects = this.getProjects();
      const index = projects.findIndex((item) => item.id === project.id);
      const now = new Date().toISOString();
      const nextProject = { ...project, updatedAt: now };
      if (index === -1) {
        nextProject.createdAt = now;
        this.setProjects([...projects, nextProject]);
      } else {
        const updated = [...projects];
        updated[index] = nextProject;
        this.setProjects(updated);
      }
      return nextProject;
    },

    createProject(data) {
      const now = new Date().toISOString();
      const project = {
        id: uuid(),
        code: data.code || `PRJ-${Math.floor(Math.random() * 9000 + 1000)}`,
        name: data.name,
        client: data.client,
        sector: data.sector || 'سكني',
        status: data.status || 'planning',
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        location: data.location || '',
        contractValue: Number(data.contractValue || data.budget || 0),
        currency: data.currency || 'SAR',
        manager: data.manager || 'غير محدد',
        team: data.team || [],
        description: data.description || '',
        phases: data.phases || [],
        expenses: data.expenses || [],
        payments: data.payments || [],
        dailyReports: data.dailyReports || [],
        documents: data.documents || [],
        createdAt: now,
        updatedAt: now
      };
      this.upsertProject(project);
      return project;
    },

    updateProject(projectId, updates) {
      const project = this.getProjectById(projectId);
      if (!project) {
        throw new Error('تعذر العثور على المشروع المحدد.');
      }
      const next = { ...project, ...updates, updatedAt: new Date().toISOString() };
      this.upsertProject(next);
      return next;
    },

    addPhase(projectId, phase) {
      const project = this.getProjectById(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود.');
      }
      const nextPhase = {
        id: uuid(),
        name: phase.name,
        startDate: phase.startDate || '',
        endDate: phase.endDate || '',
        progress: Number(phase.progress || 0),
        status: phase.status || 'planned',
        notes: phase.notes || ''
      };
      const next = {
        ...project,
        phases: [...project.phases, nextPhase]
      };
      this.upsertProject(next);
      return nextPhase;
    },

    addExpense(projectId, expense) {
      const project = this.getProjectById(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود.');
      }
      const nextExpense = {
        id: uuid(),
        category: expense.category || 'تكاليف تشغيلية',
        amount: Number(expense.amount || 0),
        vendor: expense.vendor || '',
        contractRef: expense.contractRef || '',
        date: expense.date || new Date().toISOString().slice(0, 10),
        notes: expense.notes || ''
      };
      const next = {
        ...project,
        expenses: [...project.expenses, nextExpense]
      };
      this.upsertProject(next);
      return nextExpense;
    },

    addPayment(projectId, payment) {
      const project = this.getProjectById(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود.');
      }
      const nextPayment = {
        id: uuid(),
        title: payment.title || 'دفعة جديدة',
        amount: Number(payment.amount || 0),
        dueDate: payment.dueDate || '',
        paidDate: payment.paidDate || '',
        status: payment.status || 'pending',
        method: payment.method || 'bank-transfer',
        notes: payment.notes || ''
      };
      const next = {
        ...project,
        payments: [...project.payments, nextPayment]
      };
      this.upsertProject(next);
      return nextPayment;
    },

    addDailyReport(projectId, report) {
      const project = this.getProjectById(projectId);
      if (!project) {
        throw new Error('المشروع غير موجود.');
      }
      const template = DAILY_REPORT_TEMPLATES[Math.floor(Math.random() * DAILY_REPORT_TEMPLATES.length)];
      const nextReport = {
        id: uuid(),
        date: report.date || new Date().toISOString().slice(0, 10),
        summary: report.summary || template.summary,
        progress: Number(report.progress || template.progress || 0),
        blockers: report.blockers || template.blockers,
        nextSteps: report.nextSteps || template.nextSteps
      };
      const next = {
        ...project,
        dailyReports: [...project.dailyReports, nextReport]
      };
      this.upsertProject(next);
      return nextReport;
    }
  };

  function renderProjectOptions(select, projects, selectedId) {
    if (!select) {
      return;
    }
    select.innerHTML = '';
    projects.forEach((project) => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = `${project.name} — ${project.client}`;
      if (project.id === selectedId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  function renderInfoSection(container, project) {
    if (!container) {
      return;
    }
    if (!project) {
      container.innerHTML = '<div class="projects-empty-state">لم يتم اختيار مشروع بعد. <strong>اختر مشروعاً من القائمة أعلاه.</strong></div>';
      return;
    }
    container.innerHTML = `
      <div class="projects-card__meta">
        <span class="projects-card__meta-item"><i class="fas fa-id-card"></i> ${project.code}</span>
        <span class="projects-card__meta-item"><i class="fas fa-user-tie"></i> ${project.manager}</span>
        <span class="projects-card__meta-item"><i class="fas fa-map-marker-alt"></i> ${project.location || '—'}</span>
      </div>
      <div class="projects-card__body">
        <p>${project.description || 'لا يوجد وصف تفصيلي للمشروع.'}</p>
        <div class="projects-grid projects-grid--two">
          <div class="projects-pill-stat">
            <span>العميل</span>
            <strong>${project.client}</strong>
            <span class="projects-chip">${project.sector}</span>
          </div>
          <div class="projects-pill-stat">
            <span>قيمة العقد</span>
            <strong>${formatCurrency(project.contractValue, project.currency)}</strong>
            <span class="projects-chip">${calculateProjectProgress(project)}% تقدم</span>
          </div>
        </div>
        <div class="projects-card__meta">
          <span class="projects-card__meta-item"><i class="fas fa-calendar-day"></i> ${formatDate(project.startDate)}</span>
          <span class="projects-card__meta-item"><i class="fas fa-calendar-check"></i> ${formatDate(project.endDate)}</span>
          <span class="projects-card__meta-item"><i class="fas fa-users"></i> الفريق (${project.team.length})</span>
        </div>
      </div>
    `;
  }

  function renderPhasesSection(container, project) {
    if (!container) {
      return;
    }
    if (!project || !project.phases.length) {
      container.innerHTML = '<div class="projects-empty-state">لا توجد مراحل مضافة لهذا المشروع حتى الآن.</div>';
      return;
    }
    container.innerHTML = project.phases.map((phase, index) => `
      <article class="projects-timeline__item" data-step="${index + 1}">
        <header class="projects-card__title">
          <span>🧱</span>
          <div>
            <div class="flex items-center gap-2">
              <strong>${phase.name}</strong>
              <span class="projects-status" data-variant="${phase.status === 'completed' ? 'success' : phase.status === 'active' ? 'info' : 'warning'}">
                <i class="fas fa-circle"></i>
                ${phase.status === 'completed' ? 'منجز' : phase.status === 'active' ? 'قيد التنفيذ' : 'مخطط'}
              </span>
            </div>
            <small class="text-sm text-slate-500">${formatDate(phase.startDate)} — ${formatDate(phase.endDate)}</small>
          </div>
        </header>
        <p>${phase.notes || 'لا توجد ملاحظات مضافة لهذه المرحلة.'}</p>
        <div class="projects-progress" role="progressbar" aria-valuenow="${phase.progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="projects-progress__value" style="width:${Math.min(phase.progress, 100)}%"></div>
        </div>
      </article>
    `).join('');
  }

  function renderExpensesSection(container, project) {
    if (!container) {
      return;
    }
    if (!project || !project.expenses.length) {
      container.innerHTML = '<div class="projects-empty-state">لم يتم تسجيل مصاريف لهذا المشروع.</div>';
      return;
    }
    const total = project.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    container.innerHTML = `
      <div class="projects-card__meta">
        <span class="projects-card__meta-item"><i class="fas fa-wallet"></i> إجمالي المصاريف: ${formatCurrency(total, project.currency)}</span>
        <span class="projects-card__meta-item"><i class="fas fa-file-contract"></i> ${project.expenses.length} سندات مسجلة</span>
      </div>
      <div class="projects-table__wrapper" style="overflow-x:auto;">
        <table class="projects-table">
          <thead>
            <tr>
              <th>الفئة</th>
              <th>المورد</th>
              <th>المبلغ</th>
              <th>التاريخ</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${project.expenses.map((expense) => `
              <tr>
                <td>${expense.category}</td>
                <td>${expense.vendor || '—'}</td>
                <td>${formatCurrency(expense.amount, project.currency)}</td>
                <td>${formatDate(expense.date)}</td>
                <td>${expense.notes || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderPaymentsSection(container, project) {
    if (!container) {
      return;
    }
    if (!project || !project.payments.length) {
      container.innerHTML = '<div class="projects-empty-state">لم يتم تسجيل دفعات لهذا المشروع.</div>';
      return;
    }
    const totals = project.payments.reduce((acc, payment) => {
      const status = payment.status === 'paid' ? 'paid' : payment.status === 'overdue' ? 'overdue' : 'pending';
      acc[status] += Number(payment.amount || 0);
      return acc;
    }, { paid: 0, pending: 0, overdue: 0 });

    container.innerHTML = `
      <div class="projects-grid projects-grid--three">
        <div class="projects-pill-stat">
          <span>المدفوع</span>
          <strong>${formatCurrency(totals.paid, project.currency)}</strong>
          <span class="projects-status" data-variant="success"><i class="fas fa-check"></i> مكتمل</span>
        </div>
        <div class="projects-pill-stat">
          <span>المستحق</span>
          <strong>${formatCurrency(totals.pending, project.currency)}</strong>
          <span class="projects-status" data-variant="warning"><i class="fas fa-clock"></i> قيد المتابعة</span>
        </div>
        <div class="projects-pill-stat">
          <span>المتأخر</span>
          <strong>${formatCurrency(totals.overdue, project.currency)}</strong>
          <span class="projects-status" data-variant="danger"><i class="fas fa-exclamation-triangle"></i> متابعة عاجلة</span>
        </div>
      </div>
      <div class="projects-table__wrapper" style="overflow-x:auto;">
        <table class="projects-table">
          <thead>
            <tr>
              <th>اسم الدفعة</th>
              <th>القيمة</th>
              <th>تاريخ الاستحقاق</th>
              <th>تاريخ السداد</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${project.payments.map((payment) => `
              <tr>
                <td>${payment.title}</td>
                <td>${formatCurrency(payment.amount, project.currency)}</td>
                <td>${formatDate(payment.dueDate)}</td>
                <td>${formatDate(payment.paidDate)}</td>
                <td><span class="projects-status" data-variant="${payment.status === 'paid' ? 'success' : payment.status === 'overdue' ? 'danger' : 'warning'}">${payment.status === 'paid' ? 'مدفوع' : payment.status === 'overdue' ? 'متأخر' : 'قيد الانتظار'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderReportsSection(container, project) {
    if (!container) {
      return;
    }
    if (!project || !project.dailyReports.length) {
      container.innerHTML = '<div class="projects-empty-state">لا توجد تقارير يومية مسجلة لهذا المشروع.</div>';
      return;
    }
    container.innerHTML = project.dailyReports.slice().reverse().map((report) => `
      <article class="projects-timeline__item">
        <header class="projects-card__title">
          <span>📅</span>
          <div>
            <strong>${formatDate(report.date)}</strong>
            <div class="projects-card__meta">
              <span class="projects-card__meta-item"><i class="fas fa-chart-line"></i> تقدم ${report.progress}%</span>
            </div>
          </div>
        </header>
        <p>${report.summary}</p>
        <div class="projects-card__body">
          <div><strong>المعوقات:</strong> ${report.blockers || 'لا توجد معوقات مذكورة.'}</div>
          <div><strong>خطة الغد:</strong> ${report.nextSteps || '—'}</div>
        </div>
      </article>
    `).join('');
  }

  function attachFormHandler(modal, form, onSubmit) {
    if (!modal || !form) {
      return;
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {};
      for (const [key, value] of formData.entries()) {
        payload[key] = value;
      }
      onSubmit(payload, { close: () => modal.close(), reset: () => form.reset() });
    });
  }

  class ProjectsManagementController {
    constructor(root) {
      this.root = root;
      this.currentProjectId = null;
      this.projects = ProjectDataStore.getProjects();
      this.cacheElements();
      this.bindEvents();
      this.initialize();
    }

    cacheElements() {
      this.projectSelector = this.root.querySelector('[data-project-selector]');
      this.infoContainer = this.root.querySelector('[data-project-info]');
      this.phasesContainer = this.root.querySelector('[data-project-phases]');
      this.expensesContainer = this.root.querySelector('[data-project-expenses]');
      this.paymentsContainer = this.root.querySelector('[data-project-payments]');
      this.reportsContainer = this.root.querySelector('[data-project-reports]');
      this.projectBadge = this.root.querySelector('[data-project-status]');
      this.projectTitle = this.root.querySelector('[data-project-title]');
      this.projectClient = this.root.querySelector('[data-project-client]');
      this.projectDates = this.root.querySelector('[data-project-dates]');
      this.projectProgressBars = this.root.querySelectorAll('[data-project-progress]');
      this.quickActions = this.root.querySelectorAll('[data-action]');
      this.sidebarDate = this.root.querySelector('[data-sidebar-date]');
      this.teamList = this.root.querySelector('[data-team-list]');

      this.modals = {
        info: this.root.querySelector('#projectInfoModal'),
        phase: this.root.querySelector('#projectPhaseModal'),
        expense: this.root.querySelector('#projectExpenseModal'),
        payment: this.root.querySelector('#projectPaymentModal'),
        report: this.root.querySelector('#projectReportModal')
      };
    }

    bindEvents() {
      const urlParams = new URLSearchParams(window.location.search);
      const projectIdFromUrl = urlParams.get('project');
      if (projectIdFromUrl) {
        this.currentProjectId = projectIdFromUrl;
      }

      if (this.projectSelector) {
        this.projectSelector.addEventListener('change', (event) => {
          this.currentProjectId = event.target.value;
          this.updateHash();
          this.render();
        });
      }

      this.quickActions.forEach((button) => {
        button.addEventListener('click', () => this.handleAction(button.dataset.action));
      });

      attachFormHandler(this.modals.info, this.modals.info?.querySelector('form'), (payload, helpers) => {
        if (!this.currentProjectId) {
          return;
        }
        const team = payload.team ? payload.team.split(',').map((member) => member.trim()).filter(Boolean) : [];
        ProjectDataStore.updateProject(this.currentProjectId, {
          name: payload.name,
          client: payload.client,
          manager: payload.manager,
          status: payload.status,
          sector: payload.sector,
          location: payload.location,
          startDate: payload.startDate,
          endDate: payload.endDate,
          contractValue: Number(payload.contractValue || 0),
          currency: payload.currency || 'SAR',
          team,
          description: payload.description
        });
        this.refreshProjects();
        this.render();
        helpers.close();
      });

      attachFormHandler(this.modals.phase, this.modals.phase?.querySelector('form'), (payload, helpers) => {
        if (!this.currentProjectId) {
          return;
        }
        ProjectDataStore.addPhase(this.currentProjectId, payload);
        this.refreshProjects();
        this.render();
        helpers.reset();
        helpers.close();
      });

      attachFormHandler(this.modals.expense, this.modals.expense?.querySelector('form'), (payload, helpers) => {
        if (!this.currentProjectId) {
          return;
        }
        ProjectDataStore.addExpense(this.currentProjectId, payload);
        this.refreshProjects();
        this.render();
        helpers.reset();
        helpers.close();
      });

      attachFormHandler(this.modals.payment, this.modals.payment?.querySelector('form'), (payload, helpers) => {
        if (!this.currentProjectId) {
          return;
        }
        ProjectDataStore.addPayment(this.currentProjectId, payload);
        this.refreshProjects();
        this.render();
        helpers.reset();
        helpers.close();
      });

      attachFormHandler(this.modals.report, this.modals.report?.querySelector('form'), (payload, helpers) => {
        if (!this.currentProjectId) {
          return;
        }
        ProjectDataStore.addDailyReport(this.currentProjectId, payload);
        this.refreshProjects();
        this.render();
        helpers.reset();
        helpers.close();
      });
    }

    initialize() {
      if (!this.currentProjectId && this.projects.length) {
        this.currentProjectId = this.projects[0].id;
      }
      if (this.sidebarDate) {
        this.sidebarDate.textContent = formatDate(new Date());
      }
      renderProjectOptions(this.projectSelector, this.projects, this.currentProjectId);
      this.render();
    }

    refreshProjects() {
      this.projects = ProjectDataStore.getProjects();
    }

    get currentProject() {
      return ProjectDataStore.getProjectById(this.currentProjectId);
    }

    updateHeader(project) {
      if (!project) {
        this.projectTitle.textContent = 'اختر مشروعاً';
        this.projectClient.textContent = '';
        this.projectDates.textContent = '';
        if (this.projectBadge) {
          this.projectBadge.textContent = '—';
          this.projectBadge.dataset.variant = 'info';
        }
        this.projectProgressBars.forEach((bar) => {
          bar.style.width = '0%';
          bar.setAttribute('aria-valuenow', '0');
        });
        return;
      }
      this.projectTitle.textContent = project.name;
      this.projectClient.textContent = project.client;
      this.projectDates.textContent = `${formatDate(project.startDate)} — ${formatDate(project.endDate)}`;
      const progress = calculateProjectProgress(project);
      this.projectProgressBars.forEach((bar) => {
        bar.style.width = `${progress}%`;
        bar.setAttribute('aria-valuenow', progress);
      });
      this.projectBadge.textContent = project.status === 'active' ? 'نشط' : project.status === 'planning' ? 'قيد التخطيط' : 'مكتمل';
      this.projectBadge.dataset.variant = project.status === 'active' ? 'info' : project.status === 'planning' ? 'warning' : 'success';
    }

    handleAction(action) {
      switch (action) {
        case 'open-wizard':
          window.location.href = 'project_creation_wizard.html';
          break;
        case 'edit-info':
          this.openModal('info');
          break;
        case 'add-phase':
          this.openModal('phase');
          break;
        case 'add-expense':
          this.openModal('expense');
          break;
        case 'add-payment':
          this.openModal('payment');
          break;
        case 'add-report':
          this.openModal('report');
          break;
        case 'refresh-data':
          this.refreshProjects();
          renderProjectOptions(this.projectSelector, this.projects, this.currentProjectId);
          this.render();
          break;
        default:
          break;
      }
    }

    openModal(name) {
      const modal = this.modals[name];
      if (!modal) {
        return;
      }
      if (name === 'info') {
        const project = this.currentProject;
        if (!project) {
          return;
        }
        const form = modal.querySelector('form');
        if (form) {
          form.name.value = project.name || '';
          form.client.value = project.client || '';
          form.manager.value = project.manager || '';
          form.status.value = project.status || 'planning';
          form.sector.value = project.sector || 'سكني';
          form.location.value = project.location || '';
          form.startDate.value = project.startDate || '';
          form.endDate.value = project.endDate || '';
          form.contractValue.value = project.contractValue || '';
          form.currency.value = project.currency || 'SAR';
          form.team.value = project.team.join(', ');
          form.description.value = project.description || '';
        }
      }
      modal.showModal();
    }

    updateHash() {
      if (!this.currentProjectId) {
        history.replaceState({}, '', window.location.pathname);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      params.set('project', this.currentProjectId);
      history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }

    render() {
      const project = this.currentProject;
      this.updateHeader(project);
      if (this.teamList) {
        if (project && Array.isArray(project.team) && project.team.length) {
          this.teamList.innerHTML = project.team
            .map((member) => `<li class="projects-card__meta-item"><i class="fas fa-user"></i> ${member}</li>`)
            .join('');
        } else {
          this.teamList.innerHTML = `
            <li class="projects-card__meta-item"><i class="fas fa-lightbulb"></i> قم بدعوة أعضاء جدد من مركز الموارد البشرية</li>
            <li class="projects-card__meta-item"><i class="fas fa-paper-plane"></i> شارك تقارير التقدم عبر البريد مباشرةً</li>
          `;
        }
      }
      renderInfoSection(this.infoContainer, project);
      renderPhasesSection(this.phasesContainer, project);
      renderExpensesSection(this.expensesContainer, project);
      renderPaymentsSection(this.paymentsContainer, project);
      renderReportsSection(this.reportsContainer, project);
    }
  }

  class ProjectCreationWizard {
    constructor(root) {
      this.root = root;
      this.steps = Array.from(root.querySelectorAll('[data-wizard-step]'));
      this.sections = Array.from(root.querySelectorAll('[data-wizard-section]'));
      this.currentStep = 0;
      this.state = {
        info: {},
        phases: [],
        expenses: [],
        payments: [],
        reports: []
      };
      this.cacheElements();
      this.bindEvents();
      this.render();
    }

    cacheElements() {
      this.nextButton = this.root.querySelector('[data-wizard-next]');
      this.prevButton = this.root.querySelector('[data-wizard-prev]');
      this.finishButton = this.root.querySelector('[data-wizard-finish]');
      this.summaryContainer = this.root.querySelector('[data-wizard-summary]');
      this.progressBar = this.root.querySelector('[data-wizard-progress]');
      this.forms = {
        info: this.root.querySelector('#wizardInfoForm'),
        phase: this.root.querySelector('#wizardPhaseForm'),
        expense: this.root.querySelector('#wizardExpenseForm'),
        payment: this.root.querySelector('#wizardPaymentForm'),
        report: this.root.querySelector('#wizardReportForm')
      };
      this.lists = {
        phases: this.root.querySelector('[data-list="phases"]'),
        expenses: this.root.querySelector('[data-list="expenses"]'),
        payments: this.root.querySelector('[data-list="payments"]'),
        reports: this.root.querySelector('[data-list="reports"]')
      };
    }

    bindEvents() {
      if (this.nextButton) {
        this.nextButton.addEventListener('click', () => {
          if (this.currentStep === 0 && this.forms.info) {
            this.forms.info.requestSubmit();
            return;
          }
          this.goToStep(this.currentStep + 1);
        });
      }
      if (this.prevButton) {
        this.prevButton.addEventListener('click', () => this.goToStep(this.currentStep - 1));
      }
      if (this.finishButton) {
        this.finishButton.addEventListener('click', () => this.handleFinish());
      }

      if (this.forms.info) {
        this.forms.info.addEventListener('submit', (event) => {
          event.preventDefault();
          const formData = new FormData(this.forms.info);
          this.state.info = Object.fromEntries(formData.entries());
          this.goToStep(this.currentStep + 1);
        });
      }

      if (this.forms.phase) {
        this.forms.phase.addEventListener('submit', (event) => {
          event.preventDefault();
          const formData = new FormData(this.forms.phase);
          const payload = Object.fromEntries(formData.entries());
          payload.id = uuid();
          payload.progress = Number(payload.progress || 0);
          this.state.phases.push(payload);
          this.forms.phase.reset();
          this.renderLists();
        });
      }

      if (this.forms.expense) {
        this.forms.expense.addEventListener('submit', (event) => {
          event.preventDefault();
          const formData = new FormData(this.forms.expense);
          const payload = Object.fromEntries(formData.entries());
          payload.id = uuid();
          payload.amount = Number(payload.amount || 0);
          this.state.expenses.push(payload);
          this.forms.expense.reset();
          this.renderLists();
        });
      }

      if (this.forms.payment) {
        this.forms.payment.addEventListener('submit', (event) => {
          event.preventDefault();
          const formData = new FormData(this.forms.payment);
          const payload = Object.fromEntries(formData.entries());
          payload.id = uuid();
          payload.amount = Number(payload.amount || 0);
          this.state.payments.push(payload);
          this.forms.payment.reset();
          this.renderLists();
        });
      }

      if (this.forms.report) {
        this.forms.report.addEventListener('submit', (event) => {
          event.preventDefault();
          const formData = new FormData(this.forms.report);
          const payload = Object.fromEntries(formData.entries());
          payload.id = uuid();
          payload.progress = Number(payload.progress || 0);
          this.state.reports.push(payload);
          this.forms.report.reset();
          this.renderLists();
        });
      }

      this.root.querySelectorAll('[data-remove-item]').forEach((button) => {
        button.addEventListener('click', () => this.removeItem(button.dataset.removeItem, button.dataset.itemId));
      });
    }

    goToStep(step) {
      if (step < 0 || step >= this.sections.length) {
        return;
      }
      this.currentStep = step;
      this.render();
    }

    render() {
      this.steps.forEach((step, index) => {
        step.dataset.active = index === this.currentStep;
      });
      this.sections.forEach((section, index) => {
        section.hidden = index !== this.currentStep;
      });
      if (this.prevButton) {
        this.prevButton.disabled = this.currentStep === 0;
      }
      if (this.nextButton) {
        this.nextButton.hidden = this.currentStep >= this.sections.length - 1;
        this.nextButton.innerHTML = this.currentStep >= this.sections.length - 2
          ? '<i class="fas fa-clipboard-check"></i> الانتقال للمراجعة'
          : 'التالي <i class="fas fa-arrow-left"></i>';
      }
      if (this.finishButton) {
        this.finishButton.hidden = this.currentStep !== this.sections.length - 1;
      }
      if (this.progressBar) {
        const percentage = Math.round((this.currentStep / (this.sections.length - 1)) * 100);
        this.progressBar.style.width = `${percentage}%`;
        this.progressBar.setAttribute('aria-valuenow', percentage);
      }
      if (this.root.style) {
        this.root.style.setProperty('--wizard-step', this.currentStep.toString());
      }
      this.renderLists();
      this.renderSummary();
    }

    renderLists() {
      if (this.lists.phases) {
        this.lists.phases.innerHTML = this.state.phases.length ? this.state.phases.map((phase) => `
          <li class="projects-kanban__card">
            <div class="flex items-center justify-between">
              <strong>${phase.name}</strong>
              <button type="button" class="projects-button projects-button--ghost" data-remove-item="phases" data-item-id="${phase.id}">إزالة</button>
            </div>
            <div class="projects-card__meta">
              <span class="projects-card__meta-item"><i class="fas fa-calendar"></i> ${formatDate(phase.startDate)} - ${formatDate(phase.endDate)}</span>
              <span class="projects-card__meta-item"><i class="fas fa-percent"></i> ${phase.progress}%</span>
            </div>
            <p>${phase.notes || '—'}</p>
          </li>
        `).join('') : '<div class="projects-empty-state">أضف مراحل المشروع باستخدام النموذج أعلاه.</div>';
      }

      if (this.lists.expenses) {
        this.lists.expenses.innerHTML = this.state.expenses.length ? this.state.expenses.map((expense) => `
          <li class="projects-kanban__card">
            <div class="flex items-center justify-between">
              <strong>${expense.category}</strong>
              <button type="button" class="projects-button projects-button--ghost" data-remove-item="expenses" data-item-id="${expense.id}">إزالة</button>
            </div>
            <div class="projects-card__meta">
              <span class="projects-card__meta-item"><i class="fas fa-coins"></i> ${formatCurrency(expense.amount)}</span>
              <span class="projects-card__meta-item"><i class="fas fa-store"></i> ${expense.vendor || '—'}</span>
            </div>
            <p>${expense.notes || '—'}</p>
          </li>
        `).join('') : '<div class="projects-empty-state">سجل المصاريف الرئيسية المرتبطة بالمشروع.</div>';
      }

      if (this.lists.payments) {
        this.lists.payments.innerHTML = this.state.payments.length ? this.state.payments.map((payment) => `
          <li class="projects-kanban__card">
            <div class="flex items-center justify-between">
              <strong>${payment.title}</strong>
              <button type="button" class="projects-button projects-button--ghost" data-remove-item="payments" data-item-id="${payment.id}">إزالة</button>
            </div>
            <div class="projects-card__meta">
              <span class="projects-card__meta-item"><i class="fas fa-coins"></i> ${formatCurrency(payment.amount)}</span>
              <span class="projects-card__meta-item"><i class="fas fa-calendar-check"></i> ${formatDate(payment.dueDate)}</span>
            </div>
            <p>${payment.notes || '—'}</p>
          </li>
        `).join('') : '<div class="projects-empty-state">حدد خطة الدفعات المتوقعة للمشروع.</div>';
      }

      if (this.lists.reports) {
        this.lists.reports.innerHTML = this.state.reports.length ? this.state.reports.map((report) => `
          <li class="projects-kanban__card">
            <div class="flex items-center justify-between">
              <strong>${formatDate(report.date)}</strong>
              <button type="button" class="projects-button projects-button--ghost" data-remove-item="reports" data-item-id="${report.id}">إزالة</button>
            </div>
            <p>${report.summary}</p>
            <div class="projects-card__meta">
              <span class="projects-card__meta-item"><i class="fas fa-chart-line"></i> ${report.progress}%</span>
            </div>
          </li>
        `).join('') : '<div class="projects-empty-state">يمكنك إضافة تقارير يومية مبدئية لتخطيط المشروع.</div>';
      }

      this.root.querySelectorAll('[data-remove-item]').forEach((button) => {
        button.addEventListener('click', () => this.removeItem(button.dataset.removeItem, button.dataset.itemId));
      });
    }

    removeItem(group, id) {
      const collection = this.state[group];
      if (!collection) {
        return;
      }
      this.state[group] = collection.filter((item) => item.id !== id);
      this.renderLists();
    }

    renderSummary() {
      if (!this.summaryContainer) {
        return;
      }
      const info = this.state.info;
      const totals = {
        expenses: this.state.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        payments: this.state.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      };

      this.summaryContainer.innerHTML = `
        <div class="projects-review">
          <div class="projects-review__group">
            <strong>🧾 المعلومات الأساسية</strong>
            <div>اسم المشروع: <strong>${info.name || '—'}</strong></div>
            <div>العميل: <strong>${info.client || '—'}</strong></div>
            <div>مدير المشروع: ${info.manager || '—'}</div>
            <div>الفريق: ${info.team || '—'}</div>
            <div>الفترة: ${formatDate(info.startDate)} — ${formatDate(info.endDate)}</div>
            <div>قيمة العقد: ${formatCurrency(info.contractValue || info.budget || 0)}</div>
          </div>
          <div class="projects-review__group">
            <strong>🧱 مراحل المشروع (${this.state.phases.length})</strong>
            ${this.state.phases.map((phase) => `<div>${phase.name} — تقدم ${phase.progress}%</div>`).join('') || '<div>لم يتم إضافة مراحل.</div>'}
          </div>
          <div class="projects-review__group">
            <strong>💰 المصاريف (${this.state.expenses.length})</strong>
            <div>إجمالي المصاريف المخطط لها: ${formatCurrency(totals.expenses)}</div>
          </div>
          <div class="projects-review__group">
            <strong>💳 الدفعات (${this.state.payments.length})</strong>
            <div>قيمة الدفعات: ${formatCurrency(totals.payments)}</div>
          </div>
          <div class="projects-review__group">
            <strong>📅 التقارير اليومية (${this.state.reports.length})</strong>
            ${this.state.reports.map((report) => `<div>${formatDate(report.date)} — ${report.summary}</div>`).join('') || '<div>لم يتم تسجيل تقارير.</div>'}
          </div>
        </div>
      `;
    }

    handleFinish() {
      if (!this.state.info.name || !this.state.info.client) {
        alert('يرجى إكمال المعلومات الأساسية للمشروع.');
        this.goToStep(0);
        return;
      }
      const info = { ...this.state.info };
      const team = info.team
        ? info.team.split(',').map((member) => member.trim()).filter(Boolean)
        : [];
      const project = ProjectDataStore.createProject({
        ...info,
        team,
        contractValue: info.contractValue,
        phases: this.state.phases,
        expenses: this.state.expenses,
        payments: this.state.payments,
        dailyReports: this.state.reports
      });
      window.location.href = `projects_management_center.html?project=${project.id}&created=true`;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    if (page === 'project-management') {
      const root = document.querySelector('[data-projects-root]');
      if (root) {
        new ProjectsManagementController(root);
      }
    }
    if (page === 'project-wizard') {
      const root = document.querySelector('[data-wizard-root]');
      if (root) {
        new ProjectCreationWizard(root);
      }
    }
  });

  window.ContractorProjects = {
    ProjectDataStore,
    calculateProjectProgress,
    formatCurrency,
    formatDate
  };
})();
