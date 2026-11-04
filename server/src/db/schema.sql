CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  paypal_merchant_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CONSUMER'
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  paypal_plan_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  billing_frequency TEXT NOT NULL,
  features TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  paypal_subscription_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  current_price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  billing_frequency TEXT NOT NULL,
  next_renewal_date TEXT NOT NULL,
  keep_flag INTEGER NOT NULL DEFAULT 0,
  approval_url TEXT,
  pending_plan_id TEXT
);

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL UNIQUE,
  last_active_timestamp TEXT,
  activity_count_last_30_days INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS merchant_policies (
  merchant_id TEXT PRIMARY KEY,
  allowed_pause_duration_days INTEGER NOT NULL,
  service_access_during_pause INTEGER NOT NULL,
  resume_policy_notice_required INTEGER NOT NULL,
  max_contact_frequency_per_week INTEGER NOT NULL,
  eligible_downgrade_plan_ids TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS action_proposals (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_plan_id TEXT,
  current_price_cents INTEGER NOT NULL,
  projected_price_cents INTEGER NOT NULL,
  projected_monthly_savings_cents INTEGER NOT NULL,
  terms_hash TEXT NOT NULL,
  version INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS action_audit (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recovery_cases (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL UNIQUE,
  merchant_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  paypal_event_id TEXT NOT NULL,
  outstanding_balance_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  failure_reason TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  draft_message TEXT,
  last_attempt_at TEXT,
  created_at TEXT NOT NULL
);
