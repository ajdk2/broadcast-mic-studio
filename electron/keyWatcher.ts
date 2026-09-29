import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

// Electron's globalShortcut only reports key presses. Hold-type shortcuts (Hear original, Push to
// talk) also need the release, so on Windows a small PowerShell helper polls GetAsyncKeyState for
// the keys we ask about and prints "up <vk>" when one is let go.
const SCRIPT = `
Add-Type -Namespace Aurel -Name Keys -MemberDefinition '[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);'
$watch = New-Object 'System.Collections.Generic.HashSet[int]'
$reader = [Console]::In
$task = $reader.ReadLineAsync()
while ($true) {
  if ($task.IsCompleted) {
    $line = $task.Result
    if ($line -eq $null) { break }
    if ($line -match '^watch (\\d+)$') { [void]$watch.Add([int]$matches[1]) }
    $task = $reader.ReadLineAsync()
  }
  foreach ($vk in @($watch)) {
    if (([Aurel.Keys]::GetAsyncKeyState($vk) -band 0x8000) -eq 0) {
      [Console]::Out.WriteLine("up $vk"); [Console]::Out.Flush()
      [void]$watch.Remove($vk)
    }
  }
  Start-Sleep -Milliseconds 15
}
`;

export function vkFor(accelerator: string): number | null {
  const key = accelerator.split('+').pop() || '';
  if (/^[A-Z]$/.test(key)) return key.charCodeAt(0);
  if (/^[0-9]$/.test(key)) return key.charCodeAt(0);
  const f = key.match(/^F(\d{1,2})$/);
  if (f) return 0x6f + Number(f[1]);
  if (key === 'Space') return 0x20;
  return null;
}

export class KeyWatcher {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private waiting = new Map<number, () => void>();

  private ensure(): boolean {
    if (process.platform !== 'win32') return false;
    if (this.proc && !this.proc.killed) return true;
    try {
      // The script goes in -EncodedCommand (UTF-16LE base64) so stdin is free for "watch <vk>" lines.
      const encoded = Buffer.from(SCRIPT, 'utf16le').toString('base64');
      this.proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded], { windowsHide: true });
    } catch {
      this.proc = null;
      return false;
    }
    let buf = '';
    this.proc.stdout.on('data', (d: Buffer) => {
      buf += d.toString();
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        const m = line.match(/^up (\d+)$/);
        if (m) {
          const vk = Number(m[1]);
          const cb = this.waiting.get(vk);
          this.waiting.delete(vk);
          cb?.();
        }
      }
    });
    this.proc.on('exit', () => {
      this.proc = null;
      // Release anything still held so nothing stays stuck (e.g. push-to-talk left open).
      const pending = [...this.waiting.values()];
      this.waiting.clear();
      pending.forEach((cb) => cb());
    });
    return true;
  }

  // Calls onUp once the key is released. Returns false when release can't be detected.
  watch(accelerator: string, onUp: () => void): boolean {
    const vk = vkFor(accelerator);
    if (vk === null || !this.ensure()) return false;
    this.waiting.set(vk, onUp);
    this.proc!.stdin.write(`watch ${vk}\r\n`);
    return true;
  }

  dispose(): void {
    this.proc?.kill();
    this.proc = null;
  }
}
