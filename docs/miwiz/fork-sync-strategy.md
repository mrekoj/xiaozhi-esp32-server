# Fork & Sync Strategy for xiaozhi-esp32-server

**Team size:** 1-2 developers
**Strategy:** Merge (simple, no force-push)

---

## Quick Start (5 Steps)

### Step 1: Fork & Clone
```bash
# 1. Fork on GitHub: github.com/xinnan-tech/xiaozhi-esp32-server → Fork

# 2. Clone your fork
git clone https://github.com/YOUR_COMPANY/xiaozhi-esp32-server.git
cd xiaozhi-esp32-server

# 3. Add upstream remote
git remote add upstream https://github.com/xinnan-tech/xiaozhi-esp32-server.git
```

### Step 2: Create Your Branch
```bash
git checkout -b miwiz/main
git push -u origin miwiz/main
```

### Step 3: Set Up Config (No Conflicts)
```bash
mkdir -p main/xiaozhi-server/data
cp main/xiaozhi-server/config.yaml main/xiaozhi-server/data/.config.yaml
# Edit data/.config.yaml → this file is gitignored, NEVER conflicts
```

### Step 4: Make Your Changes
Follow the **layering rule** to minimize conflicts:

| Layer | Where | Conflict Risk |
|-------|-------|---------------|
| Config | `data/.config.yaml` | None (gitignored) |
| Plugins | `plugins_func/functions/miwiz_*.py` | Low (new files) |
| New modules | `xiaozhi/modules/miwiz/` | Low (new dir) |
| Core changes | Existing files | High (will conflict) |

**Naming convention:** Prefix your files with `miwiz_` or your company name.

### Step 5: Sync with Upstream (Weekly)
```bash
git fetch upstream
git checkout miwiz/main
git merge upstream/main
# Resolve conflicts if any
git push
```

---

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    UPSTREAM (xinnan-tech)                    │
│                         main branch                          │
└─────────────────────────────┬───────────────────────────────┘
                              │
                    git fetch upstream
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    YOUR FORK (origin)                        │
│                                                              │
│  ┌─────────────┐     ┌──────────────────────────────────┐   │
│  │    main     │     │         miwiz/main             │   │
│  │  (sync only)│     │     (your customizations)        │   │
│  └─────────────┘     └──────────────────────────────────┘   │
│                              │                               │
│                              │ Your changes:                 │
│                              │ • data/.config.yaml           │
│                              │ • miwiz_*.py plugins          │
│                              │ • modules/miwiz/              │
└─────────────────────────────┬───────────────────────────────┘
                              │
                         git clone
                              │
                              ▼
                    ┌─────────────────┐
                    │  Your Server    │
                    │  (Production)   │
                    └─────────────────┘
```

---

## When Conflicts Happen

| Situation | Solution |
|-----------|----------|
| Config file conflict | Keep yours (data/.config.yaml overrides anyway) |
| Your new files conflict | Won't happen (upstream doesn't have them) |
| Core file you modified | Manual merge - look at both versions |

**Pro tip:** Mark your core changes with comments:
```python
# MIWIZ: Added custom authentication
def custom_auth():
    ...
```

---

## Deploy Your Fork

### Docker (Recommended)
```bash
cd main/xiaozhi-server
docker-compose up -d
```

### Direct
```bash
cd main/xiaozhi-server
pip install -r requirements.txt
python app.py
```

---

## Checklist

### Initial Setup
- [ ] Fork repo on GitHub
- [ ] Clone and add upstream remote
- [ ] Create `miwiz/main` branch
- [ ] Create `data/.config.yaml` with your settings

### For Each Change
- [ ] Use `miwiz_` prefix for new files
- [ ] Put new modules in `modules/miwiz/`
- [ ] Mark core changes with `# MIWIZ:` comment

### Weekly Sync
- [ ] `git fetch upstream`
- [ ] `git merge upstream/main`
- [ ] Resolve conflicts (if any)
- [ ] `git push`

---

## Directory Structure for Customizations

```
Your customizations (safe from conflicts):
├── data/.config.yaml          ← Config (gitignored)
├── plugins_func/functions/
│   └── miwiz_*.py             ← Your plugins
├── xiaozhi/modules/miwiz/     ← Your Java modules (manager-api)
└── views/miwiz/               ← Your Vue pages (manager-web)

Sync command (run weekly):
git fetch upstream && git merge upstream/main && git push
```

---

## Current Repository Status

**Remotes:**
- `origin` → https://github.com/xinnan-tech/xiaozhi-esp32-server (currently pointing to upstream)

**To set up fork properly:**
```bash
# Rename current origin to upstream
git remote rename origin upstream

# Add your fork as origin
git remote add origin https://github.com/YOUR_COMPANY/xiaozhi-esp32-server.git

# Verify
git remote -v
# Should show:
# origin    https://github.com/YOUR_COMPANY/xiaozhi-esp32-server.git (fetch)
# origin    https://github.com/YOUR_COMPANY/xiaozhi-esp32-server.git (push)
# upstream  https://github.com/xinnan-tech/xiaozhi-esp32-server.git (fetch)
# upstream  https://github.com/xinnan-tech/xiaozhi-esp32-server.git (push)
```
