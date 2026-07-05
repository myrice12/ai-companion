# AI Companion · 智能陪伴对话系统

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-3776ab.svg)](https://www.python.org/downloads/)
[![Docker](https://img.shields.io/badge/docker-ready-2496ed.svg)](docker-compose.yml)

面向本地部署的多会话 AI 陪伴对话应用。支持流式输出、上下文窗口管理、会话级人设配置，并可在 Web 界面直接配置任意 OpenAI 兼容 LLM 接口。所有对话数据与 API 密钥均保存在本地，不上传至第三方服务。

---

## 核心特性

| 模块 | 说明 |
|------|------|
| **多会话管理** | 独立会话、自动标题、Markdown 导出 |
| **流式对话** | 基于 SSE 的实时 token 流式输出 |
| **上下文引擎** | Token 估算、滑动窗口裁剪、可选历史摘要压缩 |
| **人设系统** | 每个会话可配置独立 System Prompt |
| **模型接入** | 支持 OpenAI、DeepSeek、Ollama 及任意兼容 API |
| **隐私优先** | SQLite 本地存储，API Key 前端脱敏展示 |

---

## 系统架构

```
Browser ──► Nginx (Frontend) ──► /api/* ──► FastAPI (Backend)
                                      │
                                      ▼
                              SQLite (sessions / messages / settings)
                                      │
                                      ▼
                         OpenAI-compatible LLM Provider
```

**技术栈：** FastAPI · React · Vite · Tailwind CSS · SQLAlchemy · SQLite · Docker Compose

---

## 快速开始

### 方式一：Docker 部署（推荐）

**环境要求：** Docker 20+、Docker Compose v2

```bash
git clone https://github.com/myrice12/ai-companion.git
cd ai-companion
docker compose up --build -d
```

访问 **http://localhost:8080**，按引导完成 LLM API 配置即可使用。

**国内网络镜像加速：**

```bash
docker compose -f docker-compose.yml -f docker-compose.mirror.yml up --build -d
```

或在 Docker Desktop → **Settings → Docker Engine** 中配置 registry mirror 后重启 Docker。

**常用运维命令：**

```bash
docker compose ps       # 查看服务状态
docker compose logs -f  # 实时日志
docker compose down     # 停止并移除容器
```

持久化数据位于 Docker Volume `companion-data`。容器内访问宿主机 Ollama 时，Base URL 使用：

```
http://host.docker.internal:11434/v1
```

### 方式二：本地开发

**后端**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**前端**

```bash
cd frontend
npm install
npm run dev
```

访问 **http://localhost:5173**。开发模式下 Vite 将 `/api` 代理至 `http://localhost:8000`，需同时启动前后端服务。

---

## 支持的 LLM 提供商

| 提供商 | Base URL | 模型示例 |
|--------|----------|----------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Ollama | `http://localhost:11434/v1` | `llama3` |
| 自定义 | 任意 OpenAI 兼容地址 | — |

---

## API 概览

| 方法 | 路径 | 描述 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/settings` | 读取 LLM 配置（Key 脱敏） |
| `PUT` | `/api/settings` | 更新 LLM 配置 |
| `POST` | `/api/settings/test` | 测试 API 连通性 |
| `GET` | `/api/sessions` | 会话列表 |
| `POST` | `/api/sessions` | 创建会话 |
| `PATCH` | `/api/sessions/{id}` | 更新标题 / 人设 |
| `DELETE` | `/api/sessions/{id}` | 删除会话 |
| `GET` | `/api/sessions/{id}/messages` | 消息历史 |
| `GET` | `/api/sessions/{id}/context` | 上下文预览与 Token 统计 |
| `POST` | `/api/chat/stream` | 流式对话（SSE） |
| `GET` | `/api/sessions/{id}/export` | 导出 Markdown |

---

## 目录结构

```
ai-companion/
├── backend/                 # FastAPI 服务
│   ├── app/
│   │   ├── routers/         # 路由层
│   │   ├── services/        # LLM 客户端、上下文管理
│   │   ├── models/          # ORM 模型
│   │   └── schemas/         # Pydantic 模型
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # React 单页应用
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.mirror.yml
└── README.md
```

---

## 安全与隐私

- **本地存储：** API 密钥与会话数据仅存于本地 SQLite，除所配置的 LLM 服务商外不向第三方传输。
- **密钥脱敏：** 界面展示时对 API Key 进行掩码处理。
- **版本控制：** 请勿提交 `backend/data/`、`.env`、虚拟环境或 `node_modules`。相关路径已写入 `.gitignore`。

---

## 开源协议

本项目基于 [MIT License](LICENSE) 发布。

---

## 贡献指南

欢迎提交 Issue 与 Pull Request。提交前请确保未包含任何密钥、本地数据库或机器相关路径等敏感信息。
