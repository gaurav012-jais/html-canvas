import { EntitySchema } from 'typeorm';

// Visit — end-user session / traffic click through a campaign funnel
export class Visit {}

export const VisitStatus = {
  VISIT: 'VISIT',                 // Initial inbound request received
  BLOCKED: 'BLOCKED',             // Blocked by geo-IP or DND rules
  SUBSCRIBED: 'SUBSCRIBED',       // Subscriber successfully subscribed
  HOME_SHOWN: 'HOME_SHOWN',       // HOME landing page displayed
  OTP_SHOWN: 'OTP_SHOWN',         // OTP entry page displayed
  CONFIRM_SHOWN: 'CONFIRM_SHOWN', // Consent confirmation page displayed
  SUCCESS: 'SUCCESS',             // General success terminal state
  FAILED: 'FAILED',               // Terminal error or billing failure
};

export const VisitSchema = new EntitySchema({
  name: 'Visit',
  target: Visit,
  tableName: 'visits',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    campaignId: {
      name: 'campaign_id',
      type: 'int', // FK -> campaigns.id
      nullable: true,
    },
    phone: {
      type: 'varchar', // MSISDN (detected via HE or inputted via OTP)
      nullable: true,
    },
    country: {
      type: 'varchar',
      nullable: true,
    },
    operator: {
      type: 'varchar',
      nullable: true,
    },
    ipAddress: {
      name: 'ip_address',
      type: 'varchar',
      nullable: true,
    },
    userAgent: {
      name: 'user_agent',
      type: 'varchar',
      nullable: true,
    },
    landingUrl: {
      name: 'landing_url',
      type: 'text',
      nullable: true,
    },
    vendorId: {
      name: 'vendor_id',
      type: 'int', // FK -> vendors.id
      nullable: true,
    },
    affiliateId: {
      name: 'affiliate_id',
      type: 'int', // FK -> affiliates.id
      nullable: true,
    },
    clickId: {
      name: 'click_id',
      type: 'varchar', // Partner click ID (?click_id=)
      nullable: true,
    },
    rcid: {
      type: 'varchar', // Affiliate / network click ID (?rcid=)
      nullable: true,
    },
    campid: {
      type: 'varchar',
      length: 128, // Inbound partner campaign ID (?campid=)
      nullable: true,
    },
    trackingCampid: {
      name: 'tracking_campid',
      type: 'varchar',
      length: 128, // Internal tracking campaign code (e.g. BF-OBF-11)
      nullable: true,
    },
    vidRaw: {
      name: 'vid_raw',
      type: 'varchar', // Raw unmapped vendor string from inbound query
      nullable: true,
    },
    affRaw: {
      name: 'aff_raw',
      type: 'varchar', // Raw unmapped affiliate string from inbound query
      nullable: true,
    },
    visitStatus: {
      name: 'visit_status',
      type: 'varchar',
      default: VisitStatus.VISIT,
    },
    pageType: {
      name: 'page_type',
      type: 'varchar', // Last rendered page: 'HOME' | 'OTP' | 'CONFIRM' | 'THANKYOU'
      nullable: true,
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
    otpVerifiedAt: {
      name: 'otp_verified_at',
      type: 'timestamp', // Timestamp when partner OTP was verified
      nullable: true,
    },
    checksubStatus: {
      name: 'checksub_status',
      type: 'varchar',
      length: 32, // Delayed checksub result ('ACTIVE', 'GRACE', 'PARKING', 'INACTIVE')
      nullable: true,
    },
    checksubExecutedAt: {
      name: 'checksub_executed_at',
      type: 'timestamp', // Timestamp when 30-min delayed checksub evaluated this visit
      nullable: true,
    },
    checksubResponse: {
      name: 'checksub_response',
      type: 'text', // Raw response body from delayed checksub
      nullable: true,
    },
  },
  relations: {
    events: {
      type: 'one-to-many',
      target: 'VisitEvent',
      inverseSide: 'visit',
    },
  },
  indices: [
    { name: 'IDX_VISIT_CAMPAIGN_ID', columns: ['campaignId'] },
    { name: 'IDX_VISIT_VENDOR_ID', columns: ['vendorId'] },
    { name: 'IDX_VISIT_AFFILIATE_ID', columns: ['affiliateId'] },
    { name: 'IDX_VISIT_CLICK_ID', columns: ['clickId'] },
    { name: 'IDX_VISIT_RCID', columns: ['rcid'] },
    { name: 'IDX_VISIT_CAMPID', columns: ['campid'] },
    { name: 'IDX_VISIT_TRACKING_CAMPID', columns: ['trackingCampid'] },
  ],
});
