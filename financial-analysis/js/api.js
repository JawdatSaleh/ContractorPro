const projects = [
  {
    id: "p1",
    name: "برج الواجهة البحرية",
    currency: "SAR",
    start_date: "2023-01-01",
    end_date: "2024-12-31",
    bac: 5200000,
    vat_rate: 0.15,
  },
  {
    id: "p2",
    name: "Logistics Hub Expansion",
    currency: "USD",
    start_date: "2023-06-15",
    end_date: "2025-03-30",
    bac: 7800000,
    vat_rate: 0.1,
  },
];

const phases = [
  {
    id: "ph1",
    project_id: "p1",
    name: "الأعمال الترابية",
    wbs_code: "1.1",
    planned_start: "2023-01-01",
    planned_end: "2023-03-30",
    planned_percent: 100,
    actual_percent: 100,
    bac_phase: 800000,
  },
  {
    id: "ph2",
    project_id: "p1",
    name: "البنية التحتية",
    wbs_code: "1.2",
    planned_start: "2023-04-01",
    planned_end: "2023-08-15",
    planned_percent: 95,
    actual_percent: 82,
    bac_phase: 1400000,
  },
  {
    id: "ph3",
    project_id: "p1",
    name: "الأعمال المعمارية",
    wbs_code: "1.3",
    planned_start: "2023-08-20",
    planned_end: "2024-05-30",
    planned_percent: 70,
    actual_percent: 54,
    bac_phase: 2100000,
  },
  {
    id: "ph4",
    project_id: "p1",
    name: "التشطيبات",
    wbs_code: "1.4",
    planned_start: "2024-05-01",
    planned_end: "2024-12-31",
    planned_percent: 30,
    actual_percent: 18,
    bac_phase: 900000,
  },
  {
    id: "ph5",
    project_id: "p2",
    name: "Site Preparation",
    wbs_code: "2.1",
    planned_start: "2023-06-15",
    planned_end: "2023-10-01",
    planned_percent: 100,
    actual_percent: 100,
    bac_phase: 1200000,
  },
];

const changeOrders = [
  {
    id: "co1",
    project_id: "p1",
    title: "زيادة مساحة المكاتب",
    amount: 350000,
    type: "increase",
    approved_on: "2023-11-15",
  },
  {
    id: "co2",
    project_id: "p1",
    title: "تعديل نظام التكييف",
    amount: -120000,
    type: "decrease",
    approved_on: "2024-02-10",
  },
  {
    id: "co3",
    project_id: "p2",
    title: "Cold Storage Upgrade",
    amount: 450000,
    type: "increase",
    approved_on: "2024-04-03",
  },
];

const expenses = [
  {
    id: "ex1",
    project_id: "p1",
    phase_id: "ph2",
    contract_id: "c1",
    cost_code: "02-300",
    description: "خرسانة جاهزة",
    amount: 180000,
    currency: "SAR",
    tax: 0.15,
    date: "2023-08-10",
  },
  {
    id: "ex2",
    project_id: "p1",
    phase_id: "ph3",
    contract_id: "c2",
    cost_code: "03-410",
    description: "أجور مقاول البنية",
    amount: 265000,
    currency: "SAR",
    tax: 0.15,
    date: "2023-11-05",
  },
  {
    id: "ex3",
    project_id: "p1",
    phase_id: "ph3",
    contract_id: "c3",
    cost_code: "04-100",
    description: "مواد تشطيب مستوردة",
    amount: 95000,
    currency: "USD",
    tax: 0,
    date: "2024-02-16",
  },
  {
    id: "ex4",
    project_id: "p1",
    phase_id: "ph4",
    contract_id: "c4",
    cost_code: "04-220",
    description: "عمالة إضافية",
    amount: 78000,
    currency: "SAR",
    tax: 0.15,
    date: "2024-05-22",
  },
];

const contractorPayments = [
  {
    id: "cp1",
    project_id: "p1",
    contractor: "شركة العمود",
    amount: 220000,
    currency: "SAR",
    retention: 0.05,
    paid_on: "2023-10-02",
  },
  {
    id: "cp2",
    project_id: "p1",
    contractor: "Elite Interiors",
    amount: 68000,
    currency: "USD",
    retention: 0.1,
    paid_on: "2024-03-18",
  },
];

const clientInvoices = [
  {
    id: "inv1",
    project_id: "p1",
    number: "INV-2023-005",
    amount: 460000,
    currency: "SAR",
    due_date: "2023-10-15",
    status: "paid",
    collected_amount: 460000,
  },
  {
    id: "inv2",
    project_id: "p1",
    number: "INV-2023-009",
    amount: 520000,
    currency: "SAR",
    due_date: "2023-12-15",
    status: "overdue",
    collected_amount: 0,
  },
  {
    id: "inv3",
    project_id: "p1",
    number: "INV-2024-004",
    amount: 280000,
    currency: "USD",
    due_date: "2024-04-30",
    status: "partial",
    collected_amount: 90000,
  },
];

const dailyReports = [
  {
    id: "dr1",
    project_id: "p1",
    date: "2024-01-10",
    actual_percent: 45,
    labor_hours: 680,
  },
  {
    id: "dr2",
    project_id: "p1",
    date: "2024-02-14",
    actual_percent: 49,
    labor_hours: 720,
  },
  {
    id: "dr3",
    project_id: "p1",
    date: "2024-03-18",
    actual_percent: 52,
    labor_hours: 760,
  },
];

const exchangeRates = [
  { from: "USD", to: "SAR", rate: 3.75, date: "2024-04-01" },
  { from: "EUR", to: "SAR", rate: 4.05, date: "2024-04-01" },
  { from: "SAR", to: "USD", rate: 0.2666, date: "2024-04-01" },
];

const networkDelay = () => 200 + Math.random() * 300;

function respond(data) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(data)), networkDelay());
  });
}

export function fetchProjects() {
  return respond(projects);
}

export function fetchPhases(projectId) {
  return respond(phases.filter((phase) => phase.project_id === projectId));
}

export function fetchChangeOrders(projectId) {
  return respond(changeOrders.filter((order) => order.project_id === projectId));
}

export function fetchExpenses(projectId) {
  return respond(expenses.filter((expense) => expense.project_id === projectId));
}

export function fetchClientInvoices(projectId) {
  return respond(clientInvoices.filter((invoice) => invoice.project_id === projectId));
}

export function fetchContractorPayments(projectId) {
  return respond(contractorPayments.filter((payment) => payment.project_id === projectId));
}

export function fetchDailyReports(projectId) {
  return respond(dailyReports.filter((report) => report.project_id === projectId));
}

export function fetchExchangeRates() {
  return respond(exchangeRates);
}
