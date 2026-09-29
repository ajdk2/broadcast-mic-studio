import { useEffect, useState } from 'react';

// CPU use of the whole app (all Electron processes), refreshed every 3 s. Null outside Electron.
export function useCpu(): number | null {
  const [cpu, setCpu] = useState<number | null>(null);
  useEffect(() => {
    if (!window.studioAPI) return;
    let alive = true;
    const tick = () => window.studioAPI!.getCpuPercent().then((v) => alive && setCpu(v)).catch(() => {});
    tick();
    const t = setInterval(tick, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return cpu;
}
