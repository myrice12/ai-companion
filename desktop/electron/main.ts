import { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, shell, screen, nativeImage, protocol, net } from "electron";
import * as path from "path";
import * as fs from "fs";

type WindowBounds = { x: number; y: number; width: number; height: number; alwaysOnTop: boolean };

const isDev = !app.isPackaged && process.env.NODE_ENV !== "production";
const DEV_URL = process.env.DEV_URL || "http://localhost:5174";

const userDataDir = app.getPath("userData");
const stateFile = path.join(userDataDir, "widget-state.json");

const DEFAULT_BOUNDS: WindowBounds = {
  x: 100,
  y: 100,
  width: 380,
  height: 600,
  alwaysOnTop: true,
};

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("app", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("app");
}

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

function loadState(): WindowBounds {
  try {
    if (fs.existsSync(stateFile)) {
      const raw = fs.readFileSync(stateFile, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_BOUNDS,
        ...parsed,
      };
    }
  } catch (e) {
    console.error("读取窗口状态失败:", e);
  }
  return DEFAULT_BOUNDS;
}

function saveState(bounds: WindowBounds) {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(bounds, null, 2));
  } catch (e) {
    console.error("保存窗口状态失败:", e);
  }
}

function clampBoundsToDisplay(b: WindowBounds): WindowBounds {
  const displays = screen.getAllDisplays();
  const target = displays.find((d) => {
    const wa = d.workArea;
    return b.x >= wa.x && b.x < wa.x + wa.width && b.y >= wa.y && b.y < wa.y + wa.height;
  }) || screen.getPrimaryDisplay();
  const wa = target.workArea;
  const width = Math.min(Math.max(b.width, 320), wa.width);
  const height = Math.min(Math.max(b.height, 400), wa.height);
  const x = Math.min(Math.max(b.x, wa.x), wa.x + wa.width - width);
  const y = Math.min(Math.max(b.y, wa.y), wa.y + wa.height - height);
  return { ...b, x, y, width, height };
}

function createTrayIcon() {
  const size = 18;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = size / 2 - 0.5;
      const cy = size / 2 - 0.5;
      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const i = (y * size + x) * 4;
      if (r < size / 2 - 1) {
        buf[i] = 0xfd;
        buf[i + 1] = 0xa4;
        buf[i + 2] = 0xaf;
        buf[i + 3] = 0xff;
      } else if (r < size / 2) {
        buf[i] = 0xfd;
        buf[i + 1] = 0xa4;
        buf[i + 2] = 0xaf;
        buf[i + 3] = 0x80;
      } else {
        buf[i + 3] = 0;
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function createWindow() {
  const state = clampBoundsToDisplay(loadState());

  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 320,
    minHeight: 400,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: state.alwaysOnTop,
    skipTaskbar: false,
    show: false,
    icon: createTrayIcon(),
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setMenu(null);

  if (state.alwaysOnTop) {
    mainWindow.setAlwaysOnTop(true, "floating");
  }

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadURL("app://./index.html");
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  const persist = () => {
    if (!mainWindow) return;
    const b = mainWindow.getBounds();
    saveState({
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      alwaysOnTop: mainWindow.isAlwaysOnTop(),
    });
  };

  mainWindow.on("resize", persist);
  mainWindow.on("move", persist);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
}

function buildTrayMenu(): Menu {
  const alwaysOnTop = mainWindow?.isAlwaysOnTop() ?? true;
  return Menu.buildFromTemplate([
    {
      label: "显示/隐藏小组件",
      click: () => toggleWindow(),
    },
    {
      label: "新会话",
      click: () => {
        if (mainWindow) {
          if (!mainWindow.isVisible()) mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send("action:new-session");
        }
      },
    },
    { type: "separator" },
    {
      label: "总在最前",
      type: "checkbox",
      checked: alwaysOnTop,
      click: (item) => {
        if (!mainWindow) return;
        const next = item.checked;
        mainWindow.setAlwaysOnTop(next, next ? "floating" : "normal");
        saveState({ ...loadState(), alwaysOnTop: next });
      },
    },
    {
      label: "在浏览器中打开网页版",
      click: () => {
        shell.openExternal("http://localhost:8080");
      },
    },
    { type: "separator" },
    {
      label: "退出小伴",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip("小伴 AI · 桌面小组件");
  tray.setContextMenu(buildTrayMenu());
  tray.on("click", () => toggleWindow());
  tray.on("double-click", () => toggleWindow());
}

function refreshTrayMenu() {
  if (tray) {
    tray.setContextMenu(buildTrayMenu());
  }
}

function registerGlobalShortcut() {
  const ok = globalShortcut.register("CommandOrControl+Shift+Space", () => {
    toggleWindow();
  });
  if (!ok) {
    console.warn("全局快捷键 Cmd/Ctrl+Shift+Space 注册失败，可能与其他应用冲突");
  }
}

function setupIpc() {
  ipcMain.handle("window:hide", () => {
    mainWindow?.hide();
  });

  ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
  });

  ipcMain.handle("window:toggle-always-on-top", () => {
    if (!mainWindow) return false;
    const next = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(next, next ? "floating" : "normal");
    saveState({ ...loadState(), alwaysOnTop: next });
    refreshTrayMenu();
    return next;
  });

  ipcMain.handle("window:is-always-on-top", () => {
    return mainWindow?.isAlwaysOnTop() ?? false;
  });

  ipcMain.handle("window:quit", () => {
    isQuitting = true;
    app.quit();
  });

  ipcMain.handle("window:open-web", () => {
    shell.openExternal("http://localhost:8080");
  });
}

function setupProtocol() {
  protocol.handle("app", async (request) => {
    try {
      const url = new URL(request.url);
      const relPath = decodeURIComponent(url.pathname);
      const safePath = path.normalize(relPath).replace(/^([/\\])+/, "");
      const distDir = isDev
        ? path.join(__dirname, "..", "dist")
        : path.join(app.getAppPath(), "dist");
      const filePath = path.join(distDir, safePath);
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(distDir))) {
        return new Response("Forbidden", { status: 403 });
      }
      return net.fetch(`file://${resolved}`);
    } catch (err) {
      console.error("protocol handle error:", err);
      return new Response("Internal Error", { status: 500 });
    }
  });
}

if (process.platform === "darwin") {
  app.dock?.hide?.();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    toggleWindow();
  });

  app.whenReady().then(() => {
    setupProtocol();
    setupIpc();
    createWindow();
    createTray();
    registerGlobalShortcut();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        mainWindow?.show();
      }
    });
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  app.on("window-all-closed", () => {
    // keep app alive in tray even when all windows are closed
  });
}