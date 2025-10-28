export const STORAGE_PREFIX = 'contractorpro';

const storageCache = new Map();

function getScopedKey(key) {
  return `${STORAGE_PREFIX}:${key}`;
}

export function readFromStorage(key, fallback = null) {
  const scopedKey = getScopedKey(key);
  const cached = storageCache.get(scopedKey);
  if (cached) return structuredClone(cached);

  const raw = localStorage.getItem(scopedKey);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    storageCache.set(scopedKey, parsed);
    return structuredClone(parsed);
  } catch (error) {
    console.warn(`⚠️ فشل في قراءة التخزين المحلي للمفتاح ${scopedKey}`, error);
    return fallback;
  }
}

export function writeToStorage(key, value) {
  const scopedKey = getScopedKey(key);
  storageCache.set(scopedKey, structuredClone(value));
  localStorage.setItem(scopedKey, JSON.stringify(value));
}

export function removeFromStorage(key) {
  const scopedKey = getScopedKey(key);
  storageCache.delete(scopedKey);
  localStorage.removeItem(scopedKey);
}

export async function seedFromJSON(key, dataUrl, transformer) {
  const scopedKey = getScopedKey(key);
  const existing = readFromStorage(key);
  if (existing) return existing;

  try {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(`فشل تحميل البيانات من ${dataUrl}`);
    const data = await response.json();
    const finalData = transformer ? transformer(data) : data;
    writeToStorage(key, finalData);
    return structuredClone(finalData);
  } catch (error) {
    console.error('فشل تحميل البيانات المبدئية:', error);
    return transformer ? transformer([]) : [];
  }
}

export function generateId(prefix) {
  const random = Math.random().toString(16).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}`;
}

export function dispatchDataEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(`contractorpro:${name}`, { detail }));
}

export function onDataEvent(name, handler) {
  window.addEventListener(`contractorpro:${name}`, handler);
  return () => window.removeEventListener(`contractorpro:${name}`, handler);
}

export function parseQueryParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search).entries());
}

export function formatCurrency(value, currency = 'SAR') {
  if (Number.isNaN(Number(value))) return '0';
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatPercent(value) {
  const number = Number(value) || 0;
  return `${number.toFixed(0)}%`;
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function calculateDuration(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate) || Number.isNaN(endDate)) return 0;
  const diff = Math.abs(endDate - startDate);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function percentage(part, total) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((Number(part) / Number(total)) * 100)));
}

export function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function validatePositiveNumber(value) {
  const number = safeNumber(value);
  return number >= 0;
}

export function createToast(message, type = 'success') {
  const containerId = 'projects-toast-container';
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export function requireField(value, message) {
  if (!value) throw new Error(message);
}

export function syncSessionFlag(flag) {
  sessionStorage.setItem(`contractorpro:${flag}`, Date.now().toString());
}

export function consumeSessionFlag(flag) {
  const key = `contractorpro:${flag}`;
  const exists = sessionStorage.getItem(key);
  if (exists) sessionStorage.removeItem(key);
  return Boolean(exists);
}

export function lazyImageObserver() {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const { target } = entry;
          const src = target.dataset.src;
          if (src) {
            target.src = src;
            target.removeAttribute('data-src');
          }
          obs.unobserve(target);
        }
      });
    },
    { threshold: 0.1 }
  );
  return observer;
}

export function bindFormSubmit(form, handler) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    form.classList.add('is-processing');
    try {
      await handler(new FormData(form));
      form.reset();
    } catch (error) {
      console.error(error);
      createToast(error.message || 'حدث خطأ غير متوقع', 'error');
    } finally {
      form.classList.remove('is-processing');
    }
  });
}

export function sumBy(items, selector) {
  return items.reduce((total, item) => total + safeNumber(selector(item)), 0);
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + safeNumber(value), 0) / values.length;
}

export function groupBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function sortByDate(items, selector) {
  return [...items].sort((a, b) => new Date(selector(b)) - new Date(selector(a)));
}

export function buildBreadcrumb(trail) {
  const container = document.querySelector('[data-breadcrumb]');
  if (!container) return;
  container.innerHTML = '';
  trail.forEach((item, index) => {
    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.label;
    link.className = 'breadcrumb-item';
    container.appendChild(link);
    if (index < trail.length - 1) {
      const divider = document.createElement('span');
      divider.textContent = '/';
      divider.className = 'breadcrumb-divider';
      container.appendChild(divider);
    }
  });
}
