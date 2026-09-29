import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { AppDatabase } from './database';

let mainWindow: BrowserWindow | null = null;
let db: AppDatabase | null = null;

const isDev = process.env.NODE_ENV === 'development';

function seedDefaultPresets(database: AppDatabase) {
  const existing = database.getPresets();
  if (existing.length === 0) {
    console.log('[SQLite] Seeding built-in presets...');
    const defaultList = [
      {
        id: 'broadcast',
        name: 'Broadcast',
        badge: 'Warm & Tight',
        description: 'Deep, close and controlled. The late-night radio voice.',
        tags: 'Warm lows · Tight dynamics',
        curve: 'M0 30 C18 30 28 11 58 12 S108 25 140 25 S198 17 228 19 S254 27 260 29',
        isBuiltIn: true,
        params: {
          preGainDb: 20,
          noiseGate: { enabled: true, thresholdDb: -46, reductionDb: -24, attackMs: 10, releaseMs: 180 },
          eq: { enabled: true, hpfFreq: 75, warmthFreq: 150, warmthGainDb: 5.5, mudFreq: 340, mudGainDb: -4.0, mudQ: 1.6, presenceFreq: 4200, presenceGainDb: 4.5, presenceQ: 1.3, airFreq: 11000, airGainDb: 3.0 },
          compressor: { enabled: true, thresholdDb: -22, ratio: 4.8, attackMs: 10, releaseMs: 160, kneeDb: 14 },
          deEsser: { enabled: true, freq: 6500, reductionDb: -3.5 },
          limiter: { enabled: true, ceilingDb: -1.0 },
          outputGainDb: 0,
        },
      },
      {
        id: 'podcast',
        name: 'Podcast',
        badge: 'Full Body',
        description: 'Rich and even for long-form talk, interviews and narration.',
        tags: 'Full body · Smooth',
        curve: 'M0 33 C25 33 40 17 72 17 S120 23 150 22 S210 16 240 18 S258 25 260 27',
        isBuiltIn: true,
        params: {
          preGainDb: 18,
          noiseGate: { enabled: true, thresholdDb: -48, reductionDb: -24, attackMs: 12, releaseMs: 180 },
          eq: { enabled: true, hpfFreq: 80, warmthFreq: 160, warmthGainDb: 4.0, mudFreq: 360, mudGainDb: -3.5, mudQ: 1.5, presenceFreq: 3800, presenceGainDb: 5.0, presenceQ: 1.2, airFreq: 10500, airGainDb: 2.5 },
          compressor: { enabled: true, thresholdDb: -24, ratio: 4.0, attackMs: 12, releaseMs: 180, kneeDb: 16 },
          deEsser: { enabled: true, freq: 6500, reductionDb: -3.5 },
          limiter: { enabled: true, ceilingDb: -1.0 },
          outputGainDb: 0,
        },
      },
      {
        id: 'clear',
        name: 'Clear Speech',
        badge: 'Presence',
        description: 'Crisp and intelligible. Tuned for meetings and calls.',
        tags: 'Low cut · Presence',
        curve: 'M0 39 C20 39 34 27 60 25 S120 23 150 21 S190 9 215 11 S250 21 260 25',
        isBuiltIn: true,
        params: {
          preGainDb: 17,
          noiseGate: { enabled: true, thresholdDb: -44, reductionDb: -24, attackMs: 8, releaseMs: 140 },
          eq: { enabled: true, hpfFreq: 95, warmthFreq: 170, warmthGainDb: 2.0, mudFreq: 390, mudGainDb: -4.5, mudQ: 1.6, presenceFreq: 4400, presenceGainDb: 6.5, presenceQ: 1.4, airFreq: 12000, airGainDb: 3.0 },
          compressor: { enabled: true, thresholdDb: -22, ratio: 3.5, attackMs: 8, releaseMs: 140, kneeDb: 12 },
          deEsser: { enabled: true, freq: 6800, reductionDb: -3.5 },
          limiter: { enabled: true, ceilingDb: -1.0 },
          outputGainDb: 0,
        },
      },
      {
        id: 'condenser',
        name: 'Studio Condenser',
        badge: 'Air & Detail',
        description: 'Open, airy detail with a polished top end.',
        tags: 'Air · Detail',
        curve: 'M0 34 C30 34 50 24 90 24 S150 25 180 21 S230 8 260 7',
        isBuiltIn: true,
        params: {
          preGainDb: 16,
          noiseGate: { enabled: true, thresholdDb: -46, reductionDb: -24, attackMs: 12, releaseMs: 170 },
          eq: { enabled: true, hpfFreq: 70, warmthFreq: 150, warmthGainDb: 2.5, mudFreq: 320, mudGainDb: -3.0, mudQ: 1.5, presenceFreq: 4600, presenceGainDb: 5.0, presenceQ: 1.2, airFreq: 12500, airGainDb: 5.5 },
          compressor: { enabled: true, thresholdDb: -23, ratio: 3.8, attackMs: 14, releaseMs: 170, kneeDb: 14 },
          deEsser: { enabled: true, freq: 6500, reductionDb: -3.5 },
          limiter: { enabled: true, ceilingDb: -1.0 },
          outputGainDb: 0,
        },
      },
      {
        id: 'natural',
        name: 'Natural',
        badge: 'Transparent',
        description: 'Light cleanup only. Still you, just clearer and louder.',
        tags: 'Transparent',
        curve: 'M0 29 C30 26 60 24 130 24 S230 24 260 25',
        isBuiltIn: true,
        params: {
          preGainDb: 15,
          noiseGate: { enabled: true, thresholdDb: -50, reductionDb: -16, attackMs: 15, releaseMs: 200 },
          eq: { enabled: true, hpfFreq: 70, warmthFreq: 160, warmthGainDb: 1.0, mudFreq: 350, mudGainDb: -1.5, mudQ: 1.2, presenceFreq: 4000, presenceGainDb: 2.0, presenceQ: 1.0, airFreq: 11000, airGainDb: 1.5 },
          compressor: { enabled: true, thresholdDb: -26, ratio: 2.5, attackMs: 15, releaseMs: 200, kneeDb: 18 },
          deEsser: { enabled: true, freq: 6500, reductionDb: -2.0 },
          limiter: { enabled: true, ceilingDb: -1.0 },
          outputGainDb: 0,
        },
      },
    ];

    for (const preset of defaultList) {
      database.savePreset(preset);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#0D0E10',
    title: 'Aurel Voice Studio',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // Prevents background audio processing pause when user switches to Zoom/Discord!
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  db = new AppDatabase();
  seedDefaultPresets(db);

  // IPC Handlers for Database
  ipcMain.handle('db:get-presets', () => {
    return db?.getPresets() || [];
  });

  ipcMain.handle('db:save-preset', (_e, preset) => {
    db?.savePreset(preset);
    return true;
  });

  ipcMain.handle('db:delete-preset', (_e, id) => {
    return db?.deletePreset(id) || false;
  });

  ipcMain.handle('db:get-setting', (_e, key, defaultValue) => {
    return db?.getSetting(key, defaultValue) || defaultValue;
  });

  ipcMain.handle('db:set-setting', (_e, key, value) => {
    db?.setSetting(key, value);
    return true;
  });

  ipcMain.handle('db:get-all-settings', () => {
    return db?.getAllSettings() || {};
  });

  // Open VB-Cable Installer Folder in Windows Explorer
  ipcMain.handle('system:open-vbcable-folder', () => {
    const downloads = app.getPath('downloads');
    const folder = path.join(downloads, 'VBCABLE_Driver_Pack45');
    if (fs.existsSync(folder)) {
      shell.openPath(folder);
    } else {
      shell.openExternal('https://vb-audio.com/Cable/');
    }
    return true;
  });

  ipcMain.handle('system:open-sound-settings', () => {
    shell.openExternal('ms-settings:sound');
    return true;
  });

  // Window control IPC
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close();
    }
    app.quit();
  }
});
