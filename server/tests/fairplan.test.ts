import test from 'node:test';
import assert from 'node:assert/strict';
import { MoneyUtil } from '../src/domain/money';
import { PolicyEngine } from '../src/domain/policyEngine';

test('Financial Calculations: Decimal-safe integer cents math', () => {
  assert.equal(MoneyUtil.format(2900), '$29.00 USD');
  assert.equal(MoneyUtil.toMonthlyEquivalentCents(12000, 'YEARLY'), 1000);
});

test('Policy Engine: Cancellation always generates full savings proposal', () => {
  const proposal = PolicyEngine.generateProposal(
    { id: 'sub_1', merchantId: 'm1', customerId: 'c1', planId: 'p1', serviceName: 'Test', paypalSubscriptionId: 'I-1', status: 'ACTIVE', currentPriceCents: 2500, currency: 'USD', billingFrequency: 'MONTHLY', nextRenewalDate: '', keepFlag: false },
    'CANCEL',
    []
  );
  assert.equal(proposal.projectedMonthlySavingsCents, 2500);
  assert.equal(proposal.projectedPriceCents, 0);
});
