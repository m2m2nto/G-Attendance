const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

let mainWindow;
let flaskProcess;

const FLASK_PORT = 5001;
const FLASK_URL = `http://localhost:${FLASK_PORT}`;

function getFlaskPath() {
  // In packaged app, look for frozen Python executable in resources
  if (app.isPackaged) {
    const resourcePath = process.resourcesPath;
    return path.join(resourcePath, "backend", "app");
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

    // Poll until Flask is ready
    const maxAttempts = 30;
    let attempts = 0;
    const check = () => {
      attempts++;
      http
        .get(`${FLASK_URL}/api/team`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else if (attempts < maxAttempts) {
            setTimeout(check, 500);
          } else {
            reject(new Error("Flask did not start in time"));
          }
        })
        .on("error", () => {
          if (attempts < maxAttempts) {
            setTimeout(check, 500);
          } else {
            reject(new Error("Flask did not start in time"));
          }
        });
    };
    setTimeout(check, 1000);
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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(FLASK_URL);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", async () => {
  try {
    await startFlask();
    createWindow();
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
