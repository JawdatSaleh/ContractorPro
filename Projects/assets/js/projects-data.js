export const initialProjects = [
  {
    id: 'PRJ-2025-001',
    name: 'مجمع الفيلات الذكية - شمال الرياض',
    client: 'شركة مساكن المستقبل',
    sector: 'سكني فاخر',
    status: 'active',
    stage: 'الهيكل الإنشائي',
    manager: 'مها السبيعي',
    startDate: '2024-01-15',
    plannedCompletion: '2025-09-30',
    actualCompletion: null,
    contractValue: 18500000,
    invoicedValue: 9400000,
    actualCost: 7300000,
    profitMargin: 0.23,
    progress: 58,
    location: 'حي الياسمين، الرياض',
    riskLevel: 'medium',
    healthIndex: 82,
    scheduleVariance: -12,
    budgetVariance: 4,
    tags: ['بنية تحتية ذكية', 'تقنيات خضراء', 'BIM'],
    teams: {
      engineering: ['مها السبيعي', 'طارق العمري'],
      site: ['زياد المطيري', 'محمد الأنصاري'],
      qa: ['أبرار العتيبي']
    },
    deliverables: [
      { label: 'إنجاز الأساسات', due: '2024-04-01', completed: true },
      { label: 'تسليم المرحلة الإنشائية', due: '2024-11-12', completed: false },
      { label: 'اختبارات أنظمة المنازل الذكية', due: '2025-05-15', completed: false }
    ],
    timeline: [
      { title: 'بدء المشروع', date: '2024-01-15', type: 'milestone' },
      { title: 'إنجاز أعمال الحفر', date: '2024-03-22', type: 'checkpoint' },
      { title: 'اعتماد المخططات التنفيذية', date: '2024-05-18', type: 'approval' },
      { title: 'بدء تركيب الأنظمة الذكية', date: '2024-12-10', type: 'planned' }
    ],
    financials: {
      retained: 0.1,
      changeOrders: 3,
      pendingInvoices: 2,
      cashFlow: [
        { month: '2024-01', value: 2500000 },
        { month: '2024-04', value: 1800000 },
        { month: '2024-07', value: 2200000 },
        { month: '2024-10', value: 2900000 }
      ]
    },
    documents: [
      { name: 'عقد التنفيذ', type: 'contract', version: 'v1.2' },
      { name: 'مخططات BIM', type: 'design', version: 'v3.4' }
    ]
  },
  {
    id: 'PRJ-2025-004',
    name: 'مستشفى التميز التخصصي - جدة',
    client: 'وزارة الصحة',
    sector: 'صحي',
    status: 'active',
    stage: 'الأعمال الميكانيكية',
    manager: 'عبدالله القحطاني',
    startDate: '2023-08-01',
    plannedCompletion: '2025-02-18',
    actualCompletion: null,
    contractValue: 32400000,
    invoicedValue: 21800000,
    actualCost: 20100000,
    profitMargin: 0.18,
    progress: 71,
    location: 'حي الشاطئ، جدة',
    riskLevel: 'high',
    healthIndex: 68,
    scheduleVariance: -26,
    budgetVariance: -7,
    tags: ['غرف عمليات', 'طاقة احتياطية', 'معايير JCI'],
    teams: {
      engineering: ['عبدالله القحطاني', 'أحمد الزهراني'],
      site: ['نواف الدوسري', 'معاذ الثقفي'],
      qa: ['هيفاء باشراحيل', 'جمانة فلمبان']
    },
    deliverables: [
      { label: 'تسليم الهيكل العام', due: '2024-02-12', completed: true },
      { label: 'تركيب وحدات العناية المركزة', due: '2024-09-30', completed: true },
      { label: 'اختبارات السلامة والحريق', due: '2025-01-20', completed: false }
    ],
    timeline: [
      { title: 'الترسية وتوقيع العقد', date: '2023-06-14', type: 'milestone' },
      { title: 'تسليم المخططات الطبية', date: '2023-11-02', type: 'checkpoint' },
      { title: 'بدء تركيب الأنظمة الطبية', date: '2024-07-11', type: 'checkpoint' },
      { title: 'تدقيق هيئة التخصصات الصحية', date: '2024-12-05', type: 'planned' }
    ],
    financials: {
      retained: 0.12,
      changeOrders: 5,
      pendingInvoices: 4,
      cashFlow: [
        { month: '2023-09', value: 4600000 },
        { month: '2023-12', value: 5800000 },
        { month: '2024-03', value: 5100000 },
        { month: '2024-09', value: 7200000 }
      ]
    },
    documents: [
      { name: 'مخططات الأنظمة الطبية', type: 'design', version: 'v2.1' },
      { name: 'خطة إدارة المخاطر', type: 'compliance', version: 'v1.0' }
    ]
  },
  {
    id: 'PRJ-2024-019',
    name: 'تطوير الواجهة البحرية - الخبر',
    client: 'أمانة المنطقة الشرقية',
    sector: 'بنية تحتية',
    status: 'planning',
    stage: 'التصميم التنفيذي',
    manager: 'نورة الدغيثر',
    startDate: '2024-05-05',
    plannedCompletion: '2026-03-14',
    actualCompletion: null,
    contractValue: 28200000,
    invoicedValue: 0,
    actualCost: 1200000,
    profitMargin: 0.21,
    progress: 16,
    location: 'كورنيش الخبر',
    riskLevel: 'low',
    healthIndex: 91,
    scheduleVariance: 4,
    budgetVariance: 9,
    tags: ['منتزهات', 'واجهات بحرية', 'مسارات دراجات'],
    teams: {
      engineering: ['نورة الدغيثر', 'سارة الدوسري'],
      site: ['بندر المقبل'],
      qa: ['مها السويلم']
    },
    deliverables: [
      { label: 'اعتماد المخطط العام', due: '2024-08-01', completed: true },
      { label: 'التصاميم التنفيذية', due: '2025-01-15', completed: false },
      { label: 'طرح المناقصات الفرعية', due: '2025-05-20', completed: false }
    ],
    timeline: [
      { title: 'إطلاق مرحلة التصميم', date: '2024-05-05', type: 'milestone' },
      { title: 'ورش العمل المجتمعية', date: '2024-06-18', type: 'checkpoint' },
      { title: 'اعتماد مخطط المرور', date: '2024-09-22', type: 'planned' }
    ],
    financials: {
      retained: 0,
      changeOrders: 0,
      pendingInvoices: 0,
      cashFlow: [
        { month: '2024-05', value: 600000 },
        { month: '2024-07', value: 600000 }
      ]
    },
    documents: [
      { name: 'دراسة الأثر البيئي', type: 'study', version: 'v1.3' },
      { name: 'خطة التفاعل المجتمعي', type: 'report', version: 'v1.0' }
    ]
  },
  {
    id: 'PRJ-2023-012',
    name: 'مركز الخدمات اللوجستية - الرياض',
    client: 'الهيئة العامة للنقل',
    sector: 'لوجستي',
    status: 'on-hold',
    stage: 'إعادة جدولة التمويل',
    manager: 'سالم الشهري',
    startDate: '2023-02-18',
    plannedCompletion: '2024-12-08',
    actualCompletion: null,
    contractValue: 15800000,
    invoicedValue: 9200000,
    actualCost: 10400000,
    profitMargin: 0.11,
    progress: 43,
    location: 'مدينة الملك عبدالله الاقتصادية',
    riskLevel: 'high',
    healthIndex: 54,
    scheduleVariance: -38,
    budgetVariance: -11,
    tags: ['مخازن تبريد', 'أنظمة تتبع', 'تمويل بنكي'],
    teams: {
      engineering: ['سالم الشهري', 'محمد الحارثي'],
      site: ['منصور باجابر'],
      qa: ['غادة العبدالله']
    },
    deliverables: [
      { label: 'تسليم المرحلة الأولى', due: '2023-12-30', completed: false },
      { label: 'إعادة توقيع التمويل', due: '2024-06-10', completed: false },
      { label: 'إطلاق التشغيل التجريبي', due: '2025-03-15', completed: false }
    ],
    timeline: [
      { title: 'بدء أعمال الأساسات', date: '2023-04-01', type: 'checkpoint' },
      { title: 'تعثر المورد الرئيسي', date: '2024-02-11', type: 'risk' },
      { title: 'إعادة التفاوض مع البنك', date: '2024-06-18', type: 'planned' }
    ],
    financials: {
      retained: 0.08,
      changeOrders: 1,
      pendingInvoices: 3,
      cashFlow: [
        { month: '2023-03', value: 2100000 },
        { month: '2023-08', value: 1800000 },
        { month: '2023-12', value: 2300000 },
        { month: '2024-04', value: 1400000 }
      ]
    },
    documents: [
      { name: 'تقرير المخاطر المالية', type: 'report', version: 'v2.0' },
      { name: 'اتفاقية التمويل البنكي', type: 'contract', version: 'v1.4' }
    ]
  },
  {
    id: 'PRJ-2022-031',
    name: 'جامعة التقنية المتقدمة - المدينة المنورة',
    client: 'وزارة التعليم',
    sector: 'تعليمي',
    status: 'closed',
    stage: 'تم التسليم النهائي',
    manager: 'أسماء الحربي',
    startDate: '2022-02-10',
    plannedCompletion: '2024-04-30',
    actualCompletion: '2024-03-12',
    contractValue: 29800000,
    invoicedValue: 29800000,
    actualCost: 26300000,
    profitMargin: 0.16,
    progress: 100,
    location: 'طريق المطار، المدينة المنورة',
    riskLevel: 'low',
    healthIndex: 96,
    scheduleVariance: 7,
    budgetVariance: 5,
    tags: ['مختبرات متقدمة', 'تعليم رقمي', 'LEED Silver'],
    teams: {
      engineering: ['أسماء الحربي', 'عبدالاله الصاعدي'],
      site: ['عبدالله القرني', 'ليث الأحمدي'],
      qa: ['هند المغامسي']
    },
    deliverables: [
      { label: 'افتتاح قاعات التدريب', due: '2023-11-20', completed: true },
      { label: 'اعتماد هيئة الاعتماد الأكاديمي', due: '2024-02-10', completed: true },
      { label: 'إغلاق مالي نهائي', due: '2024-05-30', completed: true }
    ],
    timeline: [
      { title: 'صبة الأساسات', date: '2022-05-14', type: 'checkpoint' },
      { title: 'تركيب المختبرات الذكية', date: '2023-08-19', type: 'milestone' },
      { title: 'التسليم الابتدائي', date: '2024-01-05', type: 'approval' }
    ],
    financials: {
      retained: 0,
      changeOrders: 2,
      pendingInvoices: 0,
      cashFlow: [
        { month: '2022-03', value: 3200000 },
        { month: '2022-09', value: 4800000 },
        { month: '2023-02', value: 5600000 },
        { month: '2023-11', value: 6400000 }
      ]
    },
    documents: [
      { name: 'شهادات التسليم النهائي', type: 'compliance', version: 'v1.0' },
      { name: 'تقرير الأداء التشغيلي', type: 'report', version: 'v1.2' }
    ]
  },
  {
    id: 'PRJ-2024-027',
    name: 'برج المكاتب المتكامل - نيوم',
    client: 'شركة نيوم للتطوير',
    sector: 'تجاري',
    status: 'active',
    stage: 'الأعمال المعمارية',
    manager: 'مشاعل السديري',
    startDate: '2024-03-01',
    plannedCompletion: '2026-01-30',
    actualCompletion: null,
    contractValue: 41200000,
    invoicedValue: 7100000,
    actualCost: 5800000,
    profitMargin: 0.27,
    progress: 27,
    location: 'نيوم الصناعية',
    riskLevel: 'medium',
    healthIndex: 88,
    scheduleVariance: 3,
    budgetVariance: 6,
    tags: ['واجهات زجاجية', 'أنظمة طاقة متجددة', 'مكاتب مرنة'],
    teams: {
      engineering: ['مشاعل السديري', 'سيف الدخيل'],
      site: ['محمد السلمي', 'أحمد الشريف'],
      qa: ['دلال القحطاني']
    },
    deliverables: [
      { label: 'تصميم الواجهات المعمارية', due: '2024-07-15', completed: true },
      { label: 'إنجاز الهيكل المعدني', due: '2025-02-10', completed: false },
      { label: 'ربط أنظمة الطاقة الشمسية', due: '2025-11-21', completed: false }
    ],
    timeline: [
      { title: 'توقيع عقد التصميم', date: '2024-01-19', type: 'milestone' },
      { title: 'بدء أعمال الحفر', date: '2024-04-05', type: 'checkpoint' },
      { title: 'تركيب الواجهات الزجاجية', date: '2025-03-25', type: 'planned' }
    ],
    financials: {
      retained: 0.1,
      changeOrders: 1,
      pendingInvoices: 1,
      cashFlow: [
        { month: '2024-04', value: 1800000 },
        { month: '2024-06', value: 1500000 },
        { month: '2024-09', value: 2000000 }
      ]
    },
    documents: [
      { name: 'نمذجة الطاقة المتجددة', type: 'study', version: 'v1.1' },
      { name: 'محاضر اجتماعات نيوم', type: 'meeting', version: 'v2.5' }
    ]
  }
];
