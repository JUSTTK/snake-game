import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { gameAPI } from './api';

// Minimal fake WebSocket capturing handler assignments so tests can drive them.
type Handler = ((ev: unknown) => void) | null;
interface FakeWS {
  url: string;
  onopen: Handler;
  onmessage: Handler;
  onerror: Handler;
  onclose: Handler;
  readyState: number;
  close: (code?: number, reason?: string) => void;
  send: (data: string) => void;
}

describe('GameAPI WebSocket lifecycle (T0-H)', () => {
  let instances: FakeWS[] = [];
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    instances = [];
    originalWebSocket = (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket;
    const MockWebSocket = vi.fn().mockImplementation((url: string) => {
      const ws: FakeWS = {
        url,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        readyState: 1, // OPEN
        close: vi.fn(() => {
          ws.readyState = 3; // CLOSED
        }),
        send: vi.fn(),
      };
      instances.push(ws);
      return ws;
    });
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
      MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    gameAPI.disconnect();
    (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = originalWebSocket;
  });

  const openSocket = (ws: FakeWS) => ws.onopen?.({} as Event);

  it('closes the previous socket when connect is called again', async () => {
    const p1 = gameAPI.connect('room', 'p1', 'Player');
    openSocket(instances[0]);
    await p1;

    const p2 = gameAPI.connect('room', 'p1', 'Player');
    expect(instances[0].close).toHaveBeenCalled();
    openSocket(instances[1]);
    await p2;
  });

  it('drops async Blob messages that resolve after disconnect', async () => {
    const spy = vi.fn();
    gameAPI.onGameState(spy);

    const p = gameAPI.connect('room', 'p1', 'Player');
    const ws = instances[0];
    openSocket(ws);
    await p;

    // Fake FileReader so we control when the Blob onload resolves.
    const fakeReader: { onload: Handler; readAsText: (d: unknown) => void } = {
      onload: null,
      readAsText: vi.fn(),
    };
    const OriginalFileReader = (globalThis as unknown as { FileReader: unknown }).FileReader;
    (globalThis as unknown as { FileReader: unknown }).FileReader = vi.fn(() => fakeReader);

    // Inbound Blob message starts an async read (onload not yet fired).
    ws.onmessage?.({ data: new Blob([JSON.stringify({ type: 'GAME_STATE', data: {} })]) } as MessageEvent);

    // Disconnect before the async read completes.
    gameAPI.disconnect();

    // Simulate the delayed read resolving after disconnect.
    fakeReader.onload?.({ target: { result: JSON.stringify({ type: 'GAME_STATE', data: {} }) } } as ProgressEvent<FileReader>);

    (globalThis as unknown as { FileReader: unknown }).FileReader = OriginalFileReader;
    expect(spy).not.toHaveBeenCalled();
  });
});
