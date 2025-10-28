import {
  seedFromJSON,
  writeToStorage,
  generateId,
  dispatchDataEvent,
  sumBy,
  safeNumber,
} from './utils.js';

const STORAGE_KEY = 'expenses';
const DATA_URL = new URL('../data/expenses.json', import.meta.url);

class ExpensesStore {
  constructor() {
    this.ready = this.init();
  }

  async init() {
    const initial = await seedFromJSON(STORAGE_KEY, DATA_URL, (data) => data.expenses || data);
    this.expenses = this._group(initial);
    dispatchDataEvent('expenses-ready', this.expenses);
  }

  _group(items) {
    return items.reduce((acc, expense) => {
      acc[expense.projectId] = acc[expense.projectId] || [];
      acc[expense.projectId].push(expense);
      return acc;
    }, {});
  }

  _persist() {
    const merged = Object.values(this.expenses).flat();
    writeToStorage(STORAGE_KEY, merged);
    dispatchDataEvent('expenses-updated', { expenses: this.expenses });
  }

  async ensureReady() {
    if (!this.ready) {
      this.ready = this.init();
    }
    return this.ready;
  }

  async all(projectId) {
    await this.ensureReady();
    return this.expenses[projectId] || [];
  }

  async create(projectId, payload) {
    await this.ensureReady();
    const expense = {
      id: generateId('expense'),
      projectId,
      category: 'عام',
      type: 'expense',
      amount: 0,
      ...payload,
    };
    this.expenses[projectId] = this.expenses[projectId] || [];
    this.expenses[projectId].push(expense);
    this._persist();
    return expense;
  }

  async update(projectId, expenseId, updates) {
    await this.ensureReady();
    this.expenses[projectId] = this.expenses[projectId] || [];
    const index = this.expenses[projectId].findIndex((expense) => expense.id === expenseId);
    if (index === -1) throw new Error('لم يتم العثور على المصروف');
    this.expenses[projectId][index] = { ...this.expenses[projectId][index], ...updates };
    this._persist();
    return this.expenses[projectId][index];
  }

  async remove(projectId, expenseId) {
    await this.ensureReady();
    this.expenses[projectId] = (this.expenses[projectId] || []).filter((expense) => expense.id !== expenseId);
    this._persist();
  }

  async totals(projectId) {
    const items = await this.all(projectId);
    const expensesTotal = sumBy(items.filter((item) => item.type !== 'revenue'), (item) => safeNumber(item.amount));
    const revenueTotal = sumBy(items.filter((item) => item.type === 'revenue'), (item) => safeNumber(item.amount));
    return { expensesTotal, revenueTotal };
  }
}

export const expensesStore = new ExpensesStore();
window.contractorpro = window.contractorpro || {};
window.contractorpro.expensesStore = expensesStore;
