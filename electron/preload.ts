import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type ShortcutAction = 'mute' | 'hearOriginal' | 'nextProfile' | 'pushToTalk' | `profile${number}`;

export interface RunningApp {
  exe: string;
  running: boolean;
  usingMic: boolean; // Windows says this app is recording from a microphone right now
}

export interface LoginItemOptions {
  openAtLogin: boolean;
  openInTray: boolean;
}

export interface StudioBridgeAPI {
  isElectron: true;
  view: string;
  // Storage (SQLite in the user data folder)
  listProfiles: () => Promise<unknown[]>;
  saveProfile: (profile: unknown) => Promise<boolean>;
  deleteProfile: (id: string) => Promise<boolean>;
  getPrefs: () => Promise<unknown | null>;
  savePrefs: (prefs: unknown) => Promise<boolean>;
  // Window
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  showMainWindow: (tab?: string) => void;
  hideTrayPanel: () => void;
  setCloseToTray: (enabled: boolean) => void;
  setLoginItem: (opts: LoginItemOptions) => void;
  wasOpenedAtLogin: () => Promise<boolean>;
  // System
  openVBCableFolder: () => Promise<boolean>;
  openSoundSettings: () => Promise<boolean>;
  openMicPrivacySettings: () => Promise<boolean>;
  exportProfile: (json: string, suggestedName: string) => Promise<boolean>;
  importProfile: () => Promise<string | null>;
  installUpdateFromFile: () => Promise<boolean>;
  getRunningApps: (exes: string[]) => Promise<RunningApp[]>;
  getCpuPercent: () => Promise<number>;
  // Global shortcuts. Accelerators use Electron syntax ("Ctrl+Alt+M"); null clears one.
  setShortcuts: (map: Record<string, string | null>) => Promise<Record<string, boolean>>;
  onShortcut: (cb: (action: ShortcutAction, phase: 'down' | 'up') => void) => () => void;
  // Main window ⇄ tray panel / notification popups
  publishState: (state: unknown) => void;
  onState: (cb: (state: unknown) => void) => () => void;
  sendCommand: (cmd: unknown) => void;
  onCommand: (cb: (cmd: unknown) => void) => () => void;
  showNotification: (n: unknown) => void;
  onNotification: (cb: (n: unknown) => void) => () => void;
  setNotificationsVisible: (visible: boolean, height?: number) => void;
  getVersions: () => Promise<{ app: string; electron: string }>;
}

function listen<T extends unknown[]>(channel: string, cb: (...args: T) => void): () => void {
  const handler = (_e: IpcRendererEvent, ...args: unknown[]) => cb(...(args as T));
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const viewArg = process.argv.find((a) => a.startsWith('--aurel-view='));

const api: StudioBridgeAPI = {
  isElectron: true,
  view: viewArg ? viewArg.slice('--aurel-view='.length) : 'main',
  listProfiles: () => ipcRenderer.invoke('db:list-profiles'),
  saveProfile: (profile) => ipcRenderer.invoke('db:save-profile', profile),
  deleteProfile: (id) => ipcRenderer.invoke('db:delete-profile', id),
  getPrefs: () => ipcRenderer.invoke('db:get-prefs'),
  savePrefs: (prefs) => ipcRenderer.invoke('db:save-prefs', prefs),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  showMainWindow: (tab) => ipcRenderer.send('window:show-main', tab),
  hideTrayPanel: () => ipcRenderer.send('tray:hide'),
  setCloseToTray: (enabled) => ipcRenderer.send('app:close-to-tray', enabled),
  setLoginItem: (opts) => ipcRenderer.send('app:login-item', opts),
  wasOpenedAtLogin: () => ipcRenderer.invoke('app:opened-at-login'),
  openVBCableFolder: () => ipcRenderer.invoke('system:open-vbcable-folder'),
  openSoundSettings: () => ipcRenderer.invoke('system:open-sound-settings'),
  openMicPrivacySettings: () => ipcRenderer.invoke('system:open-mic-privacy'),
  exportProfile: (json, suggestedName) => ipcRenderer.invoke('profile:export', json, suggestedName),
  importProfile: () => ipcRenderer.invoke('profile:import'),
  installUpdateFromFile: () => ipcRenderer.invoke('app:install-update'),
  getRunningApps: (exes) => ipcRenderer.invoke('system:running-apps', exes),
  getCpuPercent: () => ipcRenderer.invoke('system:cpu'),
  setShortcuts: (map) => ipcRenderer.invoke('shortcuts:set', map),
  onShortcut: (cb) => listen('shortcuts:fired', cb),
  publishState: (state) => ipcRenderer.send('state:publish', state),
  onState: (cb) => listen('state:update', cb),
  sendCommand: (cmd) => ipcRenderer.send('command:send', cmd),
  onCommand: (cb) => listen('command:received', cb),
  showNotification: (n) => ipcRenderer.send('notify:show', n),
  onNotification: (cb) => listen('notify:push', cb),
  setNotificationsVisible: (visible, height) => ipcRenderer.send('notify:visible', visible, height),
  getVersions: () => ipcRenderer.invoke('app:versions'),
};

contextBridge.exposeInMainWorld('studioAPI', api);
