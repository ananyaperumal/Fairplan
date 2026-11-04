import { db } from './database';

export function seedDatabase() {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec(`
    DELETE FROM recovery_cases;
    DELETE FROM action_audit;
    DELETE FROM action_proposals;
    DELETE FROM merchant_policies;
    DELETE FROM usage_records;
    DELETE FROM subscriptions;
    DELETE FROM plans;
    DELETE FROM customers;
    DELETE FROM merchants;
  `);
  db.exec('PRAGMA foreign_keys = ON;');

  db.prepare("INSERT INTO merchants (id, name, paypal_merchant_id) VALUES ('merch_faircloud', 'FairCloud Digital Services', 'SANDBOX_MERCHANT_FC_01')").run();

  const insertCust = db.prepare("INSERT INTO customers (id, merchant_id, email, name, role) VALUES (?, 'merch_faircloud', ?, ?, ?)");
  insertCust.run('cust_alex', 'alex.rivers@example.com', 'Alex Rivers (Consumer)', 'CONSUMER');
  insertCust.run('cust_admin', 'admin@faircloud.example.com', 'Sarah Chen (Merchant Admin)', 'MERCHANT_ADMIN');

  const insertPlan = db.prepare("INSERT INTO plans (id, merchant_id, name, paypal_plan_id, tier, price_cents, billing_frequency, features) VALUES (?, 'merch_faircloud', ?, ?, ?, ?, ?, ?)");
  insertPlan.run('plan_stream_premium', 'StreamNest Premium', 'P-SN-PREMIUM-001', 'PREMIUM', 2900, 'MONTHLY', JSON.stringify(['4K Ultra HD', '4 Screens']));
  insertPlan.run('plan_stream_basic', 'StreamNest Basic', 'P-SN-BASIC-002', 'BASIC', 900, 'MONTHLY', JSON.stringify(['720p HD', '1 Screen']));
  insertPlan.run('plan_learn_pro', 'LearnLoop Pro', 'P-LL-PRO-001', 'PREMIUM', 1900, 'MONTHLY', JSON.stringify(['Interactive Coding Labs']));
  insertPlan.run('plan_fit_unlimited', 'FitFlow Unlimited', 'P-FF-UNLIMITED-001', 'PREMIUM', 2500, 'MONTHLY', JSON.stringify(['Live HIIT Classes']));
  insertPlan.run('plan_design_team', 'DesignCloud Pro', 'P-DC-PRO-001', 'PREMIUM', 2200, 'MONTHLY', JSON.stringify(['Cloud Canvas']));

  const now = new Date();
  const d65Ago = new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString();
  const d75Ago = new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000).toISOString();
  const d2Ago = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const d1Ago = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();

  const insertSub = db.prepare("INSERT INTO subscriptions (id, merchant_id, customer_id, plan_id, service_name, paypal_subscription_id, status, current_price_cents, currency, billing_frequency, next_renewal_date, keep_flag) VALUES (?, 'merch_faircloud', 'cust_alex', ?, ?, ?, ?, ?, 'USD', ?, ?, ?)");
  insertSub.run('sub_stream', 'plan_stream_premium', 'StreamNest Premium', 'I-STREAM-DEMO-29', 'ACTIVE', 2900, 'MONTHLY', '2026-11-20T00:00:00Z', 0);
  insertSub.run('sub_learn', 'plan_learn_pro', 'LearnLoop', 'I-LEARN-DEMO-19', 'ACTIVE', 1900, 'MONTHLY', '2026-11-18T00:00:00Z', 1);
  insertSub.run('sub_fit', 'plan_fit_unlimited', 'FitFlow', 'I-FIT-DEMO-25', 'ACTIVE', 2500, 'MONTHLY', '2026-11-15T00:00:00Z', 0);
  insertSub.run('sub_design', 'plan_design_team', 'DesignCloud', 'I-DESIGN-DEMO-22', 'PAST_DUE', 2200, 'MONTHLY', '2026-11-10T00:00:00Z', 0);

  const insertUsage = db.prepare("INSERT INTO usage_records (id, subscription_id, last_active_timestamp, activity_count_last_30_days, source) VALUES (?, ?, ?, ?, ?)");
  insertUsage.run('usg_stream', 'sub_stream', d65Ago, 0, 'MERCHANT_TELEMETRY');
  insertUsage.run('usg_learn', 'sub_learn', d2Ago, 14, 'MERCHANT_TELEMETRY');
  insertUsage.run('usg_fit', 'sub_fit', d75Ago, 0, 'MERCHANT_TELEMETRY');
  insertUsage.run('usg_design', 'sub_design', d1Ago, 18, 'MERCHANT_TELEMETRY');

  db.prepare("INSERT INTO merchant_policies (merchant_id, allowed_pause_duration_days, service_access_during_pause, resume_policy_notice_required, max_contact_frequency_per_week, eligible_downgrade_plan_ids) VALUES ('merch_faircloud', 90, 0, 1, 1, ?)")
    .run(JSON.stringify(['plan_stream_basic']));

  db.prepare("INSERT INTO recovery_cases (id, subscription_id, merchant_id, customer_id, paypal_event_id, outstanding_balance_cents, currency, failure_reason, attempt_count, status, draft_message, last_attempt_at, created_at) VALUES ('rec_design_01', 'sub_design', 'merch_faircloud', 'cust_alex', 'WH-SIM-01', 2200, 'USD', 'PAYMENT_DENIED', 1, 'OPEN', ?, ?, ?)")
    .run('Hi Alex, your recent renewal of $22.00 for DesignCloud could not be processed. Your workspace remains open while you review your payment method.', d1Ago, d1Ago);

  console.log('✓ FairPlan SQLite Database seeded successfully.');
}

if (require.main === module) seedDatabase();
