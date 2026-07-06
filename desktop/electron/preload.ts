import { contextBridge, ipcRenderer } from "electron";

export interface DesktopBridge {
  hide: () => Promise<void>;
  minimize: () => Promise<void>;
  quit: () => Promise<void>;
  toggleAlwaysOnTop: () => Promise<boolean>;
  isAlwaysOnTop: () => Promise<boolean>;
  openWeb: () => Promise<void>;
  onNewSessionShortcut: (cb: () => void) => () => void;
  platform: NodeJS.Platform;
  appVersion: string;
}

const bridge: DesktopBridge = {
  hide: () => ipcRenderer.invoke("window:hide"),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  quit: () => ipcRenderer.invoke("window:quit"),
  toggleAlwaysOnTop: () => ipcRenderer.invoke("window:toggle-always-on-top"),
  isAlwaysOnTop: () => ipcRenderer.invoke("window:is-always-on-top"),
  openWeb: () => ipcRenderer.invoke("window:open-web"),
  onNewSessionShortcut: (cb) => {
    const handler = () => cb();
    ipcRenderer.on("action:new-session", handler);
    return () => ipcRenderer.removeListener("action:new-session", handler);
  },
  platform: process.platform,
  appVersion: process.env.npm_package_version || "0.1.0",
};

contextBridge.exposeInMainWorld("desktopBridge", bridge);