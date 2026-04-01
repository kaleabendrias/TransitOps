import { config } from '@config/index';

export type HoldSyncMessage =
  | { type: 'hold_placed'; holdId: string; seatMapEntryId: string; userId: string; expiresAt: number }
  | { type: 'hold_released'; holdId: string; seatMapEntryId: string }
  | { type: 'hold_expired'; holdId: string; seatMapEntryId: string }
  | { type: 'hold_confirmed'; holdId: string; seatMapEntryId: string }
  | { type: 'holds_refresh' };

type HoldSyncListener = (msg: HoldSyncMessage) => void;

const CHANNEL_NAME = `${config.storage.localStoragePrefix}hold_sync`;
const LS_SYNC_KEY = `${config.storage.localStoragePrefix}hold_sync_event`;

class HoldSyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<HoldSyncListener> = new Set();

  constructor() {
    this.initBroadcastChannel();
    this.initStorageFallback();
  }

  private initBroadcastChannel(): void {
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<HoldSyncMessage>) => {
        this.notifyListeners(event.data);
      };
    } catch {
      // BroadcastChannel not available, storage fallback will handle it
    }
  }

  private initStorageFallback(): void {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.key !== LS_SYNC_KEY || !event.newValue) return;
      try {
        const msg = JSON.parse(event.newValue) as HoldSyncMessage;
        this.notifyListeners(msg);
      } catch {
        // Ignore malformed events
      }
    });
  }

  broadcast(msg: HoldSyncMessage): void {
    // BroadcastChannel sends to other tabs
    if (this.channel) {
      this.channel.postMessage(msg);
    }
    // Storage event also fires in other tabs (redundant but ensures delivery)
    try {
      localStorage.setItem(LS_SYNC_KEY, JSON.stringify({ ...msg, _ts: Date.now() }));
    } catch {
      // localStorage full or unavailable
    }
  }

  subscribe(listener: HoldSyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(msg: HoldSyncMessage): void {
    for (const listener of this.listeners) {
      listener(msg);
    }
  }

  destroy(): void {
    this.channel?.close();
    this.listeners.clear();
  }
}

export const holdSyncBus = new HoldSyncBus();
