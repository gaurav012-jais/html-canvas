import { Client } from '@elastic/elasticsearch';
import getConfig from '../../config/configuration.js';

export const createElasticsearchClient = () => {
  const config = getConfig();
  const enabled = Boolean(config.search?.enabled);
  const indexName = config.search?.index || 'campaign_events';
  const node = config.search?.node;

  let client = enabled && node ? new Client({ node }) : null;
  let connectionFailed = false;

  const isEnabled = () => Boolean(client && !connectionFailed);

  const ensureIndex = async () => {
    if (!client) return;
    const exists = await client.indices.exists({ index: indexName });
    if (exists) return;
    await client.indices.create({
      index: indexName,
      mappings: {
        properties: {
          campaignId: { type: 'integer' },
          visitId: { type: 'integer' },
          vendorId: { type: 'integer' },
          affiliateId: { type: 'integer' },
          clickId: { type: 'keyword' },
          rcid: { type: 'keyword' },
          vidRaw: { type: 'keyword' },
          affRaw: { type: 'keyword' },
          phoneMasked: { type: 'keyword' },
          phone: { type: 'keyword' },
          country: { type: 'keyword' },
          operator: { type: 'keyword' },
          pageType: { type: 'keyword' },
          eventType: { type: 'keyword' },
          status: { type: 'keyword' },
          ip: { type: 'keyword' },
          userAgent: { type: 'text' },
          requestUrl: { type: 'keyword' },
          responseStatus: { type: 'integer' },
          success: { type: 'boolean' },
          timestamp: { type: 'date' },
        },
      },
    });
  };

  const ensureMappingFields = async () => {
    if (!client) return;
    try {
      await client.indices.putMapping({
        index: indexName,
        properties: {
          rcid: { type: 'keyword' },
          phone: { type: 'keyword' },
          requestUrl: { type: 'keyword' },
          responseStatus: { type: 'integer' },
          success: { type: 'boolean' },
        },
      });
    } catch (err) {
      console.warn(`ES putMapping skipped: ${err.message}`);
    }
  };

  const init = async () => {
    if (!client) {
      console.log(
        'Elasticsearch disabled (ELASTICSEARCH_NODE not set). Database fallback active.',
      );
      return;
    }
    try {
      await ensureIndex();
      await ensureMappingFields();
      console.log(`Elasticsearch ready. index=${indexName}`);
    } catch (err) {
      connectionFailed = true;
      console.warn(
        `Elasticsearch init failed (continuing with database fallback): ${err.message}`,
      );
    }
  };

  const indexEvent = async (doc) => {
    if (!client || connectionFailed) return;
    try {
      await client.index({ index: indexName, document: doc });
    } catch (err) {
      console.warn(`indexEvent failed: ${err.message}`);
    }
  };

  const setConnectionFailed = (val) => {
    connectionFailed = Boolean(val);
  };

  return {
    client,
    indexName,
    isEnabled,
    init,
    indexEvent,
    setConnectionFailed,
  };
};
