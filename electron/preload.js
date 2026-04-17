const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Invoke (renderer → main)
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  downloadUpdate: () => ipcRenderer.invoke("update:download"),
  applyUpdate: () => ipcRenderer.invoke("update:apply"),
  getAppVersion: () => ipcRenderer.invoke("update:get-version"),

  // Listeners (main → renderer)
  onUpdateAvailable: (cb) =>
    ipcRenderer.on("update:available", (_e, data) => cb(data)),
  onUpdateProgress: (cb) =>
    ipcRenderer.on("update:download-progress", (_e, data) => cb(data)),
  onUpdateDownloaded: (cb) =>
    ipcRenderer.on("update:downloaded", (_e, data) => cb(data)),
  onUpdateError: (cb) =>
    ipcRenderer.on("update:error", (_e, data) => cb(data)),

  // Cleanup
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners("update:available");
    ipcRenderer.removeAllListeners("update:download-progress");
    ipcRenderer.removeAllListeners("update:downloaded");
    ipcRenderer.removeAllListeners("update:error");
  },
});
