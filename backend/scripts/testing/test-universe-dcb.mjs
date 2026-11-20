import assert from 'node:assert';
import {
  parseConfig,
  cleanPhone,
  stripProviderRequestIds,
  correlationKey,
  saveCorrelation,
  loadCorrelation,
  clearCorrelation,
  createUniverseDcbService,
  universeDcbService,
} from '../../src/modules/flow/universe-dcb.service.js';
import { createDcbOperations } from '../../src/modules/flow/dcb/dcb-operations.service.js';
import {
  providerInput,
  callProviderWithLogging,
  readProviderPurchaseTypes,
} from '../../src/modules/flow/dcb/dcb-provider-caller.js';

console.log('--- Testing phone & config helpers ---');
assert.strictEqual(cleanPhone('+1 (234) 567-8900'), '12345678900');
assert.strictEqual(cleanPhone(null), '');
assert.strictEqual(cleanPhone(undefined), '');

// parseConfig tests
assert.deepStrictEqual(parseConfig('{"serviceId":"123"}'), { serviceId: '123' });
assert.throws(() => parseConfig(''), { code: 'DCB_NOT_CONFIGURED' });
assert.throws(() => parseConfig(null), { code: 'DCB_NOT_CONFIGURED' });
assert.throws(() => parseConfig('{"enabled":false}'), { code: 'DCB_NOT_CONFIGURED' });
assert.throws(() => parseConfig('invalid json'), { code: 'DCB_CONFIG_INVALID' });
assert.throws(() => parseConfig('[1, 2]'), { code: 'DCB_CONFIG_INVALID' });

// stripProviderRequestIds tests
const raw = {
  serviceId: '581',
  requestId: 'REQ123',
  request_id: 'REQ456',
  purchaseTypes: [
    { id: 1, RequestId: 'nested1', name: 'Pack 1' },
    { id: 2, request_id: 'nested2', name: 'Pack 2' },
  ],
};
const cleaned = stripProviderRequestIds(raw);
assert.strictEqual(cleaned.requestId, undefined);
assert.strictEqual(cleaned.request_id, undefined);
assert.strictEqual(cleaned.serviceId, '581');
assert.strictEqual(cleaned.purchaseTypes[0].RequestId, undefined);
assert.strictEqual(cleaned.purchaseTypes[0].name, 'Pack 1');
console.log('✅ stripProviderRequestIds and parseConfig passed');

// Test correlation
const key = correlationKey(10, { visitId: 99 }, '1234567890');
assert.strictEqual(key, 'dcb:pending:10:99:1234567890');

await saveCorrelation(key, 'REQ_999', '3', 60);
const loaded = await loadCorrelation(key);
assert.strictEqual(loaded.providerRequestId, 'REQ_999');
assert.strictEqual(loaded.purchaseTypeId, '3');
await clearCorrelation(key);
const cleared = await loadCorrelation(key);
assert.strictEqual(cleared, null);
console.log('✅ correlation save/load/clear passed');

// Test createDcbOperations without args
const ops = createDcbOperations();
assert.strictEqual(typeof ops.getPublicConfig, 'function');
assert.strictEqual(typeof ops.manualCheck, 'function');
assert.strictEqual(typeof ops.confirm, 'function');
assert.strictEqual(typeof ops.status, 'function');
assert.strictEqual(typeof ops.requestPincode, 'function');
assert.strictEqual(typeof ops.pinSinglePackIfEnabled, 'function');
assert.strictEqual(typeof ops.getRuntimeConfig, 'function');
console.log('✅ createDcbOperations() default factory passed');

// Test mock provider with readProviderPurchaseTypes
const mockProvider = {
  getPublicConfig: async () => ({
    data: {
      purchaseTypes: [
        { purchaseTypeId: '1', name: 'Daily', price: 5 },
        { purchaseTypeId: '2', name: 'Weekly', price: 20 },
      ],
    },
  }),
};
const ctxMock = {
  config: { responsePaths: { envelope: '' } },
  serviceId: '581',
  purchaseTypeId: '1',
  transactionChannel: 'Wifi',
};
const types = await readProviderPurchaseTypes(ctxMock, mockProvider);
assert.strictEqual(types.length, 2);
assert.strictEqual(types[0].purchaseTypeId, '1');
console.log('✅ readProviderPurchaseTypes with provider passed');

// Test callProviderWithLogging
let loggedRecord = null;
const mockLogger = {
  record: async (rec) => {
    loggedRecord = rec;
  },
};
const loggedResponse = await callProviderWithLogging({
  ctx: ctxMock,
  callType: 'DCB_CONFIG',
  action: 'config',
  execute: async () => ({ data: { ok: true } }),
  statusLabel: 'SUCCESS',
  callLogger: mockLogger,
});
assert.deepStrictEqual(loggedResponse, { data: { ok: true } });
assert.strictEqual(loggedRecord.callType, 'DCB_CONFIG');
const parsedBody = JSON.parse(loggedRecord.requestBody);
assert.strictEqual(parsedBody.action, 'config');
console.log('✅ callProviderWithLogging passed');

console.log('ALL DCB UNIT TESTS PASSED SUCCESSFULLY!');
