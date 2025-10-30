import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

global.localStorage = new MemoryStorage();

global.sessionStorage = new MemoryStorage();

global.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

const { categoriesStore } = await import('../../Projects/js/categories_store.js');

await categoriesStore.ensureReady?.();

// Helper to restore local storage state after tests
async function resetStore() {
  global.localStorage.clear();
  categoriesStore.categories = [];
  await categoriesStore.init();
}

test('expense categories store lifecycle', async (t) => {
  await resetStore();

  await t.test('default categories include general', async () => {
    const categories = await categoriesStore.list();
    const names = categories.map((category) => category.name);
    assert.ok(names.includes('مصروفات عامة'), 'should include the general expenses category');
  });

  await t.test('create, update, and delete a category', async () => {
    const created = await categoriesStore.create({ name: 'تصنيف اختبار', color: '#123456' });
    assert.equal(created.name, 'تصنيف اختبار');
    assert.equal(created.color, '#123456');

    const updated = await categoriesStore.update(created.id, { name: 'تصنيف معدل', color: '#654321' });
    assert.equal(updated.name, 'تصنيف معدل');
    assert.equal(updated.color, '#654321');

    await categoriesStore.remove(created.id);
    const remaining = await categoriesStore.list();
    assert.ok(!remaining.some((category) => category.id === created.id));
  });

  await t.test('prevent deleting protected categories', async () => {
    await assert.rejects(() => categoriesStore.remove('cat-general'));
  });

  await t.test('prevent duplicate category names', async () => {
    await assert.rejects(() => categoriesStore.create({ name: 'مواد', color: '#ffffff' }));
  });
});
