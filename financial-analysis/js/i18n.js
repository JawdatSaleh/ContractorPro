const translations = {
  ar: {
    direction: "rtl",
    langLabel: "العربية",
    nav: {
      info: "المعلومات",
      phases: "مراحل المشروع",
      financial: "التحليل المالي",
      expenses: "المصاريف والعقود",
      payments: "دفعات المشروع",
      reports: "التقارير اليومية",
    },
    titles: {
      financialAnalysis: "التحليل المالي",
      filters: "إعدادات التحليل",
      overview: "المؤشرات الرئيسية",
      charts: "لوحات بيانية",
      tables: "الجداول التفصيلية",
    },
    filters: {
      project: "المشروع",
      phase: "المرحلة",
      invoiceStatus: "حالة الفاتورة",
      currency: "العملة",
      dateFrom: "من تاريخ",
      dateTo: "إلى تاريخ",
      subtitle: "اختر المشروع والمرحلة والعملات لرؤية المؤشرات المناسبة.",
    },
    actions: {
      apply: "تطبيق",
      reset: "إعادة تعيين",
      export: "تصدير",
    },
    charts: {
      cashflow: "التدفق النقدي",
      cashflowDesc: "رسم يظهر التدفق النقدي الداخل والخارج وصافي التدفق شهريًا.",
      budgetActual: "الميزانية مقابل الفعلي",
      cpiSpi: "أداء الجدول والتكلفة",
      waterfall: "تأثير أوامر التغيير",
    },
    tables: {
      variance: "الانحراف حسب المرحلة",
      expenses: "دفتر المصروفات",
      payments: "فواتير العملاء / دفعات المقاولين",
      phase: "المرحلة",
      planned: "القيمة المخططة",
      earned: "القيمة المكتسبة",
      actual: "التكلفة الفعلية",
      cv: "انحراف التكلفة",
      sv: "انحراف الجدول",
      date: "التاريخ",
      costCode: "كود التكلفة",
      description: "الوصف",
      amount: "المبلغ",
      tax: "الضريبة",
      type: "النوع",
      reference: "المرجع",
      status: "الحالة",
      net: "الصافي",
      empty: "لا توجد بيانات",
    },
    modal: {
      title: "تفاصيل القيود",
    },
    whatif: {
      title: "محاكاة السيناريوهات",
      subtitle: "قم بضبط التغييرات وشاهد تأثيرها على مؤشرات المشروع.",
      materials: "تكلفة المواد",
      labor: "تكلفة الأجور",
      scope: "تغير نطاق العمل",
      delay: "تأخير التنفيذ (أيام)",
      baseline: "الوضع الحالي",
      scenario: "السيناريو",
    },
    tooltips: {
      budget: "الميزانية المعتمدة (BAC)",
      ac: "التكلفة الفعلية",
      pv: "القيمة المخططة",
      ev: "القيمة المكتسبة",
      cv: "انحراف التكلفة",
      sv: "انحراف الجدول",
      cpi: "مؤشر أداء التكلفة",
      spi: "مؤشر أداء الجدول",
      eac: "التكلفة المتوقعة عند الإكمال",
      etc: "التكلفة المتبقية",
      vac: "فرق الميزانية عند الإكمال",
      burnRate: "معدل الحرق",
      netCashFlow: "التدفق النقدي الصافي",
    },
  },
  en: {
    direction: "ltr",
    langLabel: "English",
    nav: {
      info: "Info",
      phases: "Project Phases",
      financial: "Financial Analysis",
      expenses: "Expenses & Contracts",
      payments: "Project Payments",
      reports: "Daily Reports",
    },
    titles: {
      financialAnalysis: "Financial Analysis",
      filters: "Analysis Settings",
      overview: "Key Indicators",
      charts: "Visual Dashboards",
      tables: "Detailed Tables",
    },
    filters: {
      project: "Project",
      phase: "Phase",
      invoiceStatus: "Invoice Status",
      currency: "Currency",
      dateFrom: "Date from",
      dateTo: "Date to",
      subtitle: "Select project, phases, and currency to tailor the insights.",
    },
    actions: {
      apply: "Apply",
      reset: "Reset",
      export: "Export",
    },
    charts: {
      cashflow: "Cash Flow",
      cashflowDesc: "Line chart showing incoming/outgoing/net cash flow per month.",
      budgetActual: "Budget vs Actual",
      cpiSpi: "CPI / SPI",
      waterfall: "Change Order Impact",
    },
    tables: {
      variance: "Variance by Phase",
      expenses: "Expense Ledger",
      payments: "Client Invoices / Contractor Payments",
      phase: "Phase",
      planned: "Planned Value",
      earned: "Earned Value",
      actual: "Actual Cost",
      cv: "Cost Variance",
      sv: "Schedule Variance",
      date: "Date",
      costCode: "Cost Code",
      description: "Description",
      amount: "Amount",
      tax: "Tax",
      type: "Type",
      reference: "Reference",
      status: "Status",
      net: "Net",
      empty: "No data",
    },
    modal: {
      title: "Entry Details",
    },
    whatif: {
      title: "What-if Simulator",
      subtitle: "Adjust assumptions and see the impact on project indicators.",
      materials: "Material Cost",
      labor: "Labor Cost",
      scope: "Scope Change",
      delay: "Execution Delay (days)",
      baseline: "Baseline",
      scenario: "Scenario",
    },
    tooltips: {
      budget: "Budget at Completion (BAC)",
      ac: "Actual Cost",
      pv: "Planned Value",
      ev: "Earned Value",
      cv: "Cost Variance",
      sv: "Schedule Variance",
      cpi: "Cost Performance Index",
      spi: "Schedule Performance Index",
      eac: "Estimate at Completion",
      etc: "Estimate to Complete",
      vac: "Variance at Completion",
      burnRate: "Burn Rate",
      netCashFlow: "Net Cash Flow",
    },
  },
};

const listeners = new Set();

export function onLanguageChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function translatePage(lang) {
  const dict = translations[lang];
  if (!dict) return;

  document.documentElement.lang = lang;
  document.documentElement.dir = dict.direction;

  const rtlSheet = document.getElementById("rtlStylesheet");
  if (rtlSheet) {
    rtlSheet.disabled = dict.direction !== "rtl";
  }

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const keys = element.dataset.i18n.split(".");
    let value = dict;
    keys.forEach((key) => {
      if (value && Object.prototype.hasOwnProperty.call(value, key)) {
        value = value[key];
      }
    });
    if (typeof value === "string") {
      element.textContent = value;
    }
  });

  listeners.forEach((callback) => callback(lang, dict));
}

export function getDictionary(lang) {
  return translations[lang];
}

export const availableLanguages = Object.keys(translations);
