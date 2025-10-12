const chartRegistry = new Map();

function resolveContext(canvasId) {
  const canvas = typeof canvasId === "string" ? document.getElementById(canvasId) : canvasId;
  if (!canvas) throw new Error(`Canvas ${canvasId} not found`);
  return canvas;
}

function destroyChart(key) {
  const existing = chartRegistry.get(key);
  if (existing) {
    existing.destroy();
    chartRegistry.delete(key);
  }
}

function baseConfig({ locale }) {
  return {
    locale,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    interaction: {
      mode: "nearest",
      intersect: false,
    },
    scales: {
      x: {
        ticks: { autoSkip: true, maxRotation: 0 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
      },
    },
  };
}

function withDrilldown(chart, onClick) {
  if (!onClick) return;
  chart.canvas.addEventListener("click", (event) => {
    const points = chart.getElementsAtEventForMode(event, "nearest", { intersect: true }, true);
    if (!points.length) return;
    const point = points[0];
    const dataset = chart.data.datasets[point.datasetIndex];
    const value = dataset.data[point.index];
    onClick({
      label: chart.data.labels[point.index],
      datasetLabel: dataset.label,
      value,
      meta: dataset.meta?.[point.index],
    });
  });
}

export function renderCashflowChart({ canvasId = "cashflowChart", labels, incoming, outgoing, net, locale, onDrilldown }) {
  destroyChart(canvasId);
  const canvas = resolveContext(canvasId);
  const config = baseConfig({ locale });
  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Cash In",
          data: incoming,
          borderColor: "#06d6a0",
          backgroundColor: "rgba(6, 214, 160, 0.25)",
          tension: 0.35,
          fill: true,
          meta: incoming.meta,
        },
        {
          label: "Cash Out",
          data: outgoing,
          borderColor: "#ef476f",
          backgroundColor: "rgba(239, 71, 111, 0.18)",
          tension: 0.35,
          fill: true,
          meta: outgoing.meta,
        },
        {
          label: "Net",
          data: net,
          borderColor: "#118ab2",
          backgroundColor: "rgba(17, 138, 178, 0.15)",
          tension: 0.35,
          meta: net.meta,
        },
      ],
    },
    options: config,
  });
  chartRegistry.set(canvasId, chart);
  withDrilldown(chart, onDrilldown);
  return chart;
}

export function renderBudgetVsActual({ canvasId = "budgetActualChart", labels, budget, actual, locale, onDrilldown }) {
  destroyChart(canvasId);
  const canvas = resolveContext(canvasId);
  const config = baseConfig({ locale });
  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Budget",
          data: budget,
          backgroundColor: "rgba(0, 119, 182, 0.65)",
          meta: budget.meta,
        },
        {
          label: "Actual",
          data: actual,
          backgroundColor: "rgba(0, 180, 216, 0.65)",
          meta: actual.meta,
        },
      ],
    },
    options: {
      ...config,
      scales: {
        ...config.scales,
        x: { ...config.scales.x, stacked: false },
      },
    },
  });
  chartRegistry.set(canvasId, chart);
  withDrilldown(chart, onDrilldown);
  return chart;
}

export function renderCpiSpiChart({ canvasId = "cpiSpiChart", labels, cpi, spi, locale, onDrilldown }) {
  destroyChart(canvasId);
  const canvas = resolveContext(canvasId);
  const config = baseConfig({ locale });
  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "CPI",
          data: cpi,
          borderColor: "#06d6a0",
          tension: 0.4,
          meta: cpi.meta,
        },
        {
          label: "SPI",
          data: spi,
          borderColor: "#ffd166",
          tension: 0.4,
          meta: spi.meta,
        },
        {
          type: "line",
          label: "Threshold",
          data: labels.map(() => 1),
          borderColor: "rgba(239, 71, 111, 0.5)",
          borderDash: [6, 4],
          pointRadius: 0,
          hoverRadius: 0,
        },
      ],
    },
    options: config,
  });
  chartRegistry.set(canvasId, chart);
  withDrilldown(chart, onDrilldown);
  return chart;
}

export function renderWaterfallChangeOrders({ canvasId = "waterfallChart", labels, deltas, locale, onDrilldown }) {
  destroyChart(canvasId);
  const canvas = resolveContext(canvasId);
  const config = baseConfig({ locale });
  const cumulative = [];
  let running = deltas.start;
  cumulative.push(running);
  deltas.changes.forEach((change) => {
    running += change.amount;
    cumulative.push(running);
  });
  cumulative.push(deltas.end);

  const dataset = {
    label: "Impact",
    data: cumulative,
    backgroundColor: cumulative.map((value, index) => {
      if (index === 0) return "rgba(0, 119, 182, 0.75)";
      if (index === cumulative.length - 1) return "rgba(6, 214, 160, 0.75)";
      return deltas.changes[index - 1].amount >= 0 ? "rgba(0, 180, 216, 0.65)" : "rgba(239, 71, 111, 0.65)";
    }),
    meta: [
      { label: "BAC", value: deltas.start },
      ...deltas.changes,
      { label: "EAC", value: deltas.end },
    ],
  };

  const chart = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets: [dataset] },
    options: {
      ...config,
      scales: {
        ...config.scales,
        x: { ...config.scales.x, stacked: false },
      },
    },
  });
  chartRegistry.set(canvasId, chart);
  withDrilldown(chart, onDrilldown);
  return chart;
}
