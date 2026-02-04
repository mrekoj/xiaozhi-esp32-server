# Miwiz Work Log

> **Protocol for Human + Claude collaboration**

---

## How to Use This File

### For Human (You)
1. **Start of day:** Tell Claude "read @docs/miwiz/worklog.md" to restore context
2. **During work:** No need to update - Claude will track
3. **End of day:** Ask Claude "update worklog" before closing session
4. **New task:** Just describe what you want - Claude checks this file for context

### For Claude (AI)
1. **Start of session:** When user mentions worklog, read it FIRST before any work
2. **During session:** Track what's done in memory
3. **End of session:** When user says "update worklog", append today's entry
4. **Check before doing:** Review "Errors to Prevent" before repeating similar tasks
5. **Use research agents:** For complex questions, research thoroughly before implementing

### Keep It Short
- **Work Log:** Keep only last 7 days
- **Monthly:** Move older entries to `worklog-archive-YYYY-MM.md`
- **One line per item:** No paragraphs

---

## Project Quick Reference

| Item | Value |
|------|-------|
| Branch | `miwiz/main` |
| Upstream | `xinnan-tech/xiaozhi-esp32-server` |
| Config (private) | `main/xiaozhi-server/data/.config.yaml` |
| Test page (EN) | `main/xiaozhi-server/test/test_page_en.html` |

---

## Repeated Work (for your automation)

| Task | Command |
|------|---------|
| Sync | `git fetch upstream && git merge upstream/main && git push` |
| Start | `cd main/xiaozhi-server && source venv/bin/activate && python app.py` |
| Test | `open main/xiaozhi-server/test/test_page_en.html` |
| Logs | `tail -f main/xiaozhi-server/tmp/server.log` |

---

## Errors to Prevent

| Error | Cause | Prevention |
|-------|-------|------------|
| Chinese UI in test page | Imported `*.js` instead of `*_en.js` | Always use `*_en.js` for English |
| API key exposed | Commit config file | `data/.config.yaml` is in .gitignore ✅ |
| Whisper ignores language hint | Used instruction instead of glossary | Prompt = vocabulary/style guide only |
| Changes not applied | Forgot to restart server | Restart after config changes |
| Research before code | Changed code without understanding | Use agent research first |

---

## Current Status

### Phase 1: Local Testing
- [x] 1.1 Fork repo
- [x] 1.2 Clone locally
- [x] 1.3 Setup Python venv
- [x] 1.4 Configure .config.yaml
- [x] 1.5 Start server
- [x] 1.6 Test with browser (English UI created)
- [ ] 1.7 Build Docker images
- [ ] 1.8 Test Docker locally

### Phase 2: Remote Deployment (miwiz11)
- [ ] 2.1 Setup Cloudflare tunnel
- [ ] 2.2 Configure nginx
- [ ] 2.3 Deploy Docker
- [ ] 2.4 Test remote access

---

## Work Log

### 2025-02-04

**Done:**
- [x] Daily sync from upstream (aliyun_stream.py, xunfei_stream.py)
- [x] Researched Whisper prompt (agent) → glossary only, not instructions
- [x] Researched Qwen3-ASR-Flash (agent) → better for multilingual
- [x] Added language/prompt to openai.py ASR
- [x] Configured Qwen3-ASR-Flash in .config.yaml
- [x] Created worklog.md protocol

**Pending:**
- [ ] Get Dashscope API key
- [ ] Test Qwen3-ASR-Flash
- [ ] Create miwiz.sh automation script
- [ ] Phase 1.7: Docker build

**Decisions:**
- Qwen3-ASR-Flash > Whisper for Vietnamese/English/Chinese/Korean
- Whisper kept as backup

---

### 2025-02-03

**Done:**
- [x] Created English test page files (`*_en.js`, `*_en.json`, `test_page_en.html`)
- [x] Fixed import chain (all EN files import EN files)
- [x] Configured English TTS: `en-US-JennyNeural`
- [x] Configured English system prompt (Mia assistant)
- [x] Tested voice recording - works

**Issues Found:**
- ASR picks up background audio → expected, not bug

**Files Created:**
- `docs/miwiz/README.md`
- `docs/miwiz/sync-guide.md`
- `docs/miwiz/deploy-miwiz11-plan.md`

---

## Reference

### ASR Comparison
| ASR | Multilingual | Auto-detect | Hotwords | Cost |
|-----|--------------|-------------|----------|------|
| Qwen3-ASR-Flash | 27 langs | Native | 10,000 tokens | ~$0.32/hr |
| OpenAI Whisper | 100+ langs | First 30s | 224 tokens | ~$0.36/hr |
| Groq Whisper | Same | Same | Same | FREE |

### Config Priority
```
config.yaml          ← Default (don't modify)
data/.config.yaml    ← Your overrides (gitignored)
```
