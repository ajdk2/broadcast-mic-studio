import { contextBridge, ipcRenderer } from 'electron';

export interface StudioBridgeAPI {
  getPresets: () => Promise<any[]>;
  savePreset: (preset: any) => Promise<boolean>;
  deletePreset: (id: string) => Promise<boolean>;
  getSetting: (key: string, defaultValue?: string) => Promise<string>;
  setSetting: (key: string, value: string) => Promise<boolean>;
  getAllSettings: () => Promise<Record<string, string>>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  openVBCableFolder: () => Promise<boolean>;
  isElectron: boolean;
}

const api: StudioBridgeAPI = {
  getPresets: () => ipcRenderer.invoke('db:get-presets'),
  savePreset: (preset: any) => ipcRenderer.invoke('db:save-preset', preset),
  deletePreset: (id: string) => ipcRenderer.invoke('db:delete-preset', id),
  getSetting: (key: string, defaultValue = '') => ipcRenderer.invoke('db:get-setting', key, defaultValue),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('db:set-setting', key, value),
  getAllSettings: () => ipcRenderer.invoke('db:get-all-settings'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  openVBCableFolder: () => ipcRenderer.invoke('system:open-vbcable-folder'),
  isElectron: true,
};

contextBridge.exposeInMainWorld('studioAPI', api);
