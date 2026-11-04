import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'fairplan_db.json');

interface TableData {
  merchants: any[];
  customers: any[];
  plans: any[];
  subscriptions: any[];
  usage_records: any[];
  merchant_policies: any[];
  action_proposals: any[];
  recovery_cases: any[];
  action_audit: any[];
}

function loadData(): TableData {
  if (fs.existsSync(DB_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
      // fallback
    }
  }
  return {
    merchants: [],
    customers: [],
    plans: [],
    subscriptions: [],
    usage_records: [],
    merchant_policies: [],
    action_proposals: [],
    recovery_cases: [],
    action_audit: []
  };
}

let store: TableData = loadData();

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf8');
}

export const db = {
  exec(sql: string) {
    if (sql.includes('DELETE FROM')) {
      store = {
        merchants: [],
        customers: [],
        plans: [],
        subscriptions: [],
        usage_records: [],
        merchant_policies: [],
        action_proposals: [],
        recovery_cases: [],
        action_audit: []
      };
      save();
    }
  },

  prepare(sql: string) {
    const s = sql.trim();

    return {
      run(...params: any[]) {
        if (/INSERT (INTO|OR REPLACE INTO) merchants/i.test(s)) {
          store.merchants.push({ id: params[0], name: params[1], paypal_merchant_id: params[2] });
        } else if (/INSERT (INTO|OR REPLACE INTO) customers/i.test(s)) {
          store.customers.push({ id: params[0], merchant_id: params[1], email: params[2], name: params[3], role: params[4] });
        } else if (/INSERT (INTO|OR REPLACE INTO) plans/i.test(s)) {
          store.plans.push({ id: params[0], merchant_id: params[1], name: params[2], paypal_plan_id: params[3], tier: params[4], price_cents: Number(params[5]), billing_frequency: params[6], features: params[7] });
        } else if (/INSERT (INTO|OR REPLACE INTO) subscriptions/i.test(s)) {
          store.subscriptions.push({
            id: params[0],
            merchant_id: 'merch_faircloud',
            customer_id: 'cust_alex',
            plan_id: params[1],
            service_name: params[2],
            paypal_subscription_id: params[3],
            status: params[4],
            current_price_cents: Number(params[5]),
            currency: 'USD',
            billing_frequency: params[6],
            next_renewal_date: params[7],
            keep_flag: Number(params[8] || 0)
          });
        } else if (/INSERT (INTO|OR REPLACE INTO) usage_records/i.test(s)) {
          store.usage_records.push({ id: params[0], subscription_id: params[1], last_active_timestamp: params[2], activity_count_last_30_days: params[3], source: params[4] });
        } else if (/INSERT (INTO|OR REPLACE INTO) merchant_policies/i.test(s)) {
          store.merchant_policies.push({ merchant_id: params[0], allowed_pause_duration_days: params[1], service_access_during_pause: params[2], resume_policy_notice_required: params[3], max_contact_frequency_per_week: params[4], eligible_downgrade_plan_ids: params[5] });
        } else if (/INSERT (INTO|OR REPLACE INTO) recovery_cases/i.test(s)) {
          store.recovery_cases.push({ id: params[0], subscription_id: params[1], merchant_id: params[2], customer_id: params[3], paypal_event_id: params[4], outstanding_balance_cents: Number(params[5]), currency: params[6], failure_reason: params[7], attempt_count: params[8], status: params[9], draft_message: params[10], last_attempt_at: params[11], created_at: params[12] });
        } else if (/INSERT (INTO|OR REPLACE INTO) action_proposals/i.test(s)) {
          const idx = store.action_proposals.findIndex(p => p.id === params[0]);
          const item = { id: params[0], subscription_id: params[1], customer_id: params[2], action_type: params[3], target_plan_id: params[4], current_price_cents: Number(params[5]), projected_price_cents: Number(params[6]), projected_monthly_savings_cents: Number(params[7]), terms_hash: params[8], version: params[9], expires_at: params[10], consumed: 0 };
          if (idx >= 0) store.action_proposals[idx] = item;
          else store.action_proposals.push(item);
        } else if (/UPDATE subscriptions SET keep_flag = \? WHERE id = \?/i.test(s)) {
          const sub = store.subscriptions.find(x => x.id === params[1]);
          if (sub) sub.keep_flag = params[0];
        } else if (/UPDATE subscriptions SET status = 'CANCELLED' WHERE id = \?/i.test(s)) {
          const sub = store.subscriptions.find(x => x.id === params[0]);
          if (sub) sub.status = 'CANCELLED';
        } else if (/UPDATE subscriptions SET plan_id = \?, current_price_cents = \?, status = 'ACTIVE' WHERE id = \?/i.test(s)) {
          const sub = store.subscriptions.find(x => x.id === params[2]);
          if (sub) { sub.plan_id = params[0]; sub.current_price_cents = Number(params[1]); sub.status = 'ACTIVE'; }
        } else if (/UPDATE action_proposals SET consumed = 1 WHERE id = \?/i.test(s)) {
          const prop = store.action_proposals.find(x => x.id === params[0]);
          if (prop) prop.consumed = 1;
        } else if (/UPDATE recovery_cases SET status = 'RECOVERED' WHERE id = \?/i.test(s)) {
          const rc = store.recovery_cases.find(x => x.id === params[0]);
          if (rc) rc.status = 'RECOVERED';
        } else if (/UPDATE subscriptions SET status = 'ACTIVE' WHERE id = \?/i.test(s)) {
          const sub = store.subscriptions.find(x => x.id === params[0]);
          if (sub) sub.status = 'ACTIVE';
        }

        save();
        return { changes: 1 };
      },

      get(...params: any[]) {
        if (/SELECT COUNT\(\*\) as c FROM subscriptions/i.test(s)) {
          return { c: store.subscriptions.length };
        }
        if (/SELECT COUNT\(\*\) as count FROM subscriptions WHERE status = 'ACTIVE'/i.test(s)) {
          return { count: store.subscriptions.filter(x => x.status === 'ACTIVE').length };
        }
        if (/SELECT COUNT\(\*\) as count FROM recovery_cases WHERE status = 'OPEN'/i.test(s)) {
          return { count: store.recovery_cases.filter(x => x.status === 'OPEN').length };
        }
        if (/SELECT \* FROM subscriptions WHERE id = 'sub_stream'/i.test(s)) {
          return store.subscriptions.find(x => x.id === 'sub_stream');
        }
        if (/SELECT \* FROM subscriptions WHERE id = 'sub_fit'/i.test(s)) {
          return store.subscriptions.find(x => x.id === 'sub_fit');
        }
        if (/SELECT \* FROM subscriptions WHERE id = \?/i.test(s)) {
          return store.subscriptions.find(x => x.id === params[0]);
        }
        if (/SELECT \* FROM merchant_policies/i.test(s)) {
          return store.merchant_policies[0] || { merchant_id: 'merch_faircloud', eligible_downgrade_plan_ids: '["plan_stream_basic"]' };
        }
        if (/SELECT \* FROM plans WHERE id = 'plan_stream_basic'/i.test(s)) {
          return store.plans.find(x => x.id === 'plan_stream_basic');
        }
        if (/SELECT \* FROM plans WHERE id = \?/i.test(s)) {
          return store.plans.find(x => x.id === params[0]);
        }
        if (/SELECT \* FROM action_proposals WHERE id = \?/i.test(s)) {
          return store.action_proposals.find(x => x.id === params[0]);
        }
        if (/SELECT \* FROM recovery_cases WHERE id = \?/i.test(s)) {
          return store.recovery_cases.find(x => x.id === params[0]);
        }
        return null;
      },

      all(..._params: any[]) {
        if (/SELECT s\.\*, p\.name as planName/i.test(s)) {
          return store.subscriptions.map(sub => {
            const plan = store.plans.find(p => p.id === sub.plan_id);
            const usage = store.usage_records.find(u => u.subscription_id === sub.id);
            return {
              ...sub,
              planName: plan?.name || sub.service_name,
              last_active_timestamp: usage?.last_active_timestamp || null,
              activity_count_last_30_days: usage?.activity_count_last_30_days || 0,
              source: usage?.source || 'UNKNOWN'
            };
          });
        }
        if (/SELECT r\.\*, s\.service_name FROM recovery_cases/i.test(s)) {
          return store.recovery_cases.map(rc => {
            const sub = store.subscriptions.find(s => s.id === rc.subscription_id);
            return {
              ...rc,
              service_name: sub?.service_name || 'Service'
            };
          });
        }
        return [];
      }
    };
  }
};