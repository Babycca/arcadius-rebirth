type SaleLike = { priceAmount: number };
type CommissionRuleLike = { commissionRate: number; bonusAmount: number } | null;
type BonusOverride = { enabled: boolean; amount: number | null } | null;

const COMPANY_PROFIT_RATE = 0.1; // 10% — constante pour l'instant, à sortir en AppSetting si besoin de la rendre réglable

// extraInvoices (ex: garages posés) : compte comme du chiffre d'affaires et
// une facture, mais jamais comme une "vente" — salesCount reste basé
// uniquement sur `sales`, invoiceCount inclut les deux.
export function computeAgentPayroll(
  sales: SaleLike[],
  rule: CommissionRuleLike,
  bonusOverride: BonusOverride = null,
  extraInvoices: SaleLike[] = []
) {
  const totalSales = [...sales, ...extraInvoices].reduce((s, x) => s + x.priceAmount, 0);
  // L'entreprise ne touche que 10% de la facture brute ; l'agent touche
  // ensuite un pourcentage (selon son grade) de ce bénéfice entreprise, pas
  // de la facture brute. Ex : 100 000$ de facture → 10 000$ de bénéfice
  // entreprise → Patron à 80% → 8 000$ de commission.
  const companyProfit = totalSales * COMPANY_PROFIT_RATE;
  const commissionRate = rule?.commissionRate ?? 0;
  const ruleBonusAmount = rule?.bonusAmount ?? 0;

  // La prime est décidée par semaine par un admin (AgentWeekBonus) : soit le
  // montant par défaut du grade, soit un montant personnalisé (utile pour un
  // grade dont la prime de base est à 0$). Pas de ligne = comportement par
  // défaut du grade (prime appliquée si > 0).
  const bonusEnabled = bonusOverride ? bonusOverride.enabled : ruleBonusAmount > 0;
  const bonusAmount = bonusEnabled ? (bonusOverride?.amount ?? ruleBonusAmount) : 0;

  const commission = companyProfit * (commissionRate / 100);
  const salary = commission + bonusAmount;
  return {
    totalSales,
    companyProfit,
    commission,
    bonusAmount,
    bonusEnabled,
    salary,
    salesCount: sales.length,
    invoiceCount: sales.length + extraInvoices.length,
  };
}
