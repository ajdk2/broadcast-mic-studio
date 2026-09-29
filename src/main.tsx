import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '@fontsource/geist-mono/600.css';
import './index.css';
import App from './App';
import { TrayPanel } from './views/TrayPanel';
import { NotifyWindow } from './views/NotifyWindow';

// One bundle, three windows: the app, the tray quick panel and the notification pop-ups.
const view = window.studioAPI?.view || new URLSearchParams(location.search).get('view') || 'main';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{view === 'tray' && window.studioAPI ? <TrayPanel /> : view === 'notify' && window.studioAPI ? <NotifyWindow /> : <App />}</React.StrictMode>
);
