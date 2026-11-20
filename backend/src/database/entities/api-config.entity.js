import { EntitySchema } from 'typeorm';

// Third-party carrier / aggregator API configurations for a Campaign
export class ApiConfig {}

export const ApiConfigSchema = new EntitySchema({
  name: 'ApiConfig',
  target: ApiConfig,
  tableName: 'api_configs',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    campaignId: {
      name: 'campaign_id',
      type: 'int', // FK -> campaigns.id (1:1)
    },
    blocklistApi: {
      name: 'blocklist_api',
      type: 'varchar',
      nullable: true, // DND / blocklist validation URL
    },
    subscriptionApi: {
      name: 'subscription_api',
      type: 'varchar',
      nullable: true, // CheckSub status query endpoint URL
    },
    subscribeApi: {
      name: 'subscribe_api',
      type: 'varchar',
      nullable: true, // Direct subscribe invocation endpoint URL
    },
    headersJson: {
      name: 'headers_json',
      type: 'text',
      nullable: true, // Custom HTTP headers JSON
    },
    otpConfigJson: {
      name: 'otp_config_json',
      type: 'text',
      nullable: true, // OTP send/verify configuration JSON
    },
    resolveMsisdnUrl: {
      name: 'resolve_msisdn_url',
      type: 'varchar',
      length: 1024,
      nullable: true, // External token-to-MSISDN resolution URL
    },
    heProvider: {
      name: 'he_provider',
      type: 'varchar',
      length: 32,
      nullable: true,
      default: 'header', // 'header' | 'token'
    },
    heConfigJson: {
      name: 'he_config_json',
      type: 'text',
      nullable: true, // HE params / token extractor config JSON
    },
    checksubConfigJson: {
      name: 'checksub_config_json',
      type: 'text',
      nullable: true, // Checksub status routing rules JSON
    },
    dcbConfigJson: {
      name: 'dcb_config_json',
      type: 'text',
      nullable: true, // DCB gateway credentials and endpoints JSON
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
  },
  indices: [
    {
      name: 'IDX_API_CONFIG_CAMPAIGN_ID',
      unique: true,
      columns: ['campaignId'],
    },
  ],
});
