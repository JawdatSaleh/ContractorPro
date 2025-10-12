import { translatePage, getDictionary } from "./i18n.js";
import {
  getState,
  subscribe,
  setLanguage,
  setProject,
  setSelectedPhases,
  updateFilters,
  setExchangeRates,
  convertCurrency,
} from "./state.js";
import {
  fetchProjects,
  fetchPhases,
  fetchExpenses,
  fetchClientInvoices,
  fetchContractorPayments,
  fetchDailyReports,
  fetchExchangeRates,
  fetchChangeOrders,
} from "./api.js";
import { aggregatePhases, calcAC, computeKpis, toNumber } from "./formulas.js";
import {
  renderCashflowChart,
  renderBudgetVsActual,
  renderCpiSpiChart,
  renderWaterfallChangeOrders,
} from "./charts.js";
import { renderKpiCards, bindModal, buildList, setupLanguageButtons } from "./ui.js";
import { renderVarianceTable, renderExpenseTable, renderPaymentsTable, exportTable } from "./tables.js";
import { runScenario } from "./whatif.js";

dayjs.extend(window.dayjs_plugin_isoWeek);

const dataStore = {
  projects: [],
  phases: [],
  expenses: [],
  clientInvoices: [],
  contractorPayments: [],
  dailyReports: [],
  changeOrders: [],
};

const modal = bindModal();

async function bootstrap() {
  setupLanguageButtons({
    currentLang: getState().lang,
    onChange: (lang) => {
      setLanguage(lang);
      translatePage(lang);
      refreshView();
    },
  });

  translatePage(getState().lang);

  const [projectList, rates] = await Promise.all([fetchProjects(), fetchExchangeRates()]);
  dataStore.projects = projectList;
  setExchangeRates(rates);
  populateProjectSelect(projectList);

  const defaultProject = projectList[0];
  if (defaultProject) {
    setProject(defaultProject.id);
    updateFilters({ currency: defaultProject.currency });
    await loadProjectData(defaultProject.id);
  }

  bindFilterEvents();
  bindExportButtons();
  bindWhatIf();
  subscribe((state) => {
    document.documentElement.lang = state.lang;
  });

  refreshView();
}

document.addEventListener("DOMContentLoaded", bootstrap);

async function loadProjectData(projectId) {
  const [phaseData, expenseData, invoices, payments, reports, changeOrders] = await Promise.all([
    fetchPhases(projectId),
    fetchExpenses(projectId),
    fetchClientInvoices(projectId),
    fetchContractorPayments(projectId),
    fetchDailyReports(projectId),
    fetchChangeOrders(projectId),
  ]);

  dataStore.phases = phaseData;
  dataStore.expenses = expenseData;
  dataStore.clientInvoices = invoices;
  dataStore.contractorPayments = payments;
  dataStore.dailyReports = reports;
  dataStore.changeOrders = changeOrders;

  populatePhaseSelect(phaseData);
  populateStatusSelect(invoices);
}

function populateProjectSelect(projects) {
  const select = document.getElementById("projectSelect");
  select.innerHTML = projects
    .map((project) => `<option value="${project.id}">${project.name}</option>`)
    .join("");
}

function populatePhaseSelect(phases) {
  const select = document.getElementById("phaseSelect");
  select.innerHTML = phases
    .map((phase) => `<option value="${phase.id}">${phase.name}</option>`)
    .join("");
}

function populateStatusSelect(invoices) {
  const select = document.getElementById("statusSelect");
  const statuses = Array.from(new Set(invoices.map((invoice) => invoice.status)));
  select.innerHTML = ["all", ...statuses]
    .map((status) => `<option value="${status}">${status}</option>`)
    .join("");
}

function bindFilterEvents() {
  const projectSelect = document.getElementById("projectSelect");
  const phaseSelect = document.getElementById("phaseSelect");
  const currencySelect = document.getElementById("currencySelect");
  const statusSelect = document.getElementById("statusSelect");
  const dateFrom = document.getElementById("dateFrom");
  const dateTo = document.getElementById("dateTo");

  document.getElementById("applyFilters").addEventListener("click", () => {
    updateFilters({
      invoiceStatus: statusSelect.value,
      currency: currencySelect.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
    });
    setSelectedPhases(Array.from(phaseSelect.selectedOptions).map((option) => option.value));
    refreshView();
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    statusSelect.value = "all";
    dateFrom.value = "";
    dateTo.value = "";
    Array.from(phaseSelect.options).forEach((option) => {
      option.selected = false;
    });
    const project = dataStore.projects.find((item) => item.id === getState().currentProjectId);
    if (project) {
      currencySelect.value = project.currency;
      updateFilters({ currency: project.currency, invoiceStatus: "all", dateFrom: null, dateTo: null });
    }
    setSelectedPhases([]);
    refreshView();
  });

  projectSelect.addEventListener("change", async (event) => {
    const projectId = event.target.value;
    setProject(projectId);
    const project = dataStore.projects.find((item) => item.id === projectId);
    if (project) {
      updateFilters({ currency: project.currency });
      currencySelect.value = project.currency;
    }
    await loadProjectData(projectId);
    refreshView();
  });

  const currencyOptions = new Set();
  dataStore.projects.forEach((project) => currencyOptions.add(project.currency));
  ["SAR", "USD", "EUR"].forEach((currency) => currencyOptions.add(currency));
  currencySelect.innerHTML = Array.from(currencyOptions)
    .map((currency) => `<option value="${currency}">${currency}</option>`)
    .join("");
  const defaultCurrency = getProjectCurrency();
  if (defaultCurrency) {
    currencySelect.value = defaultCurrency;
  }
}

function bindExportButtons() {
  document.querySelectorAll(".export-table").forEach((button) => {
    button.addEventListener("click", () => {
      const tableKey = button.dataset.table;
      const format = button.dataset.format;
      exportTable(tableKey, format);
    });
  });

  document.querySelectorAll(".export-chart").forEach((button) => {
    button.addEventListener("click", () => {
      const chartId = button.dataset.chart;
      const canvas = document.getElementById(`${chartId}Chart`);
      if (!canvas) return;
      html2canvas(canvas).then((canvasSnapshot) => {
        const link = document.createElement("a");
        link.download = `${chartId}-${dayjs().format("YYYYMMDD-HHmm")}.png`;
        link.href = canvasSnapshot.toDataURL("image/png");
        link.click();
      });
    });
  });
}

function bindWhatIf() {
  document.querySelectorAll(".whatif-panel input[type='range']").forEach((slider) => {
    const label = document.querySelector(`.slider-value[data-for='${slider.id}']`);
    slider.addEventListener("input", () => {
      label.textContent = slider.id === "delaySlider" ? slider.value : `${slider.value}%`;
      updateWhatIf();
    });
  });
  updateWhatIf();
}

function refreshView() {
  const state = getState();
  const dictionary = getDictionary(state.lang);
  const selectedPhases = state.selectedPhaseIds;

  const filteredPhases = selectedPhases.length
    ? dataStore.phases.filter((phase) => selectedPhases.includes(phase.id))
    : dataStore.phases;

  const phaseAgg = aggregatePhases(filteredPhases);
  const expenseList = filterByDate(dataStore.expenses, state.filters);
  const expensesAC = calcAC(
    expenseList.map((expense) => ({
      amount: convertCurrency(expense.amount, expense.currency, state.filters.currency),
    }))
  );

  const invoiceList = filterByStatus(filterByDate(dataStore.clientInvoices, state.filters), state.filters.invoiceStatus);
  const paymentList = filterByDate(dataStore.contractorPayments, state.filters);
  const dailyReports = filterByDate(dataStore.dailyReports, state.filters);

  const incoming = invoiceList.map((invoice) =>
    convertCurrency(invoice.collected_amount || invoice.amount, invoice.currency, state.filters.currency)
  );
  const outgoingExpenses = expenseList.map((expense) =>
    convertCurrency(expense.amount, expense.currency, state.filters.currency)
  );
  const outgoingPayments = paymentList.map((payment) =>
    convertCurrency(payment.amount, payment.currency, state.filters.currency)
  );

  const incomingTotal = incoming.reduce((sum, value) => sum + value, 0);
  const outgoingTotal = outgoingExpenses.reduce((sum, value) => sum + value, 0) + outgoingPayments.reduce((sum, value) => sum + value, 0);

  const elapsedPeriods = Math.max(dailyReports.length, 1);
  const kpis = computeKpis({
    bac: convertCurrency(phaseAgg.bac, getProjectCurrency(), state.filters.currency),
    ac: expensesAC,
    pv: convertCurrency(phaseAgg.pv, getProjectCurrency(), state.filters.currency),
    ev: convertCurrency(phaseAgg.ev, getProjectCurrency(), state.filters.currency),
    elapsedPeriods,
    incoming: incomingTotal,
    outgoing: outgoingTotal,
  });

  renderKpiCards({
    container: document.getElementById("kpiContainer"),
    kpis,
    currency: state.filters.currency,
    lang: state.lang,
  });

  renderCharts({ kpis, dictionary, invoiceList, paymentList, expenseList });
  renderTables({ dictionary, expenseList, invoiceList, paymentList });
  updateWhatIf(kpis);
}

function renderCharts({ kpis, dictionary, invoiceList, paymentList, expenseList }) {
  const state = getState();
  const currency = state.filters.currency;
  const locale = state.lang === "ar" ? "ar-SA" : "en-US";

  const monthLabels = buildMonthlyLabels();
  const cashInSeries = monthLabels.map((month) => {
    const monthlyInvoices = invoiceList.filter((invoice) => dayjs(invoice.due_date).format("YYYY-MM") === month);
    const total = monthlyInvoices.reduce(
      (sum, invoice) => sum + convertCurrency(invoice.collected_amount || invoice.amount, invoice.currency, currency),
      0
    );
    return total;
  });
  cashInSeries.meta = monthLabels.map((month) => invoiceList.filter((invoice) => dayjs(invoice.due_date).format("YYYY-MM") === month));

  const cashOutSeries = monthLabels.map((month) => {
    const expenseTotal = expenseList
      .filter((expense) => dayjs(expense.date).format("YYYY-MM") === month)
      .reduce((sum, expense) => sum + convertCurrency(expense.amount, expense.currency, currency), 0);
    const paymentTotal = paymentList
      .filter((payment) => dayjs(payment.paid_on).format("YYYY-MM") === month)
      .reduce((sum, payment) => sum + convertCurrency(payment.amount, payment.currency, currency), 0);
    return expenseTotal + paymentTotal;
  });
  cashOutSeries.meta = monthLabels.map((month) => {
    const relatedExpenses = expenseList.filter((expense) => dayjs(expense.date).format("YYYY-MM") === month);
    const relatedPayments = paymentList.filter((payment) => dayjs(payment.paid_on).format("YYYY-MM") === month);
    return [...relatedExpenses, ...relatedPayments];
  });

  const netSeries = monthLabels.map((_, index) => cashInSeries[index] - cashOutSeries[index]);
  netSeries.meta = monthLabels.map((month) => ({ label: month }));

  renderCashflowChart({
    labels: monthLabels,
    incoming: cashInSeries,
    outgoing: cashOutSeries,
    net: netSeries,
    locale,
    onDrilldown: (payload) => openDrilldown(payload, dictionary),
  });

  const phaseLabels = dataStore.phases.map((phase) => phase.name);
  const budgetSeries = dataStore.phases.map((phase) =>
    convertCurrency(phase.bac_phase, getProjectCurrency(), currency)
  );
  budgetSeries.meta = dataStore.phases;
  const actualSeries = dataStore.phases.map((phase) => {
    const expensesForPhase = expenseList.filter((expense) => expense.phase_id === phase.id);
    return expensesForPhase.reduce(
      (sum, expense) => sum + convertCurrency(expense.amount, expense.currency, currency),
      0
    );
  });
  actualSeries.meta = dataStore.phases.map((phase, index) => ({
    phase,
    expenses: expenseList.filter((expense) => expense.phase_id === phase.id),
    actual: actualSeries[index],
  }));

  renderBudgetVsActual({
    labels: phaseLabels,
    budget: budgetSeries,
    actual: actualSeries,
    locale,
    onDrilldown: (payload) => openDrilldown(payload, dictionary),
  });

  const performanceLabels = dataStore.dailyReports.map((report) => dayjs(report.date).format("YYYY-MM"));
  const cpiSeries = performanceLabels.map((_, index) => 0.9 + index * 0.03);
  cpiSeries.meta = dataStore.dailyReports;
  const spiSeries = performanceLabels.map((_, index) => 0.88 + index * 0.025);
  spiSeries.meta = dataStore.dailyReports;

  renderCpiSpiChart({ labels: performanceLabels, cpi: cpiSeries, spi: spiSeries, locale, onDrilldown: (payload) => openDrilldown(payload, dictionary) });

  const changeOrders = dataStore.changeOrders;
  const waterfallLabels = ["BAC", ...changeOrders.map((order) => order.title), "EAC"];
  const deltas = {
    start: convertCurrency(getProjectBac(), getProjectCurrency(), currency),
    changes: changeOrders.map((order) => ({
      label: order.title,
      amount: convertCurrency(order.amount, getProjectCurrency(), currency),
      reference: order.id,
    })),
    end: kpis.eac,
  };
  renderWaterfallChangeOrders({ labels: waterfallLabels, deltas, locale, onDrilldown: (payload) => openDrilldown(payload, dictionary) });
}

function renderTables({ dictionary, expenseList, invoiceList, paymentList }) {
  const state = getState();
  const currency = state.filters.currency;
  const varianceData = dataStore.phases.map((phase) => {
    const pv = convertCurrency(toNumber(phase.bac_phase) * (phase.planned_percent / 100), getProjectCurrency(), currency);
    const ev = convertCurrency(toNumber(phase.bac_phase) * (phase.actual_percent / 100), getProjectCurrency(), currency);
    const ac = expenseList
      .filter((expense) => expense.phase_id === phase.id)
      .reduce((sum, expense) => sum + convertCurrency(expense.amount, expense.currency, currency), 0);
    return {
      phase: phase.name,
      pv,
      ev,
      ac,
      cv: ev - ac,
      sv: ev - pv,
      currency,
    };
  });

  renderVarianceTable({ data: varianceData, locale: state.lang, dictionary, onRowClick: (e, row) => openDrilldown({ datasetLabel: row.getData().phase, meta: row.getData() }, dictionary) });

  const expensesRows = expenseList.map((expense) => ({
    date: dayjs(expense.date).format("YYYY-MM-DD"),
    cost_code: expense.cost_code,
    description: expense.description,
    phase: dataStore.phases.find((phase) => phase.id === expense.phase_id)?.name,
    amount: convertCurrency(expense.amount, expense.currency, currency),
    vat: expense.tax * expense.amount,
    currency,
    meta: expense,
  }));
  renderExpenseTable({ data: expensesRows, locale: state.lang, dictionary, onRowClick: (e, row) => openDrilldown({ datasetLabel: "Expense", meta: row.getData() }, dictionary) });

  const paymentsRows = [
    ...invoiceList.map((invoice) => ({
      date: dayjs(invoice.due_date).format("YYYY-MM-DD"),
      type: "Client Invoice",
      reference: invoice.number,
      status: invoice.status,
      amount: convertCurrency(invoice.amount, invoice.currency, currency),
      net: convertCurrency(invoice.collected_amount ?? 0, invoice.currency, currency),
      currency,
      meta: invoice,
    })),
    ...paymentList.map((payment) => ({
      date: dayjs(payment.paid_on).format("YYYY-MM-DD"),
      type: "Contractor Payment",
      reference: payment.contractor,
      status: "paid",
      amount: convertCurrency(payment.amount, payment.currency, currency),
      net: convertCurrency(payment.amount * (1 - payment.retention), payment.currency, currency),
      currency,
      meta: payment,
    })),
  ];
  renderPaymentsTable({ data: paymentsRows, locale: state.lang, dictionary, onRowClick: (e, row) => openDrilldown({ datasetLabel: row.getData().type, meta: row.getData() }, dictionary) });
}

function updateWhatIf(kpis = null) {
  const state = getState();
  const dictionary = getDictionary(state.lang);
  const base = kpis || computeBaselineKpis();
  const adjustments = {
    materials: Number(document.getElementById("materialsSlider").value),
    labor: Number(document.getElementById("laborSlider").value),
    scope: Number(document.getElementById("scopeSlider").value),
    delay: Number(document.getElementById("delaySlider").value),
  };

  const scenario = runScenario({
    bac: base.bac,
    ac: base.ac,
    ev: base.ev,
    pv: base.pv,
    cpi: base.cpi,
    spi: base.spi,
    adjustments,
  });

  const container = document.getElementById("whatIfResults");
  container.innerHTML = "";

  [
    { label: dictionary?.whatif?.baseline ?? "Baseline", values: scenario.baseline },
    { label: dictionary?.whatif?.scenario ?? "Scenario", values: scenario.scenario },
  ].forEach((entry) => {
    Object.entries(entry.values).forEach(([key, value]) => {
      const card = document.createElement("div");
      card.className = "result-card";
      card.innerHTML = `<span>${entry.label} – ${key}</span><strong>${value.toFixed(2)}</strong>`;
      container.appendChild(card);
    });
  });
}

function filterByStatus(list, status) {
  if (!status || status === "all") return list;
  return list.filter((item) => item.status === status);
}

function filterByDate(list, filters) {
  if (!filters.dateFrom && !filters.dateTo) return list;
  return list.filter((item) => {
    const date = item.date || item.due_date || item.paid_on;
    if (!date) return true;
    const day = dayjs(date);
    if (filters.dateFrom && day.isBefore(dayjs(filters.dateFrom))) return false;
    if (filters.dateTo && day.isAfter(dayjs(filters.dateTo))) return false;
    return true;
  });
}

function buildMonthlyLabels() {
  const months = new Set();
  [...dataStore.expenses, ...dataStore.clientInvoices, ...dataStore.contractorPayments].forEach((item) => {
    const date = item.date || item.due_date || item.paid_on;
    if (date) {
      months.add(dayjs(date).format("YYYY-MM"));
    }
  });
  return Array.from(months).sort();
}

function openDrilldown(payload, dictionary) {
  if (!payload) return;
  const { label, datasetLabel, value, meta } = payload;
  const title = `${datasetLabel || label}`;
  const relatedItems = Array.isArray(meta) ? meta : meta ? [meta] : [];
  const content = buildList(
    relatedItems.map((item) => ({
      label: item.title || item.reference || item.phase || title,
      value: item.amount || item.value || value,
    })),
    dictionary
  );
  modal({ title, content });
}

function getProjectCurrency() {
  const project = dataStore.projects.find((item) => item.id === getState().currentProjectId);
  return project?.currency || "USD";
}

function getProjectBac() {
  const project = dataStore.projects.find((item) => item.id === getState().currentProjectId);
  return project?.bac || 0;
}

function computeBaselineKpis() {
  const state = getState();
  const selectedPhases = state.selectedPhaseIds;
  const filteredPhases = selectedPhases.length
    ? dataStore.phases.filter((phase) => selectedPhases.includes(phase.id))
    : dataStore.phases;
  const phaseAgg = aggregatePhases(filteredPhases);
  const expenseList = filterByDate(dataStore.expenses, state.filters);
  const expensesAC = calcAC(
    expenseList.map((expense) => ({
      amount: convertCurrency(expense.amount, expense.currency, state.filters.currency),
    }))
  );
  const invoiceList = filterByStatus(filterByDate(dataStore.clientInvoices, state.filters), state.filters.invoiceStatus);
  const paymentList = filterByDate(dataStore.contractorPayments, state.filters);
  const dailyReports = filterByDate(dataStore.dailyReports, state.filters);
  const incomingTotal = invoiceList.reduce(
    (sum, invoice) => sum + convertCurrency(invoice.collected_amount || invoice.amount, invoice.currency, state.filters.currency),
    0
  );
  const outgoingTotal =
    expenseList.reduce((sum, expense) => sum + convertCurrency(expense.amount, expense.currency, state.filters.currency), 0) +
    paymentList.reduce((sum, payment) => sum + convertCurrency(payment.amount, payment.currency, state.filters.currency), 0);

  return computeKpis({
    bac: convertCurrency(phaseAgg.bac, getProjectCurrency(), state.filters.currency),
    ac: expensesAC,
    pv: convertCurrency(phaseAgg.pv, getProjectCurrency(), state.filters.currency),
    ev: convertCurrency(phaseAgg.ev, getProjectCurrency(), state.filters.currency),
    elapsedPeriods: Math.max(dailyReports.length, 1),
    incoming: incomingTotal,
    outgoing: outgoingTotal,
  });
}
