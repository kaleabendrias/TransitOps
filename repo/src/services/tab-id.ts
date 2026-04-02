import { config } from '@config/index';

const TAB_ID_KEY = `${config.storage.localStoragePrefix}tab_id`;

function generateTabId(): string {
  return crypto.randomUUID();
}

let currentTabId: string | null = null;

export function getTabId(): string {
  if (!currentTabId) {
    currentTabId = generateTabId();
    sessionStorage.setItem(TAB_ID_KEY, currentTabId);
  }
  return currentTabId;
}
