# 小伴 AI · 桌面小组件

> 一个常驻系统托盘的 Electron 悬浮窗，跟 **网页端共享同一个后端和 SQLite 数据库**，对话和会话列表两边实时同步。

![widget-tray](https://img.shields.io/badge/Electron-33-47848F) ![vite](https://img.shields.io/badge/Vite-5-646CFF)

---

## 它长什么样

- 🐱 **系统托盘常驻**：点小猫图标弹出/隐藏，菜单可一键「新建会话 / 打开网页版 / 退出」
- 🪟 **悬浮小组件**：无边框 + 圆角 + 毛玻璃，可拖动、可缩放、可置顶、可记忆位置
- ⚡ **全局快捷键**：`Cmd/Ctrl + Shift + Space` 随时唤起/隐藏
- 🔄 **与网页端同步**：所有读写都打到同一个 FastAPI 后端 → 共用 SQLite，对话天然一致
- 💕 **保留网页端的所有能力**：流式回复、自动标题、新建/删除/切换会话、人设继承

---

## 运行前提

桌面小组件 **不包含** 后端——它只是个客户端。需要先启动项目根目录的后端（以及网页端，可选）：

```bash
# 在仓库根目录
docker compose up --build -d
# 或者本地开发
cd backend && uvicorn app.main:app --reload --port 8000
```

后端起来后默认监听 `http://localhost:8000`，桌面小组件会自动连接。

> 浏览器打开 **http://localhost:8080**（网页端），首次进入需要配置 LLM API Key。配置后，桌面小组件就能正常发消息了。

---

## 开发模式

```bash
cd desktop
npm install
npm run dev
```

这条命令会：

1. 用 `tsc` 编译 `electron/main.ts` 和 `electron/preload.ts` 到 `dist-electron/`
2. 启动 Vite 开发服务器（`http://localhost:5174`），热更新
3. 启动 Electron，加载 Vite 的开发页面（带 DevTools）

---

## 构建发布包

```bash
cd desktop
npm install
npm run dist
```

产物在 `desktop/release/`：

- macOS: `.dmg`
- Windows: `.exe` (NSIS 安装器)
- Linux: `.AppImage`

需要自定义图标就放一张 512×512 的 PNG 到 `desktop/build/icon.png`。

---

## 项目结构

```
desktop/
├── electron/
│   ├── main.ts        # 主进程：托盘、悬浮窗、全局快捷键、窗口位置记忆
│   └── preload.ts     # 预加载：通过 contextBridge 暴露 IPC
├── src/                # 渲染进程（React + Vite + Tailwind）
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── fetchPatch.ts  # 把相对 /api 路径改写成 http://localhost:8000/api
│   └── components/
├── scripts/dev.mjs     # 并行启动 Vite + Electron 的开发脚本
├── index.html
├── vite.config.ts      # 通过 @shared 别名复用 frontend 的 api/types/常量
├── tailwind.config.js  # 和网页端同一套粉粉主题
└── package.json
```

复用了 `frontend/src/` 下的：

- `api/client.ts` —— HTTP / SSE 调用
- `types.ts` —— 类型定义
- `constants/llmPresets.ts` —— 工具函数

通过 Vite 的 `@shared/*` 别名（指向 `../frontend/src/*`）实现零拷贝共享，未来网页端修改 API 客户端，桌面端自动同步。

---

## 和网页端的关系

```
┌──────────────┐        ┌──────────────────┐
│   网页端     │──┐     │   桌面小组件     │
│  React SPA   │  │     │   Electron       │
└──────┬───────┘  │     └────────┬─────────┘
       │ /api/*   │              │ /api/*
       ▼          ▼              ▼
┌─────────────────────────────────────────┐
│  FastAPI (backend)                      │
│  └── SQLite (companion-data volume)     │
└─────────────────────────────────────────┘
```

两边都打到同一个 FastAPI，数据天然在 SQLite 里共享。

---

## 常见问题

**Q: 启动后窗口是空的，状态显示「离线」？**
A: 检查后端是否跑起来了：`curl http://localhost:8000/api/health` 应该返回 `{"status":"ok"}`。

**Q: 网页端改了设置（API Key），桌面端要重启吗？**
A: 不需要。设置存在 SQLite，桌面端每次发消息都会从 `/api/settings` 读最新配置。

**Q: 网页端新建的会话，桌面端能马上看到吗？**
A: 能。桌面端每 5 秒轮询一次 `/api/sessions`，另外切换窗口焦点时也会刷新。

**Q: 桌面端能配置 API 吗？**
A: 当前版本没有，复杂的 API 配置留给网页端做，桌面端只负责聊天。需要的话后续可以加。

**Q: 怎么退出？**
A: 托盘菜单点「退出」，或在标题栏点 `✕`。macOS 上 `Cmd+Q` 也会退出。