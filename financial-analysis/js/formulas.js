/**
 * Financial and Earned Value formulas.
 * All functions are pure and expect numeric inputs.
 */
export const toNumber = (value) => Number.parseFloat(value ?? 0) || 0;

export function calcPV(bacPhase, plannedPercent) {
  return toNumber(bacPhase) * (toNumber(plannedPercent) / 100);
}

export function calcEV(bacPhase, actualPercent) {
  return toNumber(bacPhase) * (toNumber(actualPercent) / 100);
}

export function calcAC(expenses) {
  return expenses.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
}

export function calcCV(ev, ac) {
  return toNumber(ev) - toNumber(ac);
}

export function calcSV(ev, pv) {
  return toNumber(ev) - toNumber(pv);
}

export function calcCPI(ev, ac) {
  const denominator = toNumber(ac);
  if (denominator === 0) return 0;
  return toNumber(ev) / denominator;
}

export function calcSPI(ev, pv) {
  const denominator = toNumber(pv);
  if (denominator === 0) return 0;
  return toNumber(ev) / denominator;
}

export function calcEAC({ method = "cpi", bac = 0, ac = 0, ev = 0, cpi = 0, spi = 0 }) {
  const normalized = {
    bac: toNumber(bac),
    ac: toNumber(ac),
    ev: toNumber(ev),
    cpi: toNumber(cpi),
    spi: toNumber(spi),
  };

  switch (method) {
    case "acPlusRemaining":
      return normalized.ac + (normalized.bac - normalized.ev);
    case "hybrid":
      if (normalized.cpi === 0 || normalized.spi === 0) return normalized.bac;
      return normalized.ac + (normalized.bac - normalized.ev) / (normalized.cpi * normalized.spi);
    case "cpi":
    default:
      if (normalized.cpi === 0) return normalized.bac;
      return normalized.bac / normalized.cpi;
  }
}

export function calcETC(eac, ac) {
  return toNumber(eac) - toNumber(ac);
}

export function calcVAC(bac, eac) {
  return toNumber(bac) - toNumber(eac);
}

export function calcBurnRate(ac, elapsedPeriods) {
  const periods = Math.max(toNumber(elapsedPeriods), 1);
  return toNumber(ac) / periods;
}

export function calcNetCashFlow(incoming, outgoing) {
  return toNumber(incoming) - toNumber(outgoing);
}

export function aggregatePhases(phases) {
  return phases.reduce(
    (acc, phase) => {
      const pv = calcPV(phase.bac_phase, phase.planned_percent);
      const ev = calcEV(phase.bac_phase, phase.actual_percent);
      return {
        bac: acc.bac + toNumber(phase.bac_phase),
        pv: acc.pv + pv,
        ev: acc.ev + ev,
      };
    },
    { bac: 0, pv: 0, ev: 0 }
  );
}

export function computeKpis({
  bac,
  ac,
  pv,
  ev,
  elapsedPeriods,
  incoming,
  outgoing,
}) {
  const cv = calcCV(ev, ac);
  const sv = calcSV(ev, pv);
  const cpi = calcCPI(ev, ac);
  const spi = calcSPI(ev, pv);
  const eac = calcEAC({ method: "hybrid", bac, ac, ev, cpi, spi });
  const etc = calcETC(eac, ac);
  const vac = calcVAC(bac, eac);
  const burnRate = calcBurnRate(ac, elapsedPeriods);
  const netCashFlow = calcNetCashFlow(incoming, outgoing);

  return { bac, ac, pv, ev, cv, sv, cpi, spi, eac, etc, vac, burnRate, netCashFlow };
}

// Tiny smoke tests for the browser console.
if (import.meta.hot === undefined) {
  const sample = computeKpis({
    bac: 1000,
    ac: 600,
    pv: 550,
    ev: 580,
    elapsedPeriods: 4,
    incoming: 400,
    outgoing: 350,
  });
  if (Math.round(sample.cpi * 100) / 100 !== 0.97) {
    console.warn("Formulas smoke test failed", sample);
  }
}
