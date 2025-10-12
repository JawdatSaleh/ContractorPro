import { calcEAC, calcETC, calcVAC, toNumber } from "./formulas.js";

export function runScenario({
  bac,
  ac,
  ev,
  pv,
  cpi,
  spi,
  adjustments,
}) {
  const materialFactor = 1 + toNumber(adjustments.materials) / 100;
  const laborFactor = 1 + toNumber(adjustments.labor) / 100;
  const scopeFactor = 1 + toNumber(adjustments.scope) / 100;
  const delayDays = toNumber(adjustments.delay);

  const scenarioAC = ac * materialFactor * laborFactor;
  const scenarioBAC = bac * scopeFactor;
  const timePenalty = delayDays > 0 ? Math.max(spi - delayDays * 0.01, 0.5) : spi;
  const scenarioSPI = timePenalty;
  const scenarioCPI = (ev / scenarioAC) || cpi;
  const scenarioEV = ev * scopeFactor * Math.min(1, scenarioSPI);

  const baselineEAC = calcEAC({ method: "hybrid", bac, ac, ev, cpi, spi });
  const scenarioEAC = calcEAC({
    method: "hybrid",
    bac: scenarioBAC,
    ac: scenarioAC,
    ev: scenarioEV,
    cpi: scenarioCPI,
    spi: scenarioSPI,
  });

  const baselineETC = calcETC(baselineEAC, ac);
  const scenarioETC = calcETC(scenarioEAC, scenarioAC);
  const baselineVAC = calcVAC(bac, baselineEAC);
  const scenarioVAC = calcVAC(scenarioBAC, scenarioEAC);

  return {
    baseline: {
      EAC: baselineEAC,
      ETC: baselineETC,
      VAC: baselineVAC,
      SPI: spi,
      CPI: cpi,
    },
    scenario: {
      EAC: scenarioEAC,
      ETC: scenarioETC,
      VAC: scenarioVAC,
      SPI: scenarioSPI,
      CPI: scenarioCPI,
    },
  };
}
