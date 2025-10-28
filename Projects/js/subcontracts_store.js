import {
  seedFromJSON,
  writeToStorage,
  generateId,
  dispatchDataEvent,
  sumBy,
  safeNumber,
} from './utils.js';

const STORAGE_KEY = 'subcontracts';
const DATA_URL = new URL('../data/subcontracts.json', import.meta.url);

class SubcontractsStore {
  constructor() {
    this.ready = this.init();
  }

  async init() {
    const initial = await seedFromJSON(STORAGE_KEY, DATA_URL, (data) => data.subcontracts || data);
    this.subcontracts = this.#groupByProject(initial);
    dispatchDataEvent('subcontracts-ready', this.subcontracts);
  }

  #groupByProject(items) {
    return items.reduce((acc, contract) => {
      acc[contract.projectId] = acc[contract.projectId] || [];
      acc[contract.projectId].push(contract);
      return acc;
    }, {});
  }

  #persist() {
    const merged = Object.values(this.subcontracts).flat();
    writeToStorage(STORAGE_KEY, merged);
    dispatchDataEvent('subcontracts-updated', { subcontracts: this.subcontracts });
  }

  async ensureReady() {
    if (!this.ready) {
      this.ready = this.init();
    }
    return this.ready;
  }

  async all(projectId) {
    await this.ensureReady();
    return this.subcontracts[projectId] || [];
  }

  async create(projectId, payload) {
    await this.ensureReady();
    const contract = {
      id: generateId('subcontract'),
      projectId,
      contractorName: '',
      contractTitle: '',
      value: 0,
      paidAmount: 0,
      status: 'active',
      startDate: new Date().toISOString().slice(0, 10),
      ...payload,
    };
    this.subcontracts[projectId] = this.subcontracts[projectId] || [];
    this.subcontracts[projectId].push(contract);
    this.#persist();
    return contract;
  }

  async update(projectId, contractId, updates) {
    await this.ensureReady();
    this.subcontracts[projectId] = this.subcontracts[projectId] || [];
    const index = this.subcontracts[projectId].findIndex((contract) => contract.id === contractId);
    if (index === -1) throw new Error('لم يتم العثور على العقد');
    this.subcontracts[projectId][index] = { ...this.subcontracts[projectId][index], ...updates };
    this.#persist();
    return this.subcontracts[projectId][index];
  }

  async remove(projectId, contractId) {
    await this.ensureReady();
    this.subcontracts[projectId] = (this.subcontracts[projectId] || []).filter((contract) => contract.id !== contractId);
    this.#persist();
  }

  async totals(projectId) {
    const items = await this.all(projectId);
    const totalValue = sumBy(items, (item) => safeNumber(item.value));
    const paidAmount = sumBy(items, (item) => safeNumber(item.paidAmount));
    const remainingAmount = Math.max(0, totalValue - paidAmount);
    return { totalValue, paidAmount, remainingAmount };
  }
}

export const subcontractsStore = new SubcontractsStore();
window.contractorpro = window.contractorpro || {};
window.contractorpro.subcontractsStore = subcontractsStore;
