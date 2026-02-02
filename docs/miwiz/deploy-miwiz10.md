# Deploy xiaozhi-esp32-server to miwiz10 (Docker)

## Server Status (miwiz10)

| Resource | Status |
|----------|--------|
| **OS** | Ubuntu 24.04.3 LTS |
| **Memory** | 5.7 GB total, 4.3 GB free |
| **Disk** | 40 GB available |
| **Docker** | NOT installed (will install) |

---

## Deployment Mode: Lightweight (External AI Services)

Using external/cloud AI services instead of local models:

| Component | Provider | Notes |
|-----------|----------|-------|
| **VAD** | SileroVAD (local) | Lightweight ~100MB, keep local |
| **ASR** | DoubaoASR / AliyunASR / GroqASR | Cloud API, no local model needed |
| **LLM** | ChatGLMLLM (free) / DoubaoLLM | Cloud API |
| **TTS** | EdgeTTS (free) / DoubaoTTS | Cloud API |

**Benefits:**
- No 500MB+ model downloads
- ~500MB RAM usage (vs 2-3GB with local models)
- No GPU required
- Faster startup

---

## Docker Deployment Steps

### Step 1: Install Docker on miwiz10
```bash
ssh miwiz10

# Install Docker using official script
curl -fsSL https://get.docker.com | sudo sh

# Add user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker $USER

# Logout and login again, or run:
newgrp docker

# Verify
docker --version
docker compose version
```

### Step 2: Create Project Directory
```bash
mkdir -p ~/xiaozhi-esp32-server/data
cd ~/xiaozhi-esp32-server
```

### Step 3: Create docker-compose.yml
```bash
cat > docker-compose.yml << 'EOF'
version: '3'
services:
  xiaozhi-esp32-server:
    image: ghcr.nju.edu.cn/xinnan-tech/xiaozhi-esp32-server:server_latest
    container_name: xiaozhi-esp32-server
    restart: always
    environment:
      - TZ=Asia/Shanghai
    ports:
      - "8000:8000"
      - "8003:8003"
    volumes:
      - ./data:/opt/xiaozhi-esp32-server/data
EOF
```

### Step 4: Create Lightweight Config
```bash
cat > data/.config.yaml << 'EOF'
server:
  ip: 0.0.0.0
  port: 8000
  http_port: 8003
  websocket: ws://YOUR_SERVER_IP:8000/xiaozhi/v1/

# Use external AI services (lightweight mode)
selected_module:
  VAD: SileroVAD
  ASR: ChatGLMASR        # Or: DoubaoASR, AliyunASR, GroqASR
  LLM: ChatGLMLLM        # Free! Or: DoubaoLLM, DeepSeekLLM
  TTS: EdgeTTS           # Free! Or: DoubaoTTS, AliyunTTS
  VLLM: ChatGLMVLLM
  Memory: nomem
  Intent: function_call

# ASR Config - Choose ONE:

# Option 1: ChatGLM (Free, uses LLM for ASR via Qwen3)
ASR:
  ChatGLMASR:
    type: qwen3_asr_flash
    api_key: YOUR_ZHIPU_API_KEY
    base_url: https://dashscope.aliyuncs.com/compatible-mode/v1
    model_name: qwen3-asr-flash
    output_dir: tmp/

# Option 2: Doubao ASR
#ASR:
#  DoubaoASR:
#    type: doubao
#    appid: YOUR_APPID
#    access_token: YOUR_ACCESS_TOKEN
#    cluster: volcengine_input_common
#    output_dir: tmp/

# Option 3: Groq ASR (Fast, free tier available)
#ASR:
#  GroqASR:
#    type: openai
#    api_key: YOUR_GROQ_API_KEY
#    base_url: https://api.groq.com/openai/v1/audio/transcriptions
#    model_name: whisper-large-v3-turbo
#    output_dir: tmp/

# LLM Config - ChatGLM is FREE
LLM:
  ChatGLMLLM:
    type: openai
    model_name: glm-4-flash
    url: https://open.bigmodel.cn/api/paas/v4/
    api_key: YOUR_ZHIPU_API_KEY

# TTS Config - EdgeTTS is FREE
TTS:
  EdgeTTS:
    type: edge
    voice: zh-CN-XiaoxiaoNeural
    output_dir: tmp/

# VLLM Config (for vision)
VLLM:
  ChatGLMVLLM:
    type: openai
    model_name: glm-4v-flash
    url: https://open.bigmodel.cn/api/paas/v4/
    api_key: YOUR_ZHIPU_API_KEY
EOF
```

### Step 5: Update Config with Your API Keys
```bash
nano data/.config.yaml
```

**Required API Keys:**
1. **Zhipu AI (ChatGLM)** - Free: https://bigmodel.cn/usercenter/proj-mgmt/apikeys
2. **Or Groq** - Free tier: https://console.groq.com/keys
3. **Or Doubao** - Paid: https://console.volcengine.com/ark

Replace:
- `YOUR_SERVER_IP` with miwiz10's IP address
- `YOUR_ZHIPU_API_KEY` with your Zhipu API key

### Step 6: Start Container
```bash
cd ~/xiaozhi-esp32-server
docker compose up -d
```

### Step 7: Check Logs
```bash
docker logs -f xiaozhi-esp32-server
```

---

## Verification

1. Container running: `docker ps`
2. WebSocket: `ws://miwiz10:8000`
3. HTTP API: `http://miwiz10:8003`
4. Logs show no errors: `docker logs xiaozhi-esp32-server`

---

## Management Commands

```bash
# Stop
docker compose down

# Restart
docker compose restart

# View logs
docker logs -f xiaozhi-esp32-server

# Update to latest image
docker compose pull && docker compose up -d
```

---

## Directory Structure on miwiz10

```
~/xiaozhi-esp32-server/
├── docker-compose.yml
└── data/
    └── .config.yaml
```

---

## External AI Service Options

### ASR (Speech Recognition)
| Provider | Free Tier | Notes |
|----------|-----------|-------|
| Qwen3ASRFlash | Yes (Aliyun) | Via Dashscope |
| GroqASR | Yes | Fast, whisper-based |
| DoubaoASR | No | Volcengine, pay-per-use |
| AliyunASR | Limited | Aliyun NLS |
| TencentASR | Limited | Tencent Cloud |

### LLM (Language Model)
| Provider | Free Tier | Notes |
|----------|-----------|-------|
| ChatGLMLLM | Yes | glm-4-flash is free |
| DoubaoLLM | 500K tokens | doubao-1-5-pro |
| DeepSeekLLM | No | High quality |
| GeminiLLM | Yes | Google AI |

### TTS (Text-to-Speech)
| Provider | Free Tier | Notes |
|----------|-----------|-------|
| EdgeTTS | Yes | Microsoft, good quality |
| DoubaoTTS | No | Volcengine, natural voices |
| AliyunTTS | Limited | CosyVoice |
| OpenAITTS | No | High quality |
