// Electron main process — loads the Vite dev server (or built bundle) and
// ensures the backend (apps/server) is available on 127.0.0.1:8799.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const WEB_PORT = 5173;
const API_PORT = 8799;

function waitFor(url, ms) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const poll = () => {
      http
        .get(url, (res) => {
          res.resume();
          res.statusCode < 500 ? resolve() : retry();
        })
        .on('error', retry);
      function retry() {
        if (Date.now() - t0 > ms) return reject(new Error('timeout waiting for ' + url));
        setTimeout(poll, 400);
      }
    };
    poll();
  });
}

let serverProc = null;

async function ensureApi() {
  try {
    await waitFor(`http://127.0.0.1:${API_PORT}/api/health`, 1200);
    return; // already up
  } catch {
    // spawn server from the monorepo root
  }
  const root = path.join(__dirname, '../..');
  serverProc = spawn(process.execPath, [path.join(root, 'apps/server/dist/index.js')], {
    cwd: root,
    env: { ...process.env, PORT: String(API_PORT) },
    stdio: 'ignore',
    detached: true,
  });
  serverProc.unref();
  await waitFor(`http://127.0.0.1:${API_PORT}/api/health`, 15000);
}

app.whenReady().then(async () => {
  try {
    await ensureApi();
  } catch {
    // backend missing; web UI will show errors — still open the window
  }
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    backgroundColor: '#070b16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // open external links in the user's browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.once('ready-to-show', () => win.show());
  await win.loadURL(`http://127.0.0.1:${WEB_PORT}`);
});

app.on('window-all-closed', () => {
  if (serverProc) serverProc.kill();
  if (process.platform !== 'darwin') app.quit();
});