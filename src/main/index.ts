// Electron glue only: everything below is covered by tests through createFetchApp,
// createStatusForwarder and SpawnClaudeRunner. This file is checked by running the app.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow } from 'electron';
import { createFetchApp, type FetchApp } from './app/create-fetch-app';
import { findOnPath, resolveClaudeLauncher, type ClaudeRunner } from './claude/claude-runner';
import { SpawnClaudeRunner } from './claude/spawn-claude-runner';
import { createStatusForwarder } from './status/status-forwarder';

let fetchApp: FetchApp | null = null;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 136,
    height: 136,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  void win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  return win;
}

function createRunner(): ClaudeRunner {
  const launcher = resolveClaudeLauncher((name) => findOnPath(name, process.env['PATH'] ?? '', existsSync), process.platform);
  // Without claude every fetch fails as a spawn error, which is logged and shown as `error`.
  return launcher ? new SpawnClaudeRunner(launcher) : { run: async () => ({ kind: 'spawn-error', durationMs: 0 }) };
}

app.whenReady().then(() => {
  const win = createWindow();
  const forwarder = createStatusForwarder(win.webContents);
  fetchApp = createFetchApp({ userDataDir: app.getPath('userData'), runner: createRunner(), forward: forwarder.send });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  fetchApp?.stop();
  fetchApp = null;
});
