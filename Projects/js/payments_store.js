import {
  seedFromJSON,
  writeToStorage,
  generateId,
  dispatchDataEvent,
  sumBy,
  safeNumber,
  sortByDate,
} from './utils.js';

const STORAGE_KEY = 'payments';
const DATA_URL = new URL('../data/payments.json', import.meta.url);

class PaymentsStore {
  constructor() {
    this.ready = this.init();
  }

  async init() {
    const initial = await seedFromJSON(STORAGE_KEY, DATA_URL, (data) => data.payments || data);
    this.payments = this._group(initial);
    dispatchDataEvent('payments-ready', this.payments);
  }

  _group(items) {
    return items.reduce((acc, payment) => {
      acc[payment.projectId] = acc[payment.projectId] || [];
      acc[payment.projectId].push(payment);
      return acc;
    }, {});
  }

  _persist() {
    const merged = Object.values(this.payments).flat();
    writeToStorage(STORAGE_KEY, merged);
    dispatchDataEvent('payments-updated', { payments: this.payments });
  }

  async ensureReady() {
    if (!this.ready) {
      this.ready = this.init();
    }
    return this.ready;
  }

  async all(projectId) {
    await this.ensureReady();
    return sortByDate(this.payments[projectId] || [], (payment) => payment.dueDate || payment.paidAt || payment.createdAt);
  }

  async create(projectId, payload) {
    await this.ensureReady();
    const existing = this.payments[projectId] || [];
    const nextSequence = existing.length + 1;
    const defaultNumber = `PAY-${String(nextSequence).padStart(3, '0')}`;
    const now = new Date().toISOString();
      const payment = {
        id: generateId('payment'),
        projectId,
        status: 'scheduled',
        amount: 0,
        type: 'incoming',
        paymentNumber: defaultNumber,
        paymentMethod: 'تحويل بنكي',
        party: '',
        createdAt: now,
        ...payload,
      };
    this.payments[projectId] = this.payments[projectId] || [];
    this.payments[projectId].push(payment);
    this._persist();
    return payment;
  }

  async update(projectId, paymentId, updates) {
    await this.ensureReady();
    this.payments[projectId] = this.payments[projectId] || [];
    const index = this.payments[projectId].findIndex((payment) => payment.id === paymentId);
    if (index === -1) throw new Error('لم يتم العثور على الدفعة');
    this.payments[projectId][index] = { ...this.payments[projectId][index], ...updates };
    this._persist();
    return this.payments[projectId][index];
  }

  async remove(projectId, paymentId) {
    await this.ensureReady();
    this.payments[projectId] = (this.payments[projectId] || []).filter((payment) => payment.id !== paymentId);
    this._persist();
  }

  async totals(projectId) {
    const items = await this.all(projectId);
    const totalScheduled = sumBy(items, (payment) => safeNumber(payment.amount));
    const totalPaid = sumBy(items.filter((item) => item.status === 'paid'), (item) => safeNumber(item.amount));
    const overdue = items.filter((item) => item.status === 'overdue').length;
    return { totalScheduled, totalPaid, overdue, count: items.length };
  }
}

export const paymentsStore = new PaymentsStore();
window.contractorpro = window.contractorpro || {};
window.contractorpro.paymentsStore = paymentsStore;
