import 'fake-indexeddb/auto';

// Polyfill window for hold-sync.ts which uses window.addEventListener
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

// Polyfill BroadcastChannel
if (typeof globalThis.BroadcastChannel === 'undefined') {
  (globalThis as any).BroadcastChannel = class {
    onmessage: any = null;
    postMessage() {}
    close() {}
  };
}
import { beforeEach } from 'vitest';
import { resetDbInstance, setDbNameOverride } from '@adapters/indexeddb/db';

// Polyfill localStorage for Node
if (typeof globalThis.localStorage === 'undefined') {
  let store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

// Polyfill sessionStorage for Node
if (typeof globalThis.sessionStorage === 'undefined') {
  let store: Record<string, string> = {};
  globalThis.sessionStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

let testCounter = 0;

// Give each test a unique DB name to avoid upgrade conflicts in fake-indexeddb
beforeEach(() => {
  resetDbInstance();
  setDbNameOverride(`test-db-${++testCounter}-${Date.now()}`);
  localStorage.clear();
  sessionStorage.clear();
});
