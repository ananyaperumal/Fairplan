import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { db } from './db/database';
import { seedDatabase } from './db/seed';
import { MoneyUtil } from './domain/money';
import { PolicyEngine } from './domain/policyEngine';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const count = (db.prepare('SELECT COUNT(*) as c FROM subscriptions').get() as any).c;
if (count === 0) seedDatabase();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ONLINE', demoMode: true });
});

app.get('/api/consumer/dashboard', (_req, res) => {
  const subs = db.prepare(`
    SELECT s.*, p.name as planName, u.last_active_timestamp, u.activity_count_last_30_days, u.source
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    LEFT JOIN usage_records u ON s.id = u.subscription_id
    WHERE s.customer_id = 'cust_alex'
  `).all() as any[];

  let currentMonthly = 0, active = 0, paused = 0, cancelled = 0;
  for (const s of subs) {
    if (s.status === 'ACTIVE' || s.status === 'PAST_DUE') {
      currentMonthly += MoneyUtil.toMonthlyEquivalentCents(s.current_price_cents, s.billing_frequency);
    }
    if (s.status === 'ACTIVE') active++;
    if (s.status === 'SUSPENDED') paused++;
    if (s.status === 'CANCELLED') cancelled++;
  }

  res.json({
    metrics: {
      monthlyCommitmentFormatted: MoneyUtil.format(currentMonthly),
      activeCount: active,
      pausedCount: paused,
      cancelledCount: cancelled
    },
    subscriptions: subs.map(s => ({
      ...s,
      keepFlag: Boolean(s.keep_flag),
      currentPriceCents: s.current_price_cents,
      usage: {
        lastActiveTimestamp: s.last_active_timestamp,
        source: s.source || 'UNKNOWN'
      }
    }))
  });
});

app.post('/api/consumer/toggle-keep', (req, res) => {
  const { subscriptionId, keep } = req.body;
  db.prepare('UPDATE subscriptions SET keep_flag = ? WHERE id = ?').run(keep ? 1 : 0, subscriptionId);
  res.json({ success: true, keep });
});

app.post('/api/actions/propose', (req, res) => {
  try {
    const { subscriptionId, actionType, targetPlanId } = req.body;
    const sub = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(subscriptionId) as any;
    const policy = db.prepare('SELECT * FROM merchant_policies WHERE merchant_id = ?').get(sub.merchant_id) as any;
    let targetPlan: any;
    if (targetPlanId) targetPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(targetPlanId);

    const proposal = PolicyEngine.generateProposal(
      { ...sub, currentPriceCents: sub.current_price_cents, billingFrequency: sub.billing_frequency, keepFlag: Boolean(sub.keep_flag) },
      actionType,
      JSON.parse(policy.eligible_downgrade_plan_ids || '[]'),
      targetPlan ? { ...targetPlan, priceCents: targetPlan.price_cents, billingFrequency: targetPlan.billing_frequency } : undefined
    );

    db.prepare(`INSERT INTO action_proposals (id, subscription_id, customer_id, action_type, target_plan_id, current_price_cents, projected_price_cents, projected_monthly_savings_cents, terms_hash, version, expires_at, consumed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
      .run(proposal.id, proposal.subscriptionId, proposal.customerId, proposal.actionType, proposal.targetPlanId || null, proposal.currentPriceCents, proposal.projectedPriceCents, proposal.projectedMonthlySavingsCents, proposal.termsHash, proposal.version, proposal.expiresAt);

    res.json(proposal);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/actions/confirm', (req, res) => {
  const { proposalId } = req.body;
  const prop = db.prepare('SELECT * FROM action_proposals WHERE id = ?').get(proposalId) as any;
  if (!prop) return res.status(404).json({ error: 'Proposal not found' });

  if (prop.action_type === 'CANCEL') {
    db.prepare("UPDATE subscriptions SET status = 'CANCELLED' WHERE id = ?").run(prop.subscription_id);
  } else if (prop.action_type === 'DOWNGRADE') {
    const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(prop.target_plan_id) as any;
    db.prepare("UPDATE subscriptions SET plan_id = ?, current_price_cents = ?, status = 'ACTIVE' WHERE id = ?")
      .run(plan.id, plan.price_cents, prop.subscription_id);
  }
  db.prepare('UPDATE action_proposals SET consumed = 1 WHERE id = ?').run(prop.id);
  res.json({ success: true, message: 'Action executed successfully.' });
});

app.post('/api/copilot/chat', (req, res) => {
  // Deterministic Churn-Saver Copilot recommendations
  const p1 = db.prepare("SELECT * FROM subscriptions WHERE id = 'sub_stream'").get() as any;
  const p2 = db.prepare("SELECT * FROM subscriptions WHERE id = 'sub_fit'").get() as any;
  const basicPlan = db.prepare("SELECT * FROM plans WHERE id = 'plan_stream_basic'").get() as any;

  const propDowngrade = PolicyEngine.generateProposal(
    { ...p1, currentPriceCents: p1.current_price_cents, billingFrequency: p1.billing_frequency, keepFlag: false },
    'DOWNGRADE',
    ['plan_stream_basic'],
    { ...basicPlan, priceCents: basicPlan.price_cents, billingFrequency: basicPlan.billing_frequency }
  );
  const propCancel = PolicyEngine.generateProposal(
    { ...p2, currentPriceCents: p2.current_price_cents, billingFrequency: p2.billing_frequency, keepFlag: false },
    'CANCEL',
    []
  );

  db.prepare(`INSERT OR REPLACE INTO action_proposals (id, subscription_id, customer_id, action_type, target_plan_id, current_price_cents, projected_price_cents, projected_monthly_savings_cents, terms_hash, version, expires_at, consumed) VALUES (?, ?, 'cust_alex', ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
    .run(propDowngrade.id, propDowngrade.subscriptionId, propDowngrade.actionType, propDowngrade.targetPlanId || null, propDowngrade.currentPriceCents, propDowngrade.projectedPriceCents, propDowngrade.projectedMonthlySavingsCents, propDowngrade.termsHash, propDowngrade.version, propDowngrade.expiresAt);
  db.prepare(`INSERT OR REPLACE INTO action_proposals (id, subscription_id, customer_id, action_type, target_plan_id, current_price_cents, projected_price_cents, projected_monthly_savings_cents, terms_hash, version, expires_at, consumed) VALUES (?, ?, 'cust_alex', ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
    .run(propCancel.id, propCancel.subscriptionId, propCancel.actionType, propCancel.targetPlanId || null, propCancel.currentPriceCents, propCancel.projectedPriceCents, propCancel.projectedMonthlySavingsCents, propCancel.termsHash, propCancel.version, propCancel.expiresAt);

  res.json({
    response: "FairPlan AI Copilot Analysis:\n\n1. StreamNest Premium: Last used 65 days ago. Recommend Downgrade to StreamNest Basic ($9.00/mo, saving $20.00/mo).\n2. FitFlow: Last used 75 days ago. Recommend Cancellation ($25.00/mo savings with zero friction).\n3. LearnLoop: Retained per your keep preference.\n\nCombined Monthly Savings: $45.00/mo (Exceeds your $30 target). Merchant preserves $9.00/mo recurring revenue.",
    proposals: [propDowngrade, propCancel]
  });
});

app.get('/api/merchant/scoreboard', (_req, res) => {
  const totalActive = (db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'ACTIVE'").get() as any).count;
  const failedCases = (db.prepare("SELECT COUNT(*) as count FROM recovery_cases WHERE status = 'OPEN'").get() as any).count;
  res.json({
    metrics: {
      activeSubscriptions: totalActive,
      failedPaymentCases: failedCases,
      recoveredPaymentsFormatted: "$22.00",
      retainedRecurringRevenueFormatted: "$9.00/mo"
    }
  });
});

app.get('/api/merchant/recovery-cases', (_req, res) => {
  res.json(db.prepare("SELECT r.*, s.service_name FROM recovery_cases r JOIN subscriptions s ON r.subscription_id = s.id").all());
});

app.post('/api/merchant/recovery-cases/:id/capture', (req, res) => {
  const rc = db.prepare('SELECT * FROM recovery_cases WHERE id = ?').get(req.params.id) as any;
  if (rc) {
    db.prepare("UPDATE recovery_cases SET status = 'RECOVERED' WHERE id = ?").run(rc.id);
    db.prepare("UPDATE subscriptions SET status = 'ACTIVE' WHERE id = ?").run(rc.subscription_id);
  }
  res.json({ success: true, message: 'Balance captured successfully.' });
});

app.listen(PORT, () => {
  console.log(`⚡ FairPlan Server running on http://localhost:${PORT}`);
});
