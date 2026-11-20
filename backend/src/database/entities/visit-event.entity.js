import { EntitySchema } from 'typeorm';

// VisitEvent — granular telemetry milestone events across a user funnel journey
export class VisitEvent {}

export const VisitEventType = {
  VISIT: 'VISIT',                     // Inbound click session initiated
  BLOCKED: 'BLOCKED',                 // Traffic blocked by geo, IP, or security rule
  HOME_VIEW: 'HOME_VIEW',             // HOME landing page viewed by user
  OTP_VIEW: 'OTP_VIEW',               // OTP entry page viewed by user
  OTP_SEND: 'OTP_SEND',               // OTP PIN requested/sent via SMS
  OTP_VERIFY: 'OTP_VERIFY',           // OTP PIN submitted and verified
  CONFIRM_VIEW: 'CONFIRM_VIEW',       // Consent confirmation page viewed
  SUBSCRIBE_CLICK: 'SUBSCRIBE_CLICK', // Subscribe / CTA button clicked
  CG_REDIRECT: 'CG_REDIRECT',         // User redirected to carrier Consent Gateway (CG)
  SUBSCRIBE_SUCCESS: 'SUBSCRIBE_SUCCESS', // Carrier subscription successfully created
  SUBSCRIBE_FAILED: 'SUBSCRIBE_FAILED',   // Subscription creation failed
  CONFIRM_CLICK: 'CONFIRM_CLICK',     // Confirmation CTA clicked
  POSTBACK_PENDING: 'POSTBACK_PENDING', // Vendor postback queued as pending
  POSTBACK_SENT: 'POSTBACK_SENT',     // Vendor postback successfully delivered
  POSTBACK_FAILED: 'POSTBACK_FAILED', // Vendor postback delivery failed
  CALLBACK_RECEIVED: 'CALLBACK_RECEIVED', // Inbound carrier billing callback received
  ORANGE_BF_SYNC: 'ORANGE_BF_SYNC',   // Orange Burkina Faso synchronization event
  RATE_LIMIT_HIT: 'RATE_LIMIT_HIT',   // Public rate limit threshold hit
  BRUTE_FORCE_ATTEMPT: 'BRUTE_FORCE_ATTEMPT', // Invalid OTP brute force attempts detected
  BLOCKED_REQUEST: 'BLOCKED_REQUEST', // Blocked request logged by security guard
  CHECKSUB_30M: 'CHECKSUB_30M',       // 30-minute delayed carrier checksub reconciliation
};

export const VisitEventSchema = new EntitySchema({
  name: 'VisitEvent',
  target: VisitEvent,
  tableName: 'visit_events',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    visitId: {
      name: 'visit_id',
      type: 'int', // FK -> visits.id
    },
    eventType: {
      name: 'event_type',
      type: 'varchar',
    },
    metadata: {
      type: 'json',
      nullable: true, // JSON payload (latency, error, headers, etc.)
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
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
