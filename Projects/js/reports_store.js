import {
  seedFromJSON,
  writeToStorage,
  generateId,
  dispatchDataEvent,
  sortByDate,
  sumBy,
} from './utils.js';

const STORAGE_KEY = 'reports';
const DATA_URL = new URL('../data/reports.json', import.meta.url);

class ReportsStore {
  constructor() {
    this.ready = this.init();
  }

  async init() {
    const initial = await seedFromJSON(STORAGE_KEY, DATA_URL, (data) => data.reports || data);
    this.reports = this._group(initial);
    dispatchDataEvent('reports-ready', this.reports);
  }

  _group(items) {
    return items.reduce((acc, report) => {
      acc[report.projectId] = acc[report.projectId] || [];
      acc[report.projectId].push(report);
      return acc;
    }, {});
  }

  _persist() {
    const merged = Object.values(this.reports).flat();
    writeToStorage(STORAGE_KEY, merged);
    dispatchDataEvent('reports-updated', { reports: this.reports });
  }

  async ensureReady() {
    if (!this.ready) {
      this.ready = this.init();
    }
    return this.ready;
  }

  async all(projectId) {
    await this.ensureReady();
    return sortByDate(this.reports[projectId] || [], (report) => report.date || report.createdAt);
  }

  async create(projectId, payload) {
    await this.ensureReady();
    const report = {
      id: generateId('report'),
      projectId,
      progress: 0,
      photos: [],
      ...payload,
    };
    this.reports[projectId] = this.reports[projectId] || [];
    this.reports[projectId].push(report);
    this._persist();
    return report;
  }

  async update(projectId, reportId, updates) {
    await this.ensureReady();
    this.reports[projectId] = this.reports[projectId] || [];
    const index = this.reports[projectId].findIndex((report) => report.id === reportId);
    if (index === -1) throw new Error('لم يتم العثور على التقرير');
    this.reports[projectId][index] = { ...this.reports[projectId][index], ...updates };
    this._persist();
    return this.reports[projectId][index];
  }

  async remove(projectId, reportId) {
    await this.ensureReady();
    this.reports[projectId] = (this.reports[projectId] || []).filter((report) => report.id !== reportId);
    this._persist();
  }

  async weeklyProgress(projectId) {
    const reports = await this.all(projectId);
    const lastSeven = reports.slice(0, 7);
    const progressAverage = lastSeven.length ? sumBy(lastSeven, (report) => report.progress || 0) / lastSeven.length : 0;
    return { reportsCount: reports.length, progressAverage: Math.round(progressAverage) };
  }
}

export const reportsStore = new ReportsStore();
window.contractorpro = window.contractorpro || {};
window.contractorpro.reportsStore = reportsStore;
