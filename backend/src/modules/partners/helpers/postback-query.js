/**
 * Central Facade for Postback Querying and Reporting.
 *
 * Modularized into:
 *   - queries/postback-scope.js       -> User scope, auth check, DTO serializer
 *   - queries/postback-summary.query.js -> Postback KPI summary & aggregation
 *   - queries/postback-list.query.js    -> Paginated postback listing with filters
 *   - queries/postback-detail.query.js  -> Single postback detail & related logs
 *   - queries/postback-day-report.query.js -> MSISDN day report & hit timeline
 */
import { createPostbackScope } from '../queries/postback-scope.js';
import { createPostbackSummaryQuery } from '../queries/postback-summary.query.js';
import { createPostbackListQuery } from '../queries/postback-list.query.js';
import { createPostbackDetailQuery } from '../queries/postback-detail.query.js';
import { createPostbackDayReportQuery } from '../queries/postback-day-report.query.js';

export function createPostbackQuery(deps) {
  const scope = createPostbackScope(deps);
  const summaryQuery = createPostbackSummaryQuery(deps, scope);
  const listQuery = createPostbackListQuery(deps, scope);
  const detailQuery = createPostbackDetailQuery(deps, scope);
  const dayReportQuery = createPostbackDayReportQuery(deps, scope);

  return {
    getSummary: summaryQuery.getSummary,
    listPostbacks: listQuery.listPostbacks,
    getPostbackById: detailQuery.getPostbackById,
    getDayReport: dayReportQuery.getDayReport,
  };
}
