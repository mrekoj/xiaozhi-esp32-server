# Sync Guide (Quick Reference)

## One Command Sync

```bash
git fetch upstream && git merge upstream/main && git push
```

---

## Step-by-Step (if you prefer)

```bash
git fetch upstream          # Get latest from xinnan-tech
git merge upstream/main     # Apply to your miwiz/main
git push                    # Push to your GitHub
```

---

## If Conflict

```bash
git fetch upstream
git merge upstream/main     # ← Conflict happens here
# Fix conflicts in your editor
git add .
git commit -m "Merge upstream/main"
git push
```

---

## Visual

```
xinnan-tech/main
       │
       │ fetch
       ▼
  upstream/main (local copy)
       │
       │ merge
       ▼
   miwiz/main (your branch)
       │
       │ push
       ▼
  origin/miwiz/main (your GitHub)
```

---

## Remotes Reference

| Remote | Points to |
|--------|-----------|
| `upstream` | xinnan-tech (original repo) |
| `origin` | mrekoj (your fork) |
