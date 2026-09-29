import { StudioBridgeAPI } from '../electron/preload';

declare global {
  interface Window {
    studioAPI?: StudioBridgeAPI;
  }
}

declare module '*.css';

export {};
