// Aurel's own pop-up notifications (design board 27). In the Electron app they appear in a small
// always-on-top window at the bottom-right of the screen, so they show over a full-screen meeting;
// in a plain browser they appear inside the page.

export type Command =
  | { type: 'setLive'; patch: Record<string, unknown> }
  | { type: 'selectProfile'; id: string }
  | { type: 'useInput'; id: string }
  | { type: 'showMain'; tab?: string }
  | { type: 'setMonitor'; on: boolean }
  | { type: 'cycleNoise' }
  | { type: 'nextProfile' };

export interface NotificationAction {
  label: string;
  command: Command;
  primary?: boolean;
}

export interface AppNotification {
  id: string;
  kind: 'rule' | 'muted-talk' | 'unplugged' | 'clipping' | 'info';
  title: string;
  body: string;
  actions: NotificationAction[];
  hint?: string;
  at: number;
}

type Listener = (list: AppNotification[]) => void;
let items: AppNotification[] = [];
const listeners = new Set<Listener>();

export function notify(n: Omit<AppNotification, 'id' | 'at'>): void {
  const item: AppNotification = { ...n, id: Math.random().toString(36).slice(2), at: Date.now() };
  // One of each kind at a time; the newest replaces the old.
  items = [...items.filter((x) => x.kind !== n.kind), item].slice(-3);
  if (window.studioAPI && window.studioAPI.view === 'main') window.studioAPI.showNotification(item);
  else listeners.forEach((fn) => fn(items));
}

export function receive(item: AppNotification): void {
  items = [...items.filter((x) => x.kind !== item.kind), item].slice(-3);
  listeners.forEach((fn) => fn(items));
}

export function dismiss(id: string): void {
  items = items.filter((x) => x.id !== id);
  listeners.forEach((fn) => fn(items));
}

export function onNotifications(fn: Listener): () => void {
  listeners.add(fn);
  fn(items);
  return () => listeners.delete(fn);
}
