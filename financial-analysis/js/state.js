const state = {
  lang: "ar",
  currentProjectId: null,
  selectedPhaseIds: [],
  filters: {
    invoiceStatus: "all",
    currency: "SAR",
    dateFrom: null,
    dateTo: null,
  },
  exchangeRates: [],
  cache: new Map(),
};

const subscribers = new Set();

export function getState() {
  return structuredClone(state);
}

export function subscribe(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function setLanguage(lang) {
  state.lang = lang;
  notify();
}

export function setProject(projectId) {
  state.currentProjectId = projectId;
  notify();
}

export function setSelectedPhases(phaseIds) {
  state.selectedPhaseIds = [...new Set(phaseIds)];
  notify();
}

export function updateFilters(partial) {
  state.filters = { ...state.filters, ...partial };
  notify();
}

export function setExchangeRates(rates) {
  state.exchangeRates = Array.isArray(rates) ? rates : [];
  const cache = new Map();
  state.exchangeRates.forEach((rate) => {
    const key = `${rate.from}-${rate.to}`;
    if (!cache.has(key) || dayjs(rate.date).isAfter(cache.get(key).date)) {
      cache.set(key, { ...rate, date: dayjs(rate.date) });
    }
  });
  state.cache = cache;
  notify();
}

export function convertCurrency(amount, from, to) {
  if (!amount || from === to || !to) return amount ?? 0;
  const rateEntry = state.cache.get(`${from}-${to}`);
  if (rateEntry) {
    return (amount ?? 0) * rateEntry.rate;
  }
  const inverse = state.cache.get(`${to}-${from}`);
  if (inverse) {
    return (amount ?? 0) / inverse.rate;
  }
  return amount ?? 0;
}

export function cacheValue(key, value) {
  state.cache.set(key, value);
}

export function getCachedValue(key) {
  return state.cache.get(key);
}

function notify() {
  const snapshot = getState();
  subscribers.forEach((callback) => callback(snapshot));
}
