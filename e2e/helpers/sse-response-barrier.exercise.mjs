import assert from 'node:assert/strict';

import { SseResponseBarrier } from './sse-response-barrier.ts';

function fakeRoute(id) {
  return {
    request: () => ({ postDataJSON: () => ({ id }) }),
    fulfilled: null,
    aborted: false,
    fulfill: async function (response) {
      this.fulfilled = response;
    },
    abort: async function () {
      this.aborted = true;
    },
  };
}

const barrier = new SseResponseBarrier();
const expected = barrier.expectRequest();
const waitForExpected = barrier.waitForRequest(expected).then(
  () => new Error('Expected request wait to fail after an extra request.'),
  (error) => error,
);

const expectedRoute = fakeRoute('expected');
const expectedHandler = barrier.handle(expectedRoute);
const extraRoute = fakeRoute('extra');
await barrier.handle(extraRoute);

const waitError = await waitForExpected;
assert.match(waitError.message, /Unexpected extra SSE request 1/u);
assert.equal(extraRoute.aborted, true);

barrier.release(expected, 'expected candidate');
await expectedHandler;
assert.throws(() => barrier.assertComplete(), /Unexpected extra SSE request 1/u);
await barrier.close();

const cleanupBarrier = new SseResponseBarrier();
const cleanupTicket = cleanupBarrier.expectRequest();
const pendingRoute = fakeRoute('pending');
const pendingHandler = cleanupBarrier.handle(pendingRoute);
await cleanupBarrier.waitForRequest(cleanupTicket);
await cleanupBarrier.close();
await pendingHandler;
assert.equal(pendingRoute.aborted, true);

console.log('SSE response barrier exercise: PASS (prompt extra-request failure and pending-route cleanup)');
