import { useEffect } from 'react';
import { Theme } from '../state/prefs';

// Applies the theme class; "Match Windows" follows the system setting live.
export function useTheme(theme: Theme | 'light' | 'dark'): void {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const light = theme === 'light' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('theme-light', light);
    };
    apply();
    if (theme !== 'system') return;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}
