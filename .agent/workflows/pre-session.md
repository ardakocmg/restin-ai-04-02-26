---
description: Mandatory 4-stage checklist before starting any work session
---

# 🚦 Pre-Session Checklist (MANDATORY)

> **Every new Antigravity conversation MUST start with these 4 stages.**
> Do NOT write any code until all 4 stages are complete.

## Stage 1: 📖 READ RULES

Read these files to understand the project standards:

```
C:\Users\arda\Documents\restin-setup\RULES.md   ← MASTER RULES (external, both PCs)
.agent/RULES.md                                  ← In-repo copy
memory/MASTER_RULES.md                           ← Legacy reference
```

> ⚠️ **CRITICAL:** `C:\Users\arda\Documents\restin-setup\RULES.md` is the SINGLE SOURCE OF TRUTH.
> Rule I.1: **Frontend = TypeScript (.tsx) ONLY. .jsx/.js is FORBIDDEN. `any` is FORBIDDEN.**
> FAILURE TO READ THIS FILE BEFORE WRITING ANY CODE IS UNACCEPTABLE.

## Stage 2: 📡 CHECK CHANNEL

Read `channel.md` in the repo root to see what the other PC/agent did last:

// turbo

```powershell
git fetch origin
git checkout origin/main -- channel.md 2>$null
cat channel.md
```

## Stage 3: 🔄 SYNC

Pull latest code and check worklock status:

// turbo

```powershell
git pull origin main
cat .worklock
```

If `.worklock` shows another PC is working on certain files → **DO NOT touch those files.**

## Stage 4: 📋 READ TASK

Read `task.md` to understand the current project state and pending work:

```
cat task.md
```

---

## 🏁 After Work: UPDATE CHANNEL & PUSH

After completing ANY work session, you MUST:

1. Update `channel.md` with what you did (append a new dated entry)
2. Commit and push:

```powershell
git add -A
git commit -m "description of what was done"
git push origin main
```
