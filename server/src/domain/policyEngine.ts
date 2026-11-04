import crypto from 'crypto';
import { ActionProposal, ActionType, ProductPlan, Subscription } from './types';
import { MoneyUtil } from './money';

export class PolicyEngine {
  public static generateProposal(sub: Subscription, actionType: ActionType, eligibleDowngrades: string[], targetPlan?: ProductPlan): ActionProposal {
    let projectedPriceCents = 0;
    let savingsCents = 0;
    const currentMonthly = MoneyUtil.toMonthlyEquivalentCents(sub.currentPriceCents, sub.billingFrequency);

    if (actionType === 'CANCEL') {
      projectedPriceCents = 0;
      savingsCents = currentMonthly;
    } else if (actionType === 'DOWNGRADE') {
      if (!targetPlan || !eligibleDowngrades.includes(targetPlan.id)) {
        throw new Error('Target plan not authorized by merchant retention policy.');
      }
      projectedPriceCents = targetPlan.priceCents;
      savingsCents = Math.max(0, currentMonthly - MoneyUtil.toMonthlyEquivalentCents(targetPlan.priceCents, targetPlan.billingFrequency));
    }

    const version = 1;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const rawTerms = `${sub.id}:${actionType}:${projectedPriceCents}:${targetPlan?.id || 'none'}:${version}`;
    const termsHash = crypto.createHash('sha256').update(rawTerms).digest('hex');

    return {
      id: `prop_${crypto.randomUUID()}`,
      subscriptionId: sub.id,
      customerId: sub.customerId,
      actionType,
      targetPlanId: targetPlan?.id,
      currentPriceCents: sub.currentPriceCents,
      projectedPriceCents,
      projectedMonthlySavingsCents: savingsCents,
      termsHash,
      version,
      expiresAt,
      consumed: false
    };
  }
}
