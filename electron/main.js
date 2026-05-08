const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");
const Updater = require("./updater");

let mainWindow;
let flaskProcess;
let updater;

const FLASK_PORT = 5001;
const FLASK_URL = `http://localhost:${FLASK_PORT}`;

function getFlaskPath() {
  // In packaged app, the PyInstaller --onedir output lives at
  // Resources/backend/app/ with the executable at Resources/backend/app/app.
  if (app.isPackaged) {
    const resourcePath = process.resourcesPath;
    return path.join(resourcePath, "backend", "app", "app");
  }
  return null; // Use python directly in development
}

function startFlask() {
  return new Promise((resolve, reject) => {
    const frozenPath = getFlaskPath();

    if (frozenPath) {
      // Packaged: run the PyInstaller-frozen executable
      flaskProcess = spawn(frozenPath, [], {
        env: { ...process.env, FLASK_PORT: String(FLASK_PORT) },
      });
    } else {
      // Development: run python directly
      const projectRoot = path.join(__dirname, "..");
      flaskProcess = spawn("python3", ["app.py"], {
        cwd: projectRoot,
        env: { ...process.env, FLASK_PORT: String(FLASK_PORT) },
      });
    }

    flaskProcess.stdout?.on("data", (data) => {
      console.log(`Flask: ${data}`);
    });

    flaskProcess.stderr?.on("data", (data) => {
      console.log(`Flask: ${data}`);
    });

    flaskProcess.on("error", (err) => {
      console.error("Failed to start Flask:", err);
      reject(err);
    });

    // Poll until Flask is ready. Tight interval, no pre-poll sleep —
    // ~10 s total window at 100 ms granularity.
    const maxAttempts = 100;
    const intervalMs = 100;
    let attempts = 0;
    const check = () => {
      attempts++;
      http
        .get(`${FLASK_URL}/api/team`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else if (attempts < maxAttempts) {
            setTimeout(check, intervalMs);
          } else {
            reject(new Error("Flask did not start in time"));
          }
        })
        .on("error", () => {
          if (attempts < maxAttempts) {
            setTimeout(check, intervalMs);
          } else {
            reject(new Error("Flask did not start in time"));
          }
        });
    };
    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "G-Attendance",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 13 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadURL(FLASK_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// -- IPC handlers for auto-updater ------------------------------------------

function getAppVersion() {
  try {
    const pkgPath = app.isPackaged
      ? path.join(process.resourcesPath, "app.asar", "package.json")
      : path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return { version: pkg.version, buildNumber: pkg.buildNumber || 0 };
  } catch {
    return { version: "0.0.0", buildNumber: 0 };
  }
}

ipcMain.handle("update:check", () => {
  if (updater) return updater.checkForUpdates();
  return {
    status: "error",
    message: "Auto-update is only available in packaged builds",
  };
});

ipcMain.handle("update:download", () => {
  if (updater) return updater.downloadUpdate();
});

ipcMain.handle("update:apply", () => {
  if (updater) updater.applyAndRestart();
});

ipcMain.handle("update:get-version", () => getAppVersion());

ipcMain.handle("file:select-excel", async (_e, currentPath) => {
  const defaultPath = currentPath
    ? path.dirname(currentPath)
    : app.getPath("documents");
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select Excel File",
    defaultPath,
    properties: ["openFile"],
    filters: [{ name: "Excel", extensions: ["xlsx", "xlsm"] }],
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

// -- App lifecycle ----------------------------------------------------------

app.on("ready", async () => {
  try {
    await startFlask();
    createWindow();

    // Auto-check for updates on startup (packaged builds only)
    if (app.isPackaged) {
      updater = new Updater(mainWindow);
      setTimeout(() => updater.checkForUpdates(), 5000);
    }
  } catch (err) {
    console.error("Startup error:", err);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (flaskProcess) {
    flaskProcess.kill();
  }
  app.quit();
});

app.on("before-quit", () => {
  if (flaskProcess) {
    flaskProcess.kill();
  }
});
