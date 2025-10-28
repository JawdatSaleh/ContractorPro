import {
  seedFromJSON,
  writeToStorage,
  generateId,
  dispatchDataEvent,
  syncSessionFlag,
  createToast,
  formatCurrency,
  safeNumber,
} from './utils.js';

const STORAGE_KEY = 'projects';
const DATA_URL = new URL('../data/projects.json', import.meta.url);

class ProjectStore {
  constructor() {
    this.ready = this.init();
  }

  async init() {
    this.projects = await seedFromJSON(STORAGE_KEY, DATA_URL, (data) => data.projects || data);
    dispatchDataEvent('projects-ready', this.projects);
  }

  _persist() {
    writeToStorage(STORAGE_KEY, this.projects);
    dispatchDataEvent('projects-updated', { projects: this.projects });
    syncSessionFlag('projects:updated');
  }

  async ensureReady() {
    if (!this.ready) {
      this.ready = this.init();
    }
    return this.ready;
  }

  async getAll() {
    await this.ensureReady();
    return [...this.projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getById(id) {
    await this.ensureReady();
    return this.projects.find((project) => project.id === id) || null;
  }

  async create(payload) {
    await this.ensureReady();
    const id = generateId('project');
    const now = new Date().toISOString();
    const project = {
      id,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      progress: 0,
      totalExpenses: 0,
      totalPayments: 0,
      profitability: 0,
      tags: [],
      ...payload,
    };
    this.projects.push(project);
    this._persist();
    createToast('تم إنشاء المشروع بنجاح');
    return project;
  }

  async update(id, updates, options = {}) {
    const { silent = false } = options;
    await this.ensureReady();
    const index = this.projects.findIndex((project) => project.id === id);
    if (index === -1) throw new Error('لم يتم العثور على المشروع');
    const now = new Date().toISOString();
    this.projects[index] = {
      ...this.projects[index],
      ...updates,
      updatedAt: now,
    };
    this._persist();
    if (!silent) {
      createToast('تم تحديث المشروع بنجاح');
    }
    return this.projects[index];
  }

  async delete(id) {
    await this.ensureReady();
    this.projects = this.projects.filter((project) => project.id !== id);
    this._persist();
    createToast('تم حذف المشروع');
  }

  async updateFinancials(id, { expensesTotal = 0, paymentsTotal = 0, revenue = 0 }) {
    await this.ensureReady();
    const project = await this.getById(id);
    if (!project) return;
    const profitability = safeNumber(revenue) - safeNumber(expensesTotal);
    await this.update(
      id,
      {
        totalExpenses: safeNumber(expensesTotal),
        totalPayments: safeNumber(paymentsTotal),
        revenue: safeNumber(revenue),
        profitability,
      },
      { silent: true }
    );
  }

  async updateProgress(id, progress) {
    await this.ensureReady();
    await this.update(
      id,
      {
        progress: Math.min(100, Math.max(0, Math.round(progress))),
      },
      { silent: true }
    );
  }

  async summarize() {
    await this.ensureReady();
    const projects = await this.getAll();
    const totalValue = projects.reduce((total, project) => total + safeNumber(project.revenue || project.budget), 0);
    const activeCount = projects.filter((project) => project.status === 'active').length;
    const completedCount = projects.filter((project) => project.status === 'completed').length;
    const onHoldCount = projects.filter((project) => project.status === 'on-hold').length;

    return {
      totalProjects: projects.length,
      activeCount,
      completedCount,
      onHoldCount,
      totalValue,
      totalValueFormatted: formatCurrency(totalValue || 0),
    };
  }
}

export const projectStore = new ProjectStore();

window.contractorpro = window.contractorpro || {};
window.contractorpro.projectStore = projectStore;
