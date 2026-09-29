import React, { useEffect, useRef, useState } from 'react';
import { AppNotification, dismiss, onNotifications, receive } from '../state/notifications';
import { NotificationCard } from '../components/NotificationsDrawer';
import { useTheme } from '../ui/useTheme';

// The always-on-top pop-up window for notifications, bottom-right of the screen.
export function NotifyWindow() {
  const [list, setList] = useState<AppNotification[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  useTheme(theme);
  useEffect(() => {
    document.body.classList.add('transparent');
    const offList = onNotifications(setList);
    const offPush = window.studioAPI!.onNotification((n) => receive(n as AppNotification));
    const offState = window.studioAPI!.onState((st) => setTheme(((st as { theme?: 'light' | 'dark' }).theme) || 'dark'));
    return () => { offList(); offPush(); offState(); };
  }, []);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // Size the window to the cards so the empty area never blocks clicks on the desktop.
    const ro = new ResizeObserver(() => window.studioAPI!.setNotificationsVisible(list.length > 0, el.scrollHeight + 48));
    ro.observe(el);
    return () => ro.disconnect();
  }, [list.length]);
  useEffect(() => {
    window.studioAPI!.setNotificationsVisible(list.length > 0, (box.current?.scrollHeight || 0) + 48);
    const t = list.map((n) => setTimeout(() => dismiss(n.id), n.kind === 'unplugged' ? 30000 : 12000));
    return () => t.forEach(clearTimeout);
  }, [list]);
  return (
    <div className="col" style={{ height: '100%', justifyContent: 'flex-end', padding: 24 }}>
      <div ref={box} className="col" style={{ gap: 12 }}>
      {list.map((n) => (
        <NotificationCard
          key={n.id}
          n={n}
          onDismiss={() => dismiss(n.id)}
          onAction={(c) => {
            window.studioAPI!.sendCommand(c);
            dismiss(n.id);
          }}
        />
      ))}
      </div>
    </div>
  );
}
