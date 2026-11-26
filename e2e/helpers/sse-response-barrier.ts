import type { Route } from '@playwright/test';

export interface SseRequestTicket {
  readonly index: number;
}

export interface ArrivedSseRequest {
  readonly index: number;
  readonly body: Record<string, unknown>;
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

interface RequestArrival {
  readonly arrived: boolean;
  readonly body: Record<string, unknown> | null;
}

interface RequestSlot {
  readonly ticket: SseRequestTicket;
  readonly arrival: Deferred<RequestArrival>;
  readonly response: Deferred<string | null>;
  arrived: boolean;
  responseReleased: boolean;
  fulfilled: boolean;
}

function deferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => {
    throw new Error('Deferred promise was not initialized.');
  };
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve(value) {
      resolvePromise(value);
    },
  };
}

function toSseBody(content: string): string {
  return [
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`,
    'data: [DONE]\n\n',
  ].join('');
}

async function abortRoute(route: Route): Promise<void> {
  try {
    await route.abort('failed');
  } catch {
    // The browser may already have cancelled the request while the test cleans up.
  }
}

/**
 * Controls each mocked SSE request independently so tests can observe GENERATING
 * before releasing that request's response. Register tickets before user actions.
 */
export class SseResponseBarrier {
  private readonly slots: RequestSlot[] = [];
  private readonly activeHandlers = new Set<Promise<void>>();
  private readonly problems: string[] = [];
  private nextRequestIndex = 0;
  private closed = false;

  readonly requestBodies: Array<Record<string, unknown>> = [];

  expectRequest(): SseRequestTicket {
    if (this.closed) throw new Error('Cannot register an SSE request after cleanup.');

    const ticket = Object.freeze({ index: this.slots.length });
    this.slots.push({
      ticket,
      arrival: deferred<RequestArrival>(),
      response: deferred<string | null>(),
      arrived: false,
      responseReleased: false,
      fulfilled: false,
    });
    return ticket;
  }

  async handle(route: Route): Promise<void> {
    const index = this.nextRequestIndex;
    this.nextRequestIndex += 1;

    if (this.closed) {
      this.problems.push(`Request ${index} arrived after the barrier was closed.`);
      await abortRoute(route);
      return;
    }

    const slot = this.slots[index];
    if (!slot) {
      this.problems.push(`Unexpected extra SSE request ${index}.`);
      await abortRoute(route);
      return;
    }

    const handler = this.handleRegisteredRoute(route, slot);
    this.activeHandlers.add(handler);
    try {
      await handler;
    } finally {
      this.activeHandlers.delete(handler);
    }
  }

  async waitForRequest(ticket: SseRequestTicket): Promise<ArrivedSseRequest> {
    const slot = this.getSlot(ticket);
    const arrival = await slot.arrival.promise;
    if (!arrival.arrived || !arrival.body) {
      throw new Error(`Expected SSE request ${ticket.index} did not arrive.`);
    }
    return { index: ticket.index, body: arrival.body };
  }

  release(ticket: SseRequestTicket, content: string): void {
    const slot = this.getSlot(ticket);
    if (this.closed) throw new Error('Cannot release an SSE response after cleanup.');
    if (!slot.arrived) {
      throw new Error(`SSE request ${ticket.index} must arrive before its response is released.`);
    }
    if (slot.responseReleased) {
      throw new Error(`SSE request ${ticket.index} response was already released.`);
    }

    slot.responseReleased = true;
    slot.response.resolve(content);
  }

  assertComplete(): void {
    const missing = this.slots
      .filter((slot) => !slot.arrived || !slot.responseReleased || !slot.fulfilled)
      .map((slot) => slot.ticket.index);
    const failures = [...this.problems];

    if (missing.length > 0) {
      failures.push(`Incomplete expected SSE request lifecycle(s): ${missing.join(', ')}.`);
    }
    if (failures.length > 0) {
      throw new Error(failures.join('\n'));
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    for (const slot of this.slots) {
      if (!slot.arrived) slot.arrival.resolve({ arrived: false, body: null });
      if (!slot.responseReleased) slot.response.resolve(null);
    }

    await Promise.all(this.activeHandlers);
  }

  private getSlot(ticket: SseRequestTicket): RequestSlot {
    const slot = this.slots[ticket.index];
    if (!slot || slot.ticket !== ticket) {
      throw new Error(`Unknown or foreign SSE request ticket ${ticket.index}.`);
    }
    return slot;
  }

  private async handleRegisteredRoute(route: Route, slot: RequestSlot): Promise<void> {
    let body: Record<string, unknown> | null = null;
    try {
      const parsed: unknown = route.request().postDataJSON();
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
        this.requestBodies.push(body);
      } else {
        this.problems.push(`SSE request ${slot.ticket.index} had a non-object JSON body.`);
      }
    } catch (error) {
      this.problems.push(
        `SSE request ${slot.ticket.index} body could not be read: ${String(error)}`,
      );
    }

    slot.arrived = true;
    slot.arrival.resolve({ arrived: true, body });

    const responseContent = await slot.response.promise;
    if (responseContent === null || this.closed) {
      await abortRoute(route);
      return;
    }

    try {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'cache-control': 'no-cache' },
        body: toSseBody(responseContent),
      });
      slot.fulfilled = true;
    } catch (error) {
      if (!this.closed) {
        this.problems.push(
          `SSE request ${slot.ticket.index} response could not be fulfilled: ${String(error)}`,
        );
      }
    }
  }
}
