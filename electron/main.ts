import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, screen, shell, Tray, IpcMainEvent } from 'electron';
import path from 'path';
import fs from 'fs';
import { AppDatabase } from './database';
import { KeyWatcher } from './keyWatcher';
import { cpuPercent, runningApps } from './system';
import { trayIcon } from './trayIcon';

const isDev = process.env.NODE_ENV === 'development';
const startedHidden = process.argv.includes('--hidden');

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let notifyWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let db: AppDatabase | null = null;
let closeToTray = true;
let quitting = false;
let lastState: unknown = null;
const keys = new KeyWatcher();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showMain());
}

function load(win: BrowserWindow, view: string) {
  if (isDev) win.loadURL(`http://localhost:5173/?view=${view}`);
  else win.loadFile(path.join(__dirname, '../dist/index.html'), { query: { view } });
}

function secure(win: BrowserWindow) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('http://localhost:5173') && !url.startsWith('file://')) e.preventDefault();
  });
}

const prefsFor = (view: string) => ({
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  // The audio engine runs in the main window and must keep running while it's hidden in the tray.
  backgroundThrottling: false,
  additionalArguments: [`--aurel-view=${view}`],
});

function createMainWindow() {
  const work = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: Math.min(1920, work.width),
    height: Math.min(1080, work.height),
    minWidth: 1280,
    minHeight: 760,
    backgroundColor: '#0D0E10',
    title: 'Aurel Voice Studio',
    frame: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: prefsFor('main'),
  });
  secure(mainWindow);
  load(mainWindow, 'main');
  mainWindow.once('ready-to-show', () => {
    if (!startedHidden) mainWindow?.show();
  });
  mainWindow.on('close', (e) => {
    if (!quitting && closeToTray) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (!quitting) app.quit();
  });
}

function showMain(tab?: string) {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  if (tab) mainWindow.webContents.send('command:received', { type: 'showMain', tab });
}

function createTrayWindow() {
  trayWindow = new BrowserWindow({
    width: 400,
    height: 640,
    frame: false,
    transparent: true,
    resizable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: prefsFor('tray'),
  });
  secure(trayWindow);
  load(trayWindow, 'tray');
  trayWindow.on('blur', () => trayWindow?.hide());
}

function toggleTrayPanel() {
  if (!trayWindow || !tray) return;
  if (trayWindow.isVisible()) return trayWindow.hide();
  const b = tray.getBounds();
  const display = screen.getDisplayNearestPoint({ x: b.x, y: b.y });
  const wa = display.workArea;
  const [w, h] = trayWindow.getSize();
  const x = Math.round(Math.min(Math.max(b.x + b.width / 2 - w / 2, wa.x), wa.x + wa.width - w));
  // Taskbar at the bottom (usual) or top.
  const y = b.y > wa.y + wa.height / 2 ? wa.y + wa.height - h : wa.y;
  trayWindow.setPosition(x, y, false);
  if (lastState) trayWindow.webContents.send('state:update', lastState);
  trayWindow.show();
  trayWindow.focus();
}

function createNotifyWindow() {
  notifyWindow = new BrowserWindow({
    width: 460,
    height: 640,
    frame: false,
    transparent: true,
    resizable: false,
    show: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: true,
    webPreferences: prefsFor('notify'),
  });
  notifyWindow.setAlwaysOnTop(true, 'screen-saver');
  notifyWindow.setVisibleOnAllWorkspaces(true);
  secure(notifyWindow);
  load(notifyWindow, 'notify');
}

function placeNotify(height: number) {
  if (!notifyWindow) return;
  const wa = screen.getPrimaryDisplay().workArea;
  const h = Math.max(120, Math.min(640, Math.round(height)));
  notifyWindow.setBounds({ x: wa.x + wa.width - 460, y: wa.y + wa.height - h, width: 460, height: h });
}

function createTray() {
  tray = new Tray(trayIcon(32));
  tray.setToolTip('Aurel Voice Studio');
  tray.on('click', toggleTrayPanel);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Aurel', click: () => showMain() },
      { label: 'Mute / unmute', click: () => mainWindow?.webContents.send('shortcuts:fired', 'mute', 'down') },
      { type: 'separator' },
      { label: 'Quit Aurel', click: () => { quitting = true; app.quit(); } },
    ])
  );
}

function updateTrayFromState(state: unknown) {
  const st = state as { muted?: boolean; enhancementOn?: boolean; statusText?: string } | null;
  if (!tray || !st) return;
  const mode = st.muted ? 'muted' : st.enhancementOn ? 'on' : 'bypassed';
  tray.setImage(trayIcon(32, mode));
  tray.setToolTip(`Aurel Voice Studio · ${st.statusText || ''}`);
}

// ---- Global shortcuts ---------------------------------------------------------

const HOLD = new Set(['hearOriginal', 'pushToTalk']);
const held = new Set<string>();
const toggled = new Set<string>();

function registerShortcuts(map: Record<string, string | null>): Record<string, boolean> {
  globalShortcut.unregisterAll();
  const result: Record<string, boolean> = {};
  for (const [action, acc] of Object.entries(map)) {
    if (!acc) continue;
    const accel = acc.replace(/^Ctrl\+/, 'CommandOrControl+').replace(/\+Ctrl\+/, '+CommandOrControl+');
    try {
      result[action] = globalShortcut.register(accel, () => {
        const send = (phase: 'down' | 'up') => mainWindow?.webContents.send('shortcuts:fired', action, phase);
        if (!HOLD.has(action)) return send('down');
        if (held.has(action)) {
          // Key repeat while held; or, where the release can't be seen, a second press ends the hold.
          if (toggled.has(action)) { held.delete(action); toggled.delete(action); send('up'); }
          return;
        }
        held.add(action);
        send('down');
        if (!keys.watch(acc, () => { held.delete(action); send('up'); })) toggled.add(action);
      });
    } catch {
      result[action] = false;
    }
  }
  return result;
}

// ---- IPC ---------------------------------------------------------------------

function fromMain(e: IpcMainEvent | Electron.IpcMainInvokeEvent) {
  return !!mainWindow && e.sender === mainWindow.webContents;
}

function registerIpc() {
  ipcMain.handle('db:list-profiles', () => db?.listProfiles() ?? []);
  ipcMain.handle('db:save-profile', (e, p) => fromMain(e) && !!db?.saveProfile(p));
  ipcMain.handle('db:delete-profile', (e, id) => fromMain(e) && !!db?.deleteProfile(String(id)));
  ipcMain.handle('db:get-prefs', () => db?.getPrefs() ?? null);
  ipcMain.handle('db:save-prefs', (e, p) => fromMain(e) && !!db?.savePrefs(p));

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => (mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()));
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.on('window:show-main', (_e, tab) => showMain(typeof tab === 'string' ? tab : undefined));
  ipcMain.on('tray:hide', () => trayWindow?.hide());
  ipcMain.on('app:close-to-tray', (_e, v) => (closeToTray = !!v));
  ipcMain.on('app:login-item', (_e, o: { openAtLogin: boolean; openInTray: boolean }) => {
    if (isDev || process.platform === 'linux') return;
    app.setLoginItemSettings({ openAtLogin: !!o?.openAtLogin, args: o?.openInTray ? ['--hidden'] : [] });
  });
  ipcMain.handle('app:opened-at-login', () => startedHidden);
  ipcMain.handle('app:versions', () => ({ app: app.getVersion(), electron: process.versions.electron }));

  ipcMain.handle('system:open-vbcable-folder', () => {
    const folder = path.join(app.getPath('downloads'), 'VBCABLE_Driver_Pack45');
    if (fs.existsSync(folder)) shell.openPath(folder);
    else shell.openExternal('https://vb-audio.com/Cable/');
    return true;
  });
  ipcMain.handle('system:open-sound-settings', () => shell.openExternal('ms-settings:sound').then(() => true, () => false));
  ipcMain.handle('system:open-mic-privacy', () => shell.openExternal('ms-settings:privacy-microphone').then(() => true, () => false));
  ipcMain.handle('system:running-apps', (_e, exes) => runningApps(Array.isArray(exes) ? exes.map(String) : []));
  ipcMain.handle('system:cpu', () => cpuPercent());

  ipcMain.handle('profile:export', async (_e, json: string, name: string) => {
    if (!mainWindow || typeof json !== 'string') return false;
    const safe = String(name || 'profile.aurel').replace(/[\\/:*?"<>|]/g, '_');
    const r = await dialog.showSaveDialog(mainWindow, { title: 'Export profile', defaultPath: path.join(app.getPath('documents'), safe), filters: [{ name: 'Aurel profile', extensions: ['aurel'] }] });
    if (r.canceled || !r.filePath) return false;
    await fs.promises.writeFile(r.filePath, json, 'utf8');
    return true;
  });
  ipcMain.handle('profile:import', async () => {
    if (!mainWindow) return null;
    const r = await dialog.showOpenDialog(mainWindow, { title: 'Import profile', properties: ['openFile'], filters: [{ name: 'Aurel profile', extensions: ['aurel', 'json'] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    const stat = await fs.promises.stat(r.filePaths[0]);
    if (stat.size > 256 * 1024) return null;
    return fs.promises.readFile(r.filePaths[0], 'utf8');
  });
  ipcMain.handle('app:install-update', async () => {
    if (!mainWindow) return false;
    const r = await dialog.showOpenDialog(mainWindow, { title: 'Install Aurel update', properties: ['openFile'], filters: [{ name: 'Aurel installer', extensions: ['exe', 'msi'] }] });
    if (r.canceled || !r.filePaths[0]) return false;
    const err = await shell.openPath(r.filePaths[0]);
    if (err) return false;
    setTimeout(() => { quitting = true; app.quit(); }, 1500);
    return true;
  });

  ipcMain.handle('shortcuts:set', (e, map) => (fromMain(e) && map && typeof map === 'object' ? registerShortcuts(map) : {}));

  // Main window → tray panel and notification window.
  ipcMain.on('state:publish', (e, state) => {
    if (!fromMain(e)) return;
    lastState = state;
    updateTrayFromState(state);
    if (trayWindow?.isVisible()) trayWindow.webContents.send('state:update', state);
    notifyWindow?.webContents.send('state:update', state);
  });
  // Tray panel / notification buttons → main window.
  ipcMain.on('command:send', (_e, cmd) => {
    if (cmd && typeof cmd === 'object') {
      if ((cmd as { type?: string }).type === 'showMain') showMain((cmd as { tab?: string }).tab);
      else mainWindow?.webContents.send('command:received', cmd);
    }
  });
  ipcMain.on('notify:show', (e, n) => {
    if (!fromMain(e) || !notifyWindow) return;
    notifyWindow.webContents.send('notify:push', n);
  });
  ipcMain.on('notify:visible', (_e, visible: boolean, height?: number) => {
    if (!notifyWindow) return;
    if (visible) {
      placeNotify(height || 640);
      if (!notifyWindow.isVisible()) notifyWindow.showInactive();
    } else notifyWindow.hide();
  });
}

app.whenReady().then(() => {
  if (!app.hasSingleInstanceLock()) return;
  db = new AppDatabase();
  registerIpc();
  createMainWindow();
  createTrayWindow();
  createNotifyWindow();
  createTray();
});

app.on('before-quit', () => {
  quitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  keys.dispose();
  db?.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
