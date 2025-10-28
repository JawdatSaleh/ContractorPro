import {
  seedFromJSON,
  writeToStorage,
  generateId,
  dispatchDataEvent,
  sumBy,
  average,
  percentage,
  calculateDuration,
} from './utils.js';

const STORAGE_KEY = 'phases';
const DATA_URL = new URL('../data/phases.json', import.meta.url);

class PhasesStore {
  constructor() {
    this.ready = this.init();
  }

  async init() {
    const initial = await seedFromJSON(STORAGE_KEY, DATA_URL, (data) => data.phases || data);
    this.phases = this._asMap(initial);
    dispatchDataEvent('phases-ready', this.phases);
  }

  _asMap(items) {
    return items.reduce((map, phase) => {
      map[phase.projectId] = map[phase.projectId] || [];
      map[phase.projectId].push(phase);
      return map;
    }, {});
  }

  _persist() {
    const merged = Object.values(this.phases).flat();
    writeToStorage(STORAGE_KEY, merged);
    dispatchDataEvent('phases-updated', { phases: this.phases });
  }

  async ensureReady() {
    if (!this.ready) {
      this.ready = this.init();
    }
    return this.ready;
  }

  async all(projectId) {
    await this.ensureReady();
    return (this.phases[projectId] || []).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }

  async create(projectId, payload) {
    await this.ensureReady();
    const phase = {
      id: generateId('phase'),
      projectId,
      progress: 0,
      dependencies: [],
      ...payload,
    };
    phase.duration = payload.duration || calculateDuration(payload.startDate, payload.endDate);
    this.phases[projectId] = this.phases[projectId] || [];
    this.phases[projectId].push(phase);
    this._persist();
    return phase;
  }

  async update(projectId, phaseId, updates) {
    await this.ensureReady();
    this.phases[projectId] = this.phases[projectId] || [];
    const index = this.phases[projectId].findIndex((phase) => phase.id === phaseId);
    if (index === -1) throw new Error('لم يتم العثور على المرحلة');
    this.phases[projectId][index] = { ...this.phases[projectId][index], ...updates };
    const current = this.phases[projectId][index];
    current.duration = current.duration || calculateDuration(current.startDate, current.endDate);
    this._persist();
    return this.phases[projectId][index];
  }

  async remove(projectId, phaseId) {
    await this.ensureReady();
    this.phases[projectId] = (this.phases[projectId] || []).filter((phase) => phase.id !== phaseId);
    this._persist();
  }

  async completion(projectId) {
    const phases = await this.all(projectId);
    if (!phases.length) return 0;
    return Math.round(average(phases.map((phase) => phase.progress || 0)));
  }

  async timeline(projectId) {
    const phases = await this.all(projectId);
    if (!phases.length) return { totalDuration: 0, completedDuration: 0, overallProgress: 0 };
    const totalDuration = sumBy(phases, (phase) => phase.duration || phase.estimatedDays || 0);
    const completedDuration = sumBy(phases, (phase) => ((phase.progress || 0) / 100) * (phase.duration || phase.estimatedDays || 0));
    const overallProgress = percentage(completedDuration, totalDuration || 1);
    return { totalDuration, completedDuration, overallProgress };
  }
}

export const phasesStore = new PhasesStore();
window.contractorpro = window.contractorpro || {};
window.contractorpro.phasesStore = phasesStore;
