/**
 * Zod Validation Schemas for Revenue Pillars (0-8)
 * @module lib/schemas/pillars
 *
 * Rule #7: Use zod schemas for ALL inputs and API responses.
 * Covers: Billing, AI, Web Architect, CRM, Voice AI, Studio, Radar, Ops, Fintech
 */
import { z } from 'zod';
import { MoneySchema,MongoIdSchema,TimestampSchema } from './api';

// ============================================================
// Pillar 0: Billing & Brokerage
// ============================================================

export const SubscriptionPlanSchema = z.object({
    id: MongoIdSchema,
    name: z.string(),
    basePrice: z.number(),
    features: z.array(z.string()),
    is_active: z.boolean().default(true),
});

export const AiUsageRecordSchema = z.object({
    id: MongoIdSchema,
    tenant_id: MongoIdSchema,
    provider: z.enum(['GOOGLE', 'OPENAI', 'ELEVENLABS']),
    model: z.string(),
    tokens_used: z.number().int(),
    cost: z.number(),
    sell_price: z.number(),
    created_at: TimestampSchema,
});

export const BillingSummarySchema = z.object({
    tenant_id: MongoIdSchema,
    period: z.string(),
    subscription_cost: z.number(),
    module_fees: z.number(),
    ai_usage_cost: z.number(),
    storage_cost: z.number(),
    total: z.number(),
});

// ============================================================
// Pillar 1: AI Infrastructure
// ============================================================

export const AiConfigSchema = z.object({
    tenant_id: MongoIdSchema.optional(),
    venue_id: MongoIdSchema.optional(),
    default_model: z.string().default('gemini-2.0-flash'),
    premium_model: z.string().default('gemini-1.5-pro'),
    grounding_enabled: z.boolean().default(true),
    max_tokens: z.number().int().default(2048),
});

export const AiPromptResultSchema = z.object({
    text: z.string(),
    model: z.string(),
    tokens_used: z.number().int(),
    grounded: z.boolean().default(false),
    latency_ms: z.number().optional(),
});

// ============================================================
// Pillar 2: Web Architect
// ============================================================

export const MarketingSiteSchema = z.object({
    id: MongoIdSchema,
    venue_id: MongoIdSchema,
    domain: z.string().optional(),
    theme: z.string().default('default'),
    sections: z.array(z.object({
        id: z.string(),
        type: z.enum(['hero', 'menu', 'about', 'gallery', 'contact', 'reviews', 'custom']),
        title: z.string().optional(),
        content: z.record(z.unknown()).optional(),
        order: z.number().int(),
        is_visible: z.boolean().default(true),
    })),
    seo: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        og_image: z.string().optional(),
    }).optional(),
    published: z.boolean().default(false),
});

// ============================================================
// Pillar 3: CRM / Autopilot
// ============================================================

export const CustomerProfileSchema = z.object({
    id: MongoIdSchema,
    name: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    venue_id: MongoIdSchema,
    total_visits: z.number().int().default(0),
    total_spent: MoneySchema.default(0),
    churn_score: z.number().min(0).max(100).optional(),
    taste_tags: z.array(z.string()).default([]),
    last_visit: TimestampSchema.optional(),
    loyalty_points: z.number().int().default(0),
});

export const MarketingCampaignSchema = z.object({
    id: MongoIdSchema,
    venue_id: MongoIdSchema,
    name: z.string(),
    type: z.enum(['sms', 'email', 'push', 'whatsapp']),
    status: z.enum(['draft', 'scheduled', 'active', 'completed', 'paused']),
    target_segment: z.string().optional(),
    message_template: z.string(),
    sent_count: z.number().int().default(0),
    open_rate: z.number().min(0).max(100).optional(),
    created_at: TimestampSchema,
});

// ============================================================
// Pillar 4: Voice AI
// ============================================================

export const VoiceConfigSchema = z.object({
    id: MongoIdSchema,
    venue_id: MongoIdSchema,
    persona_name: z.string().default('Rin'),
    voice_id: z.string().optional(),
    language: z.string().default('en-US'),
    greeting: z.string().optional(),
    knowledge_base_ids: z.array(z.string()).default([]),
    is_active: z.boolean().default(false),
});

export const CallLogSchema = z.object({
    id: MongoIdSchema,
    venue_id: MongoIdSchema,
    caller_phone: z.string().optional(),
    duration_seconds: z.number().int(),
    intent: z.enum(['reservation', 'menu_query', 'hours', 'other']).optional(),
    resolved: z.boolean().default(false),
    transcript_summary: z.string().optional(),
    ai_cost: z.number().default(0),
    created_at: TimestampSchema,
});

// ============================================================
// Pillar 5: Studio (Generative Content)
// ============================================================

export const MediaAssetSchema = z.object({
    id: MongoIdSchema,
    venue_id: MongoIdSchema,
    type: z.enum(['image', 'video', 'document']),
    url: z.string().url(),
    thumbnail_url: z.string().url().optional(),
    alt_text: z.string().optional(),
    size_bytes: z.number().int(),
    is_ai_generated: z.boolean().default(false),
    created_at: TimestampSchema,
});

export const ContentGenerationRequestSchema = z.object({
    prompt: z.string().min(1),
    type: z.enum(['food_photo', 'social_post', 'menu_description', 'seo_text']),
    style: z.string().optional(),
    venue_id: MongoIdSchema,
});

// ============================================================
// Pillar 6: Market Radar
// ============================================================

export const CompetitorSchema = z.object({
    id: MongoIdSchema,
    venue_id: MongoIdSchema,
    name: z.string(),
    address: z.string().optional(),
    google_place_id: z.string().optional(),
    avg_rating: z.number().min(0).max(5).optional(),
    price_level: z.number().int().min(1).max(4).optional(),
    tracked_items: z.array(z.object({
        item_name: z.string(),
        price: z.number(),
        last_updated: TimestampSchema.optional(),
    })).optional(),
});

export const YieldRuleSchema = z.object({
    id: MongoIdSchema,
    venue_id: MongoIdSchema,
    name: z.string(),
    trigger: z.enum(['occupancy', 'time', 'demand', 'weather']),
    threshold: z.number(),
    price_adjustment_pct: z.number(),
    is_active: z.boolean().default(false),
    applies_to: z.array(MongoIdSchema).optional(),
});

export const AllergenGuardResultSchema = z.object({
    item_id: MongoIdSchema,
    item_name: z.string(),
    detected_allergens: z.array(z.string()),
    confidence: z.number().min(0).max(100),
    needs_review: z.boolean().default(false),
});

// ============================================================
// Pillar 7: Ops Hub & Aggregator
// ============================================================

export const AggregatorConfigSchema = z.object({
    id: MongoIdSchema,
    venue_id: MongoIdSchema,
    platform: z.enum(['uber_eats', 'wolt', 'bolt', 'deliveroo', 'custom']),
    api_key: z.string().optional(),
    store_id: z.string().optional(),
    is_active: z.boolean().default(false),
    auto_accept: z.boolean().default(false),
    menu_sync_enabled: z.boolean().default(false),
});

export const LaborCostAlertSchema = z.object({
    venue_id: MongoIdSchema,
    period: z.string(),
    labor_cost_pct: z.number(),
    revenue: z.number(),
    labor_cost: z.number(),
    threshold_pct: z.number(),
    is_over_threshold: z.boolean(),
});

// ============================================================
// Pillar 8: Fintech (Payments)
// ============================================================

export const TransactionSchema = z.object({
    id: MongoIdSchema,
    venue_id: MongoIdSchema,
    order_id: MongoIdSchema.optional(),
    amount: MoneySchema,
    method: z.enum(['cash', 'card', 'online', 'split', 'voucher']),
    status: z.enum(['pending', 'completed', 'refunded', 'failed']),
    tip_amount: MoneySchema.optional(),
    created_at: TimestampSchema,
});

export const KioskConfigSchema = z.object({
    id: MongoIdSchema,
    venue_id: MongoIdSchema,
    device_id: z.string().optional(),
    theme: z.string().default('dark'),
    idle_timeout_secs: z.number().int().default(60),
    payment_methods: z.array(z.string()).default(['card']),
    show_allergens: z.boolean().default(true),
    is_active: z.boolean().default(false),
});

export const SplitPaymentSchema = z.object({
    order_id: MongoIdSchema,
    splits: z.array(z.object({
        seat_number: z.number().int().optional(),
        amount: MoneySchema,
        method: z.enum(['cash', 'card', 'online', 'voucher']),
        tip: MoneySchema.optional(),
    })),
    total_amount: MoneySchema,
});

// ============================================================
// Type Exports
// ============================================================

export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>;
export type AiUsageRecord = z.infer<typeof AiUsageRecordSchema>;
export type BillingSummary = z.infer<typeof BillingSummarySchema>;
export type AiConfig = z.infer<typeof AiConfigSchema>;
export type AiPromptResult = z.infer<typeof AiPromptResultSchema>;
export type MarketingSite = z.infer<typeof MarketingSiteSchema>;
export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;
export type MarketingCampaign = z.infer<typeof MarketingCampaignSchema>;
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;
export type CallLog = z.infer<typeof CallLogSchema>;
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
export type ContentGenerationRequest = z.infer<typeof ContentGenerationRequestSchema>;
export type Competitor = z.infer<typeof CompetitorSchema>;
export type YieldRule = z.infer<typeof YieldRuleSchema>;
export type AllergenGuardResult = z.infer<typeof AllergenGuardResultSchema>;
export type AggregatorConfig = z.infer<typeof AggregatorConfigSchema>;
export type LaborCostAlert = z.infer<typeof LaborCostAlertSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type KioskConfig = z.infer<typeof KioskConfigSchema>;
export type SplitPayment = z.infer<typeof SplitPaymentSchema>;
