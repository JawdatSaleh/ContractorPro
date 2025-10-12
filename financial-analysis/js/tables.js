const tableRegistry = new Map();

function createTable(key, elementId, options) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Table element ${elementId} not found`);
  if (tableRegistry.has(key)) {
    tableRegistry.get(key).destroy();
  }
  const table = new Tabulator(element, {
    layout: "fitDataFill",
    responsiveLayout: "collapse",
    placeholder: "No data",
    pagination: false,
    height: options.height || 320,
    locale: options.locale,
    langs: options.langs,
    rowClick: options.onRowClick,
    data: options.data,
    columns: options.columns,
  });
  tableRegistry.set(key, table);
  return table;
}

export function renderVarianceTable({ elementId = "varianceTable", data, locale, dictionary, onRowClick }) {
  return createTable("variance", elementId, {
    data,
    locale,
    langs: buildLangs(dictionary),
    columns: [
      { title: dictionary?.tables?.phase ?? "Phase", field: "phase", widthGrow: 2 },
      { title: dictionary?.tables?.planned ?? "PV", field: "pv", hozAlign: "right", formatter: moneyFormatter },
      { title: dictionary?.tables?.earned ?? "EV", field: "ev", hozAlign: "right", formatter: moneyFormatter },
      { title: dictionary?.tables?.actual ?? "AC", field: "ac", hozAlign: "right", formatter: moneyFormatter },
      { title: dictionary?.tables?.cv ?? "CV", field: "cv", hozAlign: "right", formatter: moneyFormatter },
      { title: dictionary?.tables?.sv ?? "SV", field: "sv", hozAlign: "right", formatter: moneyFormatter },
    ],
    onRowClick,
  });
}

export function renderExpenseTable({ elementId = "expensesTable", data, locale, dictionary, onRowClick }) {
  return createTable("expenses", elementId, {
    data,
    locale,
    langs: buildLangs(dictionary),
    columns: [
      { title: dictionary?.tables?.date ?? "Date", field: "date", sorter: "date" },
      { title: dictionary?.tables?.costCode ?? "Cost Code", field: "cost_code" },
      { title: dictionary?.tables?.description ?? "Description", field: "description", widthGrow: 2 },
      { title: dictionary?.tables?.phase ?? "Phase", field: "phase" },
      { title: dictionary?.tables?.amount ?? "Amount", field: "amount", hozAlign: "right", formatter: moneyFormatter },
      { title: dictionary?.tables?.tax ?? "VAT", field: "vat", hozAlign: "right", formatter: moneyFormatter },
    ],
    onRowClick,
  });
}

export function renderPaymentsTable({ elementId = "paymentsTable", data, locale, dictionary, onRowClick }) {
  return createTable("payments", elementId, {
    data,
    locale,
    langs: buildLangs(dictionary),
    columns: [
      { title: dictionary?.tables?.date ?? "Date", field: "date", sorter: "date" },
      { title: dictionary?.tables?.type ?? "Type", field: "type" },
      { title: dictionary?.tables?.reference ?? "Reference", field: "reference" },
      { title: dictionary?.tables?.status ?? "Status", field: "status" },
      { title: dictionary?.tables?.amount ?? "Amount", field: "amount", hozAlign: "right", formatter: moneyFormatter },
      { title: dictionary?.tables?.net ?? "Net", field: "net", hozAlign: "right", formatter: moneyFormatter },
    ],
    onRowClick,
  });
}

export function exportTable(key, format) {
  const table = tableRegistry.get(key);
  if (!table) return;
  const filename = `${key}-${dayjs().format("YYYYMMDD-HHmm")}`;
  switch (format) {
    case "csv":
      table.download("csv", `${filename}.csv`);
      break;
    case "xlsx":
      table.download("xlsx", `${filename}.xlsx`, { sheetName: key });
      break;
    case "pdf":
      exportPdf(table, filename);
      break;
    default:
      console.warn("Unsupported export format", format);
  }
}

function exportPdf(table, filename) {
  const doc = new jspdf.jsPDF({ orientation: "landscape" });
  const data = table.getData();
  const columns = table.getColumnDefinitions();
  let y = 20;
  doc.setFontSize(14);
  doc.text(filename, 14, 14);
  doc.setFontSize(10);
  const columnHeaders = columns.map((column) => column.title || column.field);
  doc.text(columnHeaders.join(" | "), 14, y);
  y += 6;
  data.forEach((row) => {
    const line = columns
      .map((column) => {
        const value = row[column.field];
        return value === undefined || value === null ? "" : String(value);
      })
      .join(" | ");
    doc.text(line, 14, y, { maxWidth: 270 });
    y += 6;
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
  });
  doc.save(`${filename}.pdf`);
}

function buildLangs(dictionary) {
  if (!dictionary) return {};
  return {
    ar: {
      ajax: { loading: "جار التحميل", error: "تعذر تحميل البيانات" },
      groups: { item: "عنصر", items: "عناصر" },
      pagination: {
        first: "الأول",
        first_title: "الأول",
        last: "الأخير",
        last_title: "الأخير",
        prev: "السابق",
        prev_title: "السابق",
        next: "التالي",
        next_title: "التالي",
      },
      headerFilters: {
        default: "تصفية",
      },
    },
    en: {
      ajax: { loading: "Loading", error: "Error" },
      groups: { item: "item", items: "items" },
    },
  };
}

function moneyFormatter(cell) {
  const value = cell.getValue();
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: cell.getRow().getData().currency || "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
