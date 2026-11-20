import { EntitySchema } from 'typeorm';

// Server-to-server (S2S) postbacks delivered to vendors & affiliates
export class ConversionPostback {}

export const ConversionPostbackStatus = {
  PENDING: 'pending',
  RECEIVED: 'received',
  SENT: 'sent',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  PENDING_CHECKSUB: 'pending_checksub',
};

export const ConversionPostbackSchema = new EntitySchema({
  name: 'ConversionPostback',
  target: ConversionPostback,
  tableName: 'conversion_postbacks',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    visitId: {
      name: 'visit_id',
      type: 'int',
      nullable: true, // FK -> visits.id
    },
    campaignId: {
      name: 'campaign_id',
      type: 'int',
      nullable: true, // FK -> campaigns.id
    },
    vendorId: {
      name: 'vendor_id',
      type: 'int',
      nullable: true, // FK -> vendors.id
    },
    affiliateId: {
      name: 'affiliate_id',
      type: 'int',
      nullable: true, // FK -> affiliates.id
    },
    msisdn: {
      type: 'varchar',
      length: 64,
      nullable: true, // Unique per conversion
    },
    campid: {
      type: 'varchar',
      length: 128,
      nullable: true, // Vendor network campaign identifier (?campid=)
    },
    trackingCampid: {
      name: 'tracking_campid',
      type: 'varchar',
      length: 128,
      nullable: true, // Internal tracking code (e.g. BF-OBF-11)
    },
    clickId: {
      name: 'click_id',
      type: 'varchar',
      length: 255,
      nullable: true, // Inbound vendor click ID (?click_id=)
    },
    rcid: {
      type: 'varchar',
      length: 255,
      nullable: true, // Affiliate referrer click ID (?rcid=)
    },
    offerCode: {
      name: 'offer_code',
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    postbackUrl: {
      name: 'postback_url',
      type: 'text',
      nullable: true, // Postback URL with substituted macros
    },
    status: {
      type: 'varchar',
      length: 32,
      default: ConversionPostbackStatus.PENDING,
    },
    operatorStatus: {
      name: 'operator_status',
      type: 'varchar',
      length: 64,
      nullable: true, // Operator callback status ('active', 'grace', etc.)
    },
    httpStatus: {
      name: 'http_status',
      type: 'int',
      nullable: true, // HTTP response code from vendor endpoint
    },
    responseBody: {
      name: 'response_body',
      type: 'text',
      nullable: true,
    },
    errorMessage: {
      name: 'error_message',
      type: 'text',
      nullable: true,
    },
    sentAt: {
      name: 'sent_at',
      type: 'timestamp',
      nullable: true, // Timestamp when postback was delivered
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
    updatedAt: {
      name: 'updated_at',
      type: 'timestamp',
      updateDate: true,
    },
    delayedChecksubStatus: {
      name: 'delayed_checksub_status',
      type: 'varchar',
      length: 32,
      nullable: true, // 'pending' | 'in_progress' | 'completed' | 'failed'
    },
    delayedChecksubScheduledAt: {
      name: 'delayed_checksub_scheduled_at',
      type: 'timestamp',
      nullable: true, // Typically created_at + 30 minutes
    },
    delayedChecksubExecutedAt: {
      name: 'delayed_checksub_executed_at',
      type: 'timestamp',
      nullable: true,
    },
    delayedChecksubOutcome: {
      name: 'delayed_checksub_outcome',
      type: 'varchar',
      length: 64,
      nullable: true, // 'ACTIVE' | 'GRACE' | 'SUSPENDED'
    },
    delayedChecksubResponse: {
      name: 'delayed_checksub_response',
      type: 'text',
      nullable: true,
    },
  },
  indices: [
    {
      name: 'UQ_conversion_postbacks_msisdn',
      columns: ['msisdn'],
      unique: true,
    },
    { name: 'IDX_postbacks_visit', columns: ['visitId'] },
    { name: 'IDX_postbacks_campid', columns: ['campid'] },
    { name: 'IDX_postbacks_click_id', columns: ['clickId'] },
    {
      name: 'IDX_postbacks_delayed_checksub',
      columns: ['delayedChecksubStatus', 'delayedChecksubScheduledAt'],
    },
  ],
});
