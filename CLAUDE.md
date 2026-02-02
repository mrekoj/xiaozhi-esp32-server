# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

xiaozhi-esp32-server is a comprehensive backend system for ESP32-based smart hardware that implements an intelligent voice assistant platform. It provides AI services (ASR, LLM, TTS, VAD), IoT device management, and web-based administration.

**Architecture**: 4 main components communicating via WebSocket and REST APIs:
- **xiaozhi-server** (Python, port 8000/8003) - Core AI engine handling voice processing
- **manager-api** (Java Spring Boot, port 8002) - RESTful management backend
- **manager-web** (Vue.js, port 8001) - Web admin dashboard
- **manager-mobile** (uni-app) - Cross-platform mobile admin (iOS/Android/WeChat Mini-program)

## Build and Run Commands

### xiaozhi-server (Python)
```bash
cd main/xiaozhi-server
pip install -r requirements.txt
python app.py

# Performance testing
python performance_tester.py
```
**Requirements**: Python 3.10+, FFmpeg (checked at startup)

### manager-api (Java)
```bash
cd main/manager-api
mvn clean package
java -jar target/xiaozhi-esp32-api.jar
```
**Requirements**: JDK 21, MySQL 8.0+, Redis 5.0+
**API docs**: http://localhost:8002/xiaozhi/doc.html

### manager-web (Vue.js)
```bash
cd main/manager-web
npm install
npm run serve    # Development (port 8001)
npm run build    # Production
npm run analyze  # Bundle analysis
```

### manager-mobile (uni-app)
```bash
cd main/manager-mobile
pnpm install
pnpm dev         # H5 development
pnpm dev:mp      # WeChat mini-program
pnpm build:app   # App build
```
**Requirements**: Node 18+, pnpm 7.30+

### Docker Deployment
```bash
# Simplified (xiaozhi-server only)
docker-compose -f main/xiaozhi-server/docker-compose.yml up

# Full deployment (all modules)
docker-compose -f main/xiaozhi-server/docker-compose_all.yml up
```

## Key Architecture Patterns

### Provider Pattern (xiaozhi-server)
AI services use a strategy pattern in `core/providers/`:
- `asr/` - Speech recognition (FunASR, Xunfei, Baidu, Aliyun, etc.)
- `llm/` - Language models (OpenAI-compatible, Ollama, Dify, Coze, etc.)
- `tts/` - Speech synthesis (Edge, Doubao, FishSpeech, etc.)
- `vad/` - Voice activity detection (SileroVAD)
- `vllm/` - Vision models
- `intent/` - Intent recognition
- `memory/` - Conversation memory

Each provider type has an abstract base class; implementations are dynamically loaded via `core/utils/modules_initialize.py`.

### Message Handlers (xiaozhi-server)
Voice processing pipeline in `core/handle/`:
- `helloHandle.py` - Device connection/auth
- `receiveAudioHandle.py` - Audio reception + VAD
- `intentHandler.py` - Intent recognition
- `functionHandler.py` - Plugin function execution
- `sendAudioHandle.py` - TTS and audio response

### Plugin System (xiaozhi-server)
Custom functions in `plugins_func/functions/` (e.g., weather, Home Assistant, music).
Plugins are loaded via `loadplugins.py` and exposed to LLM function calling.

### Configuration Priority
1. `data/.config.yaml` (local overrides - create this for development)
2. `config.yaml` (defaults)
3. manager-api (when enabled, overrides file-based config)

## Tech Stack Summary

| Component | Stack |
|-----------|-------|
| xiaozhi-server | Python 3.10, asyncio, websockets, torch, funasr |
| manager-api | Java 21, Spring Boot 3.4, MyBatis-Plus, Shiro, Liquibase |
| manager-web | Vue 2, Vuex, Vue Router, Element UI, SCSS |
| manager-mobile | uni-app v3, Vue 3, Vite, Pinia, TypeScript |

## Data Flow

1. **Voice Interaction**: ESP32 -> WebSocket -> xiaozhi-server (VAD/ASR/LLM/TTS) -> WebSocket -> ESP32
2. **Management**: Web UI -> REST API (manager-api) -> MySQL/Redis
3. **Config Sync**: xiaozhi-server pulls config from manager-api on startup/updates

## Testing

```bash
# Test audio interaction (browser)
open main/xiaozhi-server/test/test_page.html

# Test platform
# WebSocket: wss://2662r3426b.vicp.fun/xiaozhi/v1/
# Dashboard: https://2662r3426b.vicp.fun
```

## Communication Protocol

Protocol documentation: https://ccnphfhqs21z.feishu.cn/wiki/M0XiwldO9iJwHikpXD5cEx71nKh

## Development Notes

- Development config: Create `data/.config.yaml` to override settings without modifying `config.yaml`
- Logs use loguru with tags: `logger.bind(tag=TAG)`
- WebSocket server handles concurrent connections with per-connection isolation via `ConnectionHandler`
- manager-api uses Liquibase for DB migrations in `src/main/resources/db/`
