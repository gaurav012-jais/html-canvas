import { EntitySchema } from 'typeorm';

/**
 * VisitEvent Entity Model
 *
 * Immutable telemetry event log capturing granular milestone events across a user's funnel journey.
 * Records page renders (HOME_VIEW, OTP_VIEW, CONFIRM_VIEW), user interactions (SUBSCRIBE_CLICK, OTP_VERIFY),
 * carrier redirects (CG_REDIRECT), subscription outcomes (SUBSCRIBE_SUCCESS, SUBSCRIBE_FAILED),
 * and postback lifecycle events (POSTBACK_SENT, CALLBACK_RECEIVED).
 *
 * @class VisitEvent
 */
export class VisitEvent {}

/**
 * Milestone Funnel Event Type Enum.
 *
 * @readonly
 * @enum {string}
 */
export const VisitEventType = {
  /** Inbound click session initiated */
  VISIT: 'VISIT',
  /** Traffic blocked by geo, IP, or security rule */
  BLOCKED: 'BLOCKED',
  /** HOME landing page viewed by user */
  HOME_VIEW: 'HOME_VIEW',
  /** OTP entry page viewed by user */
  OTP_VIEW: 'OTP_VIEW',
  /** OTP PIN code requested/sent via SMS */
  OTP_SEND: 'OTP_SEND',
  /** OTP PIN submitted and verified */
  OTP_VERIFY: 'OTP_VERIFY',
  /** Consent confirmation page viewed */
  CONFIRM_VIEW: 'CONFIRM_VIEW',
  /** Subscribe / CTA button clicked */
  SUBSCRIBE_CLICK: 'SUBSCRIBE_CLICK',
  /** User redirected to carrier Consent Gateway (CG) */
  CG_REDIRECT: 'CG_REDIRECT',
  /** Carrier subscription successfully created */
  SUBSCRIBE_SUCCESS: 'SUBSCRIBE_SUCCESS',
  /** Subscription creation failed */
  SUBSCRIBE_FAILED: 'SUBSCRIBE_FAILED',
  /** Confirmation CTA clicked */
  CONFIRM_CLICK: 'CONFIRM_CLICK',
  /** Vendor postback queued as pending */
  POSTBACK_PENDING: 'POSTBACK_PENDING',
  /** Vendor postback successfully delivered */
  POSTBACK_SENT: 'POSTBACK_SENT',
  /** Vendor postback delivery failed */
  POSTBACK_FAILED: 'POSTBACK_FAILED',
  /** Inbound carrier billing callback received */
  CALLBACK_RECEIVED: 'CALLBACK_RECEIVED',
  /** Orange Burkina Faso synchronization event */
  ORANGE_BF_SYNC: 'ORANGE_BF_SYNC',
  /** Public rate limit threshold hit */
  RATE_LIMIT_HIT: 'RATE_LIMIT_HIT',
  /** Multiple invalid OTP brute force attempts detected */
  BRUTE_FORCE_ATTEMPT: 'BRUTE_FORCE_ATTEMPT',
  /** Blocked request logged by security guard */
  BLOCKED_REQUEST: 'BLOCKED_REQUEST',
  /** 30-minute delayed carrier checksub reconciliation event */
  CHECKSUB_30M: 'CHECKSUB_30M',
};

/**
 * TypeORM Schema Definition for VisitEvent
 * Maps to the `visit_events` table.
 */
export const VisitEventSchema = new EntitySchema({
  name: 'VisitEvent',
  target: VisitEvent,
  tableName: 'visit_events',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {number} Foreign key referencing parent `visits.id` */
    visitId: {
      name: 'visit_id',
      type: 'int',
    },
    /** @type {string} Milestone event type name (see VisitEventType enum) */
    eventType: {
      name: 'event_type',
      type: 'varchar',
    },
    /** @type {Record<string, any>|null} Arbitrary JSON payload of context attributes (e.g. latency, error, headers) */
    metadata: {
      type: 'json',
      nullable: true,
    },
    /** @type {Date} Record creation timestamp */
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    /** @type {import('./visit.entity.js').Visit} Parent visit session */
    visit: {
      type: 'many-to-one',
      target: 'Visit',
      inverseSide: 'events',
      joinColumn: { name: 'visit_id' },
      onDelete: 'CASCADE',
    },
  },
  indices: [
    { name: 'IDX_EVENTS_VISIT', columns: ['visitId'] },
    { name: 'IDX_VISIT_EVENT_TYPE', columns: ['eventType'] },
  ],
});
