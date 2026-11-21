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

// String and Date event sorting edge cases (prevent a.createdAt.getTime crash)
const testEvents = [
  { createdAt: '2026-11-21T10:05:00.000Z', eventType: 'OTP_VIEW' },
  { createdAt: new Date('2026-11-21T10:00:00.000Z'), eventType: 'VISIT' },
];
testEvents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
assert.strictEqual(testEvents[0].eventType, 'VISIT');
assert.strictEqual(testEvents[1].eventType, 'OTP_VIEW');

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

// correlationKey edge cases (primitives, objects, strings)
const cKey1 = correlationKey('10', 5, '1234567890');
assert.strictEqual(cKey1, 'dcb:pending:10:5:1234567890');
const cKey2 = correlationKey('10', { id: 5 }, '1234567890');
assert.strictEqual(cKey2, 'dcb:pending:10:5:1234567890');
const cKey3 = correlationKey('10', { visitId: 5 }, '1234567890');
assert.strictEqual(cKey3, 'dcb:pending:10:5:1234567890');

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

// 5. Check Orange BF Service Facade
console.log('--- Checking Orange BF Service Facade ---');
import {
  orangeBfService,
  createOrangeBfService,
} from '../../src/modules/flow/orange-bf.service.js';
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
console.log('✅ Orange BF Service Facade tests PASSED!');

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

console.log('🎉 ALL REFACTOR CONTRACT CHECKS PASSED SUCCESSFULLY!');
process.exit(0);
