export type BillingStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'PENDING_BUYER_APPROVAL' | 'PAST_DUE';
export type BillingFrequency = 'MONTHLY' | 'YEARLY' | 'WEEKLY';
export type ActionType = 'CANCEL' | 'DOWNGRADE' | 'PAUSE' | 'RESUME';

export interface ProductPlan { id: string; merchantId: string; name: string; paypalPlanId: string; tier: string; priceCents: number; billingFrequency: BillingFrequency; features: string[]; }
export interface Subscription { id: string; merchantId: string; customerId: string; planId: string; serviceName: string; paypalSubscriptionId: string; status: BillingStatus; currentPriceCents: number; currency: string; billingFrequency: BillingFrequency; nextRenewalDate: string; keepFlag: boolean; }
export interface ActionProposal { id: string; subscriptionId: string; customerId: string; actionType: ActionType; targetPlanId?: string; currentPriceCents: number; projectedPriceCents: number; projectedMonthlySavingsCents: number; termsHash: string; version: number; expiresAt: string; consumed: boolean; }
