const STORAGE_KEY = 'contractorpro.projects';
const HISTORY_KEY = 'contractorpro.projects.history';

const hasLocalStorage = () => {
  try {
    const testKey = '__contractorpro_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

const storageAvailable = typeof window !== 'undefined' && hasLocalStorage();
const memoryStore = {
  [STORAGE_KEY]: null,
  [HISTORY_KEY]: []
};

const readStore = (key) => {
  if (storageAvailable) {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
  return memoryStore[key];
};

const writeStore = (key, value) => {
  if (storageAvailable) {
    window.localStorage.setItem(key, JSON.stringify(value));
  } else {
    memoryStore[key] = value;
  }
};

const listeners = new Set();

const notify = (projects, options = {}) => {
  listeners.forEach((listener) => {
    try {
      listener(projects, options);
    } catch (error) {
      console.error('ProjectStorage listener error', error);
    }
  });
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

export class ProjectStorage {
  static initialize(seedProjects = []) {
    const existing = readStore(STORAGE_KEY);
    if (!existing || !Array.isArray(existing) || existing.length === 0) {
      writeStore(STORAGE_KEY, deepClone(seedProjects));
      writeStore(HISTORY_KEY, []);
    }
  }

  static subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  static getAll() {
    const projects = readStore(STORAGE_KEY) || [];
    return deepClone(projects);
  }

  static getById(projectId) {
    return this.getAll().find((project) => project.id === projectId) || null;
  }

  static save(projects, meta = {}) {
    const snapshot = deepClone(projects);
    writeStore(STORAGE_KEY, snapshot);
    const history = readStore(HISTORY_KEY) || [];
    history.push({
      date: new Date().toISOString(),
      projects: snapshot,
      meta
    });
    writeStore(HISTORY_KEY, history.slice(-25));
    notify(snapshot, meta);
    return snapshot;
  }

  static add(project) {
    const projects = this.getAll();
    projects.push({ ...project, createdAt: new Date().toISOString() });
    return this.save(projects, { action: 'add', projectId: project.id });
  }

  static update(projectId, changes) {
    const projects = this.getAll();
    const idx = projects.findIndex((project) => project.id === projectId);
    if (idx === -1) {
      throw new Error(`Project with id ${projectId} not found.`);
    }
    projects[idx] = {
      ...projects[idx],
      ...deepClone(changes),
      updatedAt: new Date().toISOString()
    };
    return this.save(projects, { action: 'update', projectId });
  }

  static remove(projectId) {
    const projects = this.getAll();
    const filtered = projects.filter((project) => project.id !== projectId);
    return this.save(filtered, { action: 'remove', projectId });
  }

  static getHistory() {
    const history = readStore(HISTORY_KEY) || [];
    return deepClone(history);
  }

  static getMetrics() {
    const projects = this.getAll();
    if (projects.length === 0) {
      return {
        total: 0,
        active: 0,
        planning: 0,
        closed: 0,
        onHold: 0,
        totalValue: 0,
        invoicedValue: 0,
        averageMargin: 0,
        cashFlowNext90: 0,
        riskDistribution: {
          low: 0,
          medium: 0,
          high: 0
        }
      };
    }

    const metrics = projects.reduce(
      (acc, project) => {
        acc.total += 1;
        if (project.status === 'active') acc.active += 1;
        if (project.status === 'planning') acc.planning += 1;
        if (project.status === 'closed') acc.closed += 1;
        if (project.status === 'on-hold') acc.onHold += 1;
        acc.totalValue += project.contractValue || 0;
        acc.invoicedValue += project.invoicedValue || 0;
        acc.marginSum += (project.profitMargin || 0) * (project.contractValue || 0);
        acc.valueSum += project.contractValue || 0;
        if (project.riskLevel) {
          acc.riskDistribution[project.riskLevel] += 1;
        }
        return acc;
      },
      {
        total: 0,
        active: 0,
        planning: 0,
        closed: 0,
        onHold: 0,
        totalValue: 0,
        invoicedValue: 0,
        marginSum: 0,
        valueSum: 0,
        riskDistribution: {
          low: 0,
          medium: 0,
          high: 0
        }
      }
    );

    const next90 = new Date();
    next90.setDate(next90.getDate() + 90);

    const cashFlowNext90 = projects.reduce((sum, project) => {
      if (!project.financials?.cashFlow) return sum;
      return (
        sum +
        project.financials.cashFlow.reduce((projectSum, cashItem) => {
          const due = new Date(cashItem.month + '-01');
          return due <= next90 ? projectSum + (cashItem.value || 0) : projectSum;
        }, 0)
      );
    }, 0);

    return {
      total: metrics.total,
      active: metrics.active,
      planning: metrics.planning,
      closed: metrics.closed,
      onHold: metrics.onHold,
      totalValue: metrics.totalValue,
      invoicedValue: metrics.invoicedValue,
      averageMargin:
        metrics.valueSum === 0 ? 0 : Number((metrics.marginSum / metrics.valueSum).toFixed(2)),
      cashFlowNext90,
      riskDistribution: metrics.riskDistribution
    };
  }
}

export const formatCurrency = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0';
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0
  }).format(value);
};

export const formatDate = (value) => {
  if (!value) return 'غير محدد';
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(value));
};

export const computeDuration = (start, end) => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.max(0, endDate - startDate);
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

export const generateProjectId = (seed = new Date()) => {
  const dt = new Date(seed);
  const year = dt.getFullYear();
  const serial = Math.floor(Math.random() * 900 + 100);
  return `PRJ-${year}-${serial}`;
};
