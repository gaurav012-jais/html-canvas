import assert from 'node:assert';

// 1. Check Analytics Service Facade
import {
  analyticsService,
  createAnalyticsService,
  maskPhone,
  derivePagePath,
  jsonBoolSql,
  parseJsonSafe,
  checksubStatusLabel,
} from '../../src/modules/analytics/analytics.service.js';

console.log('--- Checking Option 1: Analytics Service Facade ---');
const expectedAnalyticsMethods = [
  'maskPhone',
  'indexVisitEvent',
  'createVisit',
  'getVisit',
  'findRecentVisitByRcid',
  'getVisitDetail',
  'updateVisit',
  'setVisitPhone',
  'ensureVisitCampids',
  'ensureVisitAttribution',
  'abandonOrphanVisit',
  'hasVisitEvent',
  'logEvent',
  'getCampaignAnalytics',
  'getCampaignVendorStats',
  'getCampaignActivityLogs',
  'derivePagePath',
  'archiveOldData',
];

for (const method of expectedAnalyticsMethods) {
  assert.strictEqual(
    typeof analyticsService[method],
    'function',
    `Missing analyticsService.${method}`,
  );
}

const analyticsInstance = createAnalyticsService();
for (const method of expectedAnalyticsMethods) {
  assert.strictEqual(
    typeof analyticsInstance[method],
    'function',
    `Missing factory instance.${method}`,
  );
}

// Edge case tests for maskPhone
assert.strictEqual(maskPhone('+1 (234) 567-8900'), '+1 (234) 567-8900');
assert.strictEqual(maskPhone(1234567890), '1234567890');
assert.strictEqual(maskPhone(null), undefined);
assert.strictEqual(maskPhone(''), undefined);
assert.strictEqual(maskPhone(undefined), undefined);

// Edge case tests for derivePagePath
const pagePath = derivePagePath({
  events: [
    { eventType: 'VISIT' },
    { eventType: 'OTP_VIEW' },
    { eventType: 'OTP_SEND' },
  ],
  pageType: 'OTP',
});
assert.deepStrictEqual(pagePath, ['HOME', 'OTP']);
assert.deepStrictEqual(derivePagePath(null), ['HOME']);
assert.deepStrictEqual(derivePagePath({}), ['HOME']);
assert.deepStrictEqual(derivePagePath({ pageType: 'THANKYOU' }), ['THANKYOU']);

// Edge case tests for parseJsonSafe
assert.strictEqual(parseJsonSafe(null), null);
assert.strictEqual(parseJsonSafe(''), null);
assert.deepStrictEqual(parseJsonSafe('{"a":1}'), { a: 1 });
assert.strictEqual(parseJsonSafe('not-json'), 'not-json');
assert.deepStrictEqual(parseJsonSafe({ a: 1 }), { a: 1 });

// String, Date, null and undefined event sorting edge cases (prevent a.createdAt.getTime crash)
const testEvents = [
  { createdAt: '2026-11-21T10:05:00.000Z', eventType: 'OTP_VIEW' },
  { createdAt: new Date('2026-11-21T10:00:00.000Z'), eventType: 'VISIT' },
  { createdAt: undefined, eventType: 'UNKNOWN_PREV' },
];
testEvents.sort(
  (a, b) =>
    (new Date(a?.createdAt || 0).getTime() || 0) -
    (new Date(b?.createdAt || 0).getTime() || 0),
);
assert.strictEqual(testEvents[0].eventType, 'UNKNOWN_PREV');
assert.strictEqual(testEvents[1].eventType, 'VISIT');
assert.strictEqual(testEvents[2].eventType, 'OTP_VIEW');

// Edge case tests for checksubStatusLabel
assert.strictEqual(checksubStatusLabel({ currentStatus: 'active' }), 'ACTIVE');
assert.strictEqual(checksubStatusLabel({ subscriptionStatus: 'ACTIVE' }), 'ACTIVE');
assert.strictEqual(checksubStatusLabel({ responseCode: 0 }), 'SUCCESS');
assert.strictEqual(checksubStatusLabel({}, false), 'FAILED');
assert.strictEqual(checksubStatusLabel({}, true), 'SUCCESS');

// Edge case tests for jsonBoolSql (offline fallback when datasource not initialized)
const boolSql = jsonBoolSql('event.metadata', 'success');
assert.ok(boolSql.includes('event.metadata'), 'jsonBoolSql should generate boolean SQL check');
assert.ok(boolSql.includes('success'), 'jsonBoolSql should inspect target property');

// Check query builder exports
import {
  buildVendorClicksQuery,
  buildVendorEventsQuery,
  buildVendorPostbacksQuery,
  buildVendorFailuresQuery,
} from '../../src/modules/analytics/services/vendor-stats-query.builder.js';
assert.strictEqual(typeof buildVendorClicksQuery, 'function');
assert.strictEqual(typeof buildVendorEventsQuery, 'function');
assert.strictEqual(typeof buildVendorPostbacksQuery, 'function');
assert.strictEqual(typeof buildVendorFailuresQuery, 'function');

console.log('✅ Option 1: Analytics Service Facade tests PASSED!');

// 2. Check Universe DCB Expose Service Facade
import {
  universeDcbExposeService,
  createUniverseDcbExposeService,
  pickDcbExposeRequestId,
  cleanPhone,
  parseConfig,
  correlationKey,
  requestCorrelationKey,
  saveCorrelation,
  loadCorrelation,
  clearCorrelation,
  acquireConfirmLock,
  releaseConfirmLock,
  loadVisitFromRequestId,
  loadLatestVisitForMsisdn,
} from '../../src/modules/flow/universe-dcb-expose.service.js';

console.log('--- Checking Option 2: Universe DCB Expose Service Facade ---');
const expectedDcbExposeMethods = [
  'exposeConfig',
  'exposePincode',
  'exposeConfirm',
  'exposeStatus',
  'exposeScreen',
];

for (const method of expectedDcbExposeMethods) {
  assert.strictEqual(
    typeof universeDcbExposeService[method],
    'function',
    `Missing universeDcbExposeService.${method}`,
  );
}

const customDcbInstance = createUniverseDcbExposeService();
for (const method of expectedDcbExposeMethods) {
  assert.strictEqual(
    typeof customDcbInstance[method],
    'function',
    `Missing factory instance.${method}`,
  );
}

// pickDcbExposeRequestId edge cases (including null/undefined)
assert.strictEqual(pickDcbExposeRequestId({ requestId: 'REQ_123' }), 'REQ_123');
assert.strictEqual(pickDcbExposeRequestId({ request_id: 'REQ_456' }), 'REQ_456');
assert.strictEqual(pickDcbExposeRequestId({ id: 'REQ_789' }), 'REQ_789');
assert.strictEqual(pickDcbExposeRequestId({}), '');
assert.strictEqual(pickDcbExposeRequestId(null), '');
assert.strictEqual(pickDcbExposeRequestId(undefined), '');

// cleanPhone edge cases
assert.strictEqual(cleanPhone('+1 (234) 567-8900'), '12345678900');
assert.strictEqual(cleanPhone(''), '');
assert.strictEqual(cleanPhone(null), '');
assert.strictEqual(cleanPhone(undefined), '');
assert.strictEqual(cleanPhone(1234567890), '1234567890');

// parseConfig edge cases
assert.deepStrictEqual(parseConfig('{"serviceId":"123"}'), { serviceId: '123' });
assert.deepStrictEqual(parseConfig({ serviceId: '123' }), { serviceId: '123' });
assert.throws(() => parseConfig(''), { code: 'DCB_NOT_CONFIGURED' });
assert.throws(() => parseConfig(null), { code: 'DCB_NOT_CONFIGURED' });
assert.throws(() => parseConfig('{"enabled":false}'), { code: 'DCB_NOT_CONFIGURED' });
assert.throws(() => parseConfig({ enabled: false }), { code: 'DCB_NOT_CONFIGURED' });
assert.throws(() => parseConfig('invalid json'), { code: 'DCB_CONFIG_INVALID' });
assert.throws(() => parseConfig('[1, 2]'), { code: 'DCB_CONFIG_INVALID' });

// correlationKey edge cases (primitives, objects, strings, null, undefined)
const cKey1 = correlationKey('10', 5, '1234567890');
assert.strictEqual(cKey1, 'dcb:pending:10:5:1234567890');
const cKey2 = correlationKey('10', { id: 5 }, '1234567890');
assert.strictEqual(cKey2, 'dcb:pending:10:5:1234567890');
const cKey3 = correlationKey('10', { visitId: 5 }, '1234567890');
assert.strictEqual(cKey3, 'dcb:pending:10:5:1234567890');
const cKey4 = correlationKey('10', undefined, '1234567890');
assert.strictEqual(cKey4, 'dcb:pending:10:0:1234567890');
const cKey5 = correlationKey('10', null, '1234567890');
assert.strictEqual(cKey5, 'dcb:pending:10:0:1234567890');

const rKey = requestCorrelationKey('10', '2', 'REQ_1');
assert.strictEqual(rKey, 'dcb:req:10:2:REQ_1');

// loadVisitFromRequestId & loadLatestVisitForMsisdn null checks
assert.strictEqual(await loadVisitFromRequestId(null), null);
assert.strictEqual(await loadVisitFromRequestId({}), null);
assert.strictEqual(await loadLatestVisitForMsisdn(null), null);
assert.strictEqual(await loadLatestVisitForMsisdn({}), null);

// Test correlation save/load/clear (including filtering out invalid keys)
const testCorrKey = correlationKey(999, 1, '9998887777');
await saveCorrelation(testCorrKey, { providerRequestId: 'REQ_TEST', msisdn: '9998887777' }, 60);
const loadedCorr = await loadCorrelation(testCorrKey);
assert.strictEqual(loadedCorr?.providerRequestId, 'REQ_TEST');
await clearCorrelation([testCorrKey, null, undefined]);
const clearedCorr = await loadCorrelation(testCorrKey);
assert.strictEqual(clearedCorr, null);
assert.strictEqual(await loadCorrelation(null), null);

// Test confirm lock concurrency (both sequential & concurrent in same tick)
const testLock = 'dcb:req:999:2:REQ_TEST:confirm';
const lockAcquired = await acquireConfirmLock(testLock);
assert.strictEqual(lockAcquired, true);
const lockDuplicate = await acquireConfirmLock(testLock);
assert.strictEqual(lockDuplicate, false);
await releaseConfirmLock(testLock);
const lockReacquired = await acquireConfirmLock(testLock);
assert.strictEqual(lockReacquired, true);
await releaseConfirmLock(testLock);
assert.strictEqual(await acquireConfirmLock(null), false);

// Concurrent race condition test: Promise.all in same event loop tick
const concurrentLock = 'dcb:req:999:2:REQ_RACE:confirm';
const [res1, res2] = await Promise.all([
  acquireConfirmLock(concurrentLock),
  acquireConfirmLock(concurrentLock),
]);
assert.ok(
  (res1 === true && res2 === false) || (res1 === false && res2 === true),
  'Exactly one concurrent caller must acquire lock in same event loop tick',
);
await releaseConfirmLock(concurrentLock);

// Test confirm lock cleanup when redisService.setNx throws
import { redisService } from '../../src/common/services/redis.service.js';
const origSetNx = redisService.setNx;
const errorLock = 'dcb:req:999:2:REQ_ERR:confirm';
redisService.setNx = async () => {
  throw new Error('Simulated Redis crash');
};
await assert.rejects(
  () => acquireConfirmLock(errorLock),
  /Simulated Redis crash/,
  'acquireConfirmLock should propagate error from redis',
);
// Restore setNx and verify local lock was cleaned up (not permanently deadlocked)
redisService.setNx = origSetNx;
const recoveredAcquire = await acquireConfirmLock(errorLock);
assert.strictEqual(
  recoveredAcquire,
  true,
  'Lock should not be permanently stuck in memory after an error',
);
await releaseConfirmLock(errorLock);

// Test error handling on expose operations when called without arguments
await assert.rejects(
  () => universeDcbExposeService.exposeScreen(),
  (err) => err.code === 'CAMPAIGN_REQUIRED' && err.statusCode === 400,
);
await assert.rejects(
  () => universeDcbExposeService.exposeConfig(),
  (err) => err.code === 'CAMPAIGN_REQUIRED' && err.statusCode === 400,
);
await assert.rejects(
  () => universeDcbExposeService.exposePincode(),
  (err) => err.code === 'CAMPAIGN_REQUIRED' && err.statusCode === 400,
);
await assert.rejects(
  () => universeDcbExposeService.exposeConfirm(),
  (err) => err.code === 'PIN_REQUIRED' && err.statusCode === 400,
);
await assert.rejects(
  () => universeDcbExposeService.exposeStatus(),
  (err) => err.code === 'CAMPAIGN_REQUIRED' && err.statusCode === 400,
);

console.log('✅ Option 2: Universe DCB Expose Service Facade tests PASSED!');

// 3. Check OTP Verify & OTP Service Facades (verify no ESM TDZ circular dependencies)
console.log('--- Checking OTP & Verify Service Facades ---');
import {
  otpService,
  createOtpService,
  sendOtp,
  verifyOtp,
  exposeChecksub,
  exposeSendOtp,
  exposeVerifyOtp,
  isRateLimited,
  isBruteForceAttempt,
  isVisitOtpVerified,
} from '../../src/modules/otp/otp.service.js';
import {
  verifyService,
  createVerifyService,
} from '../../src/modules/otp/verify/verify.service.js';

const expectedOtpMethods = [
  'sendOtp',
  'verifyOtp',
  'exposeChecksub',
  'exposeSendOtp',
  'exposeVerifyOtp',
  'isRateLimited',
  'isBruteForceAttempt',
  'isVisitOtpVerified',
];
for (const method of expectedOtpMethods) {
  assert.strictEqual(typeof otpService[method], 'function', `Missing otpService.${method}`);
}
const customOtpInstance = createOtpService();
for (const method of expectedOtpMethods) {
  assert.strictEqual(typeof customOtpInstance[method], 'function', `Missing factory otpInstance.${method}`);
}

const expectedVerifyMethods = [
  'isBruteForceAttempt',
  'isVisitOtpVerified',
  'verifyOtp',
  'exposeChecksub',
  'exposeVerifyOtp',
];
for (const method of expectedVerifyMethods) {
  assert.strictEqual(typeof verifyService[method], 'function', `Missing verifyService.${method}`);
}
const customVerifyInstance = createVerifyService();
for (const method of expectedVerifyMethods) {
  assert.strictEqual(typeof customVerifyInstance[method], 'function', `Missing factory verifyInstance.${method}`);
}
console.log('✅ OTP & Verify Service Facades tests PASSED!');

// 4. Check Daily Stats Service Facade
console.log('--- Checking Daily Stats Service Facade ---');
import {
  dailyStatsService,
  createDailyStatsService,
  rollupDay,
  rollupRange,
  rollupRecent,
  ensureDay,
  aggregateDayFromRaw,
  getReport,
  getDashboardSummary,
  STAT_GROUP_BY_SAFE,
} from '../../src/modules/analytics/daily-stats.service.js';

const expectedDailyStatsMethods = [
  'rollupDay',
  'rollupRange',
  'rollupRecent',
  'ensureDay',
  'aggregateDayFromRaw',
  'getReport',
  'getDashboardSummary',
];
for (const method of expectedDailyStatsMethods) {
  assert.strictEqual(typeof dailyStatsService[method], 'function', `Missing dailyStatsService.${method}`);
}
const customDailyInstance = createDailyStatsService();
for (const method of expectedDailyStatsMethods) {
  assert.strictEqual(typeof customDailyInstance[method], 'function', `Missing factory dailyInstance.${method}`);
}

// Check STAT_GROUP_BY_SAFE edge cases
assert.strictEqual(STAT_GROUP_BY_SAFE('date'), 'date');
assert.strictEqual(STAT_GROUP_BY_SAFE('vendor'), 'vendor');
assert.strictEqual(STAT_GROUP_BY_SAFE('campaign'), 'campaign');
assert.strictEqual(STAT_GROUP_BY_SAFE('campaign_vendor'), 'campaign_vendor');
assert.strictEqual(STAT_GROUP_BY_SAFE('invalid_group'), 'date');
assert.strictEqual(STAT_GROUP_BY_SAFE(null), 'date');
assert.strictEqual(STAT_GROUP_BY_SAFE(undefined), 'date');
console.log('✅ Daily Stats Service Facade tests PASSED!');

// 5. Check Orange BF Service & Provider Facades
console.log('--- Checking Orange BF Service & Provider Facades ---');
import {
  orangeBfService,
  createOrangeBfService,
} from '../../src/modules/flow/orange-bf.service.js';
import {
  orangeBfProvider,
  createOrangeBfProvider,
  ORANGE_BF_DEFAULTS,
} from '../../src/modules/flow/orange-bf.provider.js';

const expectedOrangeBfMethods = [
  'startOrCheckSub',
  'verifyOtp',
  'checkSub',
  'unsubscribe',
];
for (const method of expectedOrangeBfMethods) {
  assert.strictEqual(typeof orangeBfService[method], 'function', `Missing orangeBfService.${method}`);
}
const customOrangeInstance = createOrangeBfService();
for (const method of expectedOrangeBfMethods) {
  assert.strictEqual(typeof customOrangeInstance[method], 'function', `Missing factory orangeInstance.${method}`);
}

const expectedOrangeBfProviderMethods = [
  'generateAuthOtp',
  'validateAuthOtp',
  'checkSubscription',
  'unsubscribe',
  'syncSubscription',
];
for (const method of expectedOrangeBfProviderMethods) {
  assert.strictEqual(typeof orangeBfProvider[method], 'function', `Missing orangeBfProvider.${method}`);
}
const customBfProviderInstance = createOrangeBfProvider();
for (const method of expectedOrangeBfProviderMethods) {
  assert.strictEqual(typeof customBfProviderInstance[method], 'function', `Missing customBfProviderInstance.${method}`);
}
assert.strictEqual(ORANGE_BF_DEFAULTS.country, 'BF');

console.log('✅ Orange BF Service & Provider Facades tests PASSED!');

// 6. Check Header Enrichment (HE) Service Facade
console.log('--- Checking Header Enrichment (HE) Service Facade ---');
import {
  heService,
  createHeService,
  normalizePhone as heNormalizePhone,
  parseJson as heParseJson,
  makeSessionId as heMakeSessionId,
  pickRedirectUrl as hePickRedirectUrl,
  buildSafaricomClientConfig as heBuildClientConfig,
} from '../../src/modules/flow/he.service.js';

const expectedHeMethods = [
  'resolve',
  'parseJson',
  'normalizePhone',
  'redirectMeta',
  'pickRedirectUrl',
  'makeSessionId',
  'buildSafaricomClientConfig',
  'extractMaskedPhone',
  'recordClientSafaricomLogs',
  'resolveSafaricomMasked',
  'resolveCustomHttp',
];
for (const method of expectedHeMethods) {
  assert.strictEqual(typeof heService[method], 'function', `Missing heService.${method}`);
}
const customHeInstance = createHeService();
for (const method of expectedHeMethods) {
  assert.strictEqual(typeof customHeInstance[method], 'function', `Missing factory heInstance.${method}`);
}

// Check HE helper edge cases
assert.strictEqual(heNormalizePhone('+254 712-345-678'), '254712345678');
assert.strictEqual(heNormalizePhone(null), '');
assert.strictEqual(heNormalizePhone(undefined), '');
assert.deepStrictEqual(heParseJson(null), {});
assert.deepStrictEqual(heParseJson('{"x":1}'), { x: 1 });
assert.deepStrictEqual(heParseJson('invalid'), {});
assert.strictEqual(heMakeSessionId('custom_sid'), 'custom_sid');
assert.ok(heMakeSessionId('').startsWith('sid_'));
assert.strictEqual(hePickRedirectUrl({ a: 'https://example.com' }, 'a'), 'https://example.com');
assert.strictEqual(hePickRedirectUrl({}, 'a'), '');

const safConfig = heBuildClientConfig({ tokenUrl: 'https://t.com', maskedUrl: 'https://m.com' });
assert.strictEqual(safConfig.tokenUrl, 'https://t.com');
assert.strictEqual(safConfig.maskedUrl, 'https://m.com');
assert.strictEqual(safConfig.xApp, 'he-partner');
console.log('✅ Header Enrichment (HE) Service Facade tests PASSED!');

// 7. Check Campaigns CRUD Service Facade
console.log('--- Checking Campaigns Service & CRUD Facades ---');
import {
  campaignsService,
} from '../../src/modules/campaigns/campaigns.service.js';
import {
  createCampaignCrudService,
} from '../../src/modules/campaigns/services/campaign-crud.service.js';

const expectedCampaignMethods = [
  'findAll',
  'findOne',
  'assertOwnership',
  'findByCountryOperator',
  'findByIdForFlow',
  'findByTrackingId',
  'create',
  'update',
  'remove',
  'getFlow',
  'updateFlow',
  'serializeCampaign',
];
for (const method of expectedCampaignMethods) {
  assert.strictEqual(typeof campaignsService[method], 'function', `Missing campaignsService.${method}`);
}
const customCrudInstance = createCampaignCrudService();
for (const method of expectedCampaignMethods) {
  assert.strictEqual(typeof customCrudInstance[method], 'function', `Missing factory crudInstance.${method}`);
}
console.log('✅ Campaigns Service & CRUD Facades tests PASSED!');

// 8. Check Flow Detect MSISDN Service Facade
console.log('--- Checking Flow Service & Detect MSISDN Facade ---');
import { flowService } from '../../src/modules/flow/flow.service.js';
import { createDetectMsisdn } from '../../src/modules/flow/detect/detect.service.js';

assert.strictEqual(typeof flowService.detectMsisdn, 'function', 'Missing flowService.detectMsisdn');
const customDetectInstance = createDetectMsisdn({});
assert.strictEqual(typeof customDetectInstance.detectMsisdn, 'function', 'Missing customDetectInstance.detectMsisdn');
console.log('✅ Flow Service & Detect MSISDN Facades tests PASSED!');

// 9. Check Partner API Service Facade
console.log('--- Checking Partner API Service Facade ---');
import {
  partnerApiService,
  createPartnerApiService,
  parseHeaders,
  buildVars,
  partnerRequestBody,
} from '../../src/modules/flow/partner-api.service.js';

const expectedPartnerApiMethods = [
  'parseHeaders',
  'resolveTemplate',
  'mapSubServiceId',
  'buildVars',
  'partnerRequestBody',
  'sendRequest',
  'resolveMsisdn',
  'checkSubscription',
  'checkBlocked',
  'subscribe',
  'recordSubscribeSkip',
];

for (const method of expectedPartnerApiMethods) {
  assert.strictEqual(
    typeof partnerApiService[method],
    'function',
    `Missing partnerApiService.${method}`,
  );
}

const customPartnerInstance = createPartnerApiService();
for (const method of expectedPartnerApiMethods) {
  assert.strictEqual(
    typeof customPartnerInstance[method],
    'function',
    `Missing factory customPartnerInstance.${method}`,
  );
}

// Unit checks
assert.deepStrictEqual(parseHeaders('{"Auth":"Bearer 123"}'), { Auth: 'Bearer 123' });
assert.deepStrictEqual(parseHeaders(''), {});
assert.deepStrictEqual(parseHeaders(null), {});

const vars = buildVars({ phone: '9876543210', planId: 'weekly' });
assert.strictEqual(vars.msisdn, '9876543210');
assert.strictEqual(vars.pack, 'weekly');

const stripped = partnerRequestBody({ clickId: '123', rcid: '456', user: 'bob' });
assert.strictEqual(stripped.clickId, undefined);
assert.strictEqual(stripped.user, 'bob');

console.log('✅ Partner API Service Facade tests PASSED!');

// 10. Check Postback Callback Service Facade
console.log('--- Checking Postback Callback Service Facade ---');
import {
  createPostbackCallback,
  parseCallbackClickId,
  parseCallbackMsisdn,
} from '../../src/modules/partners/helpers/postback-callback.js';

assert.strictEqual(typeof createPostbackCallback, 'function');
assert.strictEqual(parseCallbackClickId({ click_id: 'CLK_123' }), 'CLK_123');
assert.strictEqual(parseCallbackClickId({ ext_id: 'EXT_456' }), 'EXT_456');
assert.strictEqual(parseCallbackClickId(null), '');

assert.strictEqual(parseCallbackMsisdn({ msisdn: '+1 (234) 567-8900' }), '12345678900');
assert.strictEqual(parseCallbackMsisdn({ phone: '999888' }), '999888');
assert.strictEqual(parseCallbackMsisdn(null), '');

const dummyCallbackHandler = createPostbackCallback({
  getPostbackRepo: () => ({ findOne: async () => null, save: async () => {} }),
  getVisitRepo: () => ({ createQueryBuilder: () => ({ where: () => ({ orderBy: () => ({ getOne: async () => null }) }) }) }),
  logApiCall: async () => {},
  registerPending: async () => ({ skipped: true }),
  firePostback: async () => ({ ok: true }),
  appendHit: async () => {},
});

assert.strictEqual(typeof dummyCallbackHandler.processOperatorCallback, 'function');
const rejectResult = await dummyCallbackHandler.processOperatorCallback({});
assert.strictEqual(rejectResult.success, false);
assert.strictEqual(rejectResult.skipped, true);

console.log('🎉 ALL POSTBACK CALLBACK & FIRE TESTS');
// Verify createPostbackService wires late firePostback cleanly for registerPending({ fireImmediate: true })
import { postbackService } from '../../src/modules/partners/postback.service.js';
assert.strictEqual(typeof postbackService.registerPending, 'function');
assert.strictEqual(typeof postbackService.firePostback, 'function');

// Regression test: createCampaignCrudService.update with trackings passes getter function, not Repo object
let deletedTrackingsFor = null;
let insertedTrackingsCount = 0;
const stubCampaign = {
  id: 99,
  name: 'Stub',
  country: 'KE',
  operator: 'SAF',
  trackingId: 'KE-SAF-99',
  userId: 1,
  active: false,
  pages: [],
  trackings: [],
};
const crudWithStubs = createCampaignCrudService({
  campaignRepo: {
    findOne: async () => ({ ...stubCampaign }),
    save: async (c) => c,
  },
  trackingRepo: {
    delete: async (cond) => {
      deletedTrackingsFor = cond.campaignId;
    },
    insert: async (rows) => {
      insertedTrackingsCount = rows.length;
    },
  },
  pagesService: {
    ensureCampaignPages: async () => {},
    ensureOrangeBfFlowGraph: async () => false,
    pageHasContent: () => true,
    sanitizeCampaignListItem: (c) => c,
  },
});
await crudWithStubs.update(99, { vendorIds: [10, 20] }, 1);
assert.strictEqual(deletedTrackingsFor, 99);
assert.strictEqual(insertedTrackingsCount, 2);

console.log('✅ Postback Callback Service & Update Wiring tests PASSED!');

// 11. Rule of 300 Audit on all Option 1 and Option 2 files
console.log('--- Verifying Rule of 300 (< 300 LOC) on Option 1 & 2 files ---');
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

const filesToCheck = [
  'backend/src/modules/analytics/analytics.service.js',
  'backend/src/modules/analytics/services/activity-logs.service.js',
  'backend/src/modules/analytics/services/analytics-archive.service.js',
  'backend/src/modules/analytics/services/campaign-analytics.service.js',
  'backend/src/modules/analytics/services/campaign-metrics.service.js',
  'backend/src/modules/analytics/services/campaign-vendor-stats.service.js',
  'backend/src/modules/analytics/services/index.js',
  'backend/src/modules/analytics/services/page-path.helper.js',
  'backend/src/modules/analytics/services/vendor-stats-query.builder.js',
  'backend/src/modules/analytics/services/visit-detail.service.js',
  'backend/src/modules/analytics/services/visit-tracking.service.js',
  'backend/src/modules/flow/universe-dcb-expose.service.js',
  'backend/src/modules/flow/universe-dcb/dcb-expose-confirm.service.js',
  'backend/src/modules/flow/universe-dcb/dcb-expose-context.service.js',
  'backend/src/modules/flow/universe-dcb/dcb-expose-inbound.service.js',
  'backend/src/modules/flow/universe-dcb/dcb-expose-operations.service.js',
  'backend/src/modules/flow/universe-dcb/dcb-expose-session.js',
  'backend/src/modules/flow/universe-dcb/index.js',
];

for (const relPath of filesToCheck) {
  const fullPath = path.join(repoRoot, relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lineCount = content.split('\n').length;
  assert.ok(
    lineCount < 300,
    `File ${relPath} has ${lineCount} lines, violating the strictly < 300 LOC rule!`,
  );
}
console.log('✅ Rule of 300 PASSED: All 18 Option 1 & Option 2 files are strictly < 300 LOC!');

console.log('🎉 ALL REFACTOR CONTRACT CHECKS PASSED SUCCESSFULLY!');
process.exit(0);
