import { writeToStorage, readFromStorage, dispatchDataEvent, generateId } from './utils.js';

const STORAGE_KEY = 'expense-categories';
const DEFAULT_CATEGORIES = [
  { id: 'cat-general', name: 'مصروفات عامة', color: '#64748b', protected: true },
  { id: 'cat-materials', name: 'مواد', color: '#6366f1', protected: true },
  { id: 'cat-subcontract', name: 'مقاول باطن', color: '#0ea5e9', protected: true },
  { id: 'cat-consulting', name: 'استشارات', color: '#ec4899', protected: true },
  { id: 'cat-advances', name: 'دفعات', color: '#f97316', protected: true },
  { id: 'cat-medical', name: 'معدات طبية', color: '#22c55e', protected: true },
];

function normalizeName(value) {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function cloneCategories(categories) {
  return categories.map((category) => ({ ...category }));
}

class ExpenseCategoriesStore {
  constructor() {
    this.ready = this.init();
  }

  async init() {
    const stored = readFromStorage(STORAGE_KEY, null);
    if (Array.isArray(stored) && stored.length) {
      this.categories = cloneCategories(stored);
    } else {
      this.categories = cloneCategories(DEFAULT_CATEGORIES);
      this.persist();
    }
    dispatchDataEvent('expense-categories-ready', { categories: cloneCategories(this.categories) });
  }

  persist() {
    writeToStorage(STORAGE_KEY, this.categories);
    dispatchDataEvent('expense-categories-updated', { categories: cloneCategories(this.categories) });
  }

  async ensureReady() {
    if (!this.ready) {
      this.ready = this.init();
    }
    return this.ready;
  }

  async list() {
    await this.ensureReady();
    return cloneCategories(this.categories).sort((a, b) => a.name.localeCompare(b.name, 'ar')); 
  }

  findIndexById(id) {
    return this.categories.findIndex((category) => category.id === id);
  }

  hasByName(name, excludeId = null) {
    const normalized = normalizeName(name);
    return this.categories.some((category) => {
      if (excludeId && category.id === excludeId) return false;
      return normalizeName(category.name) === normalized;
    });
  }

  async create(payload) {
    await this.ensureReady();
    const name = (payload.name || '').trim();
    const color = payload.color || '#6366f1';
    if (!name) {
      throw new Error('اسم التصنيف مطلوب');
    }
    if (this.hasByName(name)) {
      throw new Error('يوجد تصنيف بنفس الاسم بالفعل');
    }
    const category = {
      id: generateId('category'),
      name,
      color,
      protected: false,
    };
    this.categories.push(category);
    this.persist();
    return { ...category };
  }

  async update(id, updates) {
    await this.ensureReady();
    const index = this.findIndexById(id);
    if (index === -1) {
      throw new Error('لم يتم العثور على التصنيف');
    }
    const current = this.categories[index];
    const nextName = updates.name ? updates.name.trim() : current.name;
    if (!nextName) {
      throw new Error('اسم التصنيف مطلوب');
    }
    if (this.hasByName(nextName, id)) {
      throw new Error('يوجد تصنيف بنفس الاسم');
    }
    const next = {
      ...current,
      ...updates,
      name: nextName,
      color: updates.color || current.color,
    };
    this.categories[index] = next;
    this.persist();
    return { ...next };
  }

  async remove(id) {
    await this.ensureReady();
    const index = this.findIndexById(id);
    if (index === -1) {
      throw new Error('لم يتم العثور على التصنيف');
    }
    if (this.categories[index].protected) {
      throw new Error('لا يمكن حذف تصنيف افتراضي');
    }
    this.categories.splice(index, 1);
    this.persist();
  }
}

export const categoriesStore = new ExpenseCategoriesStore();

window.contractorpro = window.contractorpro || {};
window.contractorpro.categoriesStore = categoriesStore;
