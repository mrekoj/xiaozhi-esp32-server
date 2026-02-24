# Local Test Guide

## Terminal 1: Start Backend Server
```bash
cd /Users/hoangnn/SourceCode/Miwiz/xiaozhi-esp32-server/main/xiaozhi-server
source venv/bin/activate
python app.py
```
Wait until you see: `Websocket地址是 ws://192.168.1.150:8000/xiaozhi/v1/`

## Terminal 2: Start HTTP Server (for test page)
```bash
cd /Users/hoangnn/SourceCode/Miwiz/xiaozhi-esp32-server/main/xiaozhi-server/test
python -m http.server 8080
```

## Browser: Open Test Page
```
http://localhost:8080/test_page_en.html
```

## Test

| Test | How |
|------|-----|
| Text chat | Type message → Send |
| Voice | Click mic → Speak → Click again to stop |
| Check ASR | Watch Terminal 1 logs |

## Stop
- Terminal 1: `Ctrl + C` (backend)
- Terminal 2: `Ctrl + C` (HTTP server)

---

## Config
```
data/.config.yaml    ← API keys, ASR/TTS settings
```

## Switch ASR
```yaml
selected_module:
  ASR: OpenaiASR        # Whisper (current)
  # ASR: Qwen3ASRFlash  # Qwen3 (need Dashscope API key)
```
