# Deploy xiaozhi-esp32-server on miwiz11

**Domain:** `bot.miwiz.net`
**Images:** Build your own (full control)

---

# Phase 1: Local Development & Testing

Test everything on your Mac before deploying.

## 1.1 Prerequisites

```bash
# Python 3.10
python3 --version

# FFmpeg
brew install ffmpeg

# Node.js (for test page)
node --version
```

## 1.2 Setup Local Environment

```bash
cd /Users/hoangnn/SourceCode/Miwiz/xiaozhi-esp32-server/main/xiaozhi-server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create local config
cp config.yaml data/.config.yaml
```

## 1.3 Configure API Keys

Edit `data/.config.yaml`:

```yaml
server:
  ip: 0.0.0.0
  port: 8000

LLM:
  OpenAILLM:
    type: openai
    model_name: gpt-4o-mini
    url: https://api.openai.com/v1/
    api_key: YOUR_OPENAI_KEY

TTS:
  EdgeTTS:
    type: edge
    voice: zh-CN-XiaoxiaoNeural

ASR:
  GroqASR:
    type: openai
    model_name: whisper-large-v3
    url: https://api.groq.com/openai/v1/
    api_key: YOUR_GROQ_KEY

selected_module:
  VAD: SileroVAD
  ASR: GroqASR
  LLM: OpenAILLM
  TTS: EdgeTTS
  Memory: nomem
  Intent: nointent
```

## 1.4 Run Server Locally

```bash
cd /Users/hoangnn/SourceCode/Miwiz/xiaozhi-esp32-server/main/xiaozhi-server
source venv/bin/activate
python app.py
```

**Expected output:**
```
Websocket地址是    ws://192.168.x.x:8000/xiaozhi/v1/
OTA接口是          http://192.168.x.x:8003/xiaozhi/ota/
视觉分析接口是      http://192.168.x.x:8003/mcp/vision/explain
```

## 1.5 Test with Web Page

**Terminal 1:** Run server (from 1.4)

**Terminal 2:** Run test page
```bash
cd /Users/hoangnn/SourceCode/Miwiz/xiaozhi-esp32-server/main/xiaozhi-server/test
python -m http.server 8006
```

**Browser:** Open `http://localhost:8006/test_page.html`

1. Click "设置" (Settings)
2. Set OTA URL: `http://localhost:8003/xiaozhi/ota/`
3. Close settings
4. Click "拨号" (Dial) to connect
5. Click "录音" and speak to test

## 1.6 Test Checklist (Local)

| Test | How | Expected |
|------|-----|----------|
| Server starts | `python app.py` | Shows WebSocket URL |
| Test page loads | Browser localhost:8006 | UI appears |
| WebSocket connects | Click "拨号" | Status: "在线" |
| Voice interaction | Speak after "录音" | Bot responds |

## 1.7 Build Docker Images

After local tests pass:

```bash
cd /Users/hoangnn/SourceCode/Miwiz/xiaozhi-esp32-server

# Update Dockerfile-server to use your base image
# Change: FROM ghcr.io/xinnan-tech/xiaozhi-esp32-server:server-base
# To:     FROM miwiz/xiaozhi-server-base

# Build base image (slow, once)
docker build -f Dockerfile-server-base -t miwiz/xiaozhi-server-base .

# Build server image (fast, after code changes)
docker build -f Dockerfile-server -t miwiz/xiaozhi-server .

# Build web image (manager-api + manager-web)
docker build -f Dockerfile-web -t miwiz/xiaozhi-web .
```

## 1.8 Test Docker Locally (Optional)

```bash
# Test server image
docker run --rm -p 8000:8000 -p 8003:8003 \
  -v $(pwd)/main/xiaozhi-server/data:/opt/xiaozhi-esp32-server/data \
  miwiz/xiaozhi-server

# Test in browser with test page
```

---

# Phase 2: Remote Deployment (miwiz11)

Deploy to production after Phase 1 tests pass.

## Architecture

```
Cloudflare (SSL) → miwiz10 (nginx) → miwiz11 (Docker)
                   172.16.16.131
```

## 2.1 Transfer Images to miwiz11

```bash
# From local machine
docker save miwiz/xiaozhi-server | gzip | ssh miwiz11 "gunzip | docker load"
docker save miwiz/xiaozhi-web | gzip | ssh miwiz11 "gunzip | docker load"
```

## 2.2 Create Project Directory (miwiz11)

```bash
ssh miwiz11
mkdir -p ~/xiaozhi-esp32-server/{data,mysql/data,uploadfile}
```

## 2.3 Create docker-compose.yml (miwiz11)

File: `~/xiaozhi-esp32-server/docker-compose.yml`

```yaml
version: '3'
services:
  xiaozhi-esp32-server:
    image: miwiz/xiaozhi-server
    container_name: xiaozhi-esp32-server
    depends_on:
      - xiaozhi-esp32-server-db
      - xiaozhi-esp32-server-redis
    restart: always
    networks:
      - xiaozhi
    ports:
      - "8000:8000"
      - "8003:8003"
    security_opt:
      - seccomp:unconfined
    environment:
      - TZ=Asia/Shanghai
    volumes:
      - ./data:/opt/xiaozhi-esp32-server/data

  xiaozhi-esp32-server-web:
    image: miwiz/xiaozhi-web
    container_name: xiaozhi-esp32-server-web
    restart: always
    networks:
      - xiaozhi
    depends_on:
      xiaozhi-esp32-server-db:
        condition: service_healthy
      xiaozhi-esp32-server-redis:
        condition: service_healthy
    ports:
      - "8002:8002"
    environment:
      - TZ=Asia/Shanghai
      - SPRING_DATASOURCE_DRUID_URL=jdbc:mysql://xiaozhi-esp32-server-db:3306/xiaozhi_esp32_server?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai
      - SPRING_DATASOURCE_DRUID_USERNAME=root
      - SPRING_DATASOURCE_DRUID_PASSWORD=Xiaozhi2024Secure!
      - SPRING_DATA_REDIS_HOST=xiaozhi-esp32-server-redis
      - SPRING_DATA_REDIS_PORT=6379
    volumes:
      - ./uploadfile:/uploadfile

  xiaozhi-esp32-server-db:
    image: mysql:latest
    container_name: xiaozhi-esp32-server-db
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 45s
      interval: 10s
      retries: 10
    restart: always
    networks:
      - xiaozhi
    expose:
      - 3306
    volumes:
      - ./mysql/data:/var/lib/mysql
    environment:
      - TZ=Asia/Shanghai
      - MYSQL_ROOT_PASSWORD=Xiaozhi2024Secure!
      - MYSQL_DATABASE=xiaozhi_esp32_server

  xiaozhi-esp32-server-redis:
    image: redis:8.0
    container_name: xiaozhi-esp32-server-redis
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - xiaozhi
    expose:
      - 6379

networks:
  xiaozhi:
    driver: bridge
```

## 2.4 Create Config File (miwiz11)

File: `~/xiaozhi-esp32-server/data/.config.yaml`

Copy same config from Phase 1.3 (your tested local config).

## 2.5 Start Containers (miwiz11)

```bash
cd ~/xiaozhi-esp32-server
docker compose up -d
docker compose ps
docker logs -f xiaozhi-esp32-server
```

## 2.6 Configure nginx (miwiz10)

```bash
ssh miwiz10
sudo nano /etc/nginx/sites-available/bot.miwiz.net
```

File: `/etc/nginx/sites-available/bot.miwiz.net`

```nginx
# bot.miwiz.net - Xiaozhi ESP32 Voice Assistant
# Backend: 172.16.16.131 (miwiz11 LAN)

server {
    listen 80;
    server_name bot.miwiz.net;

    access_log /var/log/nginx/bot.miwiz.net.access.log;
    error_log /var/log/nginx/bot.miwiz.net.error.log;

    # WebSocket - ESP32 connects here
    location /xiaozhi/v1/ {
        proxy_pass http://172.16.16.131:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Device-Id $http_device_id;
        proxy_set_header Client-Id $http_client_id;
        proxy_set_header Authorization $http_authorization;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }

    # Vision API
    location /mcp/ {
        proxy_pass http://172.16.16.131:8003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # API + OTA
    location /xiaozhi/ {
        proxy_pass http://172.16.16.131:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Device-Id $http_device_id;
    }

    # Dashboard
    location / {
        proxy_pass http://172.16.16.131:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Enable and reload:
```bash
sudo ln -sf /etc/nginx/sites-available/bot.miwiz.net /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 2.7 Configure Cloudflare

1. Add DNS: `A bot -> miwiz10_public_ip` (Proxied)
2. SSL mode: Full
3. Ensure WebSockets enabled (Network > WebSockets)

## 2.8 Initial Dashboard Setup

1. Open `https://bot.miwiz.net`
2. Register first user (becomes admin)
3. Login → 参数管理 → Copy `server.secret`
4. Update `~/xiaozhi-esp32-server/data/.config.yaml` with the secret
5. Set WebSocket URL in dashboard: `wss://bot.miwiz.net/xiaozhi/v1/`
6. Restart: `docker restart xiaozhi-esp32-server`

## 2.9 Test Checklist (Remote)

| Test | Command | Expected |
|------|---------|----------|
| LAN connectivity | `ssh miwiz10 "curl http://172.16.16.131:8000/"` | "Server is running" |
| nginx proxy | `curl -I https://bot.miwiz.net/` | 200 OK |
| WebSocket | `wscat -c "wss://bot.miwiz.net/xiaozhi/v1/?device-id=test"` | Connected |
| Dashboard | Browser https://bot.miwiz.net | Login page |
| Voice test | Test page with OTA: https://bot.miwiz.net/xiaozhi/ota/ | Voice works |

---

# Rebuild & Redeploy

After code changes:

```bash
# On local machine
cd /Users/hoangnn/SourceCode/Miwiz/xiaozhi-esp32-server

# Rebuild server image
docker build -f Dockerfile-server -t miwiz/xiaozhi-server .

# Transfer and restart
docker save miwiz/xiaozhi-server | gzip | ssh miwiz11 "gunzip | docker load"
ssh miwiz11 "docker restart xiaozhi-esp32-server"
```

---

# Endpoints Summary

| Purpose | URL |
|---------|-----|
| WebSocket (ESP32) | `wss://bot.miwiz.net/xiaozhi/v1/` |
| Dashboard | `https://bot.miwiz.net/` |
| OTA API | `https://bot.miwiz.net/xiaozhi/ota/` |
| Vision API | `https://bot.miwiz.net/mcp/vision/explain` |

---

# ESP32 Configuration

```
OTA URL: https://bot.miwiz.net/xiaozhi/ota/
```

WebSocket URL provided automatically from dashboard.
