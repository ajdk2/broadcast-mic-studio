import { execFile } from 'child_process';
import os from 'os';
import { app } from 'electron';

export interface RunningApp {
  exe: string;
  running: boolean;
  usingMic: boolean;
}

function run(cmd: string, args: string[], timeout = 4000): Promise<string> {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, timeout, maxBuffer: 8 * 1024 * 1024 }, (err, stdout) => resolve(err ? '' : String(stdout)));
  });
}

// Store apps register microphone use under their package name instead of their exe.
const PACKAGES: Record<string, string> = { 'ms-teams.exe': 'MSTeams_', 'zoom.exe': 'Zoom' };

let cache: { at: number; running: Set<string>; micNow: Set<string> } | null = null;

async function snapshot() {
  if (cache && Date.now() - cache.at < 2000) return cache;
  const running = new Set<string>();
  const micNow = new Set<string>();
  if (process.platform === 'win32') {
    const [tasks, consent] = await Promise.all([
      run('tasklist', ['/FO', 'CSV', '/NH']),
      // Windows records every app's microphone use here; LastUsedTimeStop = 0 means "right now".
      run('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\microphone', '/s', '/v', 'LastUsedTimeStop']),
    ]);
    for (const line of tasks.split(/\r?\n/)) {
      const m = line.match(/^"([^"]+)"/);
      if (m) running.add(m[1].toLowerCase());
    }
    let key = '';
    for (const line of consent.split(/\r?\n/)) {
      if (line.startsWith('HKEY_')) key = line.trim();
      else if (/LastUsedTimeStop\s+REG_QWORD\s+0x0\s*$/.test(line) && key) {
        const last = key.split('\\').pop() || '';
        // Desktop apps: the path with "#" for "\"; Store apps: the package family name.
        const exe = last.includes('#') ? last.split('#').pop()!.toLowerCase() : last.toLowerCase();
        micNow.add(exe);
      }
    }
  }
  cache = { at: Date.now(), running, micNow };
  return cache;
}

export async function runningApps(exes: string[]): Promise<RunningApp[]> {
  const snap = await snapshot();
  return exes.slice(0, 50).map((exe) => {
    const e = String(exe).toLowerCase();
    const pkg = PACKAGES[e]?.toLowerCase();
    const usingMic = snap.micNow.has(e) || (!!pkg && [...snap.micNow].some((k) => k.startsWith(pkg)));
    return { exe, running: snap.running.has(e) || usingMic, usingMic };
  });
}

// CPU use of all of Aurel's processes, as a share of the whole machine (like Task Manager).
export function cpuPercent(): number {
  const total = app.getAppMetrics().reduce((sum, m) => sum + (m.cpu?.percentCPUUsage || 0), 0);
  return total / Math.max(1, os.cpus().length);
}
