import { AudioDeviceOption } from './types';

// Aurel v1 routes the enhanced voice through VB-Audio Virtual Cable:
// Aurel plays into the cable's playback side, and apps record from its other side.
export const CABLE_PLAYBACK_NAME = 'CABLE Input (VB-Audio Virtual Cable)';
export const CABLE_RECORDING_NAME = 'CABLE Output (VB-Audio Virtual Cable)';
export const CABLE_DOWNLOAD_URL = 'https://vb-audio.com/Cable/';

// Windows labels vary slightly between driver versions ("CABLE Input (VB-Audio Virtual Cable)",
// "CABLE In 16ch (VB-Audio Virtual Cable)"), so match on the stable parts.
export function isCablePlayback(label: string): boolean {
  return /cable\s*in/i.test(label) && /vb-audio/i.test(label);
}

// Chromium also lists "Default - …" and "Communications - …" aliases; prefer the real device.
export function findCablePlayback(outputs: AudioDeviceOption[]): AudioDeviceOption | undefined {
  const matches = outputs.filter((d) => isCablePlayback(d.label));
  return matches.find((d) => d.deviceId !== 'default' && d.deviceId !== 'communications') || matches[0];
}
