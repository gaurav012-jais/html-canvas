import { EntitySchema } from 'typeorm';

/**
 * ApiConfig Entity Model
 *
 * Defines third-party carrier and telco aggregator integration endpoints for a Campaign.
 * Stores URLs, HTTP methods, headers, and payload templates for:
 * - OTP Send & Verify (SMS PIN flow)
 * - CheckSub (subscriber status query for existing billing status)
 * - Header Enrichment (HE token-to-MSISDN network lookup)
 * - Direct Carrier Billing (DCB payment gateways e.g. Universe Telecom, Orange)
 * - DND / Blocklist validation APIs
 *
 * @class ApiConfig
 */
export class ApiConfig {}

/**
 * TypeORM Schema Definition for ApiConfig
 * Maps to the `api_configs` table.
 */
export const ApiConfigSchema = new EntitySchema({
  name: 'ApiConfig',
  target: ApiConfig,
  tableName: 'api_configs',
  columns: {
    /** @type {number} Primary auto-incrementing identifier */
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    /** @type {number} Foreign key referencing `campaigns.id` (1:1 relationship) */
    campaignId: {
      name: 'campaign_id',
      type: 'int',
    },
    /** @type {string|null} DND / Blocklist validation endpoint URL */
    blocklistApi: {
      name: 'blocklist_api',
      type: 'varchar',
      nullable: true,
    },
    /** @type {string|null} CheckSub status query endpoint URL */
    subscriptionApi: {
      name: 'subscription_api',
      type: 'varchar',
      nullable: true,
    },
    /** @type {string|null} Direct subscribe invocation endpoint URL */
    subscribeApi: {
      name: 'subscribe_api',
      type: 'varchar',
      nullable: true,
    },
    /** @type {string|null} Global HTTP headers JSON sent with partner requests */
    headersJson: {
      name: 'headers_json',
      type: 'text',
      nullable: true,
    },
    /** @type {string|null} OTP send & verify endpoint URLs, HTTP methods, headers, and response matcher config JSON */
    otpConfigJson: {
      name: 'otp_config_json',
      type: 'text',
      nullable: true,
    },
    /** @type {string|null} External token-to-MSISDN carrier resolution URL for Header Enrichment */
    resolveMsisdnUrl: {
      name: 'resolve_msisdn_url',
      type: 'varchar',
      length: 1024,
      nullable: true,
    },
    /** @type {string|null} Header enrichment provider mode: 'header' | 'token' */
    heProvider: {
      name: 'he_provider',
      type: 'varchar',
      length: 32,
      nullable: true,
      default: 'header',
    },
    /** @type {string|null} HE specific query parameters, headers, or token extractor JSON configs */
    heConfigJson: {
      name: 'he_config_json',
      type: 'text',
      nullable: true,
    },
    /** @type {string|null} Custom checksub status routing rules JSON: { statusField, rules[], missGo, missPage, missUrl } */
    checksubConfigJson: {
      name: 'checksub_config_json',
      type: 'text',
      nullable: true,
    },
    /** @type {string|null} DCB provider endpoints, credentials, and response normalizer JSON config (e.g. Universe DCB) */
    dcbConfigJson: {
      name: 'dcb_config_json',
      type: 'text',
      nullable: true,
    },
    /** @type {Date} Record creation timestamp */
    createdAt: {
      name: 'created_at',
      type: 'timestamp',
      createDate: true,
    },
    /** @type {Date} Record last update timestamp */
    updatedAt: {
      name: 'updated_at',
      type: 'timestamp',
      updateDate: true,
    },
  },
  indices: [
    {
      name: 'IDX_API_CONFIG_CAMPAIGN_ID',
      unique: true,
      columns: ['campaignId'],
    },
  ],
});
