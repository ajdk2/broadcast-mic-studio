// Plays recordings (voice check, Test my sound) to the monitor device, or Windows' default output.
// Several versions of the same clip can be switched mid-play without losing the position.

type SinkCtx = AudioContext & { setSinkId?: (id: string) => Promise<void> };

let ctx: SinkCtx | null = null;
let sinkId = '';

async function context(sampleRate: number, deviceId: string): Promise<SinkCtx> {
  if (!ctx || ctx.state === 'closed' || ctx.sampleRate !== sampleRate) {
    await ctx?.close().catch(() => {});
    ctx = new AudioContext({ sampleRate }) as SinkCtx;
    sinkId = '';
  }
  if (deviceId !== sinkId && ctx.setSinkId) {
    try {
      await ctx.setSinkId(deviceId);
      sinkId = deviceId;
    } catch {
      /* fall back to the default output */
    }
  }
  if (ctx.state === 'suspended') await ctx.resume();
  return ctx;
}

export class ClipPlayer {
  private src: AudioBufferSourceNode | null = null;
  private startedAt = 0;
  private offset = 0;
  private buffers = new Map<string, AudioBuffer>();
  private current = '';
  private raf = 0;
  loop = false;
  duration = 0;
  onProgress?: (seconds: number, playing: boolean) => void;

  constructor(private sampleRate: number, private deviceId = '') {}

  async set(key: string, samples: Float32Array): Promise<void> {
    const c = await context(this.sampleRate, this.deviceId);
    const b = c.createBuffer(1, samples.length, this.sampleRate);
    b.getChannelData(0).set(samples);
    this.buffers.set(key, b);
    this.duration = Math.max(this.duration, b.duration);
  }

  has(key: string): boolean {
    return this.buffers.has(key);
  }

  get playing(): boolean {
    return !!this.src;
  }

  get position(): number {
    if (!this.src || !ctx) return this.offset;
    const p = ctx.currentTime - this.startedAt;
    return this.loop ? p % this.duration : Math.min(p, this.duration);
  }

  // Play `key`, continuing from the current position (so A/B switching is seamless).
  async play(key: string, from?: number): Promise<void> {
    const c = await context(this.sampleRate, this.deviceId);
    const buf = this.buffers.get(key);
    if (!buf) return;
    const pos = from ?? (this.src ? this.position : this.offset >= this.duration - 0.05 ? 0 : this.offset);
    this.stopSource();
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = this.loop;
    src.connect(c.destination);
    src.start(0, pos);
    this.startedAt = c.currentTime - pos;
    this.src = src;
    this.current = key;
    src.onended = () => {
      if (this.src === src) {
        this.src = null;
        this.offset = 0;
        this.onProgress?.(this.duration, false);
      }
    };
    const tick = () => {
      if (!this.src) return;
      this.onProgress?.(this.position, true);
      this.raf = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(this.raf);
    tick();
  }

  async switchTo(key: string): Promise<void> {
    if (this.src) await this.play(key);
    else this.current = key;
  }

  pause(): void {
    this.offset = this.position;
    this.stopSource();
    this.onProgress?.(this.offset, false);
  }

  setLoop(loop: boolean): void {
    this.loop = loop;
    if (this.src) this.src.loop = loop;
  }

  get key(): string {
    return this.current;
  }

  private stopSource() {
    if (this.src) {
      this.src.onended = null;
      try {
        this.src.stop();
      } catch {
        /* already stopped */
      }
      this.src.disconnect();
      this.src = null;
    }
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    this.stopSource();
    this.buffers.clear();
  }
}

export const fmtTime = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
