# Phase 1: Local Development & Testing - Execution Log

**Started:** 2026-02-03
**Goal:** Build and test Docker images locally

---

## Step 1.1: Prerequisites Check

**Status:** ✅ Complete

### Python Version
```bash
python3 --version
```
**Result:**
```
Python 3.12.12
```
⚠️ Note: Project recommends Python 3.10, but 3.12 should work for Docker build.

### FFmpeg
```bash
ffmpeg -version | head -1
```
**Result:**
```
ffmpeg version 8.0.1 Copyright (c) 2000-2025 the FFmpeg developers
```
✅ Installed

### Node.js
```bash
node --version
```
**Result:**
```
v22.21.1
```
✅ Installed

### Docker
```bash
docker --version
```
**Result:**
```
Docker version 29.1.5, build 0e6fee6
```
✅ Installed

---

## Step 1.2: Setup Local Environment

**Status:** ✅ Complete

### Create venv with Python 3.10
```bash
cd /Users/hoangnn/SourceCode/Miwiz/xiaozhi-esp32-server/main/xiaozhi-server
uv venv --python 3.10 venv
```
**Result:**
```
Downloading cpython-3.10.19-macos-aarch64-none
Using CPython 3.10.19
Creating virtual environment at: venv
```
✅ venv created with Python 3.10.19

### Install dependencies
```bash
source venv/bin/activate
grep -v "^vosk" requirements.txt | uv pip install -r -
```
**Result:**
- ✅ 161 packages installed
- ⚠️ `vosk` skipped (no macOS ARM wheels - will use Groq ASR instead)

**Key packages installed:**
- torch 2.2.2, torchaudio 2.2.2
- numpy 1.26.4
- funasr 1.2.7
- openai 2.8.1
- edge-tts 7.2.6
- websockets 14.2

**Note:** Project requires Python 3.10. Used `uv` for fast installation.

---

## Step 1.3: Configure API Keys

**Status:** ✅ Complete

### Config file
```
data/.config.yaml
```

### Configuration:
| Service | Provider | Model/Voice |
|---------|----------|-------------|
| ASR | OpenAI | whisper-1 |
| LLM | OpenAI | gpt-4o-mini |
| TTS | Edge TTS | en-US-JennyNeural (English) |

✅ API key configured
✅ TTS changed to English voice

---

## Step 1.4: Run Server Locally

**Status:** ✅ Running

### Command
```bash
source venv/bin/activate && python app.py
```

### Output
```
260203 14:30:57 - 初始化组件: llm成功 OpenAILLM
260203 14:31:05 - 初始化组件: vad成功 SileroVAD
260203 14:31:05 - 初始化组件: asr成功 OpenaiASR
```

### Endpoints
| Service | URL |
|---------|-----|
| WebSocket | ws://192.168.1.150:8000/xiaozhi/v1/ |
| OTA | http://192.168.1.150:8003/xiaozhi/ota/ |
| Vision | http://192.168.1.150:8003/mcp/vision/explain |

✅ Server running successfully

---

## Step 1.5: Test with Web Page

**Status:** ✅ Complete

### Test Page URL
```
http://localhost:8006/test_page_en.html
```

### Files Created for English UI
| File | Purpose |
|------|---------|
| `test/test_page_en.html` | English HTML page |
| `test/js/app_en.js` | English app entry |
| `test/js/ui/controller_en.js` | English UI controller |
| `test/js/core/network/websocket_en.js` | English WebSocket handler |

### Test Results
- ✅ Page loads correctly
- ✅ Live2D model displays
- ✅ All UI elements in English
- ✅ Connection to server works
- ✅ Status updates correctly (Offline → Connected)
- ✅ Chat messages display in English
- ✅ Recording button activates
- ✅ MCP tools registered (3 device tools)

---

## Step 1.6: Test Checklist

**Status:** ✅ Complete

### Issue Found & Fixed

**Problem:** AI responded in Chinese, TTS failed
- Default system prompt was Chinese ("你是小智...")
- Edge TTS (English voice) cannot speak Chinese text
- Result: Only emojis displayed, no text/voice

**Solution:** Changed `.config.yaml`:
```yaml
# English system prompt
prompt: |
  You are Mia, a friendly AI assistant. You speak English naturally...

# Disabled Chinese end prompt
end_prompt:
  enable: false

# English error message
system_error_response: "Sorry, I'm having trouble..."
```

### Test Results

| Feature | Status | Notes |
|---------|--------|-------|
| Text Chat | ✅ Working | English responses generated |
| TTS (English) | ✅ Working | "Oh no", "That sounds serious", etc. |
| Voice Recording | ⚠️ Works but... | Picks up background audio |
| ASR | ✅ Working | OpenAI Whisper recognizes speech |
| LLM | ✅ Working | GPT-4o-mini responds correctly |
| Live2D | ✅ Working | Avatar displays and animates |
| MCP Tools | ✅ Working | 3 device tools registered |

### Key Learnings

1. **TTS voice must match response language**
   - English voice → English responses only
   - Chinese voice → Chinese responses only

2. **System prompt controls response language**
   - Set prompt in target language
   - AI will respond in that language

3. **Voice recording sensitivity**
   - Microphone picks up all sounds
   - Background audio gets transcribed
   - Need quiet environment for voice chat

### English Files Created/Modified

| File | Purpose |
|------|---------|
| `test/test_page_en.html` | English HTML page |
| `test/js/app_en.js` | English app entry point |
| `test/js/ui/controller_en.js` | English UI controller |
| `test/js/core/network/websocket_en.js` | English WebSocket handler |
| `test/js/core/network/ota-connector_en.js` | English OTA connector |
| `test/js/core/mcp/tools_en.js` | English MCP tools UI |
| `test/js/core/audio/player_en.js` | English audio player |
| `test/js/core/audio/recorder_en.js` | English audio recorder |
| `test/js/core/audio/opus-codec_en.js` | English Opus codec |
| `test/js/core/audio/stream-context_en.js` | English stream context |
| `test/js/config/default-mcp-tools_en.json` | English MCP tool responses |

✅ All UI elements and log messages now in English

---

## Step 1.7: Build Docker Images

**Status:** ⬜ Pending

---

## Step 1.8: Test Docker Locally

**Status:** ⬜ Pending

---

## Summary

| Step | Status | Notes |
|------|--------|-------|
| 1.1 Prerequisites | ✅ | Python 3.12, FFmpeg 8.0.1, Node 22.21.1, Docker 29.1.5 |
| 1.2 Setup Environment | ✅ | Python 3.10.19, 161 packages, vosk skipped |
| 1.3 Configure API Keys | ✅ | OpenAI ASR+LLM, Edge TTS (English) |
| 1.4 Run Server | ✅ | Running on 192.168.1.150:8000 |
| 1.5 Test Web Page | ✅ | English UI working, connection verified |
| 1.6 Test Checklist | ✅ | English prompt fixed, TTS working |
| 1.7 Build Docker | ⬜ | |
| 1.8 Test Docker | ⬜ | |
