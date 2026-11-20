import { DEFAULT_TIMEZONE } from '../../common/zoned-day.js';
import { createElasticsearchClient } from './client.js';
import { buildQuery } from './queries/es-query.builder.js';
import {
  searchSessionsFromDb,
  searchFromDb,
  aggregationsFromDb,
  funnelCompareFromDb,
  otpStatsFromDb,
  resolveInterval,
} from './db/search-db.service.js';
import { exportLogs } from './export/logs-export.service.js';

export const createSearchService = () => {
  const esClient = createElasticsearchClient();

  const isEnabled = () => esClient.isEnabled();

  const init = async () => {
    await esClient.init();
  };

  const indexEvent = async (doc) => {
    await esClient.indexEvent(doc);
  };

  const search = async (params) => {
    const page = Math.max(1, params.page || 1);
    const size = Math.min(200, Math.max(1, params.size || 25));
    const view = params.view === 'sessions' ? 'sessions' : 'events';

    // Sessions = one row per visit; always use DB for accurate unique counts.
    if (view === 'sessions') {
      return searchSessionsFromDb(params);
    }

    if (esClient.isEnabled()) {
      try {
        const res = await esClient.client.search({
          index: esClient.indexName,
          from: (page - 1) * size,
          size,
          sort: [{ timestamp: { order: 'desc' } }],
          query: buildQuery(params),
        });
        const totalValue =
          typeof res.hits.total === 'number'
            ? res.hits.total
            : res.hits.total?.value || 0;
        return {
          total: totalValue,
          page,
          size,
          view: 'events',
          items: res.hits.hits.map((h) => h._source),
        };
      } catch (err) {
        esClient.setConnectionFailed(true);
      }
    }

    return searchFromDb({ ...params, view: 'events' });
  };

  const aggregations = async (params) => {
    const interval = resolveInterval(params);
    let timeZone = params.timezone || DEFAULT_TIMEZONE;
    if (timeZone === 'Asia/Calcutta') {
      timeZone = 'Asia/Kolkata';
    }

    if (esClient.isEnabled()) {
      try {
        const res = await esClient.client.search({
          index: esClient.indexName,
          size: 0,
          query: buildQuery(params),
          aggs: {
            timeSeries: {
              date_histogram: {
                field: 'timestamp',
                calendar_interval: interval,
                time_zone: timeZone,
                min_doc_count: 0,
              },
            },
            byEventType: { terms: { field: 'eventType', size: 30 } },
            byVendor: { terms: { field: 'vendorId', size: 20 } },
            byAffiliate: { terms: { field: 'affiliateId', size: 20 } },
            byStatus: { terms: { field: 'status', size: 20 } },
          },
        });
        const aggs = res.aggregations || {};
        const buckets = (key) =>
          (aggs[key]?.buckets || []).map((b) => ({
            key: b.key_as_string ?? b.key,
            count: b.doc_count,
          }));
        const funnel = await funnelCompareFromDb(params, interval, timeZone);
        return {
          enabled: true,
          interval,
          timeSeries: buckets('timeSeries'),
          byEventType: buckets('byEventType'),
          byVendor: buckets('byVendor'),
          byAffiliate: buckets('byAffiliate'),
          byStatus: buckets('byStatus'),
          timeSeriesByEvent: funnel.timeSeriesByEvent,
          funnelTotals: funnel.funnelTotals,
          compareEvents: funnel.compareEvents,
          otpStats: await otpStatsFromDb(params),
        };
      } catch (err) {
        esClient.setConnectionFailed(true);
        console.warn(
          `Elasticsearch aggregations failed, falling back to SQL database: ${err.message}`,
        );
      }
    }

    return aggregationsFromDb(params, interval, timeZone);
  };

  return {
    isEnabled,
    init,
    indexEvent,
    search,
    aggregations,
    exportLogs,
  };
};

export const searchService = createSearchService();
