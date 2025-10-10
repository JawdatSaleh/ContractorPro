import { describe, expect, it } from 'vitest';

function computeJournalEntries(items: { costCenter: string; net: number }[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.costCenter] = (acc[item.costCenter] ?? 0) + item.net;
    return acc;
  }, {});
}

describe('Payroll posting aggregation', () => {
  it('aggregates by cost center', () => {
    const map = computeJournalEntries([
      { costCenter: 'OPS', net: 1000 },
      { costCenter: 'OPS', net: 500 },
      { costCenter: 'HR', net: 700 }
    ]);
    expect(map).toEqual({ OPS: 1500, HR: 700 });
  });
});
