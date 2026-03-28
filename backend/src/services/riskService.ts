type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export function budgetRisk(spent: number, budget: number): RiskLevel {
  const pct = spent / budget;
  if (pct <= 0.60) return 'low';
  if (pct <= 0.80) return 'medium';
  if (pct <= 1.00) return 'high';
  return 'critical';
}

export function timeRisk(elapsedPct: number, completionPct: number): RiskLevel {
  const gap = elapsedPct - completionPct;
  if (gap <= 0.10) return 'low';
  if (gap <= 0.20) return 'medium';
  if (gap <= 0.30) return 'high';
  return 'critical';
}

export function qualityRisk(avgRating: number): RiskLevel {
  if (avgRating >= 4.0) return 'low';
  if (avgRating >= 3.0) return 'medium';
  if (avgRating >= 2.0) return 'high';
  return 'critical';
}

/**
 * Impact Risk — compares actual beneficiaries vs expected (from project expectedOutputs or target).
 * Ratio = actual / expected. Low ratio = social impact underperformance.
 */
export function impactRisk(actualBeneficiaries: number, expectedBeneficiaries: number): RiskLevel {
  if (expectedBeneficiaries <= 0) return 'low'; // no target set
  const ratio = actualBeneficiaries / expectedBeneficiaries;
  if (ratio >= 0.75) return 'low';
  if (ratio >= 0.50) return 'medium';
  if (ratio >= 0.25) return 'high';
  return 'critical';
}

export function overallRisk(spent: number, budget: number, elapsedPct: number, completionPct: number, avgRating: number, actualBenef = 0, expectedBenef = 0): RiskLevel {
  const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  const risks: RiskLevel[] = [
    budgetRisk(spent, budget),
    timeRisk(elapsedPct, completionPct),
    qualityRisk(avgRating),
    impactRisk(actualBenef, expectedBenef),
  ];
  return risks.reduce((a, b) => (levels.indexOf(a) > levels.indexOf(b) ? a : b));
}
